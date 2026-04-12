import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SensorHistory from './pages/SensorHistory';
import ActionLogs from './pages/ActionLogs';
import Profile from './pages/Profile';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'history':
        return <SensorHistory />;
      case 'logs':
        return <ActionLogs />; // <--- Cập nhật dòng này
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen font-sans text-gray-800 bg-[#f8fafc]">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <div className="flex-1 ml-64 p-8">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;