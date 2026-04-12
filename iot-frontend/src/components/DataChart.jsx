import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartConfig = {
  temperature: { color: '#ef4444', title: 'Temperature', unit: '°C', domain: [0, 50], key: 'temperature' },
  humidity: { color: '#3b82f6', title: 'Humidity', unit: '%', domain: [0, 100], key: 'humidity' },
  light: { color: '#eab308', title: 'Light', unit: 'lux', domain: [0, 1024], key: 'light' },
};

// Đảm bảo initialHistory được nhận vào từ props ở dòng này:
const DataChart = ({ selectedSensor, latestData, initialHistory }) => {
  const [chartData, setChartData] = useState({
    temperature: [],
    humidity: [],
    light: []
  });

  const config = chartConfig[selectedSensor];

  // Effect 1: Nhận dữ liệu lịch sử từ Database khi mới load trang
    useEffect(() => {
      if (initialHistory) {
        setChartData(initialHistory);
      }
    }, [initialHistory]);

  // Effect 2: Nhận dữ liệu realtime từ Socket
  useEffect(() => {
    if (!latestData || latestData.temperature?.value === 0) return;

    const currentTime = new Date().toLocaleTimeString('it-IT');

    setChartData(prev => {
      const newData = { ...prev };
      
      Object.keys(newData).forEach(key => {
        const newValue = {
          time: currentTime,
          value: latestData[key].value
        };

        const updatedArray = [...newData[key], newValue];

        // Giới hạn 20 điểm dữ liệu trên biểu đồ
        if (updatedArray.length > 20) {
          updatedArray.shift();
        }

        newData[key] = updatedArray;
      });

      return newData;
    });
  }, [latestData]);

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-500 text-sm font-medium">{config.title} History</h3>
        <span className="text-xs text-gray-400 italic">Auto-updating</span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData[selectedSensor]} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="time" 
              stroke="#9ca3af" 
              fontSize={11} 
              tickMargin={10}
            />
            <YAxis 
              stroke="#9ca3af" 
              fontSize={11} 
              domain={config.domain} 
              tickCount={6} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={config.color} 
              strokeWidth={2.5} 
              dot={{ r: 3, fill: config.color, strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex justify-center items-center mt-4 text-sm font-medium" style={{ color: config.color }}>
        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: config.color }}></span>
        {config.title} ({config.unit})
      </div>
    </div>
  );
};

export default DataChart;