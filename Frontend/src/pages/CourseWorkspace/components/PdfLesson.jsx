import React from 'react';
import { Download, FileDown } from 'lucide-react';
import { EmptyContentState } from './EmptyContentState.jsx';

export const PdfLesson = ({ lesson, contentItem }) => {
  const pdfUrl =
    contentItem?.fileUrl ||
    contentItem?.mediaUrl ||
    contentItem?.cloudinaryUrl ||
    lesson?.notes?.find((n) => n.fileUrl || n.mediaUrl)?.fileUrl;

  const hasPdf = typeof pdfUrl === 'string' && pdfUrl.trim().length > 0;

  return (
    <div className="content-type-pdf-view">
      <div className="pdf-header-row">
        <div>
          <h2 className="lesson-heading-title">{contentItem?.title || lesson?.title}</h2>
          <span className="pdf-doc-sub">
            {contentItem?.fileName || 'PDF Document Resource'}
            {contentItem?.fileSize && ` • ${contentItem.fileSize}`}
          </span>
        </div>

        {hasPdf && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-download-pdf-direct"
            download
          >
            <Download size={15} />
            <span>Download PDF</span>
          </a>
        )}
      </div>

      {(contentItem?.description || lesson?.description) && (
        <p className="lesson-description-text">
          {contentItem?.description || lesson?.description}
        </p>
      )}

      {hasPdf ? (
        <div className="pdf-viewer-embed-wrap">
          <iframe
            src={`${pdfUrl}#toolbar=1`}
            title={contentItem?.title || lesson?.title || 'PDF Document'}
            className="pdf-iframe-frame"
          />
        </div>
      ) : (
        <EmptyContentState
          type="pdf"
          title="PDF Resource Unavailable"
          message="The PDF document for this lesson has not been attached or is currently unavailable."
        />
      )}
    </div>
  );
};

export default PdfLesson;
