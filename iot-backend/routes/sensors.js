const express = require('express');
const router = express.Router();
const db = require('../config/db');

// API: Lấy danh sách tên cảm biến thực tế từ Database để đưa vào Dropdown
router.get('/list', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, sensor_name FROM sensors');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Trang Sensor History (Có phân trang, lọc, sắp xếp động)
router.get('/history', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    // 1. Nhận các params lọc và cả params sắp xếp (sortBy, sortOrder)
    const { search, logId, sensorId, sensorName, value, timestamp, sortBy, sortOrder } = req.query;

    try {
        let whereClause = 'WHERE 1=1'; 
        const queryParams = [];

        // --- CÁC ĐIỀU KIỆN LỌC (FILTER) ---
        if (search) {
            whereClause += ` AND (s.sensor_name LIKE ? OR DATE_FORMAT(sh.timestamp, '%d/%m/%Y, %H:%i:%s') LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        if (logId) {
            whereClause += ` AND sh.id LIKE ?`;
            queryParams.push(`%${logId}%`);
        }

        if (sensorId) {
            const cleanSensorId = sensorId.replace(/\D/g, ''); 
            if (cleanSensorId) {
                whereClause += ` AND sh.sensor_id = ?`;
                queryParams.push(cleanSensorId);
            }
        }

        if (sensorName) {
            whereClause += ` AND s.sensor_name = ?`;
            queryParams.push(sensorName);
        }

        if (value) {
            whereClause += ` AND sh.value LIKE ?`;
            queryParams.push(`%${value}%`);
        }

        if (timestamp) {
            whereClause += ` AND DATE_FORMAT(sh.timestamp, '%d/%m/%Y, %H:%i:%s') LIKE ?`;
            queryParams.push(`%${timestamp}%`);
        }

        // --- LOGIC SẮP XẾP ĐỘNG (SORT) ---
        // Cho phép sắp xếp theo 'id' hoặc 'timestamp'. Mặc định là 'timestamp'
        const validSortColumns = {
            'id': 'sh.id',
            'timestamp': 'sh.timestamp'
        };
        const dbSortColumn = validSortColumns[sortBy] || 'sh.id'; // Mặc định sắp xếp theo ID nếu sortBy không hợp lệ
        const dbSortOrder = (sortOrder === 'ASC') ? 'ASC' : 'DESC';

        // Tạo câu lệnh ORDER BY
        const orderByClause = `ORDER BY ${dbSortColumn} ${dbSortOrder}`;

        // --- TRUY VẤN DỮ LIỆU ---
        const dataQuery = `
            SELECT sh.id, sh.sensor_id, s.sensor_name, s.unit, sh.value, sh.timestamp 
            FROM sensor_history sh
            JOIN sensors s ON sh.sensor_id = s.id
            ${whereClause}
            ${orderByClause} 
            LIMIT ? OFFSET ?
        `;
        
        const countQuery = `
            SELECT COUNT(*) as total
            FROM sensor_history sh
            JOIN sensors s ON sh.sensor_id = s.id
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