import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Award,
  Play,
  Star,
  Users,
  Download,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  X
} from 'lucide-react';
import { Avatar } from '../../components/common/Avatar/Avatar';
import { CourseThumbnail } from '../../components/common/CourseThumbnail';
import { CourseRatingModal } from '../../components/learner/dashboard/LearnerDashboardOverview/CourseRatingModal';
import { useToast } from '../../context/ToastContext';
import { API_BASE } from '../../config/api';
import './CourseLearningPage.css';

export const CourseLearningPage = ({ courseId, user = null }) => {
  const { toast } = useToast();

  const [course, setCourse] = useState(null);
  const [enrolment, setEnrolment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);

  // 1. Fetch Course Data & Learner Progress
  const fetchCourseData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);

    const token = sessionStorage.getItem('upskillr_token');
    const authHeaders = {};
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;

    try {
      // 1. Fetch Course Structure & Content
      const courseRes = await fetch(`${API_BASE}/courses/public/${courseId}`, {
        headers: authHeaders
      });
      const courseData = await courseRes.json();

      if (!courseData.success || !courseData.course) {
        setError(courseData.message || 'Course content could not be loaded.');
        setLoading(false);
        return;
      }
      setCourse(courseData.course);

      // 2. Fetch Learner Enrollment & Progress
      if (token) {
        try {
          const progressRes = await fetch(`${API_BASE}/courses/${courseId}/progress`, {
            headers: authHeaders
          });
          const progressData = await progressRes.json();
          if (progressData.success && progressData.enrolment) {
            setEnrolment(progressData.enrolment);
          }
        } catch (e) {
          console.warn('Progress fetch notice:', e);
        }

        // 3. Record course access timestamp
        fetch(`${API_BASE}/courses/${courseId}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ courseId })
        }).catch(() => { });
      }
    } catch (err) {
      console.error('Error fetching course:', err);
      setError('Unable to load course. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    fetchCourseData();
  }, [fetchCourseData]);

  // 2. Normalize Course Curriculum Tree
  const modulesList = useMemo(() => {
    if (!course) return [];
    const rawModules = Array.isArray(course.modules) && course.modules.length > 0
      ? course.modules
      : [];

    if (rawModules.length > 0) {
      return rawModules.map((mod, mIdx) => {
        const rawLessons = Array.isArray(mod.lessons) ? mod.lessons : [];
        return {
          _id: mod._id || `module-${mIdx}`,
          title: mod.title || `Module ${mIdx + 1}`,
          description: mod.description || '',
          lessons: rawLessons.map((les, lIdx) => ({
            _id: les._id || `lesson-${mIdx}-${lIdx}`,
            title: les.title || `Lesson ${mIdx + 1}.${lIdx + 1}`,
            duration: les.duration || '10 min',
            type: les.type || 'video',
            video: les.video || null,
            items: les.items || []
          }))
        };
      });
    }

    return [{
      _id: 'default-mod-0',
      title: 'Module 1: Course Curriculum',
      description: 'Comprehensive curriculum modules',
      lessons: [
        {
          _id: 'lesson-0-0',
          title: 'Lesson 1.1: Foundations and Architecture',
          duration: '15 min',
          type: 'video'
        }
      ]
    }];
  }, [course]);

  // Total lessons count
  const totalLessonsCount = useMemo(() => {
    return modulesList.reduce((sum, mod) => sum + (mod.lessons ? mod.lessons.length : 0), 0) || 1;
  }, [modulesList]);

  // Check if a lesson is completed
  const isLessonCompleted = useCallback((mIdx, lIdx, lesson) => {
    if (!enrolment || !enrolment.completedLessons) return false;
    const completedList = enrolment.completedLessons.map(String);
    if (lesson?._id && completedList.includes(String(lesson._id))) return true;
    if (lesson?.items && lesson.items.some((i) => completedList.includes(String(i._id)))) return true;
    const combinedKey = `${mIdx}-${lIdx}`;
    if (completedList.includes(combinedKey)) return true;
    return false;
  }, [enrolment]);

  // Total completed lessons count
  const completedLessonsCount = useMemo(() => {
    let count = 0;
    modulesList.forEach((mod, mIdx) => {
      (mod.lessons || []).forEach((les, lIdx) => {
        if (isLessonCompleted(mIdx, lIdx, les)) {
          count += 1;
        }
      });
    });
    return count;
  }, [modulesList, isLessonCompleted]);

  // Progress Percentage
  const progressPct = useMemo(() => {
    if (!enrolment) return 0;
    if (totalLessonsCount > 0) {
      if (completedLessonsCount >= totalLessonsCount) return 100;
      return Math.min(Math.round((completedLessonsCount / totalLessonsCount) * 100), 99);
    }
    if (enrolment.status === 'completed' || enrolment.progressPercentage === 100) return 100;
    return Number(enrolment.progressPercentage) || 0;
  }, [enrolment, completedLessonsCount, totalLessonsCount]);

  // Resume lesson item
  const resumeLessonItem = useMemo(() => {
    for (let mIdx = 0; mIdx < modulesList.length; mIdx++) {
      const mod = modulesList[mIdx];
      for (let lIdx = 0; lIdx < (mod.lessons || []).length; lIdx++) {
        const les = mod.lessons[lIdx];
        if (!isLessonCompleted(mIdx, lIdx, les)) {
          return { moduleIdx: mIdx, lessonIdx: lIdx, lesson: les };
        }
      }
    }
    const firstMod = modulesList[0];
    const firstLes = firstMod?.lessons?.[0];
    return firstLes ? { moduleIdx: 0, lessonIdx: 0, lesson: firstLes } : null;
  }, [modulesList, isLessonCompleted]);

  // Navigation Handlers
  const handleBackToMyLearning = () => {
    window.history.pushState({}, '', '/learner/dashboard');
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/learner/dashboard' } }));
  };

  const handleContinueLearningClick = () => {
    let navPath = `/learn/${courseId}`;
    if (resumeLessonItem) {
      navPath = `/learn/${courseId}?module=${resumeLessonItem.moduleIdx}&lesson=${resumeLessonItem.lessonIdx}`;
    }
    window.history.pushState({}, '', navPath);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: navPath } }));
  };

  const handleGetCertificateClick = () => {
    if (progressPct >= 100 || (enrolment && enrolment.status === 'completed')) {
      setIsCertificateOpen(true);
    } else {
      toast.info(`Complete 100% of the course to unlock your official certificate! Current: ${progressPct}%`);
    }
  };

  // Instructor Details Formatting
  const instructorName = course?.instructor?.name || course?.instructorName || 'Joy Arthur';
  const instructorAvatar = course?.instructor?.avatar || course?.instructor?.profilePicture;
  const instructorDesignation = course?.instructor?.designation || course?.instructorTitle || 'Senior Software Engineer';

  const formatCount = (num) => {
    if (!num) return '1,200';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  // Loading View
  if (loading) {
    return (
      <div className="course-learning-loading-state">
        <div className="learning-loading-spinner-box">
          <div className="loading-orbit-spinner" />
          <p>Loading course overview...</p>
        </div>
      </div>
    );
  }

  // Error View
  if (error || !course) {
    return (
      <div className="course-learning-error-screen">
        <div className="learning-error-card">
          <AlertCircle size={44} className="error-badge-icon" />
          <h2>Course Unavailable</h2>
          <p>{error || 'The requested course could not be found.'}</p>
          <div className="error-actions-btns">
            <button
              type="button"
              className="btn btn-primary"
              onClick={fetchCourseData}
              style={{ minHeight: '44px' }}
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleBackToMyLearning}
              style={{ minHeight: '44px' }}
            >
              <ArrowLeft size={16} />
              <span>Return to My Learning</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="course-learning-page-container">
      {/* ─── FULL-SCREEN COURSE OVERVIEW HERO SECTION ─── */}
      <section className="learning-hero-banner full-screen-hero" aria-label="Course Overview Hero">
        <div className="learning-banner-inner">
          {/* Top Left Navigation Back to My Learning */}
          <div className="banner-top-nav-row">
            <button
              type="button"
              className="btn-back-learning"
              onClick={handleBackToMyLearning}
              aria-label="Back to My Learning"
            >
              <ArrowLeft size={16} />
              <span>Back to My Learning</span>
            </button>
          </div>

          <div className="banner-main-grid">
            {/* Left Column: Course Details, Instructor & Progress */}
            <div className="banner-info-column">
              <h1 className="banner-course-title" title={course.title}>
                {course.title}
              </h1>

              <p className="banner-course-desc">
                {course.shortDescription ||
                  course.description ||
                  'Build modern, production-ready skills with hands-on projects, real-world examples, and industry best practices.'}
              </p>

              {/* Instructor Badge & Metadata Row */}
              <div className="banner-meta-row">
                <div className="banner-instructor-badge">
                  <Avatar
                    image={instructorAvatar}
                    name={instructorName}
                    size="small"
                    className="banner-instructor-avatar"
                  />
                  <div className="banner-instructor-info">
                    <span className="banner-instructor-name">{instructorName}</span>
                    <span className="banner-instructor-role">{instructorDesignation}</span>
                  </div>
                </div>

                <div className="banner-meta-chips">
                  {/* Rating */}
                  <span className="meta-chip rating-chip">
                    <Star size={14} className="star-fill" />
                    <span>{course.rating ? course.rating.toFixed(1) : '4.8'}</span>
                    <span className="meta-count">({course.reviewCount || '320'})</span>
                  </span>

                  {/* Learners Count */}
                  <span className="meta-chip learners-chip">
                    <Users size={14} />
                    <span>{formatCount(course.learnersCount || 1200)} learners</span>
                  </span>

                  {/* Skill Level */}
                  <span className="meta-chip level-chip">
                    {course.skillLevel || 'Intermediate'}
                  </span>
                </div>
              </div>

              {/* Progress Summary on Banner */}
              <div className="banner-progress-block">
                <div className="banner-progress-bar-wrap" aria-label={`Progress: ${progressPct}%`}>
                  <div
                    className="banner-progress-bar-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="banner-progress-stats-text">
                  <span className="progress-percent-bold">{progressPct}% complete</span>
                  <span className="progress-count-sub">
                    Completed {completedLessonsCount} of {totalLessonsCount} contents
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Course Graphic & Action Controls */}
            <div className="banner-visual-column">
              {/* Laptop / Course Graphic Frame */}
              <div className="banner-device-frame">
                <CourseThumbnail
                  src={course?.thumbnail}
                  alt={course?.title || 'Course Thumbnail'}
                  className="banner-device-img"
                />
              </div>

              {/* Action Buttons Row */}
              <div className="banner-action-buttons-group">
                {/* Single Primary Prominent Go to Learning Workspace Button */}
                <button
                  type="button"
                  className="btn-banner-continue-primary"
                  onClick={handleContinueLearningClick}
                  aria-label="Go to Learning Workspace"
                >
                  <div className="continue-btn-main-row">
                    <Play size={18} className="play-icon-bold" />
                    <span>Go to Learning Workspace</span>
                  </div>
                  {resumeLessonItem && (
                    <span className="continue-btn-subtext" title={resumeLessonItem.lesson.title}>
                      Resume: {resumeLessonItem.lesson.title}
                    </span>
                  )}
                </button>

                {/* Secondary Actions Row: Get Certificate & Share Feedback */}
                <div className="banner-secondary-actions-row">
                  <button
                    type="button"
                    className="btn-banner-secondary"
                    onClick={handleGetCertificateClick}
                    aria-label="Get Certificate"
                  >
                    <Award size={15} />
                    <span>Get Certificate</span>
                  </button>

                  <button
                    type="button"
                    className="btn-banner-secondary"
                    onClick={() => setIsRatingOpen(true)}
                    aria-label="Share Feedback"
                  >
                    <MessageSquare size={15} />
                    <span>Share Feedback</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MODALS ─── */}
      {/* 1. Course Rating & Feedback Modal */}
      <CourseRatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        courseTitle={course?.title || 'Course'}
        onSubmit={async (ratingData) => {
          const token = sessionStorage.getItem('upskillr_token');
          if (token) {
            try {
              await fetch(`${API_BASE}/courses/rate`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  courseId,
                  rating: ratingData.rating,
                  feedback: ratingData.feedback,
                  feedbackTags: ratingData.feedbackTags
                })
              });
              toast.success('Thank you! Your course review has been recorded.');
              setIsRatingOpen(false);
            } catch (e) {
              toast.error('Failed to submit review.');
            }
          }
        }}
      />

      {/* 2. Official Certificate Preview Modal */}
      {isCertificateOpen && (
        <div className="certificate-modal-overlay" onClick={() => setIsCertificateOpen(false)}>
          <div
            className="certificate-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cert-title"
          >
            <div className="cert-modal-header">
              <h3 id="cert-title">Official Certificate of Completion</h3>
              <button
                type="button"
                className="btn-cert-close"
                onClick={() => setIsCertificateOpen(false)}
                aria-label="Close certificate modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="certificate-document-canvas">
              <div className="cert-canvas-border">
                <div className="cert-seal-badge">
                  <Award size={36} className="cert-award-icon" />
                </div>
                <span className="cert-brand-heading">UpSkillR Verified Certificate</span>
                <p className="cert-presents-text">This certifies that</p>
                <h2 className="cert-learner-name">{user?.fullName || user?.name || enrolment?.learnerName || 'Learner'}</h2>
                <p className="cert-body-p">has successfully completed the comprehensive course curriculum for</p>
                <h3 className="cert-course-name">{course.title}</h3>
                <div className="cert-footer-meta">
                  <div className="cert-date-col">
                    <span className="meta-lbl">Date of Completion</span>
                    <span className="meta-val">
                      {new Date(enrolment?.completedAt || Date.now()).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="cert-id-col">
                    <span className="meta-lbl">Credential ID</span>
                    <span className="meta-val">UPSKILLR-{courseId.slice(-6).toUpperCase()}-{user?._id?.slice(-4) || 'VERIF'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="cert-modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => window.print()}
                style={{ minHeight: '44px' }}
              >
                <Download size={16} />
                <span>Print / Save PDF</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsCertificateOpen(false)}
                style={{ minHeight: '44px' }}
              >
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseLearningPage;
