import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Users,
  Info,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Compass
} from 'lucide-react';
import { Avatar } from '../../../components/common/Avatar/Avatar';
import { API_BASE } from '../../../config/api';
import './CourseLeaderboardView.css';

export const CourseLeaderboardView = ({ courseId, courseTitle, user }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchLeaderboard = useCallback(async (targetPage = page) => {
    if (!courseId) return;
    setLoading(true);
    setError(null);

    const token = sessionStorage.getItem('upskillr_token');
    const authHeaders = {};
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/course-leaderboard?page=${targetPage}&limit=10`, {
        headers: authHeaders
      });
      const result = await res.json();

      if (result.success) {
        setData(result);
      } else {
        setError(result.message || 'Failed to load course leaderboard.');
      }
    } catch (err) {
      console.error('Error fetching course leaderboard:', err);
      setError('Unable to connect to leaderboard service. Please check your network.');
    } finally {
      setLoading(false);
    }
  }, [courseId, page]);

  useEffect(() => {
    setPage(1);
  }, [courseId]);

  useEffect(() => {
    fetchLeaderboard(page);
  }, [fetchLeaderboard, page]);

  const renderRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <span className="course-rank-badge rank-gold" title="1st Place (Gold)">
          <Trophy size={16} className="rank-badge-icon" />
          <span>1</span>
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="course-rank-badge rank-silver" title="2nd Place (Silver)">
          <Medal size={16} className="rank-badge-icon" />
          <span>2</span>
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="course-rank-badge rank-bronze" title="3rd Place (Bronze)">
          <Medal size={16} className="rank-badge-icon" />
          <span>3</span>
        </span>
      );
    }
    return (
      <span className="course-rank-badge rank-standard">
        <span>{rank}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="course-leaderboard-pane-container">
        <div className="course-leaderboard-loading-box">
          <div className="loading-orbit-spinner" />
          <p>Calculating official course standings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-leaderboard-pane-container">
        <div className="course-leaderboard-error-card">
          <AlertCircle size={38} className="error-icon" />
          <h3>Leaderboard Unavailable</h3>
          <p>{error}</p>
          <button
            type="button"
            className="btn-retry-leaderboard"
            onClick={fetchLeaderboard}
          >
            <RefreshCw size={15} />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  const {
    courseTitle: titleFromApi,
    totalEnrolled = 0,
    totalLearners = totalEnrolled,
    totalCourseQuizzes = 0,
    totalCourseAssessments = 0,
    methodology,
    pagination = {
      currentPage: page,
      limit: 10,
      totalLearners: totalEnrolled,
      totalPages: 1,
      hasPrevPage: false,
      hasNextPage: false
    },
    leaderboard = [],
    currentUserRank
  } = data || {};

  const displayTitle = titleFromApi || courseTitle || 'Course';
  const startRow = pagination.totalLearners > 0
    ? (pagination.currentPage - 1) * pagination.limit + 1
    : 0;
  const endRow = Math.min(pagination.currentPage * pagination.limit, pagination.totalLearners);

  return (
    <div className="course-leaderboard-pane-container">
      {/* ─── 1. TOP HEADER & METADATA ─── */}
      <header className="course-leaderboard-header">
        <div className="leaderboard-heading-row">
          <div className="leaderboard-title-group">
            <div className="leaderboard-icon-wrapper">
              <Trophy size={24} className="leaderboard-trophy-icon" />
            </div>
            <div>
              <div className="leaderboard-breadcrumb-crumb">{displayTitle}</div>
              <h1 className="course-leaderboard-title">Course Leaderboard</h1>
            </div>
          </div>

          <div className="leaderboard-header-meta-chips">
            <span className="leaderboard-meta-chip enrolled-chip" title="Total Enrolled Learners">
              <Users size={14} />
              <span>{totalLearners} {totalLearners === 1 ? 'Learner' : 'Learners'}</span>
            </span>

            <span className="leaderboard-meta-chip quizzes-chip" title="Quizzes & Assessments Evaluated">
              <Sparkles size={14} />
              <span>
                {totalCourseQuizzes} {totalCourseQuizzes === 1 ? 'Quiz' : 'Quizzes'} &bull; {totalCourseAssessments} {totalCourseAssessments === 1 ? 'Assessment' : 'Assessments'}
              </span>
            </span>
          </div>
        </div>

        {/* ─── 2. RANKING METHODOLOGY CALLOUT BANNER ─── */}
        <div className="ranking-methodology-card">
          <div className="methodology-icon-col">
            <Info size={18} className="methodology-info-icon" />
          </div>
          <div className="methodology-content-col">
            <div className="methodology-title-row">
              <span className="methodology-heading">Ranking Methodology: Quiz + Assessment Performance</span>
            </div>
            <p className="methodology-description">
              {methodology || 'Overall standings are calculated using the first officially submitted attempt for every quiz and assessment in this course. Subsequent attempts are recorded separately for practice and do not affect official rankings.'}
            </p>
          </div>
        </div>

        {/* ─── 3. CURRENT USER STANDING SUMMARY CARD (ALWAYS VISIBLE ACROSS PAGES) ─── */}
        {currentUserRank && (
          <div className="current-user-standing-banner">
            <div className="user-standing-left">
              <div className="standing-rank-display">
                <span className="standing-rank-label">Your Rank</span>
                <div className="standing-rank-value">
                  {renderRankBadge(currentUserRank.rank)}
                  <span className="rank-number-text">
                    #{currentUserRank.rank} of {currentUserRank.totalLearners || totalLearners}
                  </span>
                </div>
              </div>

              {currentUserRank.page && currentUserRank.page !== pagination.currentPage && (
                <button
                  type="button"
                  className="btn-jump-my-rank"
                  onClick={() => setPage(currentUserRank.page)}
                >
                  <Compass size={14} />
                  <span>Go to Page {currentUserRank.page}</span>
                </button>
              )}
            </div>

            <div className="user-standing-metrics-grid">
              <div className="standing-metric-cell">
                <span className="metric-cell-label">Quiz Marks</span>
                <span className="metric-cell-val font-mono">{currentUserRank.quizMarks}</span>
              </div>

              <div className="standing-metric-cell">
                <span className="metric-cell-label">Assessment Marks</span>
                <span className="metric-cell-val font-mono">{currentUserRank.assessmentMarks ?? 0}</span>
              </div>

              <div className="standing-metric-cell total-score-cell">
                <span className="metric-cell-label">Total Score</span>
                <span className="metric-cell-val font-mono text-brand">{currentUserRank.totalMarks} pts</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ─── 4. LEADERBOARD TABLE / EMPTY STATE ─── */}
      <section className="course-leaderboard-table-section" aria-label="Course Ranking Table">
        {leaderboard.length === 0 ? (
          <div className="course-leaderboard-empty-state">
            <div className="empty-trophy-wrapper">
              <Trophy size={48} className="empty-trophy-icon" />
            </div>
            <h3>No Standings Recorded Yet</h3>
            <p>
              Leaderboard standings will update automatically as learners complete quizzes and course assessments.
            </p>
          </div>
        ) : (
          <div className="leaderboard-table-responsive-wrapper">
            <table className="course-leaderboard-table">
              <thead>
                <tr>
                  <th className="col-rank">Rank</th>
                  <th className="col-student">Student</th>
                  <th className="col-quiz-marks text-right">Quiz Marks</th>
                  <th className="col-assessment-marks text-right">Assessment Marks</th>
                  <th className="col-total-marks text-right">Total Marks</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((student) => {
                  const isCurrent = student.isCurrentUser;
                  return (
                    <tr
                      key={student.learnerId}
                      className={`leaderboard-student-row ${isCurrent ? 'current-student-row' : ''}`}
                    >
                      {/* Rank */}
                      <td className="col-rank">
                        <div className="rank-cell-content">
                          {renderRankBadge(student.rank)}
                        </div>
                      </td>

                      {/* Student Info */}
                      <td className="col-student">
                        <div className="student-profile-cell">
                          <Avatar
                            image={student.avatar}
                            name={student.displayName}
                            size="small"
                            className="leaderboard-student-avatar"
                          />
                          <div className="student-name-stack">
                            <span className="student-display-name">
                              {student.displayName}
                            </span>
                            {isCurrent && (
                              <span className="you-badge-chip">You</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Quiz Marks */}
                      <td className="col-quiz-marks text-right font-mono">
                        <span className="score-pill-plain">
                          {student.quizMarks}
                        </span>
                      </td>

                      {/* Official Assessment Marks */}
                      <td className="col-assessment-marks text-right font-mono">
                        <span className="score-pill-plain">
                          {student.assessmentMarks ?? 0}
                        </span>
                      </td>

                      {/* Total Marks */}
                      <td className="col-total-marks text-right font-mono">
                        <span className="total-score-badge">
                          {student.totalMarks}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── 5. SERVER-SIDE PAGINATION CONTROLS ─── */}
      {pagination.totalLearners > 0 && (
        <div className="leaderboard-pagination-bar">
          <div className="lb-pagination-summary">
            Showing <strong>{startRow}–{endRow}</strong> of <strong>{pagination.totalLearners}</strong> {pagination.totalLearners === 1 ? 'learner' : 'learners'}
          </div>

          <div className="lb-pagination-controls">
            <button
              type="button"
              className="btn-lb-page"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage || loading}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <span className="lb-page-indicator">
              Page <strong>{pagination.currentPage}</strong> of <strong>{pagination.totalPages}</strong>
            </span>

            <button
              type="button"
              className="btn-lb-page"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNextPage || loading}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── 6. FOOTER NOTES ─── */}
      <footer className="course-leaderboard-footer">
        <p className="footer-rules-note">
          * Total Course Score = Official Quiz Marks + Official Assessment Marks. Only the first officially submitted attempt for each quiz and assessment contributes to standings. Ties break by earliest official completion time.
        </p>
      </footer>
    </div>
  );
};

export default CourseLeaderboardView;
