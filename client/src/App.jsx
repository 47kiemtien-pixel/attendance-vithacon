import React, { useState } from 'react';
import './index.css';
import Workers from './components/Workers';
import Attendance from './components/Attendance';
import Reports from './components/Reports';
import SettingsComponent from './components/SettingsComponent';
import { CalendarCheck, Users, FileSpreadsheet, LayoutDashboard, Settings, Building2 } from 'lucide-react';

const tabs = [
  { id: 'attendance', label: 'Chấm công', icon: CalendarCheck },
  { id: 'workers', label: 'Công nhân', icon: Users },
  { id: 'reports', label: 'Báo cáo', icon: FileSpreadsheet },
  { id: 'settings', label: 'Cấu hình', icon: Settings }
];

function App() {
  const [activeTab, setActiveTab] = useState('attendance');

  const renderContent = () => {
    switch (activeTab) {
      case 'workers':
        return <Workers />;
      case 'attendance':
        return <Attendance />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <SettingsComponent />;
      default:
        return <Attendance />;
    }
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark" style={{ background: 'transparent', padding: 0 }}>
            <img src="./logo.png" alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
          <div>
            <div className="sidebar-brand-title">Chấm công Việt Thành</div>
            <div className="sidebar-brand-subtitle">Quản lý chấm công nội bộ</div>
          </div>
        </div>

        <div className="sidebar-section-label">Điều hướng</div>
        <nav className="sidebar-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-note">
          <LayoutDashboard size={18} />
          <p>Dùng tốt nhất trên màn hình desktop. Dữ liệu lưu cục bộ theo từng máy.</p>
        </div>
      </aside>

      <main className="app-main">
        <div className="app-main-inner">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
