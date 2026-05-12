import React, { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { bootstrapAdmin, getAuthStatus, getApiUrl, login } from '../api';

const initialLogin = { email: '', password: '' };
const initialBootstrap = { fullName: '', email: '', password: '' };

function AuthScreen({ onAuthenticated }) {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');
  const [authStatus, setAuthStatus] = useState({
    authRequired: false,
    hasUsers: false,
    bootstrapAllowed: false
  });
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [bootstrapForm, setBootstrapForm] = useState(initialBootstrap);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    setError('');
    try {
      const status = await getAuthStatus();
      setAuthStatus(status);
      setMode(status.bootstrapAllowed ? 'bootstrap' : 'login');
    } catch {
      setError('Không thể kết nối máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await login(loginForm);
      onAuthenticated(result);
    } catch (err) {
      setError(err?.response?.data?.message || 'Đăng nhập thất bại.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBootstrapSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await bootstrapAdmin(bootstrapForm);
      onAuthenticated(result);
    } catch (err) {
      setError(err?.response?.data?.message || 'Không thể tạo tài khoản quản trị đầu tiên.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1>Chấm công Việt Thành</h1>
            <p>Kết nối tới máy chủ dùng chung để đồng bộ dữ liệu PC và iPhone.</p>
          </div>
        </div>

        <div className="auth-server-line">API: {getApiUrl()}</div>

        {loading ? (
          <div className="empty-state">Đang kiểm tra trạng thái đăng nhập...</div>
        ) : (
          <>
            {mode === 'bootstrap' ? (
              <form className="auth-form" onSubmit={handleBootstrapSubmit}>
                <div className="panel-kicker">Khởi tạo hệ thống</div>
                <h2>Tạo tài khoản quản trị đầu tiên</h2>

                <div className="form-group">
                  <label className="form-label">Họ tên</label>
                  <input
                    className="form-input"
                    value={bootstrapForm.fullName}
                    onChange={(e) => setBootstrapForm((current) => ({ ...current, fullName: e.target.value }))}
                    placeholder="Ví dụ: Quản trị hệ thống"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={bootstrapForm.email}
                    onChange={(e) => setBootstrapForm((current) => ({ ...current, email: e.target.value }))}
                    placeholder="admin@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mật khẩu</label>
                  <input
                    className="form-input"
                    type="password"
                    value={bootstrapForm.password}
                    onChange={(e) => setBootstrapForm((current) => ({ ...current, password: e.target.value }))}
                    placeholder="Tạo mật khẩu mạnh"
                    required
                  />
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button className="btn btn-primary auth-submit-btn" disabled={submitting}>
                  <KeyRound size={16} /> {submitting ? 'Đang tạo...' : 'Tạo tài khoản quản trị'}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <div className="panel-kicker">Đăng nhập</div>
                <h2>Truy cập hệ thống chấm công</h2>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((current) => ({ ...current, email: e.target.value }))}
                    placeholder="admin@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mật khẩu</label>
                  <input
                    className="form-input"
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((current) => ({ ...current, password: e.target.value }))}
                    placeholder="Nhập mật khẩu"
                    required
                  />
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button className="btn btn-primary auth-submit-btn" disabled={submitting}>
                  <KeyRound size={16} /> {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AuthScreen;
