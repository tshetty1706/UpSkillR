import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Star,
  Edit2,
  Trash2,
  Calendar,
  AlertTriangle,
  X,
  Check,
  Sparkles
} from 'lucide-react';
import { CourseThumbnail } from '../../common/CourseThumbnail';
import { useToast } from '../../../context/ToastContext';
import { API_BASE } from '../../../config/api';
import './LearnerFeedbackView.css';

export const LearnerFeedbackView = ({ onNavigateToCourse, onExploreCourses }) => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editFeedback, setEditFeedback] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Confirmation Modal State
  const [deletingReview, setDeletingReview] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/learners/me/reviews`, {
        headers,
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Open Edit Modal
  const handleOpenEdit = (review) => {
    setEditingReview(review);
    setEditRating(review.rating || 5);
    setEditFeedback(review.feedback || '');
    setEditError('');
  };

  // Submit Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    const trimmed = editFeedback.trim();
    if (!trimmed || trimmed.length < 3) {
      setEditError('Feedback must be at least 3 characters long.');
      return;
    }
    if (trimmed.length > 1000) {
      setEditError('Feedback cannot exceed 1000 characters.');
      return;
    }

    setEditSubmitting(true);
    setEditError('');
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const courseId = editingReview.courseId;
      const res = await fetch(`${API_BASE}/courses/${courseId}/review`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          rating: editRating,
          feedback: trimmed,
          tags: editingReview.tags || []
        })
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Your feedback has been updated successfully!');
        setReviews((prev) =>
          prev.map((r) =>
            r._id === editingReview._id
              ? { ...r, rating: editRating, feedback: trimmed, updatedAt: new Date() }
              : r
          )
        );
        setEditingReview(null);
      } else {
        setEditError(data.message || 'Failed to update feedback.');
      }
    } catch (err) {
      setEditError('Network error while saving feedback. Please try again.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingReview) return;
    setDeleteSubmitting(true);

    try {
      const token = sessionStorage.getItem('upskillr_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const reviewId = deletingReview._id;
      const res = await fetch(`${API_BASE}/learners/me/reviews/${reviewId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Feedback deleted successfully.');
        setReviews((prev) => prev.filter((r) => r._id !== reviewId));
        setDeletingReview(null);
      } else {
        toast.error(data.message || 'Failed to delete feedback.');
      }
    } catch (err) {
      toast.error('Network error while deleting feedback.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    const num = Math.min(Math.max(Number(rating) || 1, 1), 5);
    return (
      <div className="feedback-stars-row" aria-label={`${num} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={`feedback-star ${star <= num ? 'filled' : 'empty'}`}
          />
        ))}
        <span className="feedback-rating-num">{num}.0</span>
      </div>
    );
  };

  return (
    <div className="learner-feedback-page">
      <div className="feedback-header">
        <h1 className="feedback-page-title">My Feedback</h1>
        <p className="feedback-page-subtitle">
          Manage and review feedback you have submitted for completed courses.
        </p>
      </div>

      {loading ? (
        <div className="feedback-loading">Loading your feedback...</div>
      ) : reviews.length === 0 ? (
        <div className="feedback-empty-card">
          <div className="feedback-empty-icon" aria-hidden="true">
            <MessageSquare size={32} />
          </div>
          <h2 className="empty-title">You Haven't Submitted Any Course Feedback Yet</h2>
          <p className="empty-desc">
            Once you complete a course, you can leave ratings and feedback to help instructors and fellow learners.
          </p>
          {onExploreCourses && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onExploreCourses}
              style={{ minHeight: '44px', padding: '10px 22px' }}
            >
              <Sparkles size={16} />
              <span>Explore Courses</span>
            </button>
          )}
        </div>
      ) : (
        <div className="feedback-list-container">
          {reviews.map((review) => {
            const courseTitle = review.courseTitle || 'Course';
            const courseThumb = review.courseThumbnail;
            const formattedDate = review.createdAt
              ? new Date(review.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Recent';

            return (
              <div key={review._id} className="feedback-card">
                {/* Course Header Row */}
                <div className="feedback-course-strip">
                  <div className="feedback-course-info">
                    <div className="feedback-course-thumb-wrap">
                      <CourseThumbnail
                        src={courseThumb}
                        alt={courseTitle}
                        className="feedback-course-thumb"
                      />
                    </div>
                    <div className="feedback-course-meta">
                      <span className="feedback-category-badge">{review.category || 'Course'}</span>
                      <h3
                        className="feedback-course-title"
                        title={courseTitle}
                        onClick={() => onNavigateToCourse && onNavigateToCourse(review.courseId)}
                      >
                        {courseTitle}
                      </h3>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="feedback-actions-group">
                    <button
                      type="button"
                      className="btn-feedback-action edit"
                      onClick={() => handleOpenEdit(review)}
                      aria-label={`Edit feedback for ${courseTitle}`}
                      title="Edit feedback"
                    >
                      <Edit2 size={15} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      className="btn-feedback-action delete"
                      onClick={() => setDeletingReview(review)}
                      aria-label={`Delete feedback for ${courseTitle}`}
                      title="Delete feedback"
                    >
                      <Trash2 size={15} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Rating & Date */}
                <div className="feedback-rating-strip">
                  {renderStars(review.rating)}
                  <span className="feedback-date-text">
                    <Calendar size={13} />
                    <span>Submitted on {formattedDate}</span>
                  </span>
                </div>

                {/* Feedback Text */}
                <div className="feedback-body-text">
                  <p>"{review.feedback}"</p>
                </div>

                {/* Tags if any */}
                {Array.isArray(review.tags) && review.tags.length > 0 && (
                  <div className="feedback-tags-row">
                    {review.tags.map((tag, idx) => (
                      <span key={idx} className="feedback-tag-pill">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Feedback Modal */}
      {editingReview && (
        <div className="feedback-modal-backdrop" onClick={() => setEditingReview(null)}>
          <div
            className="feedback-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-feedback-title"
          >
            <div className="modal-header">
              <h2 id="edit-feedback-title" className="modal-title">
                Edit Feedback
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingReview(null)}
                aria-label="Close edit feedback dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="modal-form">
              <p className="modal-course-name">
                Course: <strong>{editingReview.courseTitle}</strong>
              </p>

              {/* Star Rating Picker */}
              <div className="rating-picker-group">
                <label className="picker-label">Your Rating</label>
                <div className="star-picker-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-pick-btn ${star <= editRating ? 'active' : ''}`}
                      onClick={() => setEditRating(star)}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star size={24} fill={star <= editRating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                  <span className="star-pick-text">{editRating} of 5 Stars</span>
                </div>
              </div>

              {/* Feedback Text Area */}
              <div className="feedback-input-group">
                <label htmlFor="edit-feedback-textarea" className="picker-label">
                  Feedback Review (3 to 1000 characters)
                </label>
                <textarea
                  id="edit-feedback-textarea"
                  className="feedback-textarea"
                  rows={4}
                  value={editFeedback}
                  onChange={(e) => setEditFeedback(e.target.value)}
                  maxLength={1000}
                  placeholder="Share your experience with the course content, pacing, and instructor..."
                  required
                />
                <span className="char-count-text">
                  {editFeedback.length} / 1000 characters
                </span>
              </div>

              {editError && (
                <div className="modal-error-alert" role="alert">
                  <AlertTriangle size={15} />
                  <span>{editError}</span>
                </div>
              )}

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setEditingReview(null)}
                  disabled={editSubmitting}
                  style={{ minHeight: '44px', padding: '8px 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editSubmitting || editFeedback.trim().length < 3}
                  style={{ minHeight: '44px', padding: '8px 22px' }}
                >
                  {editSubmitting ? 'Saving...' : 'Save Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingReview && (
        <div className="feedback-modal-backdrop" onClick={() => setDeletingReview(null)}>
          <div
            className="feedback-modal-dialog delete-confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-feedback-title"
          >
            <div className="delete-icon-circle">
              <AlertTriangle size={28} />
            </div>

            <h2 id="delete-feedback-title" className="delete-modal-title">
              Delete Course Feedback?
            </h2>

            <p className="delete-modal-text">
              Are you sure you want to delete your feedback for{' '}
              <strong>"{deletingReview.courseTitle}"</strong>? This action is permanent and cannot be undone.
            </p>

            <div className="delete-actions-row">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeletingReview(null)}
                disabled={deleteSubmitting}
                style={{ minHeight: '44px', padding: '8px 20px' }}
              >
                Keep Feedback
              </button>
              <button
                type="button"
                className="btn btn-danger-delete"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                style={{ minHeight: '44px', padding: '8px 22px' }}
              >
                {deleteSubmitting ? 'Deleting...' : 'Delete Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerFeedbackView;

