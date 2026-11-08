import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  AlertCircle,
  Check,
  Sparkles,
  CheckCircle2,
  Clock,
  Eye,
  Lock,
  Info
} from 'lucide-react';
import { renderMarkdownToHTML } from '../../../components/instructor/courses/CourseManager/CourseModules/Common/MarkdownEditor.jsx';
import { EmptyContentState } from './EmptyContentState.jsx';
import { BACKEND_URL, API_BASE } from '../../../config/api';
import './VideoPlayer.css';

export const VideoLesson = ({
  lesson,
  contentItem,
  course,
  courseId,
  isCompleted = false,
  onWatchEligibilityChange,
  videoRef: externalVideoRef,
  onTimeUpdate,
  onPlay,
  onPause,
  onLoadedMetadata
}) => {
  // Internal ref if external is not provided
  const internalVideoRef = useRef(null);
  const activeVideoRef = externalVideoRef || internalVideoRef;
  const containerRef = useRef(null);
  const scrubTrackRef = useRef(null);
  const hlsInstanceRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // 1. Resolve Exact Lesson Video Metadata (NO UNRELATED DEMO FALLBACKS)
  const videoObj = contentItem?.video || contentItem?.videoDetails || {};

  let muxPlaybackId = (videoObj.muxPlaybackId || contentItem?.muxPlaybackId || '').trim();
  // Filter out mock IDs
  if (muxPlaybackId && (muxPlaybackId.startsWith('mock_') || muxPlaybackId.startsWith('mux_mock_') || muxPlaybackId.startsWith('stream_'))) {
    muxPlaybackId = '';
  }

  // Derive URLs from current lesson item only
  const rawUrl = (
    videoObj.videoUrl ||
    videoObj.url ||
    videoObj.fileUrl ||
    contentItem?.fileUrl ||
    contentItem?.mediaUrl ||
    ''
  ).trim();

  const isDeadBlob = rawUrl.startsWith('blob:');
  let cleanRawUrl = isDeadBlob ? '' : rawUrl;

  // Resolve relative /uploads/ paths with BACKEND_URL
  if (cleanRawUrl.startsWith('/uploads/')) {
    const base = (BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, '');
    cleanRawUrl = `${base}${cleanRawUrl}`;
  }

  let provider = 'none';
  let primaryStreamUrl = '';
  let fallbackMp4Url = (videoObj.mp4Url || '').trim();

  if (muxPlaybackId) {
    provider = 'mux';
    primaryStreamUrl = `https://stream.mux.com/${muxPlaybackId}.m3u8`;
    fallbackMp4Url = `https://stream.mux.com/${muxPlaybackId}/capped-1080p.mp4`;
  } else if (cleanRawUrl.includes('cloudinary.com')) {
    provider = 'cloudinary';
    let safeCloudinary = cleanRawUrl.replace(/^http:/, 'https:');
    if (safeCloudinary.includes('/image/upload/') && safeCloudinary.match(/\.(mp4|mov|webm|mkv|m4v)(\?.*)?$/i)) {
      safeCloudinary = safeCloudinary.replace('/image/upload/', '/video/upload/');
    }
    primaryStreamUrl = safeCloudinary;
    fallbackMp4Url = safeCloudinary;
  } else if (cleanRawUrl.includes('/uploads/')) {
    provider = 'local';
    primaryStreamUrl = cleanRawUrl;
    fallbackMp4Url = cleanRawUrl;
  } else if (cleanRawUrl && !cleanRawUrl.startsWith('blob:')) {
    provider = 'direct';
    primaryStreamUrl = cleanRawUrl;
    fallbackMp4Url = cleanRawUrl;
  }

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [usingFallbackMp4, setUsingFallbackMp4] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Active playable source (HLS stream or MP4 fallback)
  const activeSource = usingFallbackMp4 ? (fallbackMp4Url || primaryStreamUrl) : (primaryStreamUrl || fallbackMp4Url);
  const isExplicitUnavailable = videoObj.status === 'unavailable' || contentItem?.status === 'unavailable';
  const hasValidSource = Boolean(activeSource && activeSource.length > 0) && !isExplicitUnavailable;
  const isProcessing = videoObj.status === 'processing' || contentItem?.status === 'processing';

  // ─── 80% Video Watch Tracking & Forward Seek Lock State ───
  const [watchPercentage, setWatchPercentage] = useState(0);
  const [uniqueWatchedSeconds, setUniqueWatchedSeconds] = useState(0);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const maxWatchedTimeRef = useRef(0);
  const [isWatchEligible, setIsWatchEligible] = useState(Boolean(isCompleted));
  const watchedIntervalsRef = useRef([]);
  const activeIntervalRef = useRef(null);
  const lastSyncTimestampRef = useRef(0);
  const isSyncingRef = useRef(false);

  const effectiveCourseId = course?._id || courseId;
  const effectiveTargetId = contentItem?._id || lesson?._id;

  // Helper to merge client intervals and compute unique seconds
  const mergeClientIntervals = useCallback((existing = [], newSeg = null, maxDur = 0) => {
    const list = [...(existing || [])];
    if (newSeg && newSeg.end > newSeg.start) {
      list.push(newSeg);
    }
    if (!list.length || !maxDur || maxDur <= 0) {
      return { merged: [], uniqueSeconds: 0, pct: 0 };
    }

    const valid = [];
    for (const seg of list) {
      let s = Math.max(0, Math.min(Number(seg.start) || 0, maxDur));
      let e = Math.max(0, Math.min(Number(seg.end) || 0, maxDur));
      if (e > s) {
        valid.push({ start: Math.round(s * 10) / 10, end: Math.round(e * 10) / 10 });
      }
    }

    if (!valid.length) {
      return { merged: [], uniqueSeconds: 0, pct: 0 };
    }

    valid.sort((a, b) => a.start - b.start || b.end - a.end);

    const merged = [valid[0]];
    for (let i = 1; i < valid.length; i++) {
      const prev = merged[merged.length - 1];
      const curr = valid[i];
      if (curr.start <= prev.end + 0.5) {
        prev.end = Math.max(prev.end, curr.end);
      } else {
        merged.push({ start: curr.start, end: curr.end });
      }
    }

    let total = 0;
    for (const m of merged) {
      total += (m.end - m.start);
    }
    total = Math.min(total, maxDur);
    const pct = Math.min(100, Math.round((total / maxDur) * 100));

    return {
      merged,
      uniqueSeconds: Math.round(total * 10) / 10,
      pct
    };
  }, []);

  // Sync watch progress to backend
  const syncWatchProgress = useCallback(async (forcedIntervals = null, curTime = null) => {
    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    if (!token || !effectiveCourseId || !effectiveTargetId) return;
    if (isSyncingRef.current) return;

    let currentIntervals = forcedIntervals || watchedIntervalsRef.current;
    const effDuration = duration || Number(videoObj?.duration) || 0;

    if (activeIntervalRef.current && activeIntervalRef.current.last > activeIntervalRef.current.start) {
      const { merged, uniqueSeconds, pct } = mergeClientIntervals(
        currentIntervals,
        { start: activeIntervalRef.current.start, end: activeIntervalRef.current.last },
        effDuration
      );
      watchedIntervalsRef.current = merged;
      currentIntervals = merged;
      setUniqueWatchedSeconds(uniqueSeconds);
      setWatchPercentage(pct);
      const eligible = pct >= 80 || isCompleted;
      setIsWatchEligible(eligible);
      onWatchEligibilityChange?.({
        percentage: pct,
        uniqueWatchedDuration: uniqueSeconds,
        totalDuration: effDuration,
        isEligible: eligible
      });
      activeIntervalRef.current.start = activeIntervalRef.current.last;
    }

    if (effDuration <= 0) return;

    try {
      isSyncingRef.current = true;
      const pos = curTime !== null ? curTime : (activeVideoRef.current?.currentTime || currentTime);
      const res = await fetch(`${API_BASE}/courses/${effectiveCourseId}/lessons/${effectiveTargetId}/watch-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: effectiveCourseId,
          lessonId: lesson?._id,
          contentItemId: contentItem?._id,
          duration: effDuration,
          currentTime: pos,
          intervals: currentIntervals
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.maxWatchedTime !== undefined) {
            const serverMax = Number(data.maxWatchedTime) || 0;
            if (serverMax > maxWatchedTimeRef.current) {
              maxWatchedTimeRef.current = serverMax;
              setMaxWatchedTime(serverMax);
            }
          }
          setWatchPercentage(data.watchPercentage || 0);
          setUniqueWatchedSeconds(data.uniqueWatchedDuration || 0);
          const eligible = data.isEligible || (data.watchPercentage >= 80) || isCompleted;
          setIsWatchEligible(eligible);
          onWatchEligibilityChange?.({
            percentage: data.watchPercentage || 0,
            uniqueWatchedDuration: data.uniqueWatchedDuration || 0,
            totalDuration: data.totalDuration || effDuration,
            isEligible: eligible,
            isCompleted: data.isCompleted || isCompleted
          });
        }
      }
    } catch (err) {
      // background sync
    } finally {
      isSyncingRef.current = false;
      lastSyncTimestampRef.current = Date.now();
    }
  }, [effectiveCourseId, effectiveTargetId, duration, videoObj?.duration, isCompleted, currentTime, mergeClientIntervals, lesson?._id, contentItem?._id, onWatchEligibilityChange, activeVideoRef]);

  // Complete state reset whenever selected lesson or content item changes
  const activeItemId = contentItem?._id || lesson?._id;
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBufferedPercent(0);
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setUsingFallbackMp4(false);
    setRetryCount(0);

    // Reset watch progress session state
    setWatchPercentage(0);
    setUniqueWatchedSeconds(0);
    setMaxWatchedTime(0);
    maxWatchedTimeRef.current = 0;
    setIsWatchEligible(Boolean(isCompleted));
    watchedIntervalsRef.current = [];
    activeIntervalRef.current = null;
    lastSyncTimestampRef.current = 0;

    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }
    const video = activeVideoRef.current;
    if (video) {
      video.pause();
      try {
        video.currentTime = 0;
        video.removeAttribute('src');
        video.load();
      } catch (e) {
        // ignore unload abort
      }
    }
  }, [activeItemId, isCompleted]);

  // Restore saved watch progress from backend on load or lesson switch
  useEffect(() => {
    let isCancelled = false;
    const fetchSavedWatchProgress = async () => {
      const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
      if (!token || !effectiveCourseId || !effectiveTargetId) return;

      try {
        const res = await fetch(`${API_BASE}/courses/${effectiveCourseId}/lessons/${effectiveTargetId}/watch-progress`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && !isCancelled) {
            const intervals = data.watchedIntervals || [];
            watchedIntervalsRef.current = intervals;
            setWatchPercentage(data.watchPercentage || 0);
            setUniqueWatchedSeconds(data.uniqueWatchedDuration || 0);
            const savedMax = Number(data.maxWatchedTime) || Number(data.lastWatchedPosition) || 0;
            maxWatchedTimeRef.current = savedMax;
            setMaxWatchedTime(savedMax);
            const eligible = data.isEligible || (data.watchPercentage >= 80) || isCompleted;
            setIsWatchEligible(eligible);
            onWatchEligibilityChange?.({
              percentage: data.watchPercentage || 0,
              uniqueWatchedDuration: data.uniqueWatchedDuration || 0,
              totalDuration: data.totalDuration || duration || Number(videoObj?.duration) || 0,
              isEligible: eligible,
              isCompleted: data.isCompleted || isCompleted
            });

            // Restore last playback position if saved (clamped to legitimate max position)
            if (data.lastWatchedPosition > 1 && activeVideoRef.current && !activeVideoRef.current.currentTime) {
              const resumePos = Number(data.lastWatchedPosition);
              if (!isNaN(resumePos) && resumePos > 0) {
                const ceiling = isCompleted ? 999999 : Math.max(savedMax, resumePos);
                const safePos = Math.min(resumePos, ceiling);
                activeVideoRef.current.currentTime = safePos;
                setCurrentTime(safePos);
              }
            }
          }
        }
      } catch (e) {
        // background load error
      }
    };

    fetchSavedWatchProgress();
    return () => {
      isCancelled = true;
    };
  }, [effectiveCourseId, effectiveTargetId, isCompleted, activeItemId]);

  // Sync uncommitted intervals before window closes or refreshes
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeIntervalRef.current && activeIntervalRef.current.last > activeIntervalRef.current.start) {
        syncWatchProgress(null, activeVideoRef.current?.currentTime);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [syncWatchProgress]);

  // Poster resolution from the exact lesson item
  let posterUrl = videoObj.thumbnailUrl || course?.thumbnail || '';
  if (posterUrl.startsWith('blob:')) {
    posterUrl = muxPlaybackId ? `https://image.mux.com/${muxPlaybackId}/thumbnail.jpg?time=2` : '';
  }

  // Attached notes list for this lesson
  const notesList = lesson?.notes || contentItem?.notes || [];

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const s = Math.floor(seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 2. Auto-hide controls logic
  const resetControlsTimeout = useCallback(() => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!isScrubbing && !isSpeedMenuOpen) {
          setIsControlsVisible(false);
        }
      }, 2600);
    }
  }, [isPlaying, isScrubbing, isSpeedMenuOpen]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, resetControlsTimeout]);

  // 3. Initialize HLS or Native Player
  useEffect(() => {
    const videoEl = activeVideoRef.current;
    if (!videoEl || !hasValidSource) return;

    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');

    // Destroy any existing Hls instance
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    const isHlsStream = activeSource.includes('.m3u8') && !usingFallbackMp4;

    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        capLevelToPlayerSize: true,
        autoStartLoad: true
      });
      hlsInstanceRef.current = hls;

      hls.loadSource(activeSource);
      hls.attachMedia(videoEl);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setHasError(false);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn('[HLS.js event]', data.type, data.details, data.fatal);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              hlsInstanceRef.current = null;
              if (fallbackMp4Url && !usingFallbackMp4) {
                setUsingFallbackMp4(true);
              } else {
                setHasError(true);
                setErrorMessage('Unable to play video stream. Please check your connection or retry.');
              }
              break;
          }
        }
      });
    } else if (isHlsStream && videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS (Safari iOS/macOS)
      videoEl.src = activeSource;
      videoEl.load();
    } else {
      // Direct MP4 / Cloudinary / Local file
      videoEl.src = activeSource;
      videoEl.load();
    }

    return () => {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [activeSource, usingFallbackMp4, retryCount, hasValidSource, activeVideoRef, fallbackMp4Url]);

  // 4. Fullscreen Change Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // 5. Video Event Handlers
  const handleLoadedMetadata = (e) => {
    const dur = e.target.duration;
    let finalDur = 0;
    if (dur && !isNaN(dur) && dur > 0) {
      finalDur = dur;
      setDuration(dur);
    } else if (videoObj?.duration) {
      finalDur = Number(videoObj.duration);
      setDuration(finalDur);
    }

    if (finalDur > 0 && watchedIntervalsRef.current.length > 0) {
      const { pct, uniqueSeconds } = mergeClientIntervals(watchedIntervalsRef.current, null, finalDur);
      setWatchPercentage(pct);
      setUniqueWatchedSeconds(uniqueSeconds);
      const eligible = pct >= 80 || isCompleted;
      setIsWatchEligible(eligible);
      onWatchEligibilityChange?.({
        percentage: pct,
        uniqueWatchedDuration: uniqueSeconds,
        totalDuration: finalDur,
        isEligible: eligible
      });
    }

    setIsLoading(false);
    onLoadedMetadata?.(e);
  };

  const handleTimeUpdateInternal = (e) => {
    const cur = e.target.currentTime;
    const dur = e.target.duration || duration || Number(videoObj?.duration) || 0;
    setCurrentTime(cur);

    // Track furthest legitimate playback reached
    if (cur > maxWatchedTimeRef.current) {
      maxWatchedTimeRef.current = cur;
      setMaxWatchedTime(cur);
    }

    if (e.target.buffered && e.target.buffered.length > 0 && e.target.duration > 0) {
      try {
        const bufferedEnd = e.target.buffered.end(e.target.buffered.length - 1);
        setBufferedPercent(Math.min(100, (bufferedEnd / e.target.duration) * 100));
      } catch (bufErr) {
        // buffered range unavailable
      }
    }

    if (isPlaying && dur > 0) {
      if (!activeIntervalRef.current) {
        activeIntervalRef.current = { start: cur, last: cur };
      } else {
        const delta = cur - activeIntervalRef.current.last;
        if (delta > 0 && delta <= 1.5) {
          activeIntervalRef.current.last = cur;
          const { pct, uniqueSeconds } = mergeClientIntervals(
            watchedIntervalsRef.current,
            { start: activeIntervalRef.current.start, end: activeIntervalRef.current.last },
            dur
          );
          setWatchPercentage(pct);
          setUniqueWatchedSeconds(uniqueSeconds);
          if (pct >= 80 && !isWatchEligible) {
            setIsWatchEligible(true);
            onWatchEligibilityChange?.({
              percentage: pct,
              uniqueWatchedDuration: uniqueSeconds,
              totalDuration: dur,
              isEligible: true
            });
          }
        } else if (Math.abs(delta) > 1.5) {
          if (activeIntervalRef.current.last > activeIntervalRef.current.start) {
            const { merged, uniqueSeconds, pct } = mergeClientIntervals(
              watchedIntervalsRef.current,
              { start: activeIntervalRef.current.start, end: activeIntervalRef.current.last },
              dur
            );
            watchedIntervalsRef.current = merged;
            setWatchPercentage(pct);
            setUniqueWatchedSeconds(uniqueSeconds);
          }
          activeIntervalRef.current = { start: cur, last: cur };
        }
      }

      const now = Date.now();
      if (now - lastSyncTimestampRef.current >= 4000) {
        syncWatchProgress(null, cur);
      }
    }

    onTimeUpdate?.(e);
  };

  // Guard native HTML5 video element against bypassing forward seek restrictions
  const handleSeekingInternal = (e) => {
    if (isCompleted) return;
    const vid = e.target;
    if (!vid) return;
    const allowedLimit = Math.max(maxWatchedTimeRef.current, 0);
    // Allow small tolerance (0.5s) for normal playback jitter
    if (vid.currentTime > allowedLimit + 0.5) {
      vid.currentTime = allowedLimit;
      setCurrentTime(allowedLimit);
    }
  };

  const handlePlayInternal = (e) => {
    setIsPlaying(true);
    setIsLoading(false);
    const cur = e.target?.currentTime || currentTime;
    if (!activeIntervalRef.current) {
      activeIntervalRef.current = { start: cur, last: cur };
    }
    onPlay?.(e);
  };

  const handlePauseInternal = (e) => {
    setIsPlaying(false);
    if (activeIntervalRef.current && activeIntervalRef.current.last > activeIntervalRef.current.start) {
      const dur = duration || Number(videoObj?.duration) || 0;
      const { merged, uniqueSeconds, pct } = mergeClientIntervals(
        watchedIntervalsRef.current,
        { start: activeIntervalRef.current.start, end: activeIntervalRef.current.last },
        dur
      );
      watchedIntervalsRef.current = merged;
      setWatchPercentage(pct);
      setUniqueWatchedSeconds(uniqueSeconds);
      activeIntervalRef.current = null;
    }
    syncWatchProgress(null, activeVideoRef.current?.currentTime);
    onPause?.(e);
  };

  const handleWaiting = () => {
    setIsLoading(true);
  };

  const handlePlaying = () => {
    setIsLoading(false);
  };

  const handleVideoError = (e) => {
    console.error('Video element error:', e);
    setIsLoading(false);
    if (!usingFallbackMp4 && fallbackMp4Url) {
      setUsingFallbackMp4(true);
      return;
    }

    const videoEl = activeVideoRef.current;
    let detail = 'Video playback could not be initialized or source format is unsupported.';
    if (videoEl && videoEl.error) {
      switch (videoEl.error.code) {
        case 1:
          detail = 'Video playback was aborted.';
          break;
        case 2:
          detail = 'A network error occurred while loading the video. Please check your internet connection.';
          break;
        case 3:
          detail = 'An error occurred while decoding the video stream.';
          break;
        case 4:
          detail = 'Video stream unavailable or format is not supported by your browser.';
          break;
        default:
          break;
      }
    }
    setHasError(true);
    setErrorMessage(detail);
  };

  // 6. User Control Handlers
  const togglePlayPause = () => {
    const video = activeVideoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch((playErr) => {
        console.warn('Playback start error:', playErr);
        if (fallbackMp4Url && !usingFallbackMp4) {
          setUsingFallbackMp4(true);
        }
      });
    }
    resetControlsTimeout();
  };

  const toggleMute = () => {
    const video = activeVideoRef.current;
    if (!video) return;

    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      video.volume = volume || 0.8;
    } else {
      video.muted = true;
      setIsMuted(true);
    }
    resetControlsTimeout();
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    const video = activeVideoRef.current;
    if (video) {
      video.volume = newVol;
      video.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
    resetControlsTimeout();
  };

  const handleSpeedSelect = (speed) => {
    setPlaybackSpeed(speed);
    if (activeVideoRef.current) {
      activeVideoRef.current.playbackRate = speed;
    }
    setIsSpeedMenuOpen(false);
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
    resetControlsTimeout();
  };

  // Scrubbing & Seeking
  const handleScrubMove = (clientX) => {
    const track = scrubTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const rawTargetTime = pos * (duration || 1);

    // Forward seeking lock:
    // If completed, allow seeking anywhere in the video.
    // If not completed, limit forward seeking to the furthest legitimately watched position.
    const allowedLimit = isCompleted
      ? (duration || rawTargetTime)
      : Math.max(maxWatchedTimeRef.current, 0);

    const targetTime = Math.min(rawTargetTime, allowedLimit);

    if (activeVideoRef.current && isFinite(targetTime)) {
      if (activeIntervalRef.current && activeIntervalRef.current.last > activeIntervalRef.current.start) {
        const dur = duration || Number(videoObj?.duration) || 0;
        const { merged, uniqueSeconds, pct } = mergeClientIntervals(
          watchedIntervalsRef.current,
          { start: activeIntervalRef.current.start, end: activeIntervalRef.current.last },
          dur
        );
        watchedIntervalsRef.current = merged;
        setWatchPercentage(pct);
        setUniqueWatchedSeconds(uniqueSeconds);
      }
      activeIntervalRef.current = { start: targetTime, last: targetTime };
      activeVideoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleScrubStart = (e) => {
    setIsScrubbing(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    handleScrubMove(clientX);

    const onPointerMove = (evt) => {
      const moveX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      handleScrubMove(moveX);
    };

    const onPointerUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove);
    window.addEventListener('touchend', onPointerUp);
    resetControlsTimeout();
  };

  const handleScrubHover = (e) => {
    const track = scrubTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * (duration || 0));
  };

  // Keyboard navigation shortcuts
  const handleKeyDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const allowedLimit = isCompleted
      ? (duration || 999999)
      : Math.max(maxWatchedTimeRef.current, currentTime);

    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === 'ArrowRight' || e.key === 'l') {
      e.preventDefault();
      if (activeVideoRef.current) {
        const step = e.key === 'l' ? 10 : 5;
        const target = Math.min(currentTime + step, allowedLimit);
        activeVideoRef.current.currentTime = target;
        setCurrentTime(target);
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'j') {
      e.preventDefault();
      if (activeVideoRef.current) {
        const step = e.key === 'j' ? 10 : 5;
        const target = Math.max(0, currentTime - step);
        activeVideoRef.current.currentTime = target;
        setCurrentTime(target);
      }
    } else if (e.key === 'f') {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.key === 'm') {
      e.preventDefault();
      toggleMute();
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setUsingFallbackMp4(false);
    setRetryCount((prev) => prev + 1);
  };

  const playedPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const maxWatchedPercent = duration > 0 ? Math.min(100, (maxWatchedTime / duration) * 100) : 0;

  // 7. Explicit Video Processing or Unavailable Empty States
  if (isProcessing) {
    return (
      <div className="content-type-video-view">
        <EmptyContentState
          type="video"
          title="Video Processing"
          message="Your video is being processed. Please try again shortly."
        />
        <div className="content-meta-article">
          <h2 className="lesson-heading-title">{contentItem?.title || lesson?.title}</h2>
          {(contentItem?.description || lesson?.description) && (
            <p className="lesson-description-text">
              {contentItem?.description || lesson?.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!hasValidSource) {
    return (
      <div className="content-type-video-view">
        <EmptyContentState
          type="video"
          title="Video Not Available"
          message="Video not available for this lesson."
        />
        <div className="content-meta-article">
          <h2 className="lesson-heading-title">{contentItem?.title || lesson?.title}</h2>
          {(contentItem?.description || lesson?.description) && (
            <p className="lesson-description-text">
              {contentItem?.description || lesson?.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="content-type-video-view" onKeyDown={handleKeyDown} tabIndex={0}>
      <div
        ref={containerRef}
        className="custom-video-player-wrapper video-player-container"
        onMouseMove={resetControlsTimeout}
        onMouseLeave={() => isPlaying && setIsControlsVisible(false)}
        onTouchStart={resetControlsTimeout}
      >
        {/* Native HTML5 Video Element with HLS or MP4 stream */}
        <video
          ref={activeVideoRef}
          className="custom-video-element workspace-video-element"
          onTimeUpdate={handleTimeUpdateInternal}
          onSeeking={handleSeekingInternal}
          onPlay={handlePlayInternal}
          onPause={handlePauseInternal}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={handleWaiting}
          onPlaying={handlePlaying}
          onError={handleVideoError}
          playsInline
          poster={posterUrl}
          onClick={togglePlayPause}
        />

        {/* Big Center Play Button Overlay when Paused */}
        {!isPlaying && !isLoading && !hasError && (
          <div className="video-center-overlay" onClick={togglePlayPause}>
            <button
              type="button"
              className="center-play-btn"
              aria-label="Play Video Lecture"
            >
              <Play size={32} fill="#ffffff" />
            </button>
          </div>
        )}

        {/* Buffering Spinner */}
        {isLoading && !hasError && (
          <div className="video-loading-overlay">
            <div className="video-spinner" />
            <span className="video-loading-text">
              {usingFallbackMp4 ? 'Loading MP4 stream...' : 'Loading video stream...'}
            </span>
          </div>
        )}

        {/* Error Message Overlay with Retry & Fallback Actions */}
        {hasError && (
          <div className="video-error-overlay">
            <AlertCircle className="video-error-icon" />
            <div className="video-error-title">Video Playback Failed</div>
            <div className="video-error-message">
              {errorMessage || 'The video stream could not be loaded or is currently processing.'}
            </div>
            <div className="video-error-actions">
              <button
                type="button"
                className="video-retry-btn"
                onClick={handleRetry}
                aria-label="Retry Playback"
              >
                <RotateCcw size={16} /> Retry Playback
              </button>
              {fallbackMp4Url && !usingFallbackMp4 && (
                <button
                  type="button"
                  className="video-fallback-btn"
                  onClick={() => {
                    setUsingFallbackMp4(true);
                    setHasError(false);
                    setIsLoading(true);
                  }}
                >
                  Switch to Direct MP4
                </button>
              )}
            </div>
          </div>
        )}

        {/* Custom Controls Bar */}
        <div
          className={`video-controls-bar ${
            !isControlsVisible && isPlaying ? 'controls-hidden' : ''
          }`}
        >
          {/* Interactive Progress / Scrubber Bar */}
          <div
            ref={scrubTrackRef}
            className="video-scrub-container"
            onMouseDown={handleScrubStart}
            onTouchStart={handleScrubStart}
            onMouseMove={handleScrubHover}
            onMouseLeave={() => setHoverTime(null)}
            role="slider"
            aria-label="Video scrubber"
            aria-valuemin={0}
            aria-valuemax={duration || 100}
            aria-valuenow={currentTime}
          >
            <div className="video-scrub-track">
              {/* Buffered fill */}
              <div
                className="video-buffer-fill"
                style={{ width: `${bufferedPercent}%` }}
              />
              {/* Watched portion indicator for uncompleted video */}
              {!isCompleted && maxWatchedPercent > 0 && (
                <div
                  className="video-watched-fill"
                  style={{ width: `${maxWatchedPercent}%` }}
                  title={`Watched up to ${formatTime(maxWatchedTime)}`}
                />
              )}
              {/* Played fill */}
              <div
                className="video-played-fill"
                style={{ width: `${playedPercent}%` }}
              />
              {/* Scrub handle thumb */}
              <div
                className="video-scrub-thumb"
                style={{ left: `${playedPercent}%` }}
              />
            </div>

            {/* Hover Timestamp Preview */}
            {hoverTime !== null && (
              <div
                className={`video-time-hover-tooltip ${
                  !isCompleted && hoverTime > (maxWatchedTimeRef.current || 0) + 0.5 ? 'is-locked' : ''
                }`}
                style={{ left: `${hoverPosition}%` }}
              >
                {!isCompleted && hoverTime > (maxWatchedTimeRef.current || 0) + 0.5 ? (
                  <span>🔒 {formatTime(hoverTime)} (Unwatched)</span>
                ) : (
                  <span>{formatTime(hoverTime)}</span>
                )}
              </div>
            )}
          </div>

          {/* Controls Row */}
          <div className="video-control-row">
            <div className="video-controls-left">
              {/* Play / Pause button */}
              <button
                type="button"
                className="video-control-btn"
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
              </button>

              {/* Volume & Mute */}
              <div className="video-volume-group">
                <button
                  type="button"
                  className="video-control-btn"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={20} />
                  ) : volume < 0.5 ? (
                    <Volume1 size={20} />
                  ) : (
                    <Volume2 size={20} />
                  )}
                </button>
                <div className="video-volume-slider-wrap">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="video-volume-slider"
                    aria-label="Volume slider"
                  />
                </div>
              </div>

              {/* Current Time / Duration */}
              <div className="video-time-display">
                <span>{formatTime(currentTime)}</span>
                <span> / </span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="video-controls-right">
              {/* Stream Provider Badge */}
              <div className="video-badge-pill" title={`Streaming via ${provider.toUpperCase()}`}>
                <Sparkles size={12} />
                <span>{usingFallbackMp4 ? '1080p MP4' : 'HD Adaptive'}</span>
              </div>

              {/* Playback Speed Menu */}
              <div className="video-speed-menu-wrap">
                <button
                  type="button"
                  className="video-control-btn speed-badge-btn"
                  onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                  aria-label="Playback Speed"
                >
                  {playbackSpeed === 1 ? '1x' : `${playbackSpeed}x`}
                </button>

                {isSpeedMenuOpen && (
                  <div className="video-speed-dropdown">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`speed-option-item ${playbackSpeed === s ? 'active' : ''}`}
                        onClick={() => handleSpeedSelect(s)}
                      >
                        <span>{s === 1 ? 'Normal (1x)' : `${s}x`}</span>
                        {playbackSpeed === s && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen Button */}
              <button
                type="button"
                className="video-control-btn"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lesson Details & Instructor Notes */}
      <div className="content-meta-article">
        <h2 className="lesson-heading-title">{contentItem?.title || lesson?.title}</h2>
        {(contentItem?.description || lesson?.description) && (
          <p className="lesson-description-text">
            {contentItem?.description || lesson?.description}
          </p>
        )}

        {/* Instructor Lesson Notes & Highlights */}
        {notesList.length > 0 && (
          <div className="lesson-attached-notes-box">
            <h3>Lesson Notes &amp; Highlights</h3>
            {notesList.map((note, nIdx) => (
              <div key={note._id || nIdx} className="note-card-inner">
                {note.title && <h4>{note.title}</h4>}
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownToHTML(
                      note.markdownContent || note.content || note.bodyMarkdown || ''
                    )
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoLesson;
