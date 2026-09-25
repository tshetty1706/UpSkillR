import React, { useState } from 'react';
import {
  Check,
  Award,
  Globe,
  Users,
  Eye,
  Star,
  BookOpen,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Zap,
  Send,
  HelpCircle,
  Layers,
  Video,
  PlayCircle,
  CheckCircle2
} from 'lucide-react';
import { CourseThumbnail } from '../../../../common/CourseThumbnail';
import { Avatar } from '../../../../common/Avatar/Avatar';
import { QuizPlayerModal } from '../../../../learner/quiz/QuizPlayerModal';
import './CourseOverviewTemplate.css';

const LinkedinIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GithubIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export const CourseOverviewTemplate = ({
  course = {},
  overview = {},
  instructor = null,
  stats = {},
  reviews = [],
  questions = [],
  onAskQuestion = null,
  onEnroll = null,
  isEnrolled = false,
  enrolling = false,
  isPreviewMode = false,
  user = null
}) => {
  const [questionInput, setQuestionInput] = useState('');
  const [submittingQ, setSubmittingQ] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [activeQuizModal, setActiveQuizModal] = useState(null);
  const [passedQuizzes, setPassedQuizzes] = useState(() => {
    try {
      const stored = sessionStorage.getItem(`upskillr_passed_quizzes_${course?._id}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleQuizPassed = (quizItem, percent, moduleIndex) => {
    const key = String(quizItem?._id || quizItem?.title || moduleIndex);
    setPassedQuizzes(prev => {
      const updated = new Set(prev);
      updated.add(key);
      try {
        sessionStorage.setItem(`upskillr_passed_quizzes_${course?._id}`, JSON.stringify([...updated]));
      } catch {}
      return updated;
    });
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
  const optionalLinks = Array.isArray(overview?.optionalLinks) ? overview.optionalLinks : [];
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const safeReviews = Array.isArray(reviews) ? reviews : [];

  const wordCount = overview?.fullDescription
    ? overview.fullDescription.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 160));

  const renderFormattedDescription = (text) => {
    if (!text || !text.trim()) {
      return <p className="desc-empty-text">No description provided.</p>;
    }

    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

    return paragraphs.map((block, pIdx) => {
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

      const hasBullets = lines.some((l) => /^[-*•✓]\s+|^\d+\.\s+/.test(l));
      if (hasBullets) {
        return (
          <div key={pIdx} className="desc-mixed-block">
            {lines.map((line, lIdx) => {
              if (/^[-*•✓]\s+|^\d+\.\s+/.test(line)) {
                const cleanText = line.replace(/^[-*•✓]\s+|^\d+\.\s+/, '');
                return (
                  <div key={lIdx} className="desc-bullet-item">
                    <span className="desc-bullet-check">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <span>{cleanText}</span>
                  </div>
                );
              }
              return (
                <p
                  key={lIdx}
                  className={pIdx === 0 && lIdx === 0 ? 'desc-lead-paragraph' : 'desc-paragraph'}
                >
                  {line}
                </p>
              );
            })}
          </div>
        );
      }

      return (
        <p key={pIdx} className={pIdx === 0 ? 'desc-lead-paragraph' : 'desc-paragraph'}>
          {block}
        </p>
      );
    });
  };

  return (
    <div className="course-overview-template-root">
      {/* Top Hero Banner */}
      <header className="overview-hero-banner">
        <div className="overview-hero-container">
          <div className="overview-hero-content">
            <div className="overview-tags-row">
              <span className="overview-badge-cat">{course?.category || 'General'}</span>
              <span className="overview-badge-lvl">{course?.skillLevel || 'Beginner'}</span>
              <span className="overview-badge-lang">
                <Globe size={13} /> {course?.language || 'English'}
              </span>
            </div>

            <h1 className="overview-hero-title">{course?.title || 'Untitled Course'}</h1>
            <p className="overview-hero-desc">
              {course?.shortDescription || overview?.fullDescription?.slice(0, 160) || ''}
            </p>

            <div className="overview-hero-meta-bar">
              <div className="overview-meta-item">
                <Users size={16} className="meta-icon" />
                <span>{stats?.totalEnrolments || 0} Learners Enrolled</span>
              </div>
              <div className="overview-meta-item">
                <Eye size={16} className="meta-icon" />
                <span>{stats?.overviewViews || course?.overviewViews || 0} Views</span>
              </div>
              {stats?.averageRating ? (
                <div className="overview-meta-item rating-meta">
                  <Star size={16} className="star-icon-fill" />
                  <span>
                    <strong>{stats.averageRating}</strong> ({stats.reviewCount || 0} reviews)
                  </span>
                </div>
              ) : null}
            </div>

            <div className="overview-instructor-pill">
              <Avatar
                image={instructor?.profilePhoto || instructor?.avatar || course?.instructorAvatar}
                name={instructor?.name || instructor?.fullName || course?.instructorName || 'UpSkillr Instructor'}
                size="small"
              />
              <div className="instructor-mini-info">
                <span className="inst-label">Instructor</span>
                <span className="inst-name">{instructor?.name || instructor?.fullName || course?.instructorName || 'UpSkillr Instructor'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <div className="overview-body-container">
        {/* Left Column */}
        <main className="overview-main-col">
          {/* What You'll Learn Box */}
          {learningOutcomes.length > 0 && (
            <section className="overview-section outcomes-section">
              <h2 className="section-heading">What You'll Learn</h2>
              <div className="outcomes-grid">
                {learningOutcomes.map((outcome, idx) => (
                  <div key={idx} className="outcome-item">
                    <Check size={18} className="outcome-check-icon" />
                    <span>{outcome}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* About This Course (Best-in-Class Presentation) */}
          <section className="overview-section about-course-section">
            <div className="section-title-row title-with-meta">
              <div className="title-left-group">
                <BookOpen size={20} className="section-title-icon" />
                <h2 className="section-heading">About This Course</h2>
              </div>
              {wordCount > 20 && (
                <span className="read-time-badge">
                  <Clock size={13} />
                  <span>{readTimeMinutes} min read</span>
                </span>
              )}
            </div>

            <div className="about-course-card">
              <div className="description-formatted-text">
                {renderFormattedDescription(overview?.fullDescription)}
              </div>

              {/* Course Value Pillars Callout */}
              <div className="course-value-pillars-strip">
                <div className="value-pillar-badge">
                  <Zap size={14} className="pillar-icon" />
                  <span>Practical Hands-on Focus</span>
                </div>
                <div className="value-pillar-badge">
                  <Sparkles size={14} className="pillar-icon" />
                  <span>Curated Curriculum</span>
                </div>
                {overview?.certificate !== false && (
                  <div className="value-pillar-badge">
                    <Award size={14} className="pillar-icon" />
                    <span>Verified Certificate Included</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Skills You'll Gain (Distinct Point Identity) */}
          {skills.length > 0 && (
            <section className="overview-section skills-gain-section">
              <div className="section-title-row">
                <Sparkles size={20} className="section-title-icon" />
                <h2 className="section-heading">Skills You'll Gain</h2>
              </div>
              <p className="section-subnote">
                Key competencies and practical skillsets you will master upon completing this course:
              </p>
              <div className="skills-point-identity-grid">
                {skills.map((skill, idx) => (
                  <div key={idx} className="skill-point-card">
                    <div className="skill-point-marker">
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span className="skill-point-text">{skill}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tech Stack / Tools */}
          {techStack.length > 0 && (
            <section className="overview-section">
              <h2 className="section-heading">Technologies & Tools</h2>
              <div className="chips-list">
                {techStack.map((tool, idx) => (
                  <span key={idx} className="overview-chip tech-chip">
                    {tool}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Who This Course is For */}
          {targetAudience.length > 0 && (
            <section className="overview-section audience-section">
              <div className="section-title-row">
                <Users size={20} className="section-title-icon" />
                <h2 className="section-heading">Who This Course is For</h2>
              </div>
              <div className="audience-badges-wrap">
                {targetAudience.map((aud, idx) => (
                  <div key={idx} className="audience-badge-item">
                    <span className="audience-dot" />
                    <span className="audience-title">{aud}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Prerequisites */}
          {prerequisites.length > 0 && (
            <section className="overview-section">
              <h2 className="section-heading">Prerequisites</h2>
              <p className="section-subnote">Skills or background knowledge required before starting:</p>
              <div className="chips-list">
                {prerequisites.map((p, idx) => (
                  <span key={idx} className="overview-chip prereq-chip">
                    {p}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Course Curriculum & Syllabus */}
          {Array.isArray(course?.modules) && course.modules.length > 0 && (
            <section className="overview-section syllabus-section">
              <div className="section-title-row">
                <Layers size={20} className="section-title-icon" />
                <h2 className="section-heading">Course Curriculum & Syllabus</h2>
              </div>
              <p className="section-subnote">
                {course.modules.length} {course.modules.length === 1 ? 'Module' : 'Modules'} •{' '}
                {course.modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0)} Total Lessons
              </p>
              <div className="curriculum-accordion-list">
                {course.modules.map((mod, mIdx) => {
                  const modKey = mod._id || `m_${mIdx}`;
                  const isModOpen = expandedModules[modKey] !== false; // open by default
                  return (
                    <div key={modKey} className={`curriculum-module-card ${isModOpen ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="curriculum-module-header"
                        onClick={() =>
                          setExpandedModules((prev) => ({
                            ...prev,
                            [modKey]: !isModOpen
                          }))
                        }
                      >
                        <div className="module-header-title-wrap">
                          <span className="module-index-badge">Module {mIdx + 1}</span>
                          <span className="module-title-text">{mod.title}</span>
                        </div>
                        <div className="module-header-meta">
                          <span className="module-lesson-count">
                            {mod.lessons?.length || 0} {mod.lessons?.length === 1 ? 'lesson' : 'lessons'}
                          </span>
                          {isModOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </button>
                      {isModOpen && (
                        <div className="curriculum-lessons-list">
                          {!mod.lessons || mod.lessons.length === 0 ? (
                            <div className="curriculum-empty-lesson">No lessons published in this module yet.</div>
                          ) : (
                            mod.lessons.map((les, lIdx) => {
                              const items = les.items || les.contentItems || [];
                              const hasQuiz = items.some(i => (i.type || '').toLowerCase() === 'quiz');
                              const quizItem = items.find(i => (i.type || '').toLowerCase() === 'quiz');

                              return (
                                <div key={les._id || lIdx} className="curriculum-lesson-container">
                                  <div
                                    className="curriculum-lesson-row"
                                    onClick={() => {
                                      if (quizItem) {
                                        const isPassed = passedQuizzes.has(String(quizItem._id || quizItem.title || mIdx));
                                        setActiveQuizModal({
                                          item: quizItem,
                                          module: mod,
                                          lesson: les,
                                          moduleIndex: mIdx,
                                          lessonIndex: lIdx,
                                          isAlreadyPassed: isPassed
                                        });
                                      }
                                    }}
                                    style={quizItem ? { cursor: 'pointer' } : {}}
                                  >
                                    <div className="lesson-left">
                                      <PlayCircle size={15} className="lesson-play-icon" />
                                      <span className="lesson-row-title">{les.title}</span>
                                      {hasQuiz && (
                                        <span className="lesson-has-quiz-tag">
                                          <HelpCircle size={12} />
                                          <span>1 Quiz</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="lesson-right-meta">
                                      {les.duration && <span className="lesson-row-duration">{les.duration}</span>}
                                    </div>
                                  </div>

                                  {/* Exposed Content Items (e.g. Quizzes and Videos) */}
                                  {items.length > 0 && (
                                    <div className="curriculum-items-sublist">
                                      {items.map((item, iIdx) => {
                                        const isQuiz = (item.type || '').toLowerCase() === 'quiz';
                                        return (
                                          <div
                                            key={item._id || iIdx}
                                            className={`curriculum-item-subrow ${isQuiz ? 'quiz-item-row' : 'video-item-row'}`}
                                          >
                                            <div className="item-subrow-left">
                                              {isQuiz ? (
                                                <HelpCircle size={15} className="item-sub-icon quiz-color" />
                                              ) : (
                                                <Video size={15} className="item-sub-icon video-color" />
                                              )}
                                              <span className="item-sub-title">{item.title || (isQuiz ? 'Quiz' : 'Video Lecture')}</span>
                                              <span className="item-sub-badge">
                                                {isQuiz
                                                  ? `Quiz • ${item.quiz?.questions?.length || 1} Question${(item.quiz?.questions?.length || 1) === 1 ? '' : 's'}`
                                                  : 'Video Lecture'}
                                              </span>
                                            </div>

                                            {isQuiz && (
                                              <button
                                                type="button"
                                                className={`btn-take-quiz-action ${passedQuizzes.has(String(item._id || item.title || mIdx)) ? 'passed-quiz-badge' : ''}`}
                                                style={passedQuizzes.has(String(item._id || item.title || mIdx)) ? { borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' } : {}}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const isItemPassed = passedQuizzes.has(String(item._id || item.title || mIdx));
                                                  setActiveQuizModal({
                                                    item,
                                                    module: mod,
                                                    lesson: les,
                                                    moduleIndex: mIdx,
                                                    lessonIndex: lIdx,
                                                    isAlreadyPassed: isItemPassed
                                                  });
                                                }}
                                              >
                                                {passedQuizzes.has(String(item._id || item.title || mIdx)) ? (
                                                  <>
                                                    <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                                                    <span style={{ color: '#10b981', fontWeight: 600 }}>Passed ✓</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Award size={13} />
                                                    <span>{isEnrolled ? 'Open Quiz' : 'Preview Quiz'}</span>
                                                  </>
                                                )}
                                              </button>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* FAQs */}
          {faqs.length > 0 && (
            <section className="overview-section">
              <h2 className="section-heading">Frequently Asked Questions</h2>
              <div className="faq-accordion-list">
                {faqs.map((faq, idx) => {
                  const isOpen = activeFaq === idx;
                  return (
                    <div key={idx} className={`faq-card ${isOpen ? 'open' : ''}`}>
                      <button
                        type="button"
                        className="faq-question-btn"
                        onClick={() => setActiveFaq(isOpen ? null : idx)}
                      >
                        <span>{faq.question}</span>
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      {isOpen && <div className="faq-answer-text">{faq.answer}</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Pre-enrollment Q&A / Inquiry Box */}
          <section className="overview-section qa-section">
            <div className="qa-section-header">
              <MessageCircle size={22} className="accent-green" />
              <div>
                <h2 className="section-heading" style={{ margin: 0 }}>
                  Course Doubts & Inquiries
                </h2>
                <p className="section-subnote" style={{ margin: '0.2rem 0 0 0' }}>
                  Have questions before enrolling? Ask the instructor directly.
                </p>
              </div>
            </div>

            {!isPreviewMode && onAskQuestion && (
              <form className="qa-ask-form" onSubmit={handleQuestionSubmit}>
                <textarea
                  rows={2}
                  className="qa-input-area"
                  placeholder={user ? "Ask a doubt about this course..." : "Log in as a learner to ask a doubt..."}
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  disabled={!user || submittingQ}
                />
                <button
                  type="submit"
                  className="btn-ask-submit"
                  disabled={!user || !questionInput.trim() || submittingQ}
                >
                  <Send size={15} />
                  <span>{submittingQ ? 'Submitting...' : 'Ask Question'}</span>
                </button>
              </form>
            )}

            {/* Answered Questions List */}
            <div className="qa-questions-list">
              {safeQuestions.length === 0 ? (
                <div className="empty-qa-box">
                  <HelpCircle size={24} />
                  <p>No inquiries asked yet. Be the first to ask a question!</p>
                </div>
              ) : (
                safeQuestions.map((q, idx) => (
                  <div key={idx} className="qa-card-item">
                    <div className="qa-question-row">
                      <span className="qa-user-name">{q.userName || 'Learner'} asked:</span>
                      <p className="qa-question-text">{q.question}</p>
                    </div>
                    {q.instructorReply && (
                      <div className="qa-reply-box">
                        <span className="qa-instructor-badge">
                          Instructor Reply {q.replyTimestamp ? `• ${new Date(q.replyTimestamp).toLocaleDateString()}` : ''}
                        </span>
                        <p className="qa-reply-text">{q.instructorReply}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Real Reviews Section */}
          <section className="overview-section reviews-section">
            <h2 className="section-heading">Learner Ratings & Feedback</h2>
            {safeReviews.length === 0 ? (
              <div className="empty-reviews-box">
                <Star size={26} className="empty-star-icon" />
                <h3>No reviews yet</h3>
                <p>This course is recently created. Real ratings and reviews will appear here once learners enroll and complete lessons.</p>
              </div>
            ) : (
              <div className="real-reviews-grid">
                {safeReviews.map((rev, idx) => (
                  <div key={idx} className="review-card-item">
                    <div className="review-rating-row">
                      <div className="review-stars">
                        {[...Array(5)].map((_, sIdx) => (
                          <Star
                            key={sIdx}
                            size={14}
                            className={sIdx < rev.rating ? 'star-filled' : 'star-empty'}
                          />
                        ))}
                      </div>
                      <span className="review-date">
                        {rev.ratedAt ? new Date(rev.ratedAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="review-feedback-quote">"{rev.feedback}"</p>
                    <span className="review-learner-author">— {rev.learnerName}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        {/* Right Sticky Sidebar */}
        <aside className="overview-sticky-sidebar">
          <div className="overview-card-sticky">
            <div className="overview-card-thumb-wrap">
              <CourseThumbnail
                src={course?.thumbnail}
                alt={course?.title || 'Course Thumbnail'}
                className="overview-card-thumb-img"
              />
            </div>

            <div className="overview-card-details">
              <div className="price-row">
                <span className="price-label">Price</span>
                <span className="price-value">
                  {course?.price > 0 ? `₹${course.price}` : 'Free'}
                </span>
              </div>

              {overview?.certificate !== false && (
                <div className="cert-feature-badge">
                  <Award size={18} className="accent-green" />
                  <span>Verified Certificate of Completion</span>
                </div>
              )}

              {isPreviewMode ? (
                <div className="preview-mode-banner">
                  <span>✦ Preview Mode (Live Form Data)</span>
                </div>
              ) : isEnrolled ? (
                <button type="button" className="btn-enroll-primary btn-enrolled-active" disabled>
                  <Check size={18} />
                  <span>Already Enrolled</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-enroll-primary"
                  onClick={onEnroll}
                  disabled={enrolling}
                >
                  {enrolling ? 'Enrolling...' : 'Enroll Now'}
                </button>
              )}

              {/* Instructor Details Card */}
              <div className="instructor-sidebar-box">
                <h4>About the Instructor</h4>
                <p className="inst-sidebar-headline">
                  {instructor?.headline || 'UpSkillr Instructor'}
                </p>
                {instructor?.bio && (
                  <p className="inst-sidebar-bio">{instructor.bio}</p>
                )}

                {overview?.instructorMessage && (
                  <div className="inst-note-callout">
                    <span>"{overview.instructorMessage}"</span>
                  </div>
                )}

                {optionalLinks.length > 0 && (
                  <div className="inst-links-row">
                    {optionalLinks.map((link, lIdx) => (
                      <a
                        key={lIdx}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inst-social-link"
                        title={link.platform}
                      >
                        {link.platform === 'linkedin' ? (
                          <LinkedinIcon size={16} />
                        ) : link.platform === 'github' ? (
                          <GithubIcon size={16} />
                        ) : (
                          <ExternalLink size={16} />
                        )}
                        <span>{link.platform}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Quiz Player Modal */}
      {activeQuizModal && (
        <QuizPlayerModal
          quizItem={activeQuizModal.item}
          moduleTitle={activeQuizModal.module?.title}
          lessonTitle={activeQuizModal.lesson?.title}
          moduleIndex={activeQuizModal.moduleIndex}
          moduleId={activeQuizModal.module?._id}
          lessonIndex={activeQuizModal.lessonIndex}
          lessonId={activeQuizModal.lesson?._id}
          courseId={course?._id}
          courseTitle={course?.title}
          isEnrolled={isEnrolled}
          isAlreadyPassed={activeQuizModal.isAlreadyPassed}
          onClose={() => setActiveQuizModal(null)}
          onQuizPassed={handleQuizPassed}
        />
      )}
    </div>
  );
};
