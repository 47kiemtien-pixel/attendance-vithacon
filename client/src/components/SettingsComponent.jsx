import React, { useEffect, useState } from 'react';
import { getSettings, saveSettings, exportBackup, importBackup } from '../api';
import { Settings, Plus, Trash2, Save, Download, Upload, Database, Landmark } from 'lucide-react';
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
            <div className="panel-kicker">Cổng kết nối ngân hàng</div>
            <h2 className="page-title compact-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={20} color="var(--primary)" /> Tự động nhận diện tên chủ tài khoản (Cas.so / VietQR)
            </h2>
          </div>
        </div>

        <div className="toolbar-meta" style={{ marginBottom: '16px' }}>
          <span>
            Hệ thống sẽ tự động tra cứu tên người thụ hưởng khi nhập số tài khoản ngân hàng của công nhân. Nếu không dùng hoặc chưa đăng ký tài khoản tại <a href="https://console.bankhub.dev" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: '600' }}>Cas (cas.so)</a> / <a href="https://my.vietqr.io" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: '600' }}>VietQR</a>, bạn chỉ cần để trống và nhập tay bình thường.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '15px' }}>
          <div>
            <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px' }}>Client ID</label>
            <input
              type="text"
              className="form-input"
              value={casClientId}
              onChange={(e) => setCasClientId(e.target.value)}
              placeholder="Nhập Client ID (nếu có)..."
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px' }}>Secret Key / API Key</label>
            <input
              type="password"
              className="form-input"
              value={casSecretKey}
              onChange={(e) => setCasSecretKey(e.target.value)}
              placeholder="Nhập Secret Key / API Key (nếu có)..."
            />
          </div>

          <div>
            <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px' }}>Môi trường</label>
            <select
              className="form-input"
              value={casEnvironment}
              onChange={(e) => setCasEnvironment(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="production">Production (Thực tế)</option>
              <option value="sandbox">Sandbox (Thử nghiệm)</option>
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
