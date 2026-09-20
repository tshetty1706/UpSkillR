import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Send,
  Save,
  Trash2,
  Edit3,
  Eye,
  X,
  Clock,
  CheckCircle2,
  Lock,
  Globe,
  Users,
  AlertTriangle,
  FileText,
  Filter,
  Check
} from 'lucide-react';
import './CourseAnnouncements.css';
import { useToast } from '../../../../../context/ToastContext';

const API_BASE = 'http://localhost:5000/api';

export const CourseAnnouncements = ({ courseId, course = null, user = null }) => {
  const { toast } = useToast();

  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({
    totalLearners: 0,
    currentLearners: 0,
    completedLearners: 0
  });
  const [loading, setLoading] = useState(true);

  // 'list' | 'create' | 'edit'
  const [mode, setMode] = useState('list');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'published' | 'draft'

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    message: '',
    targetAudience: 'all',
    status: 'draft'
  });
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [viewingItem, setViewingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchAnnouncements();
    }
  }, [courseId]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(`${API_BASE}/courses/${courseId}/announcements`, {
        headers: authHeader
      });
      const data = await res.json();

      if (data.success) {
        setAnnouncements(data.announcements || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        toast.error(data.message || 'Failed to fetch course announcements.');
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
      toast.error('Network error loading course announcements.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      message: '',
      targetAudience: 'all',
      status: 'draft'
    });
    setEditingId(null);
    setMode('list');
  };

  const handleStartCreate = () => {
    resetForm();
    setMode('create');
  };

  const handleStartEdit = (announcement) => {
    setEditingId(announcement._id);
    setForm({
      title: announcement.title || '',
      message: announcement.message || '',
      targetAudience: announcement.targetAudience || 'all',
      status: announcement.status || 'draft'
    });
    setMode('edit');
  };

  const handleSubmit = async (submitStatus) => {
    if (!form.title.trim()) {
      toast.error('Please enter an announcement title.');
      return;
    }
    if (!form.message.trim()) {
      toast.error('Please write an announcement message.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const authHeader = token
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        : { 'Content-Type': 'application/json' };

      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        targetAudience: form.targetAudience,
        status: submitStatus
      };

      const url =
        mode === 'edit' && editingId
          ? `${API_BASE}/courses/${courseId}/announcements/${editingId}`
          : `${API_BASE}/courses/${courseId}/announcements`;

      const method = mode === 'edit' && editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeader,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        toast.success(
          data.message ||
            (submitStatus === 'published'
              ? 'Announcement published successfully!'
              : 'Announcement saved as draft.')
        );

        if (mode === 'edit') {
          setAnnouncements((prev) =>
            prev.map((item) => (item._id === editingId ? data.announcement : item))
          );
        } else {
          setAnnouncements((prev) => [data.announcement, ...prev]);
        }
        resetForm();
      } else {
        toast.error(data.message || 'Failed to save announcement.');
      }
    } catch (err) {
      console.error('Error saving announcement:', err);
      toast.error('Network error saving announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (announcement) => {
    try {
      const token = localStorage.getItem('upskillr_token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(
        `${API_BASE}/courses/${courseId}/announcements/${announcement._id}/publish`,
        {
          method: 'PATCH',
          headers: authHeader
        }
      );
      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        setAnnouncements((prev) =>
          prev.map((item) => (item._id === announcement._id ? data.announcement : item))
        );
        if (viewingItem && viewingItem._id === announcement._id) {
          setViewingItem(data.announcement);
        }
      } else {
        toast.error(data.message || 'Failed to toggle publication status.');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
      toast.error('Network error toggling status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch(
        `${API_BASE}/courses/${courseId}/announcements/${deletingItem._id}`,
        {
          method: 'DELETE',
          headers: authHeader
        }
      );
      const data = await res.json();

      if (data.success) {
        toast.success('Announcement deleted successfully.');
        setAnnouncements((prev) => prev.filter((item) => item._id !== deletingItem._id));
        setDeletingItem(null);
      } else {
        toast.error(data.message || 'Failed to delete announcement.');
      }
    } catch (err) {
      console.error('Error deleting announcement:', err);
      toast.error('Network error deleting announcement.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAnnouncements = announcements.filter((item) => {
    if (filterStatus === 'published') return item.status === 'published';
    if (filterStatus === 'draft') return item.status === 'draft';
    return true;
  });

  const getAudienceLabel = (audienceKey) => {
    switch (audienceKey) {
      case 'current':
        return 'Current Learners';
      case 'completed':
        return 'Completed Learners';
      default:
        return 'All Learners';
    }
  };

  const getAudienceCount = (audienceKey) => {
    switch (audienceKey) {
      case 'current':
        return stats.currentLearners;
      case 'completed':
        return stats.completedLearners;
      default:
        return stats.totalLearners;
    }
  };

  if (loading) {
    return (
      <div className="announcements-loading-box">
        <div className="announcements-spinner" />
        <p>Loading course announcements...</p>
      </div>
    );
  }

  return (
    <div className="course-announcements-container">
      {/* ═══ SECTION HEADER / TOOLBAR ═══ */}
      <div className="announcements-toolbar-row">
        <div className="toolbar-info-col">
          <div className="title-with-bell">
            <Bell size={22} className="accent-green" />
            <h2 className="announcements-heading">Course Announcements</h2>
          </div>
          <p className="announcements-subtext">
            Create, view, and deliver targeted updates, reminders, and notices to your learners.
          </p>
        </div>

        {mode === 'list' && (
          <button
            type="button"
            className="btn-create-announcement"
            onClick={handleStartCreate}
          >
            <Plus size={16} />
            <span>Create Announcement</span>
          </button>
        )}
      </div>

      {/* ═══ AUDIENCE METRICS BANNER ═══ */}
      {mode === 'list' && (
        <div className="announcements-audience-metrics-bar">
          <div className="metric-pill">
            <Users size={14} className="metric-icon" />
            <span>Total Enrolled Learners: <strong>{stats.totalLearners}</strong></span>
          </div>
          <div className="metric-pill">
            <Clock size={14} className="metric-icon" />
            <span>Active Learning: <strong>{stats.currentLearners}</strong></span>
          </div>
          <div className="metric-pill">
            <CheckCircle2 size={14} className="metric-icon" />
            <span>Completed: <strong>{stats.completedLearners}</strong></span>
          </div>
        </div>
      )}

      {/* ═══ CREATE / EDIT FORM MODE ═══ */}
      {(mode === 'create' || mode === 'edit') && (
        <div className="announcement-form-card">
          <div className="form-card-header">
            <div>
              <h3 className="form-title">
                {mode === 'edit' ? 'Edit Course Announcement' : 'Create New Announcement'}
              </h3>
              <p className="form-subtitle">
                Draft a clear message and select which learners should receive this update.
              </p>
            </div>
            <button
              type="button"
              className="btn-form-cancel-icon"
              onClick={resetForm}
              title="Cancel"
            >
              <X size={18} />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(form.status || 'published');
            }}
            className="announcement-inputs-form"
          >
            {/* Title */}
            <div className="form-group">
              <div className="label-row">
                <label className="form-label" htmlFor="announcement-title">
                  Announcement Title <span className="required-star">*</span>
                </label>
                <span className="char-count">{form.title.length}/200</span>
              </div>
              <input
                id="announcement-title"
                type="text"
                className="form-input"
                maxLength={200}
                placeholder="e.g. Midterm Project Guidelines & Due Date Reminder"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>

            {/* Message */}
            <div className="form-group">
              <div className="label-row">
                <label className="form-label" htmlFor="announcement-message">
                  Announcement Message <span className="required-star">*</span>
                </label>
                <span className="char-count">{form.message.length}/5000</span>
              </div>
              <textarea
                id="announcement-message"
                rows={6}
                maxLength={5000}
                className="form-textarea workspace-no-resize"
                placeholder="Write your announcement message clearly here. Provide context, deadlines, or resource links for your learners..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
              />
            </div>

            {/* Recipient Audience Selector */}
            <div className="form-group">
              <label className="form-label">
                Recipient Audience <span className="required-star">*</span>
              </label>

              <div className="audience-selector-grid">
                {/* Option 1: Current Learners */}
                <label
                  className={`audience-option-card ${form.targetAudience === 'current' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="targetAudience"
                    value="current"
                    checked={form.targetAudience === 'current'}
                    onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  />
                  <div className="card-indicator">
                    {form.targetAudience === 'current' && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div className="option-text">
                    <span className="option-title">Current Learners</span>
                    <span className="option-count">
                      (~{stats.currentLearners} active {stats.currentLearners === 1 ? 'learner' : 'learners'})
                    </span>
                  </div>
                </label>

                {/* Option 2: Completed Learners */}
                <label
                  className={`audience-option-card ${form.targetAudience === 'completed' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="targetAudience"
                    value="completed"
                    checked={form.targetAudience === 'completed'}
                    onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  />
                  <div className="card-indicator">
                    {form.targetAudience === 'completed' && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div className="option-text">
                    <span className="option-title">Completed Learners</span>
                    <span className="option-count">
                      (~{stats.completedLearners} completed {stats.completedLearners === 1 ? 'learner' : 'learners'})
                    </span>
                  </div>
                </label>

                {/* Option 3: All Learners */}
                <label
                  className={`audience-option-card ${form.targetAudience === 'all' ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="targetAudience"
                    value="all"
                    checked={form.targetAudience === 'all'}
                    onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  />
                  <div className="card-indicator">
                    {form.targetAudience === 'all' && <Check size={14} strokeWidth={3} />}
                  </div>
                  <div className="option-text">
                    <span className="option-title">All Learners</span>
                    <span className="option-count">
                      (~{stats.totalLearners} total {stats.totalLearners === 1 ? 'learner' : 'learners'})
                    </span>
                  </div>
                </label>
              </div>

              {/* Concise Explanation Box below audience selector */}
              <div className="audience-explanation-box">
                <span className="explanation-title">Audience Delivery Rules:</span>
                <ul className="explanation-bullets">
                  <li>
                    <strong>Current Learners</strong> → learners currently enrolled in the course
                  </li>
                  <li>
                    <strong>Completed Learners</strong> → learners who have completed the course
                  </li>
                  <li>
                    <strong>All Learners</strong> → both current and completed learners
                  </li>
                </ul>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="form-actions-row">
              <button
                type="button"
                className="btn-cancel-action"
                disabled={submitting}
                onClick={resetForm}
              >
                <span>Cancel</span>
              </button>

              <div className="form-right-actions">
                <button
                  type="button"
                  className="btn-save-draft"
                  disabled={submitting}
                  onClick={() => handleSubmit('draft')}
                >
                  <Save size={16} />
                  <span>Save as Draft</span>
                </button>

                <button
                  type="button"
                  className="btn-publish-action"
                  disabled={submitting}
                  onClick={() => handleSubmit('published')}
                >
                  {submitting ? (
                    <>
                      <div className="mini-spinner" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>
                        {mode === 'edit' && form.status === 'published'
                          ? 'Update & Keep Published'
                          : 'Publish Announcement'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ═══ LIST VIEW MODE ═══ */}
      {mode === 'list' && (
        <div className="announcements-list-view">
          {/* Status Filter Bar */}
          {announcements.length > 0 && (
            <div className="announcements-filter-bar">
              <div className="filter-pills-group">
                <button
                  type="button"
                  className={`filter-pill-btn ${filterStatus === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('all')}
                >
                  <span>All Announcements</span>
                  <span className="count-pill">{announcements.length}</span>
                </button>

                <button
                  type="button"
                  className={`filter-pill-btn ${filterStatus === 'published' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('published')}
                >
                  <Globe size={13} />
                  <span>Published</span>
                  <span className="count-pill">
                    {announcements.filter((a) => a.status === 'published').length}
                  </span>
                </button>

                <button
                  type="button"
                  className={`filter-pill-btn ${filterStatus === 'draft' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('draft')}
                >
                  <Lock size={13} />
                  <span>Drafts</span>
                  <span className="count-pill">
                    {announcements.filter((a) => a.status === 'draft').length}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredAnnouncements.length === 0 ? (
            <div className="announcements-empty-card">
              <div className="empty-bell-icon-box">
                <Bell size={36} />
              </div>
              <h3 className="empty-heading">No announcements yet</h3>
              <p className="empty-subheading">
                {filterStatus !== 'all'
                  ? `No announcements found matching "${filterStatus}".`
                  : 'Keep your learners informed by sharing important course updates.'}
              </p>
              {filterStatus === 'all' && (
                <button
                  type="button"
                  className="btn-create-announcement"
                  onClick={handleStartCreate}
                >
                  <Plus size={16} />
                  <span>Create Announcement</span>
                </button>
              )}
            </div>
          ) : (
            /* Cards / Rows of Announcements */
            <div className="announcements-grid-layout">
              {filteredAnnouncements.map((item) => (
                <div key={item._id} className="announcement-row-card">
                  {/* Top Meta Line */}
                  <div className="card-top-meta">
                    <div className="badge-group">
                      <span className={`status-pill ${item.status}`}>
                        {item.status === 'published' ? (
                          <>
                            <Globe size={12} />
                            <span>Published</span>
                          </>
                        ) : (
                          <>
                            <Lock size={12} />
                            <span>Draft</span>
                          </>
                        )}
                      </span>

                      <span className={`audience-pill ${item.targetAudience}`}>
                        <Users size={12} />
                        <span>{getAudienceLabel(item.targetAudience)}</span>
                      </span>
                    </div>

                    <div className="timestamps-wrap">
                      <span className="time-item">
                        Created: {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      {item.updatedAt !== item.createdAt && (
                        <span className="time-item">
                          • Updated: {new Date(item.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Preview */}
                  <div className="card-content-area">
                    <h4 className="announcement-item-title">{item.title}</h4>
                    <p className="announcement-item-snippet">{item.message}</p>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="card-footer-actions">
                    <div className="audience-reach-note">
                      <span>
                        Targeting:{' '}
                        <strong>
                          {getAudienceLabel(item.targetAudience)} (~{getAudienceCount(item.targetAudience)} learners)
                        </strong>
                      </span>
                    </div>

                    <div className="btn-actions-group">
                      {/* View Action */}
                      <button
                        type="button"
                        className="btn-action-icon"
                        title="View Complete Announcement"
                        onClick={() => setViewingItem(item)}
                      >
                        <Eye size={15} />
                        <span>View</span>
                      </button>

                      {/* Edit Action */}
                      <button
                        type="button"
                        className="btn-action-icon"
                        title="Edit Announcement"
                        onClick={() => handleStartEdit(item)}
                      >
                        <Edit3 size={15} />
                        <span>Edit</span>
                      </button>

                      {/* Quick Publish / Unpublish Toggle */}
                      <button
                        type="button"
                        className={`btn-action-toggle ${
                          item.status === 'published' ? 'btn-unpublish' : 'btn-publish'
                        }`}
                        title={
                          item.status === 'published'
                            ? 'Move back to Draft'
                            : 'Publish Announcement Live'
                        }
                        onClick={() => handleTogglePublish(item)}
                      >
                        {item.status === 'published' ? (
                          <>
                            <Lock size={13} />
                            <span>Draft</span>
                          </>
                        ) : (
                          <>
                            <Globe size={13} />
                            <span>Publish</span>
                          </>
                        )}
                      </button>

                      {/* Delete Action */}
                      <button
                        type="button"
                        className="btn-action-delete"
                        title="Delete Announcement"
                        onClick={() => setDeletingItem(item)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ VIEW ANNOUNCEMENT MODAL ═══ */}
      {viewingItem && (
        <div className="announcement-modal-backdrop" onClick={() => setViewingItem(null)}>
          <div
            className="announcement-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header-row">
              <div className="modal-header-title-group">
                <Bell size={20} className="accent-green" />
                <h3 className="modal-title">Announcement Details</h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setViewingItem(null)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content">
              <div className="modal-meta-badges">
                <span className={`status-pill ${viewingItem.status}`}>
                  {viewingItem.status === 'published' ? (
                    <>
                      <Globe size={12} />
                      <span>Published & Live</span>
                    </>
                  ) : (
                    <>
                      <Lock size={12} />
                      <span>Draft Mode</span>
                    </>
                  )}
                </span>

                <span className={`audience-pill ${viewingItem.targetAudience}`}>
                  <Users size={12} />
                  <span>
                    Recipient Audience: {getAudienceLabel(viewingItem.targetAudience)}
                  </span>
                </span>
              </div>

              <h2 className="modal-announcement-title">{viewingItem.title}</h2>

              <div className="modal-message-box">
                {viewingItem.message.split('\n').map((para, idx) => (
                  <p key={idx} className="modal-message-p">
                    {para || '\u00A0'}
                  </p>
                ))}
              </div>

              <div className="modal-dates-table">
                <div className="date-item">
                  <span className="date-label">Created</span>
                  <span className="date-val">
                    {new Date(viewingItem.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="date-item">
                  <span className="date-label">Last Updated</span>
                  <span className="date-val">
                    {new Date(viewingItem.updatedAt).toLocaleString()}
                  </span>
                </div>
                {viewingItem.publishedAt && (
                  <div className="date-item">
                    <span className="date-label">Published At</span>
                    <span className="date-val">
                      {new Date(viewingItem.publishedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer-row">
              <button
                type="button"
                className="btn-action-icon"
                onClick={() => {
                  const toEdit = viewingItem;
                  setViewingItem(null);
                  handleStartEdit(toEdit);
                }}
              >
                <Edit3 size={15} />
                <span>Edit Announcement</span>
              </button>

              <button
                type="button"
                className="btn-primary-close"
                onClick={() => setViewingItem(null)}
              >
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
      {deletingItem && (
        <div className="announcement-modal-backdrop" onClick={() => setDeletingItem(null)}>
          <div
            className="announcement-delete-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="delete-icon-circle">
              <AlertTriangle size={26} />
            </div>

            <h3 className="delete-dialog-title">Delete Announcement?</h3>
            <p className="delete-dialog-desc">
              Are you sure you want to delete{' '}
              <strong>"{deletingItem.title}"</strong>? This will permanently remove this
              announcement and it will no longer be visible to learners.
            </p>

            <div className="delete-dialog-actions">
              <button
                type="button"
                className="btn-cancel-action"
                disabled={isDeleting}
                onClick={() => setDeletingItem(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-danger-delete"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
              >
                {isDeleting ? 'Deleting...' : 'Delete Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
