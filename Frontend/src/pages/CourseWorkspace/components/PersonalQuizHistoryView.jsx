import React from 'react';
import {
  Award,
  RotateCcw,
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Eye,
  Calendar,
  AlertCircle,
  Bookmark
} from 'lucide-react';

export const PersonalQuizHistoryView = ({
  quiz,
  firstAttempt,
  attempts = [],
  attemptsCount = 0,
  onStartQuiz,
  onViewQuizInfo,
  onReviewAttempt,
  isStarting = false,
  isBookmarked = false,
  onToggleBookmark
}) => {
  const formatTime = (secs) => {
    if (!secs && secs !== 0) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  // Sort attempts by attemptNumber ascending (1, 2, 3...)
  const sortedAttempts = [...attempts].sort((a, b) => {
    return (a.attemptNumber || 0) - (b.attemptNumber || 0);
  });

  const officialScore = firstAttempt || sortedAttempts[0] || null;
  const isPassed = officialScore?.gradeResult === 'passed';

  return (
    <div className="personal-quiz-history-layout">
      {/* ─── Top Header & Action Row ─── */}
      <div className="results-top-nav-bar">
        <div className="results-heading-group">
          <h1 className="results-main-title">{quiz?.title || 'Quiz'} — My Attempts</h1>
          <p className="results-subtitle">
            Personal knowledge check history. Attempt 1 is your permanent official score.
          </p>
        </div>

        <div className="results-action-buttons">
          {onToggleBookmark && (
            <button
              type="button"
              className={`btn-gfg-secondary ${isBookmarked ? 'is-bookmarked' : ''}`}
              onClick={() => onToggleBookmark()}
              title={isBookmarked ? 'Remove Quiz from Library' : 'Bookmark Quiz'}
              aria-label={isBookmarked ? 'Bookmarked Quiz' : 'Bookmark Quiz'}
            >
              <Bookmark size={17} fill={isBookmarked ? 'currentColor' : 'none'} />
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
          )}

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
            {isStarting ? 'Starting...' : attempts.length > 0 ? 'Retake Quiz (Practice)' : 'Start Quiz'}
          </button>
        </div>
      </div>

      {/* ─── Official First-Attempt Score Hero Card ─── */}
      {officialScore && (
        <div className="official-score-hero-card">
          <div className="score-hero-header">
            <div className="official-badge-tag">
              <Award size={15} />
              Official Score • Attempt 1
            </div>

            <div className={`grade-pill ${isPassed ? 'passed' : 'failed'}`}>
              {isPassed ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {isPassed ? 'Passed' : 'Needs Practice'}
            </div>
          </div>

          <div className="score-display-row">
            <div className="big-score-number">
              {officialScore.totalScore ?? 0}
              <span className="big-score-max"> / {officialScore.maxScore ?? quiz?.totalMarks ?? 0} Marks</span>
            </div>
            <div className="big-score-percentage">
              ({officialScore.percentage ?? 0}%)
            </div>
          </div>

          {/* 4-Stat Grid */}
          <div className="score-stat-grid">
            <div className="score-stat-item">
              <span className="stat-label">Correct Answers</span>
              <span className="stat-val correct">
                {officialScore.correctCount ?? 0}
              </span>
            </div>

            <div className="score-stat-item">
              <span className="stat-label">Incorrect Answers</span>
              <span className="stat-val incorrect">
                {officialScore.incorrectCount ?? 0}
              </span>
            </div>

            <div className="score-stat-item">
              <span className="stat-label">Unanswered</span>
              <span className="stat-val">
                {officialScore.unansweredCount ?? 0}
              </span>
            </div>

            <div className="score-stat-item">
              <span className="stat-label">Time Taken</span>
              <span className="stat-val">
                {formatTime(officialScore.timeTakenSeconds)}
              </span>
            </div>
          </div>

          <div className="official-policy-callout">
            <AlertCircle size={16} className="callout-icon" />
            <p className="callout-text">
              <strong>First-Attempt Scoring Rule:</strong> This score from Attempt 1 is your permanent official score recorded for your course progress. You have completed <strong>{sortedAttempts.length}</strong> attempt(s) in total. Subsequent attempts are saved as practice attempts to help you master the material.
            </p>
          </div>
        </div>
      )}

      {/* ─── My Quiz Attempts Table Card ─── */}
      <div className="personal-history-card">
        <div className="personal-history-header">
          <div className="history-title-group">
            <h2 className="personal-history-title">My Quiz Attempts</h2>
            <p className="personal-history-subtitle">
              Review each of your individual attempts and inspect your answers.
            </p>
          </div>
        </div>

        {sortedAttempts.length > 0 ? (
          <div className="attempts-table-wrapper">
            <table className="attempts-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Attempt</th>
                  <th>Marks</th>
                  <th>Correct</th>
                  <th>Incorrect</th>
                  <th>Time Taken</th>
                  <th>Date & Time</th>
                  <th style={{ textAlign: 'right', width: '140px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedAttempts.map((att) => {
                  const isFirst = att.attemptNumber === 1 || att.isOfficial || att.isFirstAttempt;
                  const attPassed = att.gradeResult === 'passed';

                  return (
                    <tr
                      key={att.attemptId || att.attemptNumber}
                      className={isFirst ? 'official-attempt-row' : ''}
                    >
                      <td>
                        <div className="attempt-badge-wrapper">
                          <span className="attempt-num-text">Attempt {att.attemptNumber}</span>
                          {isFirst ? (
                            <span className="attempt-status-pill official" title="Permanent official score">
                              Official
                            </span>
                          ) : (
                            <span className="attempt-status-pill practice" title="Practice attempt">
                              Practice
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="attempt-marks-cell">
                          <strong>{att.totalScore}</strong> / {att.maxScore}
                          <span className="attempt-percentage">({att.percentage}%)</span>
                          <span className={`inline-grade-pill ${attPassed ? 'passed' : 'failed'}`}>
                            {attPassed ? 'Pass' : 'Practice'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="stat-num-correct">{att.correctCount ?? 0}</span>
                      </td>

                      <td>
                        <span className="stat-num-incorrect">{att.incorrectCount ?? 0}</span>
                      </td>

                      <td>
                        <span className="stat-num-time">{formatTime(att.timeTakenSeconds)}</span>
                      </td>

                      <td>
                        <span className="stat-num-date">{formatDate(att.submittedAt)}</span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn-review-attempt"
                          onClick={() => onReviewAttempt(att.attemptId)}
                          title="Open detailed question-by-question review"
                        >
                          <Eye size={15} />
                          Review Result
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="attempts-empty-state">
            <HelpCircle size={44} className="empty-state-icon" />
            <h3 className="empty-state-title">No Attempts Yet</h3>
            <p className="empty-state-desc">
              You haven't attempted this quiz yet. Start your first attempt to see your results here.
            </p>
            <button
              type="button"
              className="btn-gfg-primary"
              onClick={onStartQuiz}
              disabled={isStarting}
              style={{ marginTop: '12px' }}
            >
              {isStarting ? 'Starting...' : 'Start Your First Attempt'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalQuizHistoryView;
