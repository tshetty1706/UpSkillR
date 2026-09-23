import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Copy,
  HelpCircle,
  Clock,
  CheckCircle2,
  EyeOff,
  Eye,
  FileText,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  MoreVertical,
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  Award,
  Sparkles,
  Layers,
  ChevronRight,
  Code2,
  ListFilter
} from 'lucide-react';

export const AssessmentEditor = ({
  courseId,
  modules = [],
  courseAssessments = [],
  onBack,
  onNavigateToModules,
  onCurriculumUpdated,
  apiBase = 'http://localhost:5000/api',
  getAuthHeader,
  toast
}) => {
  // ── Selected Assessment State (Active in Right Pane) ──
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(() => {
    return courseAssessments.length > 0 ? courseAssessments[0]._id : null;
  });
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Assessment Form Fields ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assessmentType, setAssessmentType] = useState('graded');
  const [timeLimit, setTimeLimit] = useState(30);
  const [timeUnit, setTimeUnit] = useState('minutes');
  const [passThresholdPercent, setPassThresholdPercent] = useState(70);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [cooldownHours, setCooldownHours] = useState(6);
  const [state, setState] = useState('draft');
  const [questions, setQuestions] = useState([]);

  // ── Selected Questions (for bulk operations) ──
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState([]);

  // ── Question Modal / Editor State ──
  const [questionModal, setQuestionModal] = useState({
    isOpen: false,
    editIndex: null, // null for new, number for editing
    data: {
      questionText: '',
      type: 'mcq', // 'mcq' | 'multiple_choice' | 'true_false' | 'short_answer' | 'coding'
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      correctOptionIndices: [0],
      points: 1,
      marks: 1,
      explanation: ''
    }
  });

  // ── Add Question Type Dropdown ──
  const [showAddTypeMenu, setShowAddTypeMenu] = useState(false);

  // ── Status Toggle Dropdown in Header ──
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // ── Learner Preview Modal ──
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewActiveQuestionIndex, setPreviewActiveQuestionIndex] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState({});
  const [previewShowExplanation, setPreviewShowExplanation] = useState(false);

  // ── Sync form when selectedAssessmentId changes or courseAssessments change ──
  useEffect(() => {
    if (isCreatingNew) return;

    if (!selectedAssessmentId && courseAssessments.length > 0) {
      setSelectedAssessmentId(courseAssessments[0]._id);
      return;
    }

    const currentAss = courseAssessments.find(a => String(a._id) === String(selectedAssessmentId));
    if (currentAss) {
      loadAssessmentIntoForm(currentAss);
    } else if (courseAssessments.length > 0 && !isCreatingNew) {
      setSelectedAssessmentId(courseAssessments[0]._id);
      loadAssessmentIntoForm(courseAssessments[0]);
    } else if (courseAssessments.length === 0) {
      handleInitNewAssessment();
    }
  }, [selectedAssessmentId, courseAssessments, isCreatingNew]);

  const loadAssessmentIntoForm = (ass) => {
    setIsCreatingNew(false);
    setTitle(ass.title || '');
    setDescription(ass.description || ass.instructions || '');
    setAssessmentType(ass.assessmentType || 'graded');
    setTimeLimit(ass.timeLimit || ass.durationMinutes || 30);
    setTimeUnit('minutes');
    setPassThresholdPercent(ass.passThresholdPercent || ass.passThreshold || 70);
    setMaxAttempts(ass.maxAttempts !== undefined ? ass.maxAttempts : 3);
    setCooldownHours(ass.cooldownHours !== undefined ? ass.cooldownHours : 6);
    setState(ass.state || 'draft');
    setQuestions(Array.isArray(ass.questions) ? JSON.parse(JSON.stringify(ass.questions)) : []);
    setSelectedQuestionIndices([]);
  };

  const handleInitNewAssessment = () => {
    setIsCreatingNew(true);
    setSelectedAssessmentId(null);
    setTitle('New Assessment');
    setDescription('');
    setAssessmentType('graded');
    setTimeLimit(30);
    setTimeUnit('minutes');
    setPassThresholdPercent(70);
    setMaxAttempts(3);
    setCooldownHours(6);
    setState('draft');
    setQuestions([
      {
        questionText: '',
        type: 'mcq',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctOptionIndex: 0,
        points: 1,
        marks: 1,
        explanation: ''
      }
    ]);
    setSelectedQuestionIndices([]);
  };

  // ── Filter assessments for sidebar search ──
  const filteredAssessments = useMemo(() => {
    if (!searchQuery.trim()) return courseAssessments;
    const q = searchQuery.toLowerCase();
    return courseAssessments.filter(a => (a.title || '').toLowerCase().includes(q));
  }, [courseAssessments, searchQuery]);

  /* ─────────────────────────────────────────────────────────────
     MUTATION HANDLERS (Save / Update / Toggle / Delete)
     ───────────────────────────────────────────────────────────── */

  const handleSaveAssessment = async (e) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter an assessment title');
      return;
    }
    if (questions.length === 0) {
      toast.error('Please add at least one question to the assessment');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || !q.questionText.trim()) {
        toast.error(`Question ${i + 1} is missing question prompt`);
        return;
      }
      if (q.type === 'mcq' || q.type === 'multiple_choice' || !q.type) {
        if (!q.options || q.options.some(opt => !opt || !opt.trim())) {
          toast.error(`Question ${i + 1} has empty choices`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const calculatedDuration = timeUnit === 'hours' ? Number(timeLimit) * 60 : Number(timeLimit) || 30;
      const payload = {
        title: title.trim(),
        description: description.trim(),
        instructions: description.trim(),
        assessmentType,
        timeLimit: calculatedDuration,
        durationMinutes: calculatedDuration,
        passThresholdPercent: Number(passThresholdPercent) || 70,
        maxAttempts: Number(maxAttempts) || 3,
        cooldownHours: Number(cooldownHours) || 6,
        countsTowardCertificate: true,
        questions: questions.map((q, idx) => ({
          ...q,
          marks: Number(q.marks) || Number(q.points) || 1,
          points: Number(q.points) || Number(q.marks) || 1,
          order: idx + 1
        }))
      };

      const authHeaders = typeof getAuthHeader === 'function' ? getAuthHeader() : {};
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...authHeaders
      };

      if (!isCreatingNew && selectedAssessmentId) {
        // UPDATE EXISTING ASSESSMENT
        const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/assessments/${selectedAssessmentId}`, {
          method: 'PATCH',
          headers: requestHeaders,
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          toast.success('Assessment updated successfully');
          if (onCurriculumUpdated) onCurriculumUpdated();
        } else {
          toast.error(data?.message || 'Failed to update assessment');
        }
      } else {
        // CREATE NEW ASSESSMENT
        const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/assessments`, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && data.assessment) {
          toast.success('Assessment created successfully');
          setIsCreatingNew(false);
          setSelectedAssessmentId(data.assessment._id);
          if (onCurriculumUpdated) onCurriculumUpdated();
        } else {
          toast.error(data?.message || 'Failed to create assessment');
        }
      }
    } catch (err) {
      console.error('Error saving assessment:', err);
      toast.error('Network error saving assessment');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleState = async (newDesiredState = null) => {
    if (isCreatingNew || !selectedAssessmentId) {
      setState(prev => (prev === 'published' ? 'draft' : 'published'));
      setShowStatusMenu(false);
      return;
    }

    try {
      const authHeaders = typeof getAuthHeader === 'function' ? getAuthHeader() : {};
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/assessments/${selectedAssessmentId}/toggle-state`, {
        method: 'PATCH',
        headers: authHeaders
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setState(data.state || data.assessment?.state);
        toast.success(`Assessment is now ${data.state === 'published' ? 'Published' : 'in Draft'}`);
        setShowStatusMenu(false);
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data?.message || 'Failed to update assessment state');
      }
    } catch (err) {
      console.error('Error toggling state:', err);
      toast.error('Network error updating state');
    }
  };

  const handleDeleteAssessment = async (assessmentId, e) => {
    if (e) e.stopPropagation();
    if (!assessmentId) return;

    if (!window.confirm('Are you sure you want to delete this assessment? All associated questions will be removed.')) {
      return;
    }

    try {
      const authHeaders = typeof getAuthHeader === 'function' ? getAuthHeader() : {};
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/assessments/${assessmentId}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        toast.success('Assessment deleted successfully');
        if (selectedAssessmentId === assessmentId) {
          const remaining = courseAssessments.filter(a => a._id !== assessmentId);
          if (remaining.length > 0) {
            setSelectedAssessmentId(remaining[0]._id);
          } else {
            handleInitNewAssessment();
          }
        }
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data?.message || 'Failed to delete assessment');
      }
    } catch (err) {
      console.error('Error deleting assessment:', err);
      toast.error('Network error deleting assessment');
    }
  };

  /* ─────────────────────────────────────────────────────────────
     QUESTION MANAGEMENT (Add / Edit / Delete / Duplicate / Bulk)
     ───────────────────────────────────────────────────────────── */

  const openAddQuestionModal = (type = 'mcq') => {
    setShowAddTypeMenu(false);
    let defaultOptions = ['Option A', 'Option B', 'Option C', 'Option D'];
    if (type === 'true_false') defaultOptions = ['True', 'False'];
    if (type === 'short_answer' || type === 'coding') defaultOptions = [];

    setQuestionModal({
      isOpen: true,
      editIndex: null,
      data: {
        questionText: '',
        type,
        options: defaultOptions,
        correctOptionIndex: 0,
        correctOptionIndices: [0],
        points: type === 'coding' ? 5 : type === 'short_answer' ? 3 : 2,
        marks: type === 'coding' ? 5 : type === 'short_answer' ? 3 : 2,
        explanation: ''
      }
    });
  };

  const openEditQuestionModal = (index) => {
    const q = questions[index];
    if (!q) return;
    setQuestionModal({
      isOpen: true,
      editIndex: index,
      data: {
        questionText: q.questionText || '',
        type: q.type || 'mcq',
        options: Array.isArray(q.options) ? [...q.options] : ['Choice A', 'Choice B'],
        correctOptionIndex: q.correctOptionIndex !== undefined ? q.correctOptionIndex : (q.correctAnswerIndex || 0),
        correctOptionIndices: Array.isArray(q.correctOptionIndices) ? [...q.correctOptionIndices] : [0],
        points: q.points || q.marks || 1,
        marks: q.marks || q.points || 1,
        explanation: q.explanation || q.evaluationInstructions || ''
      }
    });
  };

  const handleSaveQuestionFromModal = () => {
    const { editIndex, data } = questionModal;
    if (!data.questionText.trim()) {
      toast.error('Please enter the question text');
      return;
    }

    if (data.type === 'mcq' || data.type === 'multiple_choice' || data.type === 'true_false') {
      if (!data.options || data.options.length < 2) {
        toast.error('Please provide at least 2 options for this question type');
        return;
      }
      if (data.options.some(opt => !opt.trim())) {
        toast.error('All options must have text');
        return;
      }
    }

    const newQuestionObj = {
      questionText: data.questionText.trim(),
      type: data.type,
      options: data.options.map(o => o.trim()),
      correctOptionIndex: Number(data.correctOptionIndex) || 0,
      correctAnswerIndex: Number(data.correctOptionIndex) || 0,
      correctAnswer: data.options[data.correctOptionIndex] || '',
      points: Number(data.points) || 1,
      marks: Number(data.points) || 1,
      explanation: data.explanation.trim(),
      evaluationInstructions: data.explanation.trim(),
      order: editIndex !== null ? editIndex + 1 : questions.length + 1
    };

    if (editIndex !== null) {
      setQuestions(prev => {
        const next = [...prev];
        next[editIndex] = newQuestionObj;
        return next;
      });
      toast.success('Question updated');
    } else {
      setQuestions(prev => [...prev, newQuestionObj]);
      toast.success('Question added');
    }

    setQuestionModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleDeleteQuestion = (index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
    setSelectedQuestionIndices(prev => prev.filter(i => i !== index).map(i => (i > index ? i - 1 : i)));
    toast.success('Question removed');
  };

  const handleDuplicateQuestion = (index) => {
    const q = questions[index];
    if (!q) return;
    const duplicated = {
      ...JSON.parse(JSON.stringify(q)),
      questionText: `${q.questionText} (Copy)`,
      order: questions.length + 1
    };
    setQuestions(prev => [...prev.slice(0, index + 1), duplicated, ...prev.slice(index + 1)]);
    toast.success('Question duplicated');
  };

  const toggleSelectAllQuestions = () => {
    if (selectedQuestionIndices.length === questions.length) {
      setSelectedQuestionIndices([]);
    } else {
      setSelectedQuestionIndices(questions.map((_, i) => i));
    }
  };

  const toggleSelectQuestion = (index) => {
    setSelectedQuestionIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleBulkDeleteQuestions = () => {
    if (selectedQuestionIndices.length === 0) return;
    if (!window.confirm(`Delete ${selectedQuestionIndices.length} selected questions?`)) return;
    setQuestions(prev => prev.filter((_, i) => !selectedQuestionIndices.includes(i)));
    setSelectedQuestionIndices([]);
    toast.success('Selected questions deleted');
  };

  // ── Helper: Format Question Type Badge ──
  const getQuestionTypeBadge = (type) => {
    switch (type) {
      case 'multiple_choice':
      case 'mcq':
        return <span className="q-badge q-badge-purple">Multiple Choice</span>;
      case 'true_false':
        return <span className="q-badge q-badge-teal">True / False</span>;
      case 'short_answer':
        return <span className="q-badge q-badge-blue">Short Answer</span>;
      case 'coding':
        return <span className="q-badge q-badge-amber">Coding</span>;
      default:
        return <span className="q-badge q-badge-purple">Multiple Choice</span>;
    }
  };

  // ── Open Learner Simulation Preview ──
  const openPreview = () => {
    setPreviewActiveQuestionIndex(0);
    setPreviewAnswers({});
    setPreviewShowExplanation(false);
    setPreviewModalOpen(true);
  };

  return (
    <div className="assessment-studio-container">
      {/* ══════════════════════════════════════════════════════════
          1. TWO-COLUMN STUDIO WORKSPACE
          ══════════════════════════════════════════════════════════ */}
      <div className="assessment-studio-layout">
        {/* ── LEFT SIDEBAR: Assessment Navigation / List ── */}
        <aside className="assessment-studio-sidebar">
          {/* Top Back Nav & Sidebar Title */}
          <div className="assessment-sidebar-header">
            <button
              type="button"
              className="btn-studio-back"
              onClick={onBack}
              title="Return to Course Content hub"
            >
              <ArrowLeft size={16} />
              <span>Back to Course Content</span>
            </button>
            <div className="sidebar-heading-row">
              <div className="heading-text">
                <h3 className="sidebar-main-title">Course Assessments</h3>
                <p className="sidebar-main-caption">
                  Create milestone assessments for your learners.
                </p>
              </div>
            </div>

            {/* Create Assessment Full Width Button */}
            <button
              type="button"
              className="btn-create-assessment-brand"
              onClick={handleInitNewAssessment}
            >
              <Plus size={16} />
              <span>Create Assessment</span>
            </button>
          </div>

          {/* Search Box (when multiple assessments exist) */}
          {courseAssessments.length > 2 && (
            <div className="assessment-sidebar-search">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="search-clear">
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Assessment Cards List */}
          <div className="assessment-items-scrollable">
            {courseAssessments.length === 0 ? (
              <div className="sidebar-empty-state">
                <div className="empty-circle-icon">
                  <Award size={24} />
                </div>
                <h5>No Assessments Configured</h5>
                <p>Click "Create Assessment" above to define your course's milestone assessments.</p>
              </div>
            ) : filteredAssessments.length === 0 ? (
              <div className="sidebar-no-results">
                <p>No assessments matching "{searchQuery}"</p>
              </div>
            ) : (
              filteredAssessments.map((ass) => {
                const isSelected = String(ass._id) === String(selectedAssessmentId) && !isCreatingNew;
                const isPublished = ass.state === 'published';
                const qCount = ass.questions?.length || 0;
                const durationMins = ass.timeLimit || ass.durationMinutes || 30;

                return (
                  <div
                    key={ass._id}
                    className={`assessment-sidebar-card ${isSelected ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedAssessmentId(ass._id);
                      loadAssessmentIntoForm(ass);
                    }}
                  >
                    <div className="card-icon-col">
                      <div className={`card-doc-icon ${isPublished ? 'icon-published' : ''}`}>
                        <FileText size={18} />
                      </div>
                    </div>

                    <div className="card-info-col">
                      <h4 className="card-assessment-title" title={ass.title}>
                        {ass.title}
                      </h4>
                      <div className="card-meta-row">
                        <span className="meta-text">{qCount} questions · {durationMins} min</span>
                      </div>
                    </div>

                    <div className="card-status-col">
                      <span className={`status-pill ${isPublished ? 'pill-published' : 'pill-draft'}`}>
                        <span className="status-dot" />
                        {isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── RIGHT MAIN CONTENT PANE: Assessment Editor ── */}
        <main className="assessment-studio-main">
          {/* Top Sticky Header */}
          <header className="assessment-main-header">
            <div className="header-title-box">
              <div className="header-icon-badge">
                <FileText size={20} />
              </div>
              <div className="header-headings">
                <div className="title-row">
                  <h2 className="editor-title">
                    {isCreatingNew ? 'Create Assessment' : 'Edit Assessment'}
                  </h2>
                  <span className={`editor-status-indicator status-${state}`}>
                    ● {state === 'published' ? 'PUBLISHED' : 'DRAFT'}
                  </span>
                </div>
                <p className="editor-subtitle">
                  Configure the details, questions, and settings for this assessment.
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="header-actions-group">
              {/* Draft / Published Dropdown Toggle */}
              <div className="status-dropdown-wrapper">
                <button
                  type="button"
                  className={`btn-header-status-toggle ${state === 'published' ? 'state-published' : 'state-draft'}`}
                  onClick={() => setShowStatusMenu(prev => !prev)}
                >
                  <span className="status-dot" />
                  <span>{state === 'published' ? 'Published' : 'Draft'}</span>
                  <ChevronDown size={14} />
                </button>

                {showStatusMenu && (
                  <div className="status-dropdown-menu">
                    <button
                      type="button"
                      className={`status-option ${state === 'published' ? 'selected' : ''}`}
                      onClick={() => handleToggleState('published')}
                    >
                      <CheckCircle2 size={15} className="text-emerald" />
                      <div>
                        <strong>Published</strong>
                        <p>Available to enrolled learners</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`status-option ${state === 'draft' ? 'selected' : ''}`}
                      onClick={() => handleToggleState('draft')}
                    >
                      <EyeOff size={15} className="text-muted" />
                      <div>
                        <strong>Draft</strong>
                        <p>Hidden from learners during editing</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Preview Button */}
              <button
                type="button"
                className="btn-header-preview"
                onClick={openPreview}
                title="Preview this assessment as a learner"
              >
                <Eye size={15} />
                <span>Preview</span>
              </button>

              {/* Delete Button (if existing assessment) */}
              {!isCreatingNew && selectedAssessmentId && (
                <button
                  type="button"
                  className="btn-header-delete"
                  onClick={(e) => handleDeleteAssessment(selectedAssessmentId, e)}
                  title="Delete this assessment"
                >
                  <Trash2 size={15} />
                </button>
              )}

              {/* Save Changes / Create Button */}
              <button
                type="button"
                className="btn-header-save-brand"
                disabled={saving}
                onClick={handleSaveAssessment}
              >
                {saving ? (
                  <>
                    <RefreshCw size={15} className="spinner-rotate" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>{isCreatingNew ? 'Create Assessment' : 'Save Changes'}</span>
                  </>
                )}
              </button>
            </div>
          </header>

          {/* Form Content Body */}
          <div className="assessment-scrollable-body">
            {/* ══════════════════════════════════════════════════════════
                CARD 1: Basic Information
                ══════════════════════════════════════════════════════════ */}
            <section className="assessment-card-section">
              <div className="section-card-header">
                <div className="section-title-icon-badge">
                  <FileText size={18} />
                </div>
                <h3 className="section-title-text">Basic Information</h3>
              </div>

              <div className="section-card-body">
                {/* Row 1: Title & Description Grid */}
                <div className="form-grid-2-equal">
                  {/* Assessment Title */}
                  <div className="form-field-unit">
                    <div className="field-label-row">
                      <label className="input-field-label">
                        Assessment Title <span className="text-danger">*</span>
                      </label>
                      <span className="field-char-count">{title.length}/100</span>
                    </div>
                    <input
                      type="text"
                      className="studio-text-input"
                      maxLength={100}
                      required
                      placeholder="e.g., Module 1 Assessment"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* Description / Instructions */}
                  <div className="form-field-unit">
                    <div className="field-label-row">
                      <label className="input-field-label">Description (Optional)</label>
                      <span className="field-char-count">{description.length}/300</span>
                    </div>
                    <textarea
                      className="studio-textarea"
                      rows={2}
                      maxLength={300}
                      placeholder="Outline instructions, scope, or learning outcomes for this assessment..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 2: 3-Column Assessment Specs Grid */}
                <div className="form-grid-3">
                  {/* Time Limit */}
                  <div className="form-field-unit">
                    <label className="input-field-label">
                      Time Limit <span className="text-danger">*</span>
                    </label>
                    <div className="time-limit-composite-input">
                      <div className="input-with-icon-wrapper flex-1">
                        <Clock size={15} className="input-left-icon" />
                        <input
                          type="number"
                          min="1"
                          max="300"
                          className="studio-text-input with-left-icon"
                          value={timeLimit}
                          onChange={(e) => setTimeLimit(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                      </div>
                      <select
                        className="studio-select-unit"
                        value={timeUnit}
                        onChange={(e) => setTimeUnit(e.target.value)}
                      >
                        <option value="minutes">minutes</option>
                        <option value="hours">hours</option>
                      </select>
                    </div>
                  </div>

                  {/* Total Questions (Dynamic Readonly) */}
                  <div className="form-field-unit">
                    <label className="input-field-label">Total Questions</label>
                    <div className="input-with-icon-wrapper">
                      <FileText size={15} className="input-left-icon" />
                      <input
                        type="text"
                        readOnly
                        className="studio-text-input with-left-icon is-readonly"
                        value={questions.length}
                      />
                    </div>
                  </div>

                  {/* Passing Score */}
                  <div className="form-field-unit">
                    <label className="input-field-label">
                      Passing Score <span className="text-danger">*</span>
                    </label>
                    <div className="input-with-percent-wrapper">
                      <span className="input-percent-prefix">%</span>
                      <input
                        type="number"
                        min="10"
                        max="100"
                        className="studio-text-input with-percent"
                        value={passThresholdPercent}
                        onChange={(e) => setPassThresholdPercent(Math.min(100, Math.max(10, parseInt(e.target.value) || 10)))}
                      />
                      <span className="input-percent-suffix">%</span>
                    </div>
                  </div>
                </div>

                {/* Row 3: Max Attempts & Retake Cooldown */}
                <div className="form-grid-2-equal">
                  <div className="form-field-unit">
                    <label className="input-field-label">Max Attempts</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      className="studio-text-input"
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <span className="field-helper-caption">
                      Number of assessment submission attempts granted to learners before locked.
                    </span>
                  </div>

                  <div className="form-field-unit">
                    <label className="input-field-label">Retake Cooldown (Hours)</label>
                    <input
                      type="number"
                      min="0"
                      max="72"
                      className="studio-text-input"
                      value={cooldownHours}
                      onChange={(e) => setCooldownHours(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                    <span className="field-helper-caption">
                      Cooldown buffer learners must wait before sitting for a retake attempt.
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════════
                CARD 2: Questions Management Section
                ══════════════════════════════════════════════════════════ */}
            <section className="assessment-card-section">
              <div className="section-card-header questions-section-header">
                <div className="header-left-col">
                  <div className="section-title-icon-badge">
                    <HelpCircle size={18} />
                  </div>
                  <div>
                    <h3 className="section-title-text">Questions</h3>
                    <p className="section-subtitle-text">
                      Add, edit, and manage the questions for this assessment.
                    </p>
                  </div>
                </div>

                {/* Top Right Action Group */}
                <div className="header-right-col">
                  {selectedQuestionIndices.length > 0 && (
                    <button
                      type="button"
                      className="btn-bulk-delete"
                      onClick={handleBulkDeleteQuestions}
                    >
                      <Trash2 size={14} />
                      <span>Delete Selected ({selectedQuestionIndices.length})</span>
                    </button>
                  )}

                  {/* Add Question Button with Dropdown Menu */}
                  <div className="add-question-dropdown-wrapper">
                    <button
                      type="button"
                      className="btn-add-question-brand"
                      onClick={() => openAddQuestionModal('mcq')}
                    >
                      <Plus size={15} />
                      <span>Add Question</span>
                    </button>
                    <button
                      type="button"
                      className="btn-add-question-caret"
                      onClick={() => setShowAddTypeMenu(prev => !prev)}
                      title="Choose question type"
                    >
                      <ChevronDown size={14} />
                    </button>

                    {showAddTypeMenu && (
                      <div className="add-question-menu">
                        <button
                          type="button"
                          className="add-type-item"
                          onClick={() => openAddQuestionModal('mcq')}
                        >
                          <span className="type-dot purple" />
                          <span>Multiple Choice (Single Answer)</span>
                        </button>
                        <button
                          type="button"
                          className="add-type-item"
                          onClick={() => openAddQuestionModal('true_false')}
                        >
                          <span className="type-dot teal" />
                          <span>True / False</span>
                        </button>
                        <button
                          type="button"
                          className="add-type-item"
                          onClick={() => openAddQuestionModal('short_answer')}
                        >
                          <span className="type-dot blue" />
                          <span>Short Answer / Fill in Blank</span>
                        </button>
                        <button
                          type="button"
                          className="add-type-item"
                          onClick={() => openAddQuestionModal('coding')}
                        >
                          <span className="type-dot amber" />
                          <span>Coding Exercise</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="section-card-body questions-table-container">
                {questions.length === 0 ? (
                  <div className="empty-questions-card">
                    <div className="empty-questions-icon">
                      <HelpCircle size={32} />
                    </div>
                    <h4>No Questions Added Yet</h4>
                    <p>Click "+ Add Question" above to configure the first question for this assessment.</p>
                    <button
                      type="button"
                      className="btn-add-first-question"
                      onClick={() => openAddQuestionModal('mcq')}
                    >
                      <Plus size={15} />
                      <span>Add First Question</span>
                    </button>
                  </div>
                ) : (
                  <div className="questions-table-wrapper">
                    <table className="questions-table">
                      <thead>
                        <tr>
                          <th className="th-select">
                            <button
                              type="button"
                              className="btn-table-checkbox"
                              onClick={toggleSelectAllQuestions}
                              title="Select all questions"
                            >
                              {selectedQuestionIndices.length === questions.length && questions.length > 0 ? (
                                <CheckSquare size={16} className="text-emerald" />
                              ) : (
                                <Square size={16} className="text-muted" />
                              )}
                            </button>
                          </th>
                          <th className="th-num">#</th>
                          <th className="th-prompt">Question</th>
                          <th className="th-type">Type</th>
                          <th className="th-points">Points</th>
                          <th className="th-actions">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {questions.map((q, idx) => {
                          const isSelected = selectedQuestionIndices.includes(idx);
                          return (
                            <tr key={idx} className={`question-row ${isSelected ? 'is-row-selected' : ''}`}>
                              <td className="td-select">
                                <button
                                  type="button"
                                  className="btn-table-checkbox"
                                  onClick={() => toggleSelectQuestion(idx)}
                                >
                                  {isSelected ? (
                                    <CheckSquare size={16} className="text-emerald" />
                                  ) : (
                                    <Square size={16} className="text-muted" />
                                  )}
                                </button>
                              </td>
                              <td className="td-num">{idx + 1}</td>
                              <td className="td-prompt" onClick={() => openEditQuestionModal(idx)}>
                                <div className="q-prompt-content">
                                  <span className="q-prompt-text">{q.questionText || 'Untitled Question'}</span>
                                  {q.options && q.options.length > 0 && (
                                    <span className="q-options-summary">
                                      {q.options.length} options · Correct: {String.fromCharCode(65 + (q.correctOptionIndex || 0))}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="td-type">
                                {getQuestionTypeBadge(q.type)}
                              </td>
                              <td className="td-points">
                                <span className="points-pill">{q.points || q.marks || 1}</span>
                              </td>
                              <td className="td-actions">
                                <div className="actions-cluster">
                                  <button
                                    type="button"
                                    className="btn-row-action"
                                    onClick={() => openEditQuestionModal(idx)}
                                    title="Edit Question"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-row-action"
                                    onClick={() => handleDuplicateQuestion(idx)}
                                    title="Duplicate Question"
                                  >
                                    <Copy size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-row-action btn-row-delete"
                                    onClick={() => handleDeleteQuestion(idx)}
                                    title="Delete Question"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════
          2. QUESTION CREATION / EDIT MODAL
          ══════════════════════════════════════════════════════════ */}
      {questionModal.isOpen && (
        <div className="modal-backdrop-overlay" onClick={() => setQuestionModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="question-editor-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card-header">
              <div className="header-info">
                <h3>{questionModal.editIndex !== null ? `Edit Question #${questionModal.editIndex + 1}` : 'Add New Question'}</h3>
                <span className="header-badge">Assessment Question</span>
              </div>
              <button
                type="button"
                className="btn-modal-close-icon"
                onClick={() => setQuestionModal(prev => ({ ...prev, isOpen: false }))}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-card-body">
              {/* Question Text */}
              <div className="form-field-unit">
                <label className="input-field-label">
                  Question Prompt <span className="text-danger">*</span>
                </label>
                <textarea
                  className="studio-textarea"
                  rows={3}
                  required
                  placeholder="Enter the assessment question prompt or problem statement..."
                  value={questionModal.data.questionText}
                  onChange={(e) =>
                    setQuestionModal(prev => ({
                      ...prev,
                      data: { ...prev.data, questionText: e.target.value }
                    }))
                  }
                />
              </div>

              {/* Type & Points Row */}
              <div className="form-grid-2-equal">
                <div className="form-field-unit">
                  <label className="input-field-label">Question Type</label>
                  <select
                    className="studio-select-input"
                    value={questionModal.data.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      let newOpts = questionModal.data.options;
                      if (newType === 'true_false') newOpts = ['True', 'False'];
                      else if (newType === 'short_answer' || newType === 'coding') newOpts = [];
                      else if (newOpts.length < 2) newOpts = ['Option A', 'Option B', 'Option C', 'Option D'];

                      setQuestionModal(prev => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          type: newType,
                          options: newOpts,
                          correctOptionIndex: 0
                        }
                      }));
                    }}
                  >
                    <option value="mcq">Multiple Choice (Single Correct)</option>
                    <option value="true_false">True / False</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="coding">Coding Exercise</option>
                  </select>
                </div>

                <div className="form-field-unit">
                  <label className="input-field-label">Points / Weight</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="studio-text-input"
                    value={questionModal.data.points}
                    onChange={(e) =>
                      setQuestionModal(prev => ({
                        ...prev,
                        data: {
                          ...prev.data,
                          points: Math.max(1, parseInt(e.target.value) || 1),
                          marks: Math.max(1, parseInt(e.target.value) || 1)
                        }
                      }))
                    }
                  />
                </div>
              </div>

              {/* Options Section (For MCQ and True/False) */}
              {(questionModal.data.type === 'mcq' || questionModal.data.type === 'true_false') && (
                <div className="modal-options-section">
                  <div className="options-section-heading">
                    <label className="input-field-label">
                      Answer Choices <span className="text-danger">*</span>
                    </label>
                    <span className="options-hint">Select the radio button beside the correct answer</span>
                  </div>

                  <div className="options-inputs-list">
                    {questionModal.data.options.map((opt, oIdx) => {
                      const isCorrect = questionModal.data.correctOptionIndex === oIdx;
                      return (
                        <div key={oIdx} className={`option-input-row ${isCorrect ? 'is-correct-row' : ''}`}>
                          <label className="option-radio-control" title="Mark as correct answer">
                            <input
                              type="radio"
                              name="modal_correct_opt"
                              checked={isCorrect}
                              onChange={() =>
                                setQuestionModal(prev => ({
                                  ...prev,
                                  data: { ...prev.data, correctOptionIndex: oIdx }
                                }))
                              }
                            />
                            <span className="opt-letter-tag">{String.fromCharCode(65 + oIdx)}</span>
                          </label>

                          <input
                            type="text"
                            className="studio-text-input opt-text-field"
                            placeholder={`Choice ${String.fromCharCode(65 + oIdx)}...`}
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...questionModal.data.options];
                              newOpts[oIdx] = e.target.value;
                              setQuestionModal(prev => ({
                                ...prev,
                                data: { ...prev.data, options: newOpts }
                              }));
                            }}
                          />

                          {questionModal.data.type === 'mcq' && questionModal.data.options.length > 2 && (
                            <button
                              type="button"
                              className="btn-remove-option"
                              onClick={() => {
                                const newOpts = questionModal.data.options.filter((_, i) => i !== oIdx);
                                setQuestionModal(prev => ({
                                  ...prev,
                                  data: {
                                    ...prev.data,
                                    options: newOpts,
                                    correctOptionIndex: Math.min(prev.data.correctOptionIndex, newOpts.length - 1)
                                  }
                                }));
                              }}
                              title="Delete this option"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {questionModal.data.type === 'mcq' && questionModal.data.options.length < 6 && (
                    <button
                      type="button"
                      className="btn-add-choice"
                      onClick={() => {
                        setQuestionModal(prev => ({
                          ...prev,
                          data: {
                            ...prev.data,
                            options: [...prev.data.options, `Choice ${String.fromCharCode(65 + prev.data.options.length)}`]
                          }
                        }));
                      }}
                    >
                      <Plus size={13} />
                      <span>Add Option Choice</span>
                    </button>
                  )}
                </div>
              )}

              {/* Short Answer / Coding Solution Hint */}
              {(questionModal.data.type === 'short_answer' || questionModal.data.type === 'coding') && (
                <div className="form-field-unit">
                  <label className="input-field-label">Sample Solution / Expected Answer</label>
                  <textarea
                    className="studio-textarea font-mono"
                    rows={3}
                    placeholder="Enter the expected code snippet or keywords for grading..."
                    value={questionModal.data.explanation}
                    onChange={(e) =>
                      setQuestionModal(prev => ({
                        ...prev,
                        data: { ...prev.data, explanation: e.target.value }
                      }))
                    }
                  />
                </div>
              )}

              {/* Explanation / Remediation */}
              <div className="form-field-unit">
                <label className="input-field-label">Explanation / Remediation Rationale</label>
                <textarea
                  className="studio-textarea"
                  rows={2}
                  placeholder="Explain why this choice is correct for candidate review..."
                  value={questionModal.data.explanation}
                  onChange={(e) =>
                    setQuestionModal(prev => ({
                      ...prev,
                      data: { ...prev.data, explanation: e.target.value }
                    }))
                  }
                />
              </div>
            </div>

            <div className="modal-card-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setQuestionModal(prev => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-save"
                onClick={handleSaveQuestionFromModal}
              >
                <span>{questionModal.editIndex !== null ? 'Save Question Changes' : 'Add Question'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          3. LEARNER SIMULATION PREVIEW MODAL
          ══════════════════════════════════════════════════════════ */}
      {previewModalOpen && (
        <div className="modal-backdrop-overlay" onClick={() => setPreviewModalOpen(false)}>
          <div className="assessment-preview-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div className="preview-header-meta">
                <span className="preview-badge">LEARNER PREVIEW</span>
                <h3 className="preview-title">{title || 'Assessment Preview'}</h3>
                <div className="preview-submeta">
                  <span>⏱ {timeLimit} {timeUnit}</span>
                  <span>•</span>
                  <span>🎯 Pass Threshold: {passThresholdPercent}%</span>
                  <span>•</span>
                  <span>📝 {questions.length} Questions</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close-icon"
                onClick={() => setPreviewModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="preview-modal-body">
              {questions.length === 0 ? (
                <div className="preview-empty-state">
                  <AlertCircle size={32} />
                  <p>No questions configured in this assessment yet.</p>
                </div>
              ) : (
                <div className="preview-question-layout">
                  {/* Left: Question Navigation Tabs */}
                  <div className="preview-nav-sidebar">
                    <span className="nav-title">Questions Navigator</span>
                    <div className="nav-pills-grid">
                      {questions.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`nav-pill ${previewActiveQuestionIndex === i ? 'active' : ''} ${previewAnswers[i] !== undefined ? 'answered' : ''}`}
                          onClick={() => {
                            setPreviewActiveQuestionIndex(i);
                            setPreviewShowExplanation(false);
                          }}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right: Active Question Pane */}
                  <div className="preview-question-pane">
                    {(() => {
                      const currentQ = questions[previewActiveQuestionIndex];
                      if (!currentQ) return null;
                      const selectedChoice = previewAnswers[previewActiveQuestionIndex];

                      return (
                        <div className="preview-question-box">
                          <div className="preview-q-top">
                            <span className="preview-q-index">
                              Question {previewActiveQuestionIndex + 1} of {questions.length}
                            </span>
                            <span className="preview-q-points">
                              {currentQ.points || currentQ.marks || 1} Points
                            </span>
                          </div>

                          <h4 className="preview-q-prompt">{currentQ.questionText}</h4>

                          {/* Options */}
                          <div className="preview-options-list">
                            {(currentQ.options || []).map((opt, oIdx) => {
                              const isChosen = selectedChoice === oIdx;
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  className={`preview-opt-btn ${isChosen ? 'is-selected' : ''}`}
                                  onClick={() => {
                                    setPreviewAnswers(prev => ({
                                      ...prev,
                                      [previewActiveQuestionIndex]: oIdx
                                    }));
                                  }}
                                >
                                  <span className="opt-letter-tag">
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span className="opt-text">{opt}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Explanation Toggle for Instructor */}
                          <div className="preview-explanation-toggle">
                            <button
                              type="button"
                              className="btn-toggle-expl"
                              onClick={() => setPreviewShowExplanation(prev => !prev)}
                            >
                              <span>{previewShowExplanation ? 'Hide Correct Answer & Explanation' : 'Reveal Correct Answer & Explanation'}</span>
                            </button>

                            {previewShowExplanation && (
                              <div className="preview-explanation-card">
                                <strong>Correct Answer: Option {String.fromCharCode(65 + (currentQ.correctOptionIndex || 0))} ({currentQ.options?.[currentQ.correctOptionIndex || 0]})</strong>
                                {currentQ.explanation && <p>{currentQ.explanation}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="preview-modal-footer">
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setPreviewModalOpen(false)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
