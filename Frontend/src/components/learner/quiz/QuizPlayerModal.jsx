import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Check
} from 'lucide-react';
import './QuizPlayerModal.css';
import { useToast } from '../../../context/ToastContext';

export const QuizPlayerModal = ({
  quizItem,
  moduleTitle = '',
  lessonTitle = '',
  courseId = '',
  isEnrolled = false,
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

  const handleSelectOption = (qIndex, optionIndex) => {
    if (submitted) return; // Prevent changing after submit
    setSelectedAnswers(prev => ({
      ...prev,
      [qIndex]: optionIndex
    }));
  };

  const handleSubmit = async () => {
    if (questions.length === 0) {
      toast.info('This quiz has no questions.');
      onClose();
      return;
    }

    // Check if all questions answered
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < questions.length) {
      toast.warning(`Please answer all ${questions.length} questions before submitting.`);
      return;
    }

    setSubmitting(true);

    // Calculate score
    let correctCount = 0;
    questions.forEach((q, idx) => {
      const selected = selectedAnswers[idx];
      const correctIdx = q.correctAnswerIndex !== undefined
        ? Number(q.correctAnswerIndex)
        : 0;

      // Also check string match fallback
      const isMatch = selected === correctIdx ||
        (q.correctAnswer && String(q.options?.[selected]).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase());

      if (isMatch) {
        correctCount++;
      }
    });

    const percent = Math.round((correctCount / questions.length) * 100);
    const passed = percent >= passThreshold;

    setScoreData({
      correctCount,
      totalCount: questions.length,
      percentage: percent,
      passed
    });
    setSubmitted(true);
    setSubmitting(false);

    if (passed) {
      toast.success(`🎉 Congratulations! You passed the quiz with ${percent}%!`);

      // Notify parent / update progress if enrolled
      if (onQuizPassed) {
        onQuizPassed(quizItem, percent);
      } else if (isEnrolled && courseId) {
        // Record progress on server
        try {
          const token = localStorage.getItem('upskillr_token');
          if (token) {
            await fetch(`http://localhost:5000/api/courses/${courseId}/modules/0/complete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              }
            });
            window.dispatchEvent(new Event('upskillr_points_updated'));
          }
        } catch (e) {
          console.error('Error auto-completing quiz on backend:', e);
        }
      }
    } else {
      toast.error(`You scored ${percent}%. Pass mark is ${passThreshold}%. Try again!`);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setSubmitted(false);
    setScoreData(null);
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
              <h2 className="quiz-title">Quiz: {quizItem.title || 'Lesson Quiz'}</h2>
              <span className="quiz-submeta">
                {moduleTitle ? `${moduleTitle} • ` : ''}
                {lessonTitle ? `${lessonTitle} • ` : ''}
                {questions.length} {questions.length === 1 ? 'Question' : 'Questions'} • Pass mark: {passThreshold}%
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
                Your Score: <strong>{scoreData.percentage}%</strong> ({scoreData.correctCount} of {scoreData.totalCount} correct)
              </p>
              <p className="result-desc">
                {scoreData.passed
                  ? isEnrolled
                    ? 'Your quiz progress has been recorded and points have been credited to your learning stats!'
                    : 'Great work! You scored high enough to master this quiz.'
                  : `You need at least ${passThreshold}% to pass this quiz. You can review the questions below and retake it.`}
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
              const correctIdx = q.correctAnswerIndex !== undefined ? Number(q.correctAnswerIndex) : 0;
              const isCorrectAnswer = selectedOption === correctIdx;

              return (
                <div key={q._id || qIndex} className="quiz-question-block">
                  <div className="question-header-row">
                    <span className="question-num-tag">Question {qIndex + 1} of {questions.length}</span>
                    <span className="question-marks-tag">{q.marks || 1} mark</span>
                  </div>

                  <h3 className="question-text">{q.questionText}</h3>

                  <div className="question-options-list">
                    {(q.options || []).map((opt, oIndex) => {
                      const isSelected = selectedOption === oIndex;
                      let optionClass = 'quiz-option-card';
                      if (isSelected) optionClass += ' selected';

                      if (submitted) {
                        if (oIndex === correctIdx) {
                          optionClass += ' correct-answer';
                        } else if (isSelected && !isCorrectAnswer) {
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
                              oIndex === correctIdx ? (
                                <CheckCircle2 size={16} className="text-success" />
                              ) : isSelected ? (
                                <XCircle size={16} className="text-danger" />
                              ) : (
                                <span className="option-letter">{String.fromCharCode(65 + oIndex)}</span>
                              )
                            ) : (
                              isSelected ? <div className="radio-dot" /> : <span className="option-letter">{String.fromCharCode(65 + oIndex)}</span>
                            )}
                          </div>
                          <span className="option-text">{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {submitted && q.evaluationInstructions && (
                    <div className="question-explanation-box">
                      <strong>Explanation:</strong> {q.evaluationInstructions}
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
