const express = require('express');
const router = express.Router();
const db = require('../config/db');

const DEVICE_MAP = { led1: 1, led2: 2, led3: 3 };

// API: Gửi lệnh điều khiển thiết bị
router.post('/device/control', async (req, res) => {
    const { device, state } = req.body;
    const deviceId = DEVICE_MAP[device];
    const action = state === 'ON' ? 'TURN_ON' : 'TURN_OFF';

    try {
        // 1. Tạo bản ghi trạng thái 'waiting' ngay lập tức
        const [result] = await db.query(
            `INSERT INTO device_log (device_id, action, status) VALUES (?, ?, 'waiting')`,
            [deviceId, action]
        );
        const logId = result.insertId;

        // 2. Gửi lệnh qua MQTT
        const mqttClient = req.app.get('mqttClient');
        const payload = JSON.stringify({ device, state });
        
        mqttClient.publish('device/control', payload);

        // 3. Thiết lập Timeout 10 giây
        setTimeout(async () => {
            try {
                // Kiểm tra lại Database xem bản ghi này còn là 'waiting' không
                const [rows] = await db.query(`SELECT status FROM device_log WHERE id = ?`, [logId]);
                
                if (rows.length > 0 && rows[0].status === 'waiting') {
                    // Chắc chắn cập nhật Database thành 'failed'
                    await db.query(`UPDATE device_log SET status = 'failed' WHERE id = ?`, [logId]);
                    
                    // Lấy biến io ra một cách an toàn
                    const io = req.app.get('socketio');
                    
                    // Kiểm tra xem io có tồn tại không rồi mới emit để chống crash
                    if (io) {
                        io.emit('realtime_device_status', { device, state, result: 'failed', logId });
                    } else {
                        console.warn("Bỏ qua gửi Socket: Biến 'io' chưa được khởi tạo đúng cách.");
                    }
                }
            } catch (err) {
                // Nếu có lỗi SQL hoặc lỗi logic, in ra log chứ tuyệt đối KHÔNG làm sập server
                console.error("Lỗi ngầm trong quá trình xử lý Timeout 10s:", err.message);
            }
        }, 10000);

        res.json({ message: 'Command sent', logId, status: 'waiting' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Lấy trạng thái hiện tại (mới nhất) của các thiết bị
router.get('/devices/status', async (req, res) => {
    try {
        // Query này lấy ra hành động SUCCESS mới nhất cho từng thiết bị
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

// API MỚI: Lấy danh sách thiết bị đổ vào Dropdown
router.get('/devices/list', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, device_name FROM devices');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API CẬP NHẬT: Lấy danh sách Action Logs (Có phân trang, lọc, sắp xếp)
router.get('/devices/logs', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    // Nhận thêm sortBy và sortOrder
    const { search, logId, deviceId, deviceName, action, status, timestamp, sortBy, sortOrder } = req.query;

    try {
        let whereClause = 'WHERE 1=1';
        const queryParams = [];

        // 1. Tìm kiếm chung (Sửa DATE_FORMAT thành 24h: %H)
        if (search) {
            whereClause += ` AND (d.device_name LIKE ? OR DATE_FORMAT(dl.timestamp, '%d/%m/%Y, %H:%i:%s') LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        // 2. Lọc theo Logs ID bằng LIKE
        if (logId) {
            whereClause += ` AND dl.id LIKE ?`;
            queryParams.push(`%${logId}%`);
        }

        // 3. Lọc theo Device ID
        if (deviceId) {
            const cleanDeviceId = deviceId.replace(/\D/g, ''); 
            if (cleanDeviceId) {
                whereClause += ` AND dl.device_id = ?`;
                queryParams.push(cleanDeviceId);
            }
        }

        // 4. Lọc theo Device Name
        if (deviceName) {
            whereClause += ` AND d.device_name = ?`;
            queryParams.push(deviceName);
        }

        // 5. Lọc theo Action
        if (action) {
            whereClause += ` AND dl.action = ?`;
            queryParams.push(action);
        }

        // 6. Lọc theo Status
        if (status) {
            whereClause += ` AND dl.status = ?`;
            queryParams.push(status);
        }

        // 7. Lọc theo Timestamp (Sửa DATE_FORMAT thành 24h: %H)
        if (timestamp) {
            whereClause += ` AND DATE_FORMAT(dl.timestamp, '%d/%m/%Y, %H:%i:%s') LIKE ?`;
            queryParams.push(`%${timestamp}%`);
        }

        // --- LOGIC SẮP XẾP ĐỘNG ĐƠN LẺ ---
        const validSortColumns = {
            'id': 'dl.id',
            'timestamp': 'dl.timestamp'
        };
        
        // Mặc định sắp xếp theo id nếu không truyền
        const dbSortColumn = validSortColumns[sortBy] || 'dl.id';
        const dbSortOrder = (sortOrder === 'ASC') ? 'ASC' : 'DESC';

        const orderByClause = `ORDER BY ${dbSortColumn} ${dbSortOrder}`;

        const dataQuery = `
            SELECT dl.id, dl.device_id, d.device_name, dl.action, dl.status, dl.timestamp 
            FROM device_log dl
            JOIN devices d ON dl.device_id = d.id
            ${whereClause}
            ${orderByClause} 
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