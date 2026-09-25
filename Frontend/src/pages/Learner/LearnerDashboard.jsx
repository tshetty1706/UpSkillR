import React, { useState, useEffect } from 'react';
import { BookOpen, Sun, Moon, LogOut, Compass, User, LayoutDashboard } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { LearnerDashboardOverview } from '../../components/learner/dashboard/LearnerDashboardOverview/LearnerDashboardOverview';
import { LearnerProfile } from '../../components/learner/profile/LearnerProfile';
import { NotificationBell } from '../../components/common/NotificationBell/NotificationBell';
import { LogoutModal } from '../../components/common/LogoutModal/LogoutModal';
import '../../components/learner/dashboard/LearnerDashboardOverview/LearnerDashboardOverview.css';

export const LearnerDashboard = ({ user }) => {
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const { toast } = useToast();
  const [enrolments, setEnrolments] = useState([]);
  const [publishedCourses, setPublishedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('enrolled');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) { }
    sessionStorage.removeItem('upskillr_token');
    sessionStorage.removeItem('upskillr_user');
    localStorage.removeItem('upskillr_token');
    localStorage.removeItem('upskillr_user');
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/' } }));
  };

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    await Promise.all([fetchMyEnrolments(), fetchPublishedCourses()]);
    setLoading(false);
  };

  const fetchMyEnrolments = async () => {
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch('http://localhost:5000/api/courses/learner/my-enrolments', {
        headers,
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setEnrolments(data.enrolments || []);
      }
    } catch (err) {
      console.error('Failed to fetch enrolments', err);
    }
  };

  const fetchPublishedCourses = async (search = '', category = 'All', level = 'All') => {
    try {
      const params = new URLSearchParams();
      if (search && search.trim()) params.append('search', search.trim());
      if (category && category !== 'All') params.append('category', category);
      if (level && level !== 'All') params.append('level', level);

      const queryString = params.toString();
      const url = `http://localhost:5000/api/courses/published${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setPublishedCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Failed to fetch published courses', err);
    }
  };

  // FR-06 Single Action Enrolment Handler
  const handleEnrolCourse = async (courseId) => {
    const token = sessionStorage.getItem('upskillr_token');
    const courseToEnrol = publishedCourses.find(c => c._id === courseId);

    // Optimistically update enrolments state for instant UI transition to "Enrolled — Go to Course"
    const isAlreadyEnrolled = enrolments.some(e => (e.courseId?._id || e.courseId) === courseId);
    if (!isAlreadyEnrolled && courseToEnrol) {
      const optimisticEnrolment = {
        _id: 'enrol_' + Date.now(),
        courseId: courseToEnrol,
        courseTitle: courseToEnrol.title,
        completedLessons: [],
        progressPercentage: 0,
        enrolledAt: new Date()
      };
      setEnrolments(prev => [optimisticEnrolment, ...prev]);
    }

    // Trigger floating toast notification banner (FR-06 requirement)
    toast.success('🎉 Enrolled successfully! Start learning now.');

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch('http://localhost:5000/api/courses/enrol', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ courseId })
      });
      const data = await response.json();
      if (data.success) {
        await fetchMyEnrolments();
        window.dispatchEvent(new Event('upskillr_points_updated'));
      }
    } catch (err) {
      console.error('Error enrolling in course', err);
    }
  };

  // FR-07 Lesson Completion Tracker Handler
  const handleLessonComplete = async (courseId, lessonIndex) => {
    const token = sessionStorage.getItem('upskillr_token');

    // Optimistic update state locally first
    setEnrolments(prevEnrolments => {
      return prevEnrolments.map(enrol => {
        const targetId = typeof enrol.courseId === 'object' ? enrol.courseId._id : enrol.courseId;
        if (targetId === courseId) {
          const completed = enrol.completedLessons || [];
          const exists = completed.includes(lessonIndex);
          const updatedCompleted = exists
            ? completed.filter(i => i !== lessonIndex)
            : [...completed, lessonIndex];

          const lessonsList = (enrol.courseId?.lessons && enrol.courseId.lessons.length > 0)
            ? enrol.courseId.lessons
            : (enrol.courseId?.modules && enrol.courseId.modules.length > 0)
            ? enrol.courseId.modules
            : [];
          const totalLessons = Math.max(lessonsList.length, 1);
          
          const validCompleted = Array.from(new Set(
            updatedCompleted
              .map(i => Number(i))
              .filter(n => !isNaN(n) && n >= 0 && n < totalLessons)
          ));
          const newPercentage = Math.min(Math.round((validCompleted.length / totalLessons) * 100), 100);

          if (newPercentage === 100 && enrol.progressPercentage !== 100) {
            toast.success(`🏆 Congratulations! You completed this course! Rate & Review is unlocked.`);
          }

          return {
            ...enrol,
            completedLessons: validCompleted,
            progressPercentage: Math.min(newPercentage, 100),
            status: newPercentage === 100 ? 'completed' : (validCompleted.length > 0 ? 'in_progress' : 'active')
          };
        }
        return enrol;
      });
    });

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch('http://localhost:5000/api/courses/progress', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ courseId, lessonIndex })
      });
      const resData = await response.json();
      if (resData.success) {
        if (resData.pointsAwarded > 0) {
          toast.success(`⭐ +${resData.pointsAwarded} Points awarded!`);
        }
        window.dispatchEvent(new Event('upskillr_points_updated'));
      }
    } catch (err) {
      console.error('Error completing lesson on server', err);
    }
  };

  // FR-09 Course Rating & Review Handler
  const handleRatingSubmit = async (courseId, ratingData) => {
    const token = sessionStorage.getItem('upskillr_token');
    toast.success('⭐ Rating and review submitted! Thank you.');

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch('http://localhost:5000/api/courses/rate', {
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
      const data = await response.json();
      if (data.success) {
        fetchMyEnrolments();
        fetchPublishedCourses();
      }
    } catch (err) {
      console.error('Error submitting rating to server', err);
    }
  };

  return (
    <div className="learner-dashboard-layout">
      {/* Topbar Header */}
      <header className="dashboard-topbar">
        <div className="container topbar-container">
          <a
            href="/"
            className="navbar-logo"
            onClick={(e) => { e.preventDefault(); handleNavigate('/'); }}
          >
            <div className="logo-icon-wrapper">
              <BookOpen className="logo-icon" size={24} />
            </div>
            <span className="logo-text">UpSkillR</span>
            <span className="badge-pill dashboard-badge">Student Space</span>
          </a>

          <div className="topbar-actions">
            <button
              className={`btn ${activeView === 'dashboard' && activeTab === 'enrolled' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setActiveView('dashboard'); setActiveTab('enrolled'); }}
              title="My Dashboard"
              style={{ padding: '8px 16px', minHeight: '38px', fontSize: '13.5px' }}
            >
              <LayoutDashboard size={15} />
              <span>My Learning</span>
            </button>

            <button
              className={`btn ${activeView === 'profile' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveView(activeView === 'profile' ? 'dashboard' : 'profile')}
              title="My Profile"
              style={{ padding: '8px 16px', minHeight: '38px', fontSize: '13.5px' }}
            >
              <User size={15} />
              <span>Profile</span>
            </button>

            <NotificationBell
              onNavigateToCourse={(courseId) => {
                setActiveView('dashboard');
                setActiveTab('enrolled');
              }}
            />

            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <button
              className="btn btn-outline logout-btn logout-danger-btn"
              onClick={() => setShowLogoutModal(true)}
              title="Log Out"
              style={{ padding: '8px 16px', minHeight: '38px', fontSize: '13.5px' }}
            >
              <LogOut size={15} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main View Render */}
      {activeView === 'profile' ? (
        <LearnerProfile user={user} />
      ) : (
        <LearnerDashboardOverview
          user={user}
          enrolments={enrolments}
          publishedCourses={publishedCourses}
          loading={loading}
          onLessonComplete={handleLessonComplete}
          onEnrolCourse={handleEnrolCourse}
          onFetchPublishedCourses={fetchPublishedCourses}
          onRatingSubmit={handleRatingSubmit}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
};
