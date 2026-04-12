import React from 'react';
import { Thermometer, Droplets, Sun } from 'lucide-react';

const SensorCards = ({ selectedSensor, onSelectSensor, sensorData }) => {
  // Thêm fallback an toàn đề phòng sensorData chưa kịp load
  const temp = sensorData?.temperature || { value: 0, unit: '°C' };
  const hum = sensorData?.humidity || { value: 0, unit: '%' };
  const light = sensorData?.light || { value: 0, unit: 'lux' };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Temperature Card */}
      <div 
        onClick={() => onSelectSensor('temperature')}
        className={`bg-red-50 p-6 rounded-xl border cursor-pointer transition-all duration-200 ${
          selectedSensor === 'temperature' ? 'border-red-400 ring-2 ring-red-200 shadow-md' : 'border-red-100 shadow-sm hover:shadow-md'
        } flex flex-col`}
      >
        <div className="flex items-center text-red-500 mb-2">
          <Thermometer className="w-5 h-5 mr-2" />
          <span className="font-medium">Temperature</span>
        </div>
        <div className="text-2xl font-bold text-gray-800">
          {/* LẤY .value VÀ .unit Ở ĐÂY */}
          {temp.value} <span className="text-2xl">{temp.unit}</span>
        </div>
      </div>

      {/* Humidity Card */}
      <div 
        onClick={() => onSelectSensor('humidity')}
        className={`bg-blue-50 p-6 rounded-xl border cursor-pointer transition-all duration-200 ${
          selectedSensor === 'humidity' ? 'border-blue-400 ring-2 ring-blue-200 shadow-md' : 'border-blue-100 shadow-sm hover:shadow-md'
        } flex flex-col`}
      >
        <div className="flex items-center text-blue-500 mb-2">
          <Droplets className="w-5 h-5 mr-2" />
          <span className="font-medium">Humidity</span>
        </div>
        <div className="text-2xl font-bold text-gray-800">
          {hum.value} <span className="text-2xl">{hum.unit}</span>
        </div>
      </div>

      {/* Light Card */}
      <div 
        onClick={() => onSelectSensor('light')}
        className={`bg-yellow-50 p-6 rounded-xl border cursor-pointer transition-all duration-200 ${
          selectedSensor === 'light' ? 'border-yellow-400 ring-2 ring-yellow-200 shadow-md' : 'border-yellow-100 shadow-sm hover:shadow-md'
        } flex flex-col`}
      >
        <div className="flex items-center text-yellow-600 mb-2">
          <Sun className="w-5 h-5 mr-2" />
          <span className="font-medium">Light</span>
        </div>
        <div className="text-2xl font-bold text-gray-800">
          {light.value} <span className="text-2xl">{light.unit}</span>
        </div>
      </div>
    </div>
  );
};

export default SensorCards;