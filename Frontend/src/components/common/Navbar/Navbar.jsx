import React, { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Search, Sun, Moon, Menu, X, BookOpen } from 'lucide-react';
import './Navbar.css';

export const Navbar = () => {
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
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
          <a href="#explore" className="nav-link">Explore</a>
          <a href="#student-space" className="nav-link">Student Space</a>
          <a 
            href="/signup?role=instructor" 
            className="nav-link"
            onClick={(e) => { e.preventDefault(); navigate('/signup?role=instructor'); }}
          >
            Teach on UpSkillr
          </a>
          <a href="#pricing" className="nav-link">Pricing</a>
        </nav>

        {/* RIGHT: Actions */}
        <div className="navbar-actions">
          <button className="icon-btn" aria-label="Search courses">
            <Search size={19} aria-hidden="true" />
          </button>

          <button className="icon-btn" onClick={toggleTheme} aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {isDarkMode ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </button>

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
              href="#explore" 
              className="mobile-nav-link" 
              onClick={() => setMobileMenuOpen(false)}
            >
              Explore
            </a>
            <a 
              href="#student-space" 
              className="mobile-nav-link" 
              onClick={() => setMobileMenuOpen(false)}
            >
              Student Space
            </a>
            <a 
              href="/signup?role=instructor" 
              className="mobile-nav-link" 
              onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); navigate('/signup?role=instructor'); }}
            >
              Teach on UpSkillr
            </a>
            <a 
              href="#pricing" 
              className="mobile-nav-link" 
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </a>
            <hr className="mobile-divider" />
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
          </nav>
        </div>
      )}
    </header>
  );
};
