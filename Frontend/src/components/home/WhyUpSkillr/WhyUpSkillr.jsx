import React from 'react';
import { Award, Layers, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import './WhyUpSkillr.css';
import HomePageLearning from '../../../assets/illustrations/Home_Page_Learning.svg';

export const WhyUpSkillr = () => {
  return (
    <section className="why-section section" id="trust-section">
      <div className="container why-container">
        {/* Left Column: Vector Illustration */}
        <div className="why-illustration-col">
          <img
            src={HomePageLearning}
            alt="Learners studying on UpSkillr"
            className="why-illustration-img"
          />
        </div>

        {/* Middle Column: Why Learners Love UpSkillr */}
        <div className="why-features-col">
          <h2 className="why-title">Why learners love UpSkillr</h2>

          <div className="why-features-list">
            <div className="why-feature-item">
              <div className="why-icon-box">
                <Award size={22} aria-hidden="true" />
              </div>
              <div className="why-feature-text">
                <h3 className="why-feature-heading">Learn from the best</h3>
                <p className="why-feature-desc">Industry experts and passionate educators.</p>
              </div>
            </div>

            <div className="why-feature-item">
              <div className="why-icon-box">
                <Layers size={22} aria-hidden="true" />
              </div>
              <div className="why-feature-text">
                <h3 className="why-feature-heading">Practical learning</h3>
                <p className="why-feature-desc">Hands-on projects and real-world applications.</p>
              </div>
            </div>

            <div className="why-feature-item">
              <div className="why-icon-box">
                <Target size={22} aria-hidden="true" />
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
                <div className="user-avatar-circle" aria-label="User avatar for Riya Sharma">
                  <span className="avatar-initials">RS</span>
                </div>
                <div className="user-info">
                  <h3 className="user-name">Riya Sharma</h3>
                  <span className="user-role">Frontend Developer</span>
                </div>
              </div>

              <div className="testimonial-controls">
                <button className="control-btn" aria-label="Previous Testimonial">
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button className="control-btn" aria-label="Next Testimonial">
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
