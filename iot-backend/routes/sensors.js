const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ================= CONSTANTS =================

const VALID_SORT_COLUMNS = {
    id: 'sh.id',
    timestamp: 'sh.timestamp'
};

// ================= UTILS =================

const buildWhereClause = (query) => {
    let where = 'WHERE 1=1';
    const params = [];

    if (query.search) {
        where += ` AND (s.sensor_name LIKE ? OR DATE_FORMAT(sh.timestamp, '%d/%m/%Y %H:%i:%s') LIKE ?)`;
        params.push(`%${query.search}%`, `%${query.search}%`);
    }

    if (query.logId) {
        where += ` AND sh.id LIKE ?`;
        params.push(`%${query.logId}%`);
    }

    if (query.sensorId) {
        const cleanId = query.sensorId.replace(/\D/g, '');
        if (cleanId) {
            where += ` AND sh.sensor_id = ?`;
            params.push(cleanId);
        }
    }

    if (query.sensorName) {
        where += ` AND s.sensor_name = ?`;
        params.push(query.sensorName);
    }

    if (query.value) {
        where += ` AND sh.value LIKE ?`;
        params.push(`%${query.value}%`);
    }

    if (query.timestamp) {
        where += ` AND DATE_FORMAT(sh.timestamp, '%d/%m/%Y %H:%i:%s') LIKE ?`;
        params.push(`%${query.timestamp}%`);
    }

    return { where, params };
};

// ================= SWAGGER TAGS =================

/**
 * @swagger
 * tags:
 *   name: Sensors
 *   description: API quản lý danh sách và lịch sử dữ liệu cảm biến
 */

// ================= SCHEMAS =================

/**
 * @swagger
 * components:
 *   schemas:
 *     Sensor:
 *       type: object
 *       description: Thông tin một cảm biến
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         sensor_name:
 *           type: string
 *           example: Nhiệt độ
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2026-01-01T00:00:00Z"
 *
 *     SensorHistoryItem:
 *       type: object
 *       description: Một bản ghi lịch sử đo của cảm biến
 *       properties:
 *         id:
 *           type: integer
 *           example: 101
 *         sensor_id:
 *           type: integer
 *           example: 1
 *         sensor_name:
 *           type: string
 *           example: Nhiệt độ
 *         unit:
 *           type: string
 *           example: "°C"
 *         value:
 *           type: number
 *           format: double
 *           nullable: true
 *           example: 27.5
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2026-04-12T21:00:00Z"
 *
 *     SensorHistoryResponse:
 *       type: object
 *       description: Kết quả phân trang lịch sử cảm biến
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SensorHistoryItem'
 *         total:
 *           type: integer
 *           description: Tổng số bản ghi (không tính phân trang)
 *           example: 150
 */

// ================= ROUTES =================

/**
 * @swagger
 * /api/sensors/list:
 *   get:
 *     summary: Lấy danh sách tất cả cảm biến
 *     description: Trả về danh sách cảm biến, thường dùng để đổ vào dropdown hoặc bộ lọc.
 *     tags: [Sensors]
 *     responses:
 *       200:
 *         description: Danh sách cảm biến
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Sensor'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/list', async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT id, sensor_name FROM sensors`);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

/**
 * @swagger
 * /api/sensors/history:
 *   get:
 *     summary: Lấy lịch sử dữ liệu cảm biến
 *     description: Hỗ trợ tìm kiếm, lọc nhiều điều kiện và phân trang.
 *     tags: [Sensors]
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
 *         description: Tìm kiếm theo tên cảm biến hoặc thời gian (dd/mm/yyyy hh:mm:ss)
 *       - in: query
 *         name: logId
 *         schema:
 *           type: string
 *         description: Lọc theo ID bản ghi (hỗ trợ tìm gần đúng)
 *       - in: query
 *         name: sensorId
 *         schema:
 *           type: integer
 *         description: Lọc theo ID cảm biến
 *       - in: query
 *         name: sensorName
 *         schema:
 *           type: string
 *         description: Lọc theo tên cảm biến (khớp chính xác)
 *       - in: query
 *         name: value
 *         schema:
 *           type: string
 *         description: Lọc theo giá trị đo (hỗ trợ tìm gần đúng)
 *       - in: query
 *         name: timestamp
 *         schema:
 *           type: string
 *         description: Lọc theo thời gian (hỗ trợ tìm gần đúng, định dạng dd/mm/yyyy hh:mm:ss)
 *     responses:
 *       200:
 *         description: Danh sách lịch sử cảm biến có phân trang
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SensorHistoryResponse'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/history', async (req, res) => {
    const limit = Number(req.query.limit) || 10;
    const offset = Number(req.query.offset) || 0;

    try {
        const { where, params } = buildWhereClause(req.query);

        const sortColumn = VALID_SORT_COLUMNS[req.query.sortBy] || 'sh.id';
        const sortOrder = req.query.sortOrder === 'ASC' ? 'ASC' : 'DESC';

        const dataQuery = `
            SELECT sh.id, sh.sensor_id, s.sensor_name, s.unit, sh.value, sh.timestamp
            FROM sensor_history sh
            JOIN sensors s ON sh.sensor_id = s.id
            ${where}
            ORDER BY ${sortColumn} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM sensor_history sh
            JOIN sensors s ON sh.sensor_id = s.id
            ${where}
        `;

        const [data] = await db.query(dataQuery, [...params, limit, offset]);
        const [count] = await db.query(countQuery, params);

        res.json({
            data,
            total: count[0].total
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;