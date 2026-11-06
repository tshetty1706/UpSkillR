import React, { useState, useMemo } from 'react';
import {
  MoreVertical,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Star,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { CourseThumbnail } from '../../common/CourseThumbnail';
import { calculateCourseProgress } from '../dashboard/MyLearningSection';
import './LearnerMyLearningView.css';

export const LearnerMyLearningView = ({
  enrolments = [],
  onNavigateToCourse,
  onViewCourseDetails,
  onLessonComplete,
  onRateCourse,
  onExploreCourses,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState('enrolled'); // 'enrolled' | 'completed' | 'not_started'
  const [openMenuCourseId, setOpenMenuCourseId] = useState(null);
  const [expandedCourseId, setExpandedCourseId] = useState(null);

  // Group enrolments into the 3 strict categories
  const { enrolledCourses, completedCourses, notStartedCourses } = useMemo(() => {
    const enrolled = [];
    const completed = [];
    const notStarted = [];

    enrolments.forEach((e) => {
      const details = calculateCourseProgress(e);
      const enhancedEnrolment = { ...e, computed: details };

      if (details.category === 'completed') {
        completed.push(enhancedEnrolment);
      } else if (details.category === 'enrolled') {
        enrolled.push(enhancedEnrolment);
      } else {
        notStarted.push(enhancedEnrolment);
      }
    });

    return {
      enrolledCourses: enrolled,
      completedCourses: completed,
      notStartedCourses: notStarted
    };
  }, [enrolments]);

  // Active courses based on tab
  const displayedCourses = useMemo(() => {
    if (activeTab === 'enrolled') return enrolledCourses;
    if (activeTab === 'completed') return completedCourses;
    if (activeTab === 'not_started') return notStartedCourses;
    return [];
  }, [activeTab, enrolledCourses, completedCourses, notStartedCourses]);

  const toggleAccordion = (id) => {
    setExpandedCourseId((prev) => (prev === id ? null : id));
  };

  const handleActionClick = (enrolment) => {
    const { category, course } = enrolment.computed;
    const courseId = course._id || enrolment.courseId;

    if (category === 'completed') {
      if (onRateCourse) {
        onRateCourse(course);
      } else if (onNavigateToCourse) {
        onNavigateToCourse(courseId);
      }
    } else {
      // 'enrolled' or 'not_started'
      if (onNavigateToCourse) {
        onNavigateToCourse(courseId);
      }
    }
  };

  const renderEmptyState = () => {
    if (activeTab === 'enrolled') {
      return (
        <div className="mylearning-empty-state">
          <p className="mylearning-empty-title">No courses in progress.</p>
          <p className="mylearning-empty-sub">
            {notStartedCourses.length > 0
              ? 'You have courses waiting to be started in your queue.'
              : 'Enroll in courses from the catalog to start learning.'}
          </p>
          {notStartedCourses.length > 0 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveTab('not_started')}
              style={{ minHeight: '44px', padding: '10px 20px' }}
            >
              Start a Course ({notStartedCourses.length} waiting)
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onExploreCourses}
              style={{ minHeight: '44px', padding: '10px 20px' }}
            >
              <Sparkles size={16} />
              <span>Explore Courses</span>
            </button>
          )}
        </div>
      );
    }

    if (activeTab === 'completed') {
      return (
        <div className="mylearning-empty-state">
          <p className="mylearning-empty-title">You haven't completed any courses yet.</p>
          <p className="mylearning-empty-sub">
            Complete all lessons in a course to unlock your completion status and rate the course.
          </p>
          {enrolledCourses.length > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveTab('enrolled')}
              style={{ minHeight: '44px', padding: '10px 20px' }}
            >
              Continue In-Progress Courses
            </button>
          )}
        </div>
      );
    }

    // not_started
    return (
      <div className="mylearning-empty-state">
        <p className="mylearning-empty-title">No courses waiting to be started.</p>
        <p className="mylearning-empty-sub">
          All your enrolled courses are currently in progress or completed.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onExploreCourses}
          style={{ minHeight: '44px', padding: '10px 20px' }}
        >
          <Sparkles size={16} />
          <span>Explore New Courses</span>
        </button>
      </div>
    );
  };

  return (
    <div className="learner-mylearning-page">
      {/* Page Header (Notice: NO welcome banner, NO motivational message here per instructions!) */}
      <div className="mylearning-page-header">
        <div>
          <h1 className="mylearning-page-title">My Learning</h1>
          <p className="mylearning-page-subtitle">
            Manage your enrolled courses, track module completion, and continue learning.
          </p>
        </div>

        {/* Category Tabs: Enrolled | Completed | Not Started */}
        <div className="mylearning-tabs-container" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'enrolled'}
            className={`mylearning-tab-btn ${activeTab === 'enrolled' ? 'active' : ''}`}
            onClick={() => setActiveTab('enrolled')}
          >
            <span>Enrolled</span>
            <span className="tab-badge">({enrolledCourses.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'completed'}
            className={`mylearning-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <span>Completed</span>
            <span className="tab-badge">({completedCourses.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'not_started'}
            className={`mylearning-tab-btn ${activeTab === 'not_started' ? 'active' : ''}`}
            onClick={() => setActiveTab('not_started')}
          >
            <span>Not Started</span>
            <span className="tab-badge">({notStartedCourses.length})</span>
          </button>
        </div>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="mylearning-loading">Loading your courses...</div>
      ) : displayedCourses.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="mylearning-courses-list" role="list">
          {displayedCourses.map((enrolment) => {
            const { course, progressPct, category, completedCount, totalLessons, lessons, validDone } = enrolment.computed;
            const courseId = course._id || enrolment._id;
            const isMenuOpen = openMenuCourseId === courseId;
            const isExpanded = expandedCourseId === courseId;

            // Strict action button label
            let buttonLabel = 'Continue';
            if (category === 'not_started') {
              buttonLabel = 'Start';
            } else if (category === 'completed') {
              buttonLabel = 'Review Course';
            }

            return (
              <div key={enrolment._id || courseId} className="mylearning-course-item" role="listitem">
                <div className="mylearning-course-row">
                  {/* Thumbnail */}
                  <div
                    className="course-thumb-box"
                    onClick={() => onNavigateToCourse && onNavigateToCourse(course._id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View ${course.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onNavigateToCourse && onNavigateToCourse(course._id);
                      }
                    }}
                  >
                    <CourseThumbnail
                      src={course.thumbnail}
                      alt={course.title}
                      className="course-thumb-img"
                    />
                  </div>

                  {/* Title & Metadata */}
                  <div className="course-info-box">
                    <h2
                      className="course-title-text"
                      title={course.title}
                      onClick={() => onNavigateToCourse && onNavigateToCourse(course._id)}
                    >
                      {course.title}
                    </h2>
                    {course.category && (
                      <span className="course-cat-tag">{course.category}</span>
                    )}
                  </div>

                  {/* Progress Bar & Percentage */}
                  <div className="course-progress-box">
                    <div className="progress-track" aria-label={`Progress: ${progressPct}%`}>
                      <div
                        className={`progress-fill ${progressPct === 100 ? 'done' : ''}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="progress-pct-val">{progressPct}%</span>
                  </div>

                  {/* Action Button (44px min height) */}
                  <div className="course-action-box">
                    <button
                      type="button"
                      className={`btn-course-action btn-${category}`}
                      onClick={() => handleActionClick(enrolment)}
                      aria-label={`${buttonLabel} ${course.title}`}
                    >
                      {buttonLabel}
                    </button>
                  </div>

                  {/* Overflow Action Menu */}
                  <div className="course-menu-box">
                    <button
                      type="button"
                      className="btn-course-menu-trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuCourseId(isMenuOpen ? null : courseId);
                      }}
                      aria-label={`More options for ${course.title}`}
                      aria-haspopup="true"
                      aria-expanded={isMenuOpen}
                    >
                      <MoreVertical size={18} />
                    </button>

                    {isMenuOpen && (
                      <>
                        <div
                          className="course-menu-backdrop"
                          onClick={() => setOpenMenuCourseId(null)}
                        />
                        <div className="course-menu-dropdown" role="menu">
                          <button
                            type="button"
                            className="course-menu-entry"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuCourseId(null);
                              if (onViewCourseDetails) {
                                onViewCourseDetails(course._id);
                              } else {
                                const path = `/courses/${course._id}`;
                                window.history.pushState({}, '', path);
                                window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
                              }
                            }}
                          >
                            <ExternalLink size={15} />
                            <span>Go to Course Page</span>
                          </button>

                          <button
                            type="button"
                            className="course-menu-entry"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuCourseId(null);
                              toggleAccordion(courseId);
                            }}
                          >
                            <BookOpen size={15} />
                            <span>{isExpanded ? 'Hide Modules' : 'Module Breakdown'}</span>
                          </button>

                          {category === 'completed' && onRateCourse && (
                            <button
                              type="button"
                              className="course-menu-entry"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuCourseId(null);
                                onRateCourse(course);
                              }}
                            >
                              <Star size={15} />
                              <span>Rate & Review</span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Collapsible Module Breakdown Accordion */}
                {isExpanded && (
                  <div className="course-modules-accordion-panel">
                    <div className="modules-panel-header">
                      <span className="modules-panel-title">
                        Modules Breakdown ({completedCount}/{totalLessons})
                      </span>
                      <button
                        type="button"
                        className="btn-modules-collapse"
                        onClick={() => toggleAccordion(courseId)}
                        aria-label="Collapse modules"
                      >
                        <ChevronUp size={16} />
                      </button>
                    </div>

                    <div className="modules-accordion-list">
                      {lessons.map((lesson, idx) => {
                        const isDone = validDone.has(idx) || (enrolment.completedLessons || []).includes(idx);
                        return (
                          <div key={idx} className="module-accordion-row">
                            <span className={`module-row-title ${isDone ? 'done' : ''}`}>
                              {lesson.title || `Module ${idx + 1}`}
                            </span>
                            {onLessonComplete && (
                              <button
                                type="button"
                                className={`btn-module-status ${isDone ? 'done' : ''}`}
                                onClick={() => onLessonComplete(course._id, idx)}
                                aria-label={isDone ? 'Module completed' : 'Mark module as completed'}
                              >
                                <CheckCircle2 size={14} />
                                <span>{isDone ? 'Done (+5 pts)' : 'Mark Done'}</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LearnerMyLearningView;

