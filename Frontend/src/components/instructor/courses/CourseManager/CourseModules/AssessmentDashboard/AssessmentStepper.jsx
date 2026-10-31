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
    <nav className="cc-stepper-nav as-stepper-nav" aria-label="Assessment creation progress">
      <div className="cc-stepper-inner">
        <ol className="cc-stepper-list">
          {ASSESSMENT_STEPS.map((step, idx) => {
            const isCompleted = step.num < currentStep;
            const isActive = step.num === currentStep;
            const isClickable = step.num <= maxVisitedStep;

            return (
              <li
                key={step.num}
                className={`cc-stepper-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isClickable ? 'clickable' : ''}`}
              >
                <button
                  type="button"
                  className="cc-stepper-btn"
                  onClick={() => isClickable && onStepClick(step.num)}
                  disabled={!isClickable}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <div className="cc-stepper-circle">
                    {isCompleted ? (
                      <Check size={16} strokeWidth={3} className="cc-stepper-check" />
                    ) : (
                      <span className="cc-stepper-num">{step.num}</span>
                    )}
                  </div>
                  <span className="cc-stepper-label">{step.label}</span>
                </button>

                {idx < ASSESSMENT_STEPS.length - 1 && (
                  <div className={`cc-stepper-connector ${step.num < currentStep ? 'completed' : ''}`} />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};
