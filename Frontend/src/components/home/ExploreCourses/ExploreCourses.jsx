import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, Search, Video, Users, CheckCircle2, Star, Sparkles, ArrowRight, Bookmark, Clock, User,
  SlidersHorizontal, BarChart2, ChevronRight, ChevronDown, X, Award, FileText, Layers, FileCode, HelpCircle
} from 'lucide-react';
import './ExploreCourses.css';
import { useToast } from '../../../context/ToastContext';
import exploreCoursesSvg from '../../../assets/illustrations/explore_courses.svg?raw';
import { CourseThumbnail } from '../../common/CourseThumbnail';
import { Avatar } from '../../common/Avatar/Avatar';

export const ExploreCourses = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [enrolledMap, setEnrolledMap] = useState({});
  const [bookmarksMap, setBookmarksMap] = useState({});
  const categoryScrollRef = useRef(null);

  const handleNavigateToCourse = (courseId) => {
    const path = `/courses/${courseId}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  };

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
      const token = sessionStorage.getItem('upskillr_token');
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
    const token = sessionStorage.getItem('upskillr_token');
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
          <div className="category-chips-scroll" ref={categoryScrollRef}>
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
          <button
            type="button"
            className="scroll-next-btn"
            aria-label="Scroll categories to the right"
            onClick={() => categoryScrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
          >
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
            {filteredCourses.map((course) => {
              const isBookmarked = !!bookmarksMap[course._id];
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
                  style={{ cursor: 'pointer' }}
                >
                  <div className="course-card-thumb-wrap">
                    <CourseThumbnail src={course.thumbnail} alt={course.title} className="course-card-thumb" />
                    <button
                      type="button"
                      className={`course-bookmark-btn ${isBookmarked ? 'bookmarked' : ''}`}
                      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark course"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setBookmarksMap((prev) => {
                          const nextState = !prev[course._id];
                          toast.info(nextState ? `Bookmarked "${course.title}"` : `Removed bookmark for "${course.title}"`);
                          return { ...prev, [course._id]: nextState };
                        });
                      }}
                    >
                      <Bookmark size={15} fill={isBookmarked ? "currentColor" : "none"} />
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
                        <Avatar
                          image={course.instructorAvatar}
                          name={course.instructorName || 'Instructor'}
                          size="small"
                        />
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
      </div>
    </div>
  );
};
