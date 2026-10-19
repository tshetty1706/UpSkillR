import React from 'react';
import { Bookmark, Award, Layers, FileText, Clock, Users, Star } from 'lucide-react';
import { CourseThumbnail } from '../CourseThumbnail';
import { Avatar } from '../Avatar/Avatar';
import './CourseCard.css';

/**
 * Formats large counts compactly (e.g. 12400 -> 12.4K).
 */
export const formatCount = (num) => {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  if (isNaN(n) || n <= 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

/**
 * Canonical CourseCard Component matching UpSkillr Reference Image 3.
 * Preserves thumbnail, adds certificate badge, clamps description,
 * displays compact stats row (Modules | Assessments | Duration),
 * and bottom author & rating section with aligned action button.
 */
export const CourseCard = ({
  course,
  instructor,
  isBookmarked = false,
  onBookmarkToggle,
  onNavigate
}) => {
  const publishedModCount = course.moduleCount ?? course.modulesCount ?? (course.modules ? course.modules.filter(m => m.state === 'published' || m.status === 'published').length : 0);
  const assessmentCount = course.assessmentCount ?? (course.courseAssessments ? course.courseAssessments.length : 0);
  const durationText = course.formattedDuration || 'Duration unavailable';
  const hasCertificate = course.certificate !== false;
  const descriptionText = course.description || course.shortDescription || '';
  const instructorName = course.instructorName || instructor?.fullName || 'Instructor';
  const instructorAvatar = course.instructorAvatar || instructor?.avatar;

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(course._id);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className="explore-course-card"
      role="button"
      tabIndex={0}
      aria-label={`View details for ${course.title}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ cursor: 'pointer' }}
    >
      {/* 1. Thumbnail with Bookmark Button */}
      <div className="course-card-thumb-wrap">
        <CourseThumbnail
          src={course.thumbnail}
          alt={course.title}
          className="course-card-thumb"
        />
        <button
          type="button"
          className={`course-bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
          aria-label={isBookmarked ? `Remove bookmark for ${course.title}` : `Bookmark ${course.title}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (onBookmarkToggle) {
              onBookmarkToggle(course._id, course.title);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              if (onBookmarkToggle) {
                onBookmarkToggle(course._id, course.title);
              }
            }
          }}
        >
          <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* 2. Card Body */}
      <div className="course-card-body">
        {/* Certificate Availability Indicator - Top Right */}
        <div className="course-card-top-meta">
          {hasCertificate ? (
            <span className="course-certificate-badge" title="Completion Certificate Included">
              <Award size={12} className="certificate-icon" />
              <span>Certificate</span>
            </span>
          ) : (
            <span className="course-certificate-placeholder" aria-hidden="true" />
          )}
        </div>

        {/* Course Title */}
        <h3 className="course-card-title" title={course.title}>
          {course.title}
        </h3>

        {/* Course Description - Clamped to 2 lines */}
        <p className="course-card-description" title={descriptionText}>
          {descriptionText}
        </p>

        {/* Single Category Badge below description */}
        <div className="course-category-row">
          <span className="course-category-badge">{course.category}</span>
        </div>

        {/* Statistics Row: Module count | Assessment count | Total completion time */}
        <div className="course-stats-row">
          <div className="course-stat-item" title={`${publishedModCount} published modules`}>
            <Layers size={13} className="stat-icon" />
            <span>{publishedModCount} {publishedModCount === 1 ? 'Module' : 'Modules'}</span>
          </div>
          <span className="course-stat-divider">|</span>
          <div className="course-stat-item" title={`${assessmentCount} course assessments`}>
            <FileText size={13} className="stat-icon" />
            <span>{assessmentCount} {assessmentCount === 1 ? 'Assessment' : 'Assessments'}</span>
          </div>
          <span className="course-stat-divider">|</span>
          <div className="course-stat-item" title={`Estimated completion time: ${durationText}`}>
            <Clock size={13} className="stat-icon" />
            <span>{durationText}</span>
          </div>
        </div>

        {/* Bottom Section: Author, Social Proof, and Action Button */}
        <div className="course-card-bottom-section">
          <div className="course-instructor-social-row">
            {/* Instructor Avatar & Name */}
            <div className="course-instructor-info">
              <Avatar
                image={instructorAvatar}
                name={instructorName}
                size="small"
              />
              <span className="course-instructor-name" title={instructorName}>
                {instructorName}
              </span>
            </div>

            {/* Social Proof: Viewers / Learners & Rating */}
            <div className="course-social-info">
              <div className="course-social-item" title={`${course.learnersCount ?? 0} enrolled ${course.learnersCount === 1 ? 'learner' : 'learners'}`}>
                <Users size={12} className="stat-icon" />
                <span>{formatCount(course.learnersCount ?? 0)}</span>
              </div>
              <span className="course-stat-divider">|</span>
              <div className="course-social-item course-rating-item">
                {course.rating !== null && course.rating !== undefined ? (
                  <>
                    <Star size={13} className="course-rating-star" fill="currentColor" />
                    <span>{course.rating.toFixed(1)}</span>
                  </>
                ) : (
                  <span className="course-no-rating">No ratings yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Row: View Course Button */}
          <div className="course-card-action-row">
            <button
              type="button"
              className="btn btn-primary course-view-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              <span>View Course</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
