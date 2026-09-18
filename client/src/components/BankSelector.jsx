import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Landmark, Search, X, ChevronDown, Check } from 'lucide-react';

const BankSelector = ({
  selectedBin,
  selectedShortName,
  onSelectBank,
  banks = [],
  placeholder = 'Chọn ngân hàng chuyển khoản...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const selectedBank = useMemo(() => {
    if (!banks || !banks.length) return null;
    if (selectedBin) {
      return banks.find((b) => String(b.bin) === String(selectedBin));
    }
    if (selectedShortName) {
      return banks.find(
        (b) =>
          (b.shortName && b.shortName.toLowerCase() === selectedShortName.toLowerCase()) ||
          (b.code && b.code.toLowerCase() === selectedShortName.toLowerCase())
      );
    }
    return null;
  }, [banks, selectedBin, selectedShortName]);

  const filteredBanks = useMemo(() => {
    if (!banks) return [];
    const query = search.trim().toLowerCase();
    if (!query) return banks;
    return banks.filter((b) => {
      const parts = [b.name, b.shortName, b.short_name, b.code, b.bin];
      return parts.filter(Boolean).some((p) => String(p).toLowerCase().includes(query));
    });
  }, [banks, search]);

  const getBankLogoSrc = (bank) => {
    if (!bank) return '';
    if (bank.code) {
      return `/bank-logos/${bank.code.toUpperCase()}.png`;
    }
    return bank.logo || '';
  };

  const handleSelect = (bank) => {
    onSelectBank({
      bin: bank.bin,
      code: bank.code,
      shortName: bank.shortName || bank.short_name || bank.code,
      name: bank.name,
      logo: bank.logo
    });
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelectBank({
      bin: '',
      code: '',
      shortName: '',
      name: '',
      logo: ''
    });
  };

  return (
    <div className="bank-selector-container" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        className="workers-input-shell bank-selector-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          minHeight: '46px',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
          {selectedBank ? (
            <>
              <img
                src={getBankLogoSrc(selectedBank)}
                alt={selectedBank.shortName}
                style={{
                  width: '28px',
                  height: '28px',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  background: '#fff',
                  flexShrink: 0
                }}
                onError={(e) => {
                  if (selectedBank.logo && e.target.src !== selectedBank.logo) {
                    e.target.src = selectedBank.logo;
                  } else {
                    e.target.style.display = 'none';
                  }
                }}
              />
              <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <strong style={{ color: 'var(--text)', fontSize: '0.92rem' }}>
                  {selectedBank.shortName || selectedBank.code}
                </strong>
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    marginLeft: '8px',
                    display: 'inline-block',
                    maxWidth: '180px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    verticalAlign: 'bottom'
                  }}
                >
                  {selectedBank.name}
                </span>
              </div>
            </>
          ) : selectedShortName ? (
            <>
              <Landmark size={18} color="var(--primary)" />
              <strong style={{ color: 'var(--text)', fontSize: '0.92rem' }}>{selectedShortName}</strong>
            </>
          ) : (
            <>
              <Landmark size={18} color="var(--text-soft)" />
              <span style={{ color: 'var(--text-soft)', fontSize: '0.9rem' }}>{placeholder}</span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {(selectedBank || selectedShortName) && (
            <button
              type="button"
              onClick={handleClear}
              title="Xóa chọn ngân hàng"
              style={{
                border: 'none',
                background: '#fee2e2',
                cursor: 'pointer',
                padding: '3px 8px',
                borderRadius: '6px',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.78rem',
                fontWeight: '600'
              }}
            >
              <X size={14} /> Bỏ chọn
            </button>
          )}
          <ChevronDown
            size={18}
            style={{
              color: 'var(--text-soft)',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease'
            }}
          />
        </div>
      </div>

      {isOpen && (
        <div
          className="bank-selector-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--surface, #ffffff)',
            border: '1px solid var(--border-strong, #cbd5e1)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
            maxHeight: '340px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '10px',
              borderBottom: '1px solid var(--border, #e2e8f0)',
              background: 'var(--surface-soft, #f8fafc)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Search size={16} color="var(--text-soft)" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm Vietcombank, MB, Techcombank, BIDV..."
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.88rem',
                color: 'var(--text)'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-soft)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {filteredBanks.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Không tìm thấy ngân hàng nào phù hợp
              </div>
            ) : (
              filteredBanks.map((bank) => {
                const isSelected = selectedBin ? String(bank.bin) === String(selectedBin) : false;
                return (
                  <div
                    key={bank.bin || bank.id || bank.code}
                    onClick={() => handleSelect(bank)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(15, 118, 110, 0.08)' : 'transparent',
                      transition: 'background 0.12s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--surface-soft, #f1f5f9)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <img
                      src={getBankLogoSrc(bank)}
                      alt={bank.shortName}
                      style={{
                        width: '32px',
                        height: '32px',
                        objectFit: 'contain',
                        borderRadius: '4px',
                        background: '#ffffff',
                        border: '1px solid var(--border, #e2e8f0)',
                        flexShrink: 0
                      }}
                      onError={(e) => {
                        if (bank.logo && e.target.src !== bank.logo) {
                          e.target.src = bank.logo;
                        } else {
                          e.target.style.display = 'none';
                        }
                      }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: 'var(--text)', fontSize: '0.9rem' }}>
                          {bank.shortName || bank.short_name || bank.code}
                        </strong>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'var(--surface-muted, #f1f5f9)',
                            color: 'var(--text-muted)',
                            fontWeight: '600'
                          }}
                        >
                          BIN {bank.bin}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {bank.name}
                      </div>
                    </div>

                    {isSelected && <Check size={18} color="var(--primary)" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BankSelector;
