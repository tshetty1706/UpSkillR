import React from 'react';
import {
  Trophy,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Award,
  Users
} from 'lucide-react';

export const QuizResultsLeaderboardView = ({
  quiz,
  firstAttempt,
  attemptsCount,
  leaderboard = [],
  userRank = null,
  totalParticipants = 0,
  isLoadingLeaderboard = false,
  onStartQuiz,
  onViewQuizInfo,
  isStarting = false
}) => {
  const formatTime = (secs) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  const isPassed = firstAttempt?.gradeResult === 'passed';

  return (
    <div className="quiz-results-layout">
      {/* ─── Top Header & Action Row ─── */}
      <div className="results-top-nav-bar">
        <div className="results-heading-group">
          <h1 className="results-main-title">{quiz?.title || 'Quiz'} — Results</h1>
          <p className="results-subtitle">
            Review your official first-attempt performance and current quiz leaderboard.
          </p>
        </div>

        <div className="results-action-buttons">
          <button
            type="button"
            className="btn-gfg-secondary"
            onClick={onViewQuizInfo}
          >
            <BookOpen size={17} />
            Quiz Instructions
          </button>

          <button
            type="button"
            className="btn-gfg-primary"
            onClick={onStartQuiz}
            disabled={isStarting}
          >
            <RotateCcw size={17} />
            {isStarting ? 'Starting...' : 'Retake Quiz (Practice)'}
          </button>
        </div>
      </div>

      {/* ─── Section A: Official First Attempt Score Hero Card ─── */}
      <div className="official-score-hero-card">
        <div className="score-hero-header">
          <div className="official-badge-tag">
            <Award size={15} />
            Official Score • Attempt 1
          </div>

          <div className={`grade-pill ${isPassed ? 'passed' : 'failed'}`}>
            {isPassed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {isPassed ? 'Passed' : 'Needs Practice'}
          </div>
        </div>

        <div className="score-display-row">
          <div className="big-score-number">
            {firstAttempt?.totalScore ?? 0}
            <span className="big-score-max"> / {firstAttempt?.maxScore ?? quiz?.totalMarks ?? 0} Marks</span>
          </div>
          <div className="big-score-percentage">
            ({firstAttempt?.percentage ?? 0}%)
          </div>
        </div>

        {/* 4-Stat Grid */}
        <div className="score-stat-grid">
          <div className="score-stat-item">
            <span className="stat-label">Correct Answers</span>
            <span className="stat-val correct">
              {firstAttempt?.correctCount ?? 0}
            </span>
          </div>

          <div className="score-stat-item">
            <span className="stat-label">Incorrect Answers</span>
            <span className="stat-val incorrect">
              {firstAttempt?.incorrectCount ?? 0}
            </span>
          </div>

          <div className="score-stat-item">
            <span className="stat-label">Unanswered</span>
            <span className="stat-val">
              {firstAttempt?.unansweredCount ?? 0}
            </span>
          </div>

          <div className="score-stat-item">
            <span className="stat-label">Time Taken</span>
            <span className="stat-val">
              {formatTime(firstAttempt?.timeTakenSeconds)}
            </span>
          </div>
        </div>

        <p className="official-policy-note">
          <strong>Official Scoring Rule:</strong> This result is your permanent official score recorded for course completion and ranking. You have taken <strong>{attemptsCount}</strong> attempt(s) in total.
        </p>
      </div>

      {/* ─── Section B: Quiz Leaderboard ─── */}
      <div className="leaderboard-container-card">
        <div className="leaderboard-header-row">
          <div className="leaderboard-title-group">
            <div className="trophy-icon-wrapper">
              <Trophy size={20} />
            </div>
            <div>
              <h2 className="leaderboard-main-heading">Quiz Leaderboard</h2>
              <p className="leaderboard-subheading">
                Ranked by first-attempt marks; faster completion time breaks ties.
              </p>
            </div>
          </div>

          {userRank && (
            <div className="user-rank-callout">
              <Trophy size={16} />
              <span>Your Rank: #{userRank} of {totalParticipants}</span>
            </div>
          )}
        </div>

        {isLoadingLeaderboard ? (
          <div className="leaderboard-empty-state">
            <Clock className="animate-spin" size={24} />
            <span>Loading leaderboard standings...</span>
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="leaderboard-table-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Rank</th>
                  <th>Student</th>
                  <th>Score</th>
                  <th>Correct</th>
                  <th>Incorrect</th>
                  <th>Time Taken</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => {
                  const medalClass =
                    entry.rank === 1
                      ? 'rank-1'
                      : entry.rank === 2
                      ? 'rank-2'
                      : entry.rank === 3
                      ? 'rank-3'
                      : 'rank-other';

                  return (
                    <tr
                      key={entry.rank}
                      className={entry.isCurrentUser ? 'current-user-row' : ''}
                    >
                      <td>
                        <div className="rank-cell">
                          <span className={`rank-medal ${medalClass}`}>
                            {entry.rank}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="student-info-cell">
                          {entry.avatar ? (
                            <img
                              src={entry.avatar}
                              alt={entry.name}
                              className="student-avatar"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="student-avatar-fallback"
                            style={{ display: entry.avatar ? 'none' : 'flex' }}
                          >
                            {(entry.name || 'S').charAt(0).toUpperCase()}
                          </div>

                          <span className="student-name-text">
                            {entry.name}
                            {entry.isCurrentUser && (
                              <span className="you-badge-chip">You</span>
                            )}
                          </span>
                        </div>
                      </td>

                      <td>
                        <strong>{entry.score}</strong> / {entry.maxScore}
                      </td>

                      <td style={{ color: 'var(--brand-primary, #10b981)', fontWeight: 600 }}>
                        {entry.correctCount ?? '-'}
                      </td>

                      <td style={{ color: '#ef4444' }}>
                        {entry.incorrectCount ?? '-'}
                      </td>

                      <td>
                        {formatTime(entry.timeTakenSeconds)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="leaderboard-empty-state">
            <Users size={32} />
            <p>You are the first to complete this quiz! Your score is leading the board.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizResultsLeaderboardView;
