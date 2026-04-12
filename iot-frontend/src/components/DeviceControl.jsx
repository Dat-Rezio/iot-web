import React, { useState, useEffect } from 'react';
import { Fan, Wind, Lightbulb } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client'; // KHAI BÁO THÊM SOCKET

const DeviceControl = () => {
  const [devices, setDevices] = useState({
    led1: false,
    led2: false,
    led3: false,
  });

  const [loading, setLoading] = useState('');

  // 1. Effect lấy trạng thái ban đầu
  useEffect(() => {
    const fetchDeviceStatus = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/devices/status');
        const currentStatus = { led1: false, led2: false, led3: false };
        
        res.data.forEach(item => {
          const deviceKey = `led${item.device_id}`;
          
          // Lấy giá trị hành động (hỗ trợ cả 2 trường hợp tên biến từ Backend)
          const finalAction = item.last_success_action || item.action;
          
          // Chỉ bật ON nếu lệnh thành công cuối cùng là TURN_ON
          currentStatus[deviceKey] = finalAction === 'TURN_ON';
        });

        setDevices(currentStatus);
      } catch (error) {
        console.error("Lỗi khi lấy trạng thái thiết bị:", error);
      }
    };
    fetchDeviceStatus();
  }, []);

  // 2. TẠO EFFECT MỚI: Lắng nghe phản hồi từ phần cứng qua Socket
  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('realtime_device_status', (data) => {
      setLoading(''); // Giải phóng nút bấm

      if (data.result === 'success') {
        setDevices(prev => ({
          ...prev,
          [data.device]: data.state === 'ON'
        }));
      } else if (data.result === 'failed') {
        alert(`Thao tác với ${data.device} thất bại hoặc quá thời gian phản hồi!`);
      }
    });
    return () => {
      socket.off('realtime_device_status');
      socket.disconnect();
    } 
  }, []);

  // 3. Hàm xử lý gửi lệnh (Không đổi màu ngay lập tức nữa)
  const handleToggle = async (deviceId, currentState) => {
    setLoading(deviceId); // Khóa nút ngay lập tức
    const newState = currentState ? 'OFF' : 'ON'; 

    try {
      await axios.post('http://localhost:5000/api/device/control', {
        device: deviceId,
        state: newState
      });
      // Đã xóa dòng setDevices ở đây. Giờ web sẽ kiên nhẫn đợi Effect 2 kích hoạt!
    } catch (error) {
      alert("Lỗi kết nối đến Server!");
      setLoading(''); // Mở khóa nếu lỗi mạng
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-gray-500 text-sm mb-4">Device Control Panel</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Quạt (led1) */}
        <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50">
          <div className="flex items-center text-gray-700">
            <Fan className={`w-5 h-5 mr-3 transition-colors ${devices.led1 ? 'icon-bounce text-green-500' : ''}`} /> 
            <span className="font-medium">Fan</span>
          </div>
          <button disabled={loading === 'led1'} onClick={() => handleToggle('led1', devices.led1)}
            className={`px-4 py-1.5 rounded font-medium transition-colors ${devices.led1 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'} disabled:opacity-50 disabled:cursor-wait`}>
            {loading === 'led1' ? 'WAIT...' : (devices.led1 ? 'ON' : 'OFF')}
          </button>
        </div>

        {/* Phun sương (led2) */}
        <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50">
          <div className="flex items-center text-gray-700">
            <Wind className={`w-5 h-5 mr-3 transition-colors ${devices.led2 ? 'icon-bounce text-green-500' : ''}`} /> 
            <span className="font-medium">Humidifier</span>
          </div>
          <button disabled={loading === 'led2'} onClick={() => handleToggle('led2', devices.led2)}
            className={`px-4 py-1.5 rounded font-medium transition-colors ${devices.led2 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'} disabled:opacity-50 disabled:cursor-wait`}>
            {loading === 'led2' ? 'WAIT...' : (devices.led2 ? 'ON' : 'OFF')}
          </button>
        </div>

        {/* Đèn (led3) */}
        <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50">
          <div className="flex items-center text-gray-700">
            <Lightbulb className={`w-5 h-5 mr-3 transition-colors ${devices.led3 ? 'icon-bounce text-yellow-500' : ''}`} /> 
            <span className="font-medium">Lamp</span>
          </div>
          <button disabled={loading === 'led3'} onClick={() => handleToggle('led3', devices.led3)}
            className={`px-4 py-1.5 rounded font-medium transition-colors ${devices.led3 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'} disabled:opacity-50 disabled:cursor-wait`}>
            {loading === 'led3' ? 'WAIT...' : (devices.led3 ? 'ON' : 'OFF')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DeviceControl;