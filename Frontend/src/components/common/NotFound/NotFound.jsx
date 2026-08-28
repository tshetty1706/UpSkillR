import React from 'react';
import { ArrowLeft } from 'lucide-react';
import svg404 from '../../../assets/illustrations/404.svg';
import './NotFound.css';

export const NotFound = () => {
  const handleGoHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/' } }));
  };

  return (
    <div className="not-found-wrapper">
      <div className="not-found-container">
        <div className="not-found-illustration">
          <img src={svg404} alt="Page Not Found" />
        </div>

        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page Not Found</h2>

        <p className="not-found-message">
          "The page you’re looking for isn’t available."
        </p>

        <button className="not-found-btn" onClick={handleGoHome}>
          <ArrowLeft className="btn-icon" size={18} />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};
