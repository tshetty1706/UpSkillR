import React, { useState, useEffect } from 'react';
import { BookOpen, Sun, Moon, LogOut, Compass, User, Sparkles, LayoutDashboard } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { LearnerDashboardOverview } from '../../components/learner/dashboard/LearnerDashboardOverview/LearnerDashboardOverview';
import { LearnerProfile } from '../../components/learner/profile/LearnerProfile';
import { LogoutModal } from '../../components/common/LogoutModal/LogoutModal';

export const LearnerDashboard = ({ user }) => {
  const [enrolments, setEnrolments] = useState([]);
  const [publishedCourses, setPublishedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [activeTab, setActiveTab] = useState('enrolled');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const { isDarkMode, toggleTheme } = useTheme();

  const showNotification = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLogout = () => {
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
      const token = localStorage.getItem('upskillr_token');
      if (!token) return;
      const response = await fetch('http://localhost:5000/api/courses/learner/my-enrolments', {
        headers: { Authorization: `Bearer ${token}` }
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
    const token = localStorage.getItem('upskillr_token');
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
    showNotification('🎉 Enrolled successfully! Start learning now.');

    try {
      if (token) {
        const response = await fetch('http://localhost:5000/api/courses/enrol', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ courseId })
        });
        const data = await response.json();
        if (data.success) {
          await fetchMyEnrolments();
        }
      }
    } catch (err) {
      console.error('Error enrolling in course', err);
    }
  };

  // FR-07 Lesson Completion Tracker Handler
  const handleLessonComplete = async (courseId, lessonIndex) => {
    const token = localStorage.getItem('upskillr_token');

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

          const totalLessons = enrol.courseId?.lessons?.length || 5;
          const newPercentage = Math.round((updatedCompleted.length / Math.max(totalLessons, 1)) * 100);

          if (newPercentage === 100 && enrol.progressPercentage !== 100) {
            showNotification(`🏆 Congratulations! You completed this course! Rate & Review is unlocked.`);
          }

          return {
            ...enrol,
            completedLessons: updatedCompleted,
            progressPercentage: Math.min(newPercentage, 100)
          };
        }
        return enrol;
      });
    });

    try {
      if (token) {
        await fetch('http://localhost:5000/api/courses/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ courseId, lessonIndex })
        });
      }
    } catch (err) {
      console.error('Error completing lesson on server', err);
    }
  };

  // FR-09 Course Rating & Review Handler
  const handleRatingSubmit = async (courseId, ratingData) => {
    const token = localStorage.getItem('upskillr_token');
    showNotification('⭐ Rating and review submitted! Thank you.');

    try {
      if (token) {
        const response = await fetch('http://localhost:5000/api/courses/rate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
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
      }
    } catch (err) {
      console.error('Error submitting rating to server', err);
    }
  };

  return (
    <div className="learner-dashboard-layout">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="learner-toast-banner" role="alert">
          <Sparkles size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

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
            <span className="logo-text">UpSkillr</span>
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
              className={`btn ${activeView === 'dashboard' && activeTab === 'browse' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setActiveView('dashboard'); setActiveTab('browse'); }}
              title="Browse Courses (FR-05)"
              style={{ padding: '8px 16px', minHeight: '38px', fontSize: '13.5px' }}
            >
              <Compass size={15} />
              <span>Browse Catalog</span>
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
