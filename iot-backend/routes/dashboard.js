const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// ================= SWAGGER TAGS =================

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: API hiển thị dữ liệu tổng quan của các cảm biến
 */

// ================= SHARED SCHEMAS =================

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Server error
 *         error:
 *           type: string
 *           example: "Column 'sensor_id' cannot be null"
 *
 *     SensorLatest:
 *       type: object
 *       description: Giá trị đo mới nhất của một cảm biến
 *       properties:
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
 *     ChartDataPoint:
 *       type: object
 *       description: Một điểm dữ liệu lịch sử dùng để vẽ biểu đồ
 *       properties:
 *         sensor_id:
 *           type: integer
 *           example: 1
 *         value:
 *           type: number
 *           format: double
 *           nullable: true
 *           example: 26.8
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2026-04-12T20:50:00Z"
 */

// ================= ROUTES =================

/**
 * @swagger
 * /api/dashboard/latest:
 *   get:
 *     summary: Lấy giá trị mới nhất của tất cả cảm biến
 *     description: Trả về một bản ghi mới nhất cho mỗi cảm biến, dùng để hiển thị trạng thái hiện tại trên dashboard.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Danh sách giá trị mới nhất theo từng cảm biến
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SensorLatest'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/latest', dashboardController.getLatestData);

/**
 * @swagger
 * /api/dashboard/chart-init:
 *   get:
 *     summary: Lấy dữ liệu lịch sử gần nhất để khởi tạo biểu đồ
 *     description: Trả về tối đa 10 bản ghi gần nhất cho mỗi cảm biến, sắp xếp theo thời gian giảm dần.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Danh sách điểm dữ liệu lịch sử theo từng cảm biến
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChartDataPoint'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/chart-init', dashboardController.getChartInitData);

module.exports = router;