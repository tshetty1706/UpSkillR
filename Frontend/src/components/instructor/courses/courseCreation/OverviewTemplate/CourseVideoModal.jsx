import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Video,
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ExternalLink
} from 'lucide-react';
import './CourseOverviewTemplate.css';

export const CourseVideoModal = ({
  videoItem,
  moduleTitle = '',
  lessonTitle = '',
  isEnrolled = false,
  onClose
}) => {
  const [streamType, setStreamType] = useState('mp4'); // 'mp4' | 'high_mp4' | 'direct' | 'hls'
  const [isLoading, setIsLoading] = useState(true);
  const [playerError, setPlayerError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const videoRef = useRef(null);

  const rawVideo = videoItem?.video || {};
  const playbackId = rawVideo.muxPlaybackId || rawVideo.playbackId || '';
  const directUrl = rawVideo.videoUrl || rawVideo.url || rawVideo.fileUrl || videoItem?.fileUrl || videoItem?.url || '';

  // Determine playback source URL
  const videoSrc = useMemo(() => {
    if (playbackId) {
      if (streamType === 'mp4') {
        return `https://stream.mux.com/${playbackId}/capped-1080p.mp4`;
      } else if (streamType === 'high_mp4') {
        return `https://stream.mux.com/${playbackId}/high.mp4`;
      } else if (streamType === 'hls') {
        return `https://stream.mux.com/${playbackId}.m3u8`;
      }
    }
    return directUrl;
  }, [playbackId, directUrl, streamType, retryKey]);

  const posterUrl = playbackId
    ? `https://image.mux.com/${playbackId}/thumbnail.jpg?width=1280`
    : '';

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

  // Load and play video when source changes
  useEffect(() => {
    if (!videoSrc) {
      setIsLoading(false);
      setPlayerError(directUrl || playbackId ? 'Video stream is currently being prepared.' : 'No video stream URL available.');
      return;
    }

    setIsLoading(true);
    setPlayerError(null);

    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.src = videoSrc;
      videoEl.load();
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay prevented by browser policy (user can click play control)
          setIsLoading(false);
        });
      }
    }

    return () => {
      if (videoEl) {
        videoEl.pause();
        videoEl.removeAttribute('src');
        videoEl.load();
      }
    };
  }, [videoSrc, retryKey]);

  const handleVideoError = () => {
    if (playbackId) {
      if (streamType === 'mp4') {
        setStreamType('high_mp4');
        return;
      } else if (streamType === 'high_mp4' && directUrl) {
        setStreamType('direct');
        return;
      }
    }
    setIsLoading(false);
    setPlayerError('Unable to load video stream. If this video was recently uploaded, it may still be processing on the server.');
  };

  const handleRetry = () => {
    setIsLoading(true);
    setPlayerError(null);
    setStreamType('mp4');
    setRetryKey(prev => prev + 1);
  };

  return (
    <div className="curriculum-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="video-modal-title">
      <div className="curriculum-video-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="curriculum-modal-header">
          <div className="modal-title-with-badge">
            <div className="modal-icon-pill video-pill">
              <Video size={18} />
            </div>
            <div>
              <div className="modal-context-breadcrumbs">
                {moduleTitle && <span>{moduleTitle}</span>}
                {moduleTitle && lessonTitle && <span> • </span>}
                {lessonTitle && <span>{lessonTitle}</span>}
              </div>
              <h3 id="video-modal-title" className="curriculum-modal-title">
                {videoItem?.title || 'Video Lecture'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close video player"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Video Player Main Stage */}
        <div className="curriculum-video-stage">
          {playerError ? (
            <div className="resource-fallback-box video-fallback">
              <div className="fallback-icon-wrap">
                <AlertCircle size={32} />
              </div>
              <h4 className="fallback-title">Video Playback Unavailable</h4>
              <p className="fallback-desc">{playerError}</p>
              <div className="fallback-actions-row">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleRetry}
                >
                  <RefreshCw size={14} />
                  <span>Retry Playback</span>
                </button>
                {directUrl && (
                  <a
                    href={directUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                  >
                    <ExternalLink size={14} />
                    <span>Open Direct File</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="video-loading-overlay">
                  <RefreshCw size={26} className="spinner-rotate" />
                  <span>Loading video stream...</span>
                </div>
              )}
              <video
                ref={videoRef}
                controls
                playsInline
                autoPlay
                preload="auto"
                poster={posterUrl}
                className="curriculum-video-element"
                onLoadedMetadata={() => setIsLoading(false)}
                onCanPlay={() => setIsLoading(false)}
                onPlaying={() => setIsLoading(false)}
                onWaiting={() => setIsLoading(true)}
                onError={handleVideoError}
              >
                Your browser does not support HTML5 video playback.
              </video>
            </>
          )}
        </div>

        {/* Footer Meta */}
        <div className="curriculum-modal-footer">
          <div className="footer-meta-pill">
            <Clock size={14} />
            <span>Duration: {rawVideo.duration ? `${rawVideo.duration} min` : 'Standard Lecture'}</span>
          </div>
          <div className="footer-meta-pill text-emerald">
            <CheckCircle2 size={14} />
            <span>Target: {rawVideo.watchedThresholdPercent || 90}% watched to complete</span>
          </div>
        </div>
      </div>
    </div>
  );
};
