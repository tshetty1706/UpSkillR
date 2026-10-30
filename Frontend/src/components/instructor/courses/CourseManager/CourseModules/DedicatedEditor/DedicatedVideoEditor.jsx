import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Maximize,
  Maximize2,
  Trash2,
  Plus,
  FileVideo,
  FileText,
  Check,
  RefreshCw,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Scissors,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Eye,
  Link as LinkIcon,
  Code,
  Image as ImageIcon
} from 'lucide-react';
import { API_BASE } from '../../../../../../config/api';
import { renderMarkdownToHTML } from '../Common/MarkdownEditor';
import './DedicatedVideoEditor.css';

export const DedicatedVideoEditor = ({
  courseId,
  course = {},
  activeModule = {},
  activeLesson = {},
  initialItem = null,
  onBack,
  onSaveSuccess,
  apiBase = API_BASE,
  getAuthHeader = () => ({}),
  toast
}) => {
  // ── Form State ──
  const isEditingExisting = Boolean(initialItem?._id || initialItem?.itemId || initialItem?.id);
  const itemId = initialItem?._id || initialItem?.itemId || initialItem?.id || null;

  const [title, setTitle] = useState(() => initialItem?.title || activeLesson?.title || 'Setting Up Python, Jupyter Notebook & Libraries');
  const [description, setDescription] = useState(() => {
    return initialItem?.description || '';
  });
  const [publicationStatus, setPublicationStatus] = useState(() => initialItem?.state || 'published');

  // Video metadata
  const vidMeta = initialItem?.video || initialItem?.videoDetails || {};
  const [allowFreePreview, setAllowFreePreview] = useState(() => Boolean(vidMeta.allowFreePreview));
  const [addToLessonNotes, setAddToLessonNotes] = useState(() => Boolean(vidMeta.addToLessonNotes));

  // Video media state
  const [muxAssetId, setMuxAssetId] = useState(() => vidMeta.muxAssetId || '');
  const [muxPlaybackId, setMuxPlaybackId] = useState(() => vidMeta.muxPlaybackId || '');
  const [externalUrl, setExternalUrl] = useState(() => vidMeta.videoUrl || vidMeta.url || '');
  const [duration, setDuration] = useState(() => Number(vidMeta.duration || vidMeta.durationSeconds) || 564); // 9m 24s default
  const [fileName, setFileName] = useState(() => vidMeta.fileName || 'lecture-video.mp4');
  const [fileSizeDisplay, setFileSizeDisplay] = useState(() => vidMeta.fileSize || '142.4 MB • Uploaded');
  const [thumbnailUrl, setThumbnailUrl] = useState(() => {
    if (vidMeta.thumbnailUrl) return vidMeta.thumbnailUrl;
    if (vidMeta.muxPlaybackId) return `https://image.mux.com/${vidMeta.muxPlaybackId}/thumbnail.jpg?time=2`;
    return 'https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=600&auto=format&fit=crop&q=80';
  });

  // Upload progress & processing status
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Video Player state
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState('1080p HD');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Timeline & Editing state (Trim, Undo, Redo, Zoom)
  const [timelineZoom, setTimelineZoom] = useState(1); // 1x to 2x zoom
  const [trimStart, setTrimStart] = useState(() => Number(vidMeta.trimStart) || 0);
  const [trimEnd, setTrimEnd] = useState(() => Number(vidMeta.trimEnd) || (duration || 564));
  const [isTrimActive, setIsTrimActive] = useState(true);
  const [historyStack, setHistoryStack] = useState([]);
  const [futureStack, setFutureStack] = useState([]);

  // Description Write / Preview state
  const [descMode, setDescMode] = useState('write'); // 'write' | 'preview'

  const fileInputRef = useRef(null);
  const customThumbInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Mark changes
  const markDirty = () => setHasUnsavedChanges(true);

  // Format seconds to mm:ss (e.g. 0:00 / 09:24)
  const formatTime = (totalSecs) => {
    const secs = Math.max(0, Math.round(Number(totalSecs) || 0));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Format seconds to "9 min 24 sec"
  const formatSecondsLong = (totalSecs) => {
    const secs = Math.max(0, Math.round(Number(totalSecs) || 0));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0 && s > 0) return `${m} min ${s} sec`;
    if (m > 0) return `${m} min`;
    return `${s} sec`;
  };

  // ── Video Playback Handlers ──
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(true));
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      const dur = Math.round(videoRef.current.duration);
      if (dur > 0) {
        setDuration(dur);
        if (!trimEnd || trimEnd === 564) {
          setTrimEnd(dur);
        }
      }
    }
  };

  const handleSeek = (timeSecs) => {
    const target = Math.max(0, Math.min(duration || 564, timeSecs));
    setCurrentTime(target);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  };

  const handleVolumeToggle = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleFullscreen = () => {
    const container = document.querySelector('.dve-player-card');
    if (container) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen?.().catch(() => { });
      }
    }
  };

  // ── Timeline Scrubbing ──
  const handleTimelineScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = pct * (duration || 564);
    handleSeek(targetTime);
  };

  // ── Undo / Redo for Trim ──
  const handleTrimChange = (newStart, newEnd) => {
    setHistoryStack((prev) => [...prev, { trimStart, trimEnd }]);
    setFutureStack([]);
    setTrimStart(newStart);
    setTrimEnd(newEnd);
    markDirty();
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const last = historyStack[historyStack.length - 1];
    setFutureStack((prev) => [...prev, { trimStart, trimEnd }]);
    setHistoryStack((prev) => prev.slice(0, -1));
    setTrimStart(last.trimStart);
    setTrimEnd(last.trimEnd);
    markDirty();
  };

  const handleRedo = () => {
    if (futureStack.length === 0) return;
    const next = futureStack[futureStack.length - 1];
    setHistoryStack((prev) => [...prev, { trimStart, trimEnd }]);
    setFutureStack((prev) => prev.slice(0, -1));
    setTrimStart(next.trimStart);
    setTrimEnd(next.trimEnd);
    markDirty();
  };

  // ── Video Upload & Replacement (Mux Direct Upload with Mock Fallback) ──
  const handleUploadFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast?.error?.('Please select a valid video file (MP4, MOV, WebM, AVI).');
      return;
    }

    if (file.size > 2 * 1024 * 1024 * 1024) {
      toast?.error?.('Video file size exceeds maximum 2GB limit.');
      return;
    }

    setFileName(file.name);
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    setFileSizeDisplay(`${sizeMB} MB • Uploading`);
    setIsUploading(true);
    setUploadProgress(10);
    setUploadStatusText('Preparing secure upload session...');
    markDirty();

    let clientDuration = 0;
    try {
      clientDuration = await new Promise((resolve) => {
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.onloadedmetadata = () => {
          URL.revokeObjectURL(tempVideo.src);
          resolve(Math.round(tempVideo.duration || 0));
        };
        tempVideo.onerror = () => resolve(0);
        tempVideo.src = URL.createObjectURL(file);
      });
      if (clientDuration > 0) {
        setDuration(clientDuration);
        setTrimEnd(clientDuration);
      }
    } catch (dErr) {
      console.warn('Metadata duration check warning:', dErr);
    }

    try {
      const token = sessionStorage.getItem('upskillr_token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const credRes = await fetch(`${apiBase}/media/upload-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ type: 'video' })
      });
      const credData = await credRes.json();

      if (credData.uploadUrl) {
        setUploadProgress(25);
        setUploadStatusText('Uploading video to stream encoder...');

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', credData.uploadUrl);
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable) {
              const pct = Math.round((evt.loaded / evt.total) * 60) + 25;
              setUploadProgress(Math.min(85, pct));
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed with HTTP ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(file);
        });

        setUploadProgress(90);
        setUploadStatusText('Upload complete! Processing video stream...');
        setIsProcessing(true);

        let pollAttempts = 0;
        let isReady = false;
        while (pollAttempts < 12 && !isReady) {
          await new Promise((r) => setTimeout(r, 2500));
          pollAttempts++;
          try {
            const statusRes = await fetch(`${apiBase}/media/mux-upload/${credData.uploadId}`, {
              headers: authHeaders
            });
            const statusData = await statusRes.json();
            if (statusData.status === 'ready' && statusData.playbackId) {
              setMuxAssetId(statusData.assetId);
              setMuxPlaybackId(statusData.playbackId);
              const finalDur = statusData.duration || clientDuration || 564;
              setDuration(finalDur);
              setTrimEnd(finalDur);
              setThumbnailUrl(`https://image.mux.com/${statusData.playbackId}/thumbnail.jpg?time=2`);
              isReady = true;
              break;
            } else if (statusData.status === 'failed') {
              throw new Error(statusData.message || 'Mux video processing failed.');
            }
          } catch (pErr) {
            console.warn('Poll attempt:', pollAttempts, pErr);
          }
        }

        if (!isReady) {
          setMuxAssetId(credData.uploadId);
          toast?.info?.('Video uploaded! Encoding will finish in background.');
        } else {
          toast?.success?.('Video processed and ready for streaming!');
        }
      } else {
        const mockPlayId = credData.playbackId || `mock_stream_${Date.now()}`;
        setMuxAssetId(credData.assetId || `mock_asset_${Date.now()}`);
        setMuxPlaybackId(mockPlayId);
        setThumbnailUrl(`https://image.mux.com/${mockPlayId}/thumbnail.jpg?time=2`);
        toast?.success?.('Video uploaded and configured!');
      }

      setUploadProgress(100);
      setFileSizeDisplay(`${sizeMB} MB • Uploaded`);
    } catch (err) {
      console.error('Video upload error:', err);
      toast?.error?.(err.message || 'Video upload failed. Please try again.');
      setFileSizeDisplay('Upload failed');
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  // Rich Text Markdown Helper for Description Write Mode
  const applyRichFormat = (prefix, suffix = prefix) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selectedText = description.substring(start, end) || 'text';
    const newText = description.substring(0, start) + prefix + selectedText + suffix + description.substring(end);
    setDescription(newText);
    markDirty();
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  // ── Save Video Content ──
  const handleSaveVideo = async () => {
    if (!title || !title.trim()) {
      toast?.error?.('Please enter a video title.');
      return;
    }

    setIsSaving(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : getAuthHeader();

      const payload = {
        title: title.trim(),
        description: description.trim(),
        type: 'video',
        state: publicationStatus,
        video: {
          muxAssetId: muxAssetId || '',
          muxPlaybackId: muxPlaybackId || '',
          videoUrl: externalUrl || (muxPlaybackId ? `https://stream.mux.com/${muxPlaybackId}.m3u8` : ''),
          url: externalUrl || (muxPlaybackId ? `https://stream.mux.com/${muxPlaybackId}.m3u8` : ''),
          fileUrl: externalUrl || (muxPlaybackId ? `https://stream.mux.com/${muxPlaybackId}.m3u8` : ''),
          duration: Number(duration) || 564,
          trimStart: Number(trimStart) || 0,
          trimEnd: Number(trimEnd) || (duration || 564),
          allowFreePreview: Boolean(allowFreePreview),
          addToLessonNotes: Boolean(addToLessonNotes),
          thumbnailUrl: thumbnailUrl || '',
          fileName: fileName || '',
          status: 'ready'
        }
      };

      let endpoint = '';
      let method = 'POST';

      if (isEditingExisting && itemId) {
        endpoint = `${apiBase}/courses/${courseId}/curriculum/lessons/${activeLesson._id}/items/${itemId}`;
        method = 'PATCH';
      } else {
        endpoint = `${apiBase}/courses/${courseId}/curriculum/lessons/${activeLesson._id}/items`;
        method = 'POST';
      }

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save video changes.');
      }

      toast?.success?.(isEditingExisting ? 'Video updated successfully!' : 'Video created successfully!');
      setHasUnsavedChanges(false);

      if (onSaveSuccess) {
        onSaveSuccess(data.item);
      }
    } catch (err) {
      console.error('Save video item error:', err);
      toast?.error?.(err.message || 'Could not save video.');
    } finally {
      setIsSaving(false);
    }
  };

  // Back Navigation with dirty check
  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved video changes. Are you sure you want to go back?')) {
        return;
      }
    }
    if (onBack) onBack();
  };

  // Frame Thumbnail Options (Matching Reference Design)
  const thumbnailOptions = [
    muxPlaybackId
      ? `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=2`
      : 'https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=600&auto=format&fit=crop&q=80',
    muxPlaybackId
      ? `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=15`
      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    muxPlaybackId
      ? `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=30`
      : 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&auto=format&fit=crop&q=80'
  ];

  // Ruler tick intervals
  const totalDuration = duration || 564;
  const tickCount = 10;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const sec = Math.round((i / tickCount) * totalDuration);
    return formatTime(sec);
  });

  // Calculate percentage positions for playhead & trim handles
  const playheadPercent = Math.max(0, Math.min(100, (currentTime / totalDuration) * 100));
  const trimStartPercent = Math.max(0, Math.min(100, (trimStart / totalDuration) * 100));
  const trimEndPercent = Math.max(0, Math.min(100, (trimEnd / totalDuration) * 100));

  return (
    <div className="dedicated-video-editor-container">
      {/* ── Top Header Actions Bar ── */}
      <div className="dve-top-header">

        <div className="dve-header-actions">
          <span className={`dve-status-pill ${publicationStatus === 'published' ? 'published' : 'draft'}`}>
            • {publicationStatus === 'published' ? 'Published' : 'Draft'}
          </span>

          <button
            type="button"
            className="dve-btn-save-changes"
            onClick={handleSaveVideo}
            disabled={isSaving}
          >
            {isSaving ? <RefreshCw size={15} className="spinner-rotate" /> : <Check size={15} />}
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* ── Main 2-Column Split Workspace (Matches Screenshot Exactly) ── */}
      <div className="dve-two-column-layout">
        {/* ════════════════════════════════════════════════════════════
            LEFT COLUMN: VIDEO EDITOR STUDIO
            ════════════════════════════════════════════════════════════ */}
        <div className="dve-left-editor-column">
          {/* Section Header: Icon + Title + Replace Video Button */}
          <div className="dve-section-header-row">
            <div className="dve-header-title-group">
              <div className="dve-icon-badge-green">
                <Scissors size={20} />
              </div>
              <div className="dve-header-text-block">
                <h2 className="dve-section-title">Video Editor</h2>
                <p className="dve-section-subtitle">
                  Upload, trim, cut, add chapters and customize your video.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="dve-btn-replace-outline"
              onClick={() => fileInputRef.current?.click()}
              title="Replace or upload a new video file"
            >
              <UploadCloud size={16} />
              <span>Replace Video</span>
            </button>

            {/* Hidden Video File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadFile(e.target.files[0]);
                }
              }}
            />
          </div>

          {/* Video Player Card */}
          <div className="dve-player-card">
            <div className="dve-player-viewport" onClick={() => setShowSettingsMenu(false)}>
              {muxPlaybackId ? (
                <video
                  ref={videoRef}
                  className="dve-main-video-el"
                  poster={thumbnailUrl}
                  src={`https://stream.mux.com/${muxPlaybackId}/capped-1080p.mp4`}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayPause();
                  }}
                >
                  <source
                    src={`https://stream.mux.com/${muxPlaybackId}.m3u8`}
                    type="application/x-mpegURL"
                  />
                </video>
              ) : externalUrl && !externalUrl.includes('youtube.com') && !externalUrl.includes('youtu.be') ? (
                <video
                  ref={videoRef}
                  className="dve-main-video-el"
                  poster={thumbnailUrl}
                  src={externalUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayPause();
                  }}
                />
              ) : (
                <div
                  className="dve-mock-video-canvas"
                  style={{
                    backgroundImage: `url(${thumbnailUrl})`
                  }}
                  onClick={togglePlayPause}
                >
                  <div className="dve-video-on-screen-overlay">
                    <span className="dve-overlay-lesson-tag">Lesson 2:</span>
                    <h3 className="dve-overlay-lesson-heading">{title}</h3>
                  </div>
                </div>
              )}

              {/* Floating Settings Menu Popup (Quality & Playback Speed) */}
              {showSettingsMenu && (
                <div className="dve-player-settings-popup" onClick={(e) => e.stopPropagation()}>
                  <div className="dve-popup-group">
                    <span className="dve-popup-label">Quality</span>
                    <div className="dve-popup-list">
                      {['1080p HD', '720p HD', '480p', '360p'].map((q) => (
                        <button
                          key={q}
                          type="button"
                          className={`dve-popup-item ${selectedQuality === q ? 'active' : ''}`}
                          onClick={() => handleQualityChange(q)}
                        >
                          <span>{selectedQuality === q ? '✓ ' : ''}{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="dve-popup-divider" />

                  <div className="dve-popup-group">
                    <span className="dve-popup-label">Playback speed</span>
                    <div className="dve-popup-list">
                      {[0.25, 0.5, 1, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          className={`dve-popup-item ${playbackSpeed === spd ? 'active' : ''}`}
                          onClick={() => handleSpeedChange(spd)}
                        >
                          <span>{spd === 1 ? '1x (Normal)' : `${spd}x`}</span>
                          {playbackSpeed === spd && <Check size={13} className="dve-item-check" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Drop Overlay if Dragging */}
              {isDragActive && (
                <div className="dve-drag-overlay" onDragLeave={handleDragLeave} onDrop={handleDrop}>
                  <UploadCloud size={40} />
                  <p>Drop video to upload</p>
                </div>
              )}
            </div>

            {/* Custom On-Screen Player Controls Bar */}
            <div className="dve-custom-player-controls">
              <button
                type="button"
                className="dve-player-btn"
                onClick={togglePlayPause}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <span className="dve-player-time">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>

              {/* Mini Scrubber in player bar */}
              <div className="dve-player-scrub-bar" onClick={handleTimelineScrub}>
                <div
                  className="dve-player-scrub-progress"
                  style={{ width: `${playheadPercent}%` }}
                />
              </div>

              {/* Volume Button & Slider */}
              <div className="dve-volume-control">
                <button
                  type="button"
                  className="dve-player-btn"
                  onClick={handleVolumeToggle}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="dve-volume-slider"
                  title="Volume"
                />
              </div>

              {/* Settings Gear Button */}
              <button
                type="button"
                className={`dve-player-btn ${showSettingsMenu ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettingsMenu(!showSettingsMenu);
                }}
                title="Playback settings"
              >
                <Settings size={18} />
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                className="dve-player-btn"
                onClick={handleFullscreen}
                title="Fullscreen"
              >
                <Maximize size={18} />
              </button>
            </div>
          </div>

          {/* ── Editing Toolbar (Trim, Undo, Redo, Zoom) — Cut, Split, Min/Max Removed ── */}
          <div className="dve-editing-toolbar">
            <div className="dve-toolbar-left-actions">
              <button
                type="button"
                className={`dve-btn-tool-pill ${isTrimActive ? 'active' : ''}`}
                onClick={() => setIsTrimActive(!isTrimActive)}
                title="Toggle Trim Mode"
              >
                <Scissors size={15} />
                <span>Trim</span>
              </button>

              <button
                type="button"
                className="dve-btn-tool-subtle"
                onClick={handleUndo}
                disabled={historyStack.length === 0}
                title="Undo trim edit"
              >
                <RotateCcw size={15} />
                <span>Undo</span>
              </button>

              <button
                type="button"
                className="dve-btn-tool-subtle"
                onClick={handleRedo}
                disabled={futureStack.length === 0}
                title="Redo trim edit"
              >
                <RotateCw size={15} />
                <span>Redo</span>
              </button>
            </div>

            <div className="dve-toolbar-center-time">
              <span className="dve-toolbar-clock">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
            </div>

            {/* Timeline Zoom Slider Controls */}
            <div className="dve-toolbar-right-zoom">
              <button
                type="button"
                className="dve-btn-zoom-step"
                onClick={() => setTimelineZoom((z) => Math.max(1, z - 0.25))}
                title="Zoom Out Timeline"
              >
                <ZoomOut size={16} />
              </button>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.1"
                value={timelineZoom}
                onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
                className="dve-zoom-range-input"
                title="Timeline Zoom"
              />
              <button
                type="button"
                className="dve-btn-zoom-step"
                onClick={() => setTimelineZoom((z) => Math.min(2.5, z + 0.25))}
                title="Zoom In Timeline"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>

          {/* ── Video Timeline & Filmstrip Workspace ── */}
          <div className="dve-timeline-workspace-card">
            <div className="dve-timeline-scroll-container">
              <div
                className="dve-timeline-track-canvas"
                style={{ width: `${timelineZoom * 100}%` }}
                onClick={handleTimelineScrub}
              >
                {/* Time Ruler Ticks */}
                <div className="dve-time-ruler">
                  {ticks.map((t, idx) => (
                    <div key={idx} className="dve-ruler-tick">
                      <div className="dve-tick-mark" />
                      <span className="dve-tick-time">{t}</span>
                    </div>
                  ))}
                </div>

                {/* Filmstrip Thumbnails Row */}
                <div className="dve-filmstrip-strip">
                  {Array.from({ length: 8 }).map((_, fIdx) => (
                    <div
                      key={fIdx}
                      className="dve-filmstrip-cell"
                      style={{
                        backgroundImage: `url(${thumbnailOptions[fIdx % thumbnailOptions.length]})`
                      }}
                    />
                  ))}
                </div>

                {/* Audio Waveform Row */}
                <div className="dve-waveform-strip">
                  <svg className="dve-waveform-svg" viewBox="0 0 800 32" preserveAspectRatio="none">
                    {Array.from({ length: 100 }).map((_, wIdx) => {
                      const h = Math.sin(wIdx * 0.25) * 8 + Math.cos(wIdx * 0.4) * 6 + 12;
                      const x = wIdx * 8;
                      const isPast = (x / 800) * 100 <= playheadPercent;
                      return (
                        <rect
                          key={wIdx}
                          x={x}
                          y={16 - h / 2}
                          width="3.5"
                          height={Math.max(4, h)}
                          rx="1.5"
                          className={isPast ? 'dve-wave-bar-played' : 'dve-wave-bar-remaining'}
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* Active Trim Range Highlight & Handles */}
                <div
                  className="dve-trim-highlight-range"
                  style={{
                    left: `${trimStartPercent}%`,
                    width: `${Math.max(0, trimEndPercent - trimStartPercent)}%`
                  }}
                >
                  <div
                    className="dve-trim-handle left"
                    title={`Trim start: ${formatTime(trimStart)}`}
                  >
                    <div className="dve-handle-grip" />
                  </div>
                  <div
                    className="dve-trim-handle right"
                    title={`Trim end: ${formatTime(trimEnd)}`}
                  >
                    <div className="dve-handle-grip" />
                  </div>
                </div>

                {/* Draggable Playhead Needle */}
                <div
                  className="dve-playhead-needle"
                  style={{ left: `${playheadPercent}%` }}
                >
                  <div className="dve-playhead-marker">
                    <span>▼ {formatTime(currentTime)}</span>
                  </div>
                  <div className="dve-playhead-line" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            RIGHT COLUMN: VIDEO DETAILS & PREVIEW
            ════════════════════════════════════════════════════════════ */}
        <div className="dve-right-details-column">
          <div className="dve-card dve-details-card">
            {/* Header: Icon + Title + Subtitle */}
            <div className="dve-details-header">
              <div className="dve-details-icon-badge">
                <FileText size={20} />
              </div>
              <div className="dve-details-title-wrap">
                <h3 className="dve-details-title">Video Details</h3>
                <p className="dve-details-subtitle">
                  Add key details to help learners find and understand your video.
                </p>
              </div>
            </div>

            {/* 1. Video Title Input */}
            <div className="dve-form-group">
              <label className="dve-field-label">
                Video Title <span className="dve-text-red">*</span>
              </label>
              <input
                type="text"
                maxLength={200}
                className="dve-input-title"
                placeholder="e.g. Setting Up Python, Jupyter Notebook & Libraries"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
              />
              <span className="dve-char-counter">
                {(title || '').length}/200 characters
              </span>
            </div>

            {/* 2. Description with Write / Preview Tabs (Requirement 4) */}
            <div className="dve-form-group">
              <div className="dve-desc-label-row">
                <label className="dve-field-label">
                  Description <span className="dve-text-red">*</span>
                </label>
                {/* Write / Preview Mode Selector */}
                <div className="dve-desc-mode-pills" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={descMode === 'write'}
                    className={`dve-mode-pill ${descMode === 'write' ? 'active' : ''}`}
                    onClick={() => setDescMode('write')}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={descMode === 'preview'}
                    className={`dve-mode-pill ${descMode === 'preview' ? 'active' : ''}`}
                    onClick={() => setDescMode('preview')}
                  >
                    Preview
                  </button>
                </div>
              </div>

              {/* WRITE MODE: Toolbar + Textarea */}
              {descMode === 'write' ? (
                <div className="dve-desc-editor-box">
                  <div className="dve-richtext-toolbar">
                    <button
                      type="button"
                      className="dve-tool-btn"
                      onClick={() => applyRichFormat('**', '**')}
                      title="Bold"
                    >
                      <Bold size={14} />
                    </button>
                    <button
                      type="button"
                      className="dve-tool-btn"
                      onClick={() => applyRichFormat('*', '*')}
                      title="Italic"
                    >
                      <Italic size={14} />
                    </button>
                    <button
                      type="button"
                      className="dve-tool-btn"
                      onClick={() => applyRichFormat('<u>', '</u>')}
                      title="Underline"
                    >
                      <Underline size={14} />
                    </button>
                    <button
                      type="button"
                      className="dve-tool-btn"
                      onClick={() => applyRichFormat('~~', '~~')}
                      title="Strikethrough"
                    >
                      <Strikethrough size={14} />
                    </button>
                    <button
                      type="button"
                      className="dve-tool-btn"
                      onClick={() => applyRichFormat('\n- ', '')}
                      title="Bullet List"
                    >
                      <List size={14} />
                    </button>
                    <button
                      type="button"
                      className="dve-tool-btn"
                      onClick={() => applyRichFormat('\n1. ', '')}
                      title="Numbered List"
                    >
                      <ListOrdered size={14} />
                    </button>
                    <button
                      type="button"
                      className="dve-tool-btn"
                      onClick={() => applyRichFormat('[', '](https://)')}
                      title="Link"
                    >
                      <LinkIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className="dve-tool-btn"
                      onClick={() => applyRichFormat('`', '`')}
                      title="Inline Code"
                    >
                      <Code size={14} />
                    </button>
                    <button
                      type="button"
                      className="dve-tool-btn"
                      onClick={() => applyRichFormat('![Image](', ')')}
                      title="Image"
                    >
                      <ImageIcon size={14} />
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    rows={6}
                    maxLength={2000}
                    className="dve-textarea-desc"
                    placeholder="In this video, learners will discover..."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
              ) : (
                /* PREVIEW MODE: Clean HTML/Markdown preview without toolbar */
                <div className="dve-desc-preview-container">
                  {description && description.trim() ? (
                    <div
                      className="dve-rendered-markdown-content"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdownToHTML(description)
                      }}
                    />
                  ) : (
                    <p className="dve-preview-empty-text">No description provided yet.</p>
                  )}
                </div>
              )}

              <span className="dve-char-counter">
                {(description || '').length}/2000 characters
              </span>
            </div>

            {/* 3. Thumbnail Selection Grid (3 frame options + Upload Custom) */}
            <div className="dve-form-group">
              <label className="dve-field-label">Thumbnail</label>
              <p className="dve-field-subtext">Choose a thumbnail or upload a custom one.</p>

              <div className="dve-thumbnails-row-grid">
                {thumbnailOptions.map((thumbSrc, tIdx) => {
                  const isSelected = thumbnailUrl === thumbSrc;
                  return (
                    <div
                      key={tIdx}
                      className={`dve-thumb-option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setThumbnailUrl(thumbSrc);
                        markDirty();
                      }}
                      title={`Select frame thumbnail ${tIdx + 1}`}
                    >
                      <img src={thumbSrc} alt={`Thumbnail ${tIdx + 1}`} />
                      {isSelected && (
                        <div className="dve-thumb-check-badge">
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Upload Custom Card */}
                <input
                  type="file"
                  ref={customThumbInputRef}
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const customUrl = URL.createObjectURL(e.target.files[0]);
                      setThumbnailUrl(customUrl);
                      markDirty();
                    }
                  }}
                />
                <div
                  className="dve-thumb-option-card upload-custom"
                  onClick={() => customThumbInputRef.current?.click()}
                  title="Upload custom thumbnail image"
                >
                  <UploadCloud size={18} className="dve-thumb-upload-icon" />
                  <span>Upload Custom</span>
                </div>
              </div>
            </div>

            {/* 4. Video Visibility (Published & Draft only — Scheduled removed) */}
            <div className="dve-visibility-block">
              <div className="dve-visibility-header">
                <Eye size={18} className="dve-vis-icon" />
                <div className="dve-vis-text">
                  <h4 className="dve-vis-title">Video Visibility</h4>
                  <p className="dve-vis-subtitle">Choose who can view this video.</p>
                </div>
              </div>

              <div className="dve-visibility-radios">
                <label
                  className={`dve-radio-card ${publicationStatus === 'published' ? 'active' : ''}`}
                  onClick={() => {
                    setPublicationStatus('published');
                    markDirty();
                  }}
                >
                  <div className="dve-radio-indicator">
                    {publicationStatus === 'published' && <div className="dve-radio-dot" />}
                  </div>
                  <div className="dve-radio-info">
                    <span className="dve-radio-label">Published</span>
                    <span className="dve-radio-desc">Visible to all learners in this course</span>
                  </div>
                </label>

                <label
                  className={`dve-radio-card ${publicationStatus === 'draft' ? 'active' : ''}`}
                  onClick={() => {
                    setPublicationStatus('draft');
                    markDirty();
                  }}
                >
                  <div className="dve-radio-indicator">
                    {publicationStatus === 'draft' && <div className="dve-radio-dot" />}
                  </div>
                  <div className="dve-radio-info">
                    <span className="dve-radio-label">Draft</span>
                    <span className="dve-radio-desc">Only visible to you and other instructors</span>
                  </div>
                </label>
              </div>
            </div>

            {/* 5. Video Processed Success Banner (Matching Reference Design) */}
            <div className="dve-processed-success-banner">
              <CheckCircle2 size={20} className="dve-success-icon" />
              <div className="dve-success-text-group">
                <h4 className="dve-success-title">
                  {muxPlaybackId || externalUrl ? 'Video processed successfully' : 'Video ready'}
                </h4>
                <p className="dve-success-meta">
                  Duration: {formatSecondsLong(duration)} | Resolution: 1080p (Full HD)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
