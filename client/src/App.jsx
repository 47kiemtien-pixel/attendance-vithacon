import React, { useEffect, useState } from 'react';
import './index.css';
import Workers from './components/Workers';
import Attendance from './components/Attendance';
import Reports from './components/Reports';
import SettingsComponent from './components/SettingsComponent';
import AuthScreen from './components/AuthScreen';
import UpdateBanner from './components/UpdateBanner';
import { CalendarCheck, Users, FileSpreadsheet, Settings, LogOut } from 'lucide-react';
import {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  persistAuthSession,
  subscribeAuthSession
} from './auth';
import { getAuthStatus, getCurrentUser } from './api';

const tabs = [
  { id: 'attendance', label: 'Chấm công', icon: CalendarCheck },
  { id: 'workers', label: 'Công nhân', icon: Users },
  { id: 'reports', label: 'Báo cáo', icon: FileSpreadsheet },
  { id: 'settings', label: 'Cấu hình', icon: Settings }
];

function AppShell({ activeTab, setActiveTab, currentUser, onLogout }) {
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
      <UpdateBanner />
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark" style={{ background: 'transparent', padding: 0 }}>
            <img
              src="./logo.png"
              alt="Logo"
              style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '8px' }}
            />
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

        <div className="sidebar-user-card">
          <div className="sidebar-user-name">
            {currentUser?.fullName || currentUser?.email || 'Người dùng'}
          </div>
          <div className="sidebar-user-role">{currentUser?.role || 'Tài khoản nội bộ'}</div>
          <button className="btn btn-outline sidebar-logout-btn" onClick={onLogout}>
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      <main className="app-main">
        <div className="app-main-inner">{renderContent()}</div>
      </main>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getStoredToken()));

  useEffect(() => {
    bootstrapAuthState();
  }, []);

  useEffect(() => (
    subscribeAuthSession(({ token, user }) => {
      setCurrentUser(user || null);
      setIsAuthenticated(Boolean(token));
    })
  ), []);

  async function bootstrapAuthState() {
    setLoadingAuth(true);
    try {
      const status = await getAuthStatus();
      setRequiresAuth(Boolean(status.authRequired || status.hasUsers));

      if (getStoredToken()) {
        try {
          const user = await getCurrentUser();
          setCurrentUser(user);
          setIsAuthenticated(true);
        } catch {
          clearAuthSession();
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      if (getStoredToken()) {
        setIsAuthenticated(true);
      }
    } finally {
      setLoadingAuth(false);
    }
  }

  function handleAuthenticated(result) {
    persistAuthSession(result.token, result.user);
    setCurrentUser(result.user);
    setIsAuthenticated(true);
    setRequiresAuth(true);
  }

  function handleLogout() {
    clearAuthSession();
    setCurrentUser(null);
    setIsAuthenticated(false);
  }

  if (loadingAuth) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="empty-state">Đang khởi tạo phiên làm việc...</div>
        </div>
      </div>
    );
  }

  if (requiresAuth && !isAuthenticated) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <AppShell
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      currentUser={currentUser}
      onLogout={handleLogout}
    />
  );
}

export default App;
