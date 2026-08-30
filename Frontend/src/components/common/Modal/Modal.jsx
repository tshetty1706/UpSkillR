import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Modal.css';

/**
 * Generic Reusable Modal Component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls visibility
 * @param {function} props.onClose - Triggered on escape, backdrop click, or close button
 * @param {string|React.ReactNode} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} [props.actions] - Modal footer action buttons
 * @param {('small'|'medium'|'large')} [props.size='medium'] - Standard max-widths
 * @param {string} [props.className=''] - Additional class overrides
 * @param {boolean} [props.showCloseButton=true] - Displays the header close button
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'medium',
  className = '',
  showCloseButton = true
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      // Calculate scrollbar width to prevent layout shifts
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        // Compensate sticky elements if they exist
        const stickyElements = document.querySelectorAll('.navbar-header, .dashboard-topbar');
        stickyElements.forEach((el) => {
          el.style.paddingRight = `${scrollbarWidth}px`;
        });
      }
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      const stickyElements = document.querySelectorAll('.navbar-header, .dashboard-topbar');
      stickyElements.forEach((el) => {
        el.style.paddingRight = '';
      });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div 
        className={`modal-card modal-${size} ${className}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          {title && <h3 className="modal-title">{title}</h3>}
          {showCloseButton && (
            <button 
              type="button" 
              className="modal-close-btn" 
              onClick={onClose}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="modal-body">
          {children}
        </div>

        {actions && (
          <div className="modal-actions">
            {actions}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
