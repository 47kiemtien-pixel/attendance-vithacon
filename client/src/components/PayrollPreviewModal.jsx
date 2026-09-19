import React, { useEffect, useState } from 'react';
import { generateWorkerPayrollCanvas, downloadWorkerPayrollImage, downloadMultipleWorkersPayrollImages } from '../utils/payrollImage';
import { useToast } from './Toast';

const PayrollPreviewModal = ({ workersList = [], dateRange, attendance, onClose }) => {
  const toast = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');

  const currentWorker = workersList[currentIndex] || workersList[0];

  useEffect(() => {
    if (!currentWorker) return;
    let isMounted = true;
    setLoading(true);

    generateWorkerPayrollCanvas(currentWorker, dateRange, attendance)
      .then((canvas) => {
        if (!isMounted) return;
        setPreviewUrl(canvas.toDataURL('image/png'));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error rendering preview canvas:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentIndex, currentWorker, dateRange, attendance]);

  const handleDownloadCurrent = async () => {
    if (!currentWorker) return;
    try {
      await downloadWorkerPayrollImage(currentWorker, dateRange, attendance);
      toast.success(`Đã tải ảnh bảng lương của ${currentWorker.name}`);
    } catch (e) {
      toast.error('Lỗi khi tải ảnh: ' + (e.message || e));
    }
  };

  const handleDownloadAll = async () => {
    if (!workersList.length) return;
    try {
      setDownloadingAll(true);
      await downloadMultipleWorkersPayrollImages(
        workersList,
        dateRange,
        attendance,
        (curr, total, name) => {
          setDownloadProgress(`Đang tạo (${curr}/${total})...`);
        }
      );
      toast.success(`Đã tải toàn bộ ${workersList.length} ảnh bảng lương thành công!`);
    } catch (e) {
      toast.error('Lỗi tải nhiều ảnh: ' + (e.message || e));
    } finally {
      setDownloadingAll(false);
      setDownloadProgress('');
    }
  };

  if (!currentWorker) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(5px)',
        zIndex: 1500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          height: '92vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0f172a' }}>
                Xem Trước Ảnh Bảng Lương
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  padding: '2px 8px',
                  borderRadius: '999px'
                }}
              >
                Mẫu chuẩn doanh nghiệp
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              Ảnh hiển thị đúng chuẩn khi tải về • Độ phân giải cao 2X Retina
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              borderRadius: '8px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.85rem',
              color: '#475569'
            }}
          >
            Đóng
          </button>
        </div>

        {/* Worker Switcher Carousel if multiple */}
        {workersList.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 16px',
              background: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              gap: '10px'
            }}
          >
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
              style={{
                border: '1px solid #cbd5e1',
                background: currentIndex === 0 ? '#f8fafc' : '#ffffff',
                color: currentIndex === 0 ? '#94a3b8' : '#0f172a',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}
            >
              ← Trước
            </button>

            <select
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              style={{
                flex: 1,
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#0f172a'
              }}
            >
              {workersList.map((w, idx) => (
                <option key={w.id || idx} value={idx}>
                  {idx + 1}/{workersList.length} - {w.name} {w.bankAccount ? `(${w.bankShortName || w.bankName || 'Ngân hàng'})` : '(Tiền mặt)'}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={currentIndex === workersList.length - 1}
              onClick={() => setCurrentIndex((p) => Math.min(workersList.length - 1, p + 1))}
              style={{
                border: '1px solid #cbd5e1',
                background: currentIndex === workersList.length - 1 ? '#f8fafc' : '#ffffff',
                color: currentIndex === workersList.length - 1 ? '#94a3b8' : '#0f172a',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: currentIndex === workersList.length - 1 ? 'not-allowed' : 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}
            >
              Sau →
            </button>
          </div>
        )}

        {/* Modal Body: Scrollable Canvas Render */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            background: '#e2e8f0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: loading ? 'center' : 'flex-start'
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', color: '#475569', padding: '60px 0' }}>
              <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px' }}>
                Đang tạo bản xem trước ảnh bảng lương...
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Vui lòng đợi giây lát để hệ thống vẽ ảnh sắc nét
              </div>
            </div>
          ) : (
            <div
              style={{
                maxWidth: '100%',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#ffffff'
              }}
            >
              <img
                src={previewUrl}
                alt={`Bảng lương ${currentWorker.name}`}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  height: 'auto'
                }}
              />
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '12px',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff'
          }}
        >
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Đang xem: <strong style={{ color: '#0f172a' }}>{currentWorker.name}</strong>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleDownloadCurrent}
              style={{
                padding: '8px 16px',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}
            >
              Tải ảnh người này (PNG)
            </button>

            {workersList.length > 1 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                style={{
                  padding: '8px 18px',
                  fontWeight: '600',
                  fontSize: '0.9rem'
                }}
              >
                {downloadingAll ? (downloadProgress || 'Đang tải...') : `Tải tất cả (${workersList.length}) ảnh`}
              </button>
            )}

            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollPreviewModal;
