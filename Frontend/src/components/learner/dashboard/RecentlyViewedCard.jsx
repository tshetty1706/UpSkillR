import React from 'react';
import { PlayCircle, Compass, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import { CourseThumbnail } from '../../common/CourseThumbnail';
import { calculateCourseProgress } from './MyLearningSection';
import './RecentlyViewedCard.css';

export const RecentlyViewedCard = ({
  course = null,
  title = 'Continue Learning',
  onContinue,
  onExplore,
  onMyLearning,
  loading = false
}) => {
  if (loading) {
    return (
      <section className="recently-viewed-section" aria-label={title}>
        <div className="section-title-row">
          <h2 className="section-title">{title}</h2>
        </div>
        <div className="recently-viewed-card loading-skeleton">
          <div className="skeleton-thumb" />
          <div className="skeleton-content">
            <div className="skeleton-line line-title" />
            <div className="skeleton-line line-subtitle" />
            <div className="skeleton-line line-progress" />
          </div>
        </div>
      </section>
    );
  }

  // Empty State: user has not viewed any course yet
  if (!course) {
    return (
      <section className="recently-viewed-section" aria-label={title}>
        <div className="section-title-row">
          <h2 className="section-title">{title}</h2>
        </div>
        <div className="recently-viewed-empty-card">
          <div className="empty-content-wrap">
            <div className="empty-icon-box" aria-hidden="true">
              <Compass size={22} className="empty-icon" />
            </div>
            <div className="empty-text-wrap">
              <p className="empty-main-text">No courses viewed yet.</p>
              <p className="empty-sub-text">
                Start a course from your enrolled list or explore new topics to begin learning.
              </p>
            </div>
          </div>
          <div className="empty-actions-row">
            {onMyLearning && (
              <button
                type="button"
                className="btn-mylearning-empty"
                onClick={onMyLearning}
                aria-label="Go to My Learning"
              >
                <BookOpen size={15} />
                <span>My Learning</span>
              </button>
            )}
            {onExplore && (
              <button
                type="button"
                className="btn-explore-empty"
                onClick={onExplore}
                aria-label="Explore available courses"
              >
                <Sparkles size={15} />
                <span>Explore Courses</span>
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Compute lesson name if available
  const rawCourse = typeof course.courseId === 'object' ? course.courseId : course;
  const courseTitle = rawCourse?.title || course.courseTitle || 'Untitled Course';
  const courseThumbnail = rawCourse?.thumbnail || course.courseThumbnail;
  const courseCategory = rawCourse?.category || 'Course';

  // Compute progress percentage & lessons using shared single-source-of-truth
  const progressDetails = calculateCourseProgress(course);
  const progressPct = progressDetails.progressPct;
  const allLessons = progressDetails.lessons;
  const validDone = progressDetails.validDone;

  let currentLessonName = course.currentLessonName || null;

  if (!currentLessonName && allLessons.length > 0) {
    // Find first uncompleted lesson
    const nextIdx = allLessons.findIndex((_, idx) => !validDone.has(idx));
    if (nextIdx !== -1 && allLessons[nextIdx]) {
      const lessonObj = allLessons[nextIdx];
      currentLessonName = lessonObj.title
        ? `Lesson ${nextIdx + 1}: ${lessonObj.title}`
        : `Lesson ${nextIdx + 1}`;
    } else if (allLessons.length > 0) {
      currentLessonName = allLessons[0].title
        ? `Lesson 1: ${allLessons[0].title}`
        : 'Lesson 1';
    }
  }

  const handleContinueClick = () => {
    if (onContinue) {
      onContinue(rawCourse?._id || course.courseId);
    }
  };

  return (
    <section className="recently-viewed-section" aria-label={title}>
      <div className="section-title-row">
        <h2 className="section-title">{title}</h2>
      </div>

      <div className="recently-viewed-card">
        {/* Course Thumbnail */}
        <div className="recent-card-thumb-wrap">
          <CourseThumbnail
            src={courseThumbnail}
            alt={courseTitle}
            className="recent-card-thumb"
          />
          <div className="thumb-play-overlay" aria-hidden="true">
            <PlayCircle size={28} className="thumb-play-icon" />
          </div>
        </div>

        {/* Course Details */}
        <div className="recent-card-details">
          <div className="recent-card-header">
            {courseCategory && (
              <span className="recent-category-pill">{courseCategory}</span>
            )}
            <h3 className="recent-course-title" title={courseTitle}>
              {courseTitle}
            </h3>
            {currentLessonName && (
              <p className="recent-current-lesson" title={currentLessonName}>
                {currentLessonName}
              </p>
            )}
          </div>

          {/* Progress Bar Row */}
          <div className="recent-progress-container">
            <div className="recent-progress-bar-wrap" aria-label={`Progress: ${progressPct}%`}>
              <div
                className="recent-progress-bar-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="recent-progress-pct-text">{progressPct}%</span>
          </div>
        </div>

        {/* Continue Action */}
        <div className="recent-card-action">
          <button
            type="button"
            className="btn-recent-continue"
            onClick={handleContinueClick}
            aria-label={`Continue ${courseTitle}`}
          >
            <span>Continue</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewedCard;
