import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  CheckSquare,
  Award,
  Loader2,
  RotateCcw,
  BookOpen,
  Calendar,
  Eye
} from 'lucide-react';
import { API_BASE } from '../../config/api';
import './QuizTakingPage.css';

export const QuizTakingPage = ({
  courseId,
  quizId,
  attemptId,
  user
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizData, setQuizData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => {
    try {
      if (attemptId) {
        const saved = sessionStorage.getItem(`upskillr_quiz_answers_${attemptId}`);
        return saved ? JSON.parse(saved) : {};
      }
    } catch (e) {}
    return {};
  });

  // Preserve in-progress answers across page reloads
  useEffect(() => {
    if (attemptId) {
      try {
        if (Object.keys(answers).length > 0) {
          sessionStorage.setItem(`upskillr_quiz_answers_${attemptId}`, JSON.stringify(answers));
        }
      } catch (e) {}
    }
  }, [answers, attemptId]);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const autoSubmittedRef = useRef(false);

  // Results & Review State
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [reviewQuestions, setReviewQuestions] = useState([]);

  const getAuthHeader = () => {
    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Back to learning workspace preserving context
  const handleBackToWorkspace = useCallback(() => {
    let returnUrl = `/learn/${courseId}`;
    const search = window.location.search;
    if (search) {
      returnUrl += search;
    }
    window.location.href = returnUrl;
  }, [courseId]);

  // 1. Fetch Attempt State & Questions / Results from Backend
  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/courses/${courseId}/quizzes/${quizId}/attempt/${attemptId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          credentials: 'include'
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to retrieve quiz attempt.');
        }

        setQuizData(data.quiz);

        // If attempt is already submitted/graded, load directly into review mode!
        if (data.isSubmitted && data.result) {
          sessionStorage.removeItem(`upskillr_quiz_answers_${attemptId}`);
          setResultData(data.result);
          setReviewQuestions(data.review?.questions || []);
          setIsReviewMode(true);
          return;
        }

        // Active attempt mode
        setQuestions(data.quiz?.questions || []);

        // Calculate remaining seconds
        const startedTime = new Date(data.startedAt).getTime();
        const durationSec = (data.durationMinutes || 10) * 60;
        const now = Date.now();
        const elapsedSec = Math.max(0, Math.floor((now - startedTime) / 1000));
        const rem = Math.max(0, durationSec - elapsedSec);

        setRemainingSeconds(rem);
      } catch (err) {
        console.error('fetchAttempt error:', err);
        setError(err.message || 'Could not load quiz attempt.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttempt();
  }, [courseId, quizId, attemptId]);

  // 2. Submit Quiz Handler (Displays results on SAME page without redirecting)
  const handleSubmitQuiz = useCallback(async (isAutoSubmit = false) => {
    if (isSubmitting || autoSubmittedRef.current) return;

    if (isAutoSubmit) {
      autoSubmittedRef.current = true;
    }

    try {
      setIsSubmitting(true);
      setShowConfirmModal(false);

      const res = await fetch(`${API_BASE}/courses/${courseId}/quizzes/${quizId}/attempt/${attemptId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        credentials: 'include',
        body: JSON.stringify({ answers })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit quiz.');
      }

      // DO NOT REDIRECT! Render results immediately on the same page.
      sessionStorage.removeItem(`upskillr_quiz_answers_${attemptId}`);
      setResultData(data.result);
      setReviewQuestions(data.review?.questions || []);
      setIsReviewMode(true);
      window.dispatchEvent(new Event('upskillr_points_updated'));
      window.dispatchEvent(new Event('upskillr_badge_unlocked'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('handleSubmitQuiz error:', err);
      alert(err.message || 'Submission error. Please try again.');
      setIsSubmitting(false);
      autoSubmittedRef.current = false;
    }
  }, [courseId, quizId, attemptId, answers, isSubmitting]);

  // 3. Retake Quiz Handler (Starts a new practice attempt)
  const handleRetakeQuiz = async () => {
    if (isRetaking) return;
    try {
      setIsRetaking(true);
      const res = await fetch(`${API_BASE}/courses/${courseId}/quizzes/${quizId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to start quiz attempt.');
      }

      // Navigate to the new attempt with search params preserved
      sessionStorage.removeItem(`upskillr_quiz_answers_${attemptId}`);
      const newAttemptId = data.attemptId;
      window.location.href = `/quiz/${courseId}/${quizId}/attempt/${newAttemptId}${window.location.search}`;
    } catch (err) {
      console.error('handleRetakeQuiz error:', err);
      alert(err.message || 'Could not start quiz. Please try again.');
      setIsRetaking(false);
    }
  };

  // 4. Countdown Timer Interval
  useEffect(() => {
    if (isReviewMode || remainingSeconds === null || isSubmitting) return;

    if (remainingSeconds <= 0) {
      if (!autoSubmittedRef.current) {
        handleSubmitQuiz(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isReviewMode, remainingSeconds, isSubmitting, handleSubmitQuiz]);

  const formatTimer = (sec) => {
    if (sec === null || sec === undefined) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDurationText = (sec) => {
    if (!sec && sec !== 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
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

  const getTimerClass = () => {
    if (remainingSeconds === null) return 'normal';
    if (remainingSeconds < 60) return 'danger';
    if (remainingSeconds < 180) return 'warning';
    return 'normal';
  };

  // Option selection handler
  const handleSelectOption = (qKey, optIdx, isMulti) => {
    setAnswers(prev => {
      if (isMulti) {
        const cur = Array.isArray(prev[qKey]) ? [...prev[qKey]] : [];
        if (cur.includes(optIdx)) {
          return { ...prev, [qKey]: cur.filter(x => x !== optIdx) };
        } else {
          return { ...prev, [qKey]: [...cur, optIdx].sort() };
        }
      } else {
        return { ...prev, [qKey]: optIdx };
      }
    });
  };

  const handleClearAnswer = (qKey) => {
    setAnswers(prev => {
      const next = { ...prev };
      delete next[qKey];
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="quiz-taking-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--brand-primary, #10b981)', fontWeight: 600 }}>
          <Loader2 className="animate-spin" size={28} />
          <span>Setting up your secure quiz session...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-taking-page" style={{ alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center', background: 'var(--surface, #111827)', padding: '32px', borderRadius: '12px', border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))' }}>
          <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '8px' }}>Unable to Open Quiz</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '24px' }}>{error}</p>
          <button
            type="button"
            className="btn-gfg-primary"
            onClick={handleBackToWorkspace}
          >
            Return to Learning Workspace
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // VIEW MODE: RESULTS & QUESTION-BY-QUESTION REVIEW
  // ══════════════════════════════════════════════════════════════════
  if (isReviewMode && resultData) {
    const isPassed = resultData.gradeResult === 'passed';
    const isFirst = resultData.isOfficial || resultData.isFirstAttempt || resultData.attemptNumber === 1;

    return (
      <div className="quiz-taking-page review-mode">
        {/* Top Header Bar */}
        <header className="quiz-top-bar review-header">
          <div className="quiz-top-left">
            <button
              type="button"
              className="btn-review-back"
              onClick={handleBackToWorkspace}
              title="Return to course learning workspace"
            >
              <ArrowLeft size={17} />
              <span>Back to Learning Workspace</span>
            </button>
            <div className="quiz-header-divider"></div>
            <div className="quiz-top-meta">
              <h2 className="quiz-top-title">{quizData?.title || 'Quiz'} — Results & Review</h2>
              <p className="quiz-top-subtitle">
                Attempt {resultData.attemptNumber || 1} • {isFirst ? 'Official Score' : 'Practice Attempt'}
              </p>
            </div>
          </div>

          <div className="quiz-top-right">
            <button
              type="button"
              className="btn-review-retake"
              onClick={handleRetakeQuiz}
              disabled={isRetaking}
            >
              <RotateCcw size={16} />
              <span>{isRetaking ? 'Starting...' : 'Retake Quiz (Practice)'}</span>
            </button>
            <button
              type="button"
              className="btn-header-submit"
              onClick={handleBackToWorkspace}
            >
              <ArrowLeft size={16} />
              <span>Back to Workspace</span>
            </button>
          </div>
        </header>

        {/* Scrollable Results & Review Body */}
        <div className="quiz-review-scroll-container">
          <div className="quiz-review-content-wrapper">
            {/* ─── Result Summary Hero Card ─── */}
            <div className="review-summary-hero-card">
              <div className="summary-hero-top-row">
                <div className="summary-title-col">
                  <span className="summary-overline">Quiz Results</span>
                  <h1 className="summary-quiz-title">{quizData?.title || 'Quiz'}</h1>
                </div>

                <div className="summary-badges-col">
                  <span className={`summary-badge-attempt ${isFirst ? 'official' : 'practice'}`}>
                    <Award size={14} />
                    {isFirst ? 'Attempt 1 • Official Score' : `Attempt ${resultData.attemptNumber} • Practice`}
                  </span>
                  <span className={`summary-badge-grade ${isPassed ? 'passed' : 'failed'}`}>
                    {isPassed ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    {isPassed ? 'Passed' : 'Needs Practice'}
                  </span>
                </div>
              </div>

              {/* Large Score Display */}
              <div className="summary-score-hero-display">
                <div className="summary-score-numbers">
                  <span className="score-obtained">{resultData.totalScore ?? 0}</span>
                  <span className="score-max"> / {resultData.maxScore ?? quizData?.totalMarks ?? 0} Marks</span>
                </div>
                <div className="summary-score-percentage">
                  {resultData.percentage ?? 0}%
                </div>
              </div>

              {/* 6-Item Metrics Grid */}
              <div className="summary-metrics-grid">
                <div className="metric-box">
                  <span className="metric-label">Total Questions</span>
                  <span className="metric-value">{resultData.totalQuestions || reviewQuestions.length}</span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">Correct Answers</span>
                  <span className="metric-value correct">{resultData.correctCount ?? 0}</span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">Incorrect Answers</span>
                  <span className="metric-value incorrect">{resultData.incorrectCount ?? 0}</span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">Unanswered</span>
                  <span className="metric-value">{resultData.unansweredCount ?? 0}</span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">Time Taken</span>
                  <span className="metric-value">{formatDurationText(resultData.timeTakenSeconds)}</span>
                </div>

                <div className="metric-box">
                  <span className="metric-label">Submitted On</span>
                  <span className="metric-value date">{formatDate(resultData.submittedAt)}</span>
                </div>
              </div>

              {/* Policy Callout Banner */}
              <div className="summary-policy-banner">
                <AlertCircle size={16} className="policy-banner-icon" />
                <p className="policy-banner-text">
                  <strong>First-Attempt Scoring Rule:</strong> Only your first attempt ({isFirst ? `${resultData.totalScore}/${resultData.maxScore}` : 'Attempt 1'}) serves as your official permanent quiz score for course progress. Subsequent attempts are recorded as practice to help you test and master your skills.
                </p>
              </div>
            </div>

            {/* ─── Question-by-Question Review Section ─── */}
            <div className="review-questions-section">
              <div className="review-section-header">
                <h2 className="review-section-title">Question-by-Question Review</h2>
                <p className="review-section-subtitle">
                  Inspect your submitted answers, see the correct solutions in green, and review instructor explanations.
                </p>
              </div>

              <div className="review-questions-list">
                {reviewQuestions.map((q, idx) => {
                  const isMulti = q.type === 'multiple_response';
                  const isAnswered = Boolean(q.isAnswered);
                  const isCorrect = Boolean(q.isCorrect);

                  // Normalized student answers
                  const studentAns = q.studentAnswer;
                  // Normalized correct answers
                  const correctAns = q.correctAnswer;

                  return (
                    <div
                      key={q.questionId || idx}
                      className={`review-question-card ${
                        isCorrect ? 'card-correct' : !isAnswered ? 'card-unanswered' : 'card-incorrect'
                      }`}
                    >
                      {/* Question Card Header */}
                      <div className="review-card-header">
                        <div className="review-q-number-pill">
                          Question {idx + 1} of {reviewQuestions.length}
                        </div>

                        <div className="review-q-status-chips">
                          {isCorrect ? (
                            <span className="q-status-chip correct">
                              <CheckCircle2 size={15} />
                              Correct (+{q.marksAwarded} Marks)
                            </span>
                          ) : !isAnswered ? (
                            <span className="q-status-chip unanswered">
                              <HelpCircle size={15} />
                              Unanswered (0 / {q.maxMarks || 1} Marks)
                            </span>
                          ) : (
                            <span className="q-status-chip incorrect">
                              <XCircle size={15} />
                              Incorrect (0 / {q.maxMarks || 1} Marks)
                            </span>
                          )}

                          <span className="q-marks-indicator">
                            {q.marksAwarded} / {q.maxMarks || 1} Mark{(q.maxMarks || 1) > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Question Text */}
                      <h3 className="review-q-prompt">
                        {q.questionText}
                      </h3>

                      {/* Options List */}
                      <div className="review-options-list">
                        {(q.options || []).map((opt, optIdx) => {
                          // Check if student selected this option
                          let isSelected = false;
                          if (isMulti) {
                            isSelected = Array.isArray(studentAns) && studentAns.map(Number).includes(optIdx);
                          } else {
                            isSelected = studentAns !== null && studentAns !== undefined && studentAns !== '' && (
                              Number(studentAns) === optIdx ||
                              String(studentAns).trim().toLowerCase() === String(opt).trim().toLowerCase()
                            );
                          }

                          // Check if this option is the correct option
                          let isCorrectOption = false;
                          if (isMulti) {
                            isCorrectOption = Array.isArray(correctAns) && correctAns.map(Number).includes(optIdx);
                          } else {
                            isCorrectOption = correctAns !== null && correctAns !== undefined && correctAns !== '' && (
                              Number(correctAns) === optIdx ||
                              String(correctAns).trim().toLowerCase() === String(opt).trim().toLowerCase()
                            );
                          }

                          // Option card styling class:
                          // - green if correct
                          // - red if learner selected it and it is incorrect
                          // - neutral otherwise
                          let optionClass = 'review-option neutral';
                          if (isCorrectOption) {
                            optionClass = isSelected ? 'review-option correct-selected' : 'review-option correct-unselected';
                          } else if (isSelected && !isCorrectOption) {
                            optionClass = 'review-option incorrect-selected';
                          }

                          return (
                            <div key={optIdx} className={optionClass}>
                              <div className="opt-left-col">
                                <span className="opt-letter-circle">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="opt-text">{opt}</span>
                              </div>

                              <div className="opt-right-indicators">
                                {isCorrectOption && isSelected && (
                                  <span className="opt-pill-badge badge-correct-selected">
                                    <CheckCircle2 size={14} />
                                    Your Answer (Correct)
                                  </span>
                                )}

                                {isCorrectOption && !isSelected && (
                                  <span className="opt-pill-badge badge-correct-solution">
                                    <CheckCircle2 size={14} />
                                    Correct Answer
                                  </span>
                                )}

                                {isSelected && !isCorrectOption && (
                                  <span className="opt-pill-badge badge-incorrect-selected">
                                    <XCircle size={14} />
                                    Your Answer (Incorrect)
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Unanswered Notice if learner skipped */}
                      {!isAnswered && (
                        <div className="review-unanswered-notice">
                          <AlertCircle size={15} />
                          <span>You did not answer this question. The correct answer is highlighted in green above.</span>
                        </div>
                      )}

                      {/* Instructor Explanation Box */}
                      {q.explanation && q.explanation.trim() && (
                        <div className="review-explanation-box">
                          <div className="explanation-header">
                            <BookOpen size={16} className="explanation-icon" />
                            <span className="explanation-title">Instructor Explanation & Notes</span>
                          </div>
                          <p className="explanation-text">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="review-bottom-actions-row">
              <button
                type="button"
                className="btn-gfg-secondary"
                onClick={handleBackToWorkspace}
              >
                <ArrowLeft size={16} />
                Back to Learning Workspace
              </button>

              <button
                type="button"
                className="btn-gfg-primary"
                onClick={handleRetakeQuiz}
                disabled={isRetaking}
              >
                <RotateCcw size={16} />
                {isRetaking ? 'Starting...' : 'Retake Quiz (Practice)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // VIEW MODE: ACTIVE QUIZ TAKING WORKSPACE
  // ══════════════════════════════════════════════════════════════════
  const currentQ = questions[currentIndex] || {};
  const currentKey = currentQ._id ? String(currentQ._id) : String(currentIndex);
  const isMulti = currentQ.type === 'multiple_response';
  const selectedAnswer = answers[currentKey];

  // Palette stats
  const answeredCount = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== null && answers[k] !== '').length;
  const totalQuestions = questions.length;
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);

  return (
    <div className="quiz-taking-page">
      {/* ─── Distraction-Free Top Bar ─── */}
      <header className="quiz-top-bar">
        <div className="quiz-top-left">
          <span className="quiz-brand-logo">UpSkillR</span>
          <div className="quiz-header-divider"></div>
          <div className="quiz-top-meta">
            <h2 className="quiz-top-title">{quizData?.title || 'Quiz Attempt'}</h2>
            <p className="quiz-top-subtitle">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
          </div>
        </div>

        {/* Center: Synchronized Countdown Timer */}
        <div className="quiz-top-center">
          <div className={`quiz-timer-pill ${getTimerClass()}`}>
            <Clock size={16} />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>
        </div>

        {/* Right: Submit Button */}
        <div className="quiz-top-right">
          <button
            type="button"
            className="btn-header-submit"
            onClick={() => setShowConfirmModal(true)}
            disabled={isSubmitting}
          >
            <CheckSquare size={16} />
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        </div>
      </header>

      {/* ─── Main Quiz Workspace ─── */}
      <div className="quiz-body-workspace">
        {/* Main Question Container */}
        <main className="quiz-main-question-area">
          <div className="question-meta-row">
            <span className="question-index-pill">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span className="question-marks-badge">
              <Award size={13} />
              {currentQ.marks || 1} Mark{(currentQ.marks || 1) > 1 ? 's' : ''}
            </span>
          </div>

          <h2 className="question-prompt-heading">
            {currentQ.questionText}
          </h2>

          {/* Options */}
          <div className="question-options-container">
            {(currentQ.options || []).map((opt, optIdx) => {
              const isSelected = isMulti
                ? Array.isArray(selectedAnswer) && selectedAnswer.includes(optIdx)
                : selectedAnswer === optIdx;

              return (
                <button
                  key={optIdx}
                  type="button"
                  className={`quiz-option-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(currentKey, optIdx, isMulti)}
                >
                  <span className="option-badge-circle">
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="option-text-content">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Question Nav Action Bar */}
          <div className="question-nav-action-bar">
            <button
              type="button"
              className="btn-nav-prev"
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              <ArrowLeft size={16} />
              Previous
            </button>

            {selectedAnswer !== undefined && (
              <button
                type="button"
                className="btn-nav-clear"
                onClick={() => handleClearAnswer(currentKey)}
              >
                Clear Choice
              </button>
            )}

            {currentIndex < totalQuestions - 1 ? (
              <button
                type="button"
                className="btn-nav-next"
                onClick={() => setCurrentIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
              >
                Next
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-nav-next"
                onClick={() => setShowConfirmModal(true)}
              >
                Review & Submit
                <CheckSquare size={16} />
              </button>
            )}
          </div>
        </main>

        {/* ─── Question Palette Sidebar ─── */}
        <aside className="quiz-palette-sidebar">
          <h3 className="palette-heading-title">Question Palette</h3>

          <div className="palette-stats-summary">
            <div className="palette-stat-badge">
              <span className="stat-color-dot answered"></span>
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="palette-stat-badge">
              <span className="stat-color-dot unanswered"></span>
              <span>Remaining ({unansweredCount})</span>
            </div>
          </div>

          <div className="palette-grid-buttons">
            {questions.map((q, idx) => {
              const qk = q._id ? String(q._id) : String(idx);
              const isAnswered = answers[qk] !== undefined && answers[qk] !== null && answers[qk] !== '';
              const isCurrent = idx === currentIndex;

              return (
                <button
                  key={idx}
                  type="button"
                  className={`btn-palette-number ${isAnswered ? 'answered' : ''} ${isCurrent ? 'current' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="palette-bottom-action">
            <button
              type="button"
              className="btn-palette-submit-full"
              onClick={() => setShowConfirmModal(true)}
              disabled={isSubmitting}
            >
              <CheckSquare size={17} />
              Finish & Submit Attempt
            </button>
          </div>
        </aside>
      </div>

      {/* ─── Confirmation Modal ─── */}
      {showConfirmModal && (
        <div className="quiz-confirm-backdrop">
          <div className="quiz-confirm-dialog">
            <h3 className="confirm-dialog-title">Submit Quiz Attempt?</h3>
            <p className="confirm-dialog-body">
              Are you sure you want to finalize your submission? Once submitted, your score and answers will be evaluated securely on the backend.
            </p>

            <div className="confirm-stat-row">
              <span>Answered: <strong>{answeredCount}</strong> / {totalQuestions}</span>
              <span>Time Left: <strong>{formatTimer(remainingSeconds)}</strong></span>
            </div>

            <div className="confirm-actions-row">
              <button
                type="button"
                className="btn-confirm-cancel"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Keep Reviewing
              </button>
              <button
                type="button"
                className="btn-confirm-proceed"
                onClick={() => handleSubmitQuiz(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizTakingPage;
