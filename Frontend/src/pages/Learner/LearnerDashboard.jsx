import React, { useState, useEffect } from 'react';
import { BookOpen, Sun, Moon, LogOut, Compass, User } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { LearnerDashboardOverview } from '../../components/learner/dashboard/LearnerDashboardOverview/LearnerDashboardOverview';
import { LearnerProfile } from '../../components/learner/profile/LearnerProfile';
import { LogoutModal } from '../../components/common/LogoutModal/LogoutModal';

export const LearnerDashboard = ({ user }) => {
  const [enrolments, setEnrolments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { theme, toggleTheme, isDarkMode } = useTheme();

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
    fetchMyEnrolments();
  }, []);

  const fetchMyEnrolments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch('http://localhost:5000/api/courses/learner/my-enrolments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setEnrolments(data.enrolments || []);
      }
    } catch (err) {
      console.error('Failed to fetch enrolments', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLessonComplete = async (courseId, lessonIndex) => {
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch('http://localhost:5000/api/courses/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ courseId, lessonIndex })
      });
      const data = await response.json();
      if (data.success) {
        fetchMyEnrolments();
      }
    } catch (err) {
      console.error('Error completing lesson', err);
    }
  };

  return (
    <div className="learner-dashboard-layout">
      {/* Student Space Topbar Header */}
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
              className={`btn ${activeView === 'profile' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveView(activeView === 'profile' ? 'dashboard' : 'profile')}
              title="My Profile"
              style={{ padding: '8px 16px', minHeight: '38px', fontSize: '13.5px' }}
            >
              <User size={15} />
              <span>{activeView === 'profile' ? 'Dashboard' : 'My Profile'}</span>
            </button>

            <button 
              className="btn btn-outline"
              onClick={() => handleNavigate('/explore')}
              title="Explore Courses"
              style={{ padding: '8px 16px', minHeight: '38px', fontSize: '13.5px' }}
            >
              <Compass size={15} />
              <span>Browse Catalog</span>
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

      {activeView === 'profile' ? (
        <LearnerProfile user={user} />
      ) : (
        <LearnerDashboardOverview
          user={user}
          enrolments={enrolments}
          loading={loading}
          onLessonComplete={handleLessonComplete}
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
