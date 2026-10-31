import React from 'react';
import { Check } from 'lucide-react';

export const ASSESSMENT_STEPS = [
  { num: 1, key: 'modules', label: 'Module Selection' },
  { num: 2, key: 'details', label: 'Assessment Details' },
  { num: 3, key: 'questions', label: 'Questions' },
  { num: 4, key: 'settings', label: 'Assessment Settings' },
  { num: 5, key: 'review', label: 'Review & Publish' }
];

export const AssessmentStepper = ({ currentStep, onStepClick, maxVisitedStep = 1 }) => {
  return (
    <nav className="as-stepper-nav" aria-label="Assessment creation progress">
      <ol className="as-stepper-list">
        {ASSESSMENT_STEPS.map((step, idx) => {
          const isCompleted = step.num < currentStep;
          const isActive = step.num === currentStep;
          const isClickable = step.num <= maxVisitedStep;

          return (
            <React.Fragment key={step.num}>
              <li
                className={`as-stepper-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
              >
                <button
                  type="button"
                  className="as-stepper-btn"
                  onClick={() => isClickable && onStepClick(step.num)}
                  disabled={!isClickable}
                  aria-current={isActive ? 'step' : undefined}
                  title={isClickable ? `Go to Step ${step.num}: ${step.label}` : `Step ${step.num}: ${step.label}`}
                >
                  <div className="as-stepper-circle">
                    {isCompleted ? (
                      <Check size={13} strokeWidth={3} className="as-stepper-check" />
                    ) : (
                      <span className="as-stepper-num">{step.num}</span>
                    )}
                  </div>
                  <span className="as-stepper-label">{step.label}</span>
                </button>
              </li>

              {idx < ASSESSMENT_STEPS.length - 1 && (
                <li
                  className={`as-stepper-connector ${step.num < currentStep ? 'completed' : ''}`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
