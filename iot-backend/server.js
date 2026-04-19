require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

// Import Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger'); 

// Import cấu hình kết nối
const socket = require('./config/socket');
const mqtt = require('./config/mqtt');

// Import Routes
const dashboardRoutes = require('./routes/dashboard');
const sensorRoutes = require('./routes/sensors');
const deviceRoutes = require('./routes/devices');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Tạo HTTP Server và khởi tạo Socket, MQTT độc lập
const server = http.createServer(app);
socket.init(server);
mqtt.initMqtt();

// Đăng ký Router
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api', deviceRoutes); 

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    console.log(`📖 Tài liệu API: http://localhost:${PORT}/api-docs`);
});