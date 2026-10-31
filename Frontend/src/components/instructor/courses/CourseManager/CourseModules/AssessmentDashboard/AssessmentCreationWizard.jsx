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
  X,
  Lock
} from 'lucide-react';
import { AssessmentStepper, ASSESSMENT_STEPS } from './AssessmentStepper';
import { DedicatedQuizEditor } from '../DedicatedEditor/DedicatedQuizEditor';

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
  const [moduleSearchQuery, setModuleSearchQuery] = useState('');

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
    explanation: ''
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
          explanation: ''
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
  const [viewingQuestion, setViewingQuestion] = useState(null);

  // Track active question
  const currentQuestion = questions[activeQuestionIndex] || questions[0] || defaultInitialQuestion;

  // Duration calculation helper
  const getModuleDuration = (mod) => {
    if (mod?.durationMinutes) return `${mod.durationMinutes} min`;
    const lessons = mod?.lessons || [];
    let totalMin = 0;
    lessons.forEach(l => {
      if (l?.duration) {
        const parsed = parseInt(l.duration, 10);
        if (!isNaN(parsed)) totalMin += parsed;
      }
    });
    if (totalMin > 0) return `${totalMin} min`;
    return `${Math.max(15, lessons.length * 15)} min`;
  };

  // Filtered modules in Step 1
  const filteredModules = useMemo(() => {
    if (!moduleSearchQuery.trim()) return modules;
    const q = moduleSearchQuery.toLowerCase();
    return modules.filter(m =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q)
    );
  }, [modules, moduleSearchQuery]);

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
            {isEditing ? `Edit Assessment` : 'New Assessment'}
          </div>
        </div>

        {currentStep > 0 && (
          <div className="as-wizard-topbar-center">
            <AssessmentStepper
              currentStep={currentStep}
              onStepClick={handleStepClick}
              maxVisitedStep={maxVisitedStep}
            />
          </div>
        )}

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
            STEP 1: MODULE SELECTION (PREREQUISITE GATING) - Screenshot 1
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="as-step-card">
            {/* Header with green icon badge */}
            <div className="as-step-header-with-badge">
              <div className="as-header-icon-badge">
                <Layers size={22} />
              </div>
              <div className="as-step-header-titles">
                <h3 className="as-step-heading">
                  Which modules should learners complete before unlocking this assessment?
                </h3>
                <p className="as-step-subtext">
                  Selected modules determine when learners can access this assessment. Learners must complete every selected module before the assessment becomes available.
                </p>
              </div>
            </div>

            {/* Gating Rule Banner */}
            <div className="as-gating-rule-banner">
              <div className="as-rule-icon">
                <Sparkles size={18} />
              </div>
              <span>
                <strong>Prerequisite Rule:</strong> Learners must achieve 100% completion in all selected modules before this assessment is unlocked.
              </span>
            </div>

            {/* Modules Toolbar Row */}
            <div className="as-modules-toolbar-row">
              <div className="as-modules-search-input-wrap">
                <Search size={16} className="as-search-input-icon" />
                <input
                  type="text"
                  className="as-modules-search-input"
                  placeholder="Search modules..."
                  value={moduleSearchQuery}
                  onChange={(e) => setModuleSearchQuery(e.target.value)}
                />
              </div>

              <div className="as-modules-toolbar-actions">
                <span className="as-modules-count-pill">
                  {selectedModuleIds.length} of {modules.length} modules selected
                </span>
                <button
                  type="button"
                  className="btn-as-pill-action"
                  onClick={selectAllModules}
                  disabled={selectedModuleIds.length === modules.length || modules.length === 0}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="btn-as-pill-action"
                  onClick={clearAllModules}
                  disabled={selectedModuleIds.length === 0}
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Full-width Module Cards Grid */}
            {modules.length === 0 ? (
              <div className="p-8 text-center border rounded-xl bg-surface-subtle">
                <BookOpen size={36} className="mx-auto mb-2 text-muted" />
                <h4 className="font-bold text-primary">No Modules Found in this Course</h4>
                <p className="text-secondary text-sm max-w-md mx-auto mt-1">
                  You can proceed without prerequisite modules now, or create modules first in the Module & Lesson editor.
                </p>
              </div>
            ) : filteredModules.length === 0 ? (
              <div className="p-8 text-center border rounded-xl bg-surface-subtle">
                <Search size={32} className="mx-auto mb-2 text-muted" />
                <h4 className="font-bold text-primary">No Matching Modules</h4>
                <p className="text-secondary text-sm max-w-md mx-auto mt-1">
                  No modules match your search term "{moduleSearchQuery}".
                </p>
              </div>
            ) : (
              <div className="as-module-cards-grid">
                {filteredModules.map((mod, idx) => {
                  const mId = String(mod._id);
                  const isSelected = selectedModuleIds.includes(mId);
                  const lessonCount = (mod.lessons || []).length;
                  const originalIndex = modules.findIndex(m => String(m._id) === mId);
                  const displayIndex = originalIndex >= 0 ? originalIndex : idx;

                  return (
                    <div
                      key={mId}
                      className={`as-module-card-item ${isSelected ? 'is-selected' : ''}`}
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
                      <div className={`as-card-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>

                      <div className="as-module-card-body">
                        <div className="as-module-card-top">
                          <span className={`as-module-code-badge mod-badge-color-${(displayIndex % 5) + 1}`}>
                            M{displayIndex + 1}
                          </span>
                          <div className="as-module-title-desc">
                            <h4 className="as-module-card-title">{mod.title || `Module ${displayIndex + 1}`}</h4>
                            <p className="as-module-card-desc">
                              {mod.description || 'No description provided for this module.'}
                            </p>
                          </div>
                        </div>

                        <div className="as-module-card-meta-row">
                          <span className="as-meta-pill">
                            <BookOpen size={12} />
                            <span>{lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}</span>
                          </span>
                          <span className="as-meta-pill">
                            <Clock size={12} />
                            <span>{getModuleDuration(mod)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Informational Note at Bottom */}
            <div className="as-info-note-banner">
              <AlertCircle size={18} className="as-info-note-icon" />
              <div className="as-info-note-text">
                <strong>Note:</strong>
                <p>
                  Learners who have not completed all prerequisite modules will see this assessment in a locked state with a list of remaining requirements.
                </p>
              </div>
            </div>

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
            STEP 2: ASSESSMENT DETAILS - Screenshot 2
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="as-step2-container">
            {/* Header with icon badge */}
            <div className="as-step-header-with-badge">
              <div className="as-header-icon-badge">
                <FileText size={22} />
              </div>
              <div className="as-step-header-titles">
                <h3 className="as-step-heading">Assessment Details</h3>
                <p className="as-step-subtext">
                  Provide clear, descriptive information so learners understand what concepts this assessment will evaluate.
                </p>
              </div>
            </div>

            {/* Card 1: Assessment Details */}
            <div className="as-review-card">
              <h4 className="text-base font-bold text-primary">Assessment Details</h4>
              <p className="text-xs text-secondary -mt-2">
                Configure the title and an optional summary of the assessment scope.
              </p>

              <div className="as-form-group">
                <label className="as-form-label">
                  Assessment Title <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="as-form-input"
                  placeholder="e.g. Full-Stack Development Milestone Assessment"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    markDirty();
                  }}
                  maxLength={120}
                />
                <span className="as-field-counter">{title.length} / 120 characters</span>
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
                <span className="as-field-counter">{description.length} / 500 characters</span>
              </div>
            </div>

            {/* Card 2: Coverage & Prerequisites */}
            <div className="as-review-card">
              <div className="flex flex-col gap-1">
                <h4 className="text-base font-bold text-primary">Coverage & Prerequisites</h4>
                <p className="text-xs text-secondary">
                  Learners will be tested on the content from these modules. These modules must be completed before the assessment unlocks.
                </p>
              </div>

              {/* Access Rule Banner */}
              <div className="as-access-rule-banner">
                <Lock size={15} className="as-lock-icon" />
                <span>
                  <strong>Access Rule:</strong> Learners must achieve 100% completion in all selected modules before this assessment is unlocked.
                </span>
              </div>

              {/* Toolbar Row */}
              <div className="as-coverage-toolbar-row">
                <span className="as-selected-modules-label">
                  Selected modules ({selectedModuleIds.length})
                </span>
                <button
                  type="button"
                  className="btn-as-add-modules-pill"
                  onClick={() => setCurrentStep(1)}
                >
                  <Plus size={14} />
                  <span>Select Modules</span>
                </button>
              </div>

              {/* Selected Module Chip Cards Grid */}
              {selectedModuleIds.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed text-center bg-surface-subtle">
                  <p className="text-xs text-secondary">
                    No prerequisite modules selected. Learners will be able to access this assessment immediately upon enrollment.
                  </p>
                </div>
              ) : (
                <div className="as-selected-modules-grid">
                  {selectedModuleIds.map((mId) => {
                    const mObj = modules.find(m => String(m._id) === mId);
                    const idx = modules.findIndex(m => String(m._id) === mId);
                    const lessonCount = (mObj?.lessons || []).length;

                    return (
                      <div key={mId} className="as-selected-module-chip-card">
                        <span className={`as-module-code-badge mod-badge-color-${((idx >= 0 ? idx : 0) % 5) + 1}`}>
                          M{idx >= 0 ? idx + 1 : 1}
                        </span>
                        <div className="as-selected-chip-info">
                          <h5 className="as-selected-chip-title">{mObj?.title || 'Selected Module'}</h5>
                          <span className="as-selected-chip-meta">
                            {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'} • {getModuleDuration(mObj)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="as-btn-remove-chip"
                          onClick={() => toggleModuleSelection(mId)}
                          title="Remove prerequisite module"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Navigation Footer */}
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
            <DedicatedQuizEditor
              courseId={courseId}
              mode="assessment"
              hideExplanation={true}
              isWizardStep={true}
              initialQuestions={questions}
              onChangeQuestions={(newQuestions) => {
                setQuestions(newQuestions);
                markDirty();
              }}
              activeQuestionIndexControlled={activeQuestionIndex}
              onSelectQuestionIndex={(newIdx) => setActiveQuestionIndex(newIdx)}
              assessmentContext={{
                title: title || 'Untitled Assessment',
                description: description || 'No description provided.',
                status: isEditing ? (initialAssessment?.status || 'draft') : 'draft',
                currentQuestionIndex: activeQuestionIndex,
                totalQuestions: questions.length,
                totalMarks: totalMarks,
                currentQuestionMarks: questions[activeQuestionIndex]?.marks || 1
              }}
              toast={toast}
            />

            {/* Bottom Navigation Footer */}
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
            STEP 4: ASSESSMENT SETTINGS (TIMING, BEHAVIOR & INSTRUCTIONS)
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="as-step4-container">
            {/* Header with icon badge */}
            <div className="as-step-header-with-badge">
              <div className="as-header-icon-badge">
                <Clock size={22} />
              </div>
              <div className="as-step-header-titles">
                <h3 className="as-step-heading">Assessment Settings</h3>
                <p className="as-step-subtext">
                  Configure duration, exam integrity options, and learner instructions.
                </p>
              </div>
            </div>

            <div className="as-settings-grid">
              {/* Card 1: Timing & Time Limits */}
              <div className="as-review-card as-settings-card">
                <div className="as-settings-section-head">
                  <div className="as-settings-section-icon">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h4 className="as-settings-section-title">Timing & Time Limit</h4>
                    <p className="as-settings-section-desc">
                      Set how long learners have to complete the assessment once started.
                    </p>
                  </div>
                </div>

                <div className="as-timing-config-card">
                  <div className="as-timing-input-group">
                    <label className="as-form-label">
                      Time Limit (Minutes) <span className="required-star">*</span>
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min={5}
                        max={300}
                        step={5}
                        className="as-timing-numeric-input"
                        value={timeLimit}
                        onChange={(e) => {
                          setTimeLimit(Math.max(5, parseInt(e.target.value, 10) || 45));
                          markDirty();
                        }}
                      />
                      <span className="text-sm font-semibold text-secondary"> Minutes</span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="as-time-presets-row">
                      {[15, 30, 45, 60, 90].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          className={`btn-as-time-preset ${Number(timeLimit) === mins ? 'active' : ''}`}
                          onClick={() => {
                            setTimeLimit(mins);
                            markDirty();
                          }}
                        >
                          {mins} min
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="as-recommended-callout-card">
                    <Clock size={20} className="as-rec-icon" />
                    <div className="as-rec-content">
                      <span className="as-rec-title">Recommended: 45–60 minutes</span>
                      <span className="as-rec-subtitle">
                        Gives learners sufficient time to reflect on complex problems without cognitive fatigue.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Navigation Footer */}
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
            STEP 5: REVIEW & PUBLISH - Screenshot 4
            ══════════════════════════════════════════════════════════════════ */}
        {currentStep === 5 && (
          <div className="as-step5-container">
            {/* Header with icon badge */}
            <div className="as-step-header-with-badge">
              <div className="as-header-icon-badge">
                <CheckCircle2 size={22} />
              </div>
              <div className="as-step-header-titles">
                <h3 className="as-step-heading">Review & Publish Assessment</h3>
                <p className="as-step-subtext">
                  Verify all assessment configurations before saving. You can save as a draft to edit later or publish immediately.
                </p>
              </div>
            </div>

            {/* 1. Assessment Overview Card */}
            <div className="as-review-card">
              <div className="as-review-card-header">
                <h4 className="text-base font-bold text-primary">Assessment Overview</h4>
                <button
                  type="button"
                  className="btn-as-review-edit"
                  onClick={() => setCurrentStep(2)}
                >
                  <FileText size={14} />
                  <span>Edit Details</span>
                </button>
              </div>

              <div className="as-review-overview-body">
                <div className="as-overview-title-block">
                  <div className="as-overview-doc-icon">
                    <FileText size={22} />
                  </div>
                  <div className="as-overview-text">
                    <div className="as-overview-title-row">
                      <h4 className="as-overview-title">{title || 'Untitled Assessment'}</h4>
                      <span className="as-status-badge draft">Draft</span>
                    </div>
                    <p className="as-overview-desc">{description || 'No description provided.'}</p>
                  </div>
                </div>

                <div className="as-review-metrics-grid">
                  <div className="as-review-metric-pill">
                    <Clock size={20} className="as-metric-icon" />
                    <div className="as-metric-text-col">
                      <span className="as-metric-label">Duration</span>
                      <span className="as-metric-val">{timeLimit} minutes</span>
                    </div>
                  </div>
                  <div className="as-review-metric-pill">
                    <HelpCircle size={20} className="as-metric-icon" />
                    <div className="as-metric-text-col">
                      <span className="as-metric-label">Questions</span>
                      <span className="as-metric-val">{totalQuestions}</span>
                    </div>
                  </div>
                  <div className="as-review-metric-pill">
                    <Award size={20} className="as-metric-icon" />
                    <div className="as-metric-text-col">
                      <span className="as-metric-label">Total Marks</span>
                      <span className="as-metric-val">{totalMarks} points</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Prerequisite Module Gating Card */}
            <div className="as-review-card">
              <div className="as-review-card-header">
                <h4 className="text-base font-bold text-primary">Prerequisite Module Gating</h4>
                <button
                  type="button"
                  className="btn-as-review-edit"
                  onClick={() => setCurrentStep(1)}
                >
                  <Layers size={14} />
                  <span>Edit Modules</span>
                </button>
              </div>

              {selectedModuleIds.length === 0 ? (
                <p className="text-sm text-secondary">
                  No prerequisite modules selected. This assessment will be immediately accessible to all enrolled learners.
                </p>
              ) : (
                <div className="as-review-modules-grid">
                  {selectedModuleIds.map((mId) => {
                    const mObj = modules.find(m => String(m._id) === mId);
                    const idx = modules.findIndex(m => String(m._id) === mId);
                    const lessonCount = (mObj?.lessons || []).length;

                    return (
                      <div key={mId} className="as-review-module-card">
                        <span className={`as-module-code-badge mod-badge-color-${((idx >= 0 ? idx : 0) % 5) + 1}`}>
                          M{idx >= 0 ? idx + 1 : 1}
                        </span>
                        <div className="as-review-mod-info">
                          <h5 className="as-review-mod-title">{mObj?.title || 'Selected Module'}</h5>
                          <span className="as-review-mod-meta">
                            {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'} • {getModuleDuration(mObj)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Questions Summary Card (NO Difficulty column) */}
            <div className="as-review-card">
              <div className="as-review-card-header">
                <h4 className="text-base font-bold text-primary">Questions Summary ({totalQuestions})</h4>
                <button
                  type="button"
                  className="btn-as-review-edit"
                  onClick={() => setCurrentStep(3)}
                >
                  <HelpCircle size={14} />
                  <span>Edit Questions</span>
                </button>
              </div>

              <div className="as-review-table-container">
                <table className="as-review-questions-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>Question</th>
                      <th style={{ width: '130px' }}>Type</th>
                      <th style={{ width: '90px' }}>Marks</th>
                      <th style={{ width: '90px' }}>Status</th>
                      <th style={{ width: '130px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, idx) => (
                      <tr key={q._id || idx}>
                        <td className="as-table-q-num">Q{idx + 1}</td>
                        <td className="as-table-q-prompt">
                          <span className="line-clamp-1">{q.questionText || 'Empty Question Prompt'}</span>
                        </td>
                        <td>
                          <span className={`as-table-type-badge ${q.type}`}>
                            {QUESTION_TYPES.find(t => t.value === q.type)?.shortBadge || 'MCQ'}
                          </span>
                        </td>
                        <td className="as-table-marks">{q.marks} pts</td>
                        <td>
                          <span className="as-table-status-valid">
                            <CheckCircle2 size={13} />
                            <span>Valid</span>
                          </span>
                        </td>
                        <td>
                          <div className="as-table-actions-cluster">
                            <button
                              type="button"
                              className="btn-as-table-view"
                              onClick={() => setViewingQuestion(q)}
                              title="Preview question and answer choices"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>
                            <button
                              type="button"
                              className="btn-as-table-edit"
                              onClick={() => {
                                setActiveQuestionIndex(idx);
                                setCurrentStep(3);
                              }}
                              title="Edit this question in Question Editor"
                            >
                              <ChevronRight size={13} />
                              <span>Edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Final Actions Footer */}
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

      {/* ── Question View Preview Modal ── */}
      {viewingQuestion && (
        <div className="as-modal-backdrop" onClick={() => setViewingQuestion(null)}>
          <div className="as-modal-card as-question-view-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="as-review-card-header">
              <div className="flex items-center gap-2">
                <span className={`as-table-type-badge ${viewingQuestion.type}`}>
                  {QUESTION_TYPES.find(t => t.value === viewingQuestion.type)?.shortBadge || 'MCQ'}
                </span>
                <span className="text-xs font-bold text-muted">
                  {viewingQuestion.marks} {Number(viewingQuestion.marks) === 1 ? 'point' : 'points'}
                </span>
              </div>
              <button
                type="button"
                className="as-btn-remove-chip"
                onClick={() => setViewingQuestion(null)}
                title="Close preview"
              >
                <X size={16} />
              </button>
            </div>

            <div className="as-view-modal-body">
              <div className="as-view-modal-prompt">
                {viewingQuestion.questionText || 'No question prompt specified.'}
              </div>

              <div className="as-view-modal-options-list">
                {(viewingQuestion.options || []).map((opt, oIdx) => {
                  const isCorrect = viewingQuestion.type === 'multiple_response'
                    ? (viewingQuestion.correctOptionIndexes || []).includes(oIdx)
                    : viewingQuestion.correctAnswerIndex === oIdx;

                  const optLetter = String.fromCharCode(65 + oIdx);

                  return (
                    <div
                      key={oIdx}
                      className={`as-view-modal-option-row ${isCorrect ? 'is-correct' : ''}`}
                    >
                      <div className={`as-view-opt-indicator ${isCorrect ? 'checked' : ''}`}>
                        {isCorrect ? <Check size={11} strokeWidth={3} /> : <span className="as-view-opt-letter">{optLetter}</span>}
                      </div>
                      <span className="as-view-opt-text">{opt}</span>
                      {isCorrect && (
                        <span className="as-view-correct-badge">Correct Answer</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="as-modal-actions">
              <button
                type="button"
                className="btn-as-action btn-as-action-secondary"
                onClick={() => setViewingQuestion(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


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
