import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Info,
  Clock,
  Award,
  HelpCircle,
  Lock,
  CheckCircle2,
  Circle,
  MoreVertical,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  Sparkles,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { API_BASE } from '../../../../../../config/api';
import './DedicatedQuizEditor.css';

export const DedicatedQuizEditor = ({
  courseId,
  course = {},
  activeModule = {},
  activeLesson = {},
  initialItem = null,
  onBack,
  onSaveSuccess,
  onToggleSidebar,
  apiBase = API_BASE,
  getAuthHeader = () => ({}),
  toast
}) => {
  // Existing item tracking
  const [currentId, setCurrentId] = useState(() => initialItem?._id || initialItem?.itemId || null);
  const isEditingExisting = Boolean(currentId);

  // Top-level Quiz Settings
  const [title, setTitle] = useState(() => initialItem?.title || `${activeLesson?.title || 'Lesson'} Quiz`);
  const [instructions, setInstructions] = useState(() => initialItem?.quiz?.instructions || '');
  const [publicationStatus, setPublicationStatus] = useState(() => initialItem?.state || 'draft');

  // Time Limit Settings
  const initialHasTimeLimit = Boolean(initialItem?.quiz?.hasTimeLimit || initialItem?.quiz?.timeLimit);
  const [hasTimeLimit, setHasTimeLimit] = useState(initialHasTimeLimit);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    () => Number(initialItem?.quiz?.timeLimit || initialItem?.quiz?.durationMinutes) || 20
  );

  // Default initial question if creating brand new quiz
  const defaultInitialQuestions = [
    {
      _id: 'q_init_1',
      questionText: 'Quiz Question 1',
      type: 'mcq',
      options: [
        'Option 1',
        'Option 2',
        'Option 3',
        'Option 4'
      ],
      correctAnswerIndex: 0,
      correctOptionIndexes: [0],
      marks: 2,
      explanation: 'Explanation for the correct answer.'
    }
  ];

  // Questions State
  const [questions, setQuestions] = useState(() => {
    if (initialItem?.quiz?.questions && Array.isArray(initialItem.quiz.questions) && initialItem.quiz.questions.length > 0) {
      return initialItem.quiz.questions.map((q, idx) => {
        let cleanType = (q.type || 'mcq').toLowerCase();
        if (cleanType === 'multiple_choice') cleanType = 'mcq';
        if (!['mcq', 'multiple_response', 'true_false'].includes(cleanType)) cleanType = 'mcq';

        let options = Array.isArray(q.options) && q.options.length > 0
          ? [...q.options]
          : (cleanType === 'true_false' ? ['True', 'False'] : ['Option A', 'Option B']);

        let correctIdx = Number(q.correctAnswerIndex);
        if (isNaN(correctIdx) || correctIdx < 0 || correctIdx >= options.length) correctIdx = 0;

        let correctMulti = Array.isArray(q.correctOptionIndexes) && q.correctOptionIndexes.length > 0
          ? q.correctOptionIndexes.map(Number)
          : [correctIdx];

        return {
          _id: q._id || `q_${idx + 1}`,
          questionText: q.questionText || `Question ${idx + 1}`,
          type: cleanType,
          options,
          correctAnswerIndex: correctIdx,
          correctOptionIndexes: correctMulti,
          marks: Math.max(1, Math.round(Number(q.marks) || 1)),
          explanation: q.explanation || q.evaluationInstructions || ''
        };
      });
    }
    return defaultInitialQuestions;
  });

  // Selected Active Question
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Preview & Save status
  const [isSavedOnce, setIsSavedOnce] = useState(() => isEditingExisting);
  const [savedQuizSnapshot, setSavedQuizSnapshot] = useState(() => (isEditingExisting ? initialItem : null));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewTab, setPreviewTab] = useState('learner'); // 'learner' | 'explanation'

  // Active question context
  const activeQuestion = questions[activeQuestionIndex] || questions[0];

  // Refs for rich text formatting
  const promptTextareaRef = useRef(null);
  const explanationTextareaRef = useRef(null);

  // Dirty Tracking
  const markDirty = () => setHasUnsavedChanges(true);

  // ── Calculated Values (Section 4 & 5) ──
  const totalQuestions = questions.length;
  const totalMarks = questions.reduce((sum, q) => sum + (Math.max(1, Math.round(Number(q.marks) || 1))), 0);

  // ── Question List Actions ──
  const handleAddQuestion = () => {
    const newQ = {
      _id: `q_${Date.now()}`,
      questionText: 'New Question',
      type: 'mcq',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswerIndex: 0,
      correctOptionIndexes: [0],
      marks: 1,
      explanation: ''
    };
    setQuestions(prev => [...prev, newQ]);
    setActiveQuestionIndex(questions.length);
    markDirty();
    toast?.info?.('New question added.');
  };

  const handleRemoveQuestion = (indexToRemove, e) => {
    if (e) e.stopPropagation();
    if (questions.length <= 1) {
      toast?.warning?.('Quiz must have at least one question.');
      return;
    }
    if (!window.confirm(`Delete Question ${indexToRemove + 1}?`)) return;

    setQuestions(prev => prev.filter((_, idx) => idx !== indexToRemove));
    if (activeQuestionIndex >= indexToRemove && activeQuestionIndex > 0) {
      setActiveQuestionIndex(activeQuestionIndex - 1);
    }
    markDirty();
  };

  const handleMoveQuestion = (index, direction, e) => {
    if (e) e.stopPropagation();
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setQuestions(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    setActiveQuestionIndex(targetIndex);
    markDirty();
  };

  // ── Question Field Updates ──
  const updateActiveQuestion = (field, value) => {
    setQuestions(prev => {
      const copy = [...prev];
      copy[activeQuestionIndex] = {
        ...copy[activeQuestionIndex],
        [field]: value
      };
      return copy;
    });
    markDirty();
  };

  const handleTypeChange = (newType) => {
    const currentQ = questions[activeQuestionIndex];
    if (currentQ.type === newType) return;

    let updatedOptions = [...currentQ.options];
    let updatedCorrectIdx = currentQ.correctAnswerIndex;
    let updatedMulti = [...(currentQ.correctOptionIndexes || [0])];

    if (newType === 'true_false') {
      updatedOptions = ['True', 'False'];
      updatedCorrectIdx = updatedCorrectIdx > 1 ? 0 : updatedCorrectIdx;
      updatedMulti = [updatedCorrectIdx];
    } else if (currentQ.type === 'true_false') {
      // Switching from true_false to mcq or multiple_response
      updatedOptions = ['Option A', 'Option B', 'Option C', 'Option D'];
      updatedCorrectIdx = 0;
      updatedMulti = [0];
    } else if (newType === 'multiple_response') {
      if (!updatedMulti || updatedMulti.length === 0) {
        updatedMulti = [updatedCorrectIdx];
      }
    } else if (newType === 'mcq') {
      updatedCorrectIdx = updatedMulti[0] ?? 0;
    }

    setQuestions(prev => {
      const copy = [...prev];
      copy[activeQuestionIndex] = {
        ...copy[activeQuestionIndex],
        type: newType,
        options: updatedOptions,
        correctAnswerIndex: updatedCorrectIdx,
        correctOptionIndexes: updatedMulti
      };
      return copy;
    });
    markDirty();
  };

  // ── Options Management ──
  const handleAddOption = () => {
    const currentQ = questions[activeQuestionIndex];
    if (currentQ.options.length >= 6) {
      toast?.warning?.('Maximum 6 options allowed per question.');
      return;
    }
    const nextLetter = String.fromCharCode(65 + currentQ.options.length);
    const updatedOptions = [...currentQ.options, `Option ${nextLetter}`];
    updateActiveQuestion('options', updatedOptions);
  };

  const handleRemoveOption = (optIndex) => {
    const currentQ = questions[activeQuestionIndex];
    if (currentQ.options.length <= 2) {
      toast?.warning?.('A question requires at least 2 options.');
      return;
    }
    const updatedOptions = currentQ.options.filter((_, idx) => idx !== optIndex);

    let updatedCorrectIdx = currentQ.correctAnswerIndex;
    if (updatedCorrectIdx === optIndex) {
      updatedCorrectIdx = 0;
    } else if (updatedCorrectIdx > optIndex) {
      updatedCorrectIdx -= 1;
    }

    let updatedMulti = (currentQ.correctOptionIndexes || [])
      .filter(idx => idx !== optIndex)
      .map(idx => (idx > optIndex ? idx - 1 : idx));
    if (updatedMulti.length === 0) updatedMulti = [0];

    setQuestions(prev => {
      const copy = [...prev];
      copy[activeQuestionIndex] = {
        ...copy[activeQuestionIndex],
        options: updatedOptions,
        correctAnswerIndex: updatedCorrectIdx,
        correctOptionIndexes: updatedMulti
      };
      return copy;
    });
    markDirty();
  };

  const handleUpdateOptionText = (optIndex, text) => {
    const currentQ = questions[activeQuestionIndex];
    const updatedOptions = [...currentQ.options];
    updatedOptions[optIndex] = text;
    updateActiveQuestion('options', updatedOptions);
  };

  const handleToggleCorrectOption = (optIndex) => {
    const currentQ = questions[activeQuestionIndex];
    if (currentQ.type === 'mcq' || currentQ.type === 'true_false') {
      setQuestions(prev => {
        const copy = [...prev];
        copy[activeQuestionIndex] = {
          ...copy[activeQuestionIndex],
          correctAnswerIndex: optIndex,
          correctOptionIndexes: [optIndex]
        };
        return copy;
      });
      markDirty();
    } else if (currentQ.type === 'multiple_response') {
      const currentMulti = currentQ.correctOptionIndexes || [];
      let nextMulti;
      if (currentMulti.includes(optIndex)) {
        if (currentMulti.length === 1) {
          toast?.warning?.('At least one correct answer must remain selected.');
          return;
        }
        nextMulti = currentMulti.filter(idx => idx !== optIndex);
      } else {
        nextMulti = [...currentMulti, optIndex].sort((a, b) => a - b);
      }
      setQuestions(prev => {
        const copy = [...prev];
        copy[activeQuestionIndex] = {
          ...copy[activeQuestionIndex],
          correctOptionIndexes: nextMulti,
          correctAnswerIndex: nextMulti[0] ?? 0
        };
        return copy;
      });
      markDirty();
    }
  };

  // ── Rich Text Toolbar Insertion Helper ──
  const insertFormatting = (target, prefix, suffix, defaultText) => {
    const textarea = target === 'prompt' ? promptTextareaRef.current : explanationTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;

    const newText = text.substring(0, start) + replacement + text.substring(end);
    if (target === 'prompt') {
      updateActiveQuestion('questionText', newText);
    } else {
      updateActiveQuestion('explanation', newText);
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  // ── Save Quiz Action (Section 10 & 11) ──
  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      toast?.error?.('Please enter a Quiz Title.');
      return;
    }

    if (questions.length === 0) {
      toast?.error?.('Quiz must have at least one question.');
      return;
    }

    // Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText || !q.questionText.trim()) {
        toast?.error?.(`Question ${i + 1} prompt cannot be empty.`);
        setActiveQuestionIndex(i);
        return;
      }
      if (q.type !== 'true_false') {
        if (!q.options || q.options.length < 2) {
          toast?.error?.(`Question ${i + 1} must have at least 2 options.`);
          setActiveQuestionIndex(i);
          return;
        }
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j] || !q.options[j].trim()) {
            toast?.error?.(`Question ${i + 1}, Option ${String.fromCharCode(65 + j)} cannot be empty.`);
            setActiveQuestionIndex(i);
            return;
          }
        }
      }
      if (q.type === 'multiple_response') {
        if (!q.correctOptionIndexes || q.correctOptionIndexes.length === 0) {
          toast?.error?.(`Question ${i + 1} requires at least one correct answer marked.`);
          setActiveQuestionIndex(i);
          return;
        }
      }
      if (!Number(q.marks) || Number(q.marks) < 1) {
        toast?.error?.(`Question ${i + 1} must have positive marks.`);
        setActiveQuestionIndex(i);
        return;
      }
    }

    if (hasTimeLimit) {
      const dur = Number(timeLimitMinutes);
      if (isNaN(dur) || dur < 1) {
        toast?.error?.('Time limit must be at least 1 minute.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const sanitizedQuestionsPayload = questions.map((q, idx) => ({
        _id: String(q._id).startsWith('q_') ? undefined : q._id,
        questionText: q.questionText.trim(),
        type: q.type,
        options: q.type === 'true_false' ? ['True', 'False'] : q.options.map(o => o.trim()),
        correctAnswerIndex: q.type === 'multiple_response' ? (q.correctOptionIndexes?.[0] ?? 0) : q.correctAnswerIndex,
        correctOptionIndexes: q.type === 'multiple_response' ? q.correctOptionIndexes : [q.correctAnswerIndex],
        marks: Math.max(1, Math.round(Number(q.marks) || 1)),
        explanation: (q.explanation || '').trim(),
        order: idx + 1
      }));

      const payload = {
        title: title.trim(),
        type: 'quiz',
        state: publicationStatus,
        role: 'lesson_check',
        quiz: {
          instructions: instructions.trim(),
          hasTimeLimit,
          timeLimit: hasTimeLimit ? Math.max(1, Number(timeLimitMinutes) || 20) : null,
          durationMinutes: hasTimeLimit ? Math.max(1, Number(timeLimitMinutes) || 20) : null,
          passThresholdPercent: initialItem?.quiz?.passThresholdPercent || 70,
          maxAttempts: initialItem?.quiz?.maxAttempts || 3,
          cooldownHours: initialItem?.quiz?.cooldownHours || 6,
          questions: sanitizedQuestionsPayload
        }
      };

      let url;
      let method;

      if (currentId) {
        url = `${apiBase}/courses/${courseId}/curriculum/lessons/${activeLesson._id}/items/${currentId}`;
        method = 'PATCH';
      } else {
        url = `${apiBase}/courses/${courseId}/curriculum/lessons/${activeLesson._id}/items`;
        method = 'POST';
      }

      const res = await fetch(url, {
        method,
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        toast?.success?.('Quiz saved successfully!');
        const savedItem = data.item || data.contentItem || payload;
        if (savedItem._id && !currentId) {
          setCurrentId(savedItem._id);
        }
        setIsSavedOnce(true);
        setSavedQuizSnapshot(savedItem);
        setHasUnsavedChanges(false);

        if (onSaveSuccess) {
          onSaveSuccess(savedItem);
        }
      } else {
        toast?.error?.(data.message || 'Failed to save quiz.');
      }
    } catch (err) {
      console.error('Quiz save network error:', err);
      toast?.error?.('Network error saving quiz.');
    } finally {
      setIsSaving(false);
    }
  };

  // Back Navigation with Dirty Check
  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved quiz changes. Are you sure you want to go back?')) {
        return;
      }
    }
    if (onBack) onBack();
  };

  return (
    <div className="dedicated-quiz-editor-container">
      {/* ── Top Header Actions Bar (Section 2.A) ── */}
      <div className="dqe-top-header">

        <div className="dqe-header-actions">
          <span
            className={`dqe-status-pill ${publicationStatus}`}
            onClick={() => {
              const nextStatus = publicationStatus === 'published' ? 'draft' : 'published';
              setPublicationStatus(nextStatus);
              markDirty();
            }}
            title="Click to toggle publication status"
            style={{ cursor: 'pointer' }}
          >
            • {publicationStatus === 'published' ? 'Published' : 'Draft'}
          </span>

          <button
            type="button"
            className="dqe-btn-save-quiz"
            onClick={handleSaveQuiz}
            disabled={isSaving}
          >
            <Check size={16} />
            <span>{isSaving ? 'Saving...' : 'Save Quiz'}</span>
          </button>
        </div>
      </div>

      {/* ── Sub-header: Back Arrow + Page Title + Preview Button ── */}
      <div className="dqe-page-title-row">
        <div className="dqe-title-left-group">
          <button
            type="button"
            className="dqe-btn-back-circle"
            onClick={handleBack}
            title="Back to Lesson workspace"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="dqe-page-titles">
            <h2 className="dqe-page-title">Quiz Editor</h2>
            <p className="dqe-page-subtitle">Create and manage quiz questions for this lesson.</p>
          </div>
        </div>

        <button
          type="button"
          className="dqe-btn-preview-quiz"
          // onClick={handleOpenPreviewQuiz}
          title={isSavedOnce ? 'Preview Quiz' : 'Save quiz first to preview'}
        >
          {/* <Eye size={15} /> */}
          <span>Preview Quiz</span>
        </button>
      </div>

      {/* ── 3-Column Layout Workspace ── */}
      <div className="dqe-layout-grid">
        {/* ════════════════════════════════════════════════════════════
            COLUMN 1: QUESTIONS LIST (MIDDLE-LEFT PANEL - Section 2.C)
            ════════════════════════════════════════════════════════════ */}
        <div className="dqe-question-list-column">
          <div className="dqe-question-list-card">
            <div className="dqe-question-list-header">
              <h3 className="dqe-questions-count-title">
                Questions ({totalQuestions})
              </h3>
              <button
                type="button"
                className="dqe-btn-add-question"
                onClick={handleAddQuestion}
              >
                <Plus size={14} />
                <span>Add Question</span>
              </button>
            </div>

            <div className="dqe-questions-scroll-list">
              {questions.map((q, idx) => {
                const isActive = idx === activeQuestionIndex;
                const typeLabel =
                  q.type === 'mcq'
                    ? 'Multiple Choice'
                    : q.type === 'multiple_response'
                      ? 'Multiple Response'
                      : 'True / False';

                return (
                  <div
                    key={q._id || idx}
                    className={`dqe-question-item-card ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveQuestionIndex(idx)}
                  >
                    <div className="dqe-item-drag-handle" title="Question order">
                      <GripVertical size={14} />
                    </div>

                    <div className="dqe-question-num-badge">
                      {idx + 1}
                    </div>

                    <div className="dqe-question-item-content">
                      <span className="dqe-item-prompt-preview" title={q.questionText}>
                        {q.questionText || `Question ${idx + 1}`}
                      </span>
                      <div className="dqe-item-meta-row">
                        <span className="dqe-item-type-label">{typeLabel}</span>
                        <span className="dqe-item-marks-tag">{q.marks || 1} {q.marks === 1 ? 'pt' : 'pts'}</span>
                      </div>
                    </div>

                    <div className="dqe-item-actions-menu">
                      <button
                        type="button"
                        className="dqe-btn-item-more"
                        onClick={(e) => handleRemoveQuestion(idx, e)}
                        title="Delete Question"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            COLUMN 2: QUESTION EDITOR (MAIN PANEL - Section 2.D)
            ════════════════════════════════════════════════════════════ */}
        <div className="dqe-question-editor-column">
          <div className="dqe-editor-card">
            {/* Header: Question Number --- Question Type selector + Marks input */}
            <div className="dqe-editor-header-row">
              <h3 className="dqe-editor-question-title">
                Question {activeQuestionIndex + 1}
              </h3>

              <div className="dqe-editor-controls-row">
                <div className="dqe-control-group">
                  <span className="dqe-control-label">Question Type</span>
                  <select
                    className="dqe-select-type"
                    value={activeQuestion.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                  >
                    <option value="mcq">Multiple Choice</option>
                    <option value="multiple_response">Multiple Response</option>
                    <option value="true_false">True or False</option>
                  </select>
                </div>

                <div className="dqe-control-group">
                  <span className="dqe-control-label">Marks</span>
                  <input
                    type="number"
                    min="1"
                    className="dqe-input-marks"
                    value={activeQuestion.marks || 1}
                    onChange={(e) => updateActiveQuestion('marks', Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </div>
              </div>
            </div>

            {/* Question Prompt Field with Rich-Text Toolbar */}
            <div className="dqe-field-block">
              <label className="dqe-field-label">
                Question <span className="required-star">*</span>
              </label>

              <div className="dqe-rich-toolbar">
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('prompt', '**', '**', 'bold text')}
                  title="Bold"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('prompt', '*', '*', 'italic text')}
                  title="Italic"
                >
                  <Italic size={13} />
                </button>
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('prompt', '<u>', '</u>', 'underlined')}
                  title="Underline"
                >
                  <Underline size={13} />
                </button>
                <div className="dqe-tool-sep" />
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('prompt', '\n- ', '', 'List item')}
                  title="Bullet list"
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('prompt', '\n1. ', '', 'Step item')}
                  title="Numbered list"
                >
                  <ListOrdered size={13} />
                </button>
                <div className="dqe-tool-sep" />
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('prompt', '[', '](https://example.com)', 'Link text')}
                  title="Insert link"
                >
                  <LinkIcon size={13} />
                </button>
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('prompt', '`', '`', 'code')}
                  title="Inline code"
                >
                  <Code size={13} />
                </button>
              </div>

              <textarea
                ref={promptTextareaRef}
                className="dqe-rich-textarea"
                rows={3}
                placeholder="Enter question prompt..."
                value={activeQuestion.questionText}
                onChange={(e) => updateActiveQuestion('questionText', e.target.value)}
              />
            </div>

            {/* Answer Options Field (Type Specific) */}
            <div className="dqe-field-block">
              <label className="dqe-field-label">
                Options <span className="required-star">*</span>
              </label>

              {activeQuestion.type === 'true_false' ? (
                /* True or False Simple Toggle Group */
                <div className="dqe-tf-group">
                  <button
                    type="button"
                    className={`dqe-tf-btn ${activeQuestion.correctAnswerIndex === 0 ? 'selected' : ''}`}
                    onClick={() => handleToggleCorrectOption(0)}
                  >
                    <CheckCircle2 size={18} />
                    <span>True</span>
                  </button>
                  <button
                    type="button"
                    className={`dqe-tf-btn ${activeQuestion.correctAnswerIndex === 1 ? 'selected' : ''}`}
                    onClick={() => handleToggleCorrectOption(1)}
                  >
                    <CheckCircle2 size={18} />
                    <span>False</span>
                  </button>
                </div>
              ) : (
                /* MCQ & Multiple Response Options List */
                <div className="dqe-options-list">
                  {activeQuestion.options.map((opt, optIndex) => {
                    const isSelected =
                      activeQuestion.type === 'multiple_response'
                        ? (activeQuestion.correctOptionIndexes || []).includes(optIndex)
                        : activeQuestion.correctAnswerIndex === optIndex;

                    const letter = String.fromCharCode(65 + optIndex);

                    return (
                      <div
                        key={optIndex}
                        className={`dqe-option-row ${isSelected ? 'correct' : ''}`}
                      >
                        <button
                          type="button"
                          className={`dqe-option-select-btn ${isSelected ? 'is-correct' : ''}`}
                          onClick={() => handleToggleCorrectOption(optIndex)}
                          title={`Click to mark ${letter} as ${isSelected ? 'incorrect' : 'correct'}`}
                        >
                          {isSelected ? <Check size={16} /> : letter}
                        </button>

                        <input
                          type="text"
                          className="dqe-option-input"
                          placeholder={`Option ${letter}`}
                          value={opt}
                          onChange={(e) => handleUpdateOptionText(optIndex, e.target.value)}
                        />

                        {isSelected && (
                          <div className="dqe-correct-check-icon" title="Marked as correct">
                            <CheckCircle2 size={18} />
                          </div>
                        )}

                        <button
                          type="button"
                          className="dqe-btn-delete-option"
                          disabled={activeQuestion.options.length <= 2}
                          onClick={() => handleRemoveOption(optIndex)}
                          title="Delete option"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}

                  <div className="dqe-options-bottom-row">
                    <button
                      type="button"
                      className="dqe-btn-add-option"
                      onClick={handleAddOption}
                      disabled={activeQuestion.options.length >= 6}
                    >
                      <Plus size={14} />
                      <span>Add Option</span>
                    </button>

                    <span className="dqe-mark-correct-hint">
                      Mark Correct Answer <Info size={13} />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Explanation Field with Rich-Text Toolbar (Section 8) */}
            <div className="dqe-field-block">
              <label className="dqe-field-label">
                Explanation (Optional)
              </label>

              <div className="dqe-rich-toolbar">
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('explanation', '**', '**', 'bold text')}
                  title="Bold"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('explanation', '*', '*', 'italic text')}
                  title="Italic"
                >
                  <Italic size={13} />
                </button>
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('explanation', '<u>', '</u>', 'underlined')}
                  title="Underline"
                >
                  <Underline size={13} />
                </button>
                <div className="dqe-tool-sep" />
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('explanation', '\n- ', '', 'List item')}
                  title="Bullet list"
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('explanation', '\n1. ', '', 'Step item')}
                  title="Numbered list"
                >
                  <ListOrdered size={13} />
                </button>
                <div className="dqe-tool-sep" />
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('explanation', '[', '](https://example.com)', 'Link text')}
                  title="Insert link"
                >
                  <LinkIcon size={13} />
                </button>
                <button
                  type="button"
                  className="dqe-tool-btn"
                  onClick={() => insertFormatting('explanation', '`', '`', 'code')}
                  title="Inline code"
                >
                  <Code size={13} />
                </button>
              </div>

              <textarea
                ref={explanationTextareaRef}
                className="dqe-rich-textarea"
                rows={3}
                placeholder="Explain the correct answer to learners after submission..."
                value={activeQuestion.explanation || ''}
                onChange={(e) => updateActiveQuestion('explanation', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            COLUMN 3: QUIZ SETTINGS & PREVIEW (RIGHT PANEL - Section 2.E)
            ════════════════════════════════════════════════════════════ */}
        <div className="dqe-settings-preview-column">
          {/* Card 1: Quiz Settings */}
          <div className="dqe-settings-card">
            <h3 className="dqe-card-title">Quiz Settings</h3>

            {/* Quiz Title */}
            <div className="dqe-field-block">
              <label className="dqe-field-label">
                Quiz Title <span className="required-star">*</span>
              </label>
              <input
                type="text"
                className="dqe-input-text"
                placeholder="e.g. Module 2 Quiz"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
              />
            </div>

            {/* Instructions */}
            <div className="dqe-field-block">
              <label className="dqe-field-label">
                Instructions (Optional)
              </label>
              <textarea
                className="dqe-textarea-instructions"
                maxLength={500}
                placeholder="Instructions for learners before taking the quiz..."
                value={instructions}
                onChange={(e) => {
                  setInstructions(e.target.value);
                  markDirty();
                }}
              />
              <span className="dqe-char-counter">
                {instructions.length}/500 characters
              </span>
            </div>

            {/* Note: Pass Threshold and Max Attempts REMOVED completely per Section 7 */}

            {/* Stats: Total Questions & Total Marks (Section 4 & 5) */}
            <div className="dqe-stats-list">
              <div className="dqe-stat-row">
                <div className="dqe-stat-left">
                  <HelpCircle size={16} className="dqe-stat-icon" />
                  <span>Total Questions</span>
                </div>
                <span className="dqe-stat-value">
                  {totalQuestions} {totalQuestions === 1 ? 'question' : 'questions'}
                </span>
              </div>

              <div className="dqe-stat-row">
                <div className="dqe-stat-left">
                  <Award size={16} className="dqe-stat-icon" />
                  <span>Total Marks</span>
                </div>
                <span className="dqe-stat-value">
                  {totalMarks} {totalMarks === 1 ? 'mark' : 'marks'}
                </span>
              </div>
            </div>

            {/* Time Limit (Optional) - Section 6 */}
            <div className="dqe-time-limit-box">
              <div className="dqe-time-limit-header">
                <div className="dqe-stat-left">
                  <Clock size={16} className="dqe-stat-icon" />
                  <span>Time Limit (Optional)</span>
                </div>

                <label className="dqe-switch-label">
                  <input
                    type="checkbox"
                    checked={hasTimeLimit}
                    onChange={(e) => {
                      setHasTimeLimit(e.target.checked);
                      markDirty();
                    }}
                  />
                  <span className="dqe-switch-slider" />
                </label>
              </div>

              {hasTimeLimit && (
                <div className="dqe-time-input-row">
                  <input
                    type="number"
                    min="1"
                    className="dqe-input-duration"
                    value={timeLimitMinutes}
                    onChange={(e) => {
                      setTimeLimitMinutes(Math.max(1, parseInt(e.target.value, 10) || 1));
                      markDirty();
                    }}
                  />
                  <span className="dqe-duration-unit">minutes</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Question Preview (Section 9) */}
          <div className="dqe-preview-card">
            <h3 className="dqe-card-title">Question Preview</h3>

            {!isSavedOnce ? (
              /* Before initial save: disabled/empty state */
              <div className="dqe-preview-locked-box">
                <Lock size={28} className="dqe-preview-locked-icon" />
                <h4 className="dqe-preview-locked-title">Preview Locked</h4>
                <p className="dqe-preview-locked-desc">
                  The quiz must be saved before question preview becomes available.
                </p>
              </div>
            ) : (
              /* After successful save: Interactive Preview */
              <div className="dqe-preview-content">
                {hasUnsavedChanges && (
                  <div className="dqe-preview-dirty-badge">
                    <Info size={13} />
                    <span>Preview shows saved version. Save to update.</span>
                  </div>
                )}

                <div className="dqe-preview-tabs">
                  <button
                    type="button"
                    className={`dqe-preview-tab-btn ${previewTab === 'learner' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('learner')}
                  >
                    Learner View
                  </button>
                  <button
                    type="button"
                    className={`dqe-preview-tab-btn ${previewTab === 'explanation' ? 'active' : ''}`}
                    onClick={() => setPreviewTab('explanation')}
                  >
                    Explanation View
                  </button>
                </div>

                {/* Display active question in preview format */}
                <div className="dqe-preview-question-prompt">
                  {activeQuestionIndex + 1}. {activeQuestion.questionText}
                </div>

                <div className="dqe-preview-options-list">
                  {activeQuestion.options.map((opt, idx) => {
                    const isCorrect =
                      activeQuestion.type === 'multiple_response'
                        ? (activeQuestion.correctOptionIndexes || []).includes(idx)
                        : activeQuestion.correctAnswerIndex === idx;

                    const letter = String.fromCharCode(65 + idx);

                    return (
                      <div
                        key={idx}
                        className={`dqe-preview-option-item ${isCorrect ? 'correct' : ''}`}
                      >
                        {isCorrect ? (
                          <CheckCircle2 size={16} className="dqe-preview-opt-icon text-success" />
                        ) : (
                          <Circle size={16} className="dqe-preview-opt-icon text-muted" />
                        )}
                        <span><strong>{letter}</strong> {opt}</span>
                      </div>
                    );
                  })}
                </div>

                {previewTab === 'explanation' && activeQuestion.explanation && (
                  <div className="dqe-preview-explanation-box">
                    <strong>Explanation:</strong> {activeQuestion.explanation}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
