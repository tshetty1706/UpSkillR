import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LearnerSidebar } from '../../components/learner/sidebar/LearnerSidebar';
import { LearnerTopNav } from '../../components/learner/dashboard/LearnerTopNav';
import { LearnerDashboardView } from '../../components/learner/dashboard/LearnerDashboardView';
import { LearnerMyLearningView } from '../../components/learner/mylearning/LearnerMyLearningView';
import { LearnerBookmarksView } from '../../components/learner/bookmarks/LearnerBookmarksView';
import { LearnerAchievementsView } from '../../components/learner/achievements/LearnerAchievementsView';
import { LearnerFeedbackView } from '../../components/learner/feedback/LearnerFeedbackView';
import { LearnerExploreView } from '../../components/learner/explore/LearnerExploreView';
import { LearnerProfile } from '../../components/learner/profile/LearnerProfile';
import { CourseRatingModal } from '../../components/learner/dashboard/LearnerDashboardOverview/CourseRatingModal';
import { LogoutModal } from '../../components/common/LogoutModal/LogoutModal';
import { useToast } from '../../context/ToastContext';
import { API_BASE } from '../../config/api';
import './LearnerDashboard.css';

export const LearnerDashboard = ({ user }) => {
  const { toast } = useToast();

  // Determine initial view from current browser URL
  const getInitialView = () => {
    const p = (window.location.pathname || '').toLowerCase();
    if (p.includes('/my-learning')) return 'my-learning';
    if (p.includes('/bookmarks')) return 'bookmarks';
    if (p.includes('/achievements')) return 'achievements';
    if (p.includes('/feedback')) return 'feedback';
    if (p.includes('/explore')) return 'explore';
    if (p.includes('/profile')) return 'profile';
    if (p.includes('/dashboard')) return 'dashboard';
    return 'dashboard';
  };

  const [activeView, setActiveView] = useState(getInitialView);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [enrolments, setEnrolments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gamification, setGamification] = useState({
    points: 0,
    currentStreak: 0,
    longestStreak: 0
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [ratingModalCourse, setRatingModalCourse] = useState(null);

  // Normalize initial route to /learner/dashboard if hitting /learner or /dashboard
  useEffect(() => {
    const p = (window.location.pathname || '').toLowerCase();
    if (p === '/learner' || p === '/dashboard') {
      window.history.replaceState({}, '', '/learner/dashboard');
    }
  }, []);

  // Sync active view with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setActiveView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch enrolled courses
  const fetchMyEnrolments = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE}/courses/learner/my-enrolments`, {
        headers,
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.enrolments)) {
        setEnrolments(data.enrolments);
      }
    } catch (err) {
      console.error('Failed to fetch enrolments:', err);
    }
  }, []);

  // Fetch genuine gamification stats
  const fetchGamificationData = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('upskillr_token');
      if (!token) return;

      const res = await fetch(`${API_BASE}/learners/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setGamification({
          points: data.stats.totalPoints || 0,
          currentStreak: data.stats.currentStreak || 0,
          longestStreak: data.stats.longestStreak || 0
        });
      }
    } catch (err) {
      console.error('Failed to load gamification data:', err);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchMyEnrolments(), fetchGamificationData()]);
    setLoading(false);
  }, [fetchMyEnrolments, fetchGamificationData]);

  useEffect(() => {
    fetchDashboardData();

    const handlePointsUpdate = () => fetchGamificationData();
    window.addEventListener('upskillr_points_updated', handlePointsUpdate);
    return () => window.removeEventListener('upskillr_points_updated', handlePointsUpdate);
  }, [fetchDashboardData, fetchGamificationData]);

  // Compute the single most recently viewed course strictly from actual user activity
  const recentlyViewedCourse = useMemo(() => {
    if (!enrolments || enrolments.length === 0) return null;

    // Filter enrolments that have a valid courseId
    const validEnrolments = enrolments.filter((e) => e.courseId);
    if (validEnrolments.length === 0) return null;

    // Sort by lastAccessedAt descending, fallback to enrolledAt
    const sorted = [...validEnrolments].sort((a, b) => {
      const timeA = new Date(a.lastAccessedAt || a.enrolledAt || 0).getTime();
      const timeB = new Date(b.lastAccessedAt || b.enrolledAt || 0).getTime();
      return timeB - timeA;
    });

    return sorted[0] || null;
  }, [enrolments]);

  // View Navigation Handler
  const handleSelectView = (viewId, path) => {
    setActiveView(viewId);
    setIsMobileSidebarOpen(false);
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Navigate to dedicated course learning page (/learn/:courseId)
  const handleNavigateToCourse = async (courseId) => {
    const targetId = typeof courseId === 'object' ? courseId?._id : courseId;
    if (!targetId) return;

    // Record course access in backend
    try {
      const token = sessionStorage.getItem('upskillr_token');
      if (token) {
        fetch(`${API_BASE}/courses/${targetId}/access`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ courseId: targetId })
        }).catch(() => {});
      }
    } catch (e) {}

    const path = `/learn/${targetId}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  };

  // Navigate to course details overview page (/courses/:courseId)
  const handleViewCourseOverview = (courseId) => {
    const targetId = typeof courseId === 'object' ? courseId?._id : courseId;
    if (!targetId) return;
    const path = `/courses/${targetId}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  };

  // Enroll in a course (Single Action with Toast & State Update)
  const handleEnrolCourse = async (courseId) => {
    const token = sessionStorage.getItem('upskillr_token');
    toast.success('🎉 Enrolled successfully! Course added to My Learning.');

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/courses/enrol`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ courseId })
      });
      const data = await res.json();
      if (data.success) {
        await fetchMyEnrolments();
        window.dispatchEvent(new Event('upskillr_points_updated'));
      }
    } catch (err) {
      console.error('Error enrolling in course:', err);
    }
  };

  // Lesson Module Completion Handler
  const handleLessonComplete = async (courseId, lessonIndex) => {
    const token = sessionStorage.getItem('upskillr_token');

    // Optimistic local update
    setEnrolments((prev) =>
      prev.map((enrol) => {
        const id = typeof enrol.courseId === 'object' ? enrol.courseId?._id : enrol.courseId;
        if (id === courseId) {
          const completed = enrol.completedLessons || [];
          const exists = completed.includes(lessonIndex);
          const updated = exists
            ? completed.filter((i) => i !== lessonIndex)
            : [...completed, lessonIndex];

          const lessons = (enrol.courseId?.lessons && enrol.courseId.lessons.length > 0)
            ? enrol.courseId.lessons
            : (enrol.courseId?.modules && enrol.courseId.modules.length > 0)
            ? enrol.courseId.modules
            : [];
          const total = Math.max(lessons.length, 1);
          const newPct = Math.min(Math.round((updated.length / total) * 100), 100);

          if (newPct === 100 && enrol.progressPercentage !== 100) {
            toast.success('🏆 Congratulations! You completed this course! Rate & Review is unlocked.');
          }

          return {
            ...enrol,
            completedLessons: updated,
            progressPercentage: newPct,
            status: newPct === 100 ? 'completed' : updated.length > 0 ? 'in_progress' : 'active'
          };
        }
        return enrol;
      })
    );

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/courses/progress`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ courseId, lessonIndex })
      });
      const data = await res.json();
      if (data.success) {
        if (data.pointsAwarded > 0) {
          toast.success(`⭐ +${data.pointsAwarded} Points awarded!`);
        }
        window.dispatchEvent(new Event('upskillr_points_updated'));
      }
    } catch (err) {
      console.error('Error completing lesson:', err);
    }
  };

  // Submit Course Rating
  const handleRatingSubmit = async (courseId, ratingData) => {
    const token = sessionStorage.getItem('upskillr_token');
    toast.success('⭐ Rating and review submitted! Thank you.');

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/courses/rate`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          courseId,
          rating: ratingData.rating,
          feedback: ratingData.feedback,
          tags: ratingData.tags
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchMyEnrolments();
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {}

    sessionStorage.removeItem('upskillr_token');
    sessionStorage.removeItem('upskillr_user');
    localStorage.removeItem('upskillr_token');
    localStorage.removeItem('upskillr_user');

    window.history.pushState({}, '', '/');
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/' } }));
  };

  return (
    <div className="learner-dashboard-root">
      {/* 1. Compact Top Navigation Bar (NO SEARCH BAR) */}
      <LearnerTopNav
        user={user}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        onNavigateProfile={() => handleSelectView('profile', '/learner/profile')}
        onLogoutClick={() => setShowLogoutModal(true)}
        onLogoClick={() => handleSelectView('dashboard', '/learner/dashboard')}
        onNavigateToCourse={handleNavigateToCourse}
      />

      <div className="learner-dashboard-workspace">
        {/* 2. Collapsible Left Sidebar (6 navigation items + profile) */}
        <LearnerSidebar
          activeView={activeView}
          onSelectView={handleSelectView}
          user={user}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* 3. Main Content Views (Distinct Pages) */}
        <main className="learner-main-content">
          <div className="learner-content-container">
            {/* PAGE A: DASHBOARD (/learner/dashboard) */}
            {activeView === 'dashboard' && (
              <LearnerDashboardView
                user={user}
                enrolments={enrolments}
                recentlyViewedCourse={recentlyViewedCourse}
                onNavigateToCourse={handleNavigateToCourse}
                onSelectView={handleSelectView}
                loading={loading}
              />
            )}

            {/* PAGE B: MY LEARNING (/learner/my-learning) */}
            {activeView === 'my-learning' && (
              <LearnerMyLearningView
                enrolments={enrolments}
                onNavigateToCourse={handleNavigateToCourse}
                onViewCourseDetails={handleViewCourseOverview}
                onLessonComplete={handleLessonComplete}
                onRateCourse={(course) => setRatingModalCourse(course)}
                onExploreCourses={() => handleSelectView('explore', '/learner/explore')}
                loading={loading}
              />
            )}

            {/* Bookmarks Page */}
            {activeView === 'bookmarks' && (
              <LearnerBookmarksView
                onNavigate={(path) => {
                  window.history.pushState({}, '', path);
                  window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
                }}
                onExploreCourses={() => handleSelectView('explore', '/learner/explore')}
              />
            )}

            {/* Achievements Page */}
            {activeView === 'achievements' && (
              <LearnerAchievementsView
                gamification={gamification}
                enrolments={enrolments}
              />
            )}

            {/* My Feedback Page */}
            {activeView === 'feedback' && (
              <LearnerFeedbackView
                onNavigateToCourse={handleNavigateToCourse}
                onExploreCourses={() => handleSelectView('explore', '/learner/explore')}
              />
            )}

            {/* Explore Courses Page */}
            {activeView === 'explore' && (
              <LearnerExploreView
                enrolments={enrolments}
                onEnrolCourse={handleEnrolCourse}
                onNavigateToCourse={handleViewCourseOverview}
              />
            )}

            {/* Dedicated Profile Page */}
            {activeView === 'profile' && (
              <LearnerProfile user={user} />
            )}
          </div>
        </main>
      </div>

      {/* Course Rating Modal */}
      {ratingModalCourse && (
        <CourseRatingModal
          isOpen={Boolean(ratingModalCourse)}
          course={ratingModalCourse}
          initialRating={ratingModalCourse.rating}
          onClose={() => setRatingModalCourse(null)}
          onSubmit={(courseId, ratingData) => {
            handleRatingSubmit(courseId || ratingModalCourse._id, ratingData);
            setRatingModalCourse(null);
          }}
        />
      )}

      {/* Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};

export default LearnerDashboard;
