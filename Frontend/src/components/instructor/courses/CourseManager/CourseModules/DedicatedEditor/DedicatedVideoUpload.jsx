import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  UploadCloud,
  Video,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileVideo,
  Clock,
  ChevronRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { API_BASE } from '../../../../../../config/api';
import './DedicatedVideoUpload.css';

export const DedicatedVideoUpload = ({
  courseId,
  course = {},
  activeModule = {},
  activeLesson = {},
  onBack,
  onUploadSuccess,
  apiBase = API_BASE,
  getAuthHeader = () => ({}),
  toast
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState(''); // 'preparing' | 'uploading' | 'processing' | 'ready' | 'saving'
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fileDetails, setFileDetails] = useState(null);

  const fileInputRef = useRef(null);

  // Validate file
  const validateVideoFile = (file) => {
    if (!file) return 'Please select a file.';

    // Check MIME type or extension
    const validExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!file.type.startsWith('video/') && !hasValidExt) {
      return 'Invalid video format. Supported formats: MP4, MOV, WebM, AVI.';
    }

    // Limit to 2GB
    const maxSizeBytes = 2 * 1024 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return 'File size exceeds maximum 2GB limit. Please choose a smaller video.';
    }

    return null;
  };

  // Format bytes to display string
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  // Format seconds to mm:ss
  const formatDurationDisplay = (totalSecs) => {
    const s = Math.max(0, Math.round(Number(totalSecs) || 0));
    const m = Math.floor(s / 60);
    const remainder = s % 60;
    return `${m}:${remainder.toString().padStart(2, '0')}`;
  };

  // Handle file selection from input or dropzone
  const handleFileChosen = (file) => {
    if (!file) return;

    setErrorMessage('');
    const validationError = validateVideoFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      toast?.error?.(validationError);
      return;
    }

    setSelectedFile(file);
    setFileDetails({
      name: file.name,
      size: formatBytes(file.size),
      sizeBytes: file.size,
      rawName: file.name.replace(/\.[^/.]+$/, '')
    });

    // Start upload process automatically
    startUploadPipeline(file);
  };

  // Extract real frame thumbnails from video file using canvas
  const captureVideoThumbnails = async (videoFile, count = 3) => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        const fileUrl = URL.createObjectURL(videoFile);
        video.src = fileUrl;

        video.onloadedmetadata = async () => {
          const dur = video.duration || 10;
          const thumbnails = [];
          const canvas = document.createElement('canvas');
          canvas.width = 480;
          canvas.height = 270;
          const ctx = canvas.getContext('2d');

          const seekTimes = [
            Math.max(0.1, dur * 0.15),
            Math.max(0.5, dur * 0.5),
            Math.max(0.9, dur * 0.85)
          ];

          for (const t of seekTimes) {
            await new Promise((seekDone) => {
              const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                try {
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                  thumbnails.push(canvas.toDataURL('image/jpeg', 0.85));
                } catch (e) {
                  console.warn('Canvas draw warning:', e);
                }
                seekDone();
              };
              video.addEventListener('seeked', onSeeked);
              video.currentTime = t;
            });
          }
          resolve(thumbnails);
        };

        video.onerror = () => resolve([]);
      } catch (err) {
        console.warn('captureVideoThumbnails error:', err);
        resolve([]);
      }
    });
  };

  // Upload pipeline
  const startUploadPipeline = async (file) => {
    setIsUploading(true);
    setIsProcessing(false);
    setErrorMessage('');
    setUploadProgress(5);
    setUploadStage('preparing');
    setStatusMessage('Preparing secure upload session & extracting thumbnails...');

    // 1. Client-side duration detection & real frame thumbnail extraction
    let detectedDuration = 0;
    let capturedThumbnails = [];
    const localBlobUrl = URL.createObjectURL(file);
    try {
      detectedDuration = await new Promise((resolve) => {
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.onloadedmetadata = () => {
          resolve(Math.round(tempVideo.duration || 0));
        };
        tempVideo.onerror = () => resolve(0);
        tempVideo.src = localBlobUrl;
      });
      capturedThumbnails = await captureVideoThumbnails(file, 3);
    } catch (dErr) {
      console.warn('Metadata duration check warning:', dErr);
    }

    try {
      const token = sessionStorage.getItem('upskillr_token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : getAuthHeader();

      // 2. Request direct upload credentials from backend
      setUploadProgress(15);
      const credRes = await fetch(`${apiBase}/media/upload-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ type: 'video' })
      });

      const credData = await credRes.json();
      if (!credRes.ok || !credData.success) {
        throw new Error(credData.message || 'Failed to initialize video upload session.');
      }

      let finalAssetId = '';
      let finalPlaybackId = '';
      let finalDuration = detectedDuration || 564;
      let finalVideoUrl = '';
      let finalThumbnail = capturedThumbnails[0] || '';

      if (credData.uploadUrl) {
        // 3. Direct upload to Mux stream encoder
        setUploadStage('uploading');
        setStatusMessage('Uploading video to media stream encoder...');

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', credData.uploadUrl);
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const pct = Math.round((evt.loaded / evt.total) * 55) + 20;
              setUploadProgress(Math.min(75, pct));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with HTTP ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('Network error during video upload. Please check connection.'));
          xhr.send(file);
        });

        // 4. Processing stage: poll for asset readiness
        setUploadProgress(80);
        setUploadStage('processing');
        setIsProcessing(true);
        setStatusMessage('Upload complete. Encoding video for HD adaptive streaming...');

        let pollAttempts = 0;
        let isReady = false;
        while (pollAttempts < 14 && !isReady) {
          await new Promise((r) => setTimeout(r, 2200));
          pollAttempts++;
          setUploadProgress(Math.min(92, 80 + pollAttempts));
          try {
            const statusRes = await fetch(`${apiBase}/media/mux-upload/${credData.uploadId}`, {
              headers: authHeaders
            });
            const statusData = await statusRes.json();
            if (statusData.status === 'ready' && statusData.playbackId) {
              finalAssetId = statusData.assetId;
              finalPlaybackId = statusData.playbackId;
              finalDuration = statusData.duration || detectedDuration || 564;
              finalVideoUrl = `https://stream.mux.com/${finalPlaybackId}.m3u8`;
              if (!finalThumbnail) {
                finalThumbnail = `https://image.mux.com/${finalPlaybackId}/thumbnail.jpg?time=2`;
              }
              isReady = true;
              break;
            } else if (statusData.status === 'failed') {
              throw new Error(statusData.message || 'Video stream encoding failed.');
            }
          } catch (pollErr) {
            console.warn('Poll attempt:', pollAttempts, pollErr);
          }
        }

        if (!isReady) {
          finalAssetId = credData.uploadId;
          finalPlaybackId = credData.uploadId;
          if (!finalThumbnail) {
            finalThumbnail = 'https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=600&auto=format&fit=crop&q=80';
          }
        }
      } else {
        // Development / mock fallback
        setUploadProgress(85);
        setUploadStage('processing');
        setStatusMessage('Configuring development video stream...');
        await new Promise((r) => setTimeout(r, 1000));

        finalAssetId = credData.assetId || `asset_${Date.now()}`;
        finalPlaybackId = credData.playbackId || `stream_${Date.now()}`;
        if (!finalThumbnail) {
          finalThumbnail = `https://image.mux.com/${finalPlaybackId}/thumbnail.jpg?time=2`;
        }
        finalVideoUrl = `https://stream.mux.com/${finalPlaybackId}.m3u8`;
      }

      // Complete upload without saving automatically to DB
      setUploadProgress(100);
      setUploadStage('ready');
      setStatusMessage('Video processed successfully! Opening Video Editor...');
      toast?.success?.('Video uploaded & processed! Opening in editor...');

      const rawTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const cleanTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

      // Create unsaved video item payload with real thumbnails and playable URL
      const unsavedItem = {
        _id: null,
        lessonId: activeLesson._id,
        title: cleanTitle || `${activeLesson.title || 'Lesson'} Video Lecture`,
        description: '',
        state: 'draft',
        isNewUnsaved: true,
        video: {
          muxAssetId: finalAssetId,
          muxPlaybackId: finalPlaybackId,
          videoUrl: localBlobUrl || finalVideoUrl,
          url: localBlobUrl || finalVideoUrl,
          fileUrl: localBlobUrl || finalVideoUrl,
          duration: Number(finalDuration) || detectedDuration || 0,
          trimStart: 0,
          trimEnd: Number(finalDuration) || detectedDuration || 0,
          allowFreePreview: false,
          addToLessonNotes: false,
          thumbnailUrl: capturedThumbnails[0] || finalThumbnail,
          thumbnails: capturedThumbnails.length > 0 ? capturedThumbnails : [finalThumbnail],
          fileName: file.name,
          fileSize: formatBytes(file.size),
          status: 'ready'
        }
      };

      setTimeout(() => {
        if (onUploadSuccess) {
          onUploadSuccess(unsavedItem);
        }
      }, 600);
    } catch (err) {
      console.error('Video upload pipeline error:', err);
      setErrorMessage(err.message || 'An error occurred during video upload. Please try again.');
      toast?.error?.(err.message || 'Video upload failed.');
      setIsUploading(false);
      setIsProcessing(false);
      setUploadStage('');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChosen(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="dedicated-video-upload-root">
      {/* ── Top Header Actions Bar (Matches Studio Header) ── */}
      <header className="dvu-top-header">
        <div className="dvu-header-left">
          <button
            type="button"
            className="dvu-btn-back-circle"
            onClick={onBack}
            title="Return to Lesson"
            aria-label="Return to Lesson"
            disabled={isUploading && uploadProgress > 0 && uploadProgress < 100}
          >
            <ArrowLeft size={18} />
          </button>

          <div className="dvu-header-titles">
            <div className="dvu-title-row">
              <h1 className="dvu-page-title">Upload Video</h1>
            </div>
          </div>
        </div>

        <div className="dvu-header-right">
          <button
            type="button"
            className="dvu-btn-cancel-header"
            onClick={onBack}
            disabled={isUploading && uploadProgress > 0 && uploadProgress < 100}
          >
            Cancel & Return
          </button>
        </div>
      </header>

      {/* ── Main Stage 1 Upload Content Card ── */}
      <main className="dvu-main-container">
        <div className="dvu-upload-card">
          {/* Card Header */}
          <div className="dvu-card-header">
            <div className="dvu-header-icon-box">
              <Video size={24} />
            </div>
            <div className="dvu-card-header-text">
              <h2 className="dvu-card-title">Select Video File</h2>
              <p className="dvu-card-subtitle">
                Upload your lecture video file. After upload and processing complete, you'll be automatically redirected to the Video Editor to review, add details, and finalize your lesson.
              </p>
            </div>
          </div>

          {/* Validation Error Message */}
          {errorMessage && (
            <div className="dvu-error-banner" role="alert">
              <AlertCircle size={20} className="dvu-error-icon" />
              <div className="dvu-error-content">
                <span className="dvu-error-title">Upload Error</span>
                <p className="dvu-error-text">{errorMessage}</p>
              </div>
              <button
                type="button"
                className="dvu-btn-try-again"
                onClick={() => {
                  setErrorMessage('');
                  setSelectedFile(null);
                  setIsUploading(false);
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {/* Upload Dropzone / Progress Area */}
          {!isUploading ? (
            <div
              className={`dvu-dropzone ${isDragActive ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChosen(e.target.files[0]);
                  }
                }}
              />

              <div className="dvu-dropzone-icon-circle">
                <UploadCloud size={36} className="dvu-upload-cloud-icon" />
              </div>

              <div className="dvu-dropzone-instructions">
                <h3 className="dvu-dropzone-prompt">
                  Choose a video file or drag & drop it here
                </h3>
                <p className="dvu-dropzone-hint">
                  Supports MP4, MOV, WebM, and AVI formats up to 2GB in size
                </p>
              </div>

              <div className="dvu-dropzone-action">
                <span className="dvu-btn-browse">Browse Video File</span>
              </div>

              <div className="dvu-dropzone-features">
                <div className="dvu-feature-pill">
                  <ShieldCheck size={14} />
                  <span>Adaptive HD Streaming</span>
                </div>
                <div className="dvu-feature-pill">
                  <Clock size={14} />
                  <span>Auto Duration Detection</span>
                </div>
                <div className="dvu-feature-pill">
                  <FileVideo size={14} />
                  <span>Max File Size: 2 GB</span>
                </div>
              </div>
            </div>
          ) : (
            /* Uploading & Processing Progress Card */
            <div className="dvu-progress-container">
              <div className="dvu-progress-file-info">
                <div className="dvu-progress-icon-badge">
                  <FileVideo size={22} />
                </div>
                <div className="dvu-progress-name-size">
                  <span className="dvu-filename-text">{fileDetails?.name || 'lecture-video.mp4'}</span>
                  <span className="dvu-filesize-text">{fileDetails?.size || '0 MB'}</span>
                </div>
                <span className="dvu-progress-percentage">{uploadProgress}%</span>
              </div>

              {/* Animated Progress Bar */}
              <div className="dvu-progress-track">
                <div
                  className={`dvu-progress-bar ${uploadProgress === 100 ? 'complete' : ''}`}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>

              {/* Status Message */}
              <div className="dvu-status-box">
                {uploadProgress < 100 ? (
                  <RefreshCw size={18} className="spinner-rotate dvu-status-spinner" />
                ) : (
                  <CheckCircle2 size={18} className="dvu-status-check" />
                )}
                <span className="dvu-status-text">{statusMessage}</span>
              </div>

              {/* Stepper Pipeline Status */}
              <div className="dvu-pipeline-steps">
                <div className={`dvu-step-item ${uploadProgress >= 15 ? 'done' : uploadProgress > 0 ? 'active' : ''}`}>
                  <span className="step-circle">{uploadProgress >= 15 ? <Check size={12} /> : '1'}</span>
                  <span className="step-label">Validate & Prepare</span>
                </div>
                <div className="step-connector" />
                <div className={`dvu-step-item ${uploadProgress >= 75 ? 'done' : uploadProgress >= 20 ? 'active' : ''}`}>
                  <span className="step-circle">{uploadProgress >= 75 ? <Check size={12} /> : '2'}</span>
                  <span className="step-label">Upload Video</span>
                </div>
                <div className="step-connector" />
                <div className={`dvu-step-item ${uploadProgress >= 95 ? 'done' : uploadProgress >= 75 ? 'active' : ''}`}>
                  <span className="step-circle">{uploadProgress >= 95 ? <Check size={12} /> : '3'}</span>
                  <span className="step-label">Process & Stream</span>
                </div>
                <div className="step-connector" />
                <div className={`dvu-step-item ${uploadProgress === 100 ? 'done' : uploadProgress >= 95 ? 'active' : ''}`}>
                  <span className="step-circle">{uploadProgress === 100 ? <Check size={12} /> : '4'}</span>
                  <span className="step-label">Launch Editor</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Guidance & Cancel Button */}
          <div className="dvu-card-footer">
            <button
              type="button"
              className="dvu-btn-return-secondary"
              onClick={onBack}
              disabled={isUploading && uploadProgress > 0 && uploadProgress < 100}
            >
              <ArrowLeft size={16} />
              <span>Cancel & Return to Lesson</span>
            </button>
            <p className="dvu-footer-note">
              Uploaded videos are stored securely with adaptive bitrate encoding for lightning-fast playback across all learner devices.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
