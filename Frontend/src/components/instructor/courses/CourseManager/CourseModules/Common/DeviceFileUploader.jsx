import React, { useState, useRef, useEffect } from 'react';
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
import { API_BASE } from '../../../../../../config/api';

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
  helpText = '',
  extraData = null
}) => {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentUrl || '');
  const [fileName, setFileName] = useState(currentName || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Synchronize internal state when parent currentUrl/currentName props change
  useEffect(() => {
    setPreviewUrl(currentUrl || '');
    setFileName(currentName || '');
    setSelectedFile(null);
    setUploadError('');
    setUploading(false);
  }, [currentUrl, currentName]);

  const [uploadStatusMessage, setUploadStatusMessage] = useState('');

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
    setUploading(true);
    setUploadProgress(15);
    setUploadStatusMessage('Preparing secure upload session...');

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    let clientVideoDuration = 0;
    if (fileType === 'video') {
      try {
        clientVideoDuration = await new Promise((resolve) => {
          const videoEl = document.createElement('video');
          videoEl.preload = 'metadata';
          videoEl.onloadedmetadata = () => {
            URL.revokeObjectURL(videoEl.src);
            resolve(Math.round(videoEl.duration || 0));
          };
          videoEl.onerror = () => resolve(0);
          videoEl.src = URL.createObjectURL(file);
        });
      } catch (dErr) {
        console.warn('Could not read video metadata:', dErr);
      }
    }

    let finalUrl = '';
    let finalPublicId = '';
    let finalAssetId = '';
    let finalPlaybackId = '';
    let finalDuration = 0;
    let finalStatus = 'ready';

    try {
      const token = sessionStorage.getItem('upskillr_token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      if (uploadEndpoint && fileType !== 'video') {
        // Backend Multipart Endpoint Upload (zero local disk persistence on backend, Cloudinary direct upload)
        setUploadProgress(30);
        setUploadStatusMessage(`Uploading ${fileType.toUpperCase()} file to Cloudinary...`);

        const formData = new FormData();
        formData.append('file', file);
        if (extraData && typeof extraData === 'object') {
          Object.keys(extraData).forEach(k => formData.append(k, extraData[k]));
        }

        const endpointHeaders = getAuthHeader ? getAuthHeader() : authHeaders;
        // Don't set Content-Type header so browser sets multipart/form-data with boundary
        const cleanHeaders = { ...endpointHeaders };
        delete cleanHeaders['Content-Type'];

        const uploadRes = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: cleanHeaders,
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.message || `Failed to upload ${fileType} to Cloudinary.`);
        }

        finalUrl = uploadData.fileUrl || uploadData.url || uploadData.secure_url;
        finalPublicId = uploadData.publicId || uploadData.public_id || '';
        setUploadProgress(100);
      } else if (fileType === 'video') {
        // 1. Obtain direct upload target / credentials
        const credRes = await fetch(`${API_BASE}/media/upload-credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({ type: 'video' })
        });
        const credData = await credRes.json();

        if (credData.uploadUrl) {
          // Direct browser upload
          setUploadProgress(35);
          setUploadStatusMessage('Uploading video from device...');
          await fetch(credData.uploadUrl, {
            method: 'PUT',
            body: file
          });
          setUploadProgress(70);
          setUploadStatusMessage('Upload complete. Processing video stream...');

          // Poll for real assetId and playbackId
          let pollAttempts = 0;
          let isMuxReady = false;
          while (pollAttempts < 10 && !isMuxReady) {
            await new Promise(r => setTimeout(r, 2500));
            pollAttempts++;
            setUploadProgress(Math.min(95, 70 + pollAttempts * 2));
            try {
              const statusRes = await fetch(`${API_BASE}/media/mux-upload/${credData.uploadId}`, {
                headers: authHeaders
              });
              const statusData = await statusRes.json();
              if (statusData.status === 'ready' && statusData.playbackId) {
                finalAssetId = statusData.assetId;
                finalPlaybackId = statusData.playbackId;
                finalDuration = statusData.duration || clientVideoDuration || 0;
                finalUrl = statusData.videoUrl || `https://stream.mux.com/${finalPlaybackId}.m3u8`;
                isMuxReady = true;
                finalStatus = 'ready';
                break;
              } else if (statusData.status === 'failed') {
                throw new Error(statusData.message || 'Video processing failed');
              }
            } catch (pErr) {
              console.warn('Video polling check attempt:', pollAttempts, pErr);
            }
          }

          if (!isMuxReady) {
            finalAssetId = credData.uploadId;
            finalPlaybackId = '';
            finalStatus = 'processing';
            finalDuration = clientVideoDuration || 0;
            setUploadStatusMessage('Video uploaded! Finishing processing in background.');
          }
        } else {
          // Dev mock fallback
          finalAssetId = credData.assetId || `mock_asset_${Date.now()}`;
          finalPlaybackId = credData.playbackId || `mock_playback_${Date.now()}`;
          finalUrl = `https://stream.mux.com/${finalPlaybackId}.m3u8`;
          finalDuration = clientVideoDuration || 0;
          finalStatus = 'ready';
        }
      } else {
        // Direct browser signed upload to Cloudinary
        setUploadStatusMessage('Uploading document from device...');
        const credRes = await fetch(`${API_BASE}/media/upload-credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({ type: fileType === 'pdf' ? 'document' : 'image' })
        });
        const credData = await credRes.json();

        if (credData.uploadUrl && credData.apiKey && credData.signature) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('api_key', credData.apiKey);
          formData.append('timestamp', credData.timestamp);
          formData.append('signature', credData.signature);
          formData.append('folder', credData.folder);

          const cloudRes = await fetch(credData.uploadUrl, {
            method: 'POST',
            body: formData
          });
          const cloudData = await cloudRes.json();
          if (cloudRes.ok && cloudData.secure_url) {
            finalUrl = cloudData.secure_url;
            finalPublicId = cloudData.public_id;
          } else {
            throw new Error(cloudData?.error?.message || 'Failed to upload file to Cloudinary');
          }
        } else {
          throw new Error('Cloudinary direct upload credentials unavailable.');
        }
      }

      setUploadProgress(100);
      setUploading(false);
      setUploadStatusMessage('');

      if (onUploadSuccess) {
        onUploadSuccess({
          file,
          fileName: file.name,
          fileSize: file.size,
          url: finalUrl,
          publicId: finalPublicId,
          assetId: finalAssetId,
          playbackId: finalPlaybackId,
          duration: finalDuration,
          status: finalStatus,
          response: {
            success: true,
            url: finalUrl,
            playbackId: finalPlaybackId,
            assetId: finalAssetId,
            publicId: finalPublicId,
            duration: finalDuration,
            status: finalStatus
          }
        });
      }
    } catch (uploadErr) {
      console.error('Direct Media Upload Failure:', uploadErr);
      setUploadError(uploadErr.message || 'Upload failed. Please try again.');
      setUploading(false);
      setUploadStatusMessage('');
      setPreviewUrl(currentUrl || '');
      setSelectedFile(null);
    }
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
          <p className="progress-subtext">{uploadStatusMessage || 'Uploading to course media server... Please do not close.'}</p>
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
                  <span>Video stream ready</span>
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
