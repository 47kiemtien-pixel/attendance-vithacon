import React, { useEffect, useState } from 'react';
import { downloadWorkersReport, downloadWorkersReportDocx, getWorkers, getAttendance } from '../api';
import dayjs from 'dayjs';
import VietQRModal from './VietQRModal';
import PayrollPreviewModal from './PayrollPreviewModal';
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
  const [qrModalWorker, setQrModalWorker] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
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

  const getSelectedWorkersList = () => {
    const workerIds = selectedWorkerIds.filter(Boolean);
    return workers.filter((w) => workerIds.includes(String(w.id)));
  };

  const handleOpenPreview = () => {
    const selectedWorkers = getSelectedWorkersList();
    if (!selectedWorkers.length) {
      toast.error('Vui lòng chọn ít nhất một công nhân để xem trước bảng lương.');
      return;
    }
    setPreviewModalOpen(true);
  };

  const handleWorkerExportImage = async () => {
    const selectedWorkers = getSelectedWorkersList();
    if (!selectedWorkers.length) {
      toast.error('Vui lòng chọn ít nhất một công nhân.');
      return;
    }

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

  const handleWorkerExport = () => {
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

    downloadWorkersReport(workerIds, startDate, endDate, label)
      .then(() => toast.success('Đã tải bảng lương Excel thành công!'))
      .catch((error) => {
        console.error('Error exporting worker report:', error);
        toast.error('Không thể tải file Excel. Vui lòng thử lại.');
      });
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

  const handleOpenQR = () => {
    const selectedWorkers = getSelectedWorkersList();
    if (!selectedWorkers.length) {
      toast.error('Vui lòng chọn ít nhất một công nhân để quét mã QR chuyển lương.');
      return;
    }

    const preparedList = selectedWorkers.map((w) => {
      return {
        ...w,
        amount: 0,
        memo: ''
      };
    });

    setQrModalWorker({
      list: preparedList
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
          <div className="screen-kicker">Quản lý Báo cáo & Lương</div>
          <h1 className="screen-title">Xuất Bảng Lương & Chứng Từ</h1>
          <p className="screen-subtitle">
            Tạo ảnh phiếu lương chuyên nghiệp, xuất file Word/Excel và tạo mã VietQR thanh toán cho từng công nhân.
          </p>
        </div>
      </section>

      <section className="panel reports-panel">
        <div className="panel-head">
          <div>
            <div className="panel-kicker">Thiết lập chứng từ</div>
            <h2 className="panel-title">Tùy chọn xuất báo cáo chi tiết</h2>
          </div>
        </div>

        <div className="reports-layout">
          {/* Left Column: Guidelines & Standards */}
          <div className="report-info-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px' }}>
            <div style={{ display: 'inline-block', background: '#0f766e', color: '#ffffff', fontSize: '0.8rem', fontWeight: '700', padding: '4px 10px', borderRadius: '6px', marginBottom: '12px' }}>
              CHỨNG TỪ NỘI BỘ
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#0f172a', margin: '0 0 10px' }}>
              Mẫu Phiếu Lương Doanh Nghiệp
            </h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 16px' }}>
              Hệ thống hỗ trợ tạo trực tiếp ảnh bảng thanh toán tiền lương độ phân giải cao 2X, thiết kế đồng bộ theo nhận diện thương hiệu, tích hợp mã chuyển khoản VietQR và khối ký nhận kế toán.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#334155' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#0f766e' }}></span>
                <span>Bố cục chuẩn chứng từ kế toán, không sử dụng icon</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#334155' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#0f766e' }}></span>
                <span>Tự động tính ngày công và tổng lương thực nhận</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#334155' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#0f766e' }}></span>
                <span>Mã VietQR sạch (không kèm số tiền mặc định)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#334155' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#0f766e' }}></span>
                <span>Hỗ trợ xem trước trực tiếp trên màn hình</span>
              </div>
            </div>
          </div>

          {/* Right Column: Worker Selection & Date Range */}
          <div className="report-form-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700', color: '#0f172a' }}>
                1. Chọn công nhân lập bảng lương
              </label>
              <div style={{ marginTop: '0.75rem', maxHeight: '220px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff' }}>
                {workers.map((w) => {
                  const workerId = String(w.id);
                  const isChecked = selectedWorkerIds.includes(workerId);
                  return (
                    <label key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isChecked ? '#f0fdf4' : 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleWorkerSelection(workerId)}
                        />
                        <span style={{ fontWeight: isChecked ? '600' : '500', color: '#0f172a' }}>
                          {w.name} {w.status === 'resigned' && <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '6px' }}>(Đã nghỉ)</span>}
                        </span>
                      </div>
                      <div>
                        {w.bankAccount ? (
                          <span style={{ fontSize: '0.78rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                            {w.bankShortName || w.bankName} - {w.bankAccount}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                            Tiền mặt
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginTop: '0.75rem' }}>
                <span style={{ color: '#475569', fontSize: '0.88rem' }}>
                  Đã chọn: <strong style={{ color: '#0f766e' }}>{selectedCount}</strong> / {workers.length} công nhân
                </span>
                <button type="button" className="btn btn-outline" style={{ padding: '6px 14px', fontSize: '0.85rem' }} onClick={toggleAllWorkers}>
                  {allWorkersSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label className="form-label" style={{ fontWeight: '700', color: '#0f172a' }}>
                2. Khoảng thời gian tính công
              </label>
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

            {/* Action Buttons: 100% Icon-free, clean typography */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    flex: '1 1 200px',
                    padding: '10px 16px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    textAlign: 'center'
                  }}
                  onClick={handleOpenPreview}
                >
                  Xem Trước Ảnh Bảng Lương
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  style={{
                    flex: '1 1 180px',
                    padding: '10px 16px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                  }}
                  onClick={handleWorkerExportImage}
                  disabled={generatingImages}
                >
                  {generatingImages ? (imageProgress || 'Đang tạo ảnh...') : 'Tải Ảnh Bảng Lương (PNG)'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: '1 1 140px', padding: '9px 14px', fontSize: '0.88rem' }}
                  onClick={handleWorkerExportDocx}
                >
                  Tải Bảng Lương Word
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: '1 1 140px', padding: '9px 14px', fontSize: '0.88rem' }}
                  onClick={handleWorkerExport}
                >
                  Tải Bảng Lương Excel
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  style={{
                    flex: '1 1 200px',
                    padding: '9px 14px',
                    fontSize: '0.88rem',
                    borderColor: '#0f766e',
                    color: '#0f766e',
                    fontWeight: '700',
                    background: '#f0fdf4'
                  }}
                  onClick={handleOpenQR}
                >
                  Quét QR Chuyển Lương Nhanh
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Preview Modal: Shows rendered canvas image directly */}
      {previewModalOpen && (
        <PayrollPreviewModal
          workersList={getSelectedWorkersList()}
          dateRange={{ start: startDate, end: endDate }}
          attendance={attendance}
          onClose={() => setPreviewModalOpen(false)}
        />
      )}

      {/* VietQR Modal */}
      {qrModalWorker && (
        <VietQRModal
          workersList={qrModalWorker.list || (qrModalWorker.id ? [qrModalWorker] : [])}
          worker={qrModalWorker.list ? qrModalWorker.list[0] : qrModalWorker}
          onClose={() => setQrModalWorker(null)}
        />
      )}
    </div>
  );
};

export default Reports;
