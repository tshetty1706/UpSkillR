import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Bookmark,
  Trophy,
  MessageSquare,
  Compass,
  ChevronRight,
  ChevronUp,
  User,
  Settings,
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const profileSectionRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

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
      label: 'Bookmarks & Notes',
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

  // Exactly two submenu options for Profile Popover:
  const profileSubmenuItems = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/learner/profile'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/learner/settings'
    }
  ];

  const handleItemClick = (item) => {
    setIsMenuOpen(false);
    if (onSelectView) {
      onSelectView(item.id, item.path);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleProfileOptionClick = (option, e) => {
    if (e) e.stopPropagation();
    setIsMenuOpen(false);
    if (onSelectView) {
      onSelectView(option.id, option.path);
    }
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Toggle or open submenu on card click
  const handleProfileCardClick = (e) => {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  };

  // Hover handlers with graceful debounce for popover access
  const handleProfileMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsMenuOpen(true);
  };

  const handleProfileMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsMenuOpen(false);
    }, 220);
  };

  // Close submenu on click outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileSectionRef.current && !profileSectionRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const userName = user?.fullName || user?.name || 'Learner';
  const userAvatar = user?.avatar || user?.profilePhoto;
  const isProfileActive = activeView === 'profile' || activeView === 'settings';

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
        onMouseLeave={() => {
          setIsHovered(false);
          setIsMenuOpen(false);
        }}
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
              const isActive =
                activeView === item.id ||
                (item.id === 'dashboard' && activeView === 'trending-detail');

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

        {/* Bottom User Profile Section with Popover Submenu */}
        <div
          className="sidebar-profile-section"
          ref={profileSectionRef}
          onMouseEnter={handleProfileMouseEnter}
          onMouseLeave={handleProfileMouseLeave}
        >
          {/* Submenu Popover with exactly two options: Profile & Settings */}
          {isMenuOpen && (
            <div
              className={`sidebar-profile-submenu ${isHovered ? 'menu-expanded' : 'menu-collapsed'}`}
              role="menu"
              aria-label="User Account Navigation"
            >
              <div className="submenu-header">
                <span className="submenu-title">Account</span>
              </div>
              <div className="submenu-items-stack">
                {profileSubmenuItems.map((opt) => {
                  const OptIcon = opt.icon;
                  const isOptActive = activeView === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="menuitem"
                      className={`sidebar-submenu-item ${isOptActive ? 'active' : ''}`}
                      onClick={(e) => handleProfileOptionClick(opt, e)}
                    >
                      <span className="submenu-item-icon-box">
                        <OptIcon size={17} />
                      </span>
                      <span className="submenu-item-label">{opt.label}</span>
                      {isOptActive && <span className="active-item-dot" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Profile Card Fixed at Bottom */}
          <button
            type="button"
            className={`sidebar-profile-card ${isProfileActive ? 'active' : ''} ${isMenuOpen ? 'menu-active' : ''}`}
            onClick={handleProfileCardClick}
            aria-label={`User menu for ${userName}`}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            title={!isHovered ? `Account: ${userName}` : undefined}
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
              <span className="sidebar-view-profile-text">
                {activeView === 'settings' ? 'Settings' : 'Profile & Settings'}
              </span>
            </div>
            <div className="sidebar-profile-arrow-wrap">
              {isMenuOpen ? (
                <ChevronUp size={16} className="sidebar-profile-arrow" aria-hidden="true" />
              ) : (
                <ChevronRight size={16} className="sidebar-profile-arrow" aria-hidden="true" />
              )}
            </div>

            {/* Profile Tooltip when collapsed & menu closed */}
            {!isMenuOpen && (
              <span className="sidebar-tooltip" role="tooltip">
                Profile &amp; Settings
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default LearnerSidebar;
