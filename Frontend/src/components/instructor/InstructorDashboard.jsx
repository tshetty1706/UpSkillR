import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  FileEdit,
  Users,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Award,
  Video
} from 'lucide-react';
import './InstructorDashboard.css';

export const InstructorDashboard = ({ user, stats, courses, onNavigate }) => {
  const recentCourses = courses.slice(0, 4);

  return (
    <div className="instructor-dashboard">
      {/* 1. Welcome Banner */}
      <section className="dashboard-welcome-card">
        <div className="welcome-content">
          <div className="welcome-badge">
            <Sparkles size={14} />
            <span>Instructor Dashboard</span>
          </div>
          <h1 className="welcome-title">
            Welcome back, <span className="accent-green">{user?.fullName || 'Instructor'}</span>! 👋
          </h1>
          <p className="welcome-subtitle">
            Manage your courses, track learner enrolments, and build impactful learning experiences on UpSkillr.
          </p>

          <div className="welcome-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate('create-course')}
            >
              <Plus size={18} />
              <span>Create New Course</span>
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => onNavigate('my-courses')}
            >
              <BookOpen size={18} />
              <span>Manage My Courses</span>
            </button>
          </div>
        </div>

        <div className="welcome-illustration">
          <div className="stats-mini-badge">
            <TrendingUp size={20} className="accent-green" />
            <div className="mini-info">
              <span className="mini-val">{stats?.totalLearners || 0}</span>
              <span className="mini-lbl">Active Enrolments</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Key Metrics Grid */}
      <section className="dashboard-metrics-grid">
        {/* Total Courses */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Courses</span>
            <div className="metric-icon-box brand">
              <BookOpen size={20} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{stats?.totalCourses || 0}</span>
            <span className="metric-desc">Created in your studio</span>
          </div>
        </div>

        {/* Published Courses */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Published Courses</span>
            <div className="metric-icon-box success">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{stats?.publishedCourses || 0}</span>
            <span className="metric-desc">Live & visible to learners</span>
          </div>
        </div>

        {/* Draft Courses */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Draft Courses</span>
            <div className="metric-icon-box warning">
              <FileEdit size={20} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{stats?.draftCourses || 0}</span>
            <span className="metric-desc">Work in progress</span>
          </div>
        </div>

        {/* Total Learners / Enrolments */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Learners</span>
            <div className="metric-icon-box info">
              <Users size={20} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{stats?.totalLearners || 0}</span>
            <span className="metric-desc">Enrolled across all courses</span>
          </div>
        </div>
      </section>

      {/* 3. Main Content Columns: Recent Courses + Activity */}
      <div className="dashboard-columns-grid">
        {/* Left Column: Recent Courses */}
        <div className="dashboard-column-main">
          <div className="section-card">
            <div className="section-card-header">
              <div className="section-card-title-group">
                <h2 className="section-card-title">Recent Courses</h2>
                <p className="section-card-subtitle">Manage your latest course creations</p>
              </div>
              <button
                type="button"
                className="btn-link"
                onClick={() => onNavigate('my-courses')}
              >
                <span>View All ({courses.length})</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {recentCourses.length === 0 ? (
              <div className="empty-dashboard-state">
                <div className="empty-icon-box">
                  <BookOpen size={28} />
                </div>
                <h3>No Courses Created Yet</h3>
                <p>Start building your first course to inspire learners on UpSkillr.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onNavigate('create-course')}
                >
                  <Plus size={18} />
                  <span>Create Your First Course</span>
                </button>
              </div>
            ) : (
              <div className="dashboard-courses-list">
                {recentCourses.map((course) => (
                  <div key={course._id} className="dashboard-course-row">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="course-row-thumb"
                    />
                    <div className="course-row-info">
                      <div className="course-row-meta">
                        <span className={`status-pill ${course.status}`}>
                          {course.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                        <span className="category-pill">{course.category}</span>
                      </div>
                      <h3 className="course-row-title">{course.title}</h3>
                      <div className="course-row-details">
                        <span><Video size={13} /> {course.lessons?.length || 0} Lessons</span>
                        <span><Users size={13} /> {course.learnersCount || 0} Learners</span>
                        <span><Clock size={13} /> {new Date(course.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="course-row-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => onNavigate('manage-course', course._id)}
                      >
                        Manage Workspace
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Activity & Quick Tools */}
        <div className="dashboard-column-side">
          <div className="section-card">
            <h2 className="section-card-title" style={{ fontSize: '1.05rem' }}>Recent Studio Activity</h2>
            <div className="activity-timeline">
              <div className="timeline-item">
                <div className="timeline-icon success">
                  <CheckCircle2 size={14} />
                </div>
                <div className="timeline-info">
                  <span className="timeline-text">Collection separation verified</span>
                  <span className="timeline-time">Just now</span>
                </div>
              </div>

              <div className="timeline-item">
                <div className="timeline-icon brand">
                  <Sparkles size={14} />
                </div>
                <div className="timeline-info">
                  <span className="timeline-text">Studio workspace loaded</span>
                  <span className="timeline-time">Today</span>
                </div>
              </div>

              {courses.length > 0 && (
                <div className="timeline-item">
                  <div className="timeline-icon info">
                    <BookOpen size={14} />
                  </div>
                  <div className="timeline-info">
                    <span className="timeline-text">Updated "{courses[0].title}"</span>
                    <span className="timeline-time">{new Date(courses[0].updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="section-card tip-box-card">
            <div className="tip-header">
              <Award size={20} className="accent-green" />
              <h3>Instructor Success Tip</h3>
            </div>
            <p className="tip-body">
              Courses with at least 5 lessons and an assessment see a 40% higher completion rate among UpSkillr learners.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
