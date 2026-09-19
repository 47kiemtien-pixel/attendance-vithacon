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
  LayoutGrid,
  List,
  Copy,
  Check
} from 'lucide-react';
import WorkerModal from './WorkerModal';
import VietQRModal from './VietQRModal';
import { formatVndCurrency } from '../utils/currency';
import { useToast } from './Toast';

const Workers = () => {
  const toast = useToast();
  const [workers, setWorkers] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('workers_view_mode') || 'grid';
  });

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

  const counts = useMemo(() => {
    let working = 0;
    let resigned = 0;
    let hasBank = 0;
    workers.forEach((w) => {
      if (w.status === 'resigned') resigned += 1;
      else working += 1;
      if (w.bankAccount) hasBank += 1;
    });
    return { all: workers.length, working, resigned, hasBank };
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    let list = workers;
    if (filterStatus === 'working') {
      list = list.filter((w) => w.status !== 'resigned');
    } else if (filterStatus === 'resigned') {
      list = list.filter((w) => w.status === 'resigned');
    } else if (filterStatus === 'hasBank') {
      list = list.filter((w) => Boolean(w.bankAccount));
    }

    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return list;

    return list.filter((worker) => {
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
  }, [workers, filterStatus, searchTerm]);

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
    try {
      if (isEdit && workerId) {
        await updateWorker(workerId, workerData);
        toast.success(`Đã cập nhật hồ sơ công nhân "${workerData.name}"!`);
      } else {
        await addWorker(workerData);
        toast.success(`Đã thêm công nhân mới "${workerData.name}"!`);
      }
      await fetchWorkers();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving worker:', err);
      toast.error('Không thể lưu thông tin công nhân. Vui lòng thử lại.');
    }
  };

  const handleToggleHideWorker = async (workerId) => {
    const worker = workers.find((w) => String(w.id) === String(workerId));
    if (!worker) return;
    const isCurrentlyResigned = worker.status === 'resigned';
    const confirmAction = window.confirm(
      isCurrentlyResigned
        ? `Bạn có chắc muốn hiển thị lại công nhân "${worker.name}" trên bảng chấm công?`
        : `Bạn có chắc chắn muốn ẩn công nhân "${worker.name}" khỏi bảng chấm công?\n(Toàn bộ lịch sử công và lương cũ vẫn được bảo toàn an toàn tuyệt đối).`
    );
    if (!confirmAction) return;

    try {
      await updateWorker(workerId, {
        ...worker,
        status: isCurrentlyResigned ? 'working' : 'resigned'
      });
      await fetchWorkers();
      handleCloseModal();
      toast.success(
        isCurrentlyResigned
          ? `Đã hiển thị lại công nhân "${worker.name}"!`
          : `Đã ẩn công nhân "${worker.name}" khỏi bảng chấm công!`
      );
    } catch (err) {
      console.error('Error updating worker status:', err);
      toast.error('Không thể cập nhật trạng thái công nhân. Vui lòng thử lại.');
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

      {/* Thống kê KPI */}
      <div className="kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(15, 118, 110, 0.1)', color: 'var(--primary)' }}>
            <Users size={22} />
          </div>
          <div>
            <div className="kpi-val">{workers.length}</div>
            <div className="kpi-label">Tổng nhân sự</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div className="kpi-val">{counts.working}</div>
            <div className="kpi-label">Đang làm việc</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <CreditCard size={22} />
          </div>
          <div>
            <div className="kpi-val">{counts.hasBank}</div>
            <div className="kpi-label">Đã có STK ngân hàng</div>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Wallet size={22} />
          </div>
          <div>
            <div className="kpi-val">{formatVndCurrency(averageDailyRate)}</div>
            <div className="kpi-label">Lương bình quân / ngày</div>
          </div>
        </div>
      </div>

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

          <div className="filter-pills-bar" style={{ marginBottom: '14px' }}>
            <button
              type="button"
              className={`filter-pill-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              Tất cả <span className="pill-count">{counts.all}</span>
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${filterStatus === 'working' ? 'active' : ''}`}
              onClick={() => setFilterStatus('working')}
            >
              Đang làm <span className="pill-count">{counts.working}</span>
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${filterStatus === 'resigned' ? 'active' : ''}`}
              onClick={() => setFilterStatus('resigned')}
            >
              Đã ẩn / Nghỉ <span className="pill-count">{counts.resigned}</span>
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${filterStatus === 'hasBank' ? 'active' : ''}`}
              onClick={() => setFilterStatus('hasBank')}
            >
              Có STK <span className="pill-count">{counts.hasBank}</span>
            </button>
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
              color: 'var(--text-muted, #64748b)',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div>
              <span>
                Hiển thị <strong>{filteredWorkers.length}</strong> / {workers.length} công nhân
              </span>
              {searchTerm && <span style={{ marginLeft: '10px' }}>Từ khóa: “{searchTerm}”</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setViewMode('grid');
                  localStorage.setItem('workers_view_mode', 'grid');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--primary, #0f766e)' : '#64748b',
                  boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="Hiển thị dạng lưới"
              >
                <LayoutGrid size={15} /> Dạng lưới
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  localStorage.setItem('workers_view_mode', 'list');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: viewMode === 'list' ? '#ffffff' : 'transparent',
                  color: viewMode === 'list' ? 'var(--primary, #0f766e)' : '#64748b',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="Hiển thị dạng danh sách"
              >
                <List size={15} /> Dạng danh sách
              </button>
            </div>
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
          ) : viewMode === 'grid' ? (
            <div className="workers-grid">
              {filteredWorkers.map((worker) => (
                <article
                  key={worker.id}
                  className="worker-grid-card"
                  onClick={() => handleOpenEdit(worker)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenEdit(worker);
                    }
                  }}
                >
                  <div className="worker-grid-header">
                    <div className="worker-grid-user">
                      <div className="worker-grid-avatar">
                        {(worker.name || '?').trim().charAt(0).toUpperCase()}
                      </div>
                      <div className="worker-grid-info">
                        <h3 className="worker-grid-name" title={worker.name}>
                          {worker.name}
                        </h3>
                        <div style={{ marginTop: '4px' }}>
                          {worker.status === 'resigned' ? (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: '#fee2e2',
                                color: '#991b1b',
                                fontWeight: '700'
                              }}
                            >
                              Đã nghỉ làm
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: '#dcfce7',
                                color: '#15803d',
                                fontWeight: '700'
                              }}
                            >
                              Đang làm việc
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="worker-grid-rate-box">
                      <div className="worker-grid-rate-label">Lương/ngày</div>
                      <div className="worker-grid-rate-val">{formatVndCurrency(worker.dailyRate)}</div>
                    </div>
                  </div>

                  <div className="worker-grid-body">
                    <div className="worker-grid-item">
                      <Phone size={14} color="#94a3b8" />
                      <span style={{ color: worker.phone ? 'inherit' : '#94a3b8' }}>
                        {worker.phone || 'Chưa có SĐT'}
                      </span>
                    </div>
                    <div className="worker-grid-item">
                      <CreditCard size={14} color="#94a3b8" />
                      <span style={{ color: worker.cccd ? 'inherit' : '#94a3b8' }}>
                        {worker.cccd ? `CCCD: ${worker.cccd}` : 'Chưa có CCCD'}
                      </span>
                    </div>
                    <div className="worker-grid-bank">
                      {worker.bankAccount ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(15, 118, 110, 0.08)',
                            border: '1px solid rgba(15, 118, 110, 0.25)',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: '0.82rem'
                          }}
                        >
                          <Landmark size={14} color="var(--primary, #0f766e)" style={{ flexShrink: 0 }} />
                          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <strong style={{ color: 'var(--primary, #0f766e)' }}>
                              {worker.bankShortName || worker.bankName || 'Ngân hàng'}:
                            </strong>{' '}
                            <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--primary, #0f766e)', letterSpacing: '0.3px' }}>
                              {worker.bankAccount}
                            </span>
                            {worker.bankAccountHolder && (
                              <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.76rem', marginLeft: '5px' }}>
                                • {worker.bankAccountHolder}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="copy-badge-btn"
                            title="Sao chép số tài khoản"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(worker.bankAccount);
                              toast.success(`Đã sao chép STK ${worker.bankAccount}`);
                            }}
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#f8fafc',
                            border: '1px dashed #cbd5e1',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            color: '#94a3b8'
                          }}
                        >
                          <Landmark size={13} />
                          <span>Chưa có STK ngân hàng</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="worker-grid-actions">
                    {worker.bankAccount && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrModalWorker(worker);
                        }}
                        className="btn btn-outline"
                        style={{
                          padding: '5px 9px',
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRadius: '8px'
                        }}
                        title="Xem mã VietQR chuyển khoản"
                      >
                        <QrCode size={14} /> QR Lương
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(worker);
                      }}
                      className="btn btn-outline worker-edit-btn"
                      style={{
                        padding: '5px 12px',
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Pencil size={14} /> Chỉnh sửa
                    </button>
                  </div>
                </article>
              ))}
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
                                <button
                                  type="button"
                                  className="copy-badge-btn"
                                  title="Sao chép số tài khoản"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(worker.bankAccount);
                                    toast.success(`Đã sao chép STK ${worker.bankAccount}`);
                                  }}
                                >
                                  <Copy size={12} />
                                </button>
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
                            <QrCode size={14} /> QR Lương
                          </button>
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

      {/* Floating Action Button on mobile */}
      <button
        type="button"
        className="mobile-fab-btn"
        onClick={handleOpenAdd}
        title="Thêm công nhân mới"
      >
        <Plus size={26} />
      </button>

      {/* Pop-up Modal Thêm / Chỉnh sửa công nhân */}
      <WorkerModal
        isOpen={isWorkerModalOpen}
        worker={editingWorker}
        banks={banks}
        onClose={handleCloseModal}
        onSave={handleSaveWorker}
        onToggleStatus={handleToggleHideWorker}
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
