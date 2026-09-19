import React, { useEffect, useState } from 'react';
import { downloadWorkersReportDocx, getWorkers, getAttendance } from '../api';
import dayjs from 'dayjs';
import { downloadMultipleWorkersPayrollImages } from '../utils/payrollImage';
import { useToast } from './Toast';

const Reports = () => {
  const toast = useToast();
  
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const [startDate, setStartDate] = useState(dayjs().startOf('week').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('week').format('YYYY-MM-DD'));
  const [exportType, setExportType] = useState('week'); // 'week', 'month', 'custom'
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState('');

  useEffect(() => {
    getWorkers().then(setWorkers).catch(console.error);
    getAttendance().then(setAttendance).catch(console.error);
  }, []);

  const selectedCount = selectedWorkerIds.length;
  const allWorkersSelected = workers.length > 0 && selectedCount === workers.length;

  const toggleWorkerSelection = (workerId) => {
    const normalizedId = String(workerId);
    setSelectedWorkerIds((current) => (
      current.includes(normalizedId)
        ? current.filter((id) => id !== normalizedId)
        : [...current, normalizedId]
    ));
  };

  const toggleAllWorkers = () => {
    setSelectedWorkerIds(allWorkersSelected ? [] : workers.map((worker) => String(worker.id)));
  };

  const handleWorkerExportImage = async () => {
    const workerIds = selectedWorkerIds.filter(Boolean);
    if (!workerIds.length) {
      toast.error('Vui lòng chọn ít nhất một công nhân.');
      return;
    }

    const selectedWorkers = workers.filter((w) => workerIds.includes(String(w.id)));
    if (!selectedWorkers.length) return;

    try {
      setGeneratingImages(true);
      await downloadMultipleWorkersPayrollImages(
        selectedWorkers,
        { start: startDate, end: endDate },
        attendance,
        (current, total, workerName) => {
          setImageProgress(`Đang tạo ảnh (${current}/${total})...`);
        }
      );
      toast.success(`Đã tạo và tải ${selectedWorkers.length} ảnh bảng lương thành công!`);
    } catch (error) {
      console.error('Error exporting worker payroll images:', error);
      toast.error('Có lỗi khi tạo ảnh bảng lương: ' + (error?.message || error));
    } finally {
      setGeneratingImages(false);
      setImageProgress('');
    }
  };

  const handleWorkerExportDocx = () => {
    const workerIds = selectedWorkerIds.filter(Boolean);
    if (!workerIds.length) {
      toast.error('Vui lòng chọn ít nhất một công nhân.');
      return;
    }

    let label = '';
    if (exportType === 'week') {
      label = `Tuần ${dayjs(startDate).format('DD/MM')} - ${dayjs(endDate).format('DD/MM/YYYY')}`;
    } else if (exportType === 'month') {
      label = `Tháng ${dayjs(startDate).format('MM/YYYY')}`;
    }

    downloadWorkersReportDocx(workerIds, startDate, endDate, label)
      .then(() => toast.success('Đã tải bảng lương Word thành công!'))
      .catch((error) => {
        console.error('Error exporting worker Word report:', error);
        if (error?.response?.status === 404) {
          toast.error('Server chưa cập nhật chức năng xuất Word nhiều người.');
          return;
        }
        toast.error('Không thể tải file Word. Vui lòng thử lại.');
      });
  };

  const handleExportTypeChange = (type) => {
    setExportType(type);
    if (type === 'week') {
      setStartDate(dayjs().startOf('week').add(1, 'day').format('YYYY-MM-DD')); // Monday
      setEndDate(dayjs().startOf('week').add(7, 'day').format('YYYY-MM-DD')); // Sunday
    } else if (type === 'month') {
      setStartDate(dayjs().startOf('month').format('YYYY-MM-DD'));
      setEndDate(dayjs().endOf('month').format('YYYY-MM-DD'));
    }
  };

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <div className="screen-kicker">Báo cáo</div>
          <h1 className="screen-title">Xuất file báo cáo</h1>
          <p className="screen-subtitle">
            Hỗ trợ xuất báo cáo chi tiết, xuất file Word và ảnh thanh toán VietQR cho từng cá nhân.
          </p>
        </div>
      </section>

      <section className="panel reports-panel">
        <div className="panel-head">
          <div>
            <div className="panel-kicker">Báo cáo cá nhân</div>
            <h2 className="panel-title">Xuất báo cáo chi tiết cho nhiều người</h2>
          </div>
        </div>

        <div className="reports-layout">
          <div className="report-info-card" style={{ background: 'var(--bg-alt)' }}>
            <div style={{ display: 'inline-block', background: 'var(--primary)', color: 'white', fontSize: '0.8rem', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', marginBottom: '12px' }}>
              CHỨNG TỪ NỘI BỘ
            </div>
            <h3>Báo cáo chi tiết theo mẫu</h3>
            <p>Xuất ảnh bảng lương có kèm mã QR VietQR, hoặc file Word chi tiết cho từng cá nhân, hiển thị đầy đủ ngày công và tổng lương thực nhận.</p>
            <div className="report-note-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>• Chọn công nhân và khoảng thời gian</span>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>• Tích hợp mã VietQR chuyển lương</span>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>• Tải ảnh bảng lương sắc nét kèm QR</span>
            </div>
          </div>

          <div className="report-form-card">
            <div className="form-group">
              <label className="form-label">Chọn công nhân</label>
              <div style={{ marginTop: '0.75rem', maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}>
                {workers.map((w) => {
                  const workerId = String(w.id);
                  const isChecked = selectedWorkerIds.includes(workerId);
                  return (
                    <label key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isChecked ? 'rgba(15, 118, 110, 0.05)' : 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleWorkerSelection(workerId)}
                        />
                        <span style={{ fontWeight: isChecked ? '600' : '500' }}>
                          {w.name} {w.status === 'resigned' && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '6px' }}>(Đã nghỉ làm)</span>}
                        </span>
                      </div>
                      <div>
                        {w.bankAccount ? (
                          <span style={{ fontSize: '0.78rem', background: 'rgba(15, 118, 110, 0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                            {w.bankShortName || w.bankName} - {w.bankAccount}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-soft)', fontStyle: 'italic' }}>
                            Chưa có STK
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginTop: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Đã chọn {selectedCount} / {workers.length} công nhân
                </span>
                <button type="button" className="btn btn-outline" style={{ padding: '8px 12px' }} onClick={toggleAllWorkers}>
                  {allWorkersSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Khoảng thời gian</label>
              <div className="segmented-control" style={{ marginBottom: '1rem' }}>
                <button 
                  type="button"
                  className={`segment-btn ${exportType === 'week' ? 'active' : ''}`} 
                  onClick={() => handleExportTypeChange('week')}
                >
                  Theo tuần
                </button>
                <button 
                  type="button"
                  className={`segment-btn ${exportType === 'month' ? 'active' : ''}`} 
                  onClick={() => handleExportTypeChange('month')}
                >
                  Theo tháng
                </button>
                <button 
                  type="button"
                  className={`segment-btn ${exportType === 'custom' ? 'active' : ''}`} 
                  onClick={() => setExportType('custom')}
                >
                  Tùy chỉnh
                </button>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Từ ngày</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Đến ngày</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Exactly 2 original buttons, icon-free */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary report-download-btn"
                style={{ flex: '1 1 160px', padding: '10px 16px', fontWeight: '700', fontSize: '0.95rem', textAlign: 'center' }}
                onClick={handleWorkerExportImage}
                disabled={generatingImages}
              >
                {generatingImages ? (imageProgress || 'Đang tạo ảnh...') : 'Tải Ảnh Bảng Lương'}
              </button>
              <button
                type="button"
                className="btn btn-outline report-download-btn"
                style={{ flex: '1 1 140px', padding: '10px 16px', fontWeight: '600', fontSize: '0.9rem', textAlign: 'center' }}
                onClick={handleWorkerExportDocx}
              >
                Tải Word (Mới)
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Reports;
