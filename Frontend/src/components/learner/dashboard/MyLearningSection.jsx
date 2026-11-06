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
import './MyLearningSection.css';

/**
 * Calculates single-source-of-truth course progress and category
 */
export const calculateCourseProgress = (enrolment) => {
  const course = typeof enrolment.courseId === 'object'
    ? enrolment.courseId
    : { _id: enrolment.courseId, title: enrolment.courseTitle };

  // Collect all individual lessons across modules
  let allLessons = [];
  if (Array.isArray(course?.modules) && course.modules.length > 0) {
    course.modules.forEach(m => {
      if (Array.isArray(m.lessons) && m.lessons.length > 0) {
        allLessons.push(...m.lessons);
      }
    });
  }
  if (allLessons.length === 0 && Array.isArray(course?.lessons) && course.lessons.length > 0) {
    allLessons = course.lessons;
  }
  if (allLessons.length === 0 && Array.isArray(course?.modules) && course.modules.length > 0) {
    allLessons = course.modules;
  }

  const totalLessons = allLessons.length;
  const completedLessons = enrolment.completedLessons || [];

  // Count valid completed lesson indices
  const validDone = new Set();
  allLessons.forEach((l, idx) => {
    const lIdStr = l._id ? String(l._id) : null;
    const isIdDone = lIdStr && completedLessons.some(k => String(k) === lIdStr);
    const isIdxDone = completedLessons.some(k => String(k) === String(idx));
    const items = l.items || l.contentItems || [];
    const isItemDone = items.length > 0 && items.some(item => completedLessons.some(k => String(k) === String(item._id)));

    if (isIdDone || isIdxDone || isItemDone) {
      validDone.add(idx);
    }
  });

  const completedCount = validDone.size;

  let progressPct = 0;
  if (totalLessons > 0) {
    if (completedCount >= totalLessons) {
      progressPct = 100;
    } else if (completedCount > 0) {
      progressPct = Math.min(Math.round((completedCount / totalLessons) * 100), 99);
    } else {
      progressPct = 0;
    }
  } else {
    // If course curriculum details are not yet populated in the object
    if (enrolment.status === 'completed' || enrolment.progressPercentage === 100) {
      progressPct = 100;
    } else {
      progressPct = Number(enrolment.progressPercentage) || 0;
    }
  }

  // Strict classification rule:
  // 0% -> Not Started
  // >0% and <100% -> Enrolled
  // 100% -> Completed
  let category = 'not_started';
  if (progressPct === 100) {
    category = 'completed';
  } else if (progressPct > 0) {
    category = 'enrolled';
  }

  return {
    course,
    progressPct,
    category,
    completedCount,
    totalLessons: Math.max(totalLessons, 1),
    lessons: allLessons,
    validDone
  };
};

