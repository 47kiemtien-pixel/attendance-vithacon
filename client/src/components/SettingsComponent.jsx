import React, { useEffect, useState } from 'react';
import { getSettings, saveSettings, exportBackup, importBackup } from '../api';
import { Settings, Plus, Trash2, Save, Download, Upload, Database } from 'lucide-react';

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '';
  const num = String(val).replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('vi-VN');
};

const parseCurrency = (val) => {
  if (!val) return 0;
  return Number(String(val).replace(/\D/g, ''));
};

const normalizePreset = (preset) => ({
  id: preset.id,
  position: preset.position || '',
  location: preset.location || '',
  rate: preset.rate || 0
});

const SettingsComponent = () => {
  const [presets, setPresets] = useState([]);
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
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({
        presetJobs: presets.map((preset) => ({
          ...preset,
          name: [preset.position, preset.location].filter(Boolean).join(' - ')
        }))
      });
      alert('Đã lưu cấu hình thành công.');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Có lỗi xảy ra khi lưu.');
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
    } catch (error) {
      console.error('Error exporting backup:', error);
      alert('Có lỗi xảy ra khi xuất dữ liệu.');
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
            alert('Khôi phục dữ liệu thành công. Ứng dụng sẽ tự động tải lại.');
            window.location.reload();
          }
        } catch (error) {
          console.error('Error importing backup:', error);
          alert('File backup không hợp lệ hoặc có lỗi xảy ra.');
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
                      <input
                        className="form-input compact-input text-right"
                        value={formatCurrency(preset.rate)}
                        onChange={(e) => updatePreset(preset.id, 'rate', parseCurrency(e.target.value))}
                        placeholder="650,000"
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
