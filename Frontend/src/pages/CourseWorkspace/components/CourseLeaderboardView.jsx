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
  HelpCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Avatar } from '../../../components/common/Avatar/Avatar';
import { API_BASE } from '../../../config/api';
import './CourseLeaderboardView.css';

export const CourseLeaderboardView = ({ courseId, courseTitle, user }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);

    const token = sessionStorage.getItem('upskillr_token');
    const authHeaders = {};
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/course-leaderboard`, {
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
  }, [courseId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

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
    totalAttemptedParticipants = 0,
    totalCourseQuizzes = 0,
    leaderboard = [],
    currentUserRank
  } = data || {};

  const displayTitle = titleFromApi || courseTitle || 'Course';

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
            <span className="leaderboard-meta-chip enrolled-chip" title="Total Enrolled Students">
              <Users size={14} />
              <span>{totalEnrolled} {totalEnrolled === 1 ? 'Learner Enrolled' : 'Learners Enrolled'}</span>
            </span>

            <span className="leaderboard-meta-chip quizzes-chip" title="Quizzes Evaluated">
              <Sparkles size={14} />
              <span>{totalCourseQuizzes} {totalCourseQuizzes === 1 ? 'Quiz' : 'Quizzes'}</span>
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
              <span className="assessment-coming-soon-pill">Assessments Coming Soon</span>
            </div>
            <p className="methodology-description">
              Overall standings are calculated by aggregating your <strong>official 1st submitted attempt</strong> for every quiz belonging to this course. Subsequent retakes are recorded for self-study and practice without altering your official score. Assessment scores will contribute to the total score once assessments are implemented.
            </p>
          </div>
        </div>

        {/* ─── 3. CURRENT USER STANDING SUMMARY CARD (IF LOGGED IN) ─── */}
        {currentUserRank && (
          <div className="current-user-standing-banner">
            <div className="user-standing-left">
              <div className="standing-rank-display">
                <span className="standing-rank-label">Your Course Rank</span>
                <div className="standing-rank-value">
                  {renderRankBadge(currentUserRank.rank)}
                  <span className="rank-number-text">#{currentUserRank.rank}</span>
                  <span className="rank-out-of">of {totalEnrolled}</span>
                </div>
              </div>
            </div>

            <div className="user-standing-metrics-grid">
              <div className="standing-metric-cell">
                <span className="metric-cell-label">Quiz Marks</span>
                <span className="metric-cell-val font-mono">{currentUserRank.quizMarks}</span>
              </div>

              <div className="standing-metric-cell">
                <span className="metric-cell-label">Assessment Marks</span>
                <span className="metric-cell-val font-mono text-muted">—</span>
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
            <h3>No Quiz Attempts Recorded Yet</h3>
            <p>
              Leaderboard standings will update dynamically as students complete module quizzes. Take your first quiz to secure the #1 rank!
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
                  <th className="col-assessment-marks text-right">
                    Assessment Marks
                    <span className="th-sub-label">(Coming Soon)</span>
                  </th>
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

                      {/* Student Info (Avatar + Display Name) */}
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

                      {/* Assessment Marks (Future-proofed) */}
                      <td className="col-assessment-marks text-right font-mono">
                        <span className="assessment-placeholder-dash" title="Assessments are not yet configured for this course">
                          —
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

      {/* ─── 5. FOOTER NOTES ─── */}
      <footer className="course-leaderboard-footer">
        <p className="footer-rules-note">
          * Quizzes only count the first submitted attempt toward official marks. Retakes provide practice and do not alter leaderboard points. In the case of equal points, ties are broken by quizzes completed, followed by earliest qualifying submission.
        </p>
      </footer>
    </div>
  );
};

export default CourseLeaderboardView;