export const MyLearningSection = ({
  enrolments = [],
  onNavigateToCourse,
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
        <div className="tab-empty-state">
          <p className="tab-empty-text">No courses in progress.</p>
          {notStartedCourses.length > 0 ? (
            <button
              type="button"
              className="btn-tab-empty-action"
              onClick={() => setActiveTab('not_started')}
            >
              Start a course ({notStartedCourses.length} waiting)
            </button>
          ) : (
            <button
              type="button"
              className="btn-tab-empty-action"
              onClick={onExploreCourses}
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
        <div className="tab-empty-state">
          <p className="tab-empty-text">You haven't completed any courses yet.</p>
          <p className="tab-empty-subtext">Keep learning! Every module completed brings you closer to your certificate.</p>
          {enrolledCourses.length > 0 && (
            <button
              type="button"
              className="btn-tab-empty-action"
              onClick={() => setActiveTab('enrolled')}
            >
              Continue your courses in progress
            </button>
          )}
        </div>
      );
    }

    // not_started
    return (
      <div className="tab-empty-state">
        <p className="tab-empty-text">No courses waiting to be started.</p>
        <button
          type="button"
          className="btn-tab-empty-action"
          onClick={onExploreCourses}
        >
          <Sparkles size={16} />
          <span>Explore new courses to enroll</span>
        </button>
      </div>
    );
  };

  return (
    <section className="my-learning-section" aria-label="My Learning Courses">
      {/* Section Header with Tabs */}
      <div className="my-learning-header">
        <h2 className="my-learning-title">My Learning</h2>

        <div className="my-learning-tabs-list" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'enrolled'}
            className={`my-learning-tab ${activeTab === 'enrolled' ? 'active' : ''}`}
            onClick={() => setActiveTab('enrolled')}
          >
            <span>Enrolled</span>
            <span className="tab-count-badge">({enrolledCourses.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'completed'}
            className={`my-learning-tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            <span>Completed</span>
            <span className="tab-count-badge">({completedCourses.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'not_started'}
            className={`my-learning-tab ${activeTab === 'not_started' ? 'active' : ''}`}
            onClick={() => setActiveTab('not_started')}
          >
            <span>Not Started</span>
            <span className="tab-count-badge">({notStartedCourses.length})</span>
          </button>
        </div>
      </div>

      {/* Course Rows List */}
      {loading ? (
        <div className="my-learning-loading">Loading courses...</div>
      ) : displayedCourses.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="course-list-container" role="list">
          {displayedCourses.map((enrolment) => {
            const { course, progressPct, category, completedCount, totalLessons, lessons, validDone } = enrolment.computed;
            const courseId = course._id || enrolment._id;
            const isMenuOpen = openMenuCourseId === courseId;
            const isExpanded = expandedCourseId === courseId;

            // Determine button label
            let buttonLabel = 'Continue';
            if (category === 'not_started') {
              buttonLabel = 'Start';
            } else if (category === 'completed') {
              buttonLabel = 'Review Course';
            }

            return (
              <div key={enrolment._id || courseId} className="course-row-wrapper" role="listitem">
                <div className="course-list-row">
                  {/* Thumbnail / Icon */}
                  <div
                    className="course-row-thumb-wrap"
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
                      className="course-row-thumb"
                    />
                  </div>

                  {/* Title */}
                  <div className="course-row-title-wrap">
                    <h3
                      className="course-row-title"
                      title={course.title}
                      onClick={() => onNavigateToCourse && onNavigateToCourse(course._id)}
                    >
                      {course.title}
                    </h3>
                  </div>

                  {/* Progress Bar & Percentage */}
                  <div className="course-row-progress-wrap">
                    <div className="course-row-progress-track" aria-label={`Progress: ${progressPct}%`}>
                      <div
                        className={`course-row-progress-fill ${progressPct === 100 ? 'complete' : ''}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="course-row-pct-text">{progressPct}%</span>
                  </div>

                  {/* Primary Action Button */}
                  <div className="course-row-action-wrap">
                    <button
                      type="button"
                      className={`btn-row-action btn-row-${category}`}
                      onClick={() => handleActionClick(enrolment)}
                      aria-label={`${buttonLabel} ${course.title}`}
                    >
                      {buttonLabel}
                    </button>
                  </div>

                  {/* Overflow Menu Button */}
                  <div className="course-row-menu-wrap">
                    <button
                      type="button"
                      className="btn-overflow-trigger"
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

                    {/* Popover Dropdown Menu */}
                    {isMenuOpen && (
                      <>
                        <div
                          className="overflow-menu-backdrop"
                          onClick={() => setOpenMenuCourseId(null)}
                        />
                        <div className="overflow-menu-dropdown" role="menu">
                          <button
                            type="button"
                            className="overflow-menu-item"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuCourseId(null);
                              onNavigateToCourse && onNavigateToCourse(course._id);
                            }}
                          >
                            <ExternalLink size={15} />
                            <span>Go to Course Page</span>
                          </button>

                          <button
                            type="button"
                            className="overflow-menu-item"
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
                              className="overflow-menu-item"
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
                  <div className="row-accordion-panel">
                    <div className="accordion-panel-header">
                      <span className="accordion-panel-title">
                        Modules Breakdown ({completedCount}/{totalLessons})
                      </span>
                      <button
                        type="button"
                        className="btn-close-accordion"
                        onClick={() => toggleAccordion(courseId)}
                        aria-label="Collapse modules"
                      >
                        <ChevronUp size={16} />
                      </button>
                    </div>

                    <div className="accordion-lessons-list">
                      {lessons.map((lesson, idx) => {
                        const isDone = validDone.has(idx) || (enrolment.completedLessons || []).includes(idx);
                        return (
                          <div key={idx} className="accordion-lesson-item">
                            <span className={`lesson-item-title ${isDone ? 'done' : ''}`}>
                              {lesson.title || `Module ${idx + 1}`}
                            </span>
                            {onLessonComplete && (
                              <button
                                type="button"
                                className={`btn-lesson-status ${isDone ? 'done' : ''}`}
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
    </section>
  );
};

export default MyLearningSection;

