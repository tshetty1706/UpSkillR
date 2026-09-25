import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  BookOpen,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  Info,
  HelpCircle
} from 'lucide-react';
import { LineChartComponent, BarChartComponent, PieChartComponent } from './AnalyticsCharts';
import { API_BASE } from '../../../../config/api';
import './InstructorAnalytics.css';

export const InstructorAnalytics = ({ courses: initialCourses = [] }) => {
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [coursesList, setCoursesList] = useState(initialCourses);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chart type dropdown selection states
  const [performanceChartType, setPerformanceChartType] = useState('pie'); // pie | bar
  const [scoreTimeChartType, setScoreTimeChartType] = useState('line'); // line | bar

  const [courseProgressChartType, setCourseProgressChartType] = useState('bar'); // bar | pie
  const [lessonAnalyticsChartType, setLessonAnalyticsChartType] = useState('bar'); // bar | line
  const [resourceAnalyticsChartType, setResourceAnalyticsChartType] = useState('bar'); // bar | pie
  const [assessmentAnalyticsChartType, setAssessmentAnalyticsChartType] = useState('bar'); // bar | line
  const [questionPerformanceChartType, setQuestionPerformanceChartType] = useState('bar'); // bar | pie

  useEffect(() => {
    fetchInstructorCourses();
  }, []);

  useEffect(() => {
    fetchAnalyticsData(selectedCourseId);
  }, [selectedCourseId]);

  const fetchInstructorCourses = async () => {
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/courses/instructor/my-courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.courses) {
        setCoursesList(data.courses);
      }
    } catch (err) {
      console.error('Failed to fetch instructor courses for analytics dropdown', err);
    }
  };

  const fetchAnalyticsData = async (courseId) => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const query = courseId && courseId !== 'all' ? `?courseId=${courseId}` : '';
      const response = await fetch(`${API_BASE}/courses/instructor/analytics${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data);
      } else {
        setError(data.message || 'Failed to load analytics data.');
      }
    } catch (err) {
      console.error('Fetch Analytics Error:', err);
      setError('Network error loading analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (e) => {
    setSelectedCourseId(e.target.value);
  };

  const renderChartByType = (type, lineData, barData, pieData, config = {}) => {
    if (type === 'line') {
      return (
        <LineChartComponent
          data={lineData}
          xKey={config.xKey || 'date'}
          yKey={config.yKey || 'value'}
          height={220}
        />
      );
    }
    if (type === 'pie') {
      return <PieChartComponent data={pieData} height={220} />;
    }
    return (
      <BarChartComponent
        data={barData}
        xKey={config.xKey || 'label'}
        yKey={config.yKey || 'value'}
        height={220}
        valueSuffix={config.valueSuffix || ''}
      />
    );
  };

  const isAllView = analyticsData?.viewMode === 'all';
  const summary = analyticsData?.summaryCards;
  const overview = analyticsData?.courseOverview;
  const charts = analyticsData?.charts;
  const recentSubmissions = analyticsData?.recentSubmissions || [];
  const learnersAttention = analyticsData?.learnersNeedingAttention || [];

  return (
    <div className="instructor-analytics-page">
      {/* Top Breadcrumb Header with Selector */}
      <div className="analytics-header">
        <div className="analytics-breadcrumb">
          <span className="breadcrumb-root">Analytics</span>
          <span className="breadcrumb-separator">→</span>
          <div className="course-select-wrapper">
            <select
              className="course-selector-dropdown"
              value={selectedCourseId}
              onChange={handleCourseChange}
              id="analytics-course-select"
            >
              <option value="all">All Courses</option>
              {coursesList.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
            <ChevronDown className="select-dropdown-icon" size={16} />
          </div>
        </div>
        <p className="page-subtitle">
          Real-time instructor analytics calculated from recorded course, enrolment, and submission data.
        </p>
      </div>

      {loading ? (
        <div className="analytics-loading-state">
          <div className="analytics-spinner" />
          <p>Calculating performance analytics...</p>
        </div>
      ) : error ? (
        <div className="analytics-error-state">
          <AlertTriangle size={24} className="error-icon" />
          <p>{error}</p>
          <button className="btn-retry" onClick={() => fetchAnalyticsData(selectedCourseId)}>
            Retry Loading Analytics
          </button>
        </div>
      ) : (
        <>
          {/* ─── ALL COURSES VIEW ─── */}
          {isAllView && summary && (
            <>
              {/* Summary Cards */}
              <div className="analytics-summary-cards-grid">
                <div className="summary-card">
                  <div className="summary-icon-wrap brand">
                    <BookOpen size={20} />
                  </div>
                  <div className="summary-content">
                    <span className="summary-title">Total Courses</span>
                    <span className="summary-value">{summary.totalCourses}</span>
                    <span className="summary-subtext">
                      {summary.publishedCourses} Published • {summary.draftCourses} Draft
                    </span>
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-icon-wrap info">
                    <Users size={20} />
                  </div>
                  <div className="summary-content">
                    <span className="summary-title">Total Learners</span>
                    <span className="summary-value">{summary.totalLearners}</span>
                    <span className="summary-subtext">Unique enrolled students</span>
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-icon-wrap purple">
                    <FileText size={20} />
                  </div>
                  <div className="summary-content">
                    <span className="summary-title">Total Assessments</span>
                    <span className="summary-value">{summary.totalAssessments}</span>
                    <span className="summary-subtext">
                      {summary.assessmentCount ?? (summary.totalAssessments || 0)} Assessments • {summary.quizCount || 0} Quizzes
                    </span>
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-icon-wrap warning">
                    <Clock size={20} />
                  </div>
                  <div className="summary-content">
                    <span className="summary-title">Total Submissions</span>
                    <span className="summary-value">{summary.totalSubmissions}</span>
                    <span className="summary-subtext">
                      {summary.assessmentSubmissionsCount ?? summary.totalSubmissions} Assessments • {summary.quizSubmissionsCount || 0} Quizzes
                    </span>
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-icon-wrap success">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="summary-content">
                    <span className="summary-title">Overall Average Score</span>
                    <span className="summary-value">{summary.overallAverageScore}%</span>
                    <span className="summary-subtext">Across graded assessments</span>
                  </div>
                </div>
              </div>

              {/* Performance Charts Grid */}
              <div className="analytics-charts-grid">
                {/* A. Assessment Performance */}
                <div className="analytics-card chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3>Assessment Performance</h3>
                      <p className="chart-desc">Pass, fail, and pending review distribution</p>
                    </div>
                    <div className="chart-type-select-wrap">
                      <span className="select-label">Chart Type:</span>
                      <select
                        value={performanceChartType}
                        onChange={(e) => setPerformanceChartType(e.target.value)}
                        className="chart-type-dropdown"
                      >
                        <option value="pie">Pie</option>
                        <option value="bar">Bar</option>
                      </select>
                    </div>
                  </div>
                  <div className="chart-body">
                    {renderChartByType(
                      performanceChartType,
                      charts?.assessmentPerformance || [],
                      charts?.assessmentPerformance || [],
                      charts?.assessmentPerformance || [],
                      { xKey: 'name', yKey: 'value' }
                    )}
                  </div>
                </div>

                {/* B. Average Score Over Time */}
                <div className="analytics-card chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3>Average Score Over Time</h3>
                      <p className="chart-desc">Overall score percentage trend across graded assessments</p>
                    </div>
                    <div className="chart-type-select-wrap">
                      <span className="select-label">Chart Type:</span>
                      <select
                        value={scoreTimeChartType}
                        onChange={(e) => setScoreTimeChartType(e.target.value)}
                        className="chart-type-dropdown"
                      >
                        <option value="line">Line</option>
                        <option value="bar">Bar</option>
                      </select>
                    </div>
                  </div>
                  <div className="chart-body">
                    {renderChartByType(
                      scoreTimeChartType,
                      charts?.averageScoreOverTime || [],
                      charts?.averageScoreOverTime || [],
                      charts?.averageScoreOverTime || [],
                      { xKey: 'date', yKey: 'averageScore', valueSuffix: '%' }
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ─── COURSE-SPECIFIC VIEW ─── */}
          {!isAllView && overview && (
            <>
              {/* Course Overview Cards */}
              <div className="course-overview-header-card analytics-card">
                <div className="course-overview-title-bar">
                  <div>
                    <h2>{overview.title}</h2>
                    <span className={`status-pill ${overview.status}`}>{overview.status}</span>
                  </div>
                </div>

                <div className="course-overview-stats-grid">
                  <div className="mini-stat-item">
                    <span className="mini-stat-val">{overview.lessonsCount}</span>
                    <span className="mini-stat-lbl">Lessons</span>
                  </div>
                  <div className="mini-stat-item">
                    <span className="mini-stat-val">{overview.resourcesCount}</span>
                    <span className="mini-stat-lbl">Resources</span>
                  </div>
                  <div className="mini-stat-item">
                    <span className="mini-stat-val">{overview.assessmentsCount}</span>
                    <span className="mini-stat-lbl">Assessments</span>
                  </div>
                  <div className="mini-stat-item">
                    <span className="mini-stat-val">{overview.learnersCount}</span>
                    <span className="mini-stat-lbl">Learners Enrolled</span>
                  </div>
                </div>
              </div>

              {/* Course Specific Charts */}
              <div className="analytics-charts-grid">
                {/* 1. Course Progress */}
                <div className="analytics-card chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3>Course Progress</h3>
                      <p className="chart-desc">Learner progress completion categories</p>
                    </div>
                    <div className="chart-type-select-wrap">
                      <span className="select-label">Chart Type:</span>
                      <select
                        value={courseProgressChartType}
                        onChange={(e) => setCourseProgressChartType(e.target.value)}
                        className="chart-type-dropdown"
                      >
                        <option value="bar">Bar</option>
                        <option value="pie">Pie</option>
                      </select>
                    </div>
                  </div>
                  <div className="chart-body">
                    {renderChartByType(
                      courseProgressChartType,
                      charts?.courseProgress || [],
                      charts?.courseProgress || [],
                      (charts?.courseProgress || []).map((cp) => ({
                        name: cp.category,
                        value: cp.count,
                        color:
                          cp.category === 'Completed'
                            ? 'var(--color-success)'
                            : cp.category === 'In Progress'
                            ? 'var(--brand-primary)'
                            : 'var(--text-muted)'
                      })),
                      { xKey: 'category', yKey: 'count' }
                    )}
                  </div>
                </div>

                {/* 2. Lesson Analytics */}
                <div className="analytics-card chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3>Lesson Analytics</h3>
                      <p className="chart-desc">Completion percentage per lesson</p>
                    </div>
                    <div className="chart-type-select-wrap">
                      <span className="select-label">Chart Type:</span>
                      <select
                        value={lessonAnalyticsChartType}
                        onChange={(e) => setLessonAnalyticsChartType(e.target.value)}
                        className="chart-type-dropdown"
                      >
                        <option value="bar">Bar</option>
                        <option value="line">Line</option>
                      </select>
                    </div>
                  </div>
                  <div className="chart-body scrollable-chart-body">
                    {renderChartByType(
                      lessonAnalyticsChartType,
                      charts?.lessonAnalytics || [],
                      charts?.lessonAnalytics || [],
                      [],
                      { xKey: 'title', yKey: 'completionPercent', valueSuffix: '%' }
                    )}
                  </div>
                </div>

                {/* 3. Resource Analytics */}
                <div className="analytics-card chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3>Resource Analytics</h3>
                      <p className="chart-desc">Material views & download metrics</p>
                    </div>
                    <div className="chart-type-select-wrap">
                      <span className="select-label">Chart Type:</span>
                      <select
                        value={resourceAnalyticsChartType}
                        onChange={(e) => setResourceAnalyticsChartType(e.target.value)}
                        className="chart-type-dropdown"
                      >
                        <option value="bar">Bar</option>
                        <option value="pie">Pie</option>
                      </select>
                    </div>
                  </div>
                  <div className="chart-body">
                    {charts?.resourceAnalytics?.available === false ? (
                      <div className="analytics-empty-state-box">
                        <Info size={28} className="empty-info-icon" />
                        <p className="empty-state-msg">{charts.resourceAnalytics.message}</p>
                      </div>
                    ) : (
                      renderChartByType(
                        resourceAnalyticsChartType,
                        charts?.resourceAnalytics?.data || [],
                        charts?.resourceAnalytics?.data || [],
                        charts?.resourceAnalytics?.data || [],
                        { xKey: 'name', yKey: 'views' }
                      )
                    )}
                  </div>
                </div>

                {/* 4. Assessment Analytics */}
                <div className="analytics-card chart-card">
                  <div className="chart-card-header">
                    <div>
                      <h3>Assessment Analytics</h3>
                      <p className="chart-desc">Submissions and score breakdown per assessment</p>
                    </div>
                    <div className="chart-type-select-wrap">
                      <span className="select-label">Chart Type:</span>
                      <select
                        value={assessmentAnalyticsChartType}
                        onChange={(e) => setAssessmentAnalyticsChartType(e.target.value)}
                        className="chart-type-dropdown"
                      >
                        <option value="bar">Bar</option>
                        <option value="line">Line</option>
                      </select>
                    </div>
                  </div>
                  <div className="chart-body">
                    {renderChartByType(
                      assessmentAnalyticsChartType,
                      charts?.assessmentAnalytics || [],
                      charts?.assessmentAnalytics || [],
                      [],
                      { xKey: 'title', yKey: 'averageScore', valueSuffix: '%' }
                    )}
                  </div>
                </div>

                {/* 5. Question Performance */}
                <div className="analytics-card chart-card full-width">
                  <div className="chart-card-header">
                    <div>
                      <h3>Question Performance</h3>
                      <p className="chart-desc">Answer accuracy by question item</p>
                    </div>
                    <div className="chart-type-select-wrap">
                      <span className="select-label">Chart Type:</span>
                      <select
                        value={questionPerformanceChartType}
                        onChange={(e) => setQuestionPerformanceChartType(e.target.value)}
                        className="chart-type-dropdown"
                      >
                        <option value="bar">Bar</option>
                        <option value="pie">Pie</option>
                      </select>
                    </div>
                  </div>
                  <div className="chart-body">
                    {charts?.questionPerformance?.available === false ? (
                      <div className="analytics-empty-state-box">
                        <HelpCircle size={28} className="empty-info-icon" />
                        <p className="empty-state-msg">{charts.questionPerformance.message}</p>
                      </div>
                    ) : (
                      renderChartByType(
                        questionPerformanceChartType,
                        charts?.questionPerformance?.questions || [],
                        charts?.questionPerformance?.questions || [],
                        [],
                        { xKey: 'questionText', yKey: 'correctPercent', valueSuffix: '%' }
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Learners Needing Attention (Course Specific) */}
              {learnersAttention.length > 0 && (
                <div className="analytics-card attention-card">
                  <div className="attention-header">
                    <AlertTriangle size={20} className="attention-icon" />
                    <h3>Learners Needing Attention</h3>
                  </div>
                  <div className="attention-list">
                    {learnersAttention.map((learner, idx) => (
                      <div key={idx} className="attention-item">
                        <div className="attention-user-info">
                          <strong>{learner.learnerName}</strong>
                          <span className="user-email">{learner.learnerEmail}</span>
                        </div>
                        <div className="attention-reason-badge">
                          <span>{learner.reason}</span>
                          <span className="progress-val">Progress: {learner.progressPercentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}


        </>
      )}
    </div>
  );
};
