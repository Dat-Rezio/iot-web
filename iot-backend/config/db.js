// config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

// Kiểm tra kết nối
pool.getConnection()
    .then(() => console.log('Đã kết nối MySQL Database'))
    .catch((err) => console.error('Lỗi kết nối MySQL:', err));

module.exports = pool;