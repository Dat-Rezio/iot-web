import React from 'react';

const Profile = () => {
  return (
    <div className="flex flex-col h-full">
      {/* Phần Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Profile</h1>
        <p className="text-gray-500 text-sm">User profile</p>
      </div>

      {/* Phần Thông tin cá nhân (Chia 2 cột) */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        
        {/* Cột Trái: Avatar và Tên */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex flex-col items-center justify-center lg:w-1/3 xl:w-1/4">
          
          {/* Ô trống để chứa ảnh */}
          <div className="w-48 h-48 bg-gray-100 rounded-2xl mb-6 overflow-hidden flex items-center justify-center border border-gray-200">
            {/* Bạn hãy bỏ comment dòng bên dưới và thay src bằng link ảnh của bạn nhé */}
            <img src=".\public\Profile_Picture.png" alt="Profile" className="w-full h-full object-cover" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">Phạm Xuân Đạt</h2>
        </div>

        {/* Cột Phải: Bảng thông tin */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 lg:w-2/3 xl:w-3/4 flex flex-col justify-center">
          {/* Dùng divide-y để tự động tạo đường kẻ ngang giữa các dòng */}
          <div className="divide-y divide-gray-100">
            <div className="flex flex-col sm:flex-row py-4 first:pt-0">
              <span className="text-sm font-medium text-gray-500 sm:w-1/3">Mã sinh viên</span>
              <span className="text-sm font-medium text-gray-900 sm:w-2/3">B22DCPT054</span>
            </div>
            <div className="flex flex-col sm:flex-row py-4">
              <span className="text-sm font-medium text-gray-500 sm:w-1/3">Lớp</span>
              <span className="text-sm font-medium text-gray-900 sm:w-2/3">D22PTDPT01</span>
            </div>
            <div className="flex flex-col sm:flex-row py-4">
              <span className="text-sm font-medium text-gray-500 sm:w-1/3">Ngày sinh</span>
              <span className="text-sm font-medium text-gray-900 sm:w-2/3">19/01/2004</span>
            </div>
            <div className="flex flex-col sm:flex-row py-4">
              <span className="text-sm font-medium text-gray-500 sm:w-1/3">Email</span>
              <span className="text-sm font-medium text-gray-900 sm:w-2/3">pxd19012004@gmail.com</span>
            </div>
            <div className="flex flex-col sm:flex-row py-4 last:pb-0">
              <span className="text-sm font-medium text-gray-500 sm:w-1/3">Trường</span>
              <span className="text-sm font-medium text-gray-900 sm:w-2/3">Học viện Công nghệ Bưu chính Viễn thông</span>
            </div>
          </div>
        </div>

      </div>

      {/* Phần Liên kết (Links) */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="divide-y divide-gray-100">
          <div className="flex flex-col sm:flex-row py-4 first:pt-0">
            <span className="text-sm font-medium text-gray-500 sm:w-1/3">Report</span>
            <div className="sm:w-2/3">
              <a href="#" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">Link</a>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row py-4">
            <span className="text-sm font-medium text-gray-500 sm:w-1/3">Figma</span>
            <div className="sm:w-2/3">
              <a href="https://www.figma.com/design/ThoQCghB1Oc9jziMehkFhf/IOT-Design?node-id=3-8535&t=RZeTq5H6BcKS2nsl-0" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">https://www.figma.com/design/ThoQCghB1Oc9jziMehkFhf/IOT-Design?node-id=3-8535&t=RZeTq5H6BcKS2nsl-0</a>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row py-4">
            <span className="text-sm font-medium text-gray-500 sm:w-1/3">API Docs</span>
            <div className="sm:w-2/3">
              <a href="http://localhost:5000/api-docs/" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">http://localhost:5000/api-docs/</a>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row py-4 last:pb-0">
            <span className="text-sm font-medium text-gray-500 sm:w-1/3">Github</span>
            <div className="sm:w-2/3">
              <a href="https://github.com/Dat-Rezio/iot-web" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors">https://github.com/Dat-Rezio/iot-web</a>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Profile;