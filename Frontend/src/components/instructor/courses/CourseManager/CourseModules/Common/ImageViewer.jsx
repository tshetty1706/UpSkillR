import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';

export const ImageViewer = ({
  url = '',
  title = 'Image Resource',
  onClose
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(!url);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setHasError(!url);
    setZoomLevel(100);
  }, [url, retryKey]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    setRetryKey(prev => prev + 1);
  };

  return (
    <div className="image-viewer-wrapper">
      {/* ── Image Dedicated Controls Toolbar ── */}
      <div className="image-viewer-toolbar">
        <div className="image-toolbar-group image-toolbar-info">
          <ImageIcon size={15} className="image-info-icon" />
          <span className="image-file-name" title={title}>{title}</span>
        </div>

        <div className="image-toolbar-group image-toolbar-controls">
          <button
            type="button"
            className="image-tool-btn"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 50 || hasError}
            title="Zoom Out (-25%)"
            aria-label="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>

          <button
            type="button"
            className="image-tool-btn image-zoom-indicator"
            onClick={handleResetZoom}
            disabled={hasError}
            title="Reset to 100% Zoom"
            aria-label="Reset Zoom"
          >
            <span>{zoomLevel}%</span>
          </button>

          <button
            type="button"
            className="image-tool-btn"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 300 || hasError}
            title="Zoom In (+25%)"
            aria-label="Zoom In"
          >
            <ZoomIn size={15} />
          </button>

          <div className="image-toolbar-divider" />

          <button
            type="button"
            className="image-tool-btn"
            onClick={handleResetZoom}
            title="Reset Zoom / Fit"
            aria-label="Reset Zoom"
          >
            <Maximize2 size={15} />
            <span className="image-btn-label">Fit</span>
          </button>

          <button
            type="button"
            className="image-tool-btn"
            onClick={handleRetry}
            title="Reload Image"
            aria-label="Reload Image"
          >
            <RotateCcw size={15} />
          </button>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="image-tool-btn image-tool-btn-primary"
              title="Open Image in New Browser Tab"
            >
              <ExternalLink size={15} />
              <span className="image-btn-label">Open in Tab</span>
            </a>
          )}
        </div>
      </div>

      {/* ── Main Image Viewport ── */}
      <div className="image-viewer-viewport">
        {/* Loading Spinner */}
        {isLoading && !hasError && (
          <div className="image-viewer-loading-overlay">
            <Loader2 size={32} className="image-spinner" />
            <span className="image-loading-text">Loading image...</span>
          </div>
        )}

        {/* Error Fallback */}
        {hasError ? (
          <div className="viewer-error-state image-error-state">
            <AlertCircle size={36} className="viewer-error-icon" />
            <h4 className="viewer-error-title">Unable to load this image</h4>
            <p className="viewer-error-subtext">
              The image resource could not be loaded from storage. You can retry or open the image in a new tab.
            </p>
            <div className="viewer-error-actions">
              <button
                type="button"
                className="btn-viewer-retry"
                onClick={handleRetry}
              >
                <RotateCcw size={14} />
                <span>Retry</span>
              </button>

              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-viewer-open-external"
                >
                  <ExternalLink size={14} />
                  <span>Open in New Tab</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="image-viewer-stage">
            <img
              key={`${url}-${retryKey}`}
              src={url}
              alt={title}
              className="image-viewer-img"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transition: 'transform 0.15s ease-out'
              }}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
