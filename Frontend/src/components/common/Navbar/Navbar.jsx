import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Search, Sun, Moon, Menu, X, BookOpen, LogOut, User, LayoutDashboard, GraduationCap } from 'lucide-react';
import './Navbar.css';

export const Navbar = () => {
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('upskillr_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse user state');
      }
    }
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  };

  const handleLogout = () => {
    localStorage.removeItem('upskillr_token');
    localStorage.removeItem('upskillr_user');
    setCurrentUser(null);
    navigate('/');
  };

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        {/* LEFT: Logo */}
        <a 
          href="/" 
          className="navbar-logo" 
          aria-label="UpSkillr Home"
          onClick={(e) => { e.preventDefault(); navigate('/'); }}
        >
          <div className="logo-icon-wrapper">
            <BookOpen className="logo-icon" size={24} aria-hidden="true" />
          </div>
          <span className="logo-text">UpSkillr</span>
        </a>

        {/* CENTER: Desktop Navigation */}
        <nav className="navbar-nav" aria-label="Main Navigation">
          <a 
            href="/" 
            className="nav-link active"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
          >
            Home
          </a>
          <a 
            href="/explore" 
            className="nav-link"
            onClick={(e) => { e.preventDefault(); navigate('/explore'); }}
          >
            Explore Courses
          </a>
          {currentUser && currentUser.role === 'instructor' && (
            <a 
              href="/instructor" 
              className="nav-link"
              onClick={(e) => { e.preventDefault(); navigate('/instructor'); }}
            >
              Instructor Studio
            </a>
          )}
          {currentUser && currentUser.role === 'learner' && (
            <a 
              href="/learner" 
              className="nav-link"
              onClick={(e) => { e.preventDefault(); navigate('/learner'); }}
            >
              Student Space
            </a>
          )}
          {(!currentUser || currentUser.role !== 'instructor') && (
            <a 
              href="/signup?role=instructor" 
              className="nav-link"
              onClick={(e) => { e.preventDefault(); navigate('/signup?role=instructor'); }}
            >
              Teach on UpSkillr
            </a>
          )}
        </nav>

        {/* RIGHT: Actions */}
        <div className="navbar-actions">
          <button 
            className="icon-btn" 
            aria-label="Search courses"
            onClick={() => navigate('/explore')}
          >
            <Search size={19} aria-hidden="true" />
          </button>

          <button className="icon-btn" onClick={toggleTheme} aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {isDarkMode ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </button>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {currentUser.role === 'instructor' ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate('/instructor')}
                >
                  <LayoutDashboard size={16} />
                  <span>Studio</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate('/learner')}
                >
                  <GraduationCap size={16} />
                  <span>My Learning</span>
                </button>
              )}

              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '8px 12px', minHeight: '38px' }}
                onClick={handleLogout}
                title="Log Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <>
              <a 
                href="/login" 
                className="login-link"
                onClick={(e) => { e.preventDefault(); navigate('/login'); }}
              >
                Log in
              </a>

              <a 
                href="/signup" 
                className="btn btn-primary start-learning-btn"
                onClick={(e) => { e.preventDefault(); navigate('/signup'); }}
              >
                Start Learning
              </a>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <nav className="mobile-nav-links" aria-label="Mobile Navigation">
            <a 
              href="/" 
              className="mobile-nav-link active" 
              onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); navigate('/'); }}
            >
              Home
            </a>
            <a 
              href="/explore" 
              className="mobile-nav-link" 
              onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); navigate('/explore'); }}
            >
              Explore Courses
            </a>
            {currentUser && currentUser.role === 'instructor' && (
              <a 
                href="/instructor" 
                className="mobile-nav-link" 
                onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); navigate('/instructor'); }}
              >
                Instructor Studio
              </a>
            )}
            {currentUser && currentUser.role === 'learner' && (
              <a 
                href="/learner" 
                className="mobile-nav-link" 
                onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); navigate('/learner'); }}
              >
                Student Space
              </a>
            )}
            <hr className="mobile-divider" />
            {currentUser ? (
              <button
                type="button"
                className="btn btn-outline mobile-start-btn"
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
              >
                Log out ({currentUser.fullName})
              </button>
            ) : (
              <>
                <a 
                  href="/login" 
                  className="mobile-nav-link" 
                  onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); navigate('/login'); }}
                >
                  Log in
                </a>
                <a 
                  href="/signup" 
                  className="btn btn-primary mobile-start-btn" 
                  onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); navigate('/signup'); }}
                >
                  Start Learning
                </a>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
