import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { ArrowRight, PlayCircle, UserCheck, Clock, Award, TrendingUp } from 'lucide-react';
import './HeroSection.css';

import hero1 from '../assets/hero1.png';

export const HeroSection = () => {
  const { isDarkMode } = useTheme();

  return (
    <section className="hero-section section">
      <div className="container hero-container">
        {/* LEFT COLUMN */}
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
            <a href="#" className="btn btn-primary hero-btn-primary">
              Explore Courses <ArrowRight size={18} />
            </a>
            <a href="#" className="btn btn-outline hero-btn-secondary">
              <PlayCircle size={18} className="play-icon" /> How It Works
            </a>
          </div>

          {/* Hero Benefits Row */}
          <div className="hero-benefits">
            <div className="benefit-item">
              <UserCheck size={18} className="benefit-icon" />
              <span>Expert Instructors</span>
            </div>
            <div className="benefit-item">
              <Clock size={18} className="benefit-icon" />
              <span>Learn at Your Pace</span>
            </div>
            <div className="benefit-item">
              <Award size={18} className="benefit-icon" />
              <span>Recognized Certificates</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="hero-visual">
          <div className="hero-glow-bg"></div>

          <div className="hero-image-wrapper">
            <img
              src={hero1}
              alt="UpSkillr Student Learning"
              className="hero-img"
            />

            {/* Floating Widget 1 - Top Left */}
            <div className="floating-card float-top-left">
              <div className="float-icon-box green-icon-bg">
                <TrendingUp size={18} />
              </div>
              <div className="float-text">
                <span className="float-title">+2 Skills</span>
                <span className="float-sub">This week</span>
              </div>
            </div>

            {/* Floating Widget 2 - Bottom Right */}
            <div className="floating-card float-bottom-right">
              <div className="float-icon-box flame-icon-bg">
                <span className="flame-emoji">🔥</span>
              </div>
              <div className="float-text">
                <span className="float-title">12 Days</span>
                <span className="float-sub">Learning streak</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
