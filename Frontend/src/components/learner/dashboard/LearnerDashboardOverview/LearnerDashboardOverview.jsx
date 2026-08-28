import React from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import './LearnerDashboardOverview.css';

export const LearnerDashboardOverview = ({ user, enrolments, loading, onLessonComplete }) => {
  return (
    <main className="learner-main-workspace section">
      <div className="container">
        <div className="learner-welcome-header">
          <h1>Welcome back, <span className="accent-green">{user?.fullName || 'Learner'}</span>! 👋</h1>
          <p>Track your course progress and continue learning on UpSkillr.</p>
        </div>

        {loading ? (
          <div className="loading-workspace-spinner">Loading your enrolled courses...</div>
        ) : enrolments.length === 0 ? (
          <div className="empty-courses-card">
            <BookOpen size={32} />
            <h2>No Enrolled Courses Yet</h2>
            <p>Explore expert-led courses and enrol to start building skills.</p>
            <a
              href="/explore"
              className="btn btn-primary"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/explore');
                window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/explore' } }));
              }}
            >
              Browse Courses
            </a>
          </div>
        ) : (
          <div className="enrolled-courses-grid">
            {enrolments.map((enrol) => {
              const course = enrol.courseId;
              if (!course) return null;

              return (
                <div key={enrol._id} className="enrolled-card">
                  <img src={course.thumbnail} alt={course.title} className="enrolled-thumb" />
                  <div className="enrolled-body">
                    <span className="category-pill">{course.category}</span>
                    <h3>{course.title}</h3>
                    <p>Instructor: {course.instructorName || 'UpSkillr Instructor'}</p>

                    <div className="progress-bar-container">
                      <div className="progress-label">
                        <span>Course Progress</span>
                        <strong>{enrol.progressPercentage}%</strong>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${enrol.progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Lessons list to mark completion */}
                    <div className="learner-lessons-list">
                      <h4>Course Lessons</h4>
                      {course.lessons?.map((ls, idx) => {
                        const isDone = enrol.completedLessons?.includes(idx);
                        return (
                          <div key={idx} className="learner-lesson-item">
                            <span>Lesson {idx + 1}: {ls.title}</span>
                            <button
                              type="button"
                              className={`btn-lesson-check ${isDone ? 'done' : ''}`}
                              onClick={() => onLessonComplete(course._id, idx)}
                            >
                              <CheckCircle2 size={16} />
                              <span>{isDone ? 'Completed' : 'Mark Complete'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};
