import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import SensorCards from '../components/SensorCards';
import DataChart from '../components/DataChart';
import DeviceControl from '../components/DeviceControl';

// Khởi tạo kết nối Socket (đặt ngoài component để không bị re-connect nhiều lần)
const socket = io('http://localhost:5000');

const Dashboard = () => {
  const [selectedSensor, setSelectedSensor] = useState('temperature');
  
  // State lưu trữ giá trị cảm biến thời gian thực
  const [sensorData, setSensorData] = useState({
    temperature: { value: 0, unit: '°C' }, // Thêm trường unit vào state
    humidity: { value: 0, unit: '%' },
    light: { value: 0, unit: 'lux' }
  });

    useEffect(() => {
    const fetchInitialHistory = async () => {
      try {
        // 1. Lấy giá trị mới nhất
        const resLatest = await axios.get('http://localhost:5000/api/dashboard/latest');
        const latestMap = {};
        
        resLatest.data.forEach(item => {
          if (item.sensor_id === 1) latestMap.temperature = { value: item.value, unit: item.unit };
          if (item.sensor_id === 2) latestMap.humidity = { value: item.value, unit: item.unit };
          if (item.sensor_id === 3) latestMap.light = { value: item.value, unit: item.unit };
        });
        setSensorData(prev => ({ ...prev, ...latestMap }));

        // 2. Lấy 10 dữ liệu gần nhất cho biểu đồ
        const resHistory = await axios.get('http://localhost:5000/api/dashboard/chart-init');
        
        const historyBuffer = { temperature: [], humidity: [], light: [] };
        
        resHistory.data.forEach(item => {
          const point = {
            time: new Date(item.timestamp).toLocaleTimeString('it-IT'),
            value: item.value
          };
          
          // Dùng ID để phân loại (1: Nhiệt độ, 2: Độ ẩm, 3: Ánh sáng)
          if (item.sensor_id === 1) historyBuffer.temperature.push(point);
          if (item.sensor_id === 2) historyBuffer.humidity.push(point);
          if (item.sensor_id === 3) historyBuffer.light.push(point);
        });

        // Đảo ngược mảng để vẽ từ trái (cũ) sang phải (mới)
        setInitialChartData({
          temperature: historyBuffer.temperature.reverse(),
          humidity: historyBuffer.humidity.reverse(),
          light: historyBuffer.light.reverse()
        });

      } catch (error) {
        console.error("Lỗi khởi tạo dữ liệu:", error);
      }
    };

    fetchInitialHistory();

    // 2. Lắng nghe sự kiện realtime từ backend (bắn ra mỗi khi ESP32 gửi MQTT)
    socket.on('realtime_sensor_data', (data) => {
      // Dữ liệu ESP gửi lên có dạng: { temperature: 25, humidity: 60, light: 400 }
      setSensorData(prev => ({
        temperature: { ...prev.temperature, value: data.temperature },
        humidity: { ...prev.humidity, value: data.humidity },
        light: { ...prev.light, value: data.light }
      }));
    });

    // Hủy lắng nghe khi chuyển sang trang khác (cleanup)
    return () => {
      socket.off('realtime_sensor_data');
    };
  }, []);

  const [initialChartData, setInitialChartData] = useState(null);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-gray-500 text-sm">Sensor chart and device controller</p>
      </div>

      {/* Truyền dữ liệu realtime xuống thẻ Sensor */}
      <SensorCards 
        selectedSensor={selectedSensor} 
        onSelectSensor={setSelectedSensor} 
        sensorData={sensorData} 
      />
      
      <DataChart 
        selectedSensor={selectedSensor} 
        latestData={sensorData} 
        initialHistory={initialChartData} // Thêm props này
      />
      
      <DeviceControl />
    </>
  );
};

export default Dashboard;