import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './ToastContext.css';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  // Keep track of active messages to prevent spam/duplicates
  const activeMessages = useRef(new Set());

  const dismissToast = useCallback((id, messageKey) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (messageKey) {
      activeMessages.current.delete(messageKey);
    }
  }, []);

  const showToast = useCallback((message, type = 'info', duration) => {
    if (!message) return;

    const msgKey = `${type}:${message}`;
    // Prevent toast spam by ignoring duplicate messages currently active
    if (activeMessages.current.has(msgKey)) {
      return;
    }

    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    activeMessages.current.add(msgKey);

    // Determine default durations: success/info -> 3s, warning -> 4s, error -> 5s
    let defaultDuration = 3000;
    if (type === 'warning') defaultDuration = 4000;
    if (type === 'error') defaultDuration = 5000;
    const finalDuration = duration || defaultDuration;

    setToasts((prev) => [...prev, { id, message, type, duration: finalDuration, msgKey }]);

    setTimeout(() => {
      dismissToast(id, msgKey);
    }, finalDuration);
  }, [dismissToast]);

  // Expose semantic helpers: toast.success('msg')
  const toastHelpers = {
    success: useCallback((msg, dur) => showToast(msg, 'success', dur), [showToast]),
    error: useCallback((msg, dur) => showToast(msg, 'error', dur), [showToast]),
    warning: useCallback((msg, dur) => showToast(msg, 'warning', dur), [showToast]),
    info: useCallback((msg, dur) => showToast(msg, 'info', dur), [showToast]),
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="toast-icon success" size={18} />;
      case 'error':
        return <AlertCircle className="toast-icon error" size={18} />;
      case 'warning':
        return <AlertTriangle className="toast-icon warning" size={18} />;
      case 'info':
      default:
        return <Info className="toast-icon info" size={18} />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, toast: toastHelpers }}>
      {children}

      {/* Global Toast Container */}
      <div className="toast-container" aria-live="assertive" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast-item ${t.type}`} role="alert">
            <div className="toast-content-wrapper">
              {getIcon(t.type)}
              <span className="toast-message">{t.message}</span>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => dismissToast(t.id, t.msgKey)}
              aria-label="Close notification"
            >
              <X size={14} />
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
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
