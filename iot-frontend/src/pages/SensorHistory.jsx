import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';

const SensorHistory = () => {
  const [historyData, setHistoryData] = useState([]);
  
  // State mới để lưu danh sách cảm biến thực tế từ DB
  const [sensorOptions, setSensorOptions] = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    logId: '',
    sensorId: '',
    sensorName: '',
    value: '',
    timestamp: ''
  });


  // Thêm state quản lý số bản ghi hiển thị
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [jumpPage, setJumpPage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // STATE MỚI: Quản lý sắp xếp
  const [sortBy, setSortBy] = useState('id'); // Mặc định sắp xếp theo thời gian
  const [sortOrder, setSortOrder] = useState('DESC'); // Mặc định mới nhất lên đầu

  // Lấy danh sách tên cảm biến khi vừa load trang
  useEffect(() => {
    const fetchSensorOptions = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/sensors/list');
        setSensorOptions(res.data);
      } catch (error) {
        console.error("Lỗi lấy danh sách cảm biến:", error);
      }
    };
    fetchSensorOptions();
  }, []);

  const fetchHistory = async () => {
    try {
      const offset = (currentPage - 1) * recordsPerPage;
      
      const queryParams = new URLSearchParams({
        limit: recordsPerPage,
        offset: offset,
        search: searchTerm,
        logId: filters.logId,
        sensorId: filters.sensorId,
        sensorName: filters.sensorName,
        value: filters.value,
        timestamp: filters.timestamp,
        // 2 params mới
        sortBy: sortBy,
        sortOrder: sortOrder
      }).toString();

      const response = await axios.get(`http://localhost:5000/api/sensors/history?${queryParams}`);
      
      setHistoryData(response.data.data);
      setTotalRecords(response.data.total);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu lịch sử:", error);
    }
  };

  // HÀM MỚI: Xử lý sắp xếp
  const handleSort = (column) => {
    if (sortBy === column) {
      // Đang ở cột đó thì đảo chiều (ASC <-> DESC)
      setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC');
    } else {
      // Sang cột mới thì ưu tiên giảm dần (DESC)
      setSortBy(column);
      setSortOrder('DESC');
    }
    setCurrentPage(1); // Reset về trang 1 khi đổi kiểu sắp xếp
  };

  // Thêm hàm xử lý nhảy trang
  const handleJumpPage = (e) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
    setJumpPage(e.target.value);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchHistory();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, filters, currentPage, recordsPerPage, sortBy, sortOrder]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({ logId: '', sensorId: '', sensorName: '', value: '', timestamp: '' });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Sensor History</h1>
        <p className="text-gray-500 text-sm">Historical sensor readings and data logs</p>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-shadow"
            placeholder="Search by sensor name or timestamp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <button 
          onClick={() => setShowFilters(!showFilters)} 
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
        >
          <Filter className="h-4 w-4" /> 
          {showFilters ? 'Hide Filters' : 'Advanced Filters'}
        </button>

        <button onClick={handleClearFilters} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
          <X className="h-4 w-4" /> Clear All
        </button>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 transition-all">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Logs ID</label>
            <input type="text" name="logId" value={filters.logId} onChange={handleFilterChange} placeholder="e.g. 1" className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sensor ID</label>
            <input type="text" name="sensorId" value={filters.sensorId} onChange={handleFilterChange} placeholder="e.g. 1" className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sensor Name</label>
            <select name="sensorName" value={filters.sensorName} onChange={handleFilterChange} className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option value="">All Sensors</option>
              {/* Tự động render list sensor lấy từ DB */}
              {sensorOptions.map(sensor => (
                <option key={sensor.id} value={sensor.sensor_name}>
                  {sensor.sensor_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Value</label>
            <input type="text" name="value" value={filters.value} onChange={handleFilterChange} placeholder="e.g. 25.5" className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Timestamp</label>
            <input type="text" name="timestamp" value={filters.timestamp} onChange={handleFilterChange} placeholder="e.g. 30/03/2026, 17:37:15" className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                {/* CỘT ID CÓ THỂ CLICK */}
                <th 
                  onClick={() => handleSort('id')}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    #ID
                    {sortBy === 'id' ? (
                      sortOrder === 'DESC' ? <ArrowDown className="w-3 h-3 text-blue-600" /> : <ArrowUp className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>

                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Sensor ID</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Sensor Name</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase">Value</th>
                
                {/* CỘT TIMESTAMP CÓ THỂ CLICK */}
                <th 
                  onClick={() => handleSort('timestamp')}
                  className="p-4 text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1">
                    Timestamp
                    {sortBy === 'timestamp' ? (
                      sortOrder === 'DESC' ? <ArrowDown className="w-3 h-3 text-blue-600" /> : <ArrowUp className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historyData.length > 0 ? (
                historyData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm text-gray-600">{row.id}</td>
                    <td className="p-4 text-sm font-mono text-gray-600">
                      <span className="bg-gray-100 px-2 py-1 rounded">S-{row.sensor_id}</span>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-800">{row.sensor_name}</td>
                    {/* Hiển thị đơn vị chuẩn xác thông qua hàm getUnit */}
                    <td className="p-4 text-sm text-gray-800">
                      {row.value} {row.unit}
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {format(new Date(row.timestamp), 'dd/MM/yyyy, HH:mm:ss')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">Không tìm thấy dữ liệu nào phù hợp với bộ lọc.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-gray-200 bg-white flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span>Showing {totalRecords === 0 ? 0 : startRecord} to {endRecord} of {totalRecords}</span>
            
            {/* Bộ chọn số bản ghi trên 1 trang */}
            <select 
              value={recordsPerPage} 
              onChange={(e) => { setRecordsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
              className="border border-gray-200 rounded px-2 py-1 outline-none focus:border-blue-500"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
            </select>
          </div>

          <div className="flex items-center gap-6">
            {/* Nhập số trang để nhảy nhanh */}
            <div className="flex items-center gap-2">
              <span>Go to page:</span>
              <input 
                type="number" 
                value={jumpPage}
                onChange={handleJumpPage}
                placeholder={currentPage}
                className="w-12 border border-gray-200 rounded px-2 py-1 text-center outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalRecords === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <span className="font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalRecords === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SensorHistory;