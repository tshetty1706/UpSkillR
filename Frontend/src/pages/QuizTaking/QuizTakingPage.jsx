import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  CheckSquare,
  Award,
  Loader2,
  X
} from 'lucide-react';
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
  const [answers, setAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const autoSubmittedRef = useRef(false);

  const getAuthHeader = () => {
    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 1. Fetch Attempt State & Sanitized Questions from Backend
  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch(`http://localhost:5000/api/courses/${courseId}/quizzes/${quizId}/attempt/${attemptId}`, {
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

        // If attempt is already finalized, redirect back to workspace
        if (data.isSubmitted) {
          window.location.href = `/learn/${courseId}`;
          return;
        }

        setQuizData(data.quiz);
        setQuestions(data.quiz?.questions || []);

        // Calculate synchronized remaining time
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

  // 2. Submit Quiz Handler
  const handleSubmitQuiz = useCallback(async (isAutoSubmit = false) => {
    if (isSubmitting || autoSubmittedRef.current) return;

    if (isAutoSubmit) {
      autoSubmittedRef.current = true;
    }

    try {
      setIsSubmitting(true);
      setShowConfirmModal(false);

      const res = await fetch(`http://localhost:5000/api/courses/${courseId}/quizzes/${quizId}/attempt/${attemptId}/submit`, {
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

      // Submission saved! Redirect back to course learning workspace
      window.location.href = `/learn/${courseId}`;
    } catch (err) {
      console.error('handleSubmitQuiz error:', err);
      alert(err.message || 'Submission error. Please try again.');
      setIsSubmitting(false);
      autoSubmittedRef.current = false;
    }
  }, [courseId, quizId, attemptId, answers, isSubmitting]);

  // 3. Countdown Timer Interval
  useEffect(() => {
    if (remainingSeconds === null || isSubmitting) return;

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
  }, [remainingSeconds, isSubmitting, handleSubmitQuiz]);

  // Format timer MM:SS
  const formatTimer = (sec) => {
    if (sec === null || sec === undefined) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
            onClick={() => { window.location.href = `/learn/${courseId}`; }}
          >
            Return to Learning Workspace
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex] || {};
  const currentKey = currentQ._id ? String(currentQ._id) : String(currentIndex);
  const isMulti = currentQ.type === 'multiple_response';
  const selectedAnswer = answers[currentKey];

  // Palette stats
  const answeredCount = Object.keys(answers).length;
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
              Are you sure you want to finalize your submission? Once submitted, your score and answers will be calculated by the server.
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
