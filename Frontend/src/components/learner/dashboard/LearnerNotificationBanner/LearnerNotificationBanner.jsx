import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Layers,
  Video,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { API_BASE } from '../../../../config/api';
import './LearnerNotificationBanner.css';

export const LearnerNotificationBanner = ({ onGoToCourse }) => {
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchUnread = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/learners/me/notifications`, {
        headers,
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        // Filter only unread
        const unread = data.notifications.filter((n) => !n.isRead);
        setUnreadNotifications(unread);
      }
    } catch (err) {
      console.error('Failed to fetch unread notifications for banner:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnread();

    const interval = setInterval(fetchUnread, 30000);

    const handleRefresh = () => fetchUnread();
    window.addEventListener('upskillr_notifications_refresh', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('upskillr_notifications_refresh', handleRefresh);
    };
  }, [fetchUnread]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const token = sessionStorage.getItem('upskillr_token');

      // Optimistic update
      setUnreadNotifications((prev) => prev.filter((n) => n._id !== id));

      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`${API_BASE}/learners/me/notifications/${id}/read`, {
        method: 'PATCH',
        headers,
        credentials: 'include'
      });

      // Synchronize with bell and other components
      window.dispatchEvent(new CustomEvent('upskillr_notifications_refresh'));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    if (e) e.stopPropagation();
    try {
      const token = sessionStorage.getItem('upskillr_token');

      // Optimistic update
      setUnreadNotifications([]);

      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`${API_BASE}/learners/me/notifications/read-all`, {
        method: 'PATCH',
        headers,
        credentials: 'include'
      });

      // Synchronize with bell and other components
      window.dispatchEvent(new CustomEvent('upskillr_notifications_refresh'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // If there are no unread notifications, hide banner completely
  if (!unreadNotifications || unreadNotifications.length === 0) {
    return null;
  }

  const primaryNotif = unreadNotifications[0];
  const isModule = primaryNotif.type === 'NEW_MODULE';
  const remainingCount = unreadNotifications.length - 1;

  return (
    <aside className="learner-notification-persistent-banner" aria-label="Course Updates Alert">
      <div className="banner-main-row">
        {/* Left: Icon & Badge */}
        <div className="banner-icon-container">
          <div className="banner-bell-badge">
            <Bell size={18} className="banner-bell-icon" />
            <span className="banner-pulse-dot" />
          </div>
        </div>

        {/* Center: Message Content */}
        <div className="banner-body">
          <div className="banner-headline">
            <span className="banner-tag">
              {isModule ? 'New Module Uploaded' : 'New Lesson Uploaded'}
            </span>
            <span className="banner-course-name">{primaryNotif.courseTitle}</span>
          </div>

          <p className="banner-description">
            {isModule ? (
              <>
                New module added: <strong>{primaryNotif.moduleTitle || 'New Module'}</strong>
              </>
            ) : (
              <>
                New lesson uploaded: <strong>{primaryNotif.lessonTitle || 'New Lesson'}</strong>
                {primaryNotif.moduleTitle ? ` in ${primaryNotif.moduleTitle}` : ''}
              </>
            )}
          </p>

          {remainingCount > 0 && (
            <div className="banner-extra-hint">
              <span>+{remainingCount} more unread course update{remainingCount > 1 ? 's' : ''}</span>
              <button
                type="button"
                className="banner-expand-btn"
                onClick={() => setIsExpanded((prev) => !prev)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <>
                    <span>Hide updates</span>
                    <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    <span>View all updates</span>
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="banner-actions">
          <button
            type="button"
            className="banner-action-btn mark-read-btn"
            onClick={(e) => handleMarkAsRead(primaryNotif._id, e)}
            title="Mark as read to dismiss"
          >
            <Check size={14} />
            <span>Mark as read</span>
          </button>

          {remainingCount > 0 && (
            <button
              type="button"
              className="banner-action-btn mark-all-read-btn"
              onClick={handleMarkAllAsRead}
              title="Mark all notifications as read"
            >
              <CheckCheck size={14} />
              <span>Mark all read</span>
            </button>
          )}

          {onGoToCourse && (
            <button
              type="button"
              className="banner-action-btn view-course-btn"
              onClick={() => onGoToCourse(primaryNotif.courseId)}
              title="Go to Course"
            >
              <span>View Course</span>
              <ExternalLink size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Tray for Remaining Unread Notifications */}
      {isExpanded && remainingCount > 0 && (
        <div className="banner-expanded-tray">
          <div className="expanded-tray-header">
            <span className="tray-title">All Unread Course Updates</span>
            <button
              type="button"
              className="tray-mark-all-btn"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck size={13} />
              <span>Mark all as read</span>
            </button>
          </div>

          <ul className="expanded-notif-list">
            {unreadNotifications.map((notif) => {
              const itemIsModule = notif.type === 'NEW_MODULE';
              return (
                <li key={notif._id} className="expanded-notif-item">
                  <div className={`expanded-item-icon ${itemIsModule ? 'module' : 'lesson'}`}>
                    {itemIsModule ? <Layers size={14} /> : <Video size={14} />}
                  </div>
                  <div className="expanded-item-info">
                    <span className="expanded-item-course">{notif.courseTitle}</span>
                    <span className="expanded-item-title">
                      {itemIsModule
                        ? notif.moduleTitle || 'New Module'
                        : notif.lessonTitle || 'New Lesson'}
                    </span>
                  </div>
                  <div className="expanded-item-actions">
                    <button
                      type="button"
                      className="expanded-item-read-btn"
                      onClick={(e) => handleMarkAsRead(notif._id, e)}
                      title="Mark as read"
                    >
                      <Check size={12} />
                      <span>Mark read</span>
                    </button>
                    {onGoToCourse && (
                      <button
                        type="button"
                        className="expanded-item-go-btn"
                        onClick={() => onGoToCourse(notif.courseId)}
                      >
                        <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
};
