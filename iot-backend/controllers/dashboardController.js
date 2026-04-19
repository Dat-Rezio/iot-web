const db = require('../config/db');

// GET: Lấy giá trị mới nhất của tất cả cảm biến (Phục vụ các thẻ Sensor Cards)
const getLatestData = async (req, res) => {
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
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

// GET: Lấy dữ liệu lịch sử gần nhất để khởi tạo biểu đồ (Data Chart)
const getChartInitData = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT sensor_id, value, timestamp
            FROM (
                SELECT *,
                       ROW_NUMBER() OVER (PARTITION BY sensor_id ORDER BY timestamp DESC) AS rn
                FROM sensor_history
            ) t
            WHERE rn <= 10
            ORDER BY sensor_id, timestamp DESC
        `);

        res.json(rows);
    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

module.exports = {
    getLatestData,
    getChartInitData
};