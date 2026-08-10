import React, { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Search, Sun, Moon, Menu, X, BookOpen } from 'lucide-react';
import './Navbar.css';

export const Navbar = () => {
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        {/* LEFT: Logo */}
        <a href="#" className="navbar-logo" aria-label="UpSkillr Home">
          <div className="logo-icon-wrapper">
            <BookOpen className="logo-icon" size={24} aria-hidden="true" />
          </div>
          <span className="logo-text">UpSkillr</span>
        </a>

        {/* CENTER: Desktop Navigation */}
        <nav className="navbar-nav" aria-label="Main Navigation">
          <a href="#" className="nav-link active">Home</a>
          <a href="#" className="nav-link">Explore</a>
          <a href="#" className="nav-link">Student Space</a>
          <a href="#" className="nav-link">Teach on UpSkillr</a>
          <a href="#" className="nav-link">Pricing</a>
        </nav>

        {/* RIGHT: Actions */}
        <div className="navbar-actions">
          <button className="icon-btn" aria-label="Search courses">
            <Search size={19} aria-hidden="true" />
          </button>

          <button className="icon-btn" onClick={toggleTheme} aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {isDarkMode ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
          </button>

          <a href="#" className="login-link">Log in</a>

          <a href="#" className="btn btn-primary start-learning-btn">
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
            <a href="#" className="mobile-nav-link active" onClick={() => setMobileMenuOpen(false)}>Home</a>
            <a href="#" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Explore</a>
            <a href="#" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Student Space</a>
            <a href="#" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Teach on UpSkillr</a>
            <a href="#" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <hr className="mobile-divider" />
            <a href="#" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Log in</a>
            <a href="#" className="btn btn-primary mobile-start-btn" onClick={() => setMobileMenuOpen(false)}>
              Start Learning
            </a>
          </nav>
        </div>
      )}
    </header>
  );
};
