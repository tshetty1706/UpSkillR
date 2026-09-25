import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bell,
  BookOpen,
  Layers,
  Video,
  CheckCheck,
  Check,
  ExternalLink,
  Clock,
  Sparkles
} from 'lucide-react';
import { API_BASE } from '../../../config/api';
import './NotificationBell.css';

/**
 * Format timestamp into friendly relative time
 */
const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Recently';
  const now = new Date();
  const past = new Date(dateString);
  const diffInSec = Math.floor((now - past) / 1000);

  if (diffInSec < 60) return 'Just now';
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m ago`;
  const diffInHrs = Math.floor(diffInMin / 60);
  if (diffInHrs < 24) return `${diffInHrs}h ago`;
  const diffInDays = Math.floor(diffInHrs / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const NotificationBell = ({ onNavigateToCourse }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/learners/me/notifications`, {
        headers,
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Auto-poll every 30 seconds for live updates
    const interval = setInterval(fetchNotifications, 30000);

    // Synchronize across components
    const handleRefresh = () => fetchNotifications();
    window.addEventListener('upskillr_notifications_refresh', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('upskillr_notifications_refresh', handleRefresh);
    };
  }, [fetchNotifications]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const token = sessionStorage.getItem('upskillr_token');

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/learners/me/notifications/${id}/read`, {
        method: 'PATCH',
        headers,
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.unreadCount);
        window.dispatchEvent(new CustomEvent('upskillr_notifications_refresh'));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const token = sessionStorage.getItem('upskillr_token');

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);

      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/learners/me/notifications/read-all`, {
        method: 'PATCH',
        headers,
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        window.dispatchEvent(new CustomEvent('upskillr_notifications_refresh'));
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif._id);
    }
    setIsOpen(false);
    if (onNavigateToCourse) {
      onNavigateToCourse(notif.courseId);
    } else {
      // Navigate to explore/course overview
      window.history.pushState({}, '', `/explore`);
      window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/explore' } }));
    }
  };

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`notification-bell-btn ${isOpen ? 'active' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
      >
        <Bell size={19} className="bell-svg-icon" />
        {unreadCount > 0 && (
          <span className="notification-unread-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown-menu" role="dialog" aria-label="Notifications Panel">
          <div className="notification-header">
            <div className="notification-header-title">
              <span className="title-text">Notifications</span>
              {unreadCount > 0 ? (
                <span className="notification-pill-badge">{unreadCount} new</span>
              ) : (
                <span className="notification-pill-badge-zero">All read</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="mark-all-read-btn"
                onClick={handleMarkAllAsRead}
                title="Mark all notifications as read"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="notification-list-container">
            {notifications.length === 0 ? (
              <div className="notification-empty-state">
                <div className="empty-bell-icon">
                  <Sparkles size={28} />
                </div>
                <p className="empty-title">All caught up!</p>
                <p className="empty-desc">
                  When instructors upload new modules or lessons to courses, you'll see your alerts right here.
                </p>
              </div>
            ) : (
              <ul className="notification-list">
                {notifications.map((notif) => {
                  const isModule = notif.type === 'NEW_MODULE';
                  return (
                    <li
                      key={notif._id}
                      className={`notification-item ${!notif.isRead ? 'unread' : 'read'}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <div className="notif-indicator-column">
                        {!notif.isRead && <span className="unread-dot" title="Unread" />}
                      </div>

                      <div className={`notif-icon-box ${isModule ? 'module-box' : 'lesson-box'}`}>
                        {isModule ? <Layers size={17} /> : <Video size={17} />}
                      </div>

                      <div className="notif-content-column">
                        <div className="notif-meta-row">
                          <span className={`notif-type-tag ${isModule ? 'tag-module' : 'tag-lesson'}`}>
                            {isModule ? 'New Module' : 'New Lesson'}
                          </span>
                          <span className="notif-time-ago">
                            <Clock size={11} />
                            {formatTimeAgo(notif.createdAt)}
                          </span>
                        </div>

                        <p className="notif-course-title">{notif.courseTitle}</p>
                        <p className="notif-detail-text">
                          {notif.moduleTitle && isModule && (
                            <strong>{notif.moduleTitle}</strong>
                          )}
                          {notif.lessonTitle && !isModule && (
                            <strong>{notif.lessonTitle}</strong>
                          )}
                          {!notif.moduleTitle && !notif.lessonTitle && notif.message}
                        </p>

                        <div className="notif-action-row">
                          {!notif.isRead && (
                            <button
                              type="button"
                              className="notif-mark-read-btn"
                              onClick={(e) => handleMarkAsRead(notif._id, e)}
                              title="Mark as read"
                            >
                              <Check size={12} />
                              <span>Mark read</span>
                            </button>
                          )}
                          <span className="notif-view-course-link">
                            <span>Open</span>
                            <ExternalLink size={11} />
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
