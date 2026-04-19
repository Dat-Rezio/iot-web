const { Server } = require('socket.io');

let io;

module.exports = {
    init: (server) => {
        io = new Server(server, {
            cors: { origin: '*', methods: ['GET', 'POST'] }
        });
        return io;
    },
    getIo: () => {
        if (!io) {
            throw new Error("Socket.io chưa được khởi tạo!");
        }
        return io;
    }
};