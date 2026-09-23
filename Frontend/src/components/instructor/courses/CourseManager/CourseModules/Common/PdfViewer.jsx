import React, { useState, useEffect, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  Loader2,
  Download,
  FileText,
  Globe
} from 'lucide-react';

/**
 * Helper to convert Base64 data URL to a clean Blob Object URL.
 * Modern browsers block raw data: URLs inside iframes/objects due to security sandboxing,
 * which causes the "It may have been moved, edited, or deleted" error in Chrome/Firefox.
 */
const dataUrlToBlobUrl = (dataUrl) => {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('Failed to convert data URL to Blob URL:', err);
    return null;
  }
};

export const PdfViewer = ({
  url = '',
  title = 'PDF Document',
  onClose
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [resolvedUrl, setResolvedUrl] = useState('');
  const [isBlobUrl, setIsBlobUrl] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(!url);
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Synchronize and resolve URL on change or retry
  useEffect(() => {
    let createdBlobUrl = null;
    setIsLoading(true);
    setHasError(false);

    if (!url) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    if (url.startsWith('data:')) {
      const blobUrl = dataUrlToBlobUrl(url);
      if (blobUrl) {
        createdBlobUrl = blobUrl;
        setResolvedUrl(blobUrl);
        setIsBlobUrl(true);
      } else {
        setResolvedUrl(url);
        setIsBlobUrl(false);
      }
    } else {
      setResolvedUrl(url);
      setIsBlobUrl(false);
    }

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => {
      clearTimeout(timer);
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [url, retryKey]);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
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
    setUseGoogleViewer(false);
    setRetryKey(prev => prev + 1);
  };

  const toggleGoogleViewer = () => {
    setIsLoading(true);
    setUseGoogleViewer(prev => !prev);
  };

  // Compute final iframe source
  const getIframeSrc = () => {
    if (!resolvedUrl) return '';
    if (useGoogleViewer && !resolvedUrl.startsWith('blob:') && !resolvedUrl.startsWith('data:')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl)}&embedded=true`;
    }
    return resolvedUrl;
  };

  const isRemoteHttpUrl = resolvedUrl && (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://'));

  return (
    <div className="pdf-viewer-wrapper">
      {/* ── PDF Dedicated Controls Toolbar ── */}
      <div className="pdf-viewer-toolbar">
        <div className="pdf-toolbar-group pdf-toolbar-info">
          <FileText size={15} className="pdf-info-icon" />
          <span className="pdf-file-name" title={title}>{title}</span>
        </div>

        <div className="pdf-toolbar-group pdf-toolbar-controls">
          <button
            type="button"
            className="pdf-tool-btn"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 50 || hasError}
            title="Zoom Out (-25%)"
            aria-label="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>

          <button
            type="button"
            className="pdf-tool-btn pdf-zoom-indicator"
            onClick={handleResetZoom}
            disabled={hasError}
            title="Reset to 100% Zoom"
            aria-label="Reset Zoom"
          >
            <span>{zoomLevel}%</span>
          </button>

          <button
            type="button"
            className="pdf-tool-btn"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 200 || hasError}
            title="Zoom In (+25%)"
            aria-label="Zoom In"
          >
            <ZoomIn size={15} />
          </button>

          <div className="pdf-toolbar-divider" />

          <button
            type="button"
            className="pdf-tool-btn"
            onClick={handleResetZoom}
            title="Fit to Width (100%)"
            aria-label="Fit to Width"
          >
            <Maximize2 size={15} />
            <span className="pdf-btn-label">Fit</span>
          </button>

          {isRemoteHttpUrl && (
            <button
              type="button"
              className={`pdf-tool-btn ${useGoogleViewer ? 'pdf-tool-btn-primary' : ''}`}
              onClick={toggleGoogleViewer}
              title={useGoogleViewer ? "Switch to Native Viewer" : "Switch to Google Docs Cloud Viewer"}
              aria-label="Toggle Cloud Viewer"
            >
              <Globe size={15} />
              <span className="pdf-btn-label">{useGoogleViewer ? 'Native View' : 'Cloud View'}</span>
            </button>
          )}

          <button
            type="button"
            className="pdf-tool-btn"
            onClick={handleRetry}
            title="Reload PDF"
            aria-label="Reload PDF"
          >
            <RotateCcw size={15} />
          </button>

          {resolvedUrl && (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-tool-btn pdf-tool-btn-primary"
              title="Open PDF in New Browser Tab"
            >
              <ExternalLink size={15} />
              <span className="pdf-btn-label">Open in Tab</span>
            </a>
          )}
        </div>
      </div>

      {/* ── Main PDF Viewport ── */}
      <div className="pdf-viewer-viewport">
        {/* Loading Spinner */}
        {isLoading && !hasError && (
          <div className="pdf-viewer-loading-overlay">
            <Loader2 size={32} className="pdf-spinner" />
            <span className="pdf-loading-text">Loading PDF document...</span>
          </div>
        )}

        {/* Error Fallback */}
        {hasError ? (
          <div className="viewer-error-state pdf-error-state">
            <AlertCircle size={36} className="viewer-error-icon" />
            <h4 className="viewer-error-title">Unable to load this PDF</h4>
            <p className="viewer-error-subtext">
              The PDF could not be displayed inside the application. You can retry loading or open the document directly in a new tab.
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
          resolvedUrl && (
            <div
              className="pdf-embed-container"
              style={{
                transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : 'none',
                transformOrigin: 'top center',
                width: zoomLevel > 100 ? `${100 * (zoomLevel / 100)}%` : '100%',
                height: zoomLevel > 100 ? `${100 * (zoomLevel / 100)}%` : '100%'
              }}
            >
              <iframe
                key={`${resolvedUrl}-${useGoogleViewer}-${retryKey}`}
                src={getIframeSrc()}
                title={title}
                className="pdf-viewer-iframe"
                frameBorder="0"
                onLoad={() => setIsLoading(false)}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
};
