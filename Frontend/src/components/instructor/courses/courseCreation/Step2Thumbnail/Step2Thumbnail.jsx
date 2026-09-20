import React, { useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Check,
  Lightbulb,
  ArrowLeft,
  ArrowRight,
  Trash2,
  RefreshCw
} from 'lucide-react';
import './Step2Thumbnail.css';

const DEFAULT_FALLBACK_THUMBNAIL =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80';

export const Step2Thumbnail = ({
  thumbnailFile,
  thumbnailPreview,
  onThumbnailChange,
  onNext,
  onBack
}) => {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const hasThumbnail = Boolean(thumbnailPreview);

  const handleFileSelect = (file) => {
    setErrorMsg('');
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Invalid format. Only JPG, PNG, and WebP are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB limit. Please choose a smaller file.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    onThumbnailChange(file, previewUrl);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleRemove = () => {
    setErrorMsg('');
    onThumbnailChange(null, '');
  };

  const handleSkip = () => {
    setErrorMsg('');
    onThumbnailChange(null, DEFAULT_FALLBACK_THUMBNAIL);
  };

  return (
    <div className="step-thumbnail-wrapper">
      {/* Header */}
      <div className="step-thumbnail-header">
        <span className="step-badge-tag">CREATE A COURSE</span>
        <h1 className="step-thumbnail-heading">
          Add a <span className="accent-highlight">Thumbnail Image</span>
        </h1>
        <p className="step-thumbnail-subheading">
          The thumbnail is displayed at checkout and throughout the learner experience. Upload one now or choose one later.
        </p>
      </div>

      {/* Main Options Container */}
      <div className="thumbnail-main-card">
        <div className="thumbnail-options-grid">
          {/* Option A: Upload Card Column */}
          <div className="upload-column-wrapper">
            <div
              className={`upload-card-box ${isDragOver ? 'drag-over' : ''} ${hasThumbnail && thumbnailFile ? 'has-image' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              {hasThumbnail && thumbnailFile ? (
                <div className="thumbnail-preview-active">
                  <div className="preview-image-container">
                    <img src={thumbnailPreview} alt="Course Thumbnail Preview" className="preview-image" />
                    <div className="preview-overlay">
                      <button
                        type="button"
                        className="preview-action-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <RefreshCw size={16} />
                        <span>Change Image</span>
                      </button>
                      <button
                        type="button"
                        className="preview-action-btn btn-delete"
                        onClick={handleRemove}
                      >
                        <Trash2 size={16} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                  <div className="preview-file-info">
                    <span className="preview-file-name">{thumbnailFile.name}</span>
                    <span className="preview-file-size">
                      {(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              ) : (
                <div className="upload-prompt-content">
                  <div className="upload-icon-circle">
                    <Upload size={28} />
                  </div>
                  <h3 className="upload-box-title">Upload an image</h3>
                  <p className="upload-box-desc">
                    Click to browse or drag and drop<br />
                    JPG, PNG, or WebP (recommended 1280 × 720)<br />
                    Max size 5MB
                  </p>
                  <button
                    type="button"
                    className="btn-choose-image"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={16} />
                    <span>Choose Image</span>
                  </button>
                </div>
              )}

              {errorMsg && <div className="thumbnail-error-box">{errorMsg}</div>}
            </div>
          </div>

          {/* OR Divider */}
          <div className="thumbnail-or-divider">
            <span className="or-badge">OR</span>
          </div>

          {/* Option B: Skip Card */}
          <div
            className={`skip-card-box ${hasThumbnail && thumbnailPreview === DEFAULT_FALLBACK_THUMBNAIL ? 'skip-selected' : ''}`}
          >
            <div className="skip-icon-circle">
              <ImageIcon size={32} />
            </div>
            <h3 className="skip-box-title">I don't have one yet</h3>
            <p className="skip-box-desc">
              Skip this step for now, you can always add or change it later.
            </p>
            <button type="button" className="btn-skip-now" onClick={handleSkip}>
              {hasThumbnail && thumbnailPreview === DEFAULT_FALLBACK_THUMBNAIL
                ? 'Selected Default'
                : 'Skip for Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Tips Card */}
      <div className="thumbnail-tips-card">
        <div className="tips-card-header">
          <Lightbulb size={20} className="tip-bulb-icon" />
          <h3 className="tips-card-title">Recommendations for Great Thumbnails</h3>
        </div>
        <div className="tips-checkmarks-grid">
          <div className="tip-check-item">
            <Check size={16} className="tip-check-icon" />
            <span>Aspect Ratio: 16:9 widescreen format</span>
          </div>
          <div className="tip-check-item">
            <Check size={16} className="tip-check-icon" />
            <span>Resolution: 1280 × 720 px (minimum 640 × 360)</span>
          </div>
          <div className="tip-check-item">
            <Check size={16} className="tip-check-icon" />
            <span>Text in image: Keep text minimal, large, and centered</span>
          </div>
          <div className="tip-check-item">
            <Check size={16} className="tip-check-icon" />
            <span>File size: Under 5MB for fast loading across all devices</span>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="step-actions-footer">
        <button type="button" className="btn-secondary-action" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <button type="button" className="btn-primary-action" onClick={onNext}>
          <span>Next: Course Overview</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
