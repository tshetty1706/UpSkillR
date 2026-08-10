import React from 'react';
import { ArrowRight } from 'lucide-react';
import './CTASection.css';

export const CTASection = () => {
  return (
    <section className="cta-section section">
      <div className="container">
        <div className="cta-banner">
          <div className="cta-content">
            <h2 className="cta-title">Ready to unlock your potential?</h2>
            <p className="cta-subtext">Join thousands of learners and start your journey today.</p>
          </div>

          <div className="cta-action">
            <a href="#" className="btn cta-btn">
              Start Learning for Free <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
