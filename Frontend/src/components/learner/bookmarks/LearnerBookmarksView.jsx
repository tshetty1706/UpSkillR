import React, { useState, useEffect, useCallback } from 'react';
import {
  Bookmark,
  ExternalLink,
  Trash2,
  Sparkles,
  Video,
  FileText,
  BookOpen,
  Layers,
  Filter
} from 'lucide-react';
import { CourseThumbnail } from '../../common/CourseThumbnail';
import { useToast } from '../../../context/ToastContext';
import { API_BASE } from '../../../config/api';
import './LearnerBookmarksView.css';

export const LearnerBookmarksView = ({ onNavigate, onExploreCourses }) => {
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'course' | 'lesson' | 'video' | 'note'

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/learners/me/bookmarks`, {
        headers,
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.bookmarks)) {
        setBookmarks(data.bookmarks);
      } else {
        // Fallback: check localStorage for any client-side saved bookmarks
        try {
          const cached = localStorage.getItem('upskillr_bookmarks_local');
          if (cached) setBookmarks(JSON.parse(cached));
        } catch (e) {}
      }
    } catch (err) {
      console.error('Failed to load bookmarks', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handleRemoveBookmark = async (bookmark) => {
    const bookmarkId = bookmark._id;
    // Optimistic remove
    setBookmarks((prev) => prev.filter((b) => b._id !== bookmarkId));
    toast.info(`Removed "${bookmark.title}" from bookmarks.`);

    try {
      const token = sessionStorage.getItem('upskillr_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`${API_BASE}/learners/me/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
    } catch (err) {
      console.error('Error removing bookmark:', err);
    }
  };

  const handleOpenResource = (bookmark) => {
    const courseId = typeof bookmark.courseId === 'object' ? bookmark.courseId?._id : bookmark.courseId;
    let targetUrl = bookmark.url || `/courses/${courseId}`;
    if (!targetUrl.startsWith('/')) {
      targetUrl = `/${targetUrl}`;
    }

    if (onNavigate) {
      onNavigate(targetUrl);
    } else {
      window.history.pushState({}, '', targetUrl);
      window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: targetUrl } }));
    }
  };

  const filteredBookmarks = bookmarks.filter((b) => {
    if (filterType === 'all') return true;
    return (b.resourceType || 'course').toLowerCase() === filterType.toLowerCase();
  });

  const getResourceIcon = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'video':
        return <Video size={14} />;
      case 'note':
        return <FileText size={14} />;
      case 'lesson':
        return <Layers size={14} />;
      case 'course':
      default:
        return <BookOpen size={14} />;
    }
  };

  return (
    <div className="learner-bookmarks-page">
      <div className="bookmarks-header-row">
        <div>
          <h1 className="bookmarks-page-title">Bookmarks</h1>
          <p className="bookmarks-page-subtitle">
            Saved lessons, notes, videos, and courses for fast access.
          </p>
        </div>

        {/* Filter Chips */}
        {bookmarks.length > 0 && (
          <div className="bookmarks-filter-chips" role="tablist">
            <button
              type="button"
              className={`filter-chip ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({bookmarks.length})
            </button>
            <button
              type="button"
              className={`filter-chip ${filterType === 'course' ? 'active' : ''}`}
              onClick={() => setFilterType('course')}
            >
              Courses
            </button>
            <button
              type="button"
              className={`filter-chip ${filterType === 'lesson' ? 'active' : ''}`}
              onClick={() => setFilterType('lesson')}
            >
              Lessons
            </button>
            <button
              type="button"
              className={`filter-chip ${filterType === 'video' ? 'active' : ''}`}
              onClick={() => setFilterType('video')}
            >
              Videos
            </button>
            <button
              type="button"
              className={`filter-chip ${filterType === 'note' ? 'active' : ''}`}
              onClick={() => setFilterType('note')}
            >
              Notes
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bookmarks-loading">Loading bookmarks...</div>
      ) : bookmarks.length === 0 ? (
        <div className="bookmarks-empty-card">
          <div className="empty-icon-circle">
            <Bookmark size={32} />
          </div>
          <h2 className="empty-title">No Bookmarked Learning Resources Yet</h2>
          <p className="empty-desc">
            Bookmark interesting courses, lessons, notes, and videos to revisit them anytime.
          </p>
          {onExploreCourses && (
            <button
              type="button"
              className="btn btn-primary btn-explore-cta"
              onClick={onExploreCourses}
            >
              <Sparkles size={16} />
              <span>Explore Courses</span>
            </button>
          )}
        </div>
      ) : filteredBookmarks.length === 0 ? (
        <div className="bookmarks-empty-card">
          <p className="empty-title">No bookmarks matching "{filterType}".</p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setFilterType('all')}
          >
            Show All Bookmarks
          </button>
        </div>
      ) : (
        <div className="bookmarks-grid">
          {filteredBookmarks.map((bookmark) => {
            const resType = bookmark.resourceType || 'course';
            const courseTitle = bookmark.courseTitle || (typeof bookmark.courseId === 'object' ? bookmark.courseId?.title : 'Course');

            return (
              <div key={bookmark._id} className="bookmark-card">
                {/* Thumbnail */}
                <div
                  className="bookmark-thumb-wrap"
                  onClick={() => handleOpenResource(bookmark)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleOpenResource(bookmark);
                  }}
                  aria-label={`Open ${bookmark.title}`}
                >
                  <CourseThumbnail
                    src={bookmark.courseThumbnail}
                    alt={bookmark.title}
                    className="bookmark-thumb"
                  />
                  <span className="bookmark-type-pill">
                    {getResourceIcon(resType)}
                    <span>{resType}</span>
                  </span>
                </div>

                {/* Content */}
                <div className="bookmark-content">
                  <span className="bookmark-course-name" title={courseTitle}>
                    {courseTitle}
                  </span>

                  <h3
                    className="bookmark-title"
                    title={bookmark.title}
                    onClick={() => handleOpenResource(bookmark)}
                  >
                    {bookmark.title}
                  </h3>

                  {/* Actions */}
                  <div className="bookmark-actions-row">
                    <button
                      type="button"
                      className="btn-open-resource"
                      onClick={() => handleOpenResource(bookmark)}
                      aria-label={`Open ${bookmark.title}`}
                    >
                      <span>Open</span>
                      <ExternalLink size={14} />
                    </button>

                    <button
                      type="button"
                      className="btn-remove-bookmark"
                      onClick={() => handleRemoveBookmark(bookmark)}
                      aria-label={`Remove bookmark for ${bookmark.title}`}
                      title="Remove bookmark"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LearnerBookmarksView;

