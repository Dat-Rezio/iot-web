require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const http = require('http');
const { Server } = require('socket.io');

// Import Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger'); 

// Import DB và các Router
const db = require('./config/db');
const dashboardRoutes = require('./routes/dashboard');
const sensorRoutes = require('./routes/sensors');
const deviceRoutes = require('./routes/devices');

const app = express();

// 1. Cấu hình Middleware (Nên đặt ở đây)
app.use(cors());
app.use(express.json());

// 2. Tích hợp Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 3. Tạo HTTP Server cho Socket.io
const server = http.createServer(app);
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
                    const action = state === 'ON' ? 'TURN_ON' : 'TURN_OFF';
                    await db.query(
                        `INSERT INTO device_log (device_id, action, status) VALUES (?, ?, 'success')`,
                        [deviceId, action]
                    );
                    io.emit('realtime_device_status', { device, state, result: 'success' });
                } else {
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
app.use('/api', deviceRoutes); 

// ==========================================
// CHẠY SERVER (CHỈ DÙNG server.listen)
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📖 Tài liệu API: http://localhost:${PORT}/api-docs`);
});