import React from 'react';
import { Home, Clock, FileText, User } from 'lucide-react';

const Sidebar = ({ currentPage, setCurrentPage }) => {
  // Hàm phụ trợ để xác định style của menu item
  const getMenuClass = (pageName) => {
    const baseClass = "flex items-center px-6 py-3 cursor-pointer transition-colors w-full ";
    if (currentPage === pageName) {
      return baseClass + "bg-blue-600 text-white";
    }
    return baseClass + "text-gray-300 hover:bg-gray-800 hover:text-white";
  };

  return (
    <div className="w-64 bg-[#1e293b] text-white h-screen fixed left-0 top-0 flex flex-col z-10">
      <div className="p-6 text-xl font-bold border-b border-gray-700">
        IoT System
      </div>
      <nav className="flex-1 mt-4">
        <ul className="space-y-2">
          <li>
            <div onClick={() => setCurrentPage('dashboard')} className={getMenuClass('dashboard')}>
              <Home className="w-5 h-5 mr-3" />
              Dashboard
            </div>
          </li>
          <li>
            <div onClick={() => setCurrentPage('history')} className={getMenuClass('history')}>
              <Clock className="w-5 h-5 mr-3" />
              Sensor History
            </div>
          </li>
          <li>
            <div onClick={() => setCurrentPage('logs')} className={getMenuClass('logs')}>
              <FileText className="w-5 h-5 mr-3" />
              Action Logs
            </div>
          </li>
          <li>
            <div onClick={() => setCurrentPage('profile')} className={getMenuClass('profile')}>
              <User className="w-5 h-5 mr-3" />
              Profile
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;