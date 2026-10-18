import React, { useState, useEffect } from 'react';
import {
  FileText,
  BookOpen,
  Image as ImageIcon,
  Sparkles,
  X,
  ExternalLink,
  Download,
  AlertCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { renderMarkdownToHTML } from '../../CourseManager/CourseModules/Common/MarkdownEditor';
import './CourseOverviewTemplate.css';

export const CourseResourceModal = ({
  resource,
  moduleTitle = '',
  lessonTitle = '',
  isEnrolled = false,
  onClose
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [imgError, setImgError] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  const rawType = (resource?.type || resource?.noteType || 'article').toLowerCase();
  const isArticle = rawType === 'article' || rawType === 'article_md';
  const isPdf = rawType === 'pdf';
  const isImage = rawType === 'image';

  const fileUrl = resource?.fileUrl || resource?.mediaUrl || resource?.cloudinaryUrl || resource?.url || '';
  const markdownText = resource?.markdownContent || resource?.content || resource?.bodyMarkdown || '';

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);

  const getScopeBadge = () => {
    const scope = (resource?.scope || resource?.attachableType || 'course').toLowerCase();
    if (scope === 'lesson') return 'LESSON MATERIAL';
    if (scope === 'module') return 'MODULE MATERIAL';
    return 'COURSE RESOURCE';
  };

  return (
    <div className="curriculum-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="resource-modal-title">
      <div className={`curriculum-resource-modal-card ${isArticle ? 'article-modal-card' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="curriculum-modal-header">
          <div className="modal-title-with-badge">
            <div className={`modal-icon-pill ${isArticle ? 'article-pill' : isPdf ? 'pdf-pill' : 'image-pill'}`}>
              {isArticle ? <FileText size={18} /> : isPdf ? <BookOpen size={18} /> : <ImageIcon size={18} />}
            </div>
            <div>
              <div className="modal-context-breadcrumbs">
                <span className="resource-scope-mini-tag">{getScopeBadge()}</span>
                {moduleTitle && <span> • {moduleTitle}</span>}
                {lessonTitle && <span> • {lessonTitle}</span>}
              </div>
              <h3 id="resource-modal-title" className="curriculum-modal-title">
                {resource?.title || resource?.fileName || 'Learning Material'}
              </h3>
            </div>
          </div>

          <div className="modal-header-actions-group">
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-header-action"
                title="Open in new window / tab"
              >
                <ExternalLink size={16} />
                <span>Open in Tab</span>
              </a>
            )}
            {fileUrl && isPdf && (
              <a
                href={fileUrl}
                download={resource?.fileName || 'document.pdf'}
                className="btn-header-action"
                title="Download PDF"
              >
                <Download size={16} />
                <span>Download</span>
              </a>
            )}
            <button
              type="button"
              className="btn-modal-close"
              onClick={onClose}
              aria-label="Close resource viewer"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Main Content Stage */}
        <div className="curriculum-resource-stage">
          {/* 1. Article / Markdown Reading Mode */}
          {isArticle && (
            <div className="article-reading-container">
              {markdownText ? (
                <div
                  className="article-rendered-body"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownToHTML(markdownText) }}
                />
              ) : (
                <div className="resource-fallback-box">
                  <div className="fallback-icon-wrap">
                    <FileText size={32} />
                  </div>
                  <h4 className="fallback-title">No Article Content Available</h4>
                  <p className="fallback-desc">
                    This article currently contains no text. Please check back later.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. PDF Document Viewing Mode */}
          {isPdf && (
            <div className="pdf-viewing-container">
              {!fileUrl || pdfError ? (
                <div className="resource-fallback-box">
                  <div className="fallback-icon-wrap">
                    <AlertCircle size={32} />
                  </div>
                  <h4 className="fallback-title">PDF Document Unavailable</h4>
                  <p className="fallback-desc">
                    {!fileUrl
                      ? 'The PDF document link has not been provided or is still being uploaded.'
                      : 'The browser could not embed this PDF document directly.'}
                  </p>
                  {fileUrl && (
                    <div className="fallback-actions-row">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                      >
                        <ExternalLink size={14} />
                        <span>Open Document Directly</span>
                      </a>
                      <a
                        href={fileUrl}
                        download={resource?.fileName || 'document.pdf'}
                        className="btn btn-outline btn-sm"
                      >
                        <Download size={14} />
                        <span>Download PDF File</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pdf-embed-wrapper">
                  <iframe
                    src={`${fileUrl}#toolbar=1&navpanes=1`}
                    title={resource?.title || 'PDF Document'}
                    className="pdf-iframe-element"
                    onError={() => setPdfError(true)}
                  />
                </div>
              )}
            </div>
          )}

          {/* 3. Image / Diagram Viewing Mode */}
          {isImage && (
            <div className="image-viewing-container">
              {/* Image Toolbar */}
              <div className="image-viewer-floating-toolbar">
                <button
                  type="button"
                  className="image-tool-btn"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 50 || imgError || !fileUrl}
                  title="Zoom Out (-25%)"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="image-zoom-text">{zoomLevel}%</span>
                <button
                  type="button"
                  className="image-tool-btn"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 300 || imgError || !fileUrl}
                  title="Zoom In (+25%)"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  className="image-tool-btn"
                  onClick={handleResetZoom}
                  disabled={imgError || !fileUrl}
                  title="Reset Zoom / Fit"
                >
                  <Maximize2 size={16} />
                </button>
              </div>

              {!fileUrl || imgError ? (
                <div className="resource-fallback-box">
                  <div className="fallback-icon-wrap">
                    <AlertCircle size={32} />
                  </div>
                  <h4 className="fallback-title">Image Resource Unavailable</h4>
                  <p className="fallback-desc">
                    {!fileUrl
                      ? 'The image file link has not been provided or is still processing.'
                      : 'The image could not be loaded from the storage server.'}
                  </p>
                  {fileUrl && (
                    <div className="fallback-actions-row">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                      >
                        <ExternalLink size={14} />
                        <span>Open Image URL</span>
                      </a>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setImgError(false);
                          setImgLoading(true);
                        }}
                      >
                        <RefreshCw size={14} />
                        <span>Retry Loading</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="image-stage-inner">
                  {imgLoading && (
                    <div className="image-loading-spinner">
                      <RefreshCw size={24} className="spinner-rotate" />
                      <span>Loading image...</span>
                    </div>
                  )}
                  <img
                    src={fileUrl}
                    alt={resource?.title || 'Course material'}
                    className="curriculum-image-element"
                    style={{
                      transform: `scale(${zoomLevel / 100})`,
                      transition: 'transform 0.15s ease'
                    }}
                    onLoad={() => setImgLoading(false)}
                    onError={() => {
                      setImgLoading(false);
                      setImgError(true);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="curriculum-modal-footer">
          <span className="footer-resource-type-info">
            Format: {isArticle ? 'Interactive Article (Markdown)' : isPdf ? 'PDF Document' : 'Image / Diagram'}
            {resource?.fileSize ? ` • ${resource.fileSize}` : ''}
          </span>
          <span className="footer-enrollment-tag">
            {isEnrolled ? '✓ Course Enrolled Access' : 'Preview Mode Access'}
          </span>
        </div>
      </div>
    </div>
  );
};
