import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Bookmark,
  Trophy,
  MessageSquare,
  Compass,
  ChevronRight,
  X
} from 'lucide-react';
import { Avatar } from '../../common/Avatar/Avatar';
import './LearnerSidebar.css';

export const LearnerSidebar = ({
  activeView = 'dashboard',
  onSelectView,
  user,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Exact 6 Navigation Items in Required Order:
  // 1. Dashboard (/learner/dashboard)
  // 2. My Learning (/learner/my-learning)
  // 3. Bookmarks (/learner/bookmarks)
  // 4. Achievements (/learner/achievements)
  // 5. My Feedback (/learner/feedback)
  // 6. Explore Courses (/learner/explore)
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/learner/dashboard'
    },
    {
      id: 'my-learning',
      label: 'My Learning',
      icon: BookOpen,
      path: '/learner/my-learning'
    },
    {
      id: 'bookmarks',
      label: 'Bookmarks',
      icon: Bookmark,
      path: '/learner/bookmarks'
    },
    {
      id: 'achievements',
      label: 'Achievements',
      icon: Trophy,
      path: '/learner/achievements'
    },
    {
      id: 'feedback',
      label: 'My Feedback',
      icon: MessageSquare,
      path: '/learner/feedback'
    },
    {
      id: 'explore',
      label: 'Explore Courses',
      icon: Compass,
      path: '/learner/explore'
    }
  ];

  const handleItemClick = (item) => {
    if (onSelectView) {
      onSelectView(item.id, item.path);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleProfileClick = () => {
    if (onSelectView) {
      onSelectView('profile', '/learner/profile');
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const userName = user?.fullName || user?.name || 'Learner';
  const userAvatar = user?.avatar || user?.profilePhoto;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="learner-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`learner-sidebar ${isHovered ? 'expanded' : 'collapsed'} ${isMobileOpen ? 'mobile-open' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Learner Navigation Sidebar"
      >
        {/* Mobile Header with Close Button */}
        <div className="sidebar-mobile-header">
          <div className="sidebar-brand-mobile">
            <BookOpen size={22} className="sidebar-brand-icon" />
            <span className="sidebar-brand-text">UpSkillR</span>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onCloseMobile}
            aria-label="Close sidebar navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Navigation List */}
        <nav className="sidebar-nav-container">
          <ul className="sidebar-nav-list" role="menubar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <li key={item.id} className="sidebar-nav-item" role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleItemClick(item)}
                    aria-label={item.label}
                    title={!isHovered ? item.label : undefined}
                  >
                    <span className="sidebar-icon-wrapper" aria-hidden="true">
                      <Icon size={20} className="sidebar-icon" />
                    </span>
                    <span className="sidebar-label">{item.label}</span>

                    {/* Tooltip visible only when compact & hovered on item */}
                    <span className="sidebar-tooltip" role="tooltip">
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom User Profile Section */}
        <div className="sidebar-profile-section">
          <button
            type="button"
            className={`sidebar-profile-card ${activeView === 'profile' ? 'active' : ''}`}
            onClick={handleProfileClick}
            aria-label={`View profile for ${userName}`}
            title={!isHovered ? `Profile: ${userName}` : undefined}
          >
            <Avatar
              image={userAvatar}
              name={userName}
              size="small"
              className="sidebar-user-avatar"
            />
            <div className="sidebar-user-info">
              <span className="sidebar-user-name" title={userName}>
                {userName}
              </span>
              <span className="sidebar-view-profile-text">View Profile</span>
            </div>
            <ChevronRight size={16} className="sidebar-profile-arrow" aria-hidden="true" />

            {/* Profile Tooltip when collapsed */}
            <span className="sidebar-tooltip" role="tooltip">
              Profile
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default LearnerSidebar;
