import React from 'react';
import { Check } from 'lucide-react';
import './CourseCreationStepper.css';

export const STEPS = [
  { num: 1, label: 'Basic Information' },
  { num: 2, label: 'Course Thumbnail' },
  { num: 3, label: 'Course Overview' },
  { num: 4, label: 'Review & Create' }
];

export const CourseCreationStepper = ({ currentStep, onStepClick, maxVisitedStep = 1 }) => {
  return (
    <nav className="cc-stepper-nav" aria-label="Course creation progress">
      <div className="cc-stepper-inner">
        <ol className="cc-stepper-list">
          {STEPS.map((step, idx) => {
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

                {idx < STEPS.length - 1 && (
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
