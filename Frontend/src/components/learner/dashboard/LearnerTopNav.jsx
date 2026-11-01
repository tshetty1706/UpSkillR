import React from 'react';
import { BookOpen, Sun, Moon, LogOut, Menu } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { NotificationBell } from '../../common/NotificationBell/NotificationBell';
import { Avatar } from '../../common/Avatar/Avatar';
import './LearnerTopNav.css';

export const LearnerTopNav = ({
  user,
  onToggleMobileSidebar,
  onNavigateProfile,
  onLogoutClick,
  onLogoClick,
  onNavigateToCourse
}) => {
  const { toggleTheme, isDarkMode } = useTheme();

  const userName = user?.fullName || user?.name || 'Learner';
  const userAvatar = user?.avatar || user?.profilePhoto;

  return (
    <header className="learner-topnav" aria-label="Learner Top Navigation Bar">
      <div className="learner-topnav-container">
        {/* Left Section: Mobile Menu Trigger + Brand Identity */}
        <div className="learner-topnav-left">
          <button
            type="button"
            className="mobile-sidebar-toggle-btn"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation menu"
          >
            <Menu size={22} />
          </button>

          <a
            href="/learner/dashboard"
            className="learner-brand-link"
            onClick={(e) => {
              e.preventDefault();
              if (onLogoClick) onLogoClick();
            }}
            aria-label="UpSkillr Learner Dashboard Home"
          >
            <div className="brand-logo-badge">
              <BookOpen size={20} className="brand-book-icon" />
            </div>
            <span className="brand-title-text">UpSkillR</span>
            <span className="brand-role-chip">Learner</span>
          </a>
        </div>

        {/* Right Section: Theme Toggle, Notifications, Profile & Logout (NO SEARCH BAR) */}
        <div className="learner-topnav-right">
          {/* Theme Switcher Button */}
          <button
            type="button"
            className="topnav-icon-btn theme-toggle-btn"
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {isDarkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {/* Notifications Bell */}
          <NotificationBell onNavigateToCourse={onNavigateToCourse} />

          {/* Profile Quick Access Button */}
          <button
            type="button"
            className="topnav-profile-btn"
            onClick={onNavigateProfile}
            aria-label={`Open profile for ${userName}`}
            title="My Profile"
          >
            <Avatar
              image={userAvatar}
              name={userName}
              size="small"
              className="topnav-user-avatar"
            />
            <span className="topnav-user-name">{userName}</span>
          </button>

          {/* Logout Action */}
          <button
            type="button"
            className="topnav-logout-btn"
            onClick={onLogoutClick}
            aria-label="Log out of account"
            title="Log out"
          >
            <LogOut size={16} />
            <span className="logout-text">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default LearnerTopNav;
