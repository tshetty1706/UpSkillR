import React, { useState } from 'react';
import { Star, X, CheckCircle2, MessageSquare, Tag } from 'lucide-react';

export const CourseRatingModal = ({ isOpen, onClose, course, initialRating, onSubmit }) => {
  const [rating, setRating] = useState(initialRating?.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState(initialRating?.feedback || '');
  const [selectedTags, setSelectedTags] = useState(initialRating?.tags || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !course) return null;

  const quickTags = [
    'Clear Explanations',
    'Great Practical Exercises',
    'Well Structured',
    'High Quality Audio/Video',
    'Engaging Instructor',
    'Beginner Friendly'
  ];

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit(course._id, {
        rating,
        feedback,
        tags: selectedTags,
        date: new Date().toLocaleDateString()
      });
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content learner-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="badge-pill completion-badge-header">
              <CheckCircle2 size={15} />
              <span>Course Completed!</span>
            </div>
            <h2>Rate & Review</h2>
            <p className="modal-subtitle">{course.title}</p>
          </div>
          <button className="icon-btn close-modal-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rating-form">
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
                    onClick={() => setRating(star)}
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
              onChange={(e) => setFeedback(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-submit-rating" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting Feedback...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
