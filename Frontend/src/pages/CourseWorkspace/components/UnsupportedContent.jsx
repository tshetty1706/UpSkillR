import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const UnsupportedContent = ({ rawType = 'unknown', lessonTitle = '' }) => {
  return (
    <div className="workspace-empty-content-box unsupported">
      <div className="empty-content-icon-wrap warning">
        <AlertTriangle size={44} />
      </div>
      <h3 className="empty-content-title">Unsupported Content Format</h3>
      <p className="empty-content-message">
        The content type <code>"{String(rawType)}"</code> for lesson <strong>"{lessonTitle}"</strong> is not recognized. Please reach out to course support or check back later.
      </p>
    </div>
  );
};

export default UnsupportedContent;
