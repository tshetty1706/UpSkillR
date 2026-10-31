import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Clock,
  Award,
  Layers,
  HelpCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  Search,
  Shuffle,
  Eye,
  FileText,
  Sparkles,
  BookOpen,
  CheckCircle2,
  X
} from 'lucide-react';
import { AssessmentStepper, ASSESSMENT_STEPS } from './AssessmentStepper';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice (Single Answer)', shortBadge: 'MCQ' },
  { value: 'multiple_response', label: 'Multiple Response', shortBadge: 'MR' },
  { value: 'true_false', label: 'True or False', shortBadge: 'T/F' }
];

export const AssessmentCreationWizard = ({
  courseId,
  modules = [],
  initialAssessment = null,
  onCancel,
  onSaveSuccess,
  apiBase = 'http://localhost:5000/api',
  getAuthHeader = () => ({}),
  toast
}) => {
  const isEditing = Boolean(initialAssessment?._id);

  // Stepper state: 0 for Introduction (new only), 1 to 5 for wizard steps
  const [currentStep, setCurrentStep] = useState(() => (isEditing ? 1 : 0));
  const [maxVisitedStep, setMaxVisitedStep] = useState(() => (isEditing ? 5 : 1));

  // ── Step 1: Module Selection State ──
  const [selectedModuleIds, setSelectedModuleIds] = useState(() => {
    if (initialAssessment?.requiredModuleIds && Array.isArray(initialAssessment.requiredModuleIds)) {
      return initialAssessment.requiredModuleIds.map(id => String(id?._id || id));
    }
    return [];
  });

  // ── Step 2: Assessment Details State ──
  const [title, setTitle] = useState(() => initialAssessment?.title || '');
  const [description, setDescription] = useState(() => initialAssessment?.description || '');

  // ── Step 3: Question Creation State ──
  const defaultInitialQuestion = {
    _id: 'q_1',
    questionText: 'Which React hook is used for managing component local state?',
    type: 'mcq',
    options: ['useState()', 'useEffect()', 'useContext()', 'useMemo()'],
    optionImages: ['', '', '', ''],
    correctAnswerIndex: 0,
    correctOptionIndexes: [0],
    marks: 2,
    explanation: 'useState() is the primary hook in React for local state management.'
  };

  const [questions, setQuestions] = useState(() => {
    if (initialAssessment?.questions && Array.isArray(initialAssessment.questions) && initialAssessment.questions.length > 0) {
      return initialAssessment.questions.map((q, idx) => {
        let cleanType = (q.type || 'mcq').toLowerCase();
        if (cleanType === 'multiple_choice') cleanType = 'mcq';
        if (!['mcq', 'multiple_response', 'true_false'].includes(cleanType)) cleanType = 'mcq';

        let options = [];
        if (Array.isArray(q.options) && q.options.length > 0) {
          options = q.options.map(opt => (typeof opt === 'object' && opt !== null ? String(opt.text || '') : String(opt || '')));
        } else {
          options = cleanType === 'true_false' ? ['True', 'False'] : ['Option A', 'Option B'];
        }

        let correctIdx = Number(q.correctAnswerIndex);
        if (isNaN(correctIdx) || correctIdx < 0 || correctIdx >= options.length) correctIdx = 0;

        let correctMulti = Array.isArray(q.correctOptionIndexes) && q.correctOptionIndexes.length > 0
          ? q.correctOptionIndexes.map(Number)
          : [correctIdx];

        return {
          _id: q._id || `q_${idx + 1}`,
          questionText: q.questionText || '',
          type: cleanType,
          options,
          optionImages: Array.isArray(q.optionImages) ? q.optionImages : options.map(() => ''),
          correctAnswerIndex: correctIdx,
          correctOptionIndexes: correctMulti,
          marks: Math.max(1, Math.round(Number(q.marks) || Number(q.points) || 1)),
          explanation: q.explanation || ''
        };
      });
    }
    return [defaultInitialQuestion];
  });

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');

  // ── Step 4: Assessment Settings State ──
  const [timeLimit, setTimeLimit] = useState(() => {
    const raw = initialAssessment?.timeLimit || initialAssessment?.durationMinutes;
    return Number(raw) > 0 ? Number(raw) : 45; // Default recommended: 45 minutes
  });
  const [shuffleQuestions, setShuffleQuestions] = useState(() => Boolean(initialAssessment?.shuffleQuestions));
  const [shuffleOptions, setShuffleOptions] = useState(() => Boolean(initialAssessment?.shuffleOptions));
  const [resultVisibility, setResultVisibility] = useState(() => initialAssessment?.resultVisibility || 'immediate');
  const [instructions, setInstructions] = useState(() => initialAssessment?.instructions || '');

  // ── Step 5: Submission & Saving ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  // Track active question
  const currentQuestion = questions[activeQuestionIndex] || questions[0] || defaultInitialQuestion;

  // Live Auto-Calculations
  const totalQuestions = questions.length;
  const totalMarks = useMemo(() => {
    return questions.reduce((acc, q) => acc + (Number(q.marks) || 1), 0);
  }, [questions]);
  const avgMarksPerQuestion = totalQuestions > 0 ? (totalMarks / totalQuestions).toFixed(1) : 0;

  // Mark dirty
  const markDirty = () => setHasUnsavedChanges(true);

  // Step 1: Module Selection Handlers
  const toggleModuleSelection = (moduleId) => {
    markDirty();
    setSelectedModuleIds(prev => {
      const exists = prev.includes(moduleId);
      return exists ? prev.filter(id => id !== moduleId) : [...prev, moduleId];
    });
  };

  const selectAllModules = () => {
    markDirty();
    setSelectedModuleIds(modules.map(m => String(m._id)));
  };

  const clearAllModules = () => {
    markDirty();
    setSelectedModuleIds([]);
  };

  // Step 3: Question Creation Handlers
  const handleAddQuestion = () => {
    markDirty();
    const newQ = {
      _id: `q_${Date.now()}`,
      questionText: '',
      type: 'mcq',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      optionImages: ['', '', '', ''],
      correctAnswerIndex: 0,
      correctOptionIndexes: [0],
      marks: 2,
      explanation: ''
    };
    setQuestions(prev => [...prev, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleUpdateCurrentQuestion = (field, value) => {
    markDirty();
    setQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[activeQuestionIndex] };

      if (field === 'type') {
        const nextType = value;
        q.type = nextType;
        if (nextType === 'true_false') {
          q.options = ['True', 'False'];
          q.optionImages = ['', ''];
          q.correctAnswerIndex = 0;
          q.correctOptionIndexes = [0];
        } else if (q.options.length < 2) {
          q.options = ['Option A', 'Option B'];
          q.optionImages = ['', ''];
        }
      } else {
        q[field] = value;
      }

      updated[activeQuestionIndex] = q;
      return updated;
    });
  };

  const handleOptionTextChange = (optIdx, text) => {
    markDirty();
    setQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[activeQuestionIndex] };
      const newOpts = [...q.options];
      newOpts[optIdx] = text;
      q.options = newOpts;
      updated[activeQuestionIndex] = q;
      return updated;
    });
  };

  const handleSetCorrectAnswer = (optIdx) => {
    markDirty();
    setQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[activeQuestionIndex] };
      if (q.type === 'multiple_response') {
        const cur = Array.isArray(q.correctOptionIndexes) ? [...q.correctOptionIndexes] : [];
        const pos = cur.indexOf(optIdx);
        if (pos > -1) {
          if (cur.length > 1) cur.splice(pos, 1);
        } else {
          cur.push(optIdx);
        }
        q.correctOptionIndexes = cur;
        q.correctAnswerIndex = cur[0] || 0;
      } else {
        q.correctAnswerIndex = optIdx;
        q.correctOptionIndexes = [optIdx];
      }
      updated[activeQuestionIndex] = q;
      return updated;
    });
  };

  const handleAddOption = () => {
    markDirty();
    setQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[activeQuestionIndex] };
      if (q.options.length >= 6) return prev;
      q.options = [...q.options, `Option ${q.options.length + 1}`];
      q.optionImages = [...(q.optionImages || []), ''];
      updated[activeQuestionIndex] = q;
      return updated;
    });
  };

  const handleRemoveOption = (optIdx) => {
    markDirty();
    setQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[activeQuestionIndex] };
      if (q.options.length <= 2) return prev;
      const newOpts = q.options.filter((_, i) => i !== optIdx);
      const newImgs = (q.optionImages || []).filter((_, i) => i !== optIdx);
      q.options = newOpts;
      q.optionImages = newImgs;

      if (q.correctAnswerIndex >= newOpts.length) {
        q.correctAnswerIndex = 0;
      }
      q.correctOptionIndexes = (q.correctOptionIndexes || [])
        .filter(i => i !== optIdx)
        .map(i => (i > optIdx ? i - 1 : i));
      if (q.correctOptionIndexes.length === 0) {
        q.correctOptionIndexes = [0];
      }

      updated[activeQuestionIndex] = q;
      return updated;
    });
  };

  const handleDeleteQuestion = (delIdx, e) => {
    if (e) e.stopPropagation();
    if (questions.length <= 1) {
      toast?.error?.('An assessment must have at least one question.');
      return;
    }
    markDirty();
    setQuestions(prev => prev.filter((_, i) => i !== delIdx));
    if (activeQuestionIndex >= delIdx) {
      setActiveQuestionIndex(Math.max(0, activeQuestionIndex - 1));
    }
  };

  const handleMoveQuestion = (idx, direction, e) => {
    if (e) e.stopPropagation();
    markDirty();
    setQuestions(prev => {
      const updated = [...prev];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= updated.length) return prev;
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
    if (activeQuestionIndex === idx) {
      setActiveQuestionIndex(direction === 'up' ? idx - 1 : idx + 1);
    }
  };

  // Step Validation logic
  const validateCurrentStep = (stepNum) => {
    if (stepNum === 1) {
      // Module selection is optional if course has 0 modules, but if course has modules, warn if none selected
      return true;
    }
    if (stepNum === 2) {
      if (!title.trim()) {
        toast?.error?.('Please enter an Assessment Title.');
        return false;
      }
      return true;
    }
    if (stepNum === 3) {
      if (questions.length === 0) {
        toast?.error?.('Please add at least one question.');
        return false;
      }
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.questionText.trim()) {
          toast?.error?.(`Question ${i + 1} prompt cannot be empty.`);
          setActiveQuestionIndex(i);
          return false;
        }
        if (q.type !== 'true_false' && (!q.options || q.options.length < 2)) {
          toast?.error?.(`Question ${i + 1} must have at least 2 options.`);
          setActiveQuestionIndex(i);
          return false;
        }
        if (Number(q.marks) <= 0) {
          toast?.error?.(`Question ${i + 1} must have a positive marks value.`);
          setActiveQuestionIndex(i);
          return false;
        }
      }
      return true;
    }
    if (stepNum === 4) {
      if (!timeLimit || Number(timeLimit) < 5) {
        toast?.error?.('Please specify a valid time limit of at least 5 minutes.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateCurrentStep(currentStep)) return;
    const next = currentStep + 1;
    setCurrentStep(next);
    setMaxVisitedStep(prev => Math.max(prev, next));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleStepClick = (stepNum) => {
    if (stepNum <= maxVisitedStep) {
      if (validateCurrentStep(currentStep)) {
        setCurrentStep(stepNum);
      }
    }
  };

  // Save to Backend (Draft or Published)
  const handleSaveAssessment = async (targetState = 'draft') => {
    if (!title.trim()) {
      toast?.error?.('Assessment Title is required.');
      setCurrentStep(2);
      return;
    }

    if (questions.length === 0) {
      toast?.error?.('Please create at least one question.');
      setCurrentStep(3);
      return;
    }

    // Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        toast?.error?.(`Question ${i + 1} prompt cannot be empty.`);
        setCurrentStep(3);
        setActiveQuestionIndex(i);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        assessmentType: 'graded',
        timeLimit: Number(timeLimit) || 45,
        durationMinutes: Number(timeLimit) || 45,
        requiredModuleIds: selectedModuleIds,
        requiresModules: selectedModuleIds,
        shuffleQuestions: Boolean(shuffleQuestions),
        shuffleOptions: Boolean(shuffleOptions),
        resultVisibility,
        state: targetState,
        questions: questions.map((q, idx) => ({
          questionText: q.questionText.trim(),
          type: q.type,
          options: q.options,
          optionImages: q.optionImages || [],
          correctAnswerIndex: q.correctAnswerIndex,
          correctOptionIndexes: q.correctOptionIndexes,
          marks: Number(q.marks) || 1,
          explanation: (q.explanation || '').trim(),
          order: idx + 1
        }))
      };

      let url;
      let method;

      if (isEditing) {
        url = `${apiBase}/courses/${courseId}/curriculum/assessments/${initialAssessment._id}`;
        method = 'PATCH';
      } else {
        url = `${apiBase}/courses/${courseId}/curriculum/assessments`;
        method = 'POST';
      }

      const res = await fetch(url, {
        method,
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setHasUnsavedChanges(false);
        toast?.success?.(
          targetState === 'published'
            ? 'Assessment published successfully!'
            : 'Assessment saved as draft.'
        );
        if (onSaveSuccess) {
          onSaveSuccess(data.assessment || payload);
        }
      } else {
        toast?.error?.(data.message || 'Failed to save assessment.');
      }
    } catch (err) {
      console.error('Save assessment error:', err);
      toast?.error?.('Network error saving assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExitClick = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirmModal(true);
    } else {
      onCancel();
    }
  };

  // Filtered questions in Step 3 left panel
  const filteredQuestions = useMemo(() => {
    if (!questionSearchQuery.trim()) return questions.map((q, i) => ({ ...q, originalIndex: i }));
    const qLower = questionSearchQuery.toLowerCase();
    return questions
      .map((q, i) => ({ ...q, originalIndex: i }))
      .filter(q => (q.questionText || '').toLowerCase().includes(qLower));
  }, [questions, questionSearchQuery]);

  return (
    <div className="as-wizard-root">
      {/* ── Top Wizard Navigation Bar ── */}
      <header className="as-wizard-topbar">
        <div className="as-wizard-topbar-left">
          <button
            type="button"
            className="btn-as-wizard-back"
            onClick={handleExitClick}
            title="Return to Assessment Dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="as-wizard-title-badge">
            {isEditing ? `Edit Assessment: ${title || 'Milestone'}` : 'New Assessment'}
          </div>
        </div>

        <div className="as-wizard-topbar-right">
          {currentStep > 0 && (
            <button
              type="button"
              className="btn-as-action btn-as-action-secondary"
              onClick={() => handleSaveAssessment('draft')}
              disabled={isSubmitting}
            >
              <FileText size={14} />
              <span>Save Draft</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Progress Stepper Bar (Only when past Intro Step) ── */}
      {currentStep > 0 && (
        <div className="as-wizard-stepper-wrap">
          <AssessmentStepper
            currentStep={currentStep}
            onStepClick={handleStepClick}
            maxVisitedStep={maxVisitedStep}
          />
        </div>
      )}

      {/* ── Wizard Main Body ── */}
      <main className="as-wizard-body">
        {/* ══════════════════════════════════════════════════════════════════
            STEP 0: INITIAL INTRODUCTION SCREEN
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 0 && (
          <div className="as-intro-card">
            <div className="as-intro-header-icon">
              <Award size={30} />
            </div>

            <div className="as-intro-text-block">
              <h2 className="as-intro-heading">Create a Comprehensive Assessment</h2>
              <p className="as-intro-lead">
                Create an assessment that evaluates learners' understanding of the selected course modules.
              </p>
            </div>

            <div className="as-duration-badge">
              <Clock size={16} />
              <span>Recommended duration: 45–60 minutes</span>
            </div>

            <ul className="as-intro-guidance-list">
              <li className="as-intro-guidance-item">
                <div className="as-guidance-bullet-check">
                  <Check size={12} strokeWidth={3} />
                </div>
                <span>Recommended duration: 45–60 minutes.</span>
              </li>
              <li className="as-intro-guidance-item">
                <div className="as-guidance-bullet-check">
                  <Check size={12} strokeWidth={3} />
                </div>
                <span>Select the modules that learners must complete before accessing this assessment.</span>
              </li>
              <li className="as-intro-guidance-item">
                <div className="as-guidance-bullet-check">
                  <Check size={12} strokeWidth={3} />
                </div>
                <span>Create questions covering the selected modules.</span>
              </li>
              <li className="as-intro-guidance-item">
                <div className="as-guidance-bullet-check">
                  <Check size={12} strokeWidth={3} />
                </div>
                <span>Assign marks to individual questions.</span>
              </li>
              <li className="as-intro-guidance-item">
                <div className="as-guidance-bullet-check">
                  <Check size={12} strokeWidth={3} />
                </div>
                <span>Configure assessment duration and other assessment settings.</span>
              </li>
            </ul>

            <button
              type="button"
              className="btn-as-start-wizard"
              onClick={() => {
                setCurrentStep(1);
                setMaxVisitedStep(1);
              }}
            >
              <span>Start Creating Assessment</span>
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1: MODULE SELECTION (PREREQUISITE GATING)
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="as-step-card">
            <div className="as-step-header">
              <h3 className="as-step-question">
                Which modules should learners complete before unlocking this assessment?
              </h3>
              <p className="as-step-subtext">
                Selected modules determine when learners can access this assessment. Learners must complete every selected module before the assessment becomes available.
              </p>
            </div>

            <div className="as-gating-callout">
              <Sparkles size={18} className="text-brand flex-shrink-0" />
              <span>
                <strong>Rule:</strong> When learners progress through the course, this assessment remains permanently locked until 100% of the lessons in all selected prerequisite modules are completed.
              </span>
            </div>

            <div className="as-modules-toolbar">
              <span className="as-selected-count-pill">
                <Layers size={14} />
                <span>{selectedModuleIds.length} {selectedModuleIds.length === 1 ? 'Module Selected' : 'Modules Selected'}</span>
              </span>

              {modules.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-as-action btn-as-action-secondary"
                    onClick={selectAllModules}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    className="btn-as-action btn-as-action-secondary"
                    onClick={clearAllModules}
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>

            {modules.length === 0 ? (
              <div className="p-8 text-center border rounded-xl bg-surface-subtle">
                <BookOpen size={36} className="mx-auto mb-2 text-muted" />
                <h4 className="font-bold text-primary">No Modules Found in this Course</h4>
                <p className="text-secondary text-sm max-w-md mx-auto mt-1">
                  You can proceed without prerequisite modules now, or create modules first in the Module & Lesson editor.
                </p>
              </div>
            ) : (
              <div className="as-modules-select-grid">
                {modules.map((mod, idx) => {
                  const mId = String(mod._id);
                  const isSelected = selectedModuleIds.includes(mId);
                  const lessonCount = (mod.lessons || []).length;

                  return (
                    <div
                      key={mId}
                      className={`as-module-select-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => toggleModuleSelection(mId)}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleModuleSelection(mId);
                        }
                      }}
                    >
                      <div className="as-checkbox-indicator">
                        <Check size={14} strokeWidth={3} />
                      </div>

                      <div className="as-module-info-col">
                        <div className="flex items-center gap-2">
                          <span className="as-module-id-badge">M{idx + 1}</span>
                          <h4 className="as-module-card-title">{mod.title || `Module ${idx + 1}`}</h4>
                        </div>
                        {mod.description && (
                          <p className="text-secondary text-xs line-clamp-2 mt-1">
                            {mod.description}
                          </p>
                        )}
                        <span className="as-module-card-meta mt-2">
                          {lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="as-wizard-nav-footer">
              <div className="as-nav-left" />
              <div className="as-nav-right">
                <button
                  type="button"
                  className="btn-as-action btn-as-action-primary"
                  onClick={handleNextStep}
                >
                  <span>Continue to Assessment Details</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2: ASSESSMENT DETAILS
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="as-step-card max-w-3xl mx-auto">
            <div className="as-step-header">
              <h3 className="as-step-question">Assessment Details</h3>
              <p className="as-step-subtext">
                Provide clear, descriptive information so learners understand what concepts this assessment will evaluate.
              </p>
            </div>

            <div className="as-form-group">
              <label className="as-form-label">
                Assessment Title <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className="as-form-input"
                placeholder="e.g. React Fundamentals — Comprehensive Assessment"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
                maxLength={120}
              />
              <span className="text-xs text-muted text-right">{title.length} / 120 characters</span>
            </div>

            <div className="as-form-group">
              <label className="as-form-label">Assessment Description (Optional)</label>
              <textarea
                className="as-form-textarea"
                rows={4}
                placeholder="Describe the topics and skills evaluated by this assessment..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  markDirty();
                }}
                maxLength={500}
              />
              <span className="text-xs text-muted text-right">{description.length} / 500 characters</span>
            </div>

            {/* Selected Prerequisite Modules Summary Card */}
            <div className="p-4 rounded-xl border bg-surface-subtle flex flex-col gap-2">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">
                Prerequisite Summary
              </span>
              {selectedModuleIds.length === 0 ? (
                <p className="text-sm text-secondary">
                  No prerequisite modules selected. This assessment will be available immediately to enrolled learners.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {selectedModuleIds.map(mId => {
                    const mObj = modules.find(m => String(m._id) === mId);
                    const idx = modules.findIndex(m => String(m._id) === mId);
                    return (
                      <span key={mId} className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface border rounded-md text-xs font-semibold text-primary">
                        <span className="text-brand font-bold">M{idx + 1}:</span>
                        <span>{mObj?.title || 'Module'}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="as-wizard-nav-footer">
              <div className="as-nav-left">
                <button
                  type="button"
                  className="btn-as-action btn-as-action-secondary"
                  onClick={handlePrevStep}
                >
                  <ChevronLeft size={16} />
                  <span>Back to Modules</span>
                </button>
              </div>
              <div className="as-nav-right">
                <button
                  type="button"
                  className="btn-as-action btn-as-action-primary"
                  onClick={handleNextStep}
                >
                  <span>Continue to Questions</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 3: QUESTION CREATION (REUSING QUIZ EDITOR 3-PANEL STRUCTURE)
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="flex flex-col gap-4">
            <div className="as-questions-3col-layout">
              {/* Panel 1: Questions List */}
              <div className="as-q-list-col">
                <div className="as-q-list-header">
                  <h4 className="as-q-list-heading">Questions ({totalQuestions})</h4>
                  <button
                    type="button"
                    className="btn-add-q-inline"
                    onClick={handleAddQuestion}
                  >
                    <Plus size={13} />
                    <span>Add</span>
                  </button>
                </div>

                <div className="p-2 border-b">
                  <div className="as-sidebar-search-wrap">
                    <Search size={13} className="as-sidebar-search-icon" />
                    <input
                      type="text"
                      className="as-sidebar-search-input"
                      placeholder="Search questions..."
                      value={questionSearchQuery}
                      onChange={(e) => setQuestionSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="as-q-list-scroll">
                  {filteredQuestions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted">
                      No questions match "{questionSearchQuery}"
                    </div>
                  ) : (
                    filteredQuestions.map((q) => {
                      const origIdx = q.originalIndex;
                      const isActive = origIdx === activeQuestionIndex;

                      return (
                        <div
                          key={q._id || origIdx}
                          className={`as-q-item-card ${isActive ? 'is-active' : ''}`}
                          onClick={() => setActiveQuestionIndex(origIdx)}
                        >
                          <div className="as-q-num-pill">
                            {origIdx + 1}
                          </div>

                          <div className="as-q-item-info">
                            <span className="as-q-item-prompt" title={q.questionText}>
                              {q.questionText || `Question ${origIdx + 1}`}
                            </span>
                            <div className="as-q-item-meta">
                              <span className="as-q-type-badge">
                                {QUESTION_TYPES.find(t => t.value === q.type)?.shortBadge || 'MCQ'}
                              </span>
                              <span>•</span>
                              <span>{q.marks || 1} {q.marks === 1 ? 'mark' : 'marks'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="btn-remove-option"
                              disabled={origIdx === 0}
                              onClick={(e) => handleMoveQuestion(origIdx, 'up', e)}
                              title="Move Up"
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-remove-option"
                              disabled={origIdx === questions.length - 1}
                              onClick={(e) => handleMoveQuestion(origIdx, 'down', e)}
                              title="Move Down"
                            >
                              <ArrowDown size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-remove-option"
                              onClick={(e) => handleDeleteQuestion(origIdx, e)}
                              title="Delete Question"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Panel 2: Center Question Editor */}
              <div className="as-q-editor-col">
                <div className="as-editor-top-row">
                  <div className="as-type-select-wrap">
                    <label className="text-xs font-bold text-muted uppercase">Question Type:</label>
                    <select
                      className="as-form-input text-xs font-semibold py-1.5 px-3 rounded-md w-auto"
                      value={currentQuestion.type || 'mcq'}
                      onChange={(e) => handleUpdateCurrentQuestion('type', e.target.value)}
                    >
                      {QUESTION_TYPES.map(t => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="as-marks-input-wrap">
                    <label className="text-xs font-bold text-muted uppercase">Marks:</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className="as-marks-number-input"
                      value={currentQuestion.marks || 1}
                      onChange={(e) => handleUpdateCurrentQuestion('marks', Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                  </div>
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">
                    Question Prompt ({activeQuestionIndex + 1} of {totalQuestions}) <span className="required-star">*</span>
                  </label>
                  <textarea
                    className="as-form-textarea"
                    rows={3}
                    placeholder="Enter the question text clearly..."
                    value={currentQuestion.questionText || ''}
                    onChange={(e) => handleUpdateCurrentQuestion('questionText', e.target.value)}
                  />
                </div>

                {/* Options List */}
                <div className="as-form-group">
                  <div className="flex items-center justify-between mb-1">
                    <label className="as-form-label">
                      Answer Options & Correct Answer
                    </label>
                    <span className="text-xs text-muted">
                      {currentQuestion.type === 'multiple_response'
                        ? 'Check all options that are correct'
                        : 'Select the radio button for the correct option'}
                    </span>
                  </div>

                  <div className="as-options-list">
                    {(currentQuestion.options || []).map((opt, optIdx) => {
                      const isCorrect = currentQuestion.type === 'multiple_response'
                        ? (currentQuestion.correctOptionIndexes || []).includes(optIdx)
                        : currentQuestion.correctAnswerIndex === optIdx;

                      return (
                        <div key={optIdx} className="as-option-row">
                          <button
                            type="button"
                            className={`as-option-correct-btn ${isCorrect ? 'is-correct' : ''}`}
                            onClick={() => handleSetCorrectAnswer(optIdx)}
                            title={isCorrect ? 'Marked as correct' : 'Click to mark as correct'}
                          >
                            <Check size={16} strokeWidth={3} />
                          </button>

                          <input
                            type="text"
                            className="as-option-input"
                            placeholder={`Option ${optIdx + 1}...`}
                            value={opt}
                            disabled={currentQuestion.type === 'true_false'}
                            onChange={(e) => handleOptionTextChange(optIdx, e.target.value)}
                          />

                          {currentQuestion.type !== 'true_false' && (currentQuestion.options || []).length > 2 && (
                            <button
                              type="button"
                              className="btn-remove-option"
                              onClick={() => handleRemoveOption(optIdx)}
                              title="Delete option"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {currentQuestion.type !== 'true_false' && (currentQuestion.options || []).length < 6 && (
                    <button
                      type="button"
                      className="btn-add-option-row mt-2"
                      onClick={handleAddOption}
                    >
                      <Plus size={14} />
                      <span>Add Option</span>
                    </button>
                  )}
                </div>

                {/* Explanation */}
                <div className="as-form-group">
                  <label className="as-form-label">Explanation / Solution Note (Optional)</label>
                  <textarea
                    className="as-form-textarea"
                    rows={2}
                    placeholder="Provide explanatory feedback for learners after completion..."
                    value={currentQuestion.explanation || ''}
                    onChange={(e) => handleUpdateCurrentQuestion('explanation', e.target.value)}
                  />
                </div>
              </div>

              {/* Panel 3: Assessment Summary */}
              <div className="as-q-summary-col">
                <h4 className="text-sm font-bold text-primary border-b pb-2">
                  Assessment Summary
                </h4>

                <div className="as-summary-stat-box">
                  <span className="as-stat-label">Total Questions</span>
                  <span className="as-stat-number">{totalQuestions}</span>
                </div>

                <div className="as-summary-stat-box">
                  <span className="as-stat-label">Total Marks</span>
                  <span className="as-stat-number">{totalMarks}</span>
                </div>

                <div className="as-summary-stat-box">
                  <span className="as-stat-label">Avg Marks/Q</span>
                  <span className="as-stat-number">{avgMarksPerQuestion}</span>
                </div>

                <div className="p-3 bg-surface-subtle border rounded-lg flex flex-col gap-1.5 text-xs">
                  <span className="font-bold text-muted uppercase">Prerequisite Gating</span>
                  <span className="text-secondary">
                    {selectedModuleIds.length} {selectedModuleIds.length === 1 ? 'module required' : 'modules required'}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn-as-action btn-as-action-primary w-full justify-center"
                  onClick={handleAddQuestion}
                >
                  <Plus size={14} />
                  <span>Add Next Question</span>
                </button>
              </div>
            </div>

            <div className="as-wizard-nav-footer">
              <div className="as-nav-left">
                <button
                  type="button"
                  className="btn-as-action btn-as-action-secondary"
                  onClick={handlePrevStep}
                >
                  <ChevronLeft size={16} />
                  <span>Back to Details</span>
                </button>
              </div>
              <div className="as-nav-right">
                <button
                  type="button"
                  className="btn-as-action btn-as-action-primary"
                  onClick={handleNextStep}
                >
                  <span>Continue to Assessment Settings</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 4: ASSESSMENT SETTINGS
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="as-step-card max-w-3xl mx-auto">
            <div className="as-step-header">
              <h3 className="as-step-question">Assessment Settings & Timing</h3>
              <p className="as-step-subtext">
                Configure timing, randomization, and display rules for this assessment.
              </p>
            </div>

            {/* A. Assessment Summary */}
            <div className="as-metrics-grid">
              <div className="as-metric-pill-card">
                <span className="as-metric-label">Total Questions</span>
                <span className="as-metric-value">{totalQuestions}</span>
              </div>
              <div className="as-metric-pill-card">
                <span className="as-metric-label">Total Marks</span>
                <span className="as-metric-value">{totalMarks}</span>
              </div>
              <div className="as-metric-pill-card">
                <span className="as-metric-label">Prerequisite Modules</span>
                <span className="as-metric-value">{selectedModuleIds.length}</span>
              </div>
            </div>

            {/* B. Time Limit */}
            <div className="as-form-group">
              <label className="as-form-label">
                Time Limit (Minutes) <span className="required-star">*</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={5}
                  max={300}
                  step={5}
                  className="as-form-input w-36 font-bold text-center text-lg text-brand"
                  value={timeLimit}
                  onChange={(e) => {
                    setTimeLimit(Math.max(5, parseInt(e.target.value, 10) || 45));
                    markDirty();
                  }}
                />
                <span className="text-secondary font-medium">Minutes</span>
                <span className="as-duration-badge ml-auto">
                  Recommended: 45–60 min
                </span>
              </div>
              <p className="text-xs text-muted mt-1">
                The timer starts when the learner begins the assessment and persists across page refreshes. When time expires, answers are automatically evaluated.
              </p>
            </div>

            {/* C. Additional Assessment Controls */}
            <div className="border-t pt-4 flex flex-col gap-4">
              <h4 className="text-sm font-bold text-primary">Assessment Controls & Behavior</h4>

              {/* 1. Question Order */}
              <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-xl hover:bg-surface-subtle transition-colors">
                <input
                  type="checkbox"
                  className="mt-1 accent-brand"
                  checked={shuffleQuestions}
                  onChange={(e) => {
                    setShuffleQuestions(e.target.checked);
                    markDirty();
                  }}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-primary">Shuffle Question Order</span>
                  <span className="text-xs text-secondary">
                    Randomizes the sequence of questions for each learner attempt.
                  </span>
                </div>
              </label>

              {/* 2. Answer Option Order */}
              <label className="flex items-start gap-3 cursor-pointer p-3 border rounded-xl hover:bg-surface-subtle transition-colors">
                <input
                  type="checkbox"
                  className="mt-1 accent-brand"
                  checked={shuffleOptions}
                  onChange={(e) => {
                    setShuffleOptions(e.target.checked);
                    markDirty();
                  }}
                />
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold text-primary">Shuffle Answer Options</span>
                  <span className="text-xs text-secondary">
                    Randomizes the option choices for multiple choice questions.
                  </span>
                </div>
              </label>

              {/* 3. Result Visibility */}
              <div className="flex flex-col gap-2 p-3 border rounded-xl">
                <span className="text-sm font-semibold text-primary">Result Visibility</span>
                <div className="flex items-center gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-secondary">
                    <input
                      type="radio"
                      name="resultVisibility"
                      value="immediate"
                      checked={resultVisibility === 'immediate'}
                      onChange={() => {
                        setResultVisibility('immediate');
                        markDirty();
                      }}
                      className="accent-brand"
                    />
                    <span>Immediately After Submission</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-secondary">
                    <input
                      type="radio"
                      name="resultVisibility"
                      value="after_review"
                      checked={resultVisibility === 'after_review'}
                      onChange={() => {
                        setResultVisibility('after_review');
                        markDirty();
                      }}
                      className="accent-brand"
                    />
                    <span>After Instructor Review</span>
                  </label>
                </div>
              </div>

              {/* 4. Assessment Instructions */}
              <div className="as-form-group">
                <label className="as-form-label">Learner Instructions (Optional)</label>
                <textarea
                  className="as-form-textarea"
                  rows={3}
                  placeholder="Instructions displayed to learners on the start screen before the timer begins..."
                  value={instructions}
                  onChange={(e) => {
                    setInstructions(e.target.value);
                    markDirty();
                  }}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="as-wizard-nav-footer">
              <div className="as-nav-left">
                <button
                  type="button"
                  className="btn-as-action btn-as-action-secondary"
                  onClick={handlePrevStep}
                >
                  <ChevronLeft size={16} />
                  <span>Back to Questions</span>
                </button>
              </div>
              <div className="as-nav-right">
                <button
                  type="button"
                  className="btn-as-action btn-as-action-primary"
                  onClick={handleNextStep}
                >
                  <span>Continue to Review & Publish</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 5: REVIEW & PUBLISH
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 5 && (
          <div className="as-step-card max-w-4xl mx-auto">
            <div className="as-step-header">
              <h3 className="as-step-question">Review & Publish Assessment</h3>
              <p className="as-step-subtext">
                Verify all assessment configurations before saving. You can save as a draft to edit later or publish immediately.
              </p>
            </div>

            {/* Assessment Overview Section */}
            <div className="as-card-section">
              <div className="as-card-section-header">
                <span className="font-bold text-primary">Assessment Overview</span>
                <button
                  type="button"
                  className="text-xs text-brand font-semibold hover:underline"
                  onClick={() => setCurrentStep(2)}
                >
                  Edit Details
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <h4 className="text-lg font-bold text-primary">{title || 'Untitled Assessment'}</h4>
                {description && <p className="text-sm text-secondary">{description}</p>}
              </div>

              <div className="as-metrics-grid mt-2">
                <div className="as-metric-pill-card">
                  <span className="as-metric-label">Duration</span>
                  <span className="as-metric-value">{timeLimit} min</span>
                </div>
                <div className="as-metric-pill-card">
                  <span className="as-metric-label">Questions</span>
                  <span className="as-metric-value">{totalQuestions}</span>
                </div>
                <div className="as-metric-pill-card">
                  <span className="as-metric-label">Total Marks</span>
                  <span className="as-metric-value">{totalMarks}</span>
                </div>
              </div>
            </div>

            {/* Prerequisite Modules Section */}
            <div className="as-card-section">
              <div className="as-card-section-header">
                <span className="font-bold text-primary">Prerequisite Module Gating</span>
                <button
                  type="button"
                  className="text-xs text-brand font-semibold hover:underline"
                  onClick={() => setCurrentStep(1)}
                >
                  Edit Modules
                </button>
              </div>

              {selectedModuleIds.length === 0 ? (
                <p className="text-sm text-secondary">
                  No prerequisite modules selected. This assessment will be immediately accessible to all enrolled learners.
                </p>
              ) : (
                <div className="as-prereq-modules-grid">
                  {selectedModuleIds.map(mId => {
                    const mObj = modules.find(m => String(m._id) === mId);
                    const idx = modules.findIndex(m => String(m._id) === mId);
                    return (
                      <div key={mId} className="as-prereq-module-card">
                        <span className="as-module-id-badge">M{idx + 1}</span>
                        <div className="as-module-info-col">
                          <span className="as-module-card-title">{mObj?.title || 'Module'}</span>
                          <span className="as-module-card-meta">
                            {(mObj?.lessons || []).length} lessons
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Questions Table Overview */}
            <div className="as-card-section">
              <div className="as-card-section-header">
                <span className="font-bold text-primary">Questions ({totalQuestions})</span>
                <button
                  type="button"
                  className="text-xs text-brand font-semibold hover:underline"
                  onClick={() => setCurrentStep(3)}
                >
                  Edit Questions
                </button>
              </div>

              <div className="as-questions-table-wrap">
                <table className="as-questions-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>Question</th>
                      <th style={{ width: '130px' }}>Type</th>
                      <th style={{ width: '90px' }}>Marks</th>
                      <th style={{ width: '90px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, idx) => (
                      <tr key={idx}>
                        <td className="font-bold text-muted">Q{idx + 1}</td>
                        <td className="font-medium text-primary line-clamp-1">{q.questionText}</td>
                        <td>
                          <span className="as-q-type-badge">
                            {QUESTION_TYPES.find(t => t.value === q.type)?.shortBadge || 'MCQ'}
                          </span>
                        </td>
                        <td className="font-semibold text-brand">{q.marks} pts</td>
                        <td>
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                            <CheckCircle2 size={12} />
                            Valid
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Final Actions */}
            <div className="as-wizard-nav-footer">
              <div className="as-nav-left">
                <button
                  type="button"
                  className="btn-as-action btn-as-action-secondary"
                  onClick={handlePrevStep}
                >
                  <ChevronLeft size={16} />
                  <span>Back to Settings</span>
                </button>
              </div>

              <div className="as-nav-right">
                <button
                  type="button"
                  className="btn-as-action btn-as-action-secondary"
                  onClick={() => handleSaveAssessment('draft')}
                  disabled={isSubmitting}
                >
                  <FileText size={15} />
                  <span>Save as Draft</span>
                </button>

                <button
                  type="button"
                  className="btn-as-action btn-as-action-primary"
                  onClick={() => handleSaveAssessment('published')}
                  disabled={isSubmitting}
                >
                  <Check size={16} />
                  <span>Publish Assessment</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Unsaved Changes Exit Confirmation Modal ── */}
      {showExitConfirmModal && (
        <div className="as-modal-backdrop" onClick={() => setShowExitConfirmModal(false)}>
          <div className="as-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="as-modal-header">
              <div className="as-modal-icon-badge icon-warning">
                <AlertCircle size={22} />
              </div>
              <h3 className="as-modal-title">Unsaved Changes</h3>
            </div>
            <p className="as-modal-body-text">
              You have unsaved changes in this assessment. Would you like to save your progress as a draft before exiting, or discard changes?
            </p>
            <div className="as-modal-actions">
              <button
                type="button"
                className="btn-as-action btn-as-action-secondary"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  onCancel();
                }}
              >
                Discard & Exit
              </button>
              <button
                type="button"
                className="btn-as-action btn-as-action-primary"
                onClick={async () => {
                  setShowExitConfirmModal(false);
                  await handleSaveAssessment('draft');
                }}
              >
                Save Draft & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
