import React from 'react';
import { Award, Layers, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import './WhyUpSkillr.css';

const LearnerIllustration = () => (
  <svg 
    className="learner-illustration-svg" 
    viewBox="0 0 450 380" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background Soft Glow Circles */}
    <circle cx="210" cy="180" r="140" fill="var(--brand-soft)" opacity="0.6" />
    
    {/* Student Person Vector */}
    {/* Hair */}
    <path d="M125 145C125 110 150 95 175 95C200 95 215 110 215 135C215 145 210 160 210 160H130C130 160 125 152 125 145Z" fill="var(--brand-accent-text)" opacity="0.85" />
    <circle cx="170" cy="85" r="22" fill="var(--brand-accent-text)" opacity="0.9" />

    {/* Head & Face */}
    <path d="M142 135C142 120 152 110 170 110C188 110 198 120 198 135C198 152 188 165 170 165C152 165 142 152 142 135Z" fill="var(--surface-elevated)" stroke="var(--brand-accent-text)" strokeWidth="3" />

    {/* Body / Shirt */}
    <path d="M115 240C115 195 138 175 170 175C202 175 225 195 225 240V270H115V240Z" fill="var(--brand-primary)" opacity="0.8" />
    
    {/* Tablet / Screen held by person */}
    <rect x="180" y="160" width="160" height="110" rx="10" fill="var(--surface-elevated)" stroke="var(--brand-accent-text)" strokeWidth="3.5" />
    <rect x="195" y="175" width="70" height="8" rx="4" fill="var(--brand-accent-text)" opacity="0.7" />
    <rect x="195" y="192" width="130" height="6" rx="3" fill="var(--brand-accent-text)" opacity="0.3" />
    <rect x="195" y="205" width="110" height="6" rx="3" fill="var(--brand-accent-text)" opacity="0.3" />
    <rect x="195" y="218" width="90" height="6" rx="3" fill="var(--brand-accent-text)" opacity="0.3" />
    
    {/* Code Card Window */}
    <rect x="280" y="100" width="110" height="80" rx="8" fill="var(--surface-elevated)" stroke="var(--brand-accent-text)" strokeWidth="3" />
    <circle cx="295" cy="114" r="4" fill="var(--brand-accent-text)" />
    <circle cx="307" cy="114" r="4" fill="var(--brand-accent-text)" opacity="0.5" />
    <circle cx="319" cy="114" r="4" fill="var(--brand-accent-text)" opacity="0.3" />
    <line x1="293" y1="130" x2="350" y2="130" stroke="var(--brand-accent-text)" strokeWidth="3" strokeLinecap="round" />
    <line x1="293" y1="142" x2="370" y2="142" stroke="var(--brand-accent-text)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    <line x1="293" y1="154" x2="330" y2="154" stroke="var(--brand-accent-text)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />

    {/* Potted Plant (Bottom Right) */}
    <path d="M375 270L382 310H418L425 270H375Z" fill="var(--surface-elevated)" stroke="var(--brand-accent-text)" strokeWidth="3" />
    <path d="M390 270C380 240 370 230 365 220C380 230 395 245 400 270Z" fill="var(--brand-accent-text)" opacity="0.8" />
    <path d="M410 270C420 245 430 235 435 225C420 235 405 250 400 270Z" fill="var(--brand-accent-text)" opacity="0.6" />
  </svg>
);

export const WhyUpSkillr = () => {
  return (
    <section className="why-section section">
      <div className="container why-container">
        {/* Left Column: Vector Illustration */}
        <div className="why-illustration-col">
          <LearnerIllustration />
        </div>

        {/* Middle Column: Why Learners Love UpSkillr */}
        <div className="why-features-col">
          <h2 className="why-title">Why learners love UpSkillr</h2>

          <div className="why-features-list">
            <div className="why-feature-item">
              <div className="why-icon-box">
                <Award size={22} />
              </div>
              <div className="why-feature-text">
                <h3 className="why-feature-heading">Learn from the best</h3>
                <p className="why-feature-desc">Industry experts and passionate educators.</p>
              </div>
            </div>

            <div className="why-feature-item">
              <div className="why-icon-box">
                <Layers size={22} />
              </div>
              <div className="why-feature-text">
                <h3 className="why-feature-heading">Practical learning</h3>
                <p className="why-feature-desc">Hands-on projects and real-world applications.</p>
              </div>
            </div>

            <div className="why-feature-item">
              <div className="why-icon-box">
                <Target size={22} />
              </div>
              <div className="why-feature-text">
                <h3 className="why-feature-heading">Track your progress</h3>
                <p className="why-feature-desc">Visualize your growth and stay motivated.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Testimonial Card */}
        <div className="testimonial-col">
          <h2 className="why-title">What our learners say</h2>

          <div className="testimonial-card">
            <p className="testimonial-quote">
              "UpSkillr helped me transition into a frontend developer. The courses are top-notch!"
            </p>

            <div className="testimonial-footer">
              <div className="user-profile">
                <div className="user-avatar-circle">
                  <span className="avatar-initials">RS</span>
                </div>
                <div className="user-info">
                  <h4 className="user-name">Riya Sharma</h4>
                  <span className="user-role">Frontend Developer</span>
                </div>
              </div>

              <div className="testimonial-controls">
                <button className="control-btn" aria-label="Previous Testimonial">
                  <ChevronLeft size={18} />
                </button>
                <button className="control-btn" aria-label="Next Testimonial">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
