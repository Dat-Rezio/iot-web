const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

// ================= SWAGGER TAGS =================

/**
 * @swagger
 * tags:
 *   name: Sensors
 *   description: API quản lý danh sách và lịch sử dữ liệu cảm biến
 */

// ================= SCHEMAS =================

/**
 * @swagger
 * components:
 *   schemas:
 *     Sensor:
 *       type: object
 *       description: Thông tin một cảm biến
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         sensor_name:
 *           type: string
 *           example: Nhiệt độ
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2026-01-01T00:00:00Z"
 *
 *     SensorHistoryItem:
 *       type: object
 *       description: Một bản ghi lịch sử đo của cảm biến
 *       properties:
 *         id:
 *           type: integer
 *           example: 101
 *         sensor_id:
 *           type: integer
 *           example: 1
 *         sensor_name:
 *           type: string
 *           example: Nhiệt độ
 *         unit:
 *           type: string
 *           example: "°C"
 *         value:
 *           type: number
 *           format: double
 *           nullable: true
 *           example: 27.5
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2026-04-12T21:00:00Z"
 *
 *     SensorHistoryResponse:
 *       type: object
 *       description: Kết quả phân trang lịch sử cảm biến
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SensorHistoryItem'
 *         total:
 *           type: integer
 *           description: Tổng số bản ghi (không tính phân trang)
 *           example: 150
 */

// ================= ROUTES =================

/**
 * @swagger
 * /api/sensors/list:
 *   get:
 *     summary: Lấy danh sách tất cả cảm biến
 *     description: Trả về danh sách cảm biến, thường dùng để đổ vào dropdown hoặc bộ lọc.
 *     tags: [Sensors]
 *     responses:
 *       200:
 *         description: Danh sách cảm biến
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Sensor'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/list', sensorController.getSensorList);

/**
 * @swagger
 * /api/sensors/history:
 *   get:
 *     summary: Lấy lịch sử dữ liệu cảm biến
 *     description: Hỗ trợ tìm kiếm, lọc nhiều điều kiện và phân trang.
 *     tags: [Sensors]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số bản ghi trên mỗi trang
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Vị trí bắt đầu lấy dữ liệu
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, timestamp]
 *           default: id
 *         description: Cột dùng để sắp xếp
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Thứ tự sắp xếp
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên cảm biến hoặc thời gian (dd/mm/yyyy hh:mm:ss)
 *       - in: query
 *         name: logId
 *         schema:
 *           type: string
 *         description: Lọc theo ID bản ghi (hỗ trợ tìm gần đúng)
 *       - in: query
 *         name: sensorId
 *         schema:
 *           type: integer
 *         description: Lọc theo ID cảm biến
 *       - in: query
 *         name: sensorName
 *         schema:
 *           type: string
 *         description: Lọc theo tên cảm biến (khớp chính xác)
 *       - in: query
 *         name: value
 *         schema:
 *           type: string
 *         description: Lọc theo giá trị đo (hỗ trợ tìm gần đúng)
 *       - in: query
 *         name: timestamp
 *         schema:
 *           type: string
 *         description: Lọc theo thời gian (hỗ trợ tìm gần đúng, định dạng dd/mm/yyyy hh:mm:ss)
 *     responses:
 *       200:
 *         description: Danh sách lịch sử cảm biến có phân trang
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SensorHistoryResponse'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/history', sensorController.getSensorHistory);

module.exports = router;