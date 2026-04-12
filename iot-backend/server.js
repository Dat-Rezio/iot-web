require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const http = require('http');
const { Server } = require('socket.io');

// Import DB và các Router
const db = require('./config/db');
const dashboardRoutes = require('./routes/dashboard');
const sensorRoutes = require('./routes/sensors');
const deviceRoutes = require('./routes/devices');

const app = express();
const server = http.createServer(app);

// Cấu hình Middleware
app.use(cors());
app.use(express.json());

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.set('socketio', io);
// ==========================================
// KẾT NỐI & XỬ LÝ MQTT
// ==========================================
const mqttClient = mqtt.connect(process.env.MQTT_BROKER, {
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASS,
});

// Lưu mqttClient vào bộ nhớ của Express để các Router khác có thể lấy ra xài
app.set('mqttClient', mqttClient);

const SENSOR_MAP = { temperature: 1, humidity: 2, light: 3 };
const DEVICE_MAP = { led1: 1, led2: 2, led3: 3 };

mqttClient.on('connect', () => {
    console.log('✅ Đã kết nối MQTT Broker');
    mqttClient.subscribe(['sensor/data', 'device/status']);
});

mqttClient.on('message', async (topic, message) => {
    try {
        const payload = JSON.parse(message.toString());

        if (topic === 'sensor/data') {
            const { temperature, humidity, light } = payload;
            await db.query(
                `INSERT INTO sensor_history (sensor_id, value) VALUES (?, ?), (?, ?), (?, ?)`,
                [SENSOR_MAP.temperature, temperature, SENSOR_MAP.humidity, humidity, SENSOR_MAP.light, light]
            );
            io.emit('realtime_sensor_data', payload);
        } 

        else if (topic === 'device/status') {
            const { device, state, result } = payload;
            const deviceId = DEVICE_MAP[device];

            if (deviceId) {
                if (result === 'sync') {
                    // KỊCH BẢN 1: ESP32 vừa khởi động, báo cáo trạng thái thực tế
                    const action = state === 'ON' ? 'TURN_ON' : 'TURN_OFF';
                    
                    // Ghi đè trạng thái mới nhất vào DB (Coi như thao tác thành công)
                    await db.query(
                        `INSERT INTO device_log (device_id, action, status) VALUES (?, ?, 'success')`,
                        [deviceId, action]
                    );
                    
                    // Bắn Socket về Frontend để UI tự động reset màu nút bấm (không cần F5)
                    io.emit('realtime_device_status', { device, state, result: 'success' });
                    
                    console.log(`[SYNC] Đã đồng bộ ${device} về trạng thái ${state} do thiết bị khởi động lại.`);

                } else {
                    // KỊCH BẢN 2: Xử lý lệnh bật/tắt bình thường từ người dùng
                    await db.query(
                        `UPDATE device_log 
                         SET status = ? 
                         WHERE device_id = ? AND status = 'waiting' 
                         ORDER BY id DESC LIMIT 1`,
                        [result, deviceId]
                    );
                    
                    io.emit('realtime_device_status', payload);
                }
            }
        }
    } catch (error) {
        console.error('❌ Lỗi xử lý message MQTT:', error);
    }
});

// ==========================================
// ĐĂNG KÝ ROUTER
// ==========================================
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api', deviceRoutes); // Gộp cả /device/control và /devices/logs vào đây

// ==========================================
// CHẠY SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});