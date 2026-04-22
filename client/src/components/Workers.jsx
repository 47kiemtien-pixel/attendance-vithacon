import React, { useEffect, useMemo, useState } from 'react';
import { getWorkers, addWorker, updateWorker } from '../api';
import { Users, Plus, Pencil, Check, X, Search, Wallet, CreditCard, Phone, UserRound } from 'lucide-react';

const emptyForm = { name: '', phone: '', cccd: '', dailyRate: '' };

const formatInputValue = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const num = String(val).replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('vi-VN');
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

const Workers = () => {
  const [workers, setWorkers] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const data = await getWorkers();
      setWorkers(data);
    } catch (error) {
      console.error('Error fetching workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return workers;

    return workers.filter((worker) => {
      return [worker.name, worker.phone, worker.cccd]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [workers, searchTerm]);

  const averageDailyRate = useMemo(() => {
    if (!workers.length) return 0;
    const total = workers.reduce((sum, worker) => sum + Number(worker.dailyRate || 0), 0);
    return Math.round(total / workers.length);
  }, [workers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'dailyRate') {
      setFormData((current) => ({ ...current, [name]: String(value).replace(/\D/g, '') }));
      return;
    }

    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleEditClick = (worker) => {
    setEditingId(worker.id);
    setFormData({
      name: worker.name || '',
      phone: worker.phone || '',
      cccd: worker.cccd || '',
      dailyRate: worker.dailyRate || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(emptyForm);
  };

  const editingWorker = workers.find((worker) => worker.id === editingId) || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.dailyRate) return;

    setSaving(true);
    try {
      const workerData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        cccd: formData.cccd.trim(),
        dailyRate: Number(formData.dailyRate)
      };

      if (editingId) {
        await updateWorker(editingId, workerData);
        setEditingId(null);
      } else {
        await addWorker(workerData);
      }

      setFormData(emptyForm);
      await fetchWorkers();
    } catch (error) {
      console.error('Error saving worker:', error);
      alert('Khong the luu cong nhan. Vui long kiem tra server va thu lai.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="workers-page">
      <div className="page-header workers-header">
        <div>
          <h1 className="page-title flex items-center gap-4">
            <Users size={32} color="var(--primary)" />
            Quản Lý Công Nhân
          </h1>
          <p className="workers-subtitle">
            Thêm mới, tìm kiếm và cập nhật thông tin công nhân trong một màn hình rõ ràng, ít thao tác hơn.
          </p>
        </div>
      </div>

      <section className="workers-stats">
        <article className="worker-stat-card">
          <div className="worker-stat-icon workers-stat-indigo">
            <UserRound size={20} />
          </div>
          <div>
            <div className="worker-stat-label">Tổng công nhân</div>
            <div className="worker-stat-value">{workers.length}</div>
          </div>
        </article>

        <article className="worker-stat-card">
          <div className="worker-stat-icon workers-stat-teal">
            <Wallet size={20} />
          </div>
          <div>
            <div className="worker-stat-label">Lương trung bình/ngày</div>
            <div className="worker-stat-value">{formatCurrency(averageDailyRate)}</div>
          </div>
        </article>

        <article className="worker-stat-card">
          <div className="worker-stat-icon workers-stat-amber">
            <Search size={20} />
          </div>
          <div>
            <div className="worker-stat-label">Kết quả hiển thị</div>
            <div className="worker-stat-value">{filteredWorkers.length}</div>
          </div>
        </article>
      </section>

      <div className="workers-layout">
        <section className="card workers-form-card">
          <div className="workers-card-head">
            <div>
              <div className="workers-section-kicker">{editingId ? 'Đang chỉnh sửa' : 'Nhập nhanh'}</div>
              <h2 className="workers-section-title">
                {editingId ? 'Cập Nhật Công Nhân' : 'Thêm Công Nhân Mới'}
              </h2>
              <p className="workers-section-note">
                Họ tên và lương ngày là 2 trường bắt buộc. Số điện thoại và CCCD có thể để trống nếu chưa có.
              </p>
            </div>
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={handleCancelEdit}>
                <X size={18} /> Hủy sửa
              </button>
            )}
          </div>

          {editingWorker && (
            <div className="workers-editing-banner">
              <div>
                <strong>Đang sửa:</strong> {editingWorker.name}
              </div>
              <div className="workers-editing-meta">
                <span>{editingWorker.phone || 'Chưa có số điện thoại'}</span>
                <span>{formatCurrency(editingWorker.dailyRate)}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="workers-form-grid">
            <div className="form-group workers-field-span-2">
              <label className="form-label">Họ và tên</label>
              <div className="workers-input-shell">
                <UserRound size={18} />
                <input
                  type="text"
                  name="name"
                  className="form-input workers-shell-input"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <div className="workers-input-shell">
                <Phone size={18} />
                <input
                  type="text"
                  name="phone"
                  className="form-input workers-shell-input"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="0987 654 321"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">CCCD / CMND</label>
              <div className="workers-input-shell">
                <CreditCard size={18} />
                <input
                  type="text"
                  name="cccd"
                  className="form-input workers-shell-input"
                  value={formData.cccd}
                  onChange={handleInputChange}
                  placeholder="012345678912"
                />
              </div>
            </div>

            <div className="form-group workers-field-span-2">
              <label className="form-label">Lương mặc định / ngày</label>
              <div className="workers-input-shell">
                <Wallet size={18} />
                <input
                  type="text"
                  name="dailyRate"
                  className="form-input workers-shell-input"
                  value={formatInputValue(formData.dailyRate)}
                  onChange={handleInputChange}
                  placeholder="650,000"
                  required
                />
                <span className="workers-currency-tag">VND</span>
              </div>
            </div>

            <div className="workers-form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {editingId ? <Check size={18} /> : <Plus size={18} />}
                {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm công nhân'}
              </button>
              {!editingId && (
                <button type="button" className="btn btn-outline" onClick={() => setFormData(emptyForm)}>
                  Xóa form
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="card workers-list-card">
          <div className="workers-card-head workers-list-head">
            <div>
              <div className="workers-section-kicker">Danh sách hiện tại</div>
              <h2 className="workers-section-title">Tìm Kiếm Và Chọn Nhanh</h2>
              <p className="workers-section-note workers-list-note">
                Bấm vào một công nhân để nạp thông tin sang khung chỉnh sửa.
              </p>
            </div>
            <div className="workers-search">
              <Search size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên, số điện thoại, CCCD..."
              />
              {searchTerm && (
                <button type="button" className="workers-search-clear" onClick={() => setSearchTerm('')}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="workers-results-bar">
            <span>{filteredWorkers.length} công nhân</span>
            {searchTerm && <span>Từ khóa: “{searchTerm}”</span>}
            {editingWorker && <span>Đang chọn: {editingWorker.name}</span>}
          </div>

          {loading ? (
            <div className="workers-empty-state">Đang tải dữ liệu công nhân...</div>
          ) : filteredWorkers.length === 0 ? (
            <div className="workers-empty-state">
              {workers.length === 0
                ? 'Chưa có công nhân nào. Hãy thêm người đầu tiên ở khung bên trái.'
                : 'Không tìm thấy công nhân phù hợp với từ khóa đang tìm.'}
            </div>
          ) : (
            <div className="workers-list">
              {filteredWorkers.map((worker) => {
                const isEditing = editingId === worker.id;

                return (
                  <article
                    key={worker.id}
                    className={`worker-row-card ${isEditing ? 'is-editing' : ''}`}
                    onClick={() => handleEditClick(worker)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleEditClick(worker);
                      }
                    }}
                  >
                    <div className="worker-row-main">
                      <div className="worker-avatar">
                        {(worker.name || '?').trim().charAt(0).toUpperCase()}
                      </div>
                      <div className="worker-main-copy">
                        <div className="worker-name-line">
                          <h3>{worker.name}</h3>
                          {isEditing && <span className="worker-edit-badge">Đang sửa</span>}
                        </div>
                        <div className="worker-meta-grid">
                          <span><Phone size={14} /> {worker.phone || 'Chưa có số điện thoại'}</span>
                          <span><CreditCard size={14} /> {worker.cccd || 'Chưa có CCCD'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="worker-row-side">
                      <div className="worker-rate-label">Lương/ngày</div>
                      <div className="worker-rate-value">{formatCurrency(worker.dailyRate)}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(worker);
                        }}
                        className="btn btn-outline worker-edit-btn"
                        title="Sửa thông tin công nhân"
                      >
                        <Pencil size={16} /> Chỉnh sửa
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Workers;
