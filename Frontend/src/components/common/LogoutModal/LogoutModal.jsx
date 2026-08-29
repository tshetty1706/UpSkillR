import React, { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';
import './LogoutModal.css';

export const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="logout-modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div className="logout-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="logout-modal-header">
          <div className="logout-modal-title-group">
            <div className="logout-modal-icon-badge">
              <LogOut size={20} />
            </div>
            <h3 className="logout-modal-title">Logout</h3>
          </div>
          <button 
            type="button" 
            className="logout-modal-close-btn" 
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="logout-modal-body">
          <p className="logout-modal-message">Are you sure you want to logout?</p>
        </div>

        <div className="logout-modal-actions">
          <button 
            type="button" 
            className="btn btn-outline logout-modal-btn"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary logout-modal-btn logout-confirm-btn"
            onClick={() => {
              onClose();
              onConfirm();
            }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
