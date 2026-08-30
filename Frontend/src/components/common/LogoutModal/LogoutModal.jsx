import React from 'react';
import { LogOut } from 'lucide-react';
import { Modal } from '../Modal/Modal';
import './LogoutModal.css';

export const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  const actions = (
    <>
      <button 
        type="button" 
        className="btn btn-outline"
        onClick={onClose}
      >
        Cancel
      </button>
      <button 
        type="button" 
        className="btn btn-destructive"
        onClick={() => {
          onClose();
          onConfirm();
        }}
      >
        <LogOut size={16} />
        <span>Log out</span>
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log out?"
      actions={actions}
      size="small"
    >
      <p style={{ margin: 0 }}>Are you sure you want to log out?</p>
    </Modal>
  );
};
