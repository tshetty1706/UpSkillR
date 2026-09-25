import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { CourseOverviewTemplate } from '../../components/instructor/courses/courseCreation/OverviewTemplate/CourseOverviewTemplate';
import './CourseOverviewPage.css';

export const CourseOverviewPage = ({ courseId, user = null }) => {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (courseId) {
      fetchCourseOverview();
      checkEnrollmentStatus();
    }
  }, [courseId]);

  const fetchCourseOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/courses/public/${courseId}/overview`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.message || 'Course not found or unavailable.');
      }
    } catch (err) {
      console.error('Error fetching course overview:', err);
      setError('Unable to load course overview. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = async () => {
    const token = sessionStorage.getItem('upskillr_token');
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/courses/learner/my-enrolments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.enrolments)) {
        const found = json.enrolments.some((e) => {
          const id = typeof e.courseId === 'object' ? e.courseId?._id : e.courseId;
          return String(id) === String(courseId);
        });
        setIsEnrolled(found);
      }
    } catch (err) {
      console.error('Error checking enrolments:', err);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.history.pushState({}, '', '/courses');
      window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/courses' } }));
    }
  };

  const handleNavigateCourses = () => {
    window.history.pushState({}, '', '/courses');
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/courses' } }));
  };

  const handleEnroll = async () => {
    const token = sessionStorage.getItem('upskillr_token');
    if (!token) {
      toast.warning('Please log in as a Learner to enroll in this course.');
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/login' } }));
      return;
    }

    setEnrolling(true);
    try {
      const res = await fetch('http://localhost:5000/api/courses/enrol', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ courseId })
      });
      const json = await res.json();
      if (json.success) {
        setIsEnrolled(true);
        toast.success(json.message || `Successfully enrolled in ${data?.course?.title || 'course'}!`);
      } else {
        toast.error(json.message || 'Enrollment failed.');
      }
    } catch (err) {
      toast.error('Error during enrollment. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleAskQuestion = async (questionText) => {
    const token = sessionStorage.getItem('upskillr_token');
    if (!token) {
      toast.warning('Please log in as a learner to ask a doubt.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/courses/${courseId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question: questionText })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Your doubt has been submitted to the instructor!');
        fetchCourseOverview();
      } else {
        toast.error(json.message || 'Failed to submit question.');
      }
    } catch (err) {
      toast.error('Error submitting question. Please try again.');
    }
  };

  return (
    <div className="course-overview-page-wrapper">
      {/* Top Navigation / Breadcrumbs Bar */}
      <nav className="course-overview-top-nav" aria-label="Course Overview Navigation">
        <div className="course-overview-nav-container">
          <button
            type="button"
            className="overview-back-btn"
            onClick={handleBack}
            aria-label="Go back to previous page"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <div className="overview-breadcrumbs">
            <button
              type="button"
              className="breadcrumb-link"
              onClick={handleNavigateCourses}
            >
              Courses
            </button>
            <ChevronRight size={14} className="breadcrumb-separator" />
            {data?.course?.category && (
              <>
                <span className="breadcrumb-item breadcrumb-category">
                  {data.course.category}
                </span>
                <ChevronRight size={14} className="breadcrumb-separator" />
              </>
            )}
            <span className="breadcrumb-item breadcrumb-current" title={data?.course?.title}>
              {loading ? 'Loading course...' : data?.course?.title || 'Course Details'}
            </span>
          </div>
        </div>
      </nav>

      {/* Loading Skeleton State */}
      {loading && (
        <div className="course-overview-loading-state">
          <div className="overview-loading-hero-skeleton">
            <div className="container-loading">
              <div className="skeleton-pill" />
              <div className="skeleton-title" />
              <div className="skeleton-desc" />
              <div className="skeleton-meta" />
            </div>
          </div>
          <div className="overview-loading-body-skeleton">
            <div className="skeleton-main-content">
              <div className="skeleton-box" style={{ height: '140px' }} />
              <div className="skeleton-box" style={{ height: '220px' }} />
              <div className="skeleton-box" style={{ height: '180px' }} />
            </div>
            <div className="skeleton-sidebar-content">
              <div className="skeleton-card" style={{ height: '380px' }} />
            </div>
          </div>
        </div>
      )}

      {/* Error / Not Found State */}
      {!loading && error && (
        <div className="course-overview-error-state section">
          <div className="container error-container-box">
            <div className="error-icon-wrap">
              <AlertCircle size={44} />
            </div>
            <h2>Course Not Found</h2>
            <p>{error}</p>
            <div className="error-actions-row">
              <button
                type="button"
                className="btn btn-outline"
                onClick={fetchCourseOverview}
              >
                <RefreshCw size={16} />
                <span>Retry</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNavigateCourses}
              >
                <BookOpen size={16} />
                <span>Explore All Courses</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Page Course Overview Content */}
      {!loading && !error && data && (
        <CourseOverviewTemplate
          course={data.course}
          overview={data.overview}
          instructor={data.instructor}
          stats={data.stats}
          reviews={data.reviews}
          questions={data.questions}
          onAskQuestion={handleAskQuestion}
          onEnroll={handleEnroll}
          isEnrolled={isEnrolled}
          enrolling={enrolling}
          isPreviewMode={false}
          user={user}
        />
      )}
    </div>
  );
};

export default CourseOverviewPage;
