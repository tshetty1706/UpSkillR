import React from 'react';
import { Lightbulb, Info, AlertTriangle, Sparkles } from 'lucide-react';

export const InstructorTip = ({
  type = 'tip', // 'tip' | 'info' | 'warning' | 'sparkle'
  title = 'Instructor Tip',
  message,
  children
}) => {
  const getIcon = () => {
    switch (type) {
      case 'info':
        return <Info size={18} className="tip-icon tip-icon-info" />;
      case 'warning':
        return <AlertTriangle size={18} className="tip-icon tip-icon-warning" />;
      case 'sparkle':
        return <Sparkles size={18} className="tip-icon tip-icon-sparkle" />;
      case 'tip':
      default:
        return <Lightbulb size={18} className="tip-icon tip-icon-tip" />;
    }
  };

  return (
    <div className={`instructor-tip-card tip-${type}`}>
      <div className="tip-header-row">
        {getIcon()}
        <span className="tip-title">{title}</span>
      </div>
      <div className="tip-body">
        {message && <p className="tip-message">{message}</p>}
        {children}
      </div>
    </div>
  );
};
