const db = require('../config/db');
const mqtt = require('../config/mqtt');
const socket = require('../config/socket');

const DEVICE_MAP = { led1: 1, led2: 2, led3: 3 };

// POST: Gửi lệnh điều khiển thiết bị
const controlDevice = async (req, res) => {
    const { device, state } = req.body;
    const deviceId = DEVICE_MAP[device];
    const action = state === 'ON' ? 'TURN_ON' : 'TURN_OFF';

    try {
        const [result] = await db.query(
            `INSERT INTO device_log (device_id, action, status) VALUES (?, ?, 'waiting')`,
            [deviceId, action]
        );
        const logId = result.insertId;

        const mqttClient = mqtt.getMqttClient();
        mqttClient.publish('device/control', JSON.stringify({ device, state }));

        setTimeout(async () => {
            try {
                const [rows] = await db.query(`SELECT status FROM device_log WHERE id = ?`, [logId]);

                if (rows.length > 0 && rows[0].status === 'waiting') {
                    await db.query(`UPDATE device_log SET status = 'failed' WHERE id = ?`, [logId]);

                    const io = socket.getIo();
                    io.emit('realtime_device_status', { device, state, result: 'failed', logId });
                }
            } catch (err) {
                console.error("Timeout error:", err.message);
            }
        }, 10000);

        res.json({ message: 'Command sent', logId, status: 'waiting' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET: Lấy trạng thái hiện tại
const getDeviceStatus = async (req, res) => {
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
};

// GET: Lấy danh sách thiết bị
const getDeviceList = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, device_name FROM devices');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET: Lấy lịch sử Logs (Phân trang, bộ lọc)
const getDeviceLogs = async (req, res) => {
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
};

module.exports = {
    controlDevice,
    getDeviceStatus,
    getDeviceList,
    getDeviceLogs
};