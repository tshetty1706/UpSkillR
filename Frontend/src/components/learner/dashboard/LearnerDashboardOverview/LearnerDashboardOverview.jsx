import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  Filter,
  Star,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  PlusCircle,
  MessageSquare,
  ThumbsUp
} from 'lucide-react';
import { CourseRatingModal } from './CourseRatingModal';

// High-quality mock published courses for fallback/demo
const MOCK_PUBLISHED_COURSES = [
  {
    _id: 'mock_c1',
    title: 'Full-Stack Modern React & Node.js Masterclass',
    description: 'Build enterprise-ready web apps with React 18, Node.js, Express, MongoDB, and TailwindCSS.',
    category: 'Web Development',
    skillLevel: 'Intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80',
    price: 0,
    instructorName: 'Sarah Jenkins',
    rating: 4.9,
    learnersCount: 1420,
    lessons: [
      { title: 'Introduction to Modern Full-Stack Architecture', duration: '12 min' },
      { title: 'Setting Up Frontend React with Vite & Tailwind', duration: '24 min' },
      { title: 'Building RESTful APIs with Node.js & Express', duration: '35 min' },
      { title: 'MongoDB Database Integration & Mongoose Schemas', duration: '40 min' },
      { title: 'Deploying Production Apps & Security Best Practices', duration: '28 min' }
    ]
  },
  {
    _id: 'mock_c2',
    title: 'Python for Data Science & Machine Learning',
    description: 'Master Data Analysis, Pandas, NumPy, Scikit-Learn, and Neural Networks with real projects.',
    category: 'Data Science',
    skillLevel: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
    price: 0,
    instructorName: 'Dr. Alan Turing',
    rating: 4.8,
    learnersCount: 2310,
    lessons: [
      { title: 'Python Fundamentals & Data Structures', duration: '15 min' },
      { title: 'Data Wrangling with Pandas & NumPy', duration: '30 min' },
      { title: 'Exploratory Data Analysis & Visualization', duration: '25 min' },
      { title: 'Building Machine Learning Models with Scikit-Learn', duration: '45 min' }
    ]
  },
  {
    _id: 'mock_c3',
    title: 'UI/UX Design Systems & Figma Prototyping',
    description: 'Learn professional UI design, component libraries, typography scale, and responsive grid layouts.',
    category: 'Design',
    skillLevel: 'All Levels',
    thumbnail: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=800&auto=format&fit=crop&q=80',
    price: 0,
    instructorName: 'Elena Rostova',
    rating: 4.9,
    learnersCount: 980,
    lessons: [
      { title: 'Design Principles & Visual Hierarchy', duration: '18 min' },
      { title: 'Figma Auto-Layout & Design Tokens', duration: '32 min' },
      { title: 'Creating High-Fidelity Interactive Prototypes', duration: '40 min' }
    ]
  },
  {
    _id: 'mock_c4',
    title: 'Artificial Intelligence & Prompt Engineering',
    description: 'Understand Large Language Models, Generative AI applications, and agentic prompt techniques.',
    category: 'AI & Machine Learning',
    skillLevel: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    price: 0,
    instructorName: 'Marcus Vance',
    rating: 4.7,
    learnersCount: 1850,
    lessons: [
      { title: 'Generative AI Architecture Overview', duration: '20 min' },
      { title: 'Advanced Prompting Patterns & System Prompts', duration: '30 min' },
      { title: 'Integrating LLMs into Software Workflows', duration: '38 min' }
    ]
  }
];

