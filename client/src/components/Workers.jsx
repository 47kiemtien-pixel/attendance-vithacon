import React, { useEffect, useMemo, useState } from 'react';
import { getWorkers, addWorker, updateWorker, getBanks } from '../api';
import {
  Users,
  Plus,
  Pencil,
  Search,
  Wallet,
  CreditCard,
  Phone,
  UserRound,
  Landmark,
  QrCode,
  UserCheck,
  X,
  Trash2
} from 'lucide-react';
import WorkerModal from './WorkerModal';
import VietQRModal from './VietQRModal';
import { formatVndCurrency } from '../utils/currency';

const Workers = () => {
  const [workers, setWorkers] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null); // null = Thêm mới, object = Sửa
  const [qrModalWorker, setQrModalWorker] = useState(null);

  useEffect(() => {
    fetchWorkers();
    getBanks().then(setBanks).catch(console.error);
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
      return [
        worker.name,
        worker.phone,
        worker.cccd,
        worker.bankAccount,
        worker.bankShortName,
        worker.bankName,
        worker.bankAccountHolder
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [workers, searchTerm]);

  const activeWorkersCount = useMemo(() => {
    return workers.filter((w) => w.status !== 'resigned').length;
  }, [workers]);

  const averageDailyRate = useMemo(() => {
    if (!workers.length) return 0;
    const total = workers.reduce((sum, worker) => sum + Number(worker.dailyRate || 0), 0);
    return Math.round(total / workers.length);
  }, [workers]);

  const handleOpenAdd = () => {
    setEditingWorker(null);
    setIsWorkerModalOpen(true);
  };

  const handleOpenEdit = (worker) => {
    setEditingWorker(worker);
    setIsWorkerModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsWorkerModalOpen(false);
    setEditingWorker(null);
  };

  const handleSaveWorker = async (workerData, isEdit, workerId) => {
    if (isEdit && workerId) {
      await updateWorker(workerId, workerData);
    } else {
      await addWorker(workerData);
    }
    await fetchWorkers();
  };

  const handleQuickDeleteBankAccount = async (worker) => {
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn xóa thông tin tài khoản ngân hàng (${worker.bankShortName || worker.bankName || 'Ngân hàng'}: ${worker.bankAccount}) của công nhân "${worker.name}"?`
    );
    if (!confirmDelete) return;

    try {
      await updateWorker(worker.id, {
        name: worker.name,
        phone: worker.phone || '',
        cccd: worker.cccd || '',
        dailyRate: worker.dailyRate,
        status: worker.status || 'working',
        bankBin: '',
        bankName: '',
        bankShortName: '',
        bankAccount: '',
        bankAccountHolder: ''
      });
      await fetchWorkers();
    } catch (err) {
      console.error('Error removing bank info:', err);
      alert('Không thể xóa thông tin tài khoản ngân hàng. Vui lòng thử lại.');
    }
  };

  return (
    <div className="workers-page">
      {/* Header với nút Thêm công nhân */}
      <div
        className="page-header workers-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}
      >
        <div>
          <h1 className="page-title flex items-center gap-4">
            <Users size={32} color="var(--primary)" />
            Quản Lý Công Nhân
          </h1>
          <p className="workers-subtitle">
            Hồ sơ nhân viên, mức lương và thông tin tài khoản ngân hàng / VietQR chuyển khoản lương.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenAdd}
          style={{
            padding: '11px 22px',
            fontSize: '0.96rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(15, 118, 110, 0.28)',
            borderRadius: '12px'
          }}
        >
          <Plus size={20} />
          Thêm Công Nhân Mới
        </button>
      </div>

      {/* Thẻ thống kê */}
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
            <UserCheck size={20} />
          </div>
          <div>
            <div className="worker-stat-label">Đang làm việc</div>
            <div className="worker-stat-value">{activeWorkersCount}</div>
          </div>
        </article>

        <article className="worker-stat-card">
          <div className="worker-stat-icon workers-stat-amber">
            <Wallet size={20} />
          </div>
          <div>
            <div className="worker-stat-label">Lương trung bình/ngày</div>
            <div className="worker-stat-value">{formatVndCurrency(averageDailyRate)}</div>
          </div>
        </article>
      </section>

      {/* Danh sách công nhân (Toàn màn hình, không bị chèn cột bên trái) */}
      <div className="workers-layout">
        <section className="card workers-list-card">
          <div className="workers-card-head workers-list-head" style={{ flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div className="workers-section-kicker">Danh sách công nhân</div>
              <h2 className="workers-section-title">Hồ Sơ & Danh Sách</h2>
              <p className="workers-section-note workers-list-note">
                Bấm vào một công nhân hoặc nút <strong>Chỉnh sửa</strong> để mở cửa sổ cập nhật thông tin.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div className="workers-search">
                <Search size={18} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên, SĐT, CCCD, STK, ngân hàng..."
                />
                {searchTerm && (
                  <button type="button" className="workers-search-clear" onClick={() => setSearchTerm('')}>
                    <X size={16} />
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenAdd}
                style={{
                  padding: '9px 16px',
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '10px'
                }}
              >
                <Plus size={16} /> Thêm mới
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: '#f8fafc',
              borderRadius: '10px',
              marginBottom: '16px',
              fontSize: '0.86rem',
              color: 'var(--text-muted, #64748b)'
            }}
          >
            <span>
              Hiển thị <strong>{filteredWorkers.length}</strong> / {workers.length} công nhân
            </span>
            {searchTerm && <span>Từ khóa: “{searchTerm}”</span>}
          </div>

          {loading ? (
            <div className="workers-empty-state">Đang tải dữ liệu công nhân...</div>
          ) : filteredWorkers.length === 0 ? (
            <div className="workers-empty-state" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: '1rem', color: 'var(--text-muted, #64748b)', marginBottom: '14px' }}>
                {workers.length === 0
                  ? 'Chưa có công nhân nào trong hệ thống.'
                  : 'Không tìm thấy công nhân phù hợp với từ khóa đang tìm.'}
              </p>
              {workers.length === 0 && (
                <button type="button" className="btn btn-primary" onClick={handleOpenAdd}>
                  <Plus size={18} /> Thêm công nhân đầu tiên
                </button>
              )}
            </div>
          ) : (
            <div className="workers-list">
              {filteredWorkers.map((worker) => {
                return (
                  <article
                    key={worker.id}
                    className="worker-row-card"
                    onClick={() => handleOpenEdit(worker)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenEdit(worker);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="worker-row-main">
                      <div className="worker-avatar">
                        {(worker.name || '?').trim().charAt(0).toUpperCase()}
                      </div>
                      <div className="worker-main-copy">
                        <div
                          className="worker-name-line"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                        >
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>{worker.name}</h3>
                          {worker.status === 'resigned' ? (
                            <span
                              className="status-badge resigned-badge"
                              style={{
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: '#fee2e2',
                                color: '#991b1b',
                                fontWeight: 'bold'
                              }}
                            >
                              Đã nghỉ làm
                            </span>
                          ) : (
                            <span
                              className="status-badge working-badge"
                              style={{
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: '#dcfce7',
                                color: '#15803d',
                                fontWeight: 'bold'
                              }}
                            >
                              Đang làm việc
                            </span>
                          )}
                        </div>

                        <div className="worker-meta-grid" style={{ marginTop: '6px' }}>
                          <span>
                            <Phone size={14} /> {worker.phone || 'Chưa có số điện thoại'}
                          </span>
                          <span>
                            <CreditCard size={14} /> {worker.cccd || 'Chưa có CCCD'}
                          </span>

                          <div style={{ gridColumn: 'span 2', marginTop: '4px' }}>
                            {worker.bankAccount ? (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: 'rgba(15, 118, 110, 0.08)',
                                  border: '1px solid rgba(15, 118, 110, 0.25)',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.85rem'
                                }}
                              >
                                <Landmark size={14} color="var(--primary, #0f766e)" />
                                <strong style={{ color: 'var(--primary, #0f766e)' }}>
                                  {worker.bankShortName || worker.bankName || 'Ngân hàng'}:
                                </strong>
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: '700',
                                    color: 'var(--primary, #0f766e)',
                                    letterSpacing: '0.5px'
                                  }}
                                >
                                  {worker.bankAccount}
                                </span>
                                {worker.bankAccountHolder && (
                                  <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.78rem' }}>
                                    • {worker.bankAccountHolder}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: 'rgba(148, 163, 184, 0.08)',
                                  border: '1px dashed #cbd5e1',
                                  padding: '3px 10px',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  color: '#94a3b8'
                                }}
                              >
                                <Landmark size={13} />
                                <span>Chưa có STK ngân hàng</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="worker-row-side">
                      <div className="worker-rate-label">Lương/ngày</div>
                      <div className="worker-rate-value">{formatVndCurrency(worker.dailyRate)}</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {worker.bankAccount && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQrModalWorker(worker);
                              }}
                              className="btn btn-outline"
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Xem mã VietQR chuyển khoản"
                            >
                              <QrCode size={14} /> QR Chuyển tiền
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickDeleteBankAccount(worker);
                              }}
                              className="btn btn-outline"
                              style={{
                                padding: '6px 10px',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#dc2626',
                                borderColor: '#fca5a5'
                              }}
                              title="Xóa số tài khoản ngân hàng của công nhân này"
                            >
                              <Trash2 size={14} /> Xóa STK
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(worker);
                          }}
                          className="btn btn-outline worker-edit-btn"
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Sửa thông tin công nhân"
                        >
                          <Pencil size={15} /> Chỉnh sửa
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Pop-up Modal Thêm / Chỉnh sửa công nhân */}
      <WorkerModal
        isOpen={isWorkerModalOpen}
        worker={editingWorker}
        banks={banks}
        onClose={handleCloseModal}
        onSave={handleSaveWorker}
        onOpenQr={(w) => setQrModalWorker(w)}
      />

      {/* Pop-up Modal xem mã VietQR */}
      {qrModalWorker && (
        <VietQRModal
          worker={qrModalWorker}
          onClose={() => setQrModalWorker(null)}
        />
      )}
    </div>
  );
};

export default Workers;
