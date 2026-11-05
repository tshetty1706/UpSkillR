import React from 'react';
import {
  FileText,
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  RotateCcw,
  BarChart3,
  HelpCircle,
  Bookmark
} from 'lucide-react';

export const QuizInfoView = ({
  quiz,
  hasAttempted,
  attemptsCount,
  firstAttempt,
  onStartQuiz,
  onViewLeaderboard,
  isStarting = false,
  isBookmarked = false,
  onToggleBookmark
}) => {
  const durationMins = quiz?.durationMinutes || 10;
  const totalQuestions = quiz?.totalQuestions || 0;
  const totalMarks = quiz?.totalMarks || totalQuestions;
  const isCalculated = Boolean(quiz?.isCalculatedDuration);

  // Format seconds to mm:ss or mm minutes
  const formatTime = (secs) => {
    if (!secs) return '0 min';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m} min`;
    return `${s} sec`;
  };

  return (
    <div className="gfg-quiz-info-layout">
      {/* ─── Top Action Banner (Status & CTA) ─── */}
      <div className={`gfg-attempt-action-bar ${hasAttempted ? 'attempted' : ''}`}>
        <div className="gfg-action-text">
          {hasAttempted ? (
            <span>You have already attempted this quiz.</span>
          ) : (
            <span>Ready to test your knowledge? Click below to begin your attempt.</span>
          )}
        </div>

        <div className="gfg-action-btn-group">
          {onToggleBookmark && (
            <button
              type="button"
              className={`btn-gfg-secondary ${isBookmarked ? 'is-bookmarked' : ''}`}
              onClick={() => onToggleBookmark()}
              title={isBookmarked ? 'Remove Quiz from Library' : 'Bookmark Quiz'}
              aria-label={isBookmarked ? 'Bookmarked Quiz' : 'Bookmark Quiz'}
            >
              <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
          )}

          {hasAttempted && (
            <button
              type="button"
              className="btn-gfg-secondary"
              onClick={onViewLeaderboard}
            >
              <BarChart3 size={18} />
              View Leaderboard & Results
            </button>
          )}

          <button
            type="button"
            className="btn-gfg-primary"
            onClick={onStartQuiz}
            disabled={isStarting}
          >
            {hasAttempted ? (
              <>
                <RotateCcw size={18} />
                {isStarting ? 'Starting...' : 'Retake Quiz'}
              </>
            ) : (
              <>
                <PlayCircle size={18} />
                {isStarting ? 'Starting...' : 'Start Quiz'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── Main Quiz Information Card (GFG-Inspired) ─── */}
      <div className="gfg-quiz-card">
        {/* Header Section */}
        <div className="gfg-quiz-header">
          <div className="gfg-title-row">
            <h1 className="gfg-quiz-title">{quiz?.title || 'Course Quiz'}</h1>
            <span className="gfg-badge-live">
              <span className="gfg-pulse-dot"></span>
              Available
            </span>
          </div>

          {/* Meta strip with icon pills */}
          <div className="gfg-meta-strip">
            <div className="gfg-meta-item">
              <FileText size={16} />
              <span>{totalQuestions} Questions</span>
            </div>

            <div className="gfg-meta-divider"></div>

            <div className="gfg-meta-item">
              <Award size={16} />
              <span>{totalMarks} Marks</span>
            </div>

            <div className="gfg-meta-divider"></div>

            <div className="gfg-meta-item">
              <Clock size={16} />
              <span>
                {durationMins} Minutes
                {isCalculated && <span className="gfg-calc-label">(Estimated)</span>}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="gfg-quiz-desc-text">
            {quiz?.description && quiz.description.trim() ? (
              quiz.description
            ) : (
              `Get Ready to test your skills with the ${quiz?.title || 'Quiz'}! Putting learners under a focused ${durationMins}-minute duration, this quiz will put your understanding to the test. Packed with a carefully curated selection of questions, completing this quiz will provide you with the confidence to master the concepts. We recommend you review lesson resources before attempting.`
            )}
          </p>

          <p className="gfg-good-luck">
            Good Luck! <br />
            <span className="gfg-team-signoff">Team UpSkillR</span>
          </p>
        </div>

        {/* Instructions for the Quiz */}
        <div className="gfg-section">
          <h2 className="gfg-section-heading">Instructions for the Quiz</h2>
          <ul className="gfg-instructions-list">
            <li>The duration of the quiz is <strong>{durationMins} minutes</strong>.</li>
            <li>There are a total of <strong>{totalQuestions} questions</strong>, with <strong>{totalMarks} maximum marks</strong>.</li>
            <li>For each multiple-choice question, select the appropriate option.</li>
            <li>You can navigate between questions and modify your answers any time during the active attempt.</li>
            <li>Your attempt will be automatically submitted when the countdown timer reaches zero.</li>
            <li>
              <strong>First Attempt Rule:</strong> You can retake the quiz unlimited times for practice. However, <strong>ONLY your FIRST successfully submitted attempt counts toward your official course marks and leaderboard rank</strong>. Subsequent attempts are safely stored in your practice history.
            </li>
            {quiz?.instructions && (
              <li>
                <strong>Instructor Note:</strong> {quiz.instructions}
              </li>
            )}
          </ul>
        </div>

        {/* Quiz Details */}
        <div className="gfg-section">
          <h2 className="gfg-section-heading">Quiz Details</h2>
          <div className="gfg-details-box">
            <p className="gfg-quiz-desc-text">
              Quiz marks will be added to your official course progress after your first submission. You can modify your answers any number of times before submitting during the test.
            </p>
            <div className="gfg-details-pills">
              <div className="gfg-detail-pill">
                <FileText size={16} color="var(--brand-primary, #10b981)" />
                <span>{totalQuestions} Questions</span>
              </div>
              <div className="gfg-detail-pill">
                <CheckCircle2 size={16} color="var(--brand-primary, #10b981)" />
                <span>{totalMarks} Marks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Previous Attempt Summary (If Attempted) */}
        {hasAttempted && firstAttempt && (
          <div className="gfg-prev-attempt-box">
            <div className="gfg-prev-stats-group">
              <span className="gfg-prev-title">Official First Attempt Result</span>
              <span className="gfg-prev-score">
                {firstAttempt.totalScore} / {firstAttempt.maxScore} Marks ({firstAttempt.percentage}%)
              </span>
              <span className="gfg-prev-meta">
                Correct: {firstAttempt.correctCount} • Incorrect: {firstAttempt.incorrectCount} • Time: {formatTime(firstAttempt.timeTakenSeconds)} • Attempts: {attemptsCount}
              </span>
            </div>

            <button
              type="button"
              className="btn-gfg-secondary"
              onClick={onViewLeaderboard}
            >
              <BarChart3 size={16} />
              Open Leaderboard
            </button>
          </div>
        )}

        {/* ─── Static Report An Issue Button ─── */}
        <div className="gfg-report-issue-section">
          <button
            type="button"
            className="btn-report-issue"
            title="Report an Issue"
          >
            <AlertTriangle size={15} />
            Report An Issue
          </button>
          <p className="report-issue-note">
            If you are facing any issue on this page, Please let us know.
          </p>
        </div>
      </div>
    </div>
  );
};

export default QuizInfoView;
