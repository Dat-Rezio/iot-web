const express = require('express');
const router = express.Router();
const db = require('../config/db');

// API 1: Lấy dữ liệu mới nhất
router.get('/latest', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT sh.sensor_id, s.sensor_name, s.unit, sh.value, sh.timestamp
            FROM sensor_history sh
            JOIN sensors s ON sh.sensor_id = s.id
            WHERE sh.id IN (
                SELECT MAX(id) FROM sensor_history GROUP BY sensor_id
            )
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API 2: Lấy 10 dữ liệu gần nhất (khởi tạo DataChart)
router.get('/chart-init', async (req, res) => {
    try {
        // Chỉ cần lấy thẳng từ bảng sensor_history là đủ và cực nhanh
        const [rows] = await db.query(`
            (SELECT sensor_id, value, timestamp FROM sensor_history WHERE sensor_id = 1 ORDER BY timestamp DESC LIMIT 10)
            UNION ALL
            (SELECT sensor_id, value, timestamp FROM sensor_history WHERE sensor_id = 2 ORDER BY timestamp DESC LIMIT 10)
            UNION ALL
            (SELECT sensor_id, value, timestamp FROM sensor_history WHERE sensor_id = 3 ORDER BY timestamp DESC LIMIT 10)
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;