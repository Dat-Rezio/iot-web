const db = require('../config/db');

// ================= CONSTANTS & UTILS =================

const VALID_SORT_COLUMNS = {
    id: 'sh.id',
    timestamp: 'sh.timestamp'
};

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

// ================= CONTROLLERS =================

// GET: Lấy danh sách tất cả cảm biến (Đổ vào dropdown)
const getSensorList = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT id, sensor_name FROM sensors`);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// GET: Lấy lịch sử dữ liệu cảm biến (Phân trang, bộ lọc)
const getSensorHistory = async (req, res) => {
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
};

module.exports = {
    getSensorList,
    getSensorHistory
};