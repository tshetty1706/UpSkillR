import React, { useState, useEffect, useMemo } from 'react';
import './LearnerDashboardOverview.css';
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
  ThumbsUp,
  ArrowRight,
  Flame,
  Trophy,
  History
} from 'lucide-react';
import { CourseRatingModal } from './CourseRatingModal';
import { CourseThumbnail } from '../../../common/CourseThumbnail';
import { useToast } from '../../../../context/ToastContext';
import { API_BASE } from '../../../../config/api';

const LinkedinIcon = ({ size = 15, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GithubIcon = ({ size = 15, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LeetcodeIcon = ({ size = 15, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z" />
  </svg>
);

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
  onFetchPublishedCourses,
  onRatingSubmit,
  activeTab = 'enrolled',
  setActiveTab
}) => {
  const { toast } = useToast();

  // Search & Filters State (FR-05)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');

  // Gamification & Check-in State
  const [profileUser, setProfileUser] = useState(() => {
    try {
      const stored = localStorage.getItem('upskillr_user');
      return stored ? JSON.parse(stored) : (user || {});
    } catch {
      return user || {};
    }
  });
  const [gamification, setGamification] = useState({
    points: 0,
    currentStreak: 0,
    longestStreak: 0,
    checkedInToday: false
  });
  const [pointHistory, setPointHistory] = useState([]);

  // Trigger Backend API Query Filtering when search/category/level change
  useEffect(() => {
    if (onFetchPublishedCourses) {
      const handler = setTimeout(() => {
        onFetchPublishedCourses(searchQuery, selectedCategory, selectedLevel);
      }, 250);
      return () => clearTimeout(handler);
    }
  }, [searchQuery, selectedCategory, selectedLevel, onFetchPublishedCourses]);

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

  // Fetch gamification points, streak, and transaction history
  const fetchGamificationData = async () => {
    try {
      const token = localStorage.getItem('upskillr_token');
      if (!token) return;

      const [statsRes, historyRes] = await Promise.all([
        fetch(`${API_BASE}/learners/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/learners/me/point-history`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const statsData = await statsRes.json();
      if (statsData.success) {
        if (statsData.user) {
          setProfileUser(prev => ({ ...prev, ...statsData.user }));
        }
        if (statsData.stats) {
          setGamification({
            points: statsData.stats.totalPoints || 0,
            currentStreak: statsData.stats.currentStreak || 0,
            longestStreak: statsData.stats.longestStreak || 0,
            checkedInToday: Boolean(statsData.stats.checkedInToday)
          });
        }
      }

      const historyData = await historyRes.json();
      if (historyData.success && Array.isArray(historyData.transactions)) {
        setPointHistory(historyData.transactions);
      }
    } catch (err) {
      console.error('Failed to load gamification data:', err);
    }
  };

  useEffect(() => {
    if (user) {
      setProfileUser(prev => ({ ...prev, ...user }));
    }
  }, [user]);

  useEffect(() => {
    fetchGamificationData();

    const handlePointsRefresh = () => fetchGamificationData();
    const handleUserRefresh = () => {
      try {
        const stored = localStorage.getItem('upskillr_user');
        if (stored) {
          setProfileUser(JSON.parse(stored));
        }
      } catch (e) {}
      fetchGamificationData();
    };

    window.addEventListener('upskillr_points_updated', handlePointsRefresh);
    window.addEventListener('upskillr_user_updated', handleUserRefresh);

    return () => {
      window.removeEventListener('upskillr_points_updated', handlePointsRefresh);
      window.removeEventListener('upskillr_user_updated', handleUserRefresh);
    };
  }, []);

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
    const completed = enrolments.filter(e => e.progressPercentage === 100 || e.status === 'completed').length;
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

  const handleNavigateToCourse = (courseId) => {
    const path = `/courses/${courseId}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
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

    if (onRatingSubmit) {
      onRatingSubmit(courseId, ratingData);
    }
  };

  const userFullName = profileUser?.fullName || user?.fullName || user?.name || 'Learner';
  const rawUsername = profileUser?.username || user?.username || '';
  const cleanUsername = rawUsername ? rawUsername.replace(/^@+/, '') : '';

  return (
    <main className="learner-main-workspace section">
      <div className="container main-container">
        
        {/* Welcome Header */}
        <div className="learner-welcome-header">
          <div className="welcome-text-content">
            <div className="welcome-title-row">
              <h1 className="welcome-heading">
                Welcome, <span className="accent-green">{userFullName}</span> 👋
              </h1>
              {cleanUsername && (
                <span className="username-sub-badge" title={`@${cleanUsername}`}>
                  @{cleanUsername}
                </span>
              )}
              {profileUser?.socialLinks && (profileUser.socialLinks.github || profileUser.socialLinks.linkedin || profileUser.socialLinks.leetcode) && (
                <div className="dashboard-developer-links" aria-label="Developer Profile Links">
                  {profileUser.socialLinks.github && (
                    <a
                      href={profileUser.socialLinks.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dashboard-social-link github"
                      title="GitHub Profile"
                    >
                      <GithubIcon size={14} />
                    </a>
                  )}
                  {profileUser.socialLinks.linkedin && (
                    <a
                      href={profileUser.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dashboard-social-link linkedin"
                      title="LinkedIn Profile"
                    >
                      <LinkedinIcon size={14} />
                    </a>
                  )}
                  {profileUser.socialLinks.leetcode && (
                    <a
                      href={profileUser.socialLinks.leetcode}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dashboard-social-link leetcode"
                      title="LeetCode Profile"
                    >
                      <LeetcodeIcon size={14} />
                    </a>
                  )}
                </div>
              )}
            </div>
            <p>Track your course progress, earn points, and build your continuous learning streak on UpSkillr.</p>
          </div>

          <div className="tab-pill-switcher" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'enrolled'}
              className={`tab-pill ${activeTab === 'enrolled' ? 'active' : ''}`}
              onClick={() => setActiveTab('enrolled')}
            >
              <BookOpen size={16} />
              <span>My Courses ({enrolments.length})</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'browse'}
              className={`tab-pill ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              <Sparkles size={16} />
              <span>Browse Catalog</span>
            </button>
          </div>
        </div>

        {/* GAMIFICATION STATS & CHECK-IN HERO BAR */}
        <div className="learner-gamification-bar">
          <div className="gamification-stats-group">
            <div className="gamification-stat-chip">
              <span className="gamification-emoji">⭐</span>
              <div className="gamification-text-stack">
                <span className="gamification-number">{gamification.points}</span>
                <span className="gamification-label">Total Points</span>
              </div>
            </div>

            <div className="gamification-stat-chip">
              <span className="gamification-emoji">🔥</span>
              <div className="gamification-text-stack">
                <span className="gamification-number">{gamification.currentStreak} {gamification.currentStreak === 1 ? 'Day' : 'Days'}</span>
                <span className="gamification-label">Current Streak</span>
              </div>
            </div>

            <div className="gamification-stat-chip">
              <span className="gamification-emoji">🏆</span>
              <div className="gamification-text-stack">
                <span className="gamification-number">{gamification.longestStreak} {gamification.longestStreak === 1 ? 'Day' : 'Days'}</span>
                <span className="gamification-label">Best Streak</span>
              </div>
            </div>
          </div>

          <div className="gamification-action-box">
            <div
              className="gamification-status-pill"
              title="Daily login streak is automatically recorded on login (+1 point awarded daily)"
            >
              <span className="streak-pill-icon">🔥</span>
              <span>
                {gamification.currentStreak > 0
                  ? `${gamification.currentStreak} Day Streak Active`
                  : 'Daily Streak Active (+1 pt)'}
              </span>
            </div>
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
              <span className="stat-label">Modules Done (+5 pts ea)</span>
            </div>
          </div>
        </div>

        {/* VIEW 1: MY ENROLLED COURSES (FR-06, FR-07, FR-08) */}
        {activeTab === 'enrolled' && (
          <div className="learner-section-block">
            <div className="section-header-flex">
              <h2>My Courses</h2>
              <span className="section-subtitle">Track your module completion progress and continue learning</span>
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

                  const isCompleted = enrol.progressPercentage === 100 || enrol.status === 'completed';
                  
                  // Compute lessons / modules count
                  const lessons = (course.lessons && course.lessons.length > 0)
                    ? course.lessons
                    : (course.modules && course.modules.length > 0)
                    ? course.modules
                    : [
                        { title: 'Module 1: Introduction & Fundamentals', duration: '15 min' },
                        { title: 'Module 2: Core Concepts & Practice', duration: '25 min' },
                        { title: 'Module 3: Project Architecture & Code', duration: '35 min' }
                      ];

                  const totalModules = lessons.length;
                  const completedCount = (enrol.completedLessons || []).length;
                  const progressPct = enrol.progressPercentage || 0;

                  const isExpanded = expandedCourseId === (course._id || enrol._id);

                  return (
                    <div
                      key={enrol._id || course._id}
                      className={`enrolled-card ${isCompleted ? 'completed-card' : ''}`}
                    >
                      <div className="card-top-header" style={{ position: 'relative' }}>
                        <CourseThumbnail
                          src={course.thumbnail}
                          alt={course.title}
                          className="enrolled-thumb"
                        />
                        <div className="card-status-pill-container" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                          {isCompleted ? (
                            <span className="badge-pill badge-success" style={{ backgroundColor: 'rgba(16, 185, 129, 0.9)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={13} />
                              <span>✓ Course Completed</span>
                            </span>
                          ) : (
                            <span className="badge-pill badge-warning" style={{ backgroundColor: 'rgba(245, 158, 11, 0.9)', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={13} />
                              <span>In Progress</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="enrolled-body">
                        <span className="category-meta-tag" style={{ fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                          {course.category || 'General'}
                        </span>
                        <h3 className="course-card-title" style={{ fontSize: '1.05rem', fontWeight: 700, margin: '2px 0 6px 0', color: 'var(--text-primary)' }}>
                          {course.title}
                        </h3>

                        {/* Visual Progress Bar & Module Count */}
                        <div className="progress-bar-container">
                          <div className="progress-label">
                            <span>{completedCount} / {totalModules} Modules Completed</span>
                            <span className="progress-percentage-text">{progressPct}%</span>
                          </div>
                          <div className="progress-track">
                            <div
                              className={`progress-fill ${isCompleted ? 'completed' : ''}`}
                              style={{ width: `${Math.min(progressPct, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Interactive Lessons / Modules Accordion */}
                        <button
                          type="button"
                          className="accordion-toggle-btn"
                          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', cursor: 'pointer', fontSize: '0.85rem' }}
                          onClick={() => toggleCourseExpand(course._id || enrol._id)}
                        >
                          <span style={{ fontWeight: 600 }}>Modules Breakdown ({completedCount}/{totalModules})</span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {isExpanded && (
                          <div className="learner-lessons-list">
                            {lessons.map((lesson, idx) => {
                              const isLessonDone = (enrol.completedLessons || []).includes(idx);
                              return (
                                <div key={idx} className="learner-lesson-item">
                                  <span style={{ color: isLessonDone ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isLessonDone ? 'line-through' : 'none' }}>
                                    {lesson.title || `Module ${idx + 1}`}
                                  </span>
                                  <button
                                    type="button"
                                    className={`btn-lesson-check ${isLessonDone ? 'done' : ''}`}
                                    onClick={() => onLessonComplete(course._id, idx)}
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>{isLessonDone ? 'Done (+5 pts)' : 'Mark Done'}</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="card-actions-row" style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ flex: 1, padding: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            onClick={() => handleNavigateToCourse(course._id)}
                          >
                            <span>{isCompleted ? 'Go to Course' : 'Continue Learning →'}</span>
                          </button>
                          {isCompleted && (
                            <button
                              type="button"
                              className="btn btn-outline"
                              style={{ padding: '8px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}
                              onClick={() => setRatingModalCourse(course)}
                              title={ratingsMap[course._id] || enrol.rating ? 'Edit your review for this course' : 'Rate this course'}
                            >
                              <Star size={13} style={{ color: '#10b981', fill: ratingsMap[course._id] || enrol.rating ? '#10b981' : 'none' }} />
                              <span>{ratingsMap[course._id] || enrol.rating ? 'Edit Review' : 'Rate Course'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* RECENT POINT ACTIVITY / POINT HISTORY FEED */}
            <div className="point-history-wrapper">
              <div className="point-history-header">
                <h3 className="point-history-title">
                  <Flame size={18} style={{ color: '#f59e0b' }} />
                  <span>Recent Point Activity & History</span>
                </h3>
                <span className="point-history-badge">Immutable Audit Log</span>
              </div>

              {pointHistory.length === 0 ? (
                <div className="empty-point-history">
                  <p>No points logged yet. Complete course modules (+5 pts) or log in daily (+1 pt) to start building your score!</p>
                </div>
              ) : (
                <div className="point-history-grid">
                  {pointHistory.slice(0, 8).map((tx) => {
                    const isCheckin = tx.type === 'DAILY_CHECKIN';
                    return (
                      <div key={tx._id} className="point-history-item">
                        <div className={`point-pts-badge ${isCheckin ? 'checkin' : ''}`}>
                          +{tx.points}
                        </div>
                        <div className="point-item-meta">
                          <span className="point-item-desc">{tx.description}</span>
                          <span className="point-item-date">
                            {new Date(tx.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: BROWSE CATALOG (FR-05 & FR-06) */}
        {activeTab === 'browse' && (
          <div className="learner-section-block">
            <div className="search-filter-controls-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div className="search-input-wrapper" style={{ flex: '1 1 260px', position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search courses by title, topic, or instructor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <select
                className="form-input"
                style={{ flex: '0 1 180px' }}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                className="form-input"
                style={{ flex: '0 1 180px' }}
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
              >
                <option value="All">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div className="enrolled-courses-grid">
              {filteredCatalog.map(course => {
                const isEnrolled = enrolledCourseIds.has(course._id);
                return (
                  <div key={course._id} className="enrolled-card">
                    <CourseThumbnail
                      src={course.thumbnail}
                      alt={course.title}
                      className="enrolled-thumb"
                    />
                    <div className="enrolled-body">
                      <span className="category-meta-tag" style={{ fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {course.category || 'General'}
                      </span>
                      <h3 className="course-card-title" style={{ fontSize: '1.05rem', fontWeight: 700, margin: '2px 0 6px 0', color: 'var(--text-primary)' }}>
                        {course.title}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: '4px 0 12px 0', flex: 1 }}>
                        {course.shortDescription || course.description}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          By {course.instructorName || 'UpSkillr Educator'}
                        </span>

                        {isEnrolled ? (
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ padding: '6px 14px', fontSize: '13px' }}
                            onClick={() => {
                              setActiveTab('enrolled');
                              handleNavigateToCourse(course._id);
                            }}
                          >
                            <span>Enrolled • Continue</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '6px 14px', fontSize: '13px' }}
                            onClick={() => onEnrolCourse(course._id)}
                          >
                            <span>Enroll Now</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rating Modal */}
        {ratingModalCourse && (
          <CourseRatingModal
            isOpen={Boolean(ratingModalCourse)}
            course={ratingModalCourse}
            initialRating={ratingsMap[ratingModalCourse._id]}
            onClose={() => setRatingModalCourse(null)}
            onSubmit={(courseId, ratingData) => {
              handleRatingSubmit(courseId || ratingModalCourse._id, ratingData);
              setRatingModalCourse(null);
            }}
          />
        )}
      </div>
    </main>
  );
};
