import React from 'react';
import { BookOpen, ArrowUp } from 'lucide-react';
import './Footer.css';

export const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          {/* Brand Info */}
          <div className="footer-brand">
            <a href="#" className="footer-logo">
              <BookOpen className="logo-icon" size={24} />
              <span className="logo-text">UpSkillr</span>
            </a>
            <p className="footer-slogan">Empowering learners. Creating futures.</p>
            
            {/* Social Icons */}
            <div className="social-links">
              <a href="#" aria-label="Facebook" className="social-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a href="#" aria-label="Twitter" className="social-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="social-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                  <rect x="2" y="9" width="4" height="12"></rect>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
              </a>
              <a href="#" aria-label="Instagram" className="social-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="footer-links-grid">
            <div className="footer-column">
              <h4 className="column-title">PLATFORM</h4>
              <ul className="column-links">
                <li><a href="#">Browse Courses</a></li>
                <li><a href="#">Student Space</a></li>
                <li><a href="#">Pricing</a></li>
                <li><a href="#">Certificates</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="column-title">COMPANY</h4>
              <ul className="column-links">
                <li><a href="#">About Us</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Contact Us</a></li>
                <li><a href="#">Blog</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="column-title">RESOURCES</h4>
              <ul className="column-links">
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Guides</a></li>
                <li><a href="#">Community</a></li>
                <li><a href="#">Instructor Support</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4 className="column-title">LEGAL</h4>
              <ul className="column-links">
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Refund Policy</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="copyright-text">© 2026 UpSkillr. All rights reserved.</p>

          <button onClick={scrollToTop} className="scroll-top-btn" aria-label="Back to top">
            <ArrowUp size={18} />
          </button>
        </div>
      </div>
    </footer>
  );
};
