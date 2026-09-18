import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={`toast-item toast-${item.type}`}>
            <div className="toast-icon">
              {item.type === 'success' && <CheckCircle2 size={18} />}
              {item.type === 'error' && <AlertCircle size={18} />}
              {item.type === 'info' && <Info size={18} />}
            </div>
            <div className="toast-message">{item.message}</div>
            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(item.id)}
              aria-label="Đóng"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if not inside provider
    return {
      success: (msg) => console.log('Toast:', msg),
      error: (msg) => console.error('Toast:', msg),
      info: (msg) => console.log('Toast:', msg),
    };
  }
  return context;
};
