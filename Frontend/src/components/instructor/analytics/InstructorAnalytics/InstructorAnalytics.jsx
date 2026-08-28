import React from 'react';
import { BarChart3, TrendingUp, Users, BookOpen, CheckCircle2 } from 'lucide-react';
import './InstructorAnalytics.css';

export const InstructorAnalytics = ({ stats, courses }) => {
  return (
    <div className="instructor-analytics-page">
      <div className="analytics-header">
        <h1 className="page-title">Course Analytics & Insights</h1>
        <p className="page-subtitle">Real performance metrics calculated from your MongoDB database.</p>
      </div>

      <div className="dashboard-metrics-grid">
        <div className="metric-card">
          <span className="metric-title">Total Created Courses</span>
          <span className="metric-value">{stats?.totalCourses || 0}</span>
        </div>
        <div className="metric-card">
          <span className="metric-title">Live Published Courses</span>
          <span className="metric-value">{stats?.publishedCourses || 0}</span>
        </div>
        <div className="metric-card">
          <span className="metric-title">Draft Courses</span>
          <span className="metric-value">{stats?.draftCourses || 0}</span>
        </div>
        <div className="metric-card">
          <span className="metric-title">Total Active Enrolments</span>
          <span className="metric-value">{stats?.totalLearners || 0}</span>
        </div>
      </div>

      <div className="analytics-card">
        <h2>Course Enrolment Breakdown</h2>
        {courses.length === 0 ? (
          <p className="empty-subitem-text" style={{ padding: '1rem 0' }}>
            No course statistics available yet. Create and publish courses to start seeing metrics.
          </p>
        ) : (
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Lessons</th>
                  <th>Enrolled Learners</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c._id}>
                    <td><strong>{c.title}</strong></td>
                    <td>{c.category}</td>
                    <td>
                      <span className={`status-pill ${c.status}`}>{c.status}</span>
                    </td>
                    <td>{c.lessons?.length || 0}</td>
                    <td><strong>{c.learnersCount || 0}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
