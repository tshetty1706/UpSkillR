import React from 'react';
import { Award, Layers, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import './WhyUpSkillr.css';
import HomePageLearning from '../../../assets/illustrations/Home_Page_Learning.svg';

export const WhyUpSkillr = () => {
  const testimonials = [
    {
      quote: "UpSkillr helped me transition into a frontend developer. The courses are top-notch!",
      name: "Riya Sharma",
      role: "Frontend Developer",
      initials: "RS"
    },
    {
      quote: "The hands-on projects and instant feedback gave me the confidence to ace my engineering interviews.",
      name: "Alex Chen",
      role: "Full-Stack Engineer",
      initials: "AC"
    },
    {
      quote: "Best platform for practical development skills. Clear instructors, no fluff, straight to building.",
      name: "Marcus Vance",
      role: "Cloud Architect",
      initials: "MV"
    }
  ];

  const [currentIdx, setCurrentIdx] = React.useState(0);

  const handlePrev = () => {
    setCurrentIdx((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIdx((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const currentTestimonial = testimonials[currentIdx];

  return (
    <section className="why-section section" id="why-upskillr">
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
              "{currentTestimonial.quote}"
            </p>

            <div className="testimonial-footer">
              <div className="user-profile">
                <div className="user-avatar-circle" aria-label={`User avatar for ${currentTestimonial.name}`}>
                  <span className="avatar-initials">{currentTestimonial.initials}</span>
                </div>
                <div className="user-info">
                  <h3 className="user-name">{currentTestimonial.name}</h3>
                  <span className="user-role">{currentTestimonial.role}</span>
                </div>
              </div>

              <div className="testimonial-controls">
                <button
                  type="button"
                  className="control-btn"
                  onClick={handlePrev}
                  aria-label="Previous Testimonial"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="control-btn"
                  onClick={handleNext}
                  aria-label="Next Testimonial"
                >
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