export const LearnerDashboardOverview = ({
  user,
  enrolments = [],
  publishedCourses = [],
  loading = false,
  onLessonComplete,
  onEnrolCourse,
  activeTab = 'enrolled',
  setActiveTab
}) => {
  // Search & Filters State (FR-05)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');

  // Interactive Lesson Accordion State (FR-07)
  const [expandedCourseId, setExpandedCourseId] = useState(null);

  // Ratings & Feedback State (FR-09)
  const [ratingModalCourse, setRatingModalCourse] = useState(null);
  const [ratingsMap, setRatingsMap] = useState(() => {
    try {
      const stored = localStorage.getItem('upskillr_learner_ratings');
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  const categories = ['All', 'Web Development', 'Data Science', 'Design', 'AI & Machine Learning', 'Business'];

  // Combined published courses (API + fallback mock)
  const allAvailableCourses = useMemo(() => {
    if (publishedCourses && publishedCourses.length > 0) {
      return publishedCourses;
    }
    return MOCK_PUBLISHED_COURSES;
  }, [publishedCourses]);

  // Set of enrolled course IDs
  const enrolledCourseIds = useMemo(() => {
    return new Set(enrolments.map(e => e.courseId?._id || e.courseId));
  }, [enrolments]);

  // Filter available courses for catalog (FR-05)
  const filteredCatalog = useMemo(() => {
    return allAvailableCourses.filter(course => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (course.instructorName && course.instructorName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
      const matchesLevel = selectedLevel === 'All' || course.skillLevel === selectedLevel;

      return matchesSearch && matchesCategory && matchesLevel;
    });
  }, [allAvailableCourses, searchQuery, selectedCategory, selectedLevel]);

  // Dashboard Stats Calculations (FR-08)
  const stats = useMemo(() => {
    const totalEnrolled = enrolments.length;
    const completed = enrolments.filter(e => e.progressPercentage === 100).length;
    const inProgress = totalEnrolled - completed;
    let totalLessonsDone = 0;
    enrolments.forEach(e => {
      totalLessonsDone += (e.completedLessons || []).length;
    });

    return { totalEnrolled, inProgress, completed, totalLessonsDone };
  }, [enrolments]);

  // Toggle accordion expand
  const toggleCourseExpand = (id) => {
    setExpandedCourseId(prev => (prev === id ? null : id));
  };

  // Submit course rating (FR-09)
  const handleRatingSubmit = (courseId, ratingData) => {
    const updatedMap = {
      ...ratingsMap,
      [courseId]: ratingData
    };
    setRatingsMap(updatedMap);
    try {
      localStorage.setItem('upskillr_learner_ratings', JSON.stringify(updatedMap));
    } catch (e) {}
  };

  return (
    <main className="learner-main-workspace section">
      <div className="container main-container">
        
        {/* Welcome Header */}
        <div className="learner-welcome-header">
          <div className="welcome-text-content">
            <h1>Welcome back, <span className="accent-green">{user?.fullName || 'Learner'}</span>! 👋</h1>
            <p>Track your course progress, explore new skills, and earn course completions on UpSkillr.</p>
          </div>

          <div className="tab-pill-switcher" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'enrolled'}
              className={`tab-pill ${activeTab === 'enrolled' ? 'active' : ''}`}
              onClick={() => setActiveTab('enrolled')}
            >
              <BookOpen size={16} />
              <span>My Enrolled Courses ({enrolments.length})</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'browse'}
              className={`tab-pill ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              <Sparkles size={16} />
              <span>Browse Course</span>
            </button>
          </div>
        </div>

        {/* FR-08 Dashboard Summary Stat Cards */}
        <div className="learner-stats-grid">
          <div className="stat-card">
            <div className="stat-icon-box brand-icon-box">
              <BookOpen size={22} />
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.totalEnrolled}</span>
              <span className="stat-label">Enrolled Courses</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-box warning-icon-box">
              <Clock size={22} />
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.inProgress}</span>
              <span className="stat-label">In Progress</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-box success-icon-box">
              <Award size={22} />
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.completed}</span>
              <span className="stat-label">Completed Courses</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-box info-icon-box">
              <CheckCircle2 size={22} />
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.totalLessonsDone}</span>
              <span className="stat-label">Lessons Completed</span>
            </div>
          </div>
        </div>

        {/* VIEW 1: MY ENROLLED COURSES (FR-07, FR-08, FR-09) */}
        {activeTab === 'enrolled' && (
          <div className="learner-section-block">
            <div className="section-header-flex">
              <h2>My Learning Progress</h2>
              <span className="section-subtitle">Manage lesson completion and submit course feedback</span>
            </div>

            {loading ? (
              <div className="loading-workspace-spinner">Loading your enrolled courses...</div>
            ) : enrolments.length === 0 ? (
              <div className="empty-courses-card">
                <BookOpen size={36} className="empty-icon" />
                <h2>No Enrolled Courses Yet</h2>
                <p>Browse expert-led courses and enrol with a single click to start learning.</p>
                <button
                  className="btn btn-primary btn-cta-browse"
                  onClick={() => setActiveTab('browse')}
                >
                  <Sparkles size={16} />
                  <span>Browse Available Courses</span>
                </button>
              </div>
            ) : (
              <div className="enrolled-courses-grid">
                {enrolments.map((enrol) => {
                  const course = typeof enrol.courseId === 'object' ? enrol.courseId : { _id: enrol.courseId, title: enrol.courseTitle || 'Enrolled Course' };
                  if (!course) return null;

                  const isCompleted = enrol.progressPercentage === 100;
                  const lessons = course.lessons || [
                    { title: 'Lesson 1: Core Fundamentals & Overview', duration: '15 min' },
                    { title: 'Lesson 2: Practical Walkthrough & Concepts', duration: '25 min' },
                    { title: 'Lesson 3: Advanced Implementation & Project', duration: '35 min' }
                  ];

                  const isExpanded = expandedCourseId === (course._id || enrol._id);
                  const userRating = ratingsMap[course._id];

                  return (
                    <div
                      key={enrol._id || course._id}
                      className={`enrolled-card ${isCompleted ? 'completed-card' : ''}`}
                    >
                      <div className="card-top-header">
                        <img
                          src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'}
                          alt={course.title}
                          className="enrolled-thumb"
                        />
                        <div className="card-status-pill-container">
                          {isCompleted ? (
                            <span className="badge-pill badge-success">
                              <CheckCircle2 size={13} />
                              <span>Completed</span>
                            </span>
                          ) : (
                            <span className="badge-pill badge-warning">
                              <Clock size={13} />
                              <span>In Progress</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="enrolled-body">
                        <span className="category-pill">{course.category || 'General'}</span>
                        <h3 className="course-card-title">{course.title}</h3>
                        <p className="instructor-text">Instructor: {course.instructorName || 'UpSkillr Instructor'}</p>

                        {/* FR-08 Progress Bar Display */}
                        <div className="progress-bar-container">
                          <div className="progress-label">
                            <span>Overall Progress</span>
                            <strong>{enrol.progressPercentage || 0}%</strong>
                          </div>
                          <div className="progress-track">
                            <div
                              className={`progress-fill ${isCompleted ? 'completed' : ''}`}
                              style={{ width: `${enrol.progressPercentage || 0}%` }}
                            />
                          </div>
                        </div>

                        {/* FR-09 Rated Feedback Display */}
                        {isCompleted && userRating && (
                          <div className="submitted-feedback-card">
                            <div className="feedback-stars">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={15}
                                  className={s <= userRating.rating ? 'star-gold' : 'star-muted'}
                                />
                              ))}
                              <span className="rating-date">Rated on {userRating.date}</span>
                            </div>
                            {userRating.feedback && (
                              <p className="feedback-quote">"{userRating.feedback}"</p>
                            )}
                          </div>
                        )}

                        {/* Action Buttons Row */}
                        <div className="course-card-actions">
                          <button
                            type="button"
                            className="btn btn-outline btn-toggle-lessons"
                            onClick={() => toggleCourseExpand(course._id || enrol._id)}
                          >
                            <Layers size={15} />
                            <span>{isExpanded ? 'Hide Lessons' : `Lessons (${enrol.completedLessons?.length || 0}/${lessons.length})`}</span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          {/* FR-09 Rating Action Button */}
                          {isCompleted && (
                            <button
                              type="button"
                              className={`btn ${userRating ? 'btn-outline' : 'btn-primary'} btn-rate-course`}
                              onClick={() => setRatingModalCourse(course)}
                            >
                              <Star size={15} />
                              <span>{userRating ? 'Edit Review' : 'Rate & Review (FR-09)'}</span>
                            </button>
                          )}
                        </div>

                        {/* FR-07 Lesson Completion Tracker Accordion */}
                        {isExpanded && (
                          <div className="learner-lessons-drawer">
                            <h4>Lessons Checklist</h4>
                            <div className="lessons-checklist-list">
                              {lessons.map((ls, idx) => {
                                const isDone = enrol.completedLessons?.includes(idx);
                                return (
                                  <div key={idx} className={`learner-lesson-item ${isDone ? 'done-item' : ''}`}>
                                    <div className="lesson-info">
                                      <PlayCircle size={16} className="lesson-icon" />
                                      <span className="lesson-title-text">{ls.title}</span>
                                      {ls.duration && <span className="lesson-duration">{ls.duration}</span>}
                                    </div>
                                    <button
                                      type="button"
                                      className={`btn-lesson-check ${isDone ? 'done' : ''}`}
                                      onClick={() => onLessonComplete(course._id, idx)}
                                      title={isDone ? 'Mark as incomplete' : 'Mark lesson as complete'}
                                    >
                                      <CheckCircle2 size={16} />
                                      <span>{isDone ? 'Completed' : 'Mark Complete'}</span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: BROWSE CATALOG & 1-CLICK ENROLMENT (FR-05 & FR-06) */}
        {activeTab === 'browse' && (
          <div className="learner-section-block">
            {/* Search & Filtering Bar */}
            <div className="catalog-toolbar">
              <div className="search-input-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search available courses by title, topic, or instructor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-dropdowns">
                <div className="select-wrapper">
                  <Filter size={15} className="select-icon" />
                  <select
                    className="filter-select"
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                  >
                    <option value="All">All Skill Levels</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category Pills Slider */}
            <div className="category-pills-row">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Course Catalog Grid */}
            {filteredCatalog.length === 0 ? (
              <div className="empty-courses-card">
                <Search size={32} />
                <h2>No Courses Found</h2>
                <p>Try searching for a different keyword or resetting filters.</p>
                <button
                  className="btn btn-outline"
                  onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSelectedLevel('All'); }}
                >
                  Reset Search Filters
                </button>
              </div>
            ) : (
              <div className="enrolled-courses-grid catalog-courses-grid">
                {filteredCatalog.map((course) => {
                  const isEnrolled = enrolledCourseIds.has(course._id);

                  return (
                    <div key={course._id} className="enrolled-card catalog-card">
                      <div className="card-top-header">
                        <img src={course.thumbnail} alt={course.title} className="enrolled-thumb" />
                        <span className="level-badge">{course.skillLevel || 'All Levels'}</span>
                      </div>

                      <div className="enrolled-body">
                        <span className="category-pill">{course.category}</span>
                        <h3 className="course-card-title">{course.title}</h3>
                        <p className="course-desc-clamp">{course.description}</p>

                        <div className="course-meta-row">
                          <span className="meta-item">
                            <Star size={15} className="star-gold" />
                            <strong>{course.rating || '4.8'}</strong>
                          </span>
                          <span className="meta-item">
                            <BookOpen size={15} />
                            <span>{course.lessons?.length || 5} lessons</span>
                          </span>
                          <span className="meta-item">
                            <ThumbsUp size={15} />
                            <span>{course.learnersCount || 100}+ learners</span>
                          </span>
                        </div>

                        <div className="catalog-card-footer">
                          <span className="course-price">
                            {course.price > 0 ? `\$${course.price}` : 'Free'}
                          </span>

                          {/* FR-06 Single Action Enrol Button */}
                          {isEnrolled ? (
                            <button
                              type="button"
                              className="btn btn-success btn-enrolled-status"
                              onClick={() => setActiveTab('enrolled')}
                            >
                              <CheckCircle2 size={16} />
                              <span>Enrolled — Go to Course</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary btn-single-enrol"
                              onClick={() => onEnrolCourse(course._id)}
                            >
                              <PlusCircle size={16} />
                              <span>Enroll</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FR-09 Rating Modal */}
        <CourseRatingModal
          isOpen={!!ratingModalCourse}
          onClose={() => setRatingModalCourse(null)}
          course={ratingModalCourse}
          initialRating={ratingModalCourse ? ratingsMap[ratingModalCourse._id] : null}
          onSubmit={handleRatingSubmit}
        />
      </div>
    </main>
  );
};
