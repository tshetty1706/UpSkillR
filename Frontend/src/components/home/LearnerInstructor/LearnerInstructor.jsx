import React from 'react';
import { GraduationCap, Video, ArrowRight } from 'lucide-react';
import './LearnerInstructor.css';

export const LearnerInstructor = () => {
  return (
    <section className="learner-instructor-section section">
      <div className="container">
        <div className="section-header text-center">
          <h2 className="section-title">Built for Learners and Instructors</h2>
          <p className="section-subtitle">Whether you're looking to master new skills or share your knowledge with the world</p>
        </div>

        <div className="learner-instructor-grid">
          {/* Left Card: Learner */}
          <div className="role-card">
            <div className="role-icon-box">
              <GraduationCap size={28} className="role-icon" aria-hidden="true" />
            </div>
            <h3 className="role-title">For Learners</h3>
            <p className="role-description">
              Discover expert-led courses, build hands-on projects, track your progress, and earn recognized certificates.
            </p>
            <a href="#" className="role-cta-link" aria-label="Start Learning as a student">
              <span>Start Learning</span>
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>

          {/* Right Card: Instructor */}
          <div className="role-card">
            <div className="role-icon-box">
              <Video size={28} className="role-icon" aria-hidden="true" />
            </div>
            <h3 className="role-title">For Instructors</h3>
            <p className="role-description">
              Create comprehensive courses, upload video lessons and assessments, track student engagement, and monetize your skill.
            </p>
            <a href="#" className="role-cta-link" aria-label="Start Teaching as an instructor">
              <span>Start Teaching</span>
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
