const mqtt = require('mqtt');
const db = require('./db');
const socket = require('./socket'); // Import file socket vừa tạo

const SENSOR_MAP = { temperature: 1, humidity: 2, light: 3 };
const DEVICE_MAP = { led1: 1, led2: 2, led3: 3 };

let mqttClient;

const initMqtt = () => {
    mqttClient = mqtt.connect(process.env.MQTT_BROKER, {
        username: process.env.MQTT_USER,
        password: process.env.MQTT_PASS,
    });

    mqttClient.on('connect', () => {
        console.log('✅ Đã kết nối MQTT Broker');
        mqttClient.subscribe(['sensor/data', 'device/status']);
    });

    mqttClient.on('message', async (topic, message) => {
        try {
            const io = socket.getIo(); // Lấy biến io từ file socket.js
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
                            `UPDATE device_log SET status = ? WHERE device_id = ? AND status = 'waiting' ORDER BY id DESC LIMIT 1`,
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

    return mqttClient;
};

const getMqttClient = () => {
    if (!mqttClient) throw new Error("MQTT Client chưa được khởi tạo!");
    return mqttClient;
};

module.exports = { initMqtt, getMqttClient };