const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// ================= SWAGGER TAGS =================

/**
 * @swagger
 * tags:
 *   name: Devices
 *   description: API quản lý và điều khiển thiết bị (đèn LED, quạt, máy bơm...)
 */

// ================= SCHEMAS =================

/**
 * @swagger
 * components:
 *   schemas:
 *     Device:
 *       type: object
 *       description: Thông tin một thiết bị
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         device_name:
 *           type: string
 *           example: Đèn LED 1
 *         description:
 *           type: string
 *           nullable: true
 *           example: Đèn chiếu sáng khu vực A
 *
 *     DeviceCommand:
 *       type: object
 *       description: Lệnh điều khiển thiết bị
 *       required:
 *         - device
 *         - state
 *       properties:
 *         device:
 *           type: string
 *           description: Mã định danh thiết bị
 *           example: led1
 *         state:
 *           type: string
 *           enum: [ON, OFF]
 *           description: Trạng thái cần chuyển
 *           example: ON
 *
 *     DeviceControlResponse:
 *       type: object
 *       description: Kết quả sau khi gửi lệnh điều khiển
 *       properties:
 *         message:
 *           type: string
 *           example: Command sent
 *         logId:
 *           type: integer
 *           description: ID bản ghi log vừa được tạo
 *           example: 105
 *         status:
 *           type: string
 *           description: Trạng thái ban đầu của lệnh
 *           example: waiting
 *
 *     DeviceStatus:
 *       type: object
 *       description: Trạng thái hiện tại của một thiết bị
 *       properties:
 *         device_id:
 *           type: integer
 *           example: 1
 *         device_name:
 *           type: string
 *           example: Đèn LED 1
 *         last_success_action:
 *           type: string
 *           nullable: true
 *           enum: [TURN_ON, TURN_OFF]
 *           description: Hành động thành công gần nhất (null nếu chưa từng thực thi)
 *           example: TURN_ON
 *
 *     DeviceLog:
 *       type: object
 *       description: Một bản ghi lịch sử điều khiển thiết bị
 *       properties:
 *         id:
 *           type: integer
 *           example: 105
 *         device_id:
 *           type: integer
 *           example: 1
 *         device_name:
 *           type: string
 *           example: Đèn LED 1
 *         action:
 *           type: string
 *           enum: [TURN_ON, TURN_OFF]
 *           example: TURN_ON
 *         status:
 *           type: string
 *           enum: [waiting, success, failed]
 *           example: success
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2026-04-12T21:00:00Z"
 *
 *     DeviceLogResponse:
 *       type: object
 *       description: Kết quả phân trang lịch sử điều khiển thiết bị
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DeviceLog'
 *         total:
 *           type: integer
 *           description: Tổng số bản ghi (không tính phân trang)
 *           example: 45
 */

// ================= ROUTES =================

/**
 * @swagger
 * /api/device/control:
 *   post:
 *     summary: Gửi lệnh bật/tắt thiết bị
 *     description: >
 *       Ghi lệnh vào database với trạng thái `waiting`, sau đó publish lên MQTT.
 *       Nếu sau 10 giây không nhận được phản hồi, trạng thái sẽ tự động chuyển thành `failed`.
 *     tags: [Devices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeviceCommand'
 *     responses:
 *       200:
 *         description: Lệnh đã được ghi nhận và gửi đi thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeviceControlResponse'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/device/control', deviceController.controlDevice);

/**
 * @swagger
 * /api/devices/status:
 *   get:
 *     summary: Lấy trạng thái hiện tại của tất cả thiết bị
 *     description: Trả về hành động thành công gần nhất của từng thiết bị, dùng để hiển thị trạng thái bật/tắt trên dashboard.
 *     tags: [Devices]
 *     responses:
 *       200:
 *         description: Danh sách trạng thái thiết bị
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DeviceStatus'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/devices/status', deviceController.getDeviceStatus);

/**
 * @swagger
 * /api/devices/list:
 *   get:
 *     summary: Lấy danh sách tất cả thiết bị
 *     description: Trả về danh sách thiết bị, thường dùng để đổ vào dropdown hoặc bộ lọc.
 *     tags: [Devices]
 *     responses:
 *       200:
 *         description: Danh sách thiết bị
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Device'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/devices/list', deviceController.getDeviceList);

/**
 * @swagger
 * /api/devices/logs:
 *   get:
 *     summary: Lấy lịch sử điều khiển thiết bị
 *     description: Hỗ trợ tìm kiếm, lọc nhiều điều kiện và phân trang.
 *     tags: [Devices]
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
 *         description: Tìm kiếm theo tên thiết bị hoặc thời gian (dd/mm/yyyy, hh:mm:ss)
 *       - in: query
 *         name: logId
 *         schema:
 *           type: string
 *         description: Lọc theo ID bản ghi log (hỗ trợ tìm gần đúng)
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: integer
 *         description: Lọc theo ID thiết bị
 *       - in: query
 *         name: deviceName
 *         schema:
 *           type: string
 *         description: Lọc theo tên thiết bị (khớp chính xác)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [TURN_ON, TURN_OFF]
 *         description: Lọc theo loại hành động
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failed, waiting]
 *         description: Lọc theo trạng thái thực thi
 *       - in: query
 *         name: timestamp
 *         schema:
 *           type: string
 *         description: Lọc theo thời gian (hỗ trợ tìm gần đúng, định dạng dd/mm/yyyy, hh:mm:ss)
 *     responses:
 *       200:
 *         description: Danh sách lịch sử điều khiển có phân trang
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeviceLogResponse'
 *       500:
 *         description: Lỗi server
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/devices/logs', deviceController.getDeviceLogs);

module.exports = router;