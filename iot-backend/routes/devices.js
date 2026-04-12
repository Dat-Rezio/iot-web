const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ================= CONSTANTS =================

const DEVICE_MAP = { led1: 1, led2: 2, led3: 3 };

// ================= SWAGGER TAGS =================

/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: API quản lý và điều khiển thiết bị (đèn LED, quạt, máy bơm...)
 */

// ================= SCHEMAS =================

/**
 * @swagger
 * components:
 *   schemas:
 *     Device:
 *       type: object
 *       description: Thông tin một thiết bị
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         device_name:
 *           type: string
 *           example: Đèn LED 1
 *         description:
 *           type: string
 *           nullable: true
 *           example: Đèn chiếu sáng khu vực A
 *
 *     DeviceCommand:
 *       type: object
 *       description: Lệnh điều khiển thiết bị
 *       required:
 *         - device
 *         - state
 *       properties:
 *         device:
 *           type: string
 *           description: Mã định danh thiết bị
 *           example: led1
 *         state:
 *           type: string
 *           enum: [ON, OFF]
 *           description: Trạng thái cần chuyển
 *           example: ON
 *
 *     DeviceControlResponse:
 *       type: object
 *       description: Kết quả sau khi gửi lệnh điều khiển
 *       properties:
 *         message:
 *           type: string
 *           example: Command sent
 *         logId:
 *           type: integer
 *           description: ID bản ghi log vừa được tạo
 *           example: 105
 *         status:
 *           type: string
 *           description: Trạng thái ban đầu của lệnh
 *           example: waiting
 *
 *     DeviceStatus:
 *       type: object
 *       description: Trạng thái hiện tại của một thiết bị
 *       properties:
 *         device_id:
 *           type: integer
 *           example: 1
 *         device_name:
 *           type: string
 *           example: Đèn LED 1
 *         last_success_action:
 *           type: string
 *           nullable: true
 *           enum: [TURN_ON, TURN_OFF]
 *           description: Hành động thành công gần nhất (null nếu chưa từng thực thi)
 *           example: TURN_ON
 *
 *     DeviceLog:
 *       type: object
 *       description: Một bản ghi lịch sử điều khiển thiết bị
 *       properties:
 *         id:
 *           type: integer
 *           example: 105
 *         device_id:
 *           type: integer
 *           example: 1
 *         device_name:
 *           type: string
 *           example: Đèn LED 1
 *         action:
 *           type: string
 *           enum: [TURN_ON, TURN_OFF]
 *           example: TURN_ON
 *         status:
 *           type: string
 *           enum: [waiting, success, failed]
 *           example: success
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2026-04-12T21:00:00Z"
 *
 *     DeviceLogResponse:
 *       type: object
 *       description: Kết quả phân trang lịch sử điều khiển thiết bị
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DeviceLog'
 *         total:
 *           type: integer
 *           description: Tổng số bản ghi (không tính phân trang)
 *           example: 45
 */

// ================= ROUTES =================

