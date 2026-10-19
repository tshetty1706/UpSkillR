import React, { useState, useRef } from 'react';
import {
  Check,
  Award,
  Star,
  Users,
  BookOpen,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Send,
  HelpCircle,
  Layers,
  PlayCircle,
  ArrowRight,
  Clock,
  Target,
  ShieldCheck,
  CheckCircle2,
  FileQuestion,
  Quote
} from 'lucide-react';
import { Avatar } from '../../../../common/Avatar/Avatar';
import courseOverviewIllustration from '../../../../../assets/illustrations/courseOverview.svg';
import './CourseOverviewTemplate.css';

/**
 * Formats large counts compactly (e.g. 1420 -> 1.4K).
 */
const formatCount = (num) => {
  if (num === null || num === undefined) return '0';
  const n = Number(num);
  if (isNaN(n) || n <= 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

export const CourseOverviewTemplate = ({
  course = {},
  overview = {},
  instructor = null,
  stats = {},
  reviews = [],
  questions = [],
  onAskQuestion = null,
  onEnroll = null,
  onGoToLearning = null,
  isEnrolled = false,
  enrolling = false,
  isPreviewMode = false,
  user = null
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [questionInput, setQuestionInput] = useState('');
  const [submittingQ, setSubmittingQ] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Section references for in-page navigation
  const overviewRef = useRef(null);
  const curriculumRef = useRef(null);
  const reviewsRef = useRef(null);
  const qaRef = useRef(null);

  const scrollToSection = (ref, tabName) => {
    setActiveTab(tabName);
    if (ref?.current) {
      const topOffset = ref.current.getBoundingClientRect().top + window.pageYOffset - 130;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!questionInput.trim() || !onAskQuestion) return;
    setSubmittingQ(true);
    try {
      await onAskQuestion(questionInput.trim());
      setQuestionInput('');
    } finally {
      setSubmittingQ(false);
    }
  };

  // Safe data extraction
  const learningOutcomes = Array.isArray(overview?.learningOutcomes)
    ? overview.learningOutcomes
    : typeof overview?.learningOutcomes === 'string' && overview.learningOutcomes.trim()
    ? [overview.learningOutcomes]
    : [];

  const prerequisites = Array.isArray(overview?.prerequisites)
    ? overview.prerequisites
    : typeof overview?.prerequisites === 'string' && overview.prerequisites.trim()
    ? [overview.prerequisites]
    : [];

  const skills = Array.isArray(overview?.skills)
    ? overview.skills
    : typeof overview?.skills === 'string' && overview.skills.trim()
    ? [overview.skills]
    : [];

  const techStack = Array.isArray(overview?.techStack)
    ? overview.techStack
    : typeof overview?.techStack === 'string' && overview.techStack.trim()
    ? [overview.techStack]
    : [];

  const targetAudience = Array.isArray(overview?.targetAudience)
    ? overview.targetAudience
    : typeof overview?.targetAudience === 'string' && overview.targetAudience.trim()
    ? [overview.targetAudience]
    : [];

  const benefits = Array.isArray(overview?.benefits)
    ? overview.benefits
    : typeof overview?.benefits === 'string' && overview.benefits.trim()
    ? [overview.benefits]
    : [];

  const faqs = Array.isArray(overview?.faqs) ? overview.faqs : [];
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const courseTags = Array.isArray(course?.tags) ? course.tags : [];
  const modules = Array.isArray(course?.modules) ? course.modules : [];

  const fullDescriptionText = overview?.fullDescription || course?.fullDescription || course?.description || '';
  const isDescriptionLong = fullDescriptionText.length > 400;

  const totalLessonsCount = modules.reduce(
    (acc, m) => acc + (Array.isArray(m?.lessons) ? m.lessons.length : 0),
    0
  );

  const hasCertificate = course?.certificate !== false && overview?.certificate !== false;
  const instructorName = instructor?.name || instructor?.fullName || course?.instructorName || 'UpSkillr Instructor';
  const instructorHeadline = instructor?.headline || instructor?.designation || 'Instructor';
  const instructorAvatar = instructor?.profilePhoto || instructor?.avatar;

  const renderDescription = (text) => {
    if (!text || !text.trim()) {
      return <p className="desc-empty-text">No detailed description available.</p>;
    }

    const displayText = isDescriptionLong && !isDescExpanded ? text.slice(0, 380) + '...' : text;
    const paragraphs = displayText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

    return (
      <div className="description-blocks">
        {paragraphs.map((block, pIdx) => {
          const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
          const isBulletList = lines.length > 1 && lines.every((l) => /^[-*•✓]\s+|^\d+\.\s+/.test(l));

          if (isBulletList) {
            return (
              <ul key={pIdx} className="desc-bullet-list">
                {lines.map((line, lIdx) => {
                  const cleanText = line.replace(/^[-*•✓]\s+|^\d+\.\s+/, '');
                  return (
                    <li key={lIdx} className="desc-bullet-item">
                      <span className="desc-bullet-check">
                        <Check size={13} strokeWidth={3} />
                      </span>
                      <span>{cleanText}</span>
                    </li>
                  );
                })}
              </ul>
            );
          }

          return (
            <p key={pIdx} className="desc-paragraph">
              {block}
            </p>
          );
        })}

        {isDescriptionLong && (
          <button
            type="button"
            className="desc-expand-toggle-btn"
            onClick={() => setIsDescExpanded((prev) => !prev)}
            aria-expanded={isDescExpanded}
          >
            <span>{isDescExpanded ? 'Show less' : 'Show more'}</span>
            {isDescExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="course-overview-redesign-root">
      {/* ───────────────── 1. HERO SECTION ───────────────── */}
      <section className="overview-hero-section">
        <div className="overview-hero-container">
          {/* Left Column: Course Details */}
          <div className="overview-hero-left">
            {/* 1. Category Badge */}
            {course?.category && (
              <div className="overview-category-badge-wrap">
                <span className="overview-category-badge">{course.category}</span>
              </div>
            )}

            {/* 2. Course Title */}
            <h1 className="overview-hero-title">{course?.title || 'Untitled Course'}</h1>

            {/* 3. Short Description */}
            {(course?.shortDescription || course?.description) && (
              <p className="overview-hero-subtitle">
                {course.shortDescription || course.description}
              </p>
            )}

            {/* 4. Instructor, Rating & Enrolled Learners Info Row */}
            <div className="overview-hero-meta-strip">
              {/* Instructor Pill */}
              <div className="hero-instructor-item">
                <Avatar
                  image={instructorAvatar}
                  name={instructorName}
                  size="medium"
                  className="hero-instructor-avatar"
                />
                <div className="hero-instructor-text">
                  <span className="hero-instructor-name">{instructorName}</span>
                  <span className="hero-instructor-headline">{instructorHeadline}</span>
                </div>
              </div>

              <span className="hero-meta-divider" aria-hidden="true">|</span>

              {/* Rating */}
              <div className="hero-rating-item">
                <Star size={16} className="hero-star-icon" fill="currentColor" />
                {stats?.averageRating ? (
                  <span className="hero-rating-text">
                    <strong>{stats.averageRating.toFixed(1)}</strong>
                    <span className="hero-review-count"> ({stats.reviewCount || 0} reviews)</span>
                  </span>
                ) : (
                  <span className="hero-rating-text hero-no-rating">No ratings yet</span>
                )}
              </div>

              <span className="hero-meta-divider" aria-hidden="true">|</span>

              {/* Enrolled Learners */}
              <div className="hero-learners-item">
                <Users size={16} className="hero-learners-icon" />
                <span className="hero-learners-text">
                  <strong>{formatCount(stats?.totalEnrolments || 0)}</strong> learners
                </span>
              </div>
            </div>

            {/* 5. Course Tags */}
            {courseTags.length > 0 && (
              <div className="overview-hero-tags-row">
                {courseTags.map((tag, idx) => (
                  <span key={idx} className="overview-hero-tag-chip">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 6. Prominent Hero Enrollment Action Bar */}
            <div className="overview-hero-action-bar">
              <div className="hero-price-wrap">
                <span className="hero-price-label">Price</span>
                <span className="hero-price-value">
                  {course?.price > 0 ? `₹${course.price}` : 'Free'}
                </span>
              </div>

              {isPreviewMode ? (
                <div className="hero-preview-badge">
                  <span>✦ Preview Mode (Instructor Draft)</span>
                </div>
              ) : isEnrolled ? (
                <button
                  type="button"
                  className="btn-hero-enrolled"
                  onClick={onGoToLearning}
                >
                  <CheckCircle2 size={18} />
                  <span>Already Enrolled • Go to Learning</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-hero-enroll"
                  onClick={onEnroll}
                  disabled={enrolling}
                >
                  <span>{enrolling ? 'Enrolling...' : (course?.price > 0 ? 'Enroll Now' : 'Enroll for Free')}</span>
                  <ArrowRight size={18} />
                </button>
              )}

              {hasCertificate && (
                <div className="hero-certificate-tag" title="Verified completion certificate included">
                  <Award size={16} className="hero-cert-icon" />
                  <span>Certificate Included</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Existing SVG Illustration (No Thumbnail, No Right Pricing Card) */}
          <div className="overview-hero-right">
            <div className="overview-hero-illustration-wrapper">
              <img
                src={courseOverviewIllustration}
                alt="Course Overview Graphic"
                className="overview-hero-svg"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── 2. SECTION TABS BAR ───────────────── */}
      <nav className="overview-section-tabs-bar" aria-label="Course section navigation">
        <div className="overview-tabs-container">
          <div className="overview-tabs-list">
            <button
              type="button"
              className={`overview-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => scrollToSection(overviewRef, 'overview')}
            >
              <BookOpen size={16} />
              <span>Overview</span>
            </button>
            <button
              type="button"
              className={`overview-tab-btn ${activeTab === 'curriculum' ? 'active' : ''}`}
              onClick={() => scrollToSection(curriculumRef, 'curriculum')}
            >
              <Layers size={16} />
              <span>Curriculum</span>
              {modules.length > 0 && <span className="tab-count-badge">{modules.length}</span>}
            </button>
            <button
              type="button"
              className={`overview-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
              onClick={() => scrollToSection(reviewsRef, 'reviews')}
            >
              <Star size={16} />
              <span>Reviews</span>
              {stats?.reviewCount > 0 && <span className="tab-count-badge">{stats.reviewCount}</span>}
            </button>
            <button
              type="button"
              className={`overview-tab-btn ${activeTab === 'qa' ? 'active' : ''}`}
              onClick={() => scrollToSection(qaRef, 'qa')}
            >
              <MessageCircle size={16} />
              <span>Q&A</span>
              {safeQuestions.length > 0 && <span className="tab-count-badge">{safeQuestions.length}</span>}
            </button>
          </div>

          {/* Quick Enroll CTA on tabs bar */}
          <div className="overview-tabs-action">
            {!isPreviewMode && !isEnrolled && (
              <button
                type="button"
                className="btn-tab-quick-enroll"
                onClick={onEnroll}
                disabled={enrolling}
              >
                <span>{enrolling ? 'Enrolling...' : (course?.price > 0 ? `Enroll • ₹${course.price}` : 'Enroll for Free')}</span>
              </button>
            )}
            {!isPreviewMode && isEnrolled && (
              <button
                type="button"
                className="btn-tab-quick-enrolled"
                onClick={onGoToLearning}
              >
                <span>Go to Learning</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ───────────────── 3. MAIN CONTENT CONTAINER ───────────────── */}
      <div className="overview-main-wrapper">
        <div className="overview-content-layout">
          {/* ───────────────── SECTION A: OVERVIEW ───────────────── */}
          <div ref={overviewRef} id="overview-content" className="overview-content-section-group">
            {/* A. About This Course */}
            <section className="overview-card-block about-course-block">
              <div className="block-header">
                <BookOpen size={20} className="block-header-icon" />
                <h2 className="block-title">About This Course</h2>
              </div>
              <div className="about-course-body">
                {renderDescription(fullDescriptionText)}
              </div>
            </section>

            {/* B. What You'll Learn */}
            {learningOutcomes.length > 0 && (
              <section className="overview-card-block outcomes-block">
                <div className="block-header">
                  <Target size={20} className="block-header-icon accent-green" />
                  <h2 className="block-title">What You'll Learn</h2>
                </div>
                <div className="outcomes-grid">
                  {learningOutcomes.map((outcome, idx) => (
                    <div key={idx} className="outcome-item-card">
                      <div className="outcome-check-wrap">
                        <Check size={16} strokeWidth={2.5} />
                      </div>
                      <span className="outcome-text">{outcome}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* C. Skills You'll Gain */}
            {skills.length > 0 && (
              <section className="overview-card-block skills-block">
                <div className="block-header">
                  <Sparkles size={20} className="block-header-icon" />
                  <h2 className="block-title">Skills You'll Gain</h2>
                </div>
                <div className="skills-chips-cloud">
                  {skills.map((skill, idx) => (
                    <span key={idx} className="skill-chip-tag">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* D. Technologies & Tools (Text-Only Labels per Rule) */}
            {techStack.length > 0 && (
              <section className="overview-card-block techstack-block">
                <div className="block-header">
                  <Layers size={20} className="block-header-icon" />
                  <h2 className="block-title">Technologies & Tools</h2>
                </div>
                <div className="techstack-chips-cloud">
                  {techStack.map((tool, idx) => (
                    <span key={idx} className="techstack-text-badge">
                      {tool}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* E & F. Prerequisites and Who This Course Is For (Side-by-Side 2-Column Grid) */}
            {(prerequisites.length > 0 || targetAudience.length > 0) && (
              <div className="overview-two-col-grid">
                {/* Prerequisites */}
                {prerequisites.length > 0 && (
                  <section className="overview-card-block prereq-block">
                    <div className="block-header">
                      <CheckCircle2 size={20} className="block-header-icon" />
                      <h2 className="block-title">Prerequisites</h2>
                    </div>
                    <ul className="check-bullet-list">
                      {prerequisites.map((p, idx) => (
                        <li key={idx} className="check-bullet-item">
                          <Check size={14} className="check-bullet-icon" strokeWidth={2.5} />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Who This Course Is For */}
                {targetAudience.length > 0 && (
                  <section className="overview-card-block audience-block">
                    <div className="block-header">
                      <Users size={20} className="block-header-icon" />
                      <h2 className="block-title">Who This Course Is For</h2>
                    </div>
                    <ul className="check-bullet-list">
                      {targetAudience.map((aud, idx) => (
                        <li key={idx} className="check-bullet-item">
                          <Check size={14} className="check-bullet-icon" strokeWidth={2.5} />
                          <span>{aud}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}

            {/* G & H. Key Benefits & Instructor's Message (Side-by-Side 2-Column Grid) */}
            {(benefits.length > 0 || hasCertificate || overview?.instructorMessage) && (
              <div className="overview-two-col-grid">
                {/* Key Benefits */}
                {(benefits.length > 0 || hasCertificate) && (
                  <section className="overview-card-block benefits-block">
                    <div className="block-header">
                      <ShieldCheck size={20} className="block-header-icon accent-green" />
                      <h2 className="block-title">Key Benefits</h2>
                    </div>
                    <div className="benefits-grid">
                      {hasCertificate && (
                        <div className="benefit-card-mini">
                          <Award size={18} className="benefit-icon" />
                          <div className="benefit-content">
                            <h4>Certificate of Completion</h4>
                            <p>Earn an industry-recognized certificate upon completing all lessons.</p>
                          </div>
                        </div>
                      )}
                      <div className="benefit-card-mini">
                        <Clock size={18} className="benefit-icon" />
                        <div className="benefit-content">
                          <h4>Self-Paced Lifetime Learning</h4>
                          <p>Learn at your own pace with unlimited lifetime access to all course modules.</p>
                        </div>
                      </div>
                      {benefits.map((benefit, idx) => (
                        <div key={idx} className="benefit-card-mini">
                          <Sparkles size={18} className="benefit-icon" />
                          <div className="benefit-content">
                            <h4>{benefit}</h4>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Instructor's Message inside Overview (Not a separate Instructor tab) */}
                {overview?.instructorMessage && (
                  <section className="overview-card-block instructor-message-block">
                    <div className="block-header">
                      <Quote size={20} className="block-header-icon accent-green" />
                      <h2 className="block-title">Instructor's Message</h2>
                    </div>
                    <div className="instructor-quote-card">
                      <p className="instructor-quote-text">
                        "{overview.instructorMessage}"
                      </p>
                      <div className="instructor-quote-author">
                        <Avatar
                          image={instructorAvatar}
                          name={instructorName}
                          size="small"
                        />
                        <div className="quote-author-info">
                          <span className="quote-author-name">{instructorName}</span>
                          <span className="quote-author-headline">{instructorHeadline}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* I. Frequently Asked Questions */}
            {faqs.length > 0 && (
              <section className="overview-card-block faqs-block">
                <div className="block-header">
                  <HelpCircle size={20} className="block-header-icon" />
                  <h2 className="block-title">Frequently Asked Questions</h2>
                </div>
                <div className="faq-accordion-container">
                  {faqs.map((faq, idx) => {
                    const isOpen = activeFaq === idx;
                    return (
                      <div key={idx} className={`faq-accordion-item ${isOpen ? 'open' : ''}`}>
                        <button
                          type="button"
                          className="faq-question-trigger"
                          onClick={() => setActiveFaq(isOpen ? null : idx)}
                          aria-expanded={isOpen}
                        >
                          <span className="faq-question-label">{faq.question}</span>
                          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {isOpen && (
                          <div className="faq-answer-panel">
                            <p>{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* ───────────────── SECTION B: CURRICULUM (STRUCTURE ONLY) ───────────────── */}
          <div ref={curriculumRef} id="curriculum-content" className="overview-content-section-group">
            <section className="overview-card-block curriculum-block">
              <div className="block-header curriculum-header-flex">
                <div className="header-left">
                  <Layers size={20} className="block-header-icon accent-green" />
                  <div>
                    <h2 className="block-title">Course Curriculum & Syllabus</h2>
                    <p className="block-subtitle">
                      {modules.length} {modules.length === 1 ? 'Module' : 'Modules'} • {totalLessonsCount} Lessons
                    </p>
                  </div>
                </div>
              </div>

              {modules.length === 0 ? (
                <div className="empty-curriculum-notice">
                  <Layers size={28} className="empty-icon" />
                  <p>Curriculum is being finalized by the instructor. Check back soon!</p>
                </div>
              ) : (
                <div className="curriculum-modules-accordion">
                  {modules.map((mod, mIdx) => {
                    const modKey = mod._id || `mod_${mIdx}`;
                    const isModOpen = expandedModules[modKey] !== false; // open by default
                    const lessons = Array.isArray(mod.lessons) ? mod.lessons : [];

                    return (
                      <div key={modKey} className={`curriculum-module-item ${isModOpen ? 'open' : ''}`}>
                        <button
                          type="button"
                          className="curriculum-module-bar"
                          onClick={() =>
                            setExpandedModules((prev) => ({
                              ...prev,
                              [modKey]: !isModOpen
                            }))
                          }
                          aria-expanded={isModOpen}
                        >
                          <div className="module-bar-left">
                            <span className="module-number-pill">Module {mIdx + 1}</span>
                            <span className="module-title-heading">{mod.title}</span>
                          </div>
                          <div className="module-bar-right">
                            <span className="module-lessons-count-text">
                              {lessons.length} {lessons.length === 1 ? 'Lesson' : 'Lessons'}
                            </span>
                            {isModOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </button>

                        {/* STRICT RESTRICTION: Structure ONLY. Real lesson titles & durations. NO private content, quiz, video, or note preview */}
                        {isModOpen && (
                          <div className="curriculum-lessons-tree">
                            {lessons.length === 0 ? (
                              <div className="curriculum-no-lessons">No lessons listed in this module.</div>
                            ) : (
                              lessons.map((les, lIdx) => (
                                <div key={les._id || lIdx} className="curriculum-lesson-leaf">
                                  <div className="lesson-leaf-left">
                                    <PlayCircle size={15} className="lesson-play-glyph" />
                                    <span className="lesson-leaf-title">{les.title}</span>
                                  </div>
                                  {les.duration && (
                                    <div className="lesson-leaf-right">
                                      <Clock size={13} className="lesson-clock-icon" />
                                      <span className="lesson-leaf-duration">{les.duration}</span>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* ───────────────── SECTION C: REVIEWS ───────────────── */}
          <div ref={reviewsRef} id="reviews-content" className="overview-content-section-group">
            <section className="overview-card-block reviews-block">
              <div className="block-header">
                <Star size={20} className="block-header-icon" />
                <div>
                  <h2 className="block-title">Learner Ratings & Feedback</h2>
                  {stats?.reviewCount > 0 && (
                    <p className="block-subtitle">
                      Based on real feedback from verified enrolled students
                    </p>
                  )}
                </div>
              </div>

              {safeReviews.length === 0 ? (
                <div className="empty-reviews-state">
                  <Star size={32} className="empty-reviews-star" />
                  <h3>No reviews yet</h3>
                  <p>This course is recently published. Verified student ratings and feedback will appear here as learners progress.</p>
                </div>
              ) : (
                <div className="reviews-cards-grid">
                  {safeReviews.map((rev, idx) => (
                    <div key={idx} className="review-item-card">
                      <div className="review-item-header">
                        <Avatar
                          image={rev.learnerAvatar}
                          name={rev.learnerName}
                          size="small"
                        />
                        <div className="review-author-meta">
                          <span className="review-author-name">{rev.learnerName || 'Learner'}</span>
                          <span className="review-date-text">
                            {rev.ratedAt ? new Date(rev.ratedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="review-stars-wrap">
                          {[...Array(5)].map((_, sIdx) => (
                            <Star
                              key={sIdx}
                              size={14}
                              className={sIdx < rev.rating ? 'star-filled' : 'star-empty'}
                              fill="currentColor"
                            />
                          ))}
                        </div>
                      </div>

                      <p className="review-quote-body">"{rev.feedback}"</p>

                      {Array.isArray(rev.tags) && rev.tags.length > 0 && (
                        <div className="review-tags-list">
                          {rev.tags.map((tag, tIdx) => (
                            <span key={tIdx} className="review-tag-badge">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ───────────────── SECTION D: Q&A / COURSE DOUBTS ───────────────── */}
          <div ref={qaRef} id="qa-content" className="overview-content-section-group">
            <section className="overview-card-block qa-block">
              <div className="block-header">
                <MessageCircle size={20} className="block-header-icon accent-green" />
                <div>
                  <h2 className="block-title">Course Doubts & Inquiries</h2>
                  <p className="block-subtitle">
                    Have questions before enrolling? Ask the instructor directly.
                  </p>
                </div>
              </div>

              {/* Inquiry Question Submission Form */}
              {!isPreviewMode && onAskQuestion && (
                <form className="qa-inquiry-form" onSubmit={handleQuestionSubmit}>
                  <textarea
                    rows={3}
                    className="qa-textarea-input"
                    placeholder={user ? "Ask a question or doubt about this course..." : "Log in as a learner to ask a doubt..."}
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    disabled={!user || submittingQ}
                  />
                  <div className="qa-form-actions-row">
                    {!user && (
                      <span className="qa-login-hint">
                        You must be signed in as a learner to ask a question.
                      </span>
                    )}
                    <button
                      type="submit"
                      className="btn-submit-qa"
                      disabled={!user || !questionInput.trim() || submittingQ}
                    >
                      <Send size={15} />
                      <span>{submittingQ ? 'Submitting...' : 'Ask Question'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Answered Questions List */}
              <div className="qa-inquiries-list">
                {safeQuestions.length === 0 ? (
                  <div className="empty-qa-state">
                    <FileQuestion size={30} className="empty-qa-icon" />
                    <p>No inquiries asked yet. Be the first to ask a question!</p>
                  </div>
                ) : (
                  safeQuestions.map((q, idx) => (
                    <div key={idx} className="qa-inquiry-card">
                      <div className="qa-inquiry-question-box">
                        <div className="qa-user-row">
                          <Avatar
                            image={q.userAvatar}
                            name={q.userName}
                            size="small"
                          />
                          <span className="qa-user-title">{q.userName || 'Learner'}</span>
                          {q.createdAt && (
                            <span className="qa-timestamp">
                              • {new Date(q.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="qa-question-content">{q.question}</p>
                      </div>

                      {q.instructorReply && (
                        <div className="qa-instructor-reply-box">
                          <div className="qa-reply-header">
                            <Avatar
                              image={instructorAvatar}
                              name={instructorName}
                              size="small"
                            />
                            <div className="reply-meta">
                              <span className="reply-instructor-name">{instructorName}</span>
                              <span className="reply-instructor-tag">Instructor Reply</span>
                            </div>
                            {q.replyTimestamp && (
                              <span className="reply-date">
                                {new Date(q.replyTimestamp).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="qa-reply-text">{q.instructorReply}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* ───────────────── BOTTOM ENROLL CTA BANNER ───────────────── */}
          {!isPreviewMode && !isEnrolled && (
            <div className="overview-bottom-cta-banner">
              <div className="bottom-cta-content">
                <h3>Ready to start learning {course?.title}?</h3>
                <p>
                  {modules.length} Modules • {totalLessonsCount} Lessons • {course?.price > 0 ? `₹${course.price}` : 'Free Course'}
                </p>
              </div>
              <button
                type="button"
                className="btn-bottom-enroll"
                onClick={onEnroll}
                disabled={enrolling}
              >
                <span>{enrolling ? 'Enrolling...' : (course?.price > 0 ? 'Enroll Now' : 'Enroll for Free')}</span>
                <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
