import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Video,
  FileText,
  HelpCircle,
  BarChart3,
  Users,
  UserCheck,
  LogOut,
  ChevronRight,
  Sparkles,
  BookMarked,
  Sun,
  Moon,
  Home
} from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import './InstructorSidebar.css';

export const InstructorSidebar = ({ activeTab, setActiveTab, user, onLogout }) => {
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const navSections = [
    {
      title: 'MAIN',
      items: [
        { id: 'home', label: 'Home Page', icon: Home },
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'my-courses', label: 'My Courses', icon: BookOpen },
        { id: 'create-course', label: 'Create Course', icon: PlusCircle }
      ]
    },
    {
      title: 'TEACHING / CONTENT',
      items: [
        { id: 'lessons', label: 'Lessons', icon: Video },
        { id: 'resources', label: 'Resources', icon: FileText },
        { id: 'assessments', label: 'Assessments', icon: HelpCircle }
      ]
    },
    {
      title: 'INSIGHTS',
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'learners', label: 'Learners', icon: Users }
      ]
    },
    {
      title: 'ACCOUNT',
      items: [
        { id: 'profile', label: 'Profile & Settings', icon: UserCheck }
      ]
    }
  ];

  return (
    <aside className="instructor-sidebar">
      {/* Top Branding Badge */}
      <div className="sidebar-header">
        <a 
          href="/" 
          className="sidebar-brand" 
          onClick={(e) => { 
            e.preventDefault(); 
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/' } }));
          }}
          style={{ textDecoration: 'none', cursor: 'pointer' }}
        >
          <div className="sidebar-brand-icon">
            <BookMarked size={20} />
          </div>
          <div className="sidebar-brand-info">
            <span className="sidebar-brand-name">UpSkillr</span>
            <span className="sidebar-brand-badge">Instructor Studio</span>
          </div>
        </a>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav" aria-label="Instructor Navigation">
        {navSections.map((section, idx) => (
          <div key={idx} className="sidebar-section">
            <span className="sidebar-section-title">{section.title}</span>
            <ul className="sidebar-menu-list">
              {section.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        if (item.id === 'home') {
                          window.history.pushState({}, '', '/');
                          window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/' } }));
                        } else {
                          setActiveTab(item.id);
                        }
                      }}
                    >
                      <IconComponent size={18} className="sidebar-btn-icon" />
                      <span className="sidebar-btn-label">{item.label}</span>
                      {isActive && <ChevronRight size={14} className="sidebar-active-indicator" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer Profile, Theme Toggle & Logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="sidebar-avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.fullName} className="avatar-img" />
            ) : (
              <span>{user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'I'}</span>
            )}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.fullName || 'Instructor'}</span>
            <span className="sidebar-user-email">{user?.email || 'instructor@upskillr.com'}</span>
          </div>
        </div>

        <div className="sidebar-actions-row">
          <button 
            type="button" 
            className="sidebar-theme-btn"
            onClick={toggleTheme} 
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
            <span>{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>

          <button 
            type="button" 
            className="sidebar-logout-btn" 
            onClick={onLogout} 
            title="Log Out"
          >
            <LogOut size={15} />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
