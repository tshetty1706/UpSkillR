import React, { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { ArrowRight, PlayCircle, UserCheck, Clock, Award, TrendingUp, Search } from 'lucide-react';
import hero1 from '../../../assets/images/hero1.png';
import './HeroSection.css';

const DotMatrixPattern = () => (
  <svg
    className="hero-dots-pattern"
    width="120"
    height="160"
    viewBox="0 0 120 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {Array.from({ length: 8 }).map((_, rowIndex) =>
      Array.from({ length: 6 }).map((_, colIndex) => {
        const opacity = Math.max(0.15, 0.45 - (rowIndex * 0.03 + colIndex * 0.04));
        return (
          <circle
            key={`${rowIndex}-${colIndex}`}
            cx={colIndex * 16 + 10}
            cy={rowIndex * 16 + 10}
            r="2.5"
            fill="var(--brand-primary)"
            opacity={opacity}
          />
        );
      })
    )}
  </svg>
);

export const HeroSection = () => {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleSearch = (e) => {
    e.preventDefault();
  };

  return (
    <section className="hero-section section">
      <div className="container hero-container">
        {/* LEFT COLUMN: Content */}
        <div className="hero-content">
          {/* Green Pill Badge */}
          <div className="badge-pill hero-badge">
            <span className="dot"></span>
            <span>Learn. Build. Level Up.</span>
          </div>

          {/* Main Title */}
          <h1 className="hero-title">
            The skills you want.<br />
            <span className="accent-green">The future you deserve.</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-description">
            Discover expert-led courses, build real-world skills, and achieve your goals with UpSkillr.
          </p>

          {/* Hero CTA Buttons */}
          <div className="hero-buttons">
            <a href="#" className="btn btn-primary hero-btn-primary" aria-label="Explore Courses">
              Explore Courses <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a href="#" className="btn btn-outline hero-btn-secondary" aria-label="How It Works">
              <PlayCircle size={18} className="play-icon" aria-hidden="true" /> How It Works
            </a>
          </div>

          {/* Hero Benefits Row */}
          <div className="hero-benefits">
            <div className="benefit-item">
              <UserCheck size={18} className="benefit-icon" aria-hidden="true" />
              <span>Expert Instructors</span>
            </div>
            <div className="benefit-item">
              <Clock size={18} className="benefit-icon" aria-hidden="true" />
              <span>Learn at Your Pace</span>
            </div>
            <div className="benefit-item">
              <Award size={18} className="benefit-icon" aria-hidden="true" />
              <span>Recognized Certificates</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Visual with Layered Background Decorations */}
        <div className="hero-visual">
          <div className="hero-circle-tr" aria-hidden="true"></div>
          <div className="hero-circle-bl" aria-hidden="true"></div>
          <div className="hero-glow-bg" aria-hidden="true"></div>
          <DotMatrixPattern />

          <div className="hero-image-wrapper">
            <img
              src={hero1}
              alt="Student learning on UpSkillr online education platform"
              className="hero-img"
            />
          </div>

          <div className="floating-card float-top-left">
            <div className="float-icon-box green-icon-bg">
              <TrendingUp size={18} aria-hidden="true" />
            </div>
            <div className="float-text">
              <span className="float-title">+2 Skills</span>
              <span className="float-sub">This week</span>
            </div>
          </div>

          <div className="floating-card float-bottom-right">
            <div className="float-icon-box flame-icon-bg">
              <span className="flame-emoji" role="img" aria-label="Fire emoji">🔥</span>
            </div>
            <div className="float-text">
              <span className="float-title">12 Days</span>
              <span className="float-sub">Learning streak</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
