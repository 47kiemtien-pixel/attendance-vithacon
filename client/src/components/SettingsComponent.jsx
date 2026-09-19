import React, { useEffect, useState } from 'react';
import { getSettings, saveSettings, exportBackup, importBackup, verifyCasConnection } from '../api';
import { Settings, Plus, Trash2, Save, Download, Upload, Database, Landmark, KeyRound, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import CurrencyInput from './CurrencyInput';
import { useToast } from './Toast';

const normalizePreset = (preset) => ({
  id: preset.id,
  position: preset.position || '',
  location: preset.location || '',
  rate: preset.rate || 0
});

const SettingsComponent = () => {
  const toast = useToast();
  const [presets, setPresets] = useState([]);
  const [casClientId, setCasClientId] = useState('');
  const [casSecretKey, setCasSecretKey] = useState('');
  const [casEnvironment, setCasEnvironment] = useState('production');
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(null); // { success: boolean, message: string }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setPresets((data.presetJobs || []).map(normalizePreset));
      setCasClientId(data.casClientId || data.vietqrClientId || '');
      setCasSecretKey(data.casSecretKey || data.vietqrApiKey || '');
      setCasEnvironment(data.casEnvironment || 'production');
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCas = async () => {
    if (!casClientId.trim() || !casSecretKey.trim()) {
      toast.error('Vui lòng nhập Client ID và Secret Key trước khi kiểm tra.');
      return;
    }
    setVerifying(true);
    setVerifyStatus(null);
    try {
      const res = await verifyCasConnection({
        clientId: casClientId.trim(),
        secretKey: casSecretKey.trim(),
        environment: casEnvironment
      });
      setVerifyStatus(res);
      if (res.success) {
        toast.success(res.message || 'Kết nối API Cas / VietQR thành công!');
      } else {
        toast.error(res.message || 'Kết nối thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err) {
      setVerifyStatus({ success: false, message: err.message });
      toast.error('Lỗi khi kiểm tra kết nối API: ' + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmedClientId = casClientId.trim();
      const trimmedSecretKey = casSecretKey.trim();
      await saveSettings({
        presetJobs: presets.map((preset) => ({
          ...preset,
          name: [preset.position, preset.location].filter(Boolean).join(' - ')
        })),
        casClientId: trimmedClientId,
        casSecretKey: trimmedSecretKey,
        casEnvironment,
        vietqrClientId: trimmedClientId,
        vietqrApiKey: trimmedSecretKey
      });
      toast.success('Đã lưu cấu hình thành công!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Có lỗi xảy ra khi lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  const addPreset = () => {
    setPresets((current) => [
      ...current,
      { id: Date.now().toString(), position: '', location: '', rate: 0 }
    ]);
  };

  const updatePreset = (id, field, value) => {
    setPresets((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removePreset = (id) => {
    setPresets((current) => current.filter((item) => item.id !== id));
  };

  const handleExportBackup = async () => {
    try {
      await exportBackup();
      toast.success('Đã xuất file sao lưu dữ liệu thành công!');
    } catch (error) {
      console.error('Error exporting backup:', error);
      toast.error('Có lỗi xảy ra khi xuất dữ liệu.');
    }
  };

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (window.confirm('Bạn có chắc muốn ghi đè toàn bộ dữ liệu hiện tại bằng file backup này không? Hành động này không thể hoàn tác.')) {
            await importBackup(data);
            toast.success('Khôi phục dữ liệu thành công. Ứng dụng sẽ tự động tải lại...');
            setTimeout(() => window.location.reload(), 1200);
          }
        } catch (error) {
          console.error('Error importing backup:', error);
          toast.error('File backup không hợp lệ hoặc có lỗi xảy ra.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="screen-page">
      <section className="panel compact-panel">
        <div className="toolbar-row">
          <div>
            <div className="panel-kicker">Cấu hình</div>
            <h1 className="page-title compact-title">
              <Settings size={22} color="var(--primary)" /> Mẫu công việc thường dùng
            </h1>
          </div>

          <div className="toolbar-actions">
            <button className="btn btn-outline" onClick={addPreset}>
              <Plus size={16} /> Thêm mẫu
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
              <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>

        <div className="toolbar-meta">
          <span>{presets.length} mẫu công việc</span>
          <span>Dùng để chọn nhanh khi chấm công</span>
        </div>
      </section>

      <section className="panel compact-panel">
        {loading ? (
          <div className="empty-state">Đang tải dữ liệu cấu hình...</div>
        ) : presets.length === 0 ? (
          <div className="empty-state">Chưa có mẫu công việc nào. Bấm “Thêm mẫu” để tạo.</div>
        ) : (
          <div className="settings-table-wrap">
            <table className="settings-table">
              <thead>
                <tr>
                  <th>Vị trí</th>
                  <th>Địa điểm</th>
                  <th>Mức lương / ngày</th>
                  <th className="text-center" style={{ width: '110px' }}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {presets.map((preset) => (
                  <tr key={preset.id}>
                    <td>
                      <input
                        className="form-input compact-input"
                        value={preset.position}
                        onChange={(e) => updatePreset(preset.id, 'position', e.target.value)}
                        placeholder="Ví dụ: Thợ hàn"
                      />
                    </td>
                    <td>
                      <input
                        className="form-input compact-input"
                        value={preset.location}
                        onChange={(e) => updatePreset(preset.id, 'location', e.target.value)}
                        placeholder="Ví dụ: Đắk Lắk"
                      />
                    </td>
                    <td>
                      <CurrencyInput
                        value={preset.rate}
                        onValueChange={(amount) => updatePreset(preset.id, 'rate', amount)}
                        wrapperClassName="compact-currency-input"
                        inputClassName="form-input compact-input text-right"
                        suffix="đ"
                        placeholder="650.000"
                      />
                    </td>
                    <td className="text-center">
                      <button className="btn btn-outline btn-danger-soft compact-icon-btn" onClick={() => removePreset(preset.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel compact-panel" style={{ marginTop: '20px' }}>
        <div className="toolbar-row">
          <div>
            <div className="panel-kicker">Cổng thanh toán & Ngân hàng Mở</div>
            <h2 className="page-title compact-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={20} color="var(--primary)" /> Kết nối API Cas (cas.so / bankHub) & VietQR
            </h2>
          </div>

          <div className="toolbar-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleVerifyCas}
              disabled={verifying || !casClientId || !casSecretKey}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {verifying ? <RefreshCw size={15} className="spin-animate" /> : <KeyRound size={15} />}
              {verifying ? 'Đang kiểm tra...' : 'Kiểm tra kết nối API'}
            </button>
          </div>
        </div>

        <div className="toolbar-meta" style={{ marginBottom: '16px' }}>
          <span>
            Tự động trích xuất tên chủ tài khoản từ ngân hàng khi nhập số tài khoản công nhân.
            Đăng ký và lấy thông tin tại <a href="https://console.bankhub.dev" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'underline' }}>console.bankhub.dev</a> (hoặc <a href="https://cas.so" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'underline' }}>cas.so</a> / <a href="https://my.vietqr.io" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'underline' }}>my.vietqr.io</a>).
          </span>
        </div>

        {verifyStatus && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.9rem',
              background: verifyStatus.success ? '#ecfdf5' : '#fef2f2',
              color: verifyStatus.success ? '#065f46' : '#991b1b',
              border: `1px solid ${verifyStatus.success ? '#a7f3d0' : '#fecaca'}`
            }}
          >
            {verifyStatus.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{verifyStatus.message}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '15px' }}>
          <div>
            <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px' }}>Client ID (x-client-id)</label>
            <input
              type="text"
              className="form-input"
              value={casClientId}
              onChange={(e) => {
                setCasClientId(e.target.value);
                setVerifyStatus(null);
              }}
              placeholder="Nhập Client ID từ Cas / VietQR..."
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px' }}>Secret Key / API Key (x-secret-key)</label>
            <input
              type="password"
              className="form-input"
              value={casSecretKey}
              onChange={(e) => {
                setCasSecretKey(e.target.value);
                setVerifyStatus(null);
              }}
              placeholder="Nhập Secret Key hoặc API Key..."
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px' }}>Môi trường kết nối</label>
            <select
              className="form-input"
              value={casEnvironment}
              onChange={(e) => {
                setCasEnvironment(e.target.value);
                setVerifyStatus(null);
              }}
              style={{ cursor: 'pointer' }}
            >
              <option value="production">Production (Hệ thống thực tế - Khuyến nghị)</option>
              <option value="sandbox">Sandbox (Môi trường kiểm thử)</option>
            </select>
          </div>
        </div>
      </section>

      <section className="panel compact-panel" style={{ marginTop: '20px' }}>
        <div className="toolbar-row">
          <div>
            <div className="panel-kicker">Hệ thống</div>
            <h2 className="page-title compact-title" style={{ fontSize: '18px' }}>
              <Database size={20} color="var(--primary)" /> Sao lưu & Phục hồi dữ liệu
            </h2>
          </div>
        </div>
        <div className="toolbar-meta" style={{ marginBottom: '15px' }}>
          <span>Dùng chức năng này để chuyển dữ liệu từ máy này sang máy khác.</span>
        </div>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <button className="btn btn-primary" onClick={handleExportBackup}>
            <Download size={16} /> Xuất dữ liệu (Backup)
          </button>
          <button className="btn btn-outline" onClick={handleImportBackup}>
            <Upload size={16} /> Nhập dữ liệu (Restore)
          </button>
        </div>
      </section>
    </div>
  );
};

export default SettingsComponent;
