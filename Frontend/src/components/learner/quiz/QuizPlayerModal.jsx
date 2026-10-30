import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Check,
  Clock
} from 'lucide-react';
import './QuizPlayerModal.css';
import { useToast } from '../../../context/ToastContext';

export const QuizPlayerModal = ({
  quizItem,
  moduleTitle = '',
  lessonTitle = '',
  moduleIndex = 0,
  moduleId = '',
  lessonIndex = 0,
  lessonId = '',
  courseId = '',
  courseTitle = '',
  isEnrolled = false,
  isAlreadyPassed = false,
  onClose,
  onQuizPassed = null
}) => {
  const { toast } = useToast();
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [scoreData, setScoreData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!quizItem) return null;

  const quiz = quizItem.quiz || {};
  const questions = quiz.questions || [];
  const passThreshold = quiz.passThresholdPercent || 70;

  // Time Limit Countdown Timer
  const timeLimitVal = quiz.hasTimeLimit
    ? (Number(quiz.timeLimit || quiz.durationMinutes) || 0)
    : 0;
  const [timeLeftSeconds, setTimeLeftSeconds] = React.useState(timeLimitVal > 0 ? timeLimitVal * 60 : null);

  React.useEffect(() => {
    if (!timeLeftSeconds || timeLeftSeconds <= 0 || submitted) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeftSeconds, submitted]);

  const formatTimerDisplay = (seconds) => {
    if (!seconds || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (qIndex, optionIndex) => {
    if (submitted) return; // Prevent changing after submit
    const q = questions[qIndex];
    const isMulti = q?.type === 'multiple_response';

    if (isMulti) {
      setSelectedAnswers(prev => {
        const currentArr = Array.isArray(prev[qIndex]) ? prev[qIndex] : (prev[qIndex] !== undefined ? [prev[qIndex]] : []);
        const nextArr = currentArr.includes(optionIndex)
          ? currentArr.filter(i => i !== optionIndex)
          : [...currentArr, optionIndex];
        return {
          ...prev,
          [qIndex]: nextArr
        };
      });
    } else {
      setSelectedAnswers(prev => ({
        ...prev,
        [qIndex]: optionIndex
      }));
    }
  };

  const handleSubmit = async (autoSubmitDueToTime = false) => {
    if (questions.length === 0) {
      toast.info('This quiz has no questions.');
      onClose();
      return;
    }

    // Check if all questions answered (unless timer expired)
    if (!autoSubmitDueToTime) {
      const answeredCount = Object.keys(selectedAnswers).filter(k => {
        const val = selectedAnswers[k];
        return Array.isArray(val) ? val.length > 0 : val !== undefined;
      }).length;

      if (answeredCount < questions.length) {
        toast.warning(`Please answer all ${questions.length} questions before submitting.`);
        return;
      }
    } else {
      toast.warning('Time limit expired! Submitting answers automatically.');
    }

    setSubmitting(true);

    // Calculate score based on marks for each question
    let earnedMarks = 0;
    let totalMarks = 0;
    let correctCount = 0;

    questions.forEach((q, idx) => {
      const qMarks = Math.max(1, Math.round(Number(q.marks) || 1));
      totalMarks += qMarks;

      const selected = selectedAnswers[idx];
      const isMulti = q.type === 'multiple_response';

      if (isMulti) {
        const correctMulti = Array.isArray(q.correctOptionIndexes) && q.correctOptionIndexes.length > 0
          ? q.correctOptionIndexes.map(Number)
          : [Number(q.correctAnswerIndex ?? 0)];
        const selectedArr = (Array.isArray(selected) ? selected : (selected !== undefined ? [selected] : [])).map(Number);
        
        const sortedCorrect = [...correctMulti].sort((a, b) => a - b).join(',');
        const sortedSelected = [...selectedArr].sort((a, b) => a - b).join(',');

        if (sortedCorrect === sortedSelected) {
          earnedMarks += qMarks;
          correctCount++;
        }
      } else {
        const correctIdx = q.correctAnswerIndex !== undefined ? Number(q.correctAnswerIndex) : 0;
        const isMatch = selected === correctIdx ||
          (q.correctAnswer && String(q.options?.[selected]).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase());

        if (isMatch) {
          earnedMarks += qMarks;
          correctCount++;
        }
      }
    });

    const percent = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 100;
    const passed = percent >= passThreshold;

    setScoreData({
      earnedMarks,
      totalMarks,
      correctCount,
      totalCount: questions.length,
      percentage: percent,
      passed
    });
    setSubmitted(true);
    setSubmitting(false);

    if (passed) {
      toast.success(`🎉 Congratulations! You passed the quiz with ${percent}%!`);

      // Record progress and points on server if enrolled
      if (isEnrolled && courseId) {
        try {
          const token = sessionStorage.getItem('upskillr_token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const targetModuleIndex = (moduleIndex !== undefined && moduleIndex !== null) ? moduleIndex : 0;
          const res = await fetch(`http://localhost:5000/api/courses/${courseId}/modules/${targetModuleIndex}/complete`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              lessonIndex: targetModuleIndex,
              moduleId,
              lessonId,
              quizId: quizItem._id,
              quizTitle: quizItem.title || 'Lesson Quiz',
              scorePercentage: percent
            })
          });
          const resData = await res.json();
          if (resData.success && resData.pointsAwarded > 0) {
            toast.success(`⭐ +${resData.pointsAwarded} Points awarded and added to your activity history!`);
          }
          window.dispatchEvent(new Event('upskillr_points_updated'));
        } catch (e) {
          console.error('Error auto-completing quiz on backend:', e);
        }
      }

      // Notify parent / update progress if enrolled
      if (onQuizPassed) {
        onQuizPassed(quizItem, percent, moduleIndex, lessonIndex);
      }
    } else {
      toast.error(`You scored ${percent}%. Pass mark is ${passThreshold}%. Try again!`);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setScoreData(null);
    if (timeLimitVal > 0) {
      setTimeLeftSeconds(timeLimitVal * 60);
    }
  };

  return (
    <div className="quiz-modal-backdrop" role="dialog" aria-modal="true">
      <div className="quiz-modal-card">
        {/* Modal Header */}
        <div className="quiz-modal-header">
          <div className="quiz-header-title-box">
            <div className="quiz-icon-badge">
              <HelpCircle size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 className="quiz-title">Quiz: {quizItem.title || 'Lesson Quiz'}</h2>
                {timeLeftSeconds !== null && (
                  <span
                    className="quiz-timer-badge"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}
                  >
                    <Clock size={14} />
                    <span>{formatTimerDisplay(timeLeftSeconds)}</span>
                  </span>
                )}
              </div>
              <span className="quiz-submeta">
                {moduleTitle ? `${moduleTitle} • ` : ''}
                {lessonTitle ? `${lessonTitle} • ` : ''}
                {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="quiz-close-btn"
            onClick={onClose}
            aria-label="Close quiz modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="quiz-modal-body">
          {/* Already Passed notification banner */}
          {isAlreadyPassed && !submitted && (
            <div className="quiz-instructions-banner" style={{ background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981' }}>
              <CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
              <strong>Previously Mastered:</strong> You have already passed this quiz. You may review the questions below or retake to practice.
            </div>
          )}

          {/* Instructions banner if available */}
          {quiz.instructions && !submitted && (
            <div className="quiz-instructions-banner">
              <strong>Instructions:</strong> {quiz.instructions}
            </div>
          )}

          {/* Results Screen */}
          {submitted && scoreData && (
            <div className={`quiz-result-summary ${scoreData.passed ? 'passed' : 'failed'}`}>
              <div className="result-icon-circle">
                {scoreData.passed ? <Award size={36} /> : <XCircle size={36} />}
              </div>
              <h3 className="result-headline">
                {scoreData.passed ? 'Quiz Passed Successfully! 🎉' : 'Needs Practice'}
              </h3>
              <p className="result-score-text">
                Your Score: <strong>{scoreData.percentage}%</strong> ({scoreData.earnedMarks ?? scoreData.correctCount} of {scoreData.totalMarks ?? scoreData.totalCount} marks)
              </p>
              <p className="result-desc">
                {scoreData.passed
                  ? isEnrolled
                    ? 'Your quiz progress has been recorded and points have been credited to your learning stats!'
                    : 'Great work! You scored high enough to master this quiz.'
                  : `You scored ${scoreData.percentage}%. Review the explanations below and try again!`}
              </p>

              <div className="result-actions-row">
                {!scoreData.passed && (
                  <button
                    type="button"
                    className="btn btn-outline btn-retake"
                    onClick={handleRetake}
                  >
                    <RotateCcw size={15} />
                    <span>Retake Quiz</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary btn-finish"
                  onClick={onClose}
                >
                  <Check size={16} />
                  <span>{scoreData.passed ? 'Continue Learning' : 'Close'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Questions List */}
          <div className="quiz-questions-container">
            {questions.map((q, qIndex) => {
              const selectedOption = selectedAnswers[qIndex];
              const isMulti = q.type === 'multiple_response';
              const correctIdx = q.correctAnswerIndex !== undefined ? Number(q.correctAnswerIndex) : 0;
              const correctMulti = Array.isArray(q.correctOptionIndexes) && q.correctOptionIndexes.length > 0
                ? q.correctOptionIndexes.map(Number)
                : [correctIdx];

              return (
                <div key={q._id || qIndex} className="quiz-question-block">
                  <div className="question-header-row">
                    <span className="question-num-tag">
                      Question {qIndex + 1} of {questions.length} ({isMulti ? 'Multiple Response' : q.type === 'true_false' ? 'True / False' : 'Multiple Choice'})
                    </span>
                    <span className="question-marks-tag">{q.marks || 1} {q.marks === 1 ? 'mark' : 'marks'}</span>
                  </div>

                  <h3 className="question-text">{q.questionText}</h3>

                  <div className="question-options-list">
                    {(q.options || []).map((opt, oIndex) => {
                      const isSelected = isMulti
                        ? (Array.isArray(selectedOption) && selectedOption.includes(oIndex))
                        : selectedOption === oIndex;

                      let optionClass = 'quiz-option-card';
                      if (isSelected) optionClass += ' selected';

                      const isOptionCorrect = isMulti
                        ? correctMulti.includes(oIndex)
                        : oIndex === correctIdx;

                      if (submitted) {
                        if (isOptionCorrect) {
                          optionClass += ' correct-answer';
                        } else if (isSelected && !isOptionCorrect) {
                          optionClass += ' wrong-answer';
                        }
                      }

                      return (
                        <div
                          key={oIndex}
                          className={optionClass}
                          onClick={() => handleSelectOption(qIndex, oIndex)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="option-radio-circle">
                            {submitted ? (
                              isOptionCorrect ? (
                                <CheckCircle2 size={16} className="text-success" />
                              ) : isSelected ? (
                                <XCircle size={16} className="text-danger" />
                              ) : (
                                <span className="option-letter">{String.fromCharCode(65 + oIndex)}</span>
                              )
                            ) : (
                              isSelected ? (
                                isMulti ? <Check size={14} className="text-success" /> : <div className="radio-dot" />
                              ) : (
                                <span className="option-letter">{String.fromCharCode(65 + oIndex)}</span>
                              )
                            )}
                          </div>
                          <span className="option-text">{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {submitted && (q.explanation || q.evaluationInstructions) && (
                    <div className="question-explanation-box">
                      <strong>Explanation:</strong> {q.explanation || q.evaluationInstructions}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        {!submitted && (
          <div className="quiz-modal-footer">
            <div className="footer-status-text">
              {Object.keys(selectedAnswers).length} of {questions.length} answered
            </div>
            <div className="footer-buttons-group">
              <button
                type="button"
                className="btn btn-outline"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-submit-quiz"
                onClick={handleSubmit}
                disabled={submitting}
              >
                <Sparkles size={16} />
                <span>{submitting ? 'Submitting...' : 'Submit Answers'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
