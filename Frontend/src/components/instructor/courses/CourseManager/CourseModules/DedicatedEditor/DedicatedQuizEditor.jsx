import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Award,
  HelpCircle,
  MoreVertical,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  Image as ImageIcon,
  Settings,
  Search,
  Shuffle,
  FileText,
  Copy,
  ArrowUp,
  ArrowDown,
  X,
  RefreshCw
} from 'lucide-react';
import { API_BASE } from '../../../../../../config/api';
import './DedicatedQuizEditor.css';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice (Single Answer)', shortBadge: 'MCQ' },
  { value: 'multiple_response', label: 'Multiple Response', shortBadge: 'MR' },
  { value: 'true_false', label: 'True or False', shortBadge: 'T/F' }
];

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

  // Search Filter for questions list
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuIndex, setOpenMenuIndex] = useState(null);

  // Custom Question Type Dropdown Open State
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef(null);

  // Option Image Upload State & Refs
  const optionFileInputRef = useRef(null);
  const targetOptionIdxRef = useRef(null);
  const [uploadingOptionIdx, setUploadingOptionIdx] = useState(null);
  const [viewImageModalUrl, setViewImageModalUrl] = useState(null);

  // Default initial question if creating brand new quiz
  const defaultInitialQuestions = [
    {
      _id: 'q_init_1',
      questionText: 'Which React hook is used to manage state in a functional component?',
      type: 'mcq',
      options: [
        'useState()',
        'useEffect()',
        'useContext()',
        'useReducer()'
      ],
      optionImages: ['', '', '', ''],
      correctAnswerIndex: 0,
      correctOptionIndexes: [0],
      marks: 2,
      explanation: 'useState() is a React hook that allows you to add state variables to functional components.'
    }
  ];

  // Questions State
  const [questions, setQuestions] = useState(() => {
    if (initialItem?.quiz?.questions && Array.isArray(initialItem.quiz.questions) && initialItem.quiz.questions.length > 0) {
      return initialItem.quiz.questions.map((q, idx) => {
        let cleanType = (q.type || 'mcq').toLowerCase();
        if (cleanType === 'multiple_choice') cleanType = 'mcq';
        if (!['mcq', 'multiple_response', 'true_false'].includes(cleanType)) cleanType = 'mcq';

        let options = [];
        let optionImages = [];

        if (Array.isArray(q.options) && q.options.length > 0) {
          q.options.forEach((opt, oIdx) => {
            if (typeof opt === 'object' && opt !== null) {
              options.push(String(opt.text || '').trim());
              optionImages.push(String(opt.image || opt.imageUrl || '').trim());
            } else {
              options.push(String(opt || '').trim());
              const img = Array.isArray(q.optionImages) ? String(q.optionImages[oIdx] || '').trim() : '';
              optionImages.push(img);
            }
          });
        } else {
          options = cleanType === 'true_false' ? ['True', 'False'] : ['Option A', 'Option B'];
          optionImages = ['', ''];
        }

        while (optionImages.length < options.length) {
          optionImages.push('');
        }

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
          optionImages,
          correctAnswerIndex: correctIdx,
          correctOptionIndexes: correctMulti,
          marks: Math.max(1, Math.round(Number(q.marks) || 1)),
          explanation: q.explanation || q.evaluationInstructions || ''
        };
      });
    }
    return defaultInitialQuestions;
  });

  // Selected Active Question Index
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Save status & Unsaved Changes Protection
  const [isSavedOnce, setIsSavedOnce] = useState(() => isEditingExisting);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Active question context
  const activeQuestion = questions[activeQuestionIndex] || questions[0] || {
    questionText: '',
    type: 'mcq',
    options: ['Option A', 'Option B'],
    optionImages: ['', ''],
    correctAnswerIndex: 0,
    correctOptionIndexes: [0],
    marks: 1,
    explanation: ''
  };

  // Refs for rich text formatting & active question scroll
  const promptTextareaRef = useRef(null);
  const explanationTextareaRef = useRef(null);
  const instructionsTextareaRef = useRef(null);
  const activeQuestionCardRef = useRef(null);

  // Dirty Tracking
  const markDirty = () => setHasUnsavedChanges(true);

  // Automatically scroll active question card into view in the questions sidebar
  useEffect(() => {
    if (activeQuestionCardRef.current) {
      activeQuestionCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [activeQuestionIndex]);

  // Browser beforeunload protection
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Close menus on outside click
  useEffect(() => {
    const handleDocClick = (e) => {
      setOpenMenuIndex(null);
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // ── Calculated Values ──
  const totalQuestions = questions.length;
  const totalMarks = questions.reduce((sum, q) => sum + Math.max(1, Math.round(Number(q.marks) || 1)), 0);

  // Filtered Questions for Search
  const filteredQuestions = questions
    .map((q, originalIndex) => ({ ...q, originalIndex }))
    .filter(q => {
      if (!searchQuery.trim()) return true;
      const term = searchQuery.toLowerCase();
      return (
        (q.questionText || '').toLowerCase().includes(term) ||
        `question ${q.originalIndex + 1}`.includes(term) ||
        (q.type || '').toLowerCase().includes(term)
      );
    });

  // ── Question List Actions ──
  const handleAddQuestion = () => {
    const newQ = {
      _id: `q_${Date.now()}`,
      questionText: `New Question ${questions.length + 1}`,
      type: 'mcq',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      optionImages: ['', '', '', ''],
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

  const handleDuplicateQuestion = (index, e) => {
    if (e) e.stopPropagation();
    setOpenMenuIndex(null);
    const qToCopy = questions[index];
    const duplicated = {
      ...qToCopy,
      _id: `q_${Date.now()}`,
      questionText: `${qToCopy.questionText} (Copy)`,
      options: [...qToCopy.options],
      optionImages: [...(qToCopy.optionImages || qToCopy.options.map(() => ''))],
      correctOptionIndexes: [...(qToCopy.correctOptionIndexes || [0])]
    };
    const nextQuestions = [...questions];
    nextQuestions.splice(index + 1, 0, duplicated);
    setQuestions(nextQuestions);
    setActiveQuestionIndex(index + 1);
    markDirty();
    toast?.info?.('Question duplicated.');
  };

  const handleRemoveQuestion = (indexToRemove, e) => {
    if (e) e.stopPropagation();
    setOpenMenuIndex(null);
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
    setOpenMenuIndex(null);
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

  // Carousel Navigation Helpers
  const goToPrevQuestion = () => {
    if (activeQuestionIndex > 0) {
      setActiveQuestionIndex(activeQuestionIndex - 1);
    }
  };

  const goToNextQuestion = () => {
    if (activeQuestionIndex < questions.length - 1) {
      setActiveQuestionIndex(activeQuestionIndex + 1);
    }
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
    let updatedImages = [...(currentQ.optionImages || currentQ.options.map(() => ''))];
    let updatedCorrectIdx = currentQ.correctAnswerIndex;
    let updatedMulti = [...(currentQ.correctOptionIndexes || [0])];

    if (newType === 'true_false') {
      updatedOptions = ['True', 'False'];
      updatedImages = ['', ''];
      updatedCorrectIdx = updatedCorrectIdx > 1 ? 0 : updatedCorrectIdx;
      updatedMulti = [updatedCorrectIdx];
    } else if (currentQ.type === 'true_false') {
      updatedOptions = ['Option A', 'Option B', 'Option C', 'Option D'];
      updatedImages = ['', '', '', ''];
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
        optionImages: updatedImages,
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
    const updatedImages = [...(currentQ.optionImages || currentQ.options.map(() => '')), ''];

    setQuestions(prev => {
      const copy = [...prev];
      copy[activeQuestionIndex] = {
        ...copy[activeQuestionIndex],
        options: updatedOptions,
        optionImages: updatedImages
      };
      return copy;
    });
    markDirty();
  };

  const handleRemoveOption = (optIndex) => {
    const currentQ = questions[activeQuestionIndex];
    if (currentQ.options.length <= 2) {
      toast?.warning?.('A question requires at least 2 options.');
      return;
    }
    const updatedOptions = currentQ.options.filter((_, idx) => idx !== optIndex);
    const updatedImages = (currentQ.optionImages || []).filter((_, idx) => idx !== optIndex);
    while (updatedImages.length < updatedOptions.length) {
      updatedImages.push('');
    }

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
        optionImages: updatedImages,
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

  // Shuffle Options in-place
  const handleShuffleOptions = () => {
    const currentQ = questions[activeQuestionIndex];
    if (currentQ.type === 'true_false' || currentQ.options.length <= 1) return;

    const paired = currentQ.options.map((opt, idx) => ({
      opt,
      img: currentQ.optionImages?.[idx] || '',
      idx
    }));

    for (let i = paired.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [paired[i], paired[j]] = [paired[j], paired[i]];
    }

    const shuffledOptions = paired.map(p => p.opt);
    const shuffledImages = paired.map(p => p.img);
    const newCorrectIdx = paired.findIndex(p => p.idx === currentQ.correctAnswerIndex);
    const newMulti = (currentQ.correctOptionIndexes || [])
      .map(oldIdx => paired.findIndex(p => p.idx === oldIdx))
      .filter(idx => idx !== -1);

    setQuestions(prev => {
      const copy = [...prev];
      copy[activeQuestionIndex] = {
        ...copy[activeQuestionIndex],
        options: shuffledOptions,
        optionImages: shuffledImages,
        correctAnswerIndex: newCorrectIdx !== -1 ? newCorrectIdx : 0,
        correctOptionIndexes: newMulti.length > 0 ? newMulti : [0]
      };
      return copy;
    });
    markDirty();
    toast?.info?.('Options shuffled.');
  };

  // ── Option Image Upload Handling ──
  const handleTriggerOptionImageUpload = (optIndex) => {
    targetOptionIdxRef.current = optIndex;
    if (optionFileInputRef.current) {
      optionFileInputRef.current.value = '';
      optionFileInputRef.current.click();
    }
  };

  const handleOptionFileChange = async (e) => {
    const file = e.target.files?.[0];
    const optIndex = targetOptionIdxRef.current;
    if (!file || optIndex === null || optIndex === undefined) return;

    if (!file.type.startsWith('image/')) {
      toast?.error?.('Please select a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast?.error?.('Image size must be less than 5MB.');
      return;
    }

    setUploadingOptionIdx(optIndex);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpointHeaders = getAuthHeader ? getAuthHeader() : {};
      const cleanHeaders = { ...endpointHeaders };
      delete cleanHeaders['Content-Type'];

      let finalUrl = '';

      if (courseId) {
        const uploadUrl = `${apiBase}/courses/${courseId}/curriculum/upload/resource`;
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: cleanHeaders,
          body: formData
        });
        const data = await res.json();
        if (data.success && (data.url || data.fileUrl || data.secure_url)) {
          finalUrl = data.url || data.fileUrl || data.secure_url;
        } else {
          throw new Error(data.message || 'Upload failed');
        }
      } else {
        finalUrl = URL.createObjectURL(file);
      }

      setQuestions(prev => {
        const copy = [...prev];
        const currentQ = copy[activeQuestionIndex];
        const updatedImages = [...(currentQ.optionImages || currentQ.options.map(() => ''))];
        while (updatedImages.length < currentQ.options.length) updatedImages.push('');
        updatedImages[optIndex] = finalUrl;
        copy[activeQuestionIndex] = {
          ...currentQ,
          optionImages: updatedImages
        };
        return copy;
      });

      markDirty();
      toast?.success?.(`Image attached to Option ${String.fromCharCode(65 + optIndex)}.`);
    } catch (err) {
      console.error('Option image upload error:', err);
      toast?.error?.(err.message || 'Failed to upload option image.');
    } finally {
      setUploadingOptionIdx(null);
      targetOptionIdxRef.current = null;
    }
  };

  const handleRemoveOptionImage = (optIndex, e) => {
    if (e) e.stopPropagation();
    setQuestions(prev => {
      const copy = [...prev];
      const currentQ = copy[activeQuestionIndex];
      const updatedImages = [...(currentQ.optionImages || currentQ.options.map(() => ''))];
      while (updatedImages.length < currentQ.options.length) updatedImages.push('');
      updatedImages[optIndex] = '';
      copy[activeQuestionIndex] = {
        ...currentQ,
        optionImages: updatedImages
      };
      return copy;
    });
    markDirty();
    toast?.info?.(`Image removed from Option ${String.fromCharCode(65 + optIndex)}.`);
  };

  // ── Rich Text Helpers ──
  const insertFormatting = (targetField, prefix, suffix, defaultPlaceholder = '') => {
    let textarea;
    if (targetField === 'prompt') textarea = promptTextareaRef.current;
    else if (targetField === 'explanation') textarea = explanationTextareaRef.current;
    else if (targetField === 'instructions') textarea = instructionsTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    const selectedText = currentValue.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const nextValue = currentValue.substring(0, start) + replacement + currentValue.substring(end);

    if (targetField === 'prompt') updateActiveQuestion('questionText', nextValue);
    else if (targetField === 'explanation') updateActiveQuestion('explanation', nextValue);
    else if (targetField === 'instructions') {
      setInstructions(nextValue);
      markDirty();
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  // ── Save Quiz to Backend ──
  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      toast?.error?.('Please enter a Quiz Title.');
      return;
    }

    if (questions.length === 0) {
      toast?.error?.('A quiz requires at least one question.');
      return;
    }

    // Question validation
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

    setIsSaving(true);
    try {
      const sanitizedQuestionsPayload = questions.map((q, idx) => ({
        _id: String(q._id).startsWith('q_') ? undefined : q._id,
        questionText: q.questionText.trim(),
        type: q.type,
        options: q.type === 'true_false' ? ['True', 'False'] : q.options.map(o => o.trim()),
        optionImages: q.type === 'true_false' ? ['', ''] : (q.optionImages || []).slice(0, q.options.length),
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
          hasTimeLimit: false,
          timeLimit: null,
          durationMinutes: null,
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

  // Back Navigation with Dirty Check Confirmation Modal
  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
      return;
    }
    if (onBack) onBack();
  };

  // Helper for Type Badges in Questions List
  const renderTypeBadge = (type) => {
    switch (type) {
      case 'true_false':
        return <span className="dqe-type-badge tf">T/F</span>;
      case 'multiple_response':
        return <span className="dqe-type-badge mr">MR</span>;
      case 'mcq':
      default:
        return <span className="dqe-type-badge mcq">MCQ</span>;
    }
  };

  return (
    <div className="dedicated-quiz-editor-container">
      {/* Hidden file input for option images */}
      <input
        ref={optionFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleOptionFileChange}
      />

      {/* ── Unified Top Header ── */}
      <header className="dqe-unified-header">
        <div className="dqe-header-left">
          <button
            type="button"
            className="dqe-btn-back-circle"
            onClick={handleBack}
            title="Back to Lesson Workspace"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="dqe-header-title-cluster">
            <h1 className="dqe-main-title">Quiz Editor</h1>
            {activeLesson?.title && (
              <span className="dqe-lesson-badge" title={activeLesson.title}>
                Lesson: {activeLesson.title}
              </span>
            )}
          </div>
        </div>

        <div className="dqe-header-right">
          <div
            className={`dqe-status-pill ${publicationStatus}`}
            onClick={() => {
              const nextStatus = publicationStatus === 'published' ? 'draft' : 'published';
              setPublicationStatus(nextStatus);
              markDirty();
              toast?.info?.(`Quiz marked as ${nextStatus}. Remember to save.`);
            }}
            title="Click to toggle publication status"
          >
            <span className="dqe-status-dot" />
            <span className="dqe-status-label">
              {publicationStatus === 'published' ? 'Published' : 'Draft'}
            </span>
          </div>

          <button
            type="button"
            className="dqe-btn-save-quiz"
            onClick={handleSaveQuiz}
            disabled={isSaving}
          >
            {isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Check size={15} />
                <span>Save Quiz</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── 3-Column Layout Workspace ── */}
      <div className="dqe-layout-grid">
        {/* ════════════════════════════════════════════════════════════
            COLUMN 1: QUESTIONS LIST (~23% width) - Fixed Height & Scrollable
            ════════════════════════════════════════════════════════════ */}
        <div className="dqe-question-list-column">
          <div className="dqe-column-card dqe-questions-card">
            {/* Header: Title with Count + Add Question Button */}
            <div className="dqe-questions-header">
              <h2 className="dqe-questions-heading">
                Questions ({totalQuestions})
              </h2>
              <button
                type="button"
                className="dqe-btn-add-question"
                onClick={handleAddQuestion}
                title="Add new question"
              >
                <Plus size={13} />
                <span>Add Question</span>
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="dqe-search-wrap">
              <Search size={13} className="dqe-search-icon" />
              <input
                type="text"
                className="dqe-search-input"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Scrollable Questions Rows */}
            <div className="dqe-questions-scroll-list">
              {filteredQuestions.length === 0 ? (
                <div className="dqe-empty-questions">
                  <span>No questions match "{searchQuery}"</span>
                </div>
              ) : (
                filteredQuestions.map((q) => {
                  const originalIdx = q.originalIndex;
                  const isActive = originalIdx === activeQuestionIndex;
                  const isMenuOpen = openMenuIndex === originalIdx;

                  return (
                    <div
                      key={q._id || originalIdx}
                      ref={isActive ? activeQuestionCardRef : null}
                      className={`dqe-question-row-card ${isActive ? 'is-active' : ''}`}
                      onClick={() => setActiveQuestionIndex(originalIdx)}
                    >
                      <div className="dqe-row-drag-handle" title="Drag to reorder">
                        <GripVertical size={13} />
                      </div>

                      <div className="dqe-row-num-badge">
                        {originalIdx + 1}
                      </div>

                      <div className="dqe-row-type-col">
                        {renderTypeBadge(q.type)}
                      </div>

                      <div className="dqe-row-info-col">
                        <span className="dqe-row-prompt-text" title={q.questionText}>
                          {q.questionText || `Question ${originalIdx + 1}`}
                        </span>
                        <span className="dqe-row-marks-text">
                          {q.marks || 1} {q.marks === 1 ? 'mark' : 'marks'}
                        </span>
                      </div>

                      {/* 3-Dot More Actions Menu */}
                      <div
                        className="dqe-row-actions-wrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="dqe-btn-more-dots"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuIndex(prev => prev === originalIdx ? null : originalIdx);
                          }}
                          title="Question Options"
                        >
                          <MoreVertical size={13} />
                        </button>

                        {isMenuOpen && (
                          <div className="dqe-row-dropdown-menu">
                            <button
                              type="button"
                              className="dqe-dropdown-item"
                              disabled={originalIdx === 0}
                              onClick={(e) => handleMoveQuestion(originalIdx, 'up', e)}
                            >
                              <ArrowUp size={12} />
                              <span>Move Up</span>
                            </button>
                            <button
                              type="button"
                              className="dqe-dropdown-item"
                              disabled={originalIdx === questions.length - 1}
                              onClick={(e) => handleMoveQuestion(originalIdx, 'down', e)}
                            >
                              <ArrowDown size={12} />
                              <span>Move Down</span>
                            </button>
                            <button
                              type="button"
                              className="dqe-dropdown-item"
                              onClick={(e) => handleDuplicateQuestion(originalIdx, e)}
                            >
                              <Copy size={12} />
                              <span>Duplicate</span>
                            </button>
                            <div className="dqe-dropdown-divider" />
                            <button
                              type="button"
                              className="dqe-dropdown-item item-danger"
                              disabled={questions.length <= 1}
                              onClick={(e) => handleRemoveQuestion(originalIdx, e)}
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            COLUMN 2: QUESTION EDITOR (~50% width)
            ════════════════════════════════════════════════════════════ */}
        <div className="dqe-question-editor-column">
          <div className="dqe-column-card dqe-editor-card">
            {/* Card Header: Green Icon + Title + Pagination + Delete Question Button */}
            <div className="dqe-editor-header-bar">
              <div className="dqe-editor-header-left">
                <div className="dqe-editor-icon-badge">
                  <FileText size={16} />
                </div>
                <h2 className="dqe-editor-card-heading">
                  Question {activeQuestionIndex + 1}
                </h2>
              </div>

              {/* Navigation Carousel: < 1/5 > */}
              <div className="dqe-carousel-controls">
                <button
                  type="button"
                  className="dqe-btn-carousel"
                  disabled={activeQuestionIndex === 0}
                  onClick={goToPrevQuestion}
                  title="Previous Question"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="dqe-carousel-counter">
                  {activeQuestionIndex + 1}/{totalQuestions}
                </span>
                <button
                  type="button"
                  className="dqe-btn-carousel"
                  disabled={activeQuestionIndex === questions.length - 1}
                  onClick={goToNextQuestion}
                  title="Next Question"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Delete Question Button */}
              <button
                type="button"
                className="dqe-btn-delete-question-card"
                disabled={questions.length <= 1}
                onClick={(e) => handleRemoveQuestion(activeQuestionIndex, e)}
                title="Delete this question"
              >
                <Trash2 size={13} />
                <span>Delete Question</span>
              </button>
            </div>

            {/* Top Row: Question Type (Custom Accessible Dropdown) + Marks */}
            <div className="dqe-type-marks-row">
              <div className="dqe-form-group dqe-type-group" ref={typeDropdownRef}>
                <label className="dqe-form-label">
                  Question Type
                </label>
                <div className="dqe-custom-dropdown-wrap">
                  <button
                    type="button"
                    className={`dqe-custom-dropdown-trigger ${isTypeDropdownOpen ? 'is-open' : ''}`}
                    onClick={() => setIsTypeDropdownOpen(prev => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={isTypeDropdownOpen}
                  >
                    <span className="dqe-dropdown-current-label">
                      {QUESTION_TYPES.find(t => t.value === activeQuestion.type)?.label || 'Multiple Choice (Single Answer)'}
                    </span>
                    <ChevronDown size={14} className={`dqe-dropdown-chevron ${isTypeDropdownOpen ? 'is-rotated' : ''}`} />
                  </button>

                  {isTypeDropdownOpen && (
                    <div className="dqe-custom-dropdown-menu" role="listbox">
                      {QUESTION_TYPES.map(t => {
                        const isSelected = activeQuestion.type === t.value;
                        return (
                          <button
                            key={t.value}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            className={`dqe-custom-dropdown-item ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => {
                              handleTypeChange(t.value);
                              setIsTypeDropdownOpen(false);
                            }}
                          >
                            <div className="dqe-dropdown-item-left">
                              <span className={`dqe-type-badge ${t.value === 'mcq' ? 'mcq' : t.value === 'true_false' ? 'tf' : 'mr'}`}>
                                {t.shortBadge}
                              </span>
                              <span className="dqe-dropdown-item-text">{t.label}</span>
                            </div>
                            {isSelected && <Check size={14} className="dqe-dropdown-check" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="dqe-form-group dqe-marks-group">
                <label className="dqe-form-label">
                  Marks <span className="dqe-req">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="dqe-form-input dqe-input-marks"
                  value={activeQuestion.marks || 1}
                  onChange={(e) => updateActiveQuestion('marks', Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>
            </div>

            {/* Question Prompt Field with Compact Rich-Text Toolbar */}
            <div className="dqe-form-group">
              <label className="dqe-form-label">
                Question <span className="dqe-req">*</span>
              </label>

              <div className="dqe-rich-editor-box">
                <div className="dqe-compact-toolbar">
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('prompt', '**', '**', 'bold')}
                    title="Bold"
                  >
                    <Bold size={12} />
                  </button>
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('prompt', '*', '*', 'italic')}
                    title="Italic"
                  >
                    <Italic size={12} />
                  </button>
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('prompt', '<u>', '</u>', 'underline')}
                    title="Underline"
                  >
                    <Underline size={12} />
                  </button>
                  <div className="dqe-tool-divider" />
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('prompt', '\n- ', '', 'List item')}
                    title="Bullet List"
                  >
                    <List size={12} />
                  </button>
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('prompt', '\n1. ', '', 'Item')}
                    title="Numbered List"
                  >
                    <ListOrdered size={12} />
                  </button>
                  <div className="dqe-tool-divider" />
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('prompt', '[', '](https://)', 'Link')}
                    title="Insert Link"
                  >
                    <LinkIcon size={12} />
                  </button>
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('prompt', '`', '`', 'code')}
                    title="Inline Code"
                  >
                    <Code size={12} />
                  </button>
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('prompt', '![Image](', ')', 'https://')}
                    title="Insert Image"
                  >
                    <ImageIcon size={12} />
                  </button>
                </div>

                <textarea
                  ref={promptTextareaRef}
                  className="dqe-compact-textarea dqe-textarea-prompt"
                  rows={3}
                  placeholder="Enter the question prompt here..."
                  value={activeQuestion.questionText}
                  onChange={(e) => updateActiveQuestion('questionText', e.target.value)}
                />
              </div>
            </div>

            {/* Options Section with Shuffle Options Action */}
            <div className="dqe-form-group">
              <div className="dqe-options-label-row">
                <label className="dqe-form-label">
                  Options <span className="dqe-req">*</span>
                </label>

                {activeQuestion.type !== 'true_false' && (
                  <button
                    type="button"
                    className="dqe-btn-shuffle-options"
                    onClick={handleShuffleOptions}
                    title="Randomly shuffle options order"
                  >
                    <Shuffle size={12} />
                    <span>Shuffle Options</span>
                  </button>
                )}
              </div>

              {activeQuestion.type === 'true_false' ? (
                /* True / False Toggle Cards */
                <div className="dqe-tf-cards-row">
                  {['True', 'False'].map((label, optIdx) => {
                    const isSelected = activeQuestion.correctAnswerIndex === optIdx;
                    return (
                      <button
                        key={label}
                        type="button"
                        className={`dqe-tf-card-btn ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => handleToggleCorrectOption(optIdx)}
                      >
                        <div className={`dqe-radio-indicator ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <div className="dqe-radio-inner-dot" />}
                        </div>
                        <span className="dqe-tf-label">{label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* MCQ & Multiple Response Options List */
                <div className="dqe-options-stack">
                  {activeQuestion.options.map((opt, optIndex) => {
                    const isSelected =
                      activeQuestion.type === 'multiple_response'
                        ? (activeQuestion.correctOptionIndexes || []).includes(optIndex)
                        : activeQuestion.correctAnswerIndex === optIndex;

                    const letter = String.fromCharCode(65 + optIndex);
                    const optImage = activeQuestion.optionImages?.[optIndex];
                    const isUploadingThis = uploadingOptionIdx === optIndex;

                    return (
                      <div
                        key={optIndex}
                        className={`dqe-option-edit-row ${isSelected ? 'is-correct' : ''}`}
                      >
                        {/* Radio or Checkbox Toggle for Correct Answer */}
                        <button
                          type="button"
                          className="dqe-btn-option-toggle"
                          onClick={() => handleToggleCorrectOption(optIndex)}
                          title={`Click to mark ${letter} as ${isSelected ? 'incorrect' : 'correct'}`}
                        >
                          {activeQuestion.type === 'multiple_response' ? (
                            <div className={`dqe-checkbox-indicator ${isSelected ? 'checked' : ''}`}>
                              {isSelected && <Check size={11} strokeWidth={3} />}
                            </div>
                          ) : (
                            <div className={`dqe-radio-indicator ${isSelected ? 'checked' : ''}`}>
                              {isSelected && <div className="dqe-radio-inner-dot" />}
                            </div>
                          )}
                        </button>

                        <span className="dqe-option-letter-prefix">
                          {letter}.
                        </span>

                        <div className="dqe-option-field-wrap">
                          <input
                            type="text"
                            className={`dqe-form-input dqe-input-option-text ${isSelected ? 'correct-bg' : ''}`}
                            placeholder={`Option ${letter}`}
                            value={opt}
                            onChange={(e) => handleUpdateOptionText(optIndex, e.target.value)}
                          />

                          {/* Image Thumbnail inside option row if attached */}
                          {optImage && (
                            <div className="dqe-option-thumb-container">
                              <img
                                src={optImage}
                                alt={`Option ${letter}`}
                                className="dqe-option-thumb-img"
                                onClick={() => setViewImageModalUrl(optImage)}
                                title="Click to view image"
                              />
                              <button
                                type="button"
                                className="dqe-btn-remove-thumb"
                                onClick={(e) => handleRemoveOptionImage(optIndex, e)}
                                title="Remove image"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Image Upload Button */}
                        <button
                          type="button"
                          className={`dqe-btn-option-icon ${optImage ? 'has-image' : ''}`}
                          title={optImage ? "Replace image" : "Attach image to option"}
                          disabled={isUploadingThis}
                          onClick={() => handleTriggerOptionImageUpload(optIndex)}
                        >
                          {isUploadingThis ? (
                            <RefreshCw size={14} className="dqe-spin-icon" />
                          ) : (
                            <ImageIcon size={14} />
                          )}
                        </button>

                        {/* Delete Option Icon */}
                        <button
                          type="button"
                          className="dqe-btn-delete-option"
                          disabled={activeQuestion.options.length <= 2}
                          onClick={() => handleRemoveOption(optIndex)}
                          title="Remove option"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}

                  <div className="dqe-options-bottom-actions">
                    <button
                      type="button"
                      className="dqe-btn-add-option"
                      onClick={handleAddOption}
                      disabled={activeQuestion.options.length >= 6}
                    >
                      <Plus size={13} />
                      <span>Add Option</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Correct Answer Display / Selector */}
            {activeQuestion.type === 'mcq' && (
              <div className="dqe-form-group">
                <label className="dqe-form-label">
                  Correct Answer <span className="dqe-req">*</span>
                </label>
                <div className="dqe-select-wrapper">
                  <select
                    className="dqe-form-select"
                    value={activeQuestion.correctAnswerIndex}
                    onChange={(e) => handleToggleCorrectOption(Number(e.target.value))}
                  >
                    {activeQuestion.options.map((opt, i) => (
                      <option key={i} value={i}>
                        {String.fromCharCode(65 + i)}. {opt || `Option ${String.fromCharCode(65 + i)}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="dqe-select-chevron" />
                </div>
              </div>
            )}

            {activeQuestion.type === 'multiple_response' && (
              <div className="dqe-form-group">
                <label className="dqe-form-label">
                  Correct Answers <span className="dqe-req">*</span>
                </label>
                <div className="dqe-multi-correct-summary">
                  {(activeQuestion.correctOptionIndexes || []).length === 0 ? (
                    <span className="dqe-none-selected">Please check at least one correct option above.</span>
                  ) : (
                    <div className="dqe-multi-correct-tags">
                      {(activeQuestion.correctOptionIndexes || []).map((idx) => (
                        <span key={idx} className="dqe-correct-pill-tag">
                          {String.fromCharCode(65 + idx)}. {activeQuestion.options[idx] || `Option ${String.fromCharCode(65 + idx)}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Explanation Field with Compact Toolbar */}
            <div className="dqe-form-group">
              <label className="dqe-form-label">
                Explanation (Optional)
              </label>

              <div className="dqe-rich-editor-box">
                <div className="dqe-compact-toolbar">
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('explanation', '**', '**', 'bold')}
                    title="Bold"
                  >
                    <Bold size={12} />
                  </button>
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('explanation', '*', '*', 'italic')}
                    title="Italic"
                  >
                    <Italic size={12} />
                  </button>
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('explanation', '<u>', '</u>', 'underline')}
                    title="Underline"
                  >
                    <Underline size={12} />
                  </button>
                  <div className="dqe-tool-divider" />
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('explanation', '\n- ', '', 'List item')}
                    title="Bullet List"
                  >
                    <List size={12} />
                  </button>
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('explanation', '\n1. ', '', 'Item')}
                    title="Numbered List"
                  >
                    <ListOrdered size={12} />
                  </button>
                  <div className="dqe-tool-divider" />
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('explanation', '[', '](https://)', 'Link')}
                    title="Insert Link"
                  >
                    <LinkIcon size={12} />
                  </button>
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('explanation', '`', '`', 'code')}
                    title="Inline Code"
                  >
                    <Code size={12} />
                  </button>
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('explanation', '![Image](', ')', 'https://')}
                    title="Insert Image"
                  >
                    <ImageIcon size={12} />
                  </button>
                </div>

                <textarea
                  ref={explanationTextareaRef}
                  className="dqe-compact-textarea dqe-textarea-explanation"
                  rows={2}
                  placeholder="Explain the correct answer to learners after submission..."
                  value={activeQuestion.explanation || ''}
                  onChange={(e) => updateActiveQuestion('explanation', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            COLUMN 3: QUIZ SETTINGS (~27% width)
            (Time Limit and Question Preview completely removed)
            ════════════════════════════════════════════════════════════ */}
        <div className="dqe-settings-column">
          <div className="dqe-column-card dqe-settings-card">
            <div className="dqe-card-header-row">
              <Settings size={16} className="dqe-card-header-icon" />
              <h2 className="dqe-card-header-title">Quiz Settings</h2>
            </div>

            {/* Quiz Title */}
            <div className="dqe-form-group">
              <label className="dqe-form-label">
                Quiz Title <span className="dqe-req">*</span>
              </label>
              <input
                type="text"
                className="dqe-form-input dqe-input-title"
                placeholder="e.g. Lesson Quiz"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
              />
            </div>

            {/* Instructions (Optional) with Toolbar & Character Counter */}
            <div className="dqe-form-group">
              <label className="dqe-form-label">
                Instructions (Optional)
              </label>
              <div className="dqe-rich-editor-box">
                <div className="dqe-compact-toolbar">
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('instructions', '**', '**', 'bold')}
                    title="Bold"
                  >
                    <Bold size={12} />
                  </button>
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('instructions', '*', '*', 'italic')}
                    title="Italic"
                  >
                    <Italic size={12} />
                  </button>
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('instructions', '<u>', '</u>', 'underline')}
                    title="Underline"
                  >
                    <Underline size={12} />
                  </button>
                  <div className="dqe-tool-divider" />
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('instructions', '\n- ', '', 'List item')}
                    title="Bullet List"
                  >
                    <List size={12} />
                  </button>
                  <button
                    type="button"
                    className="dqe-tool-btn"
                    onClick={() => insertFormatting('instructions', '[', '](https://)', 'Link')}
                    title="Link"
                  >
                    <LinkIcon size={12} />
                  </button>
                </div>
                <textarea
                  ref={instructionsTextareaRef}
                  className="dqe-compact-textarea dqe-textarea-instructions"
                  rows={3}
                  maxLength={500}
                  placeholder="Answer all the questions carefully. You can attempt the quiz only once."
                  value={instructions}
                  onChange={(e) => {
                    setInstructions(e.target.value);
                    markDirty();
                  }}
                />
              </div>
              <div className="dqe-char-counter">
                {instructions.length}/500 characters
              </div>
            </div>

            {/* Side-by-Side Metric Boxes: Total Questions & Total Marks */}
            <div className="dqe-metrics-duo-row">
              <div className="dqe-metric-box">
                <div className="dqe-metric-top">
                  <HelpCircle size={14} className="dqe-metric-icon green" />
                  <span className="dqe-metric-label">Total Questions</span>
                </div>
                <div className="dqe-metric-num-display">
                  {totalQuestions}
                </div>
              </div>

              <div className="dqe-metric-box">
                <div className="dqe-metric-top">
                  <Award size={14} className="dqe-metric-icon green" />
                  <span className="dqe-metric-label">Total Marks</span>
                </div>
                <div className="dqe-metric-num-display">
                  {totalMarks}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Image Lightbox Modal ── */}
      {viewImageModalUrl && (
        <div
          className="dqe-image-modal-backdrop"
          onClick={() => setViewImageModalUrl(null)}
        >
          <div
            className="dqe-image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dqe-image-modal-header">
              <span className="dqe-image-modal-title">Option Image Preview</span>
              <button
                type="button"
                className="dqe-btn-modal-close"
                onClick={() => setViewImageModalUrl(null)}
              >
                <X size={16} />
              </button>
            </div>
            <img
              src={viewImageModalUrl}
              alt="Option preview"
              className="dqe-image-modal-img"
            />
          </div>
        </div>
      )}

      {/* ── Unsaved Changes Confirmation Modal ── */}
      {showUnsavedModal && (
        <div className="dqe-modal-backdrop">
          <div className="dqe-modal-box">
            <div className="dqe-modal-icon-wrap">
              <ArrowLeft size={22} />
            </div>
            <h3 className="dqe-modal-title">Unsaved Changes</h3>
            <p className="dqe-modal-message">
              You have unsaved changes in this quiz. Leaving without saving will discard your modifications.
            </p>
            <div className="dqe-modal-actions">
              <button
                type="button"
                className="dqe-btn-modal-cancel"
                onClick={() => setShowUnsavedModal(false)}
              >
                Continue Editing
              </button>
              <button
                type="button"
                className="dqe-btn-modal-discard"
                onClick={() => {
                  setShowUnsavedModal(false);
                  setHasUnsavedChanges(false);
                  if (onBack) onBack();
                }}
              >
                Discard Changes
              </button>
              <button
                type="button"
                className="dqe-btn-modal-save"
                onClick={async () => {
                  await handleSaveQuiz();
                  setShowUnsavedModal(false);
                  if (onBack) onBack();
                }}
              >
                Save & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
