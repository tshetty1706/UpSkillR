import React, { useState, useEffect, useRef } from 'react';
import { Star, X, CheckCircle2, MessageSquare, Tag, Lock } from 'lucide-react';
import { API_BASE } from '../../../../config/api';
import { useToast } from '../../../../context/ToastContext';

export const CourseRatingModal = ({
  isOpen,
  onClose,
  course,
  courseId: propCourseId,
  courseTitle: propCourseTitle,
  initialRating,
  onSubmit
}) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(true);
  const [eligibilityMessage, setEligibilityMessage] = useState('');
  const userEditedRef = useRef(false);

  const resolvedCourseId = course?._id || course?.id || propCourseId;
  const resolvedCourseTitle = course?.title || propCourseTitle || 'Course';

  useEffect(() => {
    if (!isOpen || (!course && !resolvedCourseId)) return;

    userEditedRef.current = false;
    setCanReview(true);
    setEligibilityMessage('');
    const initialObj =
      initialRating && typeof initialRating === 'object' ? initialRating : null;

    setRating(Number(initialObj?.rating) || 5);
    setFeedback(initialObj?.feedback || '');
    setSelectedTags(initialObj?.tags || initialObj?.feedbackTags || []);
    setHoverRating(0);

    let cancelled = false;
    const fetchExistingReview = async () => {
      if (!resolvedCourseId) return;
      const token =
        sessionStorage.getItem('upskillr_token') ||
        localStorage.getItem('upskillr_token');
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE}/courses/${resolvedCourseId}/my-review`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include'
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.success) {
          if (data.canReview === false) {
            setCanReview(false);
            setEligibilityMessage('Complete 100% of this course to unlock ratings and reviews.');
          }
          if (!userEditedRef.current && data.hasReviewed && data.review) {
            setRating(Number(data.review.rating) || 5);
            setFeedback(data.review.feedback || '');
            setSelectedTags(
              Array.isArray(data.review.tags)
                ? data.review.tags
                : Array.isArray(data.review.feedbackTags)
                  ? data.review.feedbackTags
                  : []
            );
          }
        }
      } catch (err) {
        // Non-blocking: fall back cleanly to initialRating / defaults
      }
    };

    fetchExistingReview();
    return () => {
      cancelled = true;
    };
  }, [isOpen, resolvedCourseId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || (!course && !resolvedCourseId)) return null;

  const quickTags = [
    'Clear Explanations',
    'Great Practical Exercises',
    'Well Structured',
    'High Quality Audio/Video',
    'Engaging Instructor',
    'Beginner Friendly'
  ];

  const toggleTag = (tag) => {
    userEditedRef.current = true;
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canReview) {
      toast.error(eligibilityMessage || 'Complete 100% of this course to unlock ratings and reviews.');
      return;
    }
    if (!resolvedCourseId) {
      toast.error('Course information is missing.');
      return;
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      toast.error('Please select a rating between 1 and 5 stars.');
      return;
    }

    const trimmedFeedback = feedback.trim();
    if (trimmedFeedback.length < 3) {
      toast.error('Feedback must be at least 3 characters long.');
      return;
    }
    if (trimmedFeedback.length > 1000) {
      toast.error('Feedback cannot exceed 1000 characters.');
      return;
    }

    const token =
      sessionStorage.getItem('upskillr_token') ||
      localStorage.getItem('upskillr_token');
    if (!token) {
      toast.warning('Please log in as a learner to submit a course review.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/courses/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          courseId: resolvedCourseId,
          rating: numRating,
          feedback: trimmedFeedback,
          tags: selectedTags
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to submit course review.');
        return;
      }

      const ratingPayload = {
        rating: numRating,
        feedback: trimmedFeedback,
        tags: selectedTags,
        date: new Date().toLocaleDateString(),
        review: data.review,
        isUpdate: Boolean(data.isUpdate)
      };

      toast.success(
        data.isUpdate
          ? 'Your course review has been updated successfully!'
          : 'Thank you! Your course review has been recorded.'
      );

      window.dispatchEvent(
        new CustomEvent('upskillr_review_updated', {
          detail: { courseId: resolvedCourseId, ...ratingPayload }
        })
      );

      if (onSubmit) {
        await onSubmit(resolvedCourseId, ratingPayload);
      }

      onClose();
    } catch (err) {
      console.error('Error submitting course rating:', err);
      toast.error('Network error while submitting review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content learner-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <h2>Rate & Review</h2>
            <p className="modal-subtitle">{resolvedCourseTitle}</p>
          </div>
          <button className="icon-btn close-modal-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rating-form">
          {!canReview && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#f59e0b',
                fontSize: '0.84rem',
                fontWeight: 600
              }}
            >
              <Lock size={15} />
              <span>{eligibilityMessage || 'Complete 100% of this course to unlock ratings and reviews.'}</span>
            </div>
          )}

          {/* Star Selection */}
          <div className="rating-stars-section">
            <label className="rating-label">Overall Rating</label>
            <div className="stars-picker" onMouseLeave={() => setHoverRating(0)}>
              {[1, 2, 3, 4, 5].map((star) => {
                const activeStar = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    className={`star-btn ${activeStar ? 'filled' : ''}`}
                    onClick={() => {
                      userEditedRef.current = true;
                      setRating(star);
                    }}
                    onMouseEnter={() => setHoverRating(star)}
                    aria-label={`Rate ${star} out of 5 stars`}
                  >
                    <Star
                      size={32}
                      className={activeStar ? 'star-icon-filled' : 'star-icon-empty'}
                    />
                  </button>
                );
              })}
            </div>
            <span className="rating-score-label">
              {rating === 5 && '🌟 Exceptional course! Highly recommended.'}
              {rating === 4 && '👍 Great course! Very useful.'}
              {rating === 3 && '👌 Good content, met expectations.'}
              {rating === 2 && '😐 Needs some improvement.'}
              {rating === 1 && '👎 Did not meet expectations.'}
            </span>
          </div>

          {/* Preset Tags */}
          <div className="rating-tags-section">
            <label className="rating-label">
              <Tag size={15} />
              <span>Highlight Strengths</span>
            </label>
            <div className="quick-tags-grid">
              {quickTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`tag-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback Textarea */}
          <div className="rating-feedback-section">
            <label htmlFor="learner-feedback-input" className="rating-label">
              <MessageSquare size={15} />
              <span>Your Review & Feedback</span>
            </label>
            <textarea
              id="learner-feedback-input"
              rows={4}
              className="learner-textarea"
              placeholder="What did you like about this course? How did it help your skills?"
              value={feedback}
              onChange={(e) => {
                userEditedRef.current = true;
                setFeedback(e.target.value);
              }}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-submit-rating" disabled={isSubmitting || !canReview}>
              {isSubmitting ? 'Submitting Feedback...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
