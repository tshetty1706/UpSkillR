import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Compass,
  Sparkles,
  BookOpen,
  Award,
  Layers,
  Clock,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { CourseThumbnail } from '../../common/CourseThumbnail';
import { useToast } from '../../../context/ToastContext';
import { API_BASE } from '../../../config/api';
import './LearnerExploreView.css';

export const LearnerExploreView = ({
  enrolments = [],
  onEnrolCourse,
  onNavigateToCourse
}) => {
  const { toast } = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [enrollingId, setEnrollingId] = useState(null);

  // Set of enrolled course IDs to strictly exclude
  const enrolledIds = useMemo(() => {
    return new Set(
      enrolments.map((e) => {
        const id = typeof e.courseId === 'object' ? e.courseId?._id : e.courseId;
        return String(id);
      })
    );
  }, [enrolments]);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/courses/published`);
      const data = await res.json();
      if (data.success && Array.isArray(data.courses)) {
        setCourses(data.courses);
      }
    } catch (err) {
      console.error('Failed to load published courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Extract unique categories from published courses
  const categories = useMemo(() => {
    const set = new Set(['All']);
    courses.forEach((c) => {
      if (c.category && c.category.trim()) set.add(c.category.trim());
    });
    return Array.from(set);
  }, [courses]);

  // Filter available courses: strictly EXCLUDE already enrolled courses
  const availableCourses = useMemo(() => {
    return courses.filter((c) => {
      // 1. Exclude if already enrolled
      if (enrolledIds.has(String(c._id))) return false;

      // 2. Filter by category
      if (selectedCategory !== 'All' && c.category !== selectedCategory) return false;

      // 3. Filter by skill level
      if (selectedLevel !== 'All' && c.skillLevel !== selectedLevel) return false;

      return true;
    });
  }, [courses, enrolledIds, selectedCategory, selectedLevel]);

  const handleEnrollClick = async (course) => {
    setEnrollingId(course._id);
    try {
      if (onEnrolCourse) {
        await onEnrolCourse(course._id);
      }
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <div className="learner-explore-page">
      <div className="explore-header-row">
        <div>
          <h1 className="explore-page-title">Explore Courses</h1>
          <p className="explore-page-subtitle">
            Discover new skills and courses available for enrollment.
          </p>
        </div>

        {/* Filter Selectors (Category & Skill Level) */}
        <div className="explore-filters-row">
          <div className="filter-select-wrap">
            <label htmlFor="explore-category-select" className="filter-label">Category</label>
            <select
              id="explore-category-select"
              className="filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrap">
            <label htmlFor="explore-level-select" className="filter-label">Skill Level</label>
            <select
              id="explore-level-select"
              className="filter-select"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="All">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="explore-loading">Loading available courses...</div>
      ) : availableCourses.length === 0 ? (
        <div className="explore-empty-card">
          <div className="explore-empty-icon" aria-hidden="true">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="empty-title">
            {courses.length > 0 && enrolledIds.size >= courses.length
              ? "You're Enrolled in All Available Courses!"
              : "No Available Courses Found"}
          </h2>
          <p className="empty-desc">
            {courses.length > 0 && enrolledIds.size >= courses.length
              ? "Great job! You have enrolled in every available course. Head over to My Learning to continue your coursework."
              : "Try adjusting your category or skill level filters to explore other courses."}
          </p>
          {selectedCategory !== 'All' || selectedLevel !== 'All' ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setSelectedCategory('All');
                setSelectedLevel('All');
              }}
              style={{ minHeight: '44px', padding: '8px 20px' }}
            >
              Reset Filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="explore-courses-grid">
          {availableCourses.map((course) => {
            const isEnrolling = enrollingId === course._id;
            const priceText = course.price > 0 ? `₹${course.price}` : 'Free';
            const moduleCount = course.modules?.length || course.moduleCount || 0;

            return (
              <div key={course._id} className="explore-card">
                {/* Thumbnail */}
                <div
                  className="explore-card-thumb-wrap"
                  onClick={() => onNavigateToCourse && onNavigateToCourse(course._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onNavigateToCourse && onNavigateToCourse(course._id);
                    }
                  }}
                  aria-label={`View ${course.title}`}
                >
                  <CourseThumbnail
                    src={course.thumbnail}
                    alt={course.title}
                    className="explore-card-thumb"
                  />
                  <div className="explore-badge-strip">
                    {course.category && (
                      <span className="explore-cat-badge">{course.category}</span>
                    )}
                    {course.skillLevel && (
                      <span className="explore-level-badge">{course.skillLevel}</span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="explore-card-body">
                  <h3
                    className="explore-course-title"
                    title={course.title}
                    onClick={() => onNavigateToCourse && onNavigateToCourse(course._id)}
                  >
                    {course.title}
                  </h3>

                  <p className="explore-course-desc">
                    {course.shortDescription || course.description || 'Explore this in-depth course on UpSkillr.'}
                  </p>

                  <div className="explore-card-meta-row">
                    <span className="explore-instructor-name">
                      By {course.instructorName || 'UpSkillr Educator'}
                    </span>
                    <span className="explore-price-chip">{priceText}</span>
                  </div>

                  {/* Actions */}
                  <div className="explore-card-actions">
                    <button
                      type="button"
                      className="btn-view-course"
                      onClick={() => onNavigateToCourse && onNavigateToCourse(course._id)}
                      aria-label={`View course overview for ${course.title}`}
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      className="btn-enroll-action"
                      onClick={() => handleEnrollClick(course)}
                      disabled={isEnrolling}
                      aria-label={`Enroll in ${course.title}`}
                    >
                      {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LearnerExploreView;

