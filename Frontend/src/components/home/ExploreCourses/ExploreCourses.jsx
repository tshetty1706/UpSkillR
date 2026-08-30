import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Video, Users, CheckCircle2, Star, Sparkles, ArrowRight } from 'lucide-react';
import './ExploreCourses.css';
import { useToast } from '../../../context/ToastContext';
import exploreCoursesSvg from '../../../assets/illustrations/explore_courses.svg?raw';

export const ExploreCourses = () => {
  const { toast } = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [enrolledMap, setEnrolledMap] = useState({});

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

  const filteredCourses = courses.filter((c) => {
    const matchesCategory = selectedCategory === 'all' || c.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.instructorName && c.instructorName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories = ['all', 'Web Development', 'Data Science', 'Design', 'Business', 'Marketing'];

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

        {/* Filter Bar */}
        <div className="explore-toolbar">
          <div className="category-chips">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
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
                  <img src={course.thumbnail} alt={course.title} className="course-card-thumb" />
                  <span className="level-badge">{course.skillLevel}</span>
                </div>

                <div className="course-card-body">
                  <span className="course-category">{course.category}</span>
                  <h3 className="course-title">{course.title}</h3>
                  <p className="course-description">{course.description}</p>
                  <p className="instructor-tag">By {course.instructorName || 'UpSkillr Instructor'}</p>

                  <div className="course-metrics-row">
                    <div className="metric-item">
                      <Video size={14} />
                      <span>{course.lessons?.length || 0} Lessons</span>
                    </div>
                    <div className="metric-item">
                      <Users size={14} />
                      <span>{course.learnersCount || 0} Enrolled</span>
                    </div>
                  </div>
                </div>

                <div className="course-card-footer">
                  {enrolledMap[course._id] ? (
                    <button type="button" className="btn btn-outline btn-block" disabled>
                      <CheckCircle2 size={16} />
                      <span>Enrolled</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-block"
                      onClick={() => handleEnrol(course._id, course.title)}
                    >
                      <span>Enrol Now</span>
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
