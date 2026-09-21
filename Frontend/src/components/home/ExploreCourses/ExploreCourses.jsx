import React, { useState, useEffect } from 'react';
import {
  BookOpen, Search, Video, Users, CheckCircle2, Star, Sparkles, ArrowRight, Bookmark, Clock, User,
  SlidersHorizontal, BarChart2, ChevronRight, X, Award, FileText, Layers, FileCode, HelpCircle
} from 'lucide-react';
import './ExploreCourses.css';
import { useToast } from '../../../context/ToastContext';
import exploreCoursesSvg from '../../../assets/illustrations/explore_courses.svg?raw';
import { CourseThumbnail } from '../../common/CourseThumbnail';

export const ExploreCourses = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [enrolledMap, setEnrolledMap] = useState({});
  const [selectedCourseView, setSelectedCourseView] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('overview');
  const [overviewDetails, setOverviewDetails] = useState(null);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [isSubmittingQ, setIsSubmittingQ] = useState(false);

  useEffect(() => {
    fetchPublishedCourses();
    fetchLearnerEnrolments();

    const handleUrlQuery = () => {
      const params = new URLSearchParams(window.location.search);
      const searchParam = params.get('search') || params.get('instructor');
      setSearchQuery(searchParam || '');
    };

    handleUrlQuery();

    window.addEventListener('popstate', handleUrlQuery);
    window.addEventListener('upskillr_navigate', handleUrlQuery);

    return () => {
      window.removeEventListener('popstate', handleUrlQuery);
      window.removeEventListener('upskillr_navigate', handleUrlQuery);
    };
  }, []);

  const fetchPublishedCourses = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/courses/published');
      const data = await response.json();
      if (data.success) {
        setCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Failed to fetch courses', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLearnerEnrolments = async () => {
    try {
      const token = localStorage.getItem('upskillr_token');
      if (!token) return;
      const response = await fetch('http://localhost:5000/api/courses/learner/my-enrolments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.enrolments) {
        const map = {};
        data.enrolments.forEach((e) => {
          if (e.courseId && e.courseId._id) {
            map[e.courseId._id] = true;
          }
        });
        setEnrolledMap(map);
      }
    } catch (err) {
      console.error('Failed to fetch enrolments', err);
    }
  };

  const handleEnrol = async (courseId, courseTitle) => {
    const token = localStorage.getItem('upskillr_token');
    if (!token) {
      toast.warning('Please log in as a Learner to enrol in courses.');
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/login' } }));
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/courses/enrol', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ courseId })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || `Successfully enrolled in ${courseTitle}!`);
        setEnrolledMap((prev) => ({ ...prev, [courseId]: true }));
      } else {
        toast.error(data.message || 'Enrolment failed.');
      }
    } catch (err) {
      toast.error('Error during enrolment.');
    }
  };

  const handleOpenCourseModal = async (course) => {
    setSelectedCourseView(course);
    setActiveModalTab('overview');
    setOverviewDetails(null);
    try {
      const res = await fetch(`http://localhost:5000/api/courses/public/${course._id}/overview`);
      const json = await res.json();
      if (json.success) {
        setOverviewDetails(json);
      }
    } catch (e) {
      console.error('Error fetching course overview:', e);
    }
  };

  const handleAskDoubt = async (e) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !selectedCourseView) return;
    const token = localStorage.getItem('upskillr_token');
    if (!token) {
      toast.warning('Please log in as a learner to ask a doubt.');
      return;
    }
    setIsSubmittingQ(true);
    try {
      const res = await fetch(`http://localhost:5000/api/courses/${selectedCourseView._id}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question: newQuestionText.trim() })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Your question has been sent to the instructor!');
        setNewQuestionText('');
      } else {
        toast.error(data.message || 'Failed to submit question.');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmittingQ(false);
    }
  };


  const formatLastUpdated = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const options = { month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith('http')) return avatar;
    return `http://localhost:5000${avatar}`;
  };

  const filteredCourses = courses.filter((c) => {
    const matchesCategory = selectedCategory === 'all' || c.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.instructorName && c.instructorName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories = ['all', 'Web Development', 'Data Science', 'Design', 'Business', 'Marketing', 'Finance', 'Productivity', 'AI & ML', 'Photography'];

  return (
    <div className="explore-courses-page section">
      <div className="container">
        {/* Explore Hero Redesign */}
        <div className="explore-hero">
          <div className="explore-hero-content">
            <div className="badge-pill hero-badge">
              <Sparkles size={14} />
              <span>EXPLORE CATALOG</span>
            </div>
            <h1 className="explore-title">
              Explore <span className="text-highlight">Expert-Led</span> Courses
            </h1>
            <p className="explore-subtitle">
              Master real-world skills with courses created by expert instructors on UpSkillr.
            </p>
            <div className="explore-search-box">
              <Search size={20} className="explore-search-icon" />
              <input
                type="text"
                className="explore-search-input"
                placeholder="Search courses, skills, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="explore-hero-illustration">
            <div
              className="explore-illustration"
              dangerouslySetInnerHTML={{ __html: exploreCoursesSvg }}
            />
          </div>
        </div>

        {/* Filter Bar matching reference image layout */}
        <div className="explore-toolbar-top">
          <div className="explore-toolbar-filters">
            <button type="button" className="btn btn-outline toolbar-btn">
              <SlidersHorizontal size={14} />
              <span>Filter</span>
            </button>
            <button type="button" className="btn btn-outline toolbar-btn">
              <BarChart2 size={14} />
              <span>Level</span>
            </button>
            <button type="button" className="btn btn-outline toolbar-btn">
              <BookOpen size={14} />
              <span>Category</span>
            </button>
          </div>
          <div className="explore-toolbar-sort">
            <button type="button" className="btn btn-outline toolbar-btn">
              <span>Most relevant</span>
            </button>
          </div>
        </div>

        <div className="explore-toolbar-bottom">
          <div className="category-chips-scroll">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'All Courses' : cat}
              </button>
            ))}
          </div>
          <button type="button" className="scroll-next-btn" aria-label="Next categories">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Courses Cards Grid */}
        {loading ? (
          <div className="loading-workspace-spinner">Loading courses...</div>
        ) : filteredCourses.length === 0 ? (
          <div className="empty-courses-card" style={{ marginTop: '2rem' }}>
            <BookOpen size={32} />
            <h2>No Published Courses Found</h2>
            <p>Check back soon as instructors publish new courses on UpSkillr.</p>
          </div>
        ) : (
          <div className="explore-courses-grid">
            {filteredCourses.map((course) => (
              <div key={course._id} className="explore-course-card">
                <div className="course-card-thumb-wrap">
                  <CourseThumbnail src={course.thumbnail} alt={course.title} className="course-card-thumb" />
                  <button type="button" className="course-bookmark-btn" aria-label="Bookmark course">
                    <Bookmark size={15} />
                  </button>
                </div>

                <div className="course-card-body">
                  <span className="course-category">{course.category}</span>
                  <h3 className="course-card-title" title={course.title}>{course.title}</h3>
                  <p className="course-card-description" title={course.description}>{course.description}</p>

                  {/* Skills badges */}
                  <div className="course-card-skills">
                    {course.skills && course.skills.length > 0 ? (
                      course.skills.map((skill, index) => (
                        <span key={index} className="course-skill-badge">{skill}</span>
                      ))
                    ) : (
                      <span className="course-skill-badge">{course.category}</span>
                    )}
                  </div>

                  {/* Instructor & Rating Row */}
                  <div className="course-instructor-rating-row">
                    <div className="course-instructor-info">
                      {course.instructorAvatar ? (
                        <img src={getAvatarUrl(course.instructorAvatar)} className="course-instructor-avatar" alt={course.instructorName} />
                      ) : (
                        <div className="course-instructor-avatar-placeholder">
                          <User size={12} />
                        </div>
                      )}
                      <span className="course-instructor-name">{course.instructorName || 'Instructor'}</span>
                    </div>

                    <div className="course-rating-info">
                      {course.rating !== null && course.rating !== undefined ? (
                        <>
                          <Star size={13} className="course-rating-star" fill="currentColor" />
                          <span>{course.rating.toFixed(1)}</span>
                          <span className="course-rating-count">({course.reviewCount || 0} reviews)</span>
                        </>
                      ) : (
                        <span className="course-rating-count">No ratings yet</span>
                      )}
                    </div>
                  </div>

                    {/* Metadata Row (Level / Modules / Enrolled Users) */}
                    {(() => {
                      const publishedModCount = (course.modules ? course.modules.filter(m => m.state === 'published' || m.status === 'published').length : (course.moduleCount ?? course.modulesCount ?? 0));
                      return (
                        <div className="course-metadata-row">
                          <span className={`course-level-badge ${course.skillLevel?.toLowerCase().replace(' ', '-') || 'beginner'}`}>
                            {course.skillLevel || 'Beginner'}
                          </span>
                          <span className="course-meta-divider">•</span>
                          <div className="course-meta-item">
                            <Layers size={12} />
                            <span>{publishedModCount} {publishedModCount === 1 ? 'Module' : 'Modules'}</span>
                          </div>
                          <span className="course-meta-divider">•</span>
                          <div className="course-meta-item">
                            <Users size={12} />
                            <span>{course.learnersCount || 0} {course.learnersCount === 1 ? 'Learner' : 'Learners'}</span>
                          </div>
                        </div>
                      );
                    })()}
                </div>

                {/* Footer Row */}
                <div className="course-card-footer-row">
                  <span className="course-updated-date">
                    {course.updatedAt ? `Last updated: ${formatLastUpdated(course.updatedAt)}` : ''}
                  </span>
                  <button
                    type="button"
                    className="btn btn-primary course-view-btn"
                    onClick={() => handleOpenCourseModal(course)}
                  >
                    <span>View Course</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GeeksforGeeks Style Course Details Modal */}
      {selectedCourseView && (
        <div className="course-view-modal-overlay" onClick={() => setSelectedCourseView(null)}>
          <div className="course-view-modal-container" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="course-view-modal-close-btn"
              onClick={() => setSelectedCourseView(null)}
            >
              <X size={20} />
            </button>

            {/* Modal Header / Banner */}
            <div className="course-view-modal-header">
              <div className="header-info-main">
                <div className="badges-row">
                  <span className="modal-category-badge">{selectedCourseView.category}</span>
                  <span className="modal-level-badge">{selectedCourseView.skillLevel || 'Beginner'}</span>
                </div>
                <h2 className="modal-course-title">{selectedCourseView.title}</h2>
                <p className="modal-course-subtitle">
                  {selectedCourseView.shortDescription || selectedCourseView.description}
                </p>

                <div className="modal-instructor-meta">
                  {selectedCourseView.instructorAvatar ? (
                    <img src={selectedCourseView.instructorAvatar} alt="Instructor" className="instructor-avatar-img" />
                  ) : (
                    <div className="instructor-avatar-placeholder"><User size={16} /></div>
                  )}
                  <span>Created by <strong>{selectedCourseView.instructorName || 'Instructor'}</strong></span>
                </div>
              </div>

              <div className="modal-thumb-box">
                <CourseThumbnail src={selectedCourseView.thumbnail} alt={selectedCourseView.title} />
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="course-view-modal-tabs">
              <button
                type="button"
                className={`tab-btn ${activeModalTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('overview')}
              >
                <FileText size={16} />
                <span>Course Overview</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${activeModalTab === 'syllabus' ? 'active' : ''}`}
                onClick={() => setActiveModalTab('syllabus')}
              >
                <BookOpen size={16} />
                <span>Syllabus & Modules ({(selectedCourseView.modules || []).filter(m => m.state === 'published' || m.status === 'published').length})</span>
              </button>
            </div>

            {/* Modal Tab Body */}
            <div className="course-view-modal-body">
              {activeModalTab === 'overview' ? (
                <div className="overview-tab-content">
                  {/* Full Description */}
                  <div className="content-section">
                    <h3>Course Description</h3>
                    <p style={{ whiteSpace: 'pre-line' }}>
                      {selectedCourseView.fullDescription || selectedCourseView.description || 'No detailed description provided.'}
                    </p>
                  </div>

                  {/* What You Will Learn */}
                  {selectedCourseView.whatYouWillLearn?.length > 0 && (
                    <div className="content-section">
                      <h3>What You'll Learn</h3>
                      <div className="learning-outcomes-grid">
                        {selectedCourseView.whatYouWillLearn.map((item, idx) => (
                          <div key={idx} className="learning-outcome-card">
                            <CheckCircle2 size={18} className="green-check" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Prerequisites */}
                  {selectedCourseView.prerequisites && (
                    <div className="content-section">
                      <h3>Prerequisites</h3>
                      <p>{selectedCourseView.prerequisites}</p>
                    </div>
                  )}

                  {/* Tech Stack */}
                  {selectedCourseView.techStack?.length > 0 && (
                    <div className="content-section">
                      <h3>Technologies Covered</h3>
                      <div className="tech-chips-flex">
                        {selectedCourseView.techStack.map((tech, idx) => (
                          <span key={idx} className="tech-chip-badge">{tech}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certificate */}
                  <div className="content-section">
                    <h3>Certificate</h3>
                    <div className="certificate-badge-box">
                      <Award size={20} className="award-icon" />
                      <span>{selectedCourseView.certificate !== false ? 'Completion Certificate Included' : 'No Certificate Granted'}</span>
                    </div>
                  </div>

                  {/* Pre-enrollment Q&A / Doubts */}
                  <div className="content-section qa-content-box" style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                      <HelpCircle size={20} className="accent-green" />
                      <h3 style={{ margin: 0 }}>Course Doubts & Inquiries</h3>
                    </div>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Have a question before enrolling? Ask the instructor directly.
                    </p>

                    <form onSubmit={handleAskDoubt} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                      <textarea
                        rows={2}
                        className="form-textarea"
                        placeholder="Ask your question here..."
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!newQuestionText.trim() || isSubmittingQ}
                        style={{ alignSelf: 'flex-end', fontSize: '0.85rem', padding: '0.45rem 1rem' }}
                      >
                        {isSubmittingQ ? 'Submitting...' : 'Submit Question'}
                      </button>
                    </form>

                    <div className="answered-qa-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {(overviewDetails?.questions || []).length === 0 ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                          No inquiries asked yet. Be the first to ask!
                        </p>
                      ) : (
                        (overviewDetails?.questions || []).map((q, idx) => (
                          <div key={idx} style={{ background: 'var(--surface-muted)', padding: '0.85rem', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>{q.userName} asked:</div>
                            <p style={{ margin: '0.25rem 0 0.5rem 0', fontSize: '0.92rem' }}>{q.question}</p>
                            {q.instructorReply && (
                              <div style={{ background: 'var(--surface)', borderLeft: '3px solid var(--brand-primary)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary)' }}>Instructor Answer:</div>
                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem' }}>{q.instructorReply}</p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Real Reviews */}
                  <div className="content-section" style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                      <Star size={20} className="star-icon-fill" style={{ fill: '#d97706', color: '#d97706' }} />
                      <h3 style={{ margin: 0 }}>Learner Reviews & Ratings</h3>
                    </div>
                    {(overviewDetails?.reviews || []).length === 0 ? (
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                        No reviews yet. Real feedback will appear here as learners complete lessons.
                      </p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        {(overviewDetails?.reviews || []).map((rev, rIdx) => (
                          <div key={rIdx} style={{ background: 'var(--surface-muted)', padding: '0.85rem', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.35rem' }}>
                              {[...Array(5)].map((_, s) => (
                                <Star key={s} size={13} style={{ fill: s < rev.rating ? '#d97706' : 'none', color: '#d97706' }} />
                              ))}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.88rem', fontStyle: 'italic' }}>"{rev.feedback}"</p>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>— {rev.learnerName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="syllabus-tab-content">
                  {(() => {
                    const publishedMods = (selectedCourseView.modules || []).filter(m => m.state === 'published' || m.status === 'published');
                    if (publishedMods.length === 0) {
                      return <p className="empty-syllabus-text">No modules or syllabus available for this course yet.</p>;
                    }
                    return (
                      <div className="modules-accordion-list">
                        {publishedMods.map((mod, mIdx) => (
                          <div key={mod._id || mIdx} className="module-accordion-item">
                            <div className="module-accordion-header">
                              <span className="mod-num">Module {mIdx + 1}</span>
                              <h4>{mod.title}</h4>
                              <span className="mod-count">{mod.lessons?.length || 0} Lessons</span>
                            </div>

                            <div className="module-accordion-body">
                              {mod.lessons?.map((les, lIdx) => (
                                <div key={les._id || lIdx} className="lesson-detail-row">
                                  <Video size={14} className="lesson-icon" />
                                  <span className="lesson-title">{les.title}</span>
                                  {les.duration && <span className="lesson-duration">{les.duration}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="course-view-modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedCourseView(null)}
              >
                <span>Close</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleEnrol(selectedCourseView._id, selectedCourseView.title)}
              >
                <span>{enrolledMap[selectedCourseView._id] ? 'Already Enrolled' : 'Enrol Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
