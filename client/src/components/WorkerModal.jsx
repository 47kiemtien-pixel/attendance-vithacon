import React, { useEffect, useState } from 'react';
import {
  X,
  Check,
  Plus,
  UserRound,
  Phone,
  CreditCard,
  Wallet,
  Landmark,
  UserCheck,
  QrCode,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import CurrencyInput from './CurrencyInput';
import BankSelector from './BankSelector';
import { parseVndAmount } from '../utils/currency';

function formatBeneficiaryName(str) {
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

const emptyForm = {
  name: '',
  dailyRate: '',
  phone: '',
  cccd: '',
  status: 'working',
  bankBin: '',
  bankName: '',
  bankShortName: '',
  bankAccount: '',
  bankAccountHolder: ''
};

const WorkerModal = ({
  isOpen,
  worker = null,
  banks = [],
  onClose,
  onSave,
  onOpenQr,
  onToggleStatus,
  onDelete
}) => {
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isEditing = Boolean(worker && worker.id);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg('');
    if (worker) {
      setFormData({
        name: worker.name || '',
        phone: worker.phone || '',
        cccd: worker.cccd || '',
        dailyRate: worker.dailyRate || '',
        status: worker.status || 'working',
        bankBin: worker.bankBin || '',
        bankName: worker.bankName || '',
        bankShortName: worker.bankShortName || '',
        bankAccount: worker.bankAccount || '',
        bankAccountHolder: worker.bankAccountHolder || ''
      });
    } else {
      setFormData(emptyForm);
    }
  }, [isOpen, worker]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'bankAccountHolder') {
      setFormData((current) => ({ ...current, [name]: value.toUpperCase() }));
    } else if (name === 'bankAccount') {
      setFormData((current) => ({ ...current, [name]: value }));
      setLookupStatus(null);
    } else {
      setFormData((current) => ({ ...current, [name]: value }));
    }
  };

  const handleClearBankInfo = () => {
    setLookupStatus(null);
    setFormData((current) => ({
      ...current,
      bankBin: '',
      bankName: '',
      bankShortName: '',
      bankAccount: '',
      bankAccountHolder: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên công nhân.');
      return;
    }
    if (!formData.dailyRate) {
      setErrorMsg('Vui lòng nhập mức lương mặc định / ngày.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const hasAccount = Boolean(formData.bankAccount && formData.bankAccount.trim());
      const workerPayload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        cccd: formData.cccd.trim(),
        dailyRate: parseVndAmount(formData.dailyRate),
        status: formData.status || 'working',
        bankBin: hasAccount ? (formData.bankBin || '') : '',
        bankName: hasAccount ? (formData.bankName || '') : '',
        bankShortName: hasAccount ? (formData.bankShortName || '') : '',
        bankAccount: hasAccount ? formData.bankAccount.trim() : '',
        bankAccountHolder: hasAccount && formData.bankAccountHolder ? formData.bankAccountHolder.trim().toUpperCase() : ''
      };

      await onSave(workerPayload, isEditing, worker?.id);
      onClose();
    } catch (err) {
      console.error('Error saving worker in modal:', err);
      setErrorMsg(err.message || 'Không thể lưu công nhân. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
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
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        className="modal-content worker-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface, #ffffff)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '680px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: isEditing ? 'rgba(2, 132, 199, 0.12)' : 'rgba(15, 118, 110, 0.12)',
                color: isEditing ? '#0284c7' : 'var(--primary, #0f766e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isEditing ? <UserCheck size={22} /> : <Plus size={22} />}
            </div>
            <div>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: 'var(--text-main, #0f172a)',
                  margin: 0
                }}
              >
                {isEditing ? 'Cập Nhật Công Nhân' : 'Thêm Công Nhân Mới'}
              </h2>
              <p
                style={{
                  fontSize: '0.84rem',
                  color: 'var(--text-muted, #64748b)',
                  margin: '2px 0 0 0'
                }}
              >
                {isEditing
                  ? `Đang chỉnh sửa hồ sơ của: ${worker?.name || ''}`
                  : 'Nhập thông tin cá nhân, lương mặc định và tài khoản ngân hàng để chuyển lương'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div
            style={{
              padding: '20px 24px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '0.88rem'
                }}
              >
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Thông tin cơ bản */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '14px'
              }}
            >
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px' }}>
                  Họ và tên công nhân <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div className="workers-input-shell" style={{ height: '44px' }}>
                  <UserRound size={18} />
                  <input
                    type="text"
                    name="name"
                    className="form-input workers-shell-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px' }}>
                  Lương mặc định / ngày <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <CurrencyInput
                  name="dailyRate"
                  value={formData.dailyRate}
                  onValueChange={(amount) => setFormData((current) => ({ ...current, dailyRate: amount }))}
                  icon={Wallet}
                  iconSize={18}
                  wrapperClassName="workers-input-shell"
                  inputClassName="form-input workers-shell-input"
                  suffix="VND"
                  placeholder="650.000"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px' }}>
                  Số điện thoại
                </label>
                <div className="workers-input-shell" style={{ height: '44px' }}>
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
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px' }}>
                  CCCD / CMND
                </label>
                <div className="workers-input-shell" style={{ height: '44px' }}>
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

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '6px' }}>
                  Trạng thái hoạt động
                </label>
                <div className="workers-input-shell" style={{ height: '44px' }}>
                  <select
                    name="status"
                    className="form-input workers-shell-input"
                    value={formData.status || 'working'}
                    onChange={handleInputChange}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      width: '100%',
                      outline: 'none',
                      paddingLeft: '0',
                      cursor: 'pointer',
                      height: '100%',
                      fontSize: '0.95rem'
                    }}
                  >
                    <option value="working">Đang làm việc (Hiển thị trên bảng công)</option>
                    <option value="resigned">Tạm ẩn / Đã nghỉ việc (Ẩn khỏi bảng công)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Khung Thông tin tài khoản ngân hàng & VietQR */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.04) 0%, rgba(2, 132, 199, 0.05) 100%)',
                border: '1.5px solid rgba(15, 118, 110, 0.25)',
                borderRadius: '14px',
                padding: '16px',
                marginTop: '4px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <label
                  className="form-label"
                  style={{
                    fontWeight: '800',
                    fontSize: '0.92rem',
                    color: 'var(--primary, #0f766e)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: 0
                  }}
                >
                  <Landmark size={18} /> TÀI KHOẢN NGÂN HÀNG (STK & VIETQR CHUYỂN LƯƠNG)
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {formData.bankAccount && (formData.bankBin || formData.bankShortName) && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        onOpenQr &&
                        onOpenQr({
                          ...formData,
                          name: formData.name || 'Công nhân'
                        })
                      }
                      style={{
                        padding: '4px 12px',
                        fontSize: '0.8rem',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#ffffff',
                        borderColor: 'var(--primary, #0f766e)',
                        color: 'var(--primary, #0f766e)',
                        fontWeight: '600'
                      }}
                    >
                      <QrCode size={15} /> Xem thử mã QR
                    </button>
                  )}

                  {(formData.bankAccount || formData.bankBin || formData.bankShortName || formData.bankAccountHolder) && (
                    <button
                      type="button"
                      onClick={handleClearBankInfo}
                      className="btn btn-outline"
                      style={{
                        padding: '4px 12px',
                        fontSize: '0.8rem',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: '#fff',
                        color: '#dc2626',
                        borderColor: '#fca5a5',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                      title="Xóa toàn bộ số tài khoản và thông tin ngân hàng đã chọn"
                    >
                      <Trash2 size={14} /> Xóa STK & Ngân hàng
                    </button>
                  )}
                </div>
              </div>

              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-muted, #64748b)',
                  margin: '0 0 12px 0',
                  lineHeight: '1.45'
                }}
              >
                Mỗi công nhân có số tài khoản riêng. Thông tin này sẽ tự động gắn vào báo cáo Word/Excel và tạo mã QR để chuyển khoản lương nhanh.
              </p>

              <div style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: '600', marginBottom: '4px' }}>
                  Ngân hàng thụ hưởng
                </label>
                <BankSelector
                  banks={banks}
                  selectedBin={formData.bankBin}
                  selectedShortName={formData.bankShortName}
                  onSelectBank={(b) => {
                    const newBin = b.bin || '';
                    setFormData((curr) => ({
                      ...curr,
                      bankBin: newBin,
                      bankName: b.name || '',
                      bankShortName: b.shortName || b.code || ''
                    }));
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px'
                }}
              >
                <div>
                  <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: '600', marginBottom: '4px' }}>
                    Số tài khoản (STK)
                  </label>
                  <div className="workers-input-shell" style={{ background: '#ffffff', height: '44px', display: 'flex', alignItems: 'center', paddingRight: '8px' }}>
                    <CreditCard size={18} color="var(--primary)" />
                    <input
                      type="text"
                      name="bankAccount"
                      className="form-input workers-shell-input"
                      value={formData.bankAccount}
                      onChange={handleInputChange}
                      placeholder="Nhập số tài khoản ngân hàng..."
                      style={{ fontWeight: '600', letterSpacing: '0.5px', flex: 1 }}
                    />
                    {formData.bankAccount && (
                      <button
                        type="button"
                        onClick={() => setFormData((c) => ({ ...c, bankAccount: '', bankAccountHolder: '' }))}
                        style={{
                          border: 'none',
                          background: '#f1f5f9',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#64748b'
                        }}
                        title="Xóa nhanh số tài khoản"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: '600', marginBottom: '4px' }}>
                    Tên người thụ hưởng
                  </label>
                  <div className="workers-input-shell" style={{ background: '#ffffff', height: '44px' }}>
                    <UserCheck size={18} color="var(--primary)" />
                    <input
                      type="text"
                      name="bankAccountHolder"
                      className="form-input workers-shell-input"
                      value={formData.bankAccountHolder}
                      onChange={handleInputChange}
                      style={{ textTransform: 'uppercase', fontWeight: '600' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border, #e2e8f0)',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            {isEditing && (onToggleStatus || onDelete) ? (
              formData.status === 'resigned' ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => (onToggleStatus ? onToggleStatus(worker.id) : onDelete(worker.id))}
                  disabled={saving}
                  style={{
                    color: '#15803d',
                    borderColor: '#86efac',
                    background: '#f0fdf4',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '600'
                  }}
                  title="Hiện lại công nhân này trên bảng chấm công"
                >
                  <Eye size={16} /> Hiện lại công nhân
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => (onToggleStatus ? onToggleStatus(worker.id) : onDelete(worker.id))}
                  disabled={saving}
                  style={{
                    color: '#b45309',
                    borderColor: '#fde68a',
                    background: '#fffbeb',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '600'
                  }}
                  title="Ẩn công nhân khỏi bảng chấm công (lịch sử công và lương cũ vẫn được bảo toàn)"
                >
                  <EyeOff size={16} /> Ẩn công nhân này
                </button>
              )
            ) : <div />}

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
                disabled={saving}
                style={{ minWidth: '100px' }}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{
                  minWidth: '140px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {saving ? (
                  'Đang lưu...'
                ) : isEditing ? (
                  <>
                    <Check size={18} /> Lưu thay đổi
                  </>
                ) : (
                  <>
                    <Plus size={18} /> Thêm công nhân
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkerModal;