/**
 * @swagger
 * /api/device/control:
 *   post:
 *     summary: Gửi lệnh bật/tắt thiết bị
 *     description: >
 *       Ghi lệnh vào database với trạng thái `waiting`, sau đó publish lên MQTT.
 *       Nếu sau 10 giây không nhận được phản hồi, trạng thái sẽ tự động chuyển thành `failed`.
 *     tags: [Devices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeviceCommand'
 *     responses:
 *       200:
 *         description: Lệnh đã được ghi nhận và gửi đi thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeviceControlResponse'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/device/control', async (req, res) => {
    const { device, state } = req.body;
    const deviceId = DEVICE_MAP[device];
    const action = state === 'ON' ? 'TURN_ON' : 'TURN_OFF';

    try {
        const [result] = await db.query(
            `INSERT INTO device_log (device_id, action, status) VALUES (?, ?, 'waiting')`,
            [deviceId, action]
        );
        const logId = result.insertId;

        const mqttClient = req.app.get('mqttClient');
        mqttClient.publish('device/control', JSON.stringify({ device, state }));

        setTimeout(async () => {
            try {
                const [rows] = await db.query(`SELECT status FROM device_log WHERE id = ?`, [logId]);

                if (rows.length > 0 && rows[0].status === 'waiting') {
                    await db.query(`UPDATE device_log SET status = 'failed' WHERE id = ?`, [logId]);

                    const io = req.app.get('socketio');
                    io?.emit('realtime_device_status', { device, state, result: 'failed', logId });
                }
            } catch (err) {
                console.error("Timeout error:", err.message);
            }
        }, 10000);

        res.json({ message: 'Command sent', logId, status: 'waiting' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/devices/status:
 *   get:
 *     summary: Lấy trạng thái hiện tại của tất cả thiết bị
 *     description: Trả về hành động thành công gần nhất của từng thiết bị, dùng để hiển thị trạng thái bật/tắt trên dashboard.
 *     tags: [Devices]
 *     responses:
 *       200:
 *         description: Danh sách trạng thái thiết bị
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DeviceStatus'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/devices/status', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT d.id as device_id, d.device_name,
            (SELECT action FROM device_log 
             WHERE device_id = d.id AND status = 'success' 
             ORDER BY id DESC LIMIT 1) as last_success_action
            FROM devices d
        `);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/devices/list:
 *   get:
 *     summary: Lấy danh sách tất cả thiết bị
 *     description: Trả về danh sách thiết bị, thường dùng để đổ vào dropdown hoặc bộ lọc.
 *     tags: [Devices]
 *     responses:
 *       200:
 *         description: Danh sách thiết bị
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Device'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/devices/list', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, device_name FROM devices');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/devices/logs:
 *   get:
 *     summary: Lấy lịch sử điều khiển thiết bị
 *     description: Hỗ trợ tìm kiếm, lọc nhiều điều kiện và phân trang.
 *     tags: [Devices]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số bản ghi trên mỗi trang
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Vị trí bắt đầu lấy dữ liệu
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, timestamp]
 *           default: id
 *         description: Cột dùng để sắp xếp
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Thứ tự sắp xếp
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên thiết bị hoặc thời gian (dd/mm/yyyy, hh:mm:ss)
 *       - in: query
 *         name: logId
 *         schema:
 *           type: string
 *         description: Lọc theo ID bản ghi log (hỗ trợ tìm gần đúng)
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: integer
 *         description: Lọc theo ID thiết bị
 *       - in: query
 *         name: deviceName
 *         schema:
 *           type: string
 *         description: Lọc theo tên thiết bị (khớp chính xác)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [TURN_ON, TURN_OFF]
 *         description: Lọc theo loại hành động
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failed, waiting]
 *         description: Lọc theo trạng thái thực thi
 *       - in: query
 *         name: timestamp
 *         schema:
 *           type: string
 *         description: Lọc theo thời gian (hỗ trợ tìm gần đúng, định dạng dd/mm/yyyy, hh:mm:ss)
 *     responses:
 *       200:
 *         description: Danh sách lịch sử điều khiển có phân trang
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeviceLogResponse'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/devices/logs', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const { search, logId, deviceId, deviceName, action, status, timestamp, sortBy, sortOrder } = req.query;

    try {
        let whereClause = 'WHERE 1=1';
        const queryParams = [];

        if (search) {
            whereClause += ` AND (d.device_name LIKE ? OR DATE_FORMAT(dl.timestamp, '%d/%m/%Y, %H:%i:%s') LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        if (logId) {
            whereClause += ` AND dl.id LIKE ?`;
            queryParams.push(`%${logId}%`);
        }

        if (deviceId) {
            const cleanDeviceId = deviceId.replace(/\D/g, '');
            if (cleanDeviceId) {
                whereClause += ` AND dl.device_id = ?`;
                queryParams.push(cleanDeviceId);
            }
        }

        if (deviceName) {
            whereClause += ` AND d.device_name = ?`;
            queryParams.push(deviceName);
        }

        if (action) {
            whereClause += ` AND dl.action = ?`;
            queryParams.push(action);
        }

        if (status) {
            whereClause += ` AND dl.status = ?`;
            queryParams.push(status);
        }

        if (timestamp) {
            whereClause += ` AND DATE_FORMAT(dl.timestamp, '%d/%m/%Y, %H:%i:%s') LIKE ?`;
            queryParams.push(`%${timestamp}%`);
        }

        const validSortColumns = {
            id: 'dl.id',
            timestamp: 'dl.timestamp'
        };

        const dbSortColumn = validSortColumns[sortBy] || 'dl.id';
        const dbSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

        const dataQuery = `
            SELECT dl.id, dl.device_id, d.device_name, dl.action, dl.status, dl.timestamp
            FROM device_log dl
            JOIN devices d ON dl.device_id = d.id
            ${whereClause}
            ORDER BY ${dbSortColumn} ${dbSortOrder}
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM device_log dl
            JOIN devices d ON dl.device_id = d.id
            ${whereClause}
        `;

        const [rows] = await db.query(dataQuery, [...queryParams, limit, offset]);
        const [countResult] = await db.query(countQuery, queryParams);

        res.json({
            data: rows,
            total: countResult[0].total
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;