import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  PlayCircle,
  Award,
  HelpCircle,
  RotateCcw,
  GraduationCap,
  Bookmark,
  FileText,
  Sparkles,
  Flame,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  AlertCircle,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { API_BASE } from '../../../../config/api';
import './RecentLearningActivity.css';

/**
 * Format timestamp into user-friendly localized date & relative time
 */
const formatActivityDate = (dateInput) => {
  if (!dateInput) return { fullDate: '', timeAgo: '' };
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return { fullDate: '', timeAgo: '' };

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let timeAgo = '';
  if (diffSecs < 60) {
    timeAgo = 'Just now';
  } else if (diffMins < 60) {
    timeAgo = `${diffMins}m ago`;
  } else if (diffHours < 24) {
    timeAgo = `${diffHours}h ago`;
  } else if (diffDays === 1) {
    timeAgo = 'Yesterday';
  } else if (diffDays < 7) {
    timeAgo = `${diffDays}d ago`;
  } else {
    timeAgo = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const fullDate = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return { fullDate, timeAgo };
};

/**
 * Helper to get activity icon, color theme, and default label
 */
const getActivityMeta = (type) => {
  switch (type) {
    case 'course_enrolled':
      return {
        icon: <BookOpen size={18} />,
        badgeClass: 'badge-enrolled',
        tag: 'Enrollment'
      };
    case 'lesson_completed':
      return {
        icon: <CheckCircle2 size={18} />,
        badgeClass: 'badge-lesson',
        tag: 'Lesson'
      };
    case 'video_completed':
      return {
        icon: <PlayCircle size={18} />,
        badgeClass: 'badge-video',
        tag: 'Video'
      };
    case 'module_completed':
      return {
        icon: <Award size={18} />,
        badgeClass: 'badge-module',
        tag: 'Module'
      };
    case 'quiz_attempted':
      return {
        icon: <HelpCircle size={18} />,
        badgeClass: 'badge-quiz',
        tag: 'Quiz'
      };
    case 'quiz_retaken':
      return {
        icon: <RotateCcw size={18} />,
        badgeClass: 'badge-retake',
        tag: 'Retake'
      };
    case 'course_completed':
      return {
        icon: <GraduationCap size={18} />,
        badgeClass: 'badge-course-completed',
        tag: 'Course Done'
      };
    case 'certificate_earned':
      return {
        icon: <Award size={18} />,
        badgeClass: 'badge-certificate',
        tag: 'Certificate'
      };
    case 'bookmark_added':
      return {
        icon: <Bookmark size={18} />,
        badgeClass: 'badge-bookmark',
        tag: 'Bookmark'
      };
    case 'note_created':
      return {
        icon: <FileText size={18} />,
        badgeClass: 'badge-note',
        tag: 'Notes'
      };
    case 'daily_login':
      return {
        icon: <Flame size={18} />,
        badgeClass: 'badge-login',
        tag: 'Streak'
      };
    case 'points_earned':
    default:
      return {
        icon: <Sparkles size={18} />,
        badgeClass: 'badge-points',
        tag: 'Reward'
      };
  }
};

/**
 * RecentLearningActivity Component
 * Reusable server-side paginated activity timeline
 */
export const RecentLearningActivity = ({
  onNavigateToCourse,
  initialPageSize = 5
}) => {
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: initialPageSize,
    totalActivities: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch activities from server with pagination
  const fetchActivities = useCallback(async (pageNumber = 1) => {
    setLoading(true);
    setError(null);

    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/learners/me/recent-activities?page=${pageNumber}&limit=${initialPageSize}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.activities)) {
        setActivities(data.activities);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        throw new Error(data.message || 'Failed to load activities');
      }
    } catch (err) {
      console.error('Error fetching recent activities:', err);
      setError('Unable to load learning activities. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [initialPageSize]);

  useEffect(() => {
    fetchActivities(1);
  }, [fetchActivities]);

  // Listen for points or learning updates to refresh the current page
  useEffect(() => {
    const handleRefresh = () => {
      fetchActivities(pagination.currentPage || 1);
    };
    window.addEventListener('upskillr_points_updated', handleRefresh);
    return () => window.removeEventListener('upskillr_points_updated', handleRefresh);
  }, [fetchActivities, pagination.currentPage]);

  // Navigation handlers
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.currentPage || loading) {
      return;
    }
    fetchActivities(newPage);
  };

  // Compute pagination range with ellipsis support
  const paginationRange = useMemo(() => {
    const total = pagination.totalPages;
    const current = pagination.currentPage;
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 3) {
      return [1, 2, 3, 4, '...', total];
    }
    if (current >= total - 2) {
      return [1, '...', total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  }, [pagination.totalPages, pagination.currentPage]);

  // Range summary numbers (e.g. 1-5 of 23)
  const rangeStart = pagination.totalActivities === 0 ? 0 : (pagination.currentPage - 1) * pagination.pageSize + 1;
  const rangeEnd = Math.min(pagination.currentPage * pagination.pageSize, pagination.totalActivities);

  return (
    <section className="dashboard-activity-section" aria-label="Recent Learning Activity">
      <div className="activity-section-header">
        <div className="activity-header-title-wrap">
          <div className="activity-header-icon-box">
            <Activity size={20} className="text-emerald" />
          </div>
          <div>
            <h2 className="activity-section-title">Recent Learning Activity</h2>
            <p className="activity-section-subtitle">
              Your real-time progress, milestones, quiz attempts, and daily streak records
            </p>
          </div>
        </div>

        {pagination.totalActivities > 0 && !loading && (
          <div className="activity-count-badge" title="Total recorded activities">
            <span>{pagination.totalActivities} {pagination.totalActivities === 1 ? 'Activity' : 'Activities'}</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="activity-timeline-card">
        {loading ? (
          /* Loading Skeleton */
          <div className="activity-skeleton-list" aria-busy="true">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="activity-skeleton-row">
                <div className="activity-skl-circle" />
                <div className="activity-skl-body">
                  <div className="activity-skl-line title" />
                  <div className="activity-skl-line desc" />
                  <div className="activity-skl-line meta" />
                </div>
                <div className="activity-skl-pill" />
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="activity-state-empty activity-state-error">
            <AlertCircle size={36} className="state-icon error-icon" />
            <h3 className="state-title">Could not load activities</h3>
            <p className="state-desc">{error}</p>
            <button
              type="button"
              className="btn-activity-retry"
              onClick={() => fetchActivities(pagination.currentPage)}
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        ) : activities.length === 0 ? (
          /* Empty State */
          <div className="activity-state-empty">
            <Activity size={40} className="state-icon empty-icon" />
            <h3 className="state-title">No Recent Activity Yet</h3>
            <p className="state-desc">
              Your learning journey begins here! Start lessons, take quizzes, or bookmark topics to see your activity timeline.
            </p>
          </div>
        ) : (
          /* Chronological Activity List */
          <div className="activity-items-list" role="feed" aria-label="Recent learning activities list">
            {activities.map((act) => {
              const meta = getActivityMeta(act.activityType);
              const { fullDate, timeAgo } = formatActivityDate(act.createdAt);

              return (
                <article key={act._id} className="activity-item-row" tabIndex={0}>
                  {/* Left: Type Icon Badge */}
                  <div className={`activity-icon-badge ${meta.badgeClass}`} title={meta.tag}>
                    {meta.icon}
                  </div>

                  {/* Center: Main Activity Content */}
                  <div className="activity-content-col">
                    <div className="activity-title-row">
                      <h4 className="activity-row-title">{act.title}</h4>
                      <span className={`activity-type-tag ${meta.badgeClass}`}>{meta.tag}</span>
                    </div>

                    <p className="activity-row-desc">{act.description}</p>

                    {/* Context Meta: Course, Module / Lesson, Date */}
                    <div className="activity-meta-row">
                      {act.courseTitle && (
                        <div
                          className={`activity-course-pill ${act.courseId && onNavigateToCourse ? 'clickable' : ''}`}
                          onClick={() => {
                            if (act.courseId && onNavigateToCourse) {
                              onNavigateToCourse(act.courseId);
                            }
                          }}
                          role={act.courseId && onNavigateToCourse ? 'button' : undefined}
                          tabIndex={act.courseId && onNavigateToCourse ? 0 : undefined}
                          title={act.courseTitle}
                        >
                          <BookOpen size={12} />
                          <span className="course-name-text">{act.courseTitle}</span>
                          {act.courseId && onNavigateToCourse && <ArrowUpRight size={12} className="pill-arrow" />}
                        </div>
                      )}

                      {(act.moduleTitle || act.lessonTitle) && (
                        <span className="activity-lesson-context">
                          {act.moduleTitle && <span>{act.moduleTitle}</span>}
                          {act.moduleTitle && act.lessonTitle && <span> • </span>}
                          {act.lessonTitle && <span>{act.lessonTitle}</span>}
                        </span>
                      )}

                      <span className="activity-timestamp" title={fullDate}>
                        <Clock size={12} />
                        <span>{timeAgo || fullDate}</span>
                      </span>
                    </div>
                  </div>

                  {/* Right: Points Badge if applicable */}
                  {act.points > 0 && (
                    <div className="activity-points-col">
                      <span className="activity-points-pill" title={`Earned +${act.points} points`}>
                        <Sparkles size={12} />
                        <span>+{act.points} pts</span>
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {!loading && !error && pagination.totalActivities > 0 && (
          <footer className="activity-pagination-footer" aria-label="Activity pagination controls">
            <div className="pagination-range-summary">
              Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{pagination.totalActivities}</strong> activities
            </div>

            <div className="pagination-controls-group">
              {/* Previous Button */}
              <button
                type="button"
                className="btn-pagination-nav btn-prev"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPreviousPage || loading}
                aria-label="Previous Page of Activities"
              >
                <ChevronLeft size={16} />
                <span>Previous</span>
              </button>

              {/* Page Number Buttons */}
              <div className="pagination-numbers-wrap" role="navigation" aria-label="Pagination pages">
                {paginationRange.map((pageItem, idx) => {
                  if (pageItem === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="pagination-ellipsis" aria-hidden="true">
                        ...
                      </span>
                    );
                  }

                  const isCurrent = pageItem === pagination.currentPage;
                  return (
                    <button
                      key={pageItem}
                      type="button"
                      className={`btn-pagination-page ${isCurrent ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageItem)}
                      disabled={loading || isCurrent}
                      aria-current={isCurrent ? 'page' : undefined}
                      aria-label={`Go to page ${pageItem}`}
                    >
                      {pageItem}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                type="button"
                className="btn-pagination-nav btn-next"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage || loading}
                aria-label="Next Page of Activities"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </div>
    </section>
  );
};

export default RecentLearningActivity;
