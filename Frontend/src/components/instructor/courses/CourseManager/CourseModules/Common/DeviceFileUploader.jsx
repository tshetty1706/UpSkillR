import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  File,
  FileText,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Play
} from 'lucide-react';

export const DeviceFileUploader = ({
  fileType = 'video', // 'video' | 'pdf' | 'image'
  accept = '',
  maxSizeMB = 100,
  currentUrl = '',
  currentName = '',
  onUploadSuccess,
  uploadEndpoint = '',
  getAuthHeader = () => ({}),
  disabled = false,
  label = 'Upload File from Device',
  helpText = ''
}) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentUrl || '');
  const [fileName, setFileName] = useState(currentName || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const defaultAccept = {
    video: 'video/mp4,video/webm,video/ogg,video/quicktime',
    pdf: 'application/pdf,.pdf',
    image: 'image/png,image/jpeg,image/webp,image/gif'
  }[fileType] || '*/*';

  const acceptString = accept || defaultAccept;

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelection = async (file) => {
    if (!file) return;

    setUploadError('');

    // Validate size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`File is too large. Maximum allowed size is ${maxSizeMB}MB.`);
      return;
    }

    // Validate type if possible
    if (fileType === 'pdf' && !file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      setUploadError('Please select a valid PDF file.');
      return;
    }
    if (fileType === 'image' && !file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }
    if (fileType === 'video' && !file.type.startsWith('video/')) {
      setUploadError('Please select a valid video file (MP4, WebM, MOV).');
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);

    // If uploadEndpoint provided, upload automatically via XMLHttpRequest for real progress
    if (uploadEndpoint) {
      await uploadFileToEndpoint(file);
    } else {
      // Local preview object URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      if (onUploadSuccess) {
        onUploadSuccess({
          file,
          fileName: file.name,
          fileSize: file.size,
          url: objectUrl
        });
      }
    }
  };

  const uploadFileToEndpoint = (file) => {
    return new Promise((resolve, reject) => {
      setUploading(true);
      setUploadProgress(0);

      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.open('POST', uploadEndpoint, true);

      // Add auth headers
      const headers = getAuthHeader();
      Object.keys(headers).forEach(headerKey => {
        if (headerKey.toLowerCase() !== 'content-type') {
          xhr.setRequestHeader(headerKey, headers[headerKey]);
        }
      });

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        setUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              const fileData = response.data || {};
              const url = fileData.url || (fileType === 'video' ? fileData.muxPlaybackId : '');
              setPreviewUrl(url);
              setUploadProgress(100);
              if (onUploadSuccess) {
                onUploadSuccess({
                  file,
                  fileName: file.name,
                  fileSize: file.size,
                  url,
                  response: fileData
                });
              }
              resolve(response);
            } else {
              setUploadError(response.message || 'Upload failed');
              reject(new Error(response.message || 'Upload failed'));
            }
          } catch (e) {
            setUploadError('Invalid response from server');
            reject(e);
          }
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            setUploadError(errRes.message || `Upload failed with status ${xhr.status}`);
          } catch (e) {
            setUploadError(`Upload failed with status ${xhr.status}`);
          }
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        setUploading(false);
        setUploadError('Network error while uploading file');
        reject(new Error('Network error'));
      };

      xhr.send(formData);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled && !uploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleTriggerPicker = () => {
    if (fileInputRef.current && !disabled && !uploading) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setPreviewUrl('');
    setFileName('');
    setUploadProgress(0);
    setUploadError('');
    if (onUploadSuccess) {
      onUploadSuccess({ file: null, fileName: '', fileSize: 0, url: '' });
    }
  };

  const renderIcon = () => {
    if (fileType === 'video') return <Video size={36} className="uploader-type-icon" />;
    if (fileType === 'image') return <ImageIcon size={36} className="uploader-type-icon" />;
    return <FileText size={36} className="uploader-type-icon" />;
  };

  return (
    <div className="device-uploader-wrapper">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptString}
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
          }
        }}
        disabled={disabled || uploading}
      />

      {/* When no file is selected/uploaded yet */}
      {!previewUrl && !selectedFile && (
        <div
          className={`device-dropzone ${isDragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={handleTriggerPicker}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="dropzone-icon-box">{renderIcon()}</div>
          <div className="dropzone-text-box">
            <h4 className="dropzone-title">{label}</h4>
            <p className="dropzone-hint">
              Drag & drop or <span className="dropzone-browse-link">browse your device</span>
            </p>
            <p className="dropzone-specs">
              {helpText || `Supported: ${fileType.toUpperCase()} (Up to ${maxSizeMB}MB)`}
            </p>
          </div>
        </div>
      )}

      {/* During Upload Progress */}
      {uploading && (
        <div className="uploader-progress-card">
          <div className="progress-header">
            <div className="progress-file-info">
              <RefreshCw size={18} className="spinner-rotate" />
              <span className="progress-file-name">{fileName || 'Uploading...'}</span>
            </div>
            <span className="progress-percent">{uploadProgress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <p className="progress-subtext">Uploading to course media server... Please do not close.</p>
        </div>
      )}

      {/* Error state */}
      {uploadError && (
        <div className="uploader-error-banner">
          <AlertCircle size={16} />
          <span>{uploadError}</span>
          <button type="button" className="btn-dismiss-error" onClick={() => setUploadError('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* When file is selected / uploaded */}
      {previewUrl && !uploading && (
        <div className="uploader-preview-card">
          {fileType === 'image' && (
            <div className="preview-media-container image-preview-box">
              <img src={previewUrl} alt={fileName || 'Resource Preview'} className="preview-img" />
            </div>
          )}

          {fileType === 'video' && (
            <div className="preview-media-container video-preview-box">
              {previewUrl.startsWith('http') || previewUrl.startsWith('blob:') ? (
                <video src={previewUrl} controls className="preview-video-player" />
              ) : (
                <div className="video-mux-badge">
                  <Play size={24} />
                  <span>Playback Asset Ready</span>
                </div>
              )}
            </div>
          )}

          {fileType === 'pdf' && (
            <div className="preview-media-container pdf-preview-box">
              <FileText size={40} className="pdf-icon-large" />
              <div className="pdf-info">
                <p className="pdf-name">{fileName || 'Attached Document.pdf'}</p>
                {selectedFile?.size && (
                  <span className="pdf-size">{formatFileSize(selectedFile.size)}</span>
                )}
              </div>
            </div>
          )}

          <div className="preview-footer-actions">
            <div className="preview-status-indicator">
              <CheckCircle2 size={16} className="text-emerald" />
              <span>Ready for course</span>
            </div>
            <div className="preview-buttons-group">
              <button
                type="button"
                className="btn-replace-file"
                onClick={handleTriggerPicker}
                disabled={disabled}
              >
                <RefreshCw size={14} />
                <span>Replace</span>
              </button>
              <button
                type="button"
                className="btn-remove-file"
                onClick={handleClear}
                disabled={disabled}
              >
                <X size={14} />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
