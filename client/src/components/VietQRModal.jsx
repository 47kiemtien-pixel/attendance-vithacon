import React, { useState } from 'react';
import { formatVndCurrency } from '../utils/currency';

function removeVietnameseTones(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

const VietQRModal = ({
  worker: initialWorker,
  workersList = [],
  amount = 0,
  memo = '',
  onClose
}) => {
  const [copiedField, setCopiedField] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const hasList = Array.isArray(workersList) && workersList.length > 0;
  const currentWorker = hasList
    ? (workersList[currentIndex] || workersList[0])
    : initialWorker;

  if (!currentWorker) return null;

  const bin = currentWorker.bankBin || '';
  const accountNumber = currentWorker.bankAccount || '';
  const accountHolder = (currentWorker.bankAccountHolder || '').toUpperCase();
  const cleanMemo = currentWorker.memo || memo || '';
  const cleanAmount = Number(currentWorker.amount ?? amount ?? 0);

  let qrImageUrl = '';
  if (bin && accountNumber) {
    const params = [];
    if (cleanAmount > 0) params.push(`amount=${cleanAmount}`);
    if (accountHolder) params.push(`accountName=${encodeURIComponent(accountHolder)}`);
    if (cleanMemo) params.push(`addInfo=${encodeURIComponent(cleanMemo)}`);
    // Use 'compact' when amount is 0 so it never shows 'Số tiền: 0đ'
    const template = cleanAmount > 0 ? 'compact2' : 'compact';
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    qrImageUrl = `https://img.vietqr.io/image/${bin}-${accountNumber}-${template}.png${query}`;
  }

  const handleCopy = (text, field) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleDownload = () => {
    if (!qrImageUrl) return;
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `VietQR_${removeVietnameseTones(currentWorker.name)}_${cleanAmount}d.png`;
    link.target = '_blank';
    link.click();
  };

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
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1400,
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
          maxWidth: '500px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh'
        }}
      >
        {/* Modal Header without icons */}
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
              <span style={{ fontSize: '0.75rem', fontWeight: '700', background: '#0f766e', color: '#ffffff', padding: '2px 8px', borderRadius: '4px' }}>
                VIETQR
              </span>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: '700' }}>
                Quét Mã Chuyển Lương
              </h3>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              Chuẩn liên ngân hàng Napas 247
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              borderRadius: '6px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '600',
              color: '#475569'
            }}
          >
            Đóng
          </button>
        </div>

        {/* Multi-worker carousel navigator without icons */}
        {hasList && workersList.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 16px',
              background: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              gap: '8px'
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              style={{ padding: '4px 10px', fontSize: '0.8rem', height: '30px' }}
            >
              ← Trước
            </button>

            <select
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: 'white',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}
            >
              {workersList.map((w, idx) => (
                <option key={w.id || idx} value={idx}>
                  {idx + 1}. {w.name} {w.bankAccount ? `(${w.bankShortName || w.bankName || 'Ngân hàng'})` : ''}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn btn-outline"
              disabled={currentIndex === workersList.length - 1}
              onClick={() => setCurrentIndex((prev) => Math.min(workersList.length - 1, prev + 1))}
              style={{ padding: '4px 10px', fontSize: '0.8rem', height: '30px' }}
            >
              Sau →
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* QR Card Frame */}
          {qrImageUrl ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)'
              }}
            >
              <img
                src={qrImageUrl}
                alt="VietQR Chuyển Tiền Lương"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  display: 'block'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  const fallbackEl = document.getElementById('qr-fallback-msg');
                  if (fallbackEl) fallbackEl.style.display = 'block';
                }}
              />
              <div
                id="qr-fallback-msg"
                style={{ display: 'none', padding: '20px', textAlign: 'center', color: '#64748b' }}
              >
                Không thể kết nối máy chủ VietQR. Vui lòng chuyển khoản theo số tài khoản bên dưới.
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#64748b', textAlign: 'center' }}>
                Mở app ngân hàng bất kỳ để quét mã chuyển tiền
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: '12px',
                color: '#64748b',
                border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '1rem', marginBottom: '4px' }}>
                {currentWorker.name} chưa cập nhật ngân hàng
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                Vui lòng cập nhật Số tài khoản và Ngân hàng trong mục Quản Lý Công Nhân.
              </div>
            </div>
          )}

          {/* Details & Copy Box */}
          <div
            style={{
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            {/* Tên nhân viên */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Công nhân:</span>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                {currentWorker.name}
              </strong>
            </div>

            {/* Ngân hàng */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Ngân hàng:</span>
              <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>
                {currentWorker.bankShortName ? `${currentWorker.bankShortName} - ` : ''}{currentWorker.bankName || 'Chưa cập nhật'}
              </span>
            </div>

            {/* Số tài khoản */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Số tài khoản:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '1.05rem', color: '#0f766e', letterSpacing: '0.5px', fontFamily: 'monospace' }}>
                  {accountNumber || 'Chưa có STK'}
                </strong>
                {accountNumber && (
                  <button
                    type="button"
                    onClick={() => handleCopy(accountNumber, 'stk')}
                    title="Sao chép STK"
                    style={{
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f766e',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}
                  >
                    {copiedField === 'stk' ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                )}
              </div>
            </div>

            {/* Người thụ hưởng */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Người thụ hưởng:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>
                  {accountHolder || '-'}
                </span>
                {accountHolder && (
                  <button
                    type="button"
                    onClick={() => handleCopy(accountHolder, 'name')}
                    title="Sao chép tên người thụ hưởng"
                    style={{
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f766e',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}
                  >
                    {copiedField === 'name' ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                )}
              </div>
            </div>

            {/* Số tiền nếu có */}
            {cleanAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Số tiền chuyển:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '1.05rem', color: '#15803d' }}>
                    {formatVndCurrency(cleanAmount)}
                  </strong>
                  <button
                    type="button"
                    onClick={() => handleCopy(cleanAmount, 'amount')}
                    title="Sao chép số tiền"
                    style={{
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#15803d',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}
                  >
                    {copiedField === 'amount' ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            background: '#f8fafc'
          }}
        >
          {qrImageUrl && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleDownload}
              style={{ fontWeight: '600', fontSize: '0.88rem' }}
            >
              Tải ảnh QR
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
            style={{ fontWeight: '600', fontSize: '0.88rem' }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default VietQRModal;
