import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Search, Users, Star, Sparkles, ArrowRight, Bookmark,
  Layers, CheckCircle2, Award, GraduationCap, Code2, SlidersHorizontal,
  ExternalLink, ArrowLeft, User, MessageSquare
} from 'lucide-react';
import './InstructorExploreCourses.css';
import { Avatar } from '../../common/Avatar/Avatar';
import { CourseThumbnail } from '../../common/CourseThumbnail';
import { API_BASE } from '../../../config/api';
import { useToast } from '../../../context/ToastContext';

export const InstructorExploreCourses = ({ instructorId, user }) => {
  const { toast } = useToast();
  const [instructor, setInstructor] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loadingInstructor, setLoadingInstructor] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'popular' | 'rating'
  const [bookmarksMap, setBookmarksMap] = useState({});

  const categoryScrollRef = useRef(null);

  useEffect(() => {
    if (instructorId) {
      fetchInstructorDetails();
      fetchInstructorCourses();
    }
  }, [instructorId]);

  const fetchInstructorDetails = async () => {
    setLoadingInstructor(true);
    try {
      const res = await fetch(`${API_BASE}/auth/instructors/${instructorId}`);
      const data = await res.json();
      if (data.success && data.instructor) {
        setInstructor(data.instructor);
      } else {
        toast.error(data.message || 'Instructor not found.');
      }
    } catch (err) {
      console.error('Failed to fetch instructor details:', err);
      toast.error('Network error loading instructor profile.');
    } finally {
      setLoadingInstructor(false);
    }
  };

  const fetchInstructorCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await fetch(`${API_BASE}/courses/published?instructorId=${instructorId}`);
      const data = await res.json();
      if (data.success) {
        setCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Failed to fetch instructor courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleNavigateToCourse = (courseId) => {
    const path = `/courses/${courseId}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  };

  const handleBackToInstructors = () => {
    window.history.pushState({}, '', '/instructors');
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/instructors' } }));
  };

  // Derive Categories and Counts strictly from this instructor's courses
  const categoriesMap = { all: courses.length };
  courses.forEach((c) => {
    if (c.category) {
      categoriesMap[c.category] = (categoriesMap[c.category] || 0) + 1;
    }
  });
  const availableCategories = ['all', ...Object.keys(categoriesMap).filter((k) => k !== 'all')];

  // Filtering
  const filteredCourses = courses.filter((c) => {
    const matchesCategory =
      selectedCategory === 'all' || (c.category && c.category.toLowerCase() === selectedCategory.toLowerCase());

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (c.title && c.title.toLowerCase().includes(query)) ||
      (c.description && c.description.toLowerCase().includes(query)) ||
      (c.category && c.category.toLowerCase().includes(query)) ||
      (Array.isArray(c.skills) && c.skills.some((s) => s.toLowerCase().includes(query)));

    return matchesCategory && matchesSearch;
  });

  // Sorting
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now());
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt || Date.now()) - new Date(b.createdAt || Date.now());
    }
    if (sortBy === 'popular') {
      return (b.learnersCount || 0) - (a.learnersCount || 0);
    }
    if (sortBy === 'rating') {
      return (b.rating || 0) - (a.rating || 0);
    }
    return 0;
  });

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num;
  };

  const formatLastUpdated = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loadingInstructor) {
    return (
      <div className="instructor-explore-loading-screen">
        <div className="loading-workspace-spinner" />
        <p>Loading instructor profile & course catalog...</p>
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="instructor-explore-not-found section container">
        <button type="button" className="btn btn-outline btn-back" onClick={handleBackToInstructors}>
          <ArrowLeft size={16} />
          <span>Back to All Instructors</span>
        </button>
        <div className="empty-courses-card" style={{ marginTop: '2rem' }}>
          <User size={40} />
          <h2>Instructor Not Found</h2>
          <p>The instructor profile you are looking for does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const pInfo = instructor.personalInfo || {};
  const profInfo = instructor.professionalInfo || {};
  const edu = instructor.education || {};
  const teachExp = instructor.teachingExperience || {};
  const courseExp = instructor.coursesExpertise || {};

  const degreeText = [edu.degree || edu.degreeOther, edu.fieldOfStudy || edu.fieldOfStudyOther]
    .filter(Boolean)
    .join(' in ');
  const educationDisplay = [degreeText, edu.institution].filter(Boolean).join(' • ');

  const teachingStyleDisplay =
    teachExp.primaryTeachingStyle ||
    teachExp.preferredTeachingStyle ||
    (teachExp.primaryTeachingStyles && teachExp.primaryTeachingStyles[0]) ||
    'Interactive & Project-Based';

  return (
    <div className="instructor-explore-page section">
      <div className="container">
        {/* Navigation Breadcrumb */}
        <div className="instructor-explore-nav-top">
          <button type="button" className="btn btn-outline btn-back-nav" onClick={handleBackToInstructors}>
            <ArrowLeft size={16} />
            <span>All Instructors</span>
          </button>
          <span className="nav-separator">/</span>
          <span className="nav-active-name">{instructor.fullName}</span>
        </div>

        {/* ═══ 1. INSTRUCTOR ABOUT HEADER CARD (APPLICATION DATA) ═══ */}
        <header className="instructor-about-hero-card">
          <div className="instructor-about-header-row">
            <div className="instructor-about-avatar-wrap">
              <Avatar image={instructor.avatar} name={instructor.fullName} size="large" />
            </div>

            <div className="instructor-about-main-info">
              <div className="instructor-name-badge-line">
                <h1 className="instructor-full-name">{instructor.fullName}</h1>
                {instructor.isVerified && (
                  <span className="verified-badge-pill" title="Verified Instructor">
                    <CheckCircle2 size={16} className="verified-icon" />
                    <span>Verified Educator</span>
                  </span>
                )}
              </div>

              <p className="instructor-headline">
                {instructor.designation || profInfo.currentRole || 'Expert Instructor'}
                {profInfo.organization ? ` at ${profInfo.organization}` : ''}
              </p>

              {/* Quick Metrics Bar */}
              <div className="instructor-hero-metrics">
                <div className="hero-metric-item">
                  <BookOpen size={16} className="metric-icon" />
                  <span><strong>{courses.length}</strong> {courses.length === 1 ? 'Course' : 'Courses'}</span>
                </div>

                <div className="hero-metric-divider" />

                <div className="hero-metric-item">
                  <Users size={16} className="metric-icon" />
                  <span><strong>{formatNumber(instructor.learnersCount)}</strong> Learners</span>
                </div>

                <div className="hero-metric-divider" />

                <div className="hero-metric-item">
                  <Star size={16} className="metric-icon star-icon" fill="currentColor" />
                  <span>
                    <strong>{instructor.rating ? instructor.rating.toFixed(1) : '—'}</strong>
                    {instructor.ratingsCount ? ` (${instructor.ratingsCount} reviews)` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Social / External Action Link */}
            {profInfo.linkedinUrl && (
              <div className="instructor-social-actions">
                <a
                  href={profInfo.linkedinUrl.startsWith('http') ? profInfo.linkedinUrl : `https://${profInfo.linkedinUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-linkedin"
                >
                  <span>LinkedIn Profile</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>

          {/* About & Submitted Application Fields */}
          <div className="instructor-about-details-grid">
            {/* Bio / Description */}
            <div className="about-block block-full-width">
              <h3 className="about-block-heading">About the Instructor</h3>
              <p className="about-bio-text">
                {instructor.bio || pInfo.bio || 'Passionate educator building practical, skill-focused courses on UpSkillr.'}
              </p>
            </div>

            {/* Application Highlights Grid */}
            <div className="about-highlights-grid">
              {/* Technical Skills */}
              {instructor.keySkills && instructor.keySkills.length > 0 && (
                <div className="about-info-item">
                  <div className="info-item-label">
                    <Code2 size={15} />
                    <span>Technical Expertise</span>
                  </div>
                  <div className="info-skills-chips">
                    {instructor.keySkills.map((skill, idx) => (
                      <span key={idx} className="about-skill-chip">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {educationDisplay && (
                <div className="about-info-item">
                  <div className="info-item-label">
                    <GraduationCap size={15} />
                    <span>Education</span>
                  </div>
                  <p className="info-item-value">{educationDisplay}</p>
                </div>
              )}

              {/* Primary Teaching Category */}
              {(courseExp.primaryCategory || courseExp.primaryCategoryOther) && (
                <div className="about-info-item">
                  <div className="info-item-label">
                    <Award size={15} />
                    <span>Primary Teaching Category</span>
                  </div>
                  <p className="info-item-value">
                    {courseExp.primaryCategory || courseExp.primaryCategoryOther}
                  </p>
                </div>
              )}

              {/* Teaching Style */}
              {teachingStyleDisplay && (
                <div className="about-info-item">
                  <div className="info-item-label">
                    <MessageSquare size={15} />
                    <span>Teaching Style</span>
                  </div>
                  <p className="info-item-value">{teachingStyleDisplay}</p>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ═══ 2. INSTRUCTOR COURSES SECTION ═══ */}
        <section className="instructor-courses-section">
          <div className="courses-section-header">
            <div className="title-group">
              <h2 className="section-title">Courses by {instructor.fullName}</h2>
              <span className="courses-count-badge">{sortedCourses.length} {sortedCourses.length === 1 ? 'Course' : 'Courses'}</span>
            </div>

            {/* Search Bar */}
            <div className="instructor-course-search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search for courses, topics, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filter Chips & Sorting Toolbar */}
          <div className="instructor-courses-toolbar">
            <div className="category-scroll-wrapper" ref={categoryScrollRef}>
              {availableCategories.map((cat) => {
                const count = categoriesMap[cat] || 0;
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    <span>{cat === 'all' ? 'All Courses' : cat}</span>
                    <span className="chip-count">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="sort-dropdown-wrap">
              <label htmlFor="sort-select" className="sort-label">Sort by:</label>
              <select
                id="sort-select"
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Course Cards Grid */}
          {loadingCourses ? (
            <div className="loading-workspace-spinner">Loading courses...</div>
          ) : sortedCourses.length === 0 ? (
            courses.length === 0 ? (
              /* State A: Instructor has NO published courses at all */
              <div className="empty-courses-card">
                <BookOpen size={36} className="empty-icon" />
                <h3>No courses available yet</h3>
                <p>{instructor.fullName} hasn't published any courses yet. Check back soon!</p>
              </div>
            ) : (
              /* State B: Search/Filter returned 0 results */
              <div className="empty-courses-card">
                <Search size={36} className="empty-icon" />
                <h3>No courses found</h3>
                <p>Try searching for a different course or topic, or clear your filters.</p>
              </div>
            )
          ) : (
            <div className="instructor-courses-grid">
              {sortedCourses.map((course) => {
                const isBookmarked = !!bookmarksMap[course._id];
                const publishedModCount = course.modules
                  ? course.modules.filter((m) => m.state === 'published' || m.status === 'published').length
                  : (course.moduleCount ?? course.modulesCount ?? 0);

                return (
                  <div
                    key={course._id}
                    className="explore-course-card"
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${course.title}`}
                    onClick={() => handleNavigateToCourse(course._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNavigateToCourse(course._id);
                      }
                    }}
                  >
                    <div className="course-card-thumb-wrap">
                      <CourseThumbnail src={course.thumbnail} alt={course.title} className="course-card-thumb" />
                      <button
                        type="button"
                        className={`course-bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
                        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark course'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBookmarksMap((prev) => ({ ...prev, [course._id]: !prev[course._id] }));
                        }}
                      >
                        <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    <div className="course-card-body">
                      <span className="course-category">{course.category}</span>
                      <h3 className="course-card-title" title={course.title}>
                        {course.title}
                      </h3>
                      <p className="course-card-description" title={course.description}>
                        {course.description || course.shortDescription}
                      </p>

                      {/* Skills Badges */}
                      <div className="course-card-skills">
                        {course.skills && course.skills.length > 0 ? (
                          course.skills.map((skill, index) => (
                            <span key={index} className="course-skill-badge">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="course-skill-badge">{course.category}</span>
                        )}
                      </div>

                      {/* Instructor & Rating */}
                      <div className="course-instructor-rating-row">
                        <div className="course-instructor-info">
                          <Avatar image={instructor.avatar} name={instructor.fullName} size="small" />
                          <span className="course-instructor-name">{instructor.fullName}</span>
                        </div>

                        <div className="course-rating-info">
                          {course.rating !== null && course.rating !== undefined ? (
                            <>
                              <Star size={13} className="course-rating-star" fill="currentColor" />
                              <span>{course.rating.toFixed(1)}</span>
                              <span className="course-rating-count">({course.reviewCount || 0})</span>
                            </>
                          ) : (
                            <span className="course-rating-count">No ratings yet</span>
                          )}
                        </div>
                      </div>

                      {/* Metadata Row */}
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
                    </div>

                    {/* Card Footer */}
                    <div className="course-card-footer-row">
                      <span className="course-updated-date">
                        {course.updatedAt ? `Updated: ${formatLastUpdated(course.updatedAt)}` : ''}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary course-view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateToCourse(course._id);
                        }}
                      >
                        <span>View Course</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default InstructorExploreCourses;
