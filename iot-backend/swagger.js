// swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path'); // Thêm dòng này

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'IoT Project API Documentation',
      version: '1.0.0',
      description: 'API dành cho hệ thống điều khiển thiết bị IoT (ExpressJS & ReactJS)',
    },
    servers: [
      {
        url: 'http://localhost:5000', // URL của backend
      },
    ],
  },
  // Đường dẫn tới các file chứa chú thích API (thường là các file routes)
  // Sử dụng path.join để đảm bảo quét đúng thư mục routes
  apis: [path.join(__dirname, './routes/*.js')],
};

const specs = swaggerJsdoc(options);
module.exports = specs;