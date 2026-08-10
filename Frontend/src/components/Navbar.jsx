import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Search, Sun, Moon, Menu, X, BookOpen } from 'lucide-react';
import './Navbar.css';

export const Navbar = () => {
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        {/* LEFT: Logo */}
        <a href="#" className="navbar-logo">
          <div className="logo-icon-wrapper">
            <BookOpen className="logo-icon" size={24} />
          </div>
          <span className="logo-text">UpSkillr</span>
        </a>

        {/* CENTER: Desktop Navigation */}
        <nav className="navbar-nav">
          <a href="#" className="nav-link active">Home</a>
          <a href="#" className="nav-link">Explore</a>
          <a href="#" className="nav-link">Student Space</a>
          <a href="#" className="nav-link">Teach on UpSkillr</a>
          <a href="#" className="nav-link">Pricing</a>
        </nav>

        {/* RIGHT: Actions */}
        <div className="navbar-actions">
          <button className="icon-btn" aria-label="Search">
            <Search size={19} />
          </button>

          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle Theme">
            {isDarkMode ? <Sun size={19} /> : <Moon size={19} />}
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
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <nav className="mobile-nav-links">
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
