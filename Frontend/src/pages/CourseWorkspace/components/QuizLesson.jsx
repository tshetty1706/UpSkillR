import React from 'react';
import { HelpCircle, Award, CheckCircle2 } from 'lucide-react';
import { EmptyContentState } from './EmptyContentState.jsx';

export const QuizLesson = ({
  lesson,
  contentItem,
  quizAnswers = {},
  onAnswerSelect,
  onSubmit,
  quizSubmitted = false,
  quizScoreData = null,
  onRetry
}) => {
  const quizObj = contentItem?.quiz || {};
  const questions = Array.isArray(quizObj.questions) ? quizObj.questions : [];
  const hasQuestions = questions.length > 0;
  const passThreshold = quizObj.passThresholdPercent || 70;

  return (
    <div className="content-type-quiz-view">
      <div className="quiz-view-header">
        <span className="quiz-badge">Interactive Lesson Check</span>
        <h2 className="lesson-heading-title">{contentItem?.title || lesson?.title}</h2>
        <p className="quiz-instructions">
          {quizObj.instructions ||
            'Answer all questions correctly to verify comprehension and complete this lesson.'}
        </p>
      </div>

      {hasQuestions ? (
        <div className="quiz-questions-flow">
          {questions.map((q, qIdx) => {
            const isMulti = q.type === 'multiple_response';
            const selected = quizAnswers[qIdx];

            return (
              <div key={q._id || qIdx} className="quiz-question-card">
                <div className="question-q-number">
                  Question {qIdx + 1} of {questions.length}
                  {q.marks && ` • ${q.marks} Mark${q.marks > 1 ? 's' : ''}`}
                </div>
                <h3 className="question-prompt-text">{q.questionText}</h3>

                <div className="quiz-options-list">
                  {(q.options || []).map((opt, optIdx) => {
                    const isSelected = isMulti
                      ? Array.isArray(selected) && selected.includes(optIdx)
                      : selected === optIdx;

                    let optionStateClass = '';
                    if (quizSubmitted) {
                      const isCorrectOpt = isMulti
                        ? q.correctOptionIndexes?.includes(optIdx)
                        : Number(q.correctAnswerIndex ?? 0) === optIdx;

                      if (isCorrectOpt) optionStateClass = 'correct-highlight';
                      else if (isSelected && !isCorrectOpt) optionStateClass = 'incorrect-highlight';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        className={`quiz-option-button ${isSelected ? 'selected' : ''} ${optionStateClass}`}
                        onClick={() => onAnswerSelect(qIdx, optIdx, isMulti)}
                        disabled={quizSubmitted}
                      >
                        <span className="option-letter-badge">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="option-text-label">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation shown after submission */}
                {quizSubmitted && q.explanation && (
                  <div className="quiz-explanation-callout">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {/* Quiz Action Row */}
          {!quizSubmitted ? (
            <div className="quiz-submit-action-row">
              <button
                type="button"
                className="btn-submit-quiz-primary"
                onClick={() => onSubmit(questions, passThreshold)}
              >
                Submit Answers
              </button>
            </div>
          ) : (
            <div className={`quiz-score-banner ${quizScoreData?.passed ? 'passed' : 'failed'}`}>
              <div className="score-summary-text">
                <strong>
                  {quizScoreData?.passed
                    ? '🎉 Congratulations! You Passed!'
                    : '⚠️ Minimum Passing Score Not Met'}
                </strong>
                <span>
                  Score: {quizScoreData?.percentage}% ({quizScoreData?.correctCount}/{quizScoreData?.totalCount} questions correct) • Minimum required: {passThreshold}%
                </span>
              </div>
              {!quizScoreData?.passed && (
                <button type="button" className="btn-retry-quiz" onClick={onRetry}>
                  Retry Quiz
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <EmptyContentState
          type="quiz"
          title="No Questions Configured"
          message="This assessment has not been configured yet. Questions will be added by the instructor."
        />
      )}
    </div>
  );
};

export default QuizLesson;
