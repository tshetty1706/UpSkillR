import React from 'react';
import { AlertCircle, VideoOff, FileX, HelpCircle, FileText } from 'lucide-react';

export const EmptyContentState = ({ type = 'article', title = null, message = null }) => {
  let Icon = FileText;
  let defaultTitle = 'Content Unavailable';
  let defaultMessage = 'The requested learning material is currently being prepared.';

  if (type === 'video') {
    Icon = VideoOff;
    defaultTitle = 'Video is currently unavailable';
    defaultMessage = 'The instructor has not uploaded a video stream for this lesson yet.';
  } else if (type === 'article') {
    Icon = FileX;
    defaultTitle = 'Article content is not available yet';
    defaultMessage = 'The instructor is preparing the reading materials for this lesson.';
  } else if (type === 'pdf') {
    Icon = FileX;
    defaultTitle = 'PDF resource is unavailable';
    defaultMessage = 'The document has not been uploaded or is currently being processed.';
  } else if (type === 'quiz') {
    Icon = HelpCircle;
    defaultTitle = 'Assessment Not Configured';
    defaultMessage = 'This assessment has not been configured yet. Questions will be added by the instructor.';
  }

  return (
    <div className="workspace-empty-content-box">
      <div className="empty-content-icon-wrap">
        <Icon size={44} />
      </div>
      <h3 className="empty-content-title">{title || defaultTitle}</h3>
      <p className="empty-content-message">{message || defaultMessage}</p>
    </div>
  );
};

export default EmptyContentState;
