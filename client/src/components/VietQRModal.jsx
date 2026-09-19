import React, { useState } from 'react';
import { X, Copy, Check, Download, QrCode, Building2, User, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const accountHolder = (currentWorker.bankAccountHolder || currentWorker.name || '').toUpperCase();
  const bankName = currentWorker.bankShortName || currentWorker.bankName || 'Ngân hàng';
  const cleanMemo = currentWorker.memo || memo || `Luong ${currentWorker.name}`;
  const cleanAmount = Number(currentWorker.amount ?? amount ?? 0);

  const qrImageUrl = bin && accountNumber
    ? `https://img.vietqr.io/image/${bin}-${accountNumber}-compact2.png?amount=${cleanAmount > 0 ? cleanAmount : ''}&addInfo=${encodeURIComponent(cleanMemo)}&accountName=${encodeURIComponent(accountHolder)}`
    : '';

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
          background: 'var(--surface, #ffffff)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '94vh'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.08) 0%, rgba(30, 58, 138, 0.04) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--primary, #0f766e)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <QrCode size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text, #0f172a)', fontWeight: '700' }}>
                Quét QR Chuyển Tiền Lương
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                Chuẩn Napas 247 • VietQR
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: '999px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Multi-worker carousel navigator */}
        {hasList && workersList.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              background: 'var(--surface-muted, #f1f5f9)',
              borderBottom: '1px solid var(--border, #e2e8f0)',
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
              <ChevronLeft size={16} /> Trước
            </button>

            <select
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              style={{
                flex: 1,
                padding: '4px 8px',
                borderRadius: '8px',
                border: '1px solid var(--border, #cbd5e1)',
                background: 'white',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}
            >
              {workersList.map((w, idx) => (
                <option key={w.id || idx} value={idx}>
                  {idx + 1}. {w.name} - {formatVndCurrency(w.amount || 0)}
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
              Sau <ChevronRight size={16} />
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
                border: '1px solid var(--border, #e2e8f0)',
                borderRadius: '16px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)'
              }}
            >
              <img
                src={qrImageUrl}
                alt="VietQR Chuyển Tiền Lương"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '12px',
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
                style={{ display: 'none', padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}
              >
                Không thể kết nối máy chủ VietQR. Vui lòng chuyển khoản theo số tài khoản bên dưới.
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Mở app ngân hàng bất kỳ để quét mã Napas 247
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                background: 'var(--surface-soft, #f8fafc)',
                borderRadius: '16px',
                color: 'var(--text-muted)'
              }}
            >
              <Building2 size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontWeight: '600' }}>{currentWorker.name} chưa cập nhật ngân hàng</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                Vui lòng cập nhật Số tài khoản và Ngân hàng trong mục Quản Lý Công Nhân.
              </p>
            </div>
          )}

          {/* Details & Copy Box */}
          <div
            style={{
              background: 'var(--surface-soft, #f8fafc)',
              borderRadius: '14px',
              border: '1px solid var(--border, #e2e8f0)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            {/* Tên nhân viên */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Công nhân:</span>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text)' }}>
                {currentWorker.name}
              </strong>
            </div>

            {/* Ngân hàng */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ngân hàng:</span>
              <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text)' }}>
                {currentWorker.bankShortName ? `${currentWorker.bankShortName} - ` : ''}{currentWorker.bankName || 'Chưa cập nhật'}
              </span>
            </div>

            {/* Số tài khoản */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Số tài khoản:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '1.05rem', color: 'var(--primary, #0f766e)', letterSpacing: '0.5px' }}>
                  {accountNumber || 'Chưa có STK'}
                </strong>
                {accountNumber && (
                  <button
                    type="button"
                    onClick={() => handleCopy(accountNumber, 'stk')}
                    title="Sao chép STK"
                    style={{
                      border: 'none',
                      background: 'rgba(15, 118, 110, 0.1)',
                      color: 'var(--primary, #0f766e)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedField === 'stk' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedField === 'stk' ? 'Đã chép' : 'Chép'}
                  </button>
                )}
              </div>
            </div>

            {/* Người thụ hưởng */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Người thụ hưởng:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text)' }}>
                  {accountHolder || '-'}
                </span>
                {accountHolder && (
                  <button
                    type="button"
                    onClick={() => handleCopy(accountHolder, 'name')}
                    title="Sao chép tên người thụ hưởng"
                    style={{
                      border: 'none',
                      background: 'rgba(15, 118, 110, 0.1)',
                      color: 'var(--primary, #0f766e)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedField === 'name' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedField === 'name' ? 'Đã chép' : 'Chép'}
                  </button>
                )}
              </div>
            </div>

            {/* Số tiền */}
            {cleanAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Số tiền chuyển:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '1.1rem', color: '#15803d' }}>
                    {formatVndCurrency(cleanAmount)}
                  </strong>
                  <button
                    type="button"
                    onClick={() => handleCopy(cleanAmount, 'amount')}
                    title="Sao chép số tiền"
                    style={{
                      border: 'none',
                      background: 'rgba(21, 128, 61, 0.1)',
                      color: '#15803d',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedField === 'amount' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedField === 'amount' ? 'Đã chép' : 'Chép'}
                  </button>
                </div>
              </div>
            )}

            {/* Nội dung chuyển khoản */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nội dung CK:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {cleanMemo}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(cleanMemo, 'memo')}
                  title="Sao chép nội dung"
                  style={{
                    border: 'none',
                    background: 'rgba(15, 118, 110, 0.1)',
                    color: 'var(--primary, #0f766e)',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {copiedField === 'memo' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedField === 'memo' ? 'Đã chép' : 'Chép'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            background: 'var(--surface-soft, #f8fafc)'
          }}
        >
          {qrImageUrl && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleDownload}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={16} /> Tải ảnh QR
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default VietQRModal;
