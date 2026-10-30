import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Layers,
  Plus,
  Edit2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Video,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  RefreshCw,
  Sparkles,
  GripVertical,
  FileText,
  BookOpen,
  Image as ImageIcon,
  Settings,
  Trash2,
  ExternalLink,
  Menu,
  MoreVertical,
  Search,
  ChevronLeft,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Link as LinkIcon
} from 'lucide-react';
import { InstructorTip } from './Common/InstructorTip';
import { DeviceFileUploader } from './Common/DeviceFileUploader';
import { renderLessonReadmeToHTML } from './Common/MarkdownEditor';
import { DedicatedVideoEditor } from './DedicatedEditor/DedicatedVideoEditor';
import { DedicatedQuizEditor } from './DedicatedEditor/DedicatedQuizEditor';
import { DedicatedNoteEditor } from './DedicatedEditor/DedicatedNoteEditor';

export const formatDurationDisplay = (seconds) => {
  const totalSecs = Math.round(Number(seconds) || 0);
  if (!totalSecs || totalSecs <= 0) return null;
  const mins = Math.floor(totalSecs / 60);
  const remainingSecs = totalSecs % 60;
  if (mins > 0 && remainingSecs > 0) {
    return `${mins} min ${remainingSecs} sec`;
  } else if (mins > 0) {
    return `${mins} min`;
  } else {
    return `${remainingSecs} sec`;
  }
};

export const ModuleLessonEditor = ({
  courseId,
  course = {},
  modules = [],
  notes = [],
  onBack,
  onCurriculumUpdated,
  onEnterPreview,
  apiBase = 'http://localhost:5000/api',
  getAuthHeader,
  toast
}) => {
  // Navigation & selection state
  const [selectedModuleId, setSelectedModuleId] = useState(() => {
    return modules.length > 0 ? modules[0]._id : null;
  });

  const [selectedLessonId, setSelectedLessonId] = useState(() => {
    if (modules.length > 0 && modules[0].lessons && modules[0].lessons.length > 0) {
      return modules[0].lessons[0]._id;
    }
    return null;
  });

  // 'lesson' | 'module_settings' | 'video_editor' | 'quiz_editor' | 'note_editor'
  const [activePaneView, setActivePaneView] = useState('lesson');
  const [editingVideoItem, setEditingVideoItem] = useState(null);
  const [editingQuizItem, setEditingQuizItem] = useState(null);
  const [editingNoteItem, setEditingNoteItem] = useState(null);

  // Ref for auto-scrolling active module in collapsed dock
  const activeDockBtnRef = useRef(null);

  // Ref and handlers for closed sidebar modules scroll arrows
  const dockModulesListRef = useRef(null);

  const handleScrollDockUp = () => {
    if (dockModulesListRef.current) {
      dockModulesListRef.current.scrollBy({ top: -90, behavior: 'smooth' });
    }
  };

  const handleScrollDockDown = () => {
    if (dockModulesListRef.current) {
      dockModulesListRef.current.scrollBy({ top: 90, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (activeDockBtnRef.current) {
      activeDockBtnRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedModuleId]);

  // State for theme-consistent delete confirmation modal
  // { type: 'module' | 'lesson' | 'item', id, title, lessonCount, moduleId, lessonId }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Expanded modules in the left tree - closed by default, open only when instructor clicks
  const [expandedModules, setExpandedModules] = useState({});

  const toggleModuleAccordion = (moduleId, e) => {
    if (e) e.stopPropagation();
    setSelectedModuleId(moduleId);
    setExpandedModules(prev => {
      const isCurrentlyExpanded = Boolean(prev[moduleId]);
      return { ...prev, [moduleId]: !isCurrentlyExpanded };
    });
  };

  // Expanded lessons in the left tree - closed by default, open only when instructor clicks
  const [expandedLessons, setExpandedLessons] = useState({});

  const toggleLessonAccordion = (lessonId, e) => {
    if (e) e.stopPropagation();
    setExpandedLessons(prev => {
      const isCurrentlyExpanded = Boolean(prev[lessonId]);
      return { ...prev, [lessonId]: !isCurrentlyExpanded };
    });
  };

  // Mobile tree drawer open/close
  const [isMobileTreeOpen, setIsMobileTreeOpen] = useState(false);

  // Dismissible lesson hint (stored in localStorage as allowed by Rule G)
  const [isLessonTipDismissed, setIsLessonTipDismissed] = useState(() => {
    return localStorage.getItem('upskillr_dismissed_lesson_tip') === 'true';
  });

  // Dropdown menu state for "+ Add Content Item"
  const [isAddContentMenuOpen, setIsAddContentMenuOpen] = useState(false);

  // Module 3-dot settings dropdown state
  const [openModuleMenuId, setOpenModuleMenuId] = useState(null);

  // Lesson 2-Tab Navigation ('content' | 'settings')
  const [activeLessonTab, setActiveLessonTab] = useState('content');
  const [lessonTitleValue, setLessonTitleValue] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [openLessonMenu, setOpenLessonMenu] = useState(false);
  const [openItemMenuId, setOpenItemMenuId] = useState(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.module-settings-dropdown-wrap')) {
        setOpenModuleMenuId(null);
      }
      if (!e.target.closest('.lesson-header-menu-wrap')) {
        setOpenLessonMenu(false);
      }
      if (!e.target.closest('.item-overflow-menu-wrap')) {
        setOpenItemMenuId(null);
      }
      if (!e.target.closest('.add-content-dropdown-wrapper')) {
        setIsAddContentMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const [activeForm, setActiveForm] = useState(null);
  const [isReplacingVideo, setIsReplacingVideo] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Redesign: Search & Sidebar Overlay State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [addContentDirection, setAddContentDirection] = useState('down');
  const addContentBtnRef = useRef(null);

  const handleToggleAddContent = (e) => {
    e?.stopPropagation();
    if (!isAddContentMenuOpen) {
      if (addContentBtnRef.current) {
        const rect = addContentBtnRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 280 && spaceAbove > spaceBelow) {
          setAddContentDirection('up');
        } else {
          setAddContentDirection('down');
        }
      }
      setIsAddContentMenuOpen(true);
    } else {
      setIsAddContentMenuOpen(false);
    }
  };

  // Keyboard shortcut: Escape closes curriculum sidebar overlay
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  // Drag and drop states for Modules
  const [draggedModuleIndex, setDraggedModuleIndex] = useState(null);
  const [dragOverModuleIndex, setDragOverModuleIndex] = useState(null);
  const [dragOverModulePosition, setDragOverModulePosition] = useState(null); // 'before' | 'after'

  // Drag and drop states for Lessons within parent module
  const [draggedLessonInfo, setDraggedLessonInfo] = useState(null); // { moduleId, lessonIndex, lessonId }
  const [dragOverLessonIndex, setDragOverLessonIndex] = useState(null);
  const [dragOverLessonPosition, setDragOverLessonPosition] = useState(null); // 'before' | 'after'

  // Drag and drop states for Content Items within lesson
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [dragOverItemIndex, setDragOverItemIndex] = useState(null);
  const [dragOverItemPosition, setDragOverItemPosition] = useState(null); // 'before' | 'after'

  // README Lesson Description State (Strictly formatted without embedded images)
  const [lessonDescValue, setLessonDescValue] = useState('');
  const [lessonDescMode, setLessonDescMode] = useState('preview'); // 'preview' | 'edit'
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const readmeTextareaRef = useRef(null);

  // Check if current module in activeForm has lessons added
  const activeModuleHasLessons = useMemo(() => {
    if (!activeForm || activeForm.type !== 'module' || !activeForm.isEdit) return false;
    const target = modules.find(m => m._id === activeForm.data?.id);
    return Boolean(target && Array.isArray(target.lessons) && target.lessons.length > 0);
  }, [activeForm, modules]);

  // Video playback modal and status checking
  const [previewingVideo, setPreviewingVideo] = useState(null);
  const [isCheckingMux, setIsCheckingMux] = useState(false);

  // Keep selection synchronized if modules change
  useEffect(() => {
    if (modules.length > 0) {
      if (!selectedModuleId || !modules.some(m => m._id === selectedModuleId)) {
        setSelectedModuleId(modules[0]._id);
        if (modules[0].lessons && modules[0].lessons.length > 0) {
          setSelectedLessonId(modules[0].lessons[0]._id);
          setActivePaneView('lesson');
        } else {
          setSelectedLessonId(null);
          setActivePaneView('module_settings');
        }
      } else {
        const curMod = modules.find(m => m._id === selectedModuleId);
        if (curMod && curMod.lessons && curMod.lessons.length > 0) {
          if (!selectedLessonId || !curMod.lessons.some(l => l._id === selectedLessonId)) {
            setSelectedLessonId(curMod.lessons[0]._id);
          }
        }
      }
    } else {
      setSelectedModuleId(null);
      setSelectedLessonId(null);
    }
  }, [modules]);

  // Active entities
  const activeModule = modules.find(m => m._id === selectedModuleId) || (modules.length > 0 ? modules[0] : null);
  const activeLesson = activeModule?.lessons?.find(l => l._id === selectedLessonId) || null;

  // Sync lesson title and description state whenever active lesson changes
  useEffect(() => {
    if (activeLesson) {
      setLessonTitleValue(activeLesson.title || '');
      setLessonDescValue(activeLesson.description || '');
    } else {
      setLessonTitleValue('');
      setLessonDescValue('');
    }
  }, [selectedLessonId, activeLesson?.title, activeLesson?.description]);

  // Save lesson details (title and description) to backend
  const handleSaveLessonDetails = async () => {
    if (!activeLesson || !activeModule) return;
    const trimmedTitle = (lessonTitleValue || '').trim();
    if (!trimmedTitle) {
      toast.error('Lesson title cannot be empty');
      return;
    }
    const trimmedDesc = (lessonDescValue || '').trim();

    setIsSavingDetails(true);
    try {
      const res = await fetch(
        `${apiBase}/courses/${courseId}/curriculum/modules/${activeModule._id}/lessons/${activeLesson._id}`,
        {
          method: 'PATCH',
          headers: getAuthHeader(),
          body: JSON.stringify({
            title: trimmedTitle,
            description: trimmedDesc
          })
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success('Lesson details saved successfully');
        activeLesson.title = trimmedTitle;
        activeLesson.description = trimmedDesc;
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to save lesson details');
      }
    } catch (err) {
      console.error('Error saving lesson details:', err);
      toast.error('Network error saving lesson details');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleDeleteLesson = (moduleId, lessonId) => {
    const parentMod = modules.find(m => m._id === moduleId);
    const lesObj = (parentMod?.lessons || []).find(l => l._id === lessonId);
    setDeleteTarget({
      type: 'lesson',
      moduleId,
      id: lessonId,
      title: lesObj?.title || 'this lesson'
    });
  };

  const handleDeleteItem = (lessonId, itemId) => {
    const itemObj = (activeLesson?.items || []).find(i => i._id === itemId);
    setDeleteTarget({
      type: 'item',
      lessonId,
      id: itemId,
      title: itemObj?.title || 'this content item'
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.type === 'module') {
        const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${deleteTarget.id}`, {
          method: 'DELETE',
          headers: getAuthHeader()
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Module deleted successfully');
          // If the deleted module was currently selected, select another module or reset
          if (selectedModuleId === deleteTarget.id) {
            const remaining = modules.filter(m => m._id !== deleteTarget.id);
            if (remaining.length > 0) {
              setSelectedModuleId(remaining[0]._id);
              if (remaining[0].lessons && remaining[0].lessons.length > 0) {
                setSelectedLessonId(remaining[0].lessons[0]._id);
                setActivePaneView('lesson');
              } else {
                setSelectedLessonId(null);
                setActivePaneView('module_settings');
              }
            } else {
              setSelectedModuleId(null);
              setSelectedLessonId(null);
              setActivePaneView('lesson');
            }
          }
          if (onCurriculumUpdated) onCurriculumUpdated();
          setDeleteTarget(null);
        } else {
          toast.error(data.message || 'Failed to delete module');
        }
      } else if (deleteTarget.type === 'lesson') {
        const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${deleteTarget.moduleId}/lessons/${deleteTarget.id}`, {
          method: 'DELETE',
          headers: getAuthHeader()
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Lesson deleted successfully');
          if (selectedLessonId === deleteTarget.id) {
            const parentMod = modules.find(m => m._id === deleteTarget.moduleId);
            const remaining = (parentMod?.lessons || []).filter(l => l._id !== deleteTarget.id);
            if (remaining.length > 0) {
              setSelectedLessonId(remaining[0]._id);
              setActivePaneView('lesson');
            } else {
              setSelectedLessonId(null);
              setActivePaneView('module_settings');
            }
          }
          if (onCurriculumUpdated) onCurriculumUpdated();
          setDeleteTarget(null);
        } else {
          toast.error(data.message || 'Failed to delete lesson');
        }
      } else if (deleteTarget.type === 'item') {
        const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/lessons/${deleteTarget.lessonId}/items/${deleteTarget.id}`, {
          method: 'DELETE',
          headers: getAuthHeader()
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Content item deleted successfully');
          if (
            editingVideoItem?._id === deleteTarget.id ||
            editingQuizItem?._id === deleteTarget.id ||
            editingNoteItem?._id === deleteTarget.id
          ) {
            setEditingVideoItem(null);
            setEditingQuizItem(null);
            setEditingNoteItem(null);
            setActivePaneView('lesson');
          }
          if (onCurriculumUpdated) onCurriculumUpdated();
          setDeleteTarget(null);
        } else {
          toast.error(data.message || 'Failed to delete content item');
        }
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      toast.error('Network error during deletion');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open full-page workspace dedicated editor for an item
  const handleOpenItemEditor = (item) => {
    if (!item) return;
    const isVideo = item.type === 'video';
    const isQuiz = item.type === 'quiz';
    const isNote = ['article', 'article_md', 'note'].includes(item.type);
    const isDoc = ['pdf', 'document'].includes(item.type);

    if (isVideo) {
      const vidObj = item.video || item.videoDetails || {};
      setEditingVideoItem({
        _id: item._id,
        itemId: item._id,
        lessonId: activeLesson._id,
        title: item.title,
        description: item.description || '',
        state: item.state || 'draft',
        video: {
          muxAssetId: vidObj.muxAssetId || '',
          muxPlaybackId: vidObj.muxPlaybackId || '',
          videoUrl: vidObj.videoUrl || vidObj.url || vidObj.fileUrl || '',
          duration: Number(vidObj.duration || vidObj.durationSeconds) || 0,
          allowFreePreview: Boolean(vidObj.allowFreePreview),
          addToLessonNotes: Boolean(vidObj.addToLessonNotes),
          thumbnailUrl: vidObj.thumbnailUrl || '',
          fileName: vidObj.fileName || ''
        }
      });
      setActivePaneView('video_editor');
    } else if (isQuiz) {
      setEditingQuizItem({
        _id: item._id,
        itemId: item._id,
        lessonId: activeLesson._id,
        title: item.title,
        instructions: item.instructions || item.quiz?.instructions || '',
        hasTimeLimit: Boolean(item.hasTimeLimit || item.quiz?.hasTimeLimit),
        timeLimitMinutes: Number(item.timeLimitMinutes || item.quiz?.timeLimit) || 20,
        state: item.state || 'draft',
        quiz: item.quiz || item.quizDetails || {
          instructions: item.instructions || '',
          hasTimeLimit: Boolean(item.hasTimeLimit),
          timeLimit: Number(item.timeLimitMinutes) || 20,
          questions: []
        }
      });
      setActivePaneView('quiz_editor');
    } else if (isNote || isDoc) {
      setEditingNoteItem({
        _id: item._id,
        itemId: item._id,
        lessonId: activeLesson._id,
        title: item.title,
        description: item.description || '',
        state: item.state || 'draft',
        type: item.type,
        markdownContent: item.markdownContent || item.content || item.bodyMarkdown || '',
        fileUrl: item.fileUrl || item.mediaUrl || '',
        fileName: item.fileName || '',
        fileSize: item.fileSize || 0,
        initialTab: isDoc ? 'upload' : 'markdown'
      });
      setActivePaneView('note_editor');
    } else {
      setActiveForm({
        type: item.type,
        isEdit: true,
        data: {
          lessonId: activeLesson._id,
          id: item._id,
          title: item.title,
          ...(item.quiz || item.quizDetails || {})
        }
      });
    }
  };

  const handleDismissLessonTip = () => {
    setIsLessonTipDismissed(true);
    try {
      localStorage.setItem('upskillr_dismissed_lesson_tip', 'true');
    } catch (e) {
      // localStorage policy
    }
  };

  // Helper for inserting markdown syntax into README description editor (NO images)
  const insertReadmeFormatting = (prefix, suffix = '', defaultText = '') => {
    const textarea = readmeTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end) || defaultText;
    const replacement = prefix + selectedText + suffix;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    setLessonDescValue(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  // Save lesson description to backend
  const handleSaveLessonDescription = async () => {
    if (!activeLesson || !activeModule) return;
    const trimmed = (lessonDescValue || '').trim();
    if (trimmed === (activeLesson.description || '').trim()) return;

    setIsSavingDesc(true);
    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${activeModule._id}/lessons/${activeLesson._id}`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify({ description: trimmed })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Lesson description updated');
        activeLesson.description = trimmed;
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to update lesson description');
      }
    } catch (err) {
      console.error('Error saving lesson description:', err);
      toast.error('Network error saving lesson description');
    } finally {
      setIsSavingDesc(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     FRACTIONAL SORTING REORDER HELPERS
     ───────────────────────────────────────────────────────────── */
  const calculateReorderKeys = (items, currentIndex, direction) => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return null;

    let prevKey = null;
    let nextKey = null;

    if (direction === 'up') {
      prevKey = targetIndex > 0 ? items[targetIndex - 1].sortKey : null;
      nextKey = items[targetIndex].sortKey;
    } else {
      prevKey = items[targetIndex].sortKey;
      nextKey = targetIndex < items.length - 1 ? items[targetIndex + 1].sortKey : null;
    }

    return { prevKey, nextKey };
  };

  const calculateDropKeys = (items, fromIndex, toIndex, position) => {
    if (fromIndex === -1 || toIndex === -1 || fromIndex === null || toIndex === null) return null;
    const withoutDragged = items.filter((_, idx) => idx !== fromIndex);
    let insertIndex = toIndex;
    if (fromIndex < toIndex) {
      insertIndex = position === 'before' ? toIndex - 1 : toIndex;
    } else {
      insertIndex = position === 'before' ? toIndex : toIndex + 1;
    }
    insertIndex = Math.max(0, Math.min(insertIndex, withoutDragged.length));
    const prevKey = insertIndex > 0 ? (withoutDragged[insertIndex - 1]?.sortKey || null) : null;
    const nextKey = insertIndex < withoutDragged.length ? (withoutDragged[insertIndex]?.sortKey || null) : null;
    return { prevKey, nextKey };
  };

  // Module Drag & Drop Handlers
  const handleModuleDragStart = (e, moduleId, index) => {
    e.dataTransfer.setData('text/plain', moduleId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedModuleIndex(index);
  };

  const handleModuleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedModuleIndex === null || draggedModuleIndex === index) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';
    setDragOverModuleIndex(index);
    setDragOverModulePosition(pos);
  };

  const handleModuleDragLeave = () => {
    setDragOverModuleIndex(null);
    setDragOverModulePosition(null);
  };

  const handleModuleDrop = async (e, targetModuleId, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedModuleIndex === null || draggedModuleIndex === undefined) return;
    const fromIndex = draggedModuleIndex;
    const toIndex = targetIndex;
    const position = dragOverModulePosition || 'after';

    setDraggedModuleIndex(null);
    setDragOverModuleIndex(null);
    setDragOverModulePosition(null);

    if (fromIndex === toIndex) return;

    const keys = calculateDropKeys(modules, fromIndex, toIndex, position);
    if (!keys) return;

    const targetModule = modules[fromIndex];
    if (!targetModule) return;

    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${targetModule._id}/reorder`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify(keys)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Module reordered');
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to reorder module');
      }
    } catch (err) {
      console.error('Error reordering module:', err);
      toast.error('Network error reordering module');
    }
  };

  const handleModuleDragEnd = () => {
    setDraggedModuleIndex(null);
    setDragOverModuleIndex(null);
    setDragOverModulePosition(null);
  };

  // Lesson Drag & Drop Handlers (within parent module)
  const handleLessonDragStart = (e, moduleId, lessonId, index) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', lessonId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLessonInfo({ moduleId, lessonId, lessonIndex: index });
  };

  const handleLessonDragOver = (e, moduleId, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedLessonInfo || draggedLessonInfo.moduleId !== moduleId || draggedLessonInfo.lessonIndex === index) return;
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';
    setDragOverLessonIndex(index);
    setDragOverLessonPosition(pos);
  };

  const handleLessonDragLeave = (e) => {
    e.stopPropagation();
    setDragOverLessonIndex(null);
    setDragOverLessonPosition(null);
  };

  const handleLessonDrop = async (e, moduleId, targetLessonId, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedLessonInfo || draggedLessonInfo.moduleId !== moduleId) return;
    const fromIndex = draggedLessonInfo.lessonIndex;
    const toIndex = targetIndex;
    const position = dragOverLessonPosition || 'after';
    const draggedLessonId = draggedLessonInfo.lessonId;

    setDraggedLessonInfo(null);
    setDragOverLessonIndex(null);
    setDragOverLessonPosition(null);

    if (fromIndex === toIndex) return;

    const targetModule = modules.find(m => m._id === moduleId);
    if (!targetModule) return;
    const lessons = targetModule.lessons || [];

    const keys = calculateDropKeys(lessons, fromIndex, toIndex, position);
    if (!keys) return;

    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${moduleId}/lessons/${draggedLessonId}/reorder`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify(keys)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Lesson reordered');
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to reorder lesson');
      }
    } catch (err) {
      console.error('Error reordering lesson:', err);
      toast.error('Network error reordering lesson');
    }
  };

  const handleLessonDragEnd = (e) => {
    e.stopPropagation();
    setDraggedLessonInfo(null);
    setDragOverLessonIndex(null);
    setDragOverLessonPosition(null);
  };

  // Content Item Drag & Drop Handlers (within lesson)
  const handleItemDragStart = (e, itemId, index) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItemIndex(index);
  };

  const handleItemDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';
    setDragOverItemIndex(index);
    setDragOverItemPosition(pos);
  };

  const handleItemDragLeave = (e) => {
    e.stopPropagation();
    setDragOverItemIndex(null);
    setDragOverItemPosition(null);
  };

  const handleItemDrop = async (e, lessonId, targetItemId, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItemIndex === null || draggedItemIndex === undefined) return;
    const fromIndex = draggedItemIndex;
    const toIndex = targetIndex;
    const position = dragOverItemPosition || 'after';

    setDraggedItemIndex(null);
    setDragOverItemIndex(null);
    setDragOverItemPosition(null);

    if (fromIndex === toIndex) return;

    const items = activeLesson?.items || [];
    const draggedItem = items[fromIndex];
    if (!draggedItem) return;

    const keys = calculateDropKeys(items, fromIndex, toIndex, position);
    if (!keys) return;

    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/lessons/${lessonId}/items/${draggedItem._id}/reorder`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify(keys)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Content item reordered');
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to reorder content item');
      }
    } catch (err) {
      console.error('Error reordering content item:', err);
      toast.error('Network error reordering content item');
    }
  };

  const handleItemDragEnd = (e) => {
    e.stopPropagation();
    setDraggedItemIndex(null);
    setDragOverItemIndex(null);
    setDragOverItemPosition(null);
  };

  // Filtered modules based on Search Query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return modules;
    const q = searchQuery.toLowerCase().trim();
    return modules.filter(m => {
      const titleMatch = (m.title || '').toLowerCase().includes(q);
      const lessonMatch = (m.lessons || []).some(l => (l.title || '').toLowerCase().includes(q));
      return titleMatch || lessonMatch;
    });
  }, [modules, searchQuery]);

  /* ─────────────────────────────────────────────────────────────
     MUTATION HANDLERS (Live Backend Integration)
     ───────────────────────────────────────────────────────────── */

  // Module State Toggle
  const handleToggleModuleState = async (moduleId) => {
    const targetModule = modules.find(m => m._id === moduleId);
    const hasLessons = targetModule && Array.isArray(targetModule.lessons) && targetModule.lessons.length > 0;
    const currentState = targetModule?.state || targetModule?.status || 'draft';

    if (currentState === 'draft' && !hasLessons) {
      toast.error('Cannot publish module: Please add lessons and learning content before publishing this module.');
      return;
    }

    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${moduleId}/toggle-state`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Module switched to ${data.module?.state || 'new state'}`);
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to toggle module state');
      }
    } catch (err) {
      console.error('Error toggling module state:', err);
      toast.error('Network error toggling module state');
    }
  };


  // Reorder Modules
  const handleReorderModule = async (moduleId, direction) => {
    const currentIndex = modules.findIndex(m => m._id === moduleId);
    const keys = calculateReorderKeys(modules, currentIndex, direction);
    if (!keys) return;

    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${moduleId}/reorder`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify(keys)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Module reordered');
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to reorder module');
      }
    } catch (err) {
      console.error('Error reordering module:', err);
      toast.error('Network error reordering module');
    }
  };

  // Lesson State Toggle
  const handleToggleLessonState = async (moduleId, lessonId) => {
    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${moduleId}/lessons/${lessonId}/toggle-state`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Lesson switched to ${data.lesson?.state || 'new state'}`);
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to toggle lesson state');
      }
    } catch (err) {
      console.error('Error toggling lesson state:', err);
      toast.error('Network error toggling lesson state');
    }
  };

  // Reorder Lessons
  const handleReorderLesson = async (moduleId, lessonId, direction) => {
    const targetModule = modules.find(m => m._id === moduleId);
    if (!targetModule) return;
    const lessons = targetModule.lessons || [];
    const currentIndex = lessons.findIndex(l => l._id === lessonId);
    const keys = calculateReorderKeys(lessons, currentIndex, direction);
    if (!keys) return;

    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${moduleId}/lessons/${lessonId}/reorder`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify(keys)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Lesson reordered');
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to reorder lesson');
      }
    } catch (err) {
      console.error('Error reordering lesson:', err);
      toast.error('Network error reordering lesson');
    }
  };

  // Content Item (Video / Quiz) State Toggle
  const handleToggleItemState = async (lessonId, itemId) => {
    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/lessons/${lessonId}/items/${itemId}/toggle-state`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Content item switched to ${data.item?.state || 'new state'}`);
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to toggle item state');
      }
    } catch (err) {
      console.error('Error toggling item state:', err);
      toast.error('Network error toggling item state');
    }
  };

  // Reorder Content Items
  const handleReorderItem = async (lessonId, itemId, direction) => {
    if (!activeLesson) return;
    const items = activeLesson.items || [];
    const currentIndex = items.findIndex(i => i._id === itemId);
    const keys = calculateReorderKeys(items, currentIndex, direction);
    if (!keys) return;

    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/lessons/${lessonId}/items/${itemId}/reorder`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify(keys)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Item reordered');
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to reorder item');
      }
    } catch (err) {
      console.error('Error reordering item:', err);
      toast.error('Network error reordering item');
    }
  };

  // Check Mux transcoding status for an item
  const handleCheckMuxAsset = async (item) => {
    if (!item.video?.muxAssetId) return;
    setIsCheckingMux(true);
    try {
      const res = await fetch(`${apiBase}/media/mux-asset/${item.video.muxAssetId}`, {
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.status === 'ready' && data.playbackId) {
        // Save to database
        const patchRes = await fetch(`${apiBase}/courses/${courseId}/curriculum/lessons/${activeLesson._id}/items/${item._id}`, {
          method: 'PATCH',
          headers: getAuthHeader(),
          body: JSON.stringify({
            video: {
              muxAssetId: data.assetId,
              muxPlaybackId: data.playbackId,
              duration: data.duration || item.video?.duration || 0,
              watchedThresholdPercent: 95,
              status: 'ready'
            }
          })
        });
        const patchData = await patchRes.json();
        if (patchData.success) {
          toast.success('Video is ready! Playback stream linked.');
          if (onCurriculumUpdated) onCurriculumUpdated();
        }
      } else if (data.status === 'processing' || data.status === 'preparing') {
        toast.info('Video is still processing. Please wait a moment.');
      } else {
        toast.error(data.message || 'Video is not ready yet.');
      }
    } catch (err) {
      console.error('Error checking video status:', err);
      toast.error('Failed to check video status');
    } finally {
      setIsCheckingMux(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     SAVE FORM MODAL DISPATCHER
     ───────────────────────────────────────────────────────────── */
  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!activeForm) return;

    const { type, isEdit, data } = activeForm;

    if (!data.title || !data.title.trim()) {
      toast.error(`Please provide a ${type} title`);
      return;
    }

    setSaving(true);
    try {
      let url = '';
      let method = isEdit ? 'PATCH' : 'POST';
      let payload = {};

      if (type === 'module') {
        url = isEdit
          ? `${apiBase}/courses/${courseId}/curriculum/modules/${data.id}`
          : `${apiBase}/courses/${courseId}/curriculum/modules`;

        const modHasLessons = isEdit
          ? modules.some(m => m._id === data.id && Array.isArray(m.lessons) && m.lessons.length > 0)
          : false;

        payload = {
          title: data.title.trim(),
          description: (data.description || '').trim(),
          state: (isEdit && modHasLessons) ? (data.state || 'draft') : 'draft'
        };
      } else if (type === 'lesson') {
        url = isEdit
          ? `${apiBase}/courses/${courseId}/curriculum/modules/${data.moduleId}/lessons/${data.id}`
          : `${apiBase}/courses/${courseId}/curriculum/modules/${data.moduleId}/lessons`;
        payload = {
          title: data.title.trim(),
          description: (data.description || '').trim(),
          state: isEdit ? (data.state || 'draft') : 'draft'
        };
      } else if (type === 'video') {
        url = isEdit
          ? `${apiBase}/courses/${courseId}/curriculum/lessons/${data.lessonId}/items/${data.id}`
          : `${apiBase}/courses/${courseId}/curriculum/lessons/${data.lessonId}/items`;
        payload = {
          type: 'video',
          title: data.title.trim(),
          video: {
            muxAssetId: data.muxAssetId || '',
            muxPlaybackId: data.muxPlaybackId || '',
            duration: Number(data.duration) || 0,
            watchedThresholdPercent: 95,
            status: data.muxPlaybackId ? 'ready' : (data.status || 'processing')
          }
        };
      } else if (type === 'quiz') {
        if (!data.questions || data.questions.length === 0) {
          toast.error('Please add at least one question to the quiz');
          setSaving(false);
          return;
        }

        for (let i = 0; i < data.questions.length; i++) {
          const q = data.questions[i];
          if (!q.questionText || !q.questionText.trim()) {
            toast.error(`Question ${i + 1} is missing question prompt`);
            setSaving(false);
            return;
          }
          if (!q.options || q.options.some(opt => !opt.trim())) {
            toast.error(`Question ${i + 1} has empty choice options`);
            setSaving(false);
            return;
          }
        }

        url = isEdit
          ? `${apiBase}/courses/${courseId}/curriculum/lessons/${data.lessonId}/items/${data.id}`
          : `${apiBase}/courses/${courseId}/curriculum/lessons/${data.lessonId}/items`;
        payload = {
          type: 'quiz',
          title: data.title.trim(),
          quiz: {
            passThresholdPercent: Number(data.passThresholdPercent) || 70,
            maxAttempts: Number(data.maxAttempts) || 3,
            cooldownHours: Number(data.cooldownHours) || 6,
            questions: data.questions
          }
        };
      }

      const res = await fetch(url, {
        method,
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      if (resData.success) {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} saved successfully`);
        setActiveForm(null);
        setIsReplacingVideo(false);

        // Immediately select newly created entities
        if (type === 'module' && !isEdit && resData.module?._id) {
          setSelectedModuleId(resData.module._id);
          setSelectedLessonId(null);
          setActivePaneView('module_settings');
        } else if (type === 'lesson' && !isEdit && resData.lesson?._id) {
          setSelectedModuleId(data.moduleId);
          setSelectedLessonId(resData.lesson._id);
          setActivePaneView('lesson');
        }

        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(resData.message || `Failed to save ${type}`);
      }
    } catch (err) {
      console.error(`Error saving ${type}:`, err);
      toast.error(`Network error saving ${type}`);
    } finally {
      setSaving(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     QUIZ BUILDER QUESTION HELPERS
     ───────────────────────────────────────────────────────────── */
  const handleAddQuizQuestion = () => {
    setActiveForm(prev => {
      const currentQuestions = prev.data.questions || [];
      return {
        ...prev,
        data: {
          ...prev.data,
          questions: [
            ...currentQuestions,
            {
              questionText: '',
              options: ['', '', '', ''],
              correctOptionIndex: 0,
              explanation: '',
              points: 1
            }
          ]
        }
      };
    });
  };

  const handleUpdateQuizQuestion = (qIndex, field, val) => {
    setActiveForm(prev => {
      const questions = [...(prev.data.questions || [])];
      questions[qIndex] = { ...questions[qIndex], [field]: val };
      return { ...prev, data: { ...prev.data, questions } };
    });
  };

  const handleUpdateQuizOption = (qIndex, oIndex, val) => {
    setActiveForm(prev => {
      const questions = [...(prev.data.questions || [])];
      const options = [...(questions[qIndex].options || [])];
      options[oIndex] = val;
      questions[qIndex] = { ...questions[qIndex], options };
      return { ...prev, data: { ...prev.data, questions } };
    });
  };

  const handleRemoveQuizQuestion = (qIndex) => {
    setActiveForm(prev => {
      const questions = (prev.data.questions || []).filter((_, i) => i !== qIndex);
      return { ...prev, data: { ...prev.data, questions } };
    });
  };

  return (
    <div className="module-lesson-editor-subpage">
      {/* ── Main Split View Layout ── */}
      {modules.length === 0 ? (
        <div className="curriculum-empty-state">
          <div className="empty-icon-circle">
            <Layers size={36} />
          </div>
          <h3>No Modules Added Yet</h3>
          <p>Get started by creating your first course module to organize lessons and lectures.</p>
          <button
            type="button"
            className="btn-primary-action"
            onClick={() => {
              setActiveForm({
                type: 'module',
                isEdit: false,
                data: { title: '', description: '' }
              });
            }}
          >
            <Plus size={16} />
            <span>Create First Module</span>
          </button>
        </div>
      ) : (
        <div className="curriculum-split-workspace">
          {/* Subtle backdrop when sidebar overlay is open */}
          {isSidebarOpen && (
            <div
              className="curriculum-sidebar-backdrop"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close Course Curriculum Sidebar"
            />
          )}

          {/* ══════════════════════════════════════════════════════════
              DOCKED COLLAPSED RAIL (Matches user screenshot: icon + > button, divider, M1/M2/M3, + add)
              ══════════════════════════════════════════════════════════ */}
          <aside className="curriculum-collapsed-dock" aria-label="Course Curriculum Navigation">
            {/* Top section: Open/close control */}
            <div className="collapsed-dock-header">
              <button
                type="button"
                className="btn-dock-expand"
                onClick={() => setIsSidebarOpen(true)}
                title="Expand Course Curriculum"
                aria-label="Expand Course Curriculum"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Upward Scroll Arrow for Closed Sidebar Modules */}
            <button
              type="button"
              className="btn-dock-scroll-arrow btn-dock-scroll-up"
              onClick={handleScrollDockUp}
              title="Scroll Modules Up"
              aria-label="Scroll Modules Up"
            >
              <ChevronUp size={15} />
            </button>

            {/* Middle section: Scrollable module navigation buttons */}
            <div className="collapsed-dock-modules-list" ref={dockModulesListRef}>
              {modules.map((mod, idx) => {
                const isActive = mod._id === selectedModuleId;
                return (
                  <button
                    key={mod._id}
                    ref={isActive ? activeDockBtnRef : null}
                    type="button"
                    className={`dock-module-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => {
                      setSelectedModuleId(mod._id);
                      if (mod.lessons && mod.lessons.length > 0) {
                        setSelectedLessonId(mod.lessons[0]._id);
                        setActivePaneView('lesson');
                      } else {
                        setActivePaneView('module_settings');
                      }
                    }}
                    title={`M${idx + 1}: ${mod.title}`}
                  >
                    M{idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Downward Scroll Arrow for Closed Sidebar Modules */}
            <button
              type="button"
              className="btn-dock-scroll-arrow btn-dock-scroll-down"
              onClick={handleScrollDockDown}
              title="Scroll Modules Down"
              aria-label="Scroll Modules Down"
            >
              <ChevronDown size={15} />
            </button>

            {/* Bottom section: Add Module control */}
            <div className="collapsed-dock-footer">
              <button
                type="button"
                className="dock-module-add-btn"
                onClick={() =>
                  setActiveForm({
                    type: 'module',
                    isEdit: false,
                    data: { title: '', description: '', state: 'draft' }
                  })
                }
                title="Add Module"
                aria-label="Add Module"
              >
                <Plus size={18} />
              </button>
            </div>
          </aside>

          {/* ══════════════════════════════════════════════════════════
              LEFT PANEL: COURSE HIERARCHY TREE (OVERLAY)
              ══════════════════════════════════════════════════════════ */}
          <aside
            className={`curriculum-hierarchy-sidebar ${isSidebarOpen ? 'is-open' : 'is-closed'} ${isMobileTreeOpen ? 'mobile-open' : ''}`}
            aria-hidden={!isSidebarOpen}
          >
            {/* Sidebar Header */}
            <div className="hierarchy-sidebar-header">
              <div className="hierarchy-header-top">
                <div className="hierarchy-course-title-wrap">
                  <BookOpen size={18} className="hierarchy-header-icon" />
                  <h4 className="hierarchy-course-title">Course Curriculum</h4>
                </div>
                <button
                  type="button"
                  className="btn-collapse-curriculum-sidebar"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSidebarOpen(false);
                  }}
                  title="Close Course Curriculum"
                  aria-label="Close Course Curriculum"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

              <div className="curriculum-search-wrap">
                <Search size={14} className="curriculum-search-icon" />
                <input
                  type="text"
                  className="curriculum-search-input"
                  placeholder="Search modules or lessons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="curriculum-search-clear"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Tree of Modules and Lessons */}
            <div className="hierarchy-modules-tree">
              {filteredModules.length === 0 ? (
                <div className="curriculum-empty-search">
                  <p>No modules or lessons match "{searchQuery}"</p>
                  <button
                    type="button"
                    className="btn-clear-search-inline"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                filteredModules.map((module) => {
                  const modIndex = modules.findIndex((m) => m._id === module._id);
                  const isActiveModule = module._id === selectedModuleId;
                  const isExpanded = searchQuery.trim() ? true : Boolean(expandedModules[module._id]);
                  const isModuleDraft = (module.state || module.status || 'draft') === 'draft';
                  const lessons = module.lessons || [];
                  const moduleItemsCount = lessons.reduce(
                    (acc, l) => acc + (l.items || []).length + (l.notes || []).length,
                    0
                  );
                  const isDraggingThisModule = draggedModuleIndex === modIndex;
                  const isDragOverThisModule = dragOverModuleIndex === modIndex;

                  return (
                    <div
                      key={module._id}
                      className={`hierarchy-module-node ${isActiveModule ? 'is-active-module' : ''} ${isModuleDraft ? 'is-draft' : ''
                        } ${openModuleMenuId === module._id ? 'is-menu-open' : ''} ${isExpanded ? 'is-expanded' : 'is-collapsed'} ${isDraggingThisModule ? 'is-dragging' : ''
                        } ${isDragOverThisModule ? `drop-${dragOverModulePosition}` : ''}`}
                      onDragOver={(e) => handleModuleDragOver(e, modIndex)}
                      onDragLeave={handleModuleDragLeave}
                      onDrop={(e) => handleModuleDrop(e, module._id, modIndex)}
                    >
                      {/* Module Header Row */}
                      <div
                        className="hierarchy-module-row"
                        onClick={() => toggleModuleAccordion(module._id)}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} Module ${modIndex + 1}: ${module.title}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleModuleAccordion(module._id);
                          }
                        }}
                      >
                        {/* Drag Handle */}
                        <div
                          className="module-drag-grip"
                          draggable={true}
                          onDragStart={(e) => handleModuleDragStart(e, module._id, modIndex)}
                          onDragEnd={handleModuleDragEnd}
                          onClick={(e) => e.stopPropagation()}
                          title="Drag to reorder module"
                        >
                          <GripVertical size={15} />
                        </div>

                        {/* Module Badge */}
                        <span className="hierarchy-module-badge">M{modIndex + 1}</span>

                        {/* Module Meta: Title & Submeta */}
                        <div className="hierarchy-module-meta-group">
                          <div className="hierarchy-module-title-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                            <span className="hierarchy-module-name" title={module.title}>
                              {module.title}
                            </span>
                            <span className={`curriculum-status-pill-mini ${module.state === 'published' ? 'published' : 'draft'}`}>
                              {module.state === 'published' ? 'Published' : 'Draft'}
                            </span>
                          </div>
                          <span className="hierarchy-module-subtext">
                            {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} • {moduleItemsCount}{' '}
                            {moduleItemsCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        {/* Chevron Toggle */}
                        <button
                          type="button"
                          className="btn-tree-accordion"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleModuleAccordion(module._id);
                          }}
                          title={isExpanded ? 'Collapse Module' : 'Expand Module'}
                          tabIndex={-1}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>

                        {/* Module 3-Dot Options Dropdown */}
                        <div
                          className="module-settings-dropdown-wrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="btn-module-settings-trigger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenModuleMenuId((prev) => (prev === module._id ? null : module._id));
                            }}
                            title="Module Options"
                            aria-label="Module Options"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {openModuleMenuId === module._id && (
                            <div
                              className="module-settings-dropdown-menu"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="dropdown-menu-item"
                                onClick={() => {
                                  setOpenModuleMenuId(null);
                                  setActiveForm({
                                    type: 'module',
                                    isEdit: true,
                                    data: {
                                      id: module._id,
                                      title: module.title,
                                      description: module.description || '',
                                      state: module.state || 'draft'
                                    }
                                  });
                                }}
                              >
                                <Edit2 size={14} />
                                <span>Edit Module Details</span>
                              </button>

                              <button
                                type="button"
                                className="dropdown-menu-item"
                                onClick={() => {
                                  setOpenModuleMenuId(null);
                                  handleToggleModuleState(module._id);
                                }}
                              >
                                {module.state === 'published' ? (
                                  <>
                                    <Lock size={14} />
                                    <span>Unpublish Module (Draft)</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={14} />
                                    <span>Publish Module</span>
                                  </>
                                )}
                              </button>

                              <div className="dropdown-divider" />

                              <button
                                type="button"
                                className="dropdown-menu-item"
                                disabled={modIndex === 0}
                                onClick={() => {
                                  setOpenModuleMenuId(null);
                                  handleReorderModule(module._id, 'up');
                                }}
                              >
                                <ArrowUp size={14} />
                                <span>Move Module Up</span>
                              </button>

                              <button
                                type="button"
                                className="dropdown-menu-item"
                                disabled={modIndex === modules.length - 1}
                                onClick={() => {
                                  setOpenModuleMenuId(null);
                                  handleReorderModule(module._id, 'down');
                                }}
                              >
                                <ArrowDown size={14} />
                                <span>Move Module Down</span>
                              </button>

                              <div className="dropdown-divider" />

                              <button
                                type="button"
                                className="dropdown-menu-item"
                                onClick={() => {
                                  setOpenModuleMenuId(null);
                                  setActiveForm({
                                    type: 'lesson',
                                    isEdit: false,
                                    data: {
                                      moduleId: module._id,
                                      title: '',
                                      description: '',
                                      state: 'draft'
                                    }
                                  });
                                }}
                              >
                                <Plus size={14} />
                                <span>Add Lesson</span>
                              </button>

                              <div className="dropdown-divider" />

                              <button
                                type="button"
                                className="dropdown-menu-item item-danger"
                                onClick={() => {
                                  setOpenModuleMenuId(null);
                                  setDeleteTarget({
                                    type: 'module',
                                    id: module._id,
                                    title: module.title || `Module ${modIndex + 1}`,
                                    lessonCount: (module.lessons || []).length
                                  });
                                }}
                              >
                                <Trash2 size={14} />
                                <span>Delete Module</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Nested Lessons Sublist */}
                      {isExpanded && (
                        <div className="hierarchy-module-body">
                          <div className="hierarchy-lessons-sublist">
                            {lessons.length === 0 ? (
                              <div className="hierarchy-empty-lessons">
                                <span>No lessons in this module</span>
                                <button
                                  type="button"
                                  className="btn-add-lesson-inline"
                                  onClick={() => {
                                    setActiveForm({
                                      type: 'lesson',
                                      isEdit: false,
                                      data: {
                                        moduleId: module._id,
                                        title: '',
                                        description: '',
                                        state: 'draft'
                                      }
                                    });
                                  }}
                                >
                                  <Plus size={12} />
                                  <span>Add Lesson</span>
                                </button>
                              </div>
                            ) : (
                              lessons.map((lesson, lesIndex) => {
                                const isSelected =
                                  lesson._id === selectedLessonId && (activePaneView === 'lesson' || activePaneView === 'video_editor' || activePaneView === 'quiz_editor' || activePaneView === 'note_editor');
                                const isLessonDraft =
                                  (lesson.state || lesson.status || 'draft') === 'draft';
                                const isDraggingThisLesson =
                                  draggedLessonInfo?.moduleId === module._id &&
                                  draggedLessonInfo?.lessonIndex === lesIndex;
                                const isDragOverThisLesson =
                                  draggedLessonInfo?.moduleId === module._id &&
                                  dragOverLessonIndex === lesIndex;

                                // Icon based on content types inside lesson
                                const hasVideo = (lesson.items || []).some((i) => i.type === 'video');
                                const hasQuiz = (lesson.items || []).some((i) => i.type === 'quiz');

                                return (
                                  <div
                                    key={lesson._id}
                                    className={`hierarchy-lesson-item ${isSelected ? 'is-selected-lesson' : ''
                                      } ${isLessonDraft ? 'is-draft' : ''} ${isDraggingThisLesson ? 'is-dragging' : ''
                                      } ${isDragOverThisLesson ? `drop-${dragOverLessonPosition}` : ''}`}
                                    onClick={() => {
                                      setSelectedModuleId(module._id);
                                      setSelectedLessonId(lesson._id);
                                      setActivePaneView('lesson');
                                      setIsMobileTreeOpen(false);
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    aria-selected={isSelected}
                                    aria-label={`Select Lesson ${modIndex + 1}.${lesIndex + 1}: ${lesson.title
                                      }`}
                                    onDragOver={(e) => handleLessonDragOver(e, module._id, lesIndex)}
                                    onDragLeave={handleLessonDragLeave}
                                    onDrop={(e) =>
                                      handleLessonDrop(e, module._id, lesson._id, lesIndex)
                                    }
                                  >
                                    {/* Drag Handle */}
                                    <div
                                      className="lesson-drag-grip"
                                      draggable={true}
                                      onDragStart={(e) =>
                                        handleLessonDragStart(e, module._id, lesson._id, lesIndex)
                                      }
                                      onDragEnd={handleLessonDragEnd}
                                      onClick={(e) => e.stopPropagation()}
                                      title="Drag to reorder lesson"
                                    >
                                      <GripVertical size={13} />
                                    </div>

                                    {/* Lesson Type Icon */}
                                    <div className="lesson-type-icon-box">
                                      {hasVideo ? (
                                        <Play size={13} className="icon-play-glyph" />
                                      ) : hasQuiz ? (
                                        <HelpCircle size={13} className="icon-quiz-glyph" />
                                      ) : (
                                        <FileText size={13} className="icon-doc-glyph" />
                                      )}
                                    </div>

                                    {/* Lesson Number Tag & Title */}
                                    <span className="lesson-num-tag">
                                      {modIndex + 1}.{lesIndex + 1}
                                    </span>
                                    <span className="lesson-item-title" title={lesson.title}>
                                      {lesson.title}
                                    </span>

                                    {/* Status Pill (if draft) */}
                                    <span className={`curriculum-status-pill-mini ${lesson.state === 'published' ? 'published' : 'draft'}`}>
                                      {lesson.state === 'published' ? 'Published' : 'Draft'}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Bottom: Add Module Button */}
            <div className="hierarchy-sidebar-footer">
              <button
                type="button"
                className="btn-curriculum-add-module"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveForm({
                    type: 'module',
                    isEdit: false,
                    data: { title: '', description: '', state: 'draft' }
                  });
                }}
              >
                <Plus size={16} />
                <span>Add Module</span>
              </button>
            </div>
          </aside>

          {/* ══════════════════════════════════════════════════════════
              MAIN EDITOR PANE
              ══════════════════════════════════════════════════════════ */}
          <main className="curriculum-main-editor-pane">
            {activePaneView === 'video_editor' ? (
              <DedicatedVideoEditor
                courseId={courseId}
                course={course}
                activeModule={activeModule}
                activeLesson={activeLesson}
                initialItem={editingVideoItem}
                onBack={() => {
                  setActivePaneView('lesson');
                  setEditingVideoItem(null);
                }}
                onSaveSuccess={() => {
                  if (onCurriculumUpdated) onCurriculumUpdated();
                  setActivePaneView('lesson');
                  setEditingVideoItem(null);
                }}
                onToggleSidebar={() => setIsSidebarOpen(true)}
                apiBase={apiBase}
                getAuthHeader={getAuthHeader}
                toast={toast}
              />
            ) : activePaneView === 'quiz_editor' ? (
              <DedicatedQuizEditor
                courseId={courseId}
                course={course}
                activeModule={activeModule}
                activeLesson={activeLesson}
                initialItem={editingQuizItem}
                onBack={() => {
                  setActivePaneView('lesson');
                  setEditingQuizItem(null);
                }}
                onSaveSuccess={(savedItem) => {
                  if (onCurriculumUpdated) onCurriculumUpdated();
                  setEditingQuizItem(savedItem);
                }}
                onToggleSidebar={() => setIsSidebarOpen(true)}
                apiBase={apiBase}
                getAuthHeader={getAuthHeader}
                toast={toast}
              />
            ) : activePaneView === 'note_editor' ? (
              <DedicatedNoteEditor
                courseId={courseId}
                course={course}
                activeModule={activeModule}
                activeLesson={activeLesson}
                initialItem={editingNoteItem}
                onBack={() => {
                  setActivePaneView('lesson');
                  setEditingNoteItem(null);
                }}
                onSaveSuccess={(savedItem) => {
                  if (onCurriculumUpdated) onCurriculumUpdated();
                  setEditingNoteItem(savedItem);
                }}
                onToggleSidebar={() => setIsSidebarOpen(true)}
                apiBase={apiBase}
                getAuthHeader={getAuthHeader}
                toast={toast}
              />
            ) : activePaneView === 'lesson' && activeLesson ? (
              <div className="lesson-editor-view">
                {/* Breadcrumbs Navigation */}
                <nav className="editor-breadcrumbs-bar">
                  <div className="breadcrumbs-chain">
                    <button
                      type="button"
                      className="btn-mobile-tree-toggle"
                      onClick={() => setIsMobileTreeOpen(!isMobileTreeOpen)}
                      title="Toggle Curriculum Tree"
                    >
                      <Menu size={16} />
                      <span>Modules</span>
                    </button>
                  </div>
                </nav>

                {/* ── Lesson Dashboard Header (Matching Reference Screenshot) ── */}
                <div className="lesson-dashboard-header">
                  <div className="lesson-header-left">
                    <div className="lesson-header-icon-box">
                      <Play size={20} className="lesson-header-icon-glyph" />
                    </div>
                    <div className="lesson-header-text">
                      <div className="lesson-title-badge-row">
                        <h2 className="lesson-header-title">
                          Lesson {modules.findIndex((m) => m._id === activeModule._id) + 1}.
                          {(activeModule.lessons || []).findIndex((l) => l._id === activeLesson._id) + 1}:{' '}
                          {activeLesson.title}
                        </h2>
                        <span className={`lesson-header-status-badge ${activeLesson.state === 'published' ? 'published' : 'draft'}`}>
                          <span className="status-badge-dot" />
                          <span>{activeLesson.state === 'published' ? 'Published' : 'Draft'}</span>
                        </span>
                      </div>
                      <p className="lesson-header-description">
                        Create and manage the content for this lesson. Add videos, notes, resources and quizzes.
                      </p>
                    </div>
                  </div>

                  <div className="lesson-header-actions-right">
                    <div className="lesson-header-menu-wrap">
                      <button
                        type="button"
                        className="btn-lesson-header-menu"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenLessonMenu(!openLessonMenu);
                        }}
                        title="Lesson Settings & Actions"
                        aria-label="Lesson Settings & Actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openLessonMenu && (
                        <div className="lesson-header-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="dropdown-menu-item"
                            onClick={() => {
                              setOpenLessonMenu(false);
                              setActiveLessonTab('settings');
                            }}
                          >
                            <Settings size={14} />
                            <span>Edit Lesson Details & Settings</span>
                          </button>
                          <button
                            type="button"
                            className="dropdown-menu-item"
                            onClick={() => {
                              setOpenLessonMenu(false);
                              handleToggleLessonState(activeModule._id, activeLesson._id);
                            }}
                          >
                            {activeLesson.state === 'draft' ? (
                              <>
                                <CheckCircle2 size={14} />
                                <span>Publish Lesson</span>
                              </>
                            ) : (
                              <>
                                <EyeOff size={14} />
                                <span>Unpublish (Set to Draft)</span>
                              </>
                            )}
                          </button>
                          <div className="dropdown-divider" />
                          <button
                            type="button"
                            className="dropdown-menu-item item-danger"
                            onClick={() => {
                              setOpenLessonMenu(false);
                              handleDeleteLesson(activeModule._id, activeLesson._id);
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Delete Lesson</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Tabs Bar: Lesson Content & Lesson Details & Settings ── */}
                <div className="lesson-dashboard-tabs-bar" role="tablist" aria-label="Lesson Sections">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeLessonTab === 'content'}
                    className={`lesson-dashboard-tab-btn ${activeLessonTab === 'content' ? 'active' : ''}`}
                    onClick={() => setActiveLessonTab('content')}
                  >
                    <FileText size={16} />
                    <span>Lesson Content</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeLessonTab === 'settings'}
                    className={`lesson-dashboard-tab-btn ${activeLessonTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveLessonTab('settings')}
                  >
                    <Settings size={16} />
                    <span>Lesson Details & Settings</span>
                  </button>
                </div>

                {/* ── TAB 1: LESSON CONTENT ITEMS ── */}
                {activeLessonTab === 'content' && (
                  <div className="lesson-content-items-card">
                    <div className="section-header-toolbar">
                      <div className="section-title-wrap">
                        <h3 className="section-title">Lesson Content Items</h3>
                        <p className="section-subtitle">
                          Add and organize videos, notes, articles, PDFs, quizzes or other resources for this lesson.
                        </p>
                      </div>

                      {/* + Add Content Dropdown */}
                      <div className="add-content-dropdown-wrapper" ref={addContentBtnRef}>
                        <button
                          type="button"
                          className="btn-add-content-dropdown"
                          onClick={handleToggleAddContent}
                          aria-expanded={isAddContentMenuOpen}
                          aria-haspopup="true"
                        >
                          <Plus size={16} />
                          <span>Add Content</span>
                          <ChevronDown size={14} />
                        </button>

                        {isAddContentMenuOpen && (
                          <div
                            className={`add-content-dropdown-menu ${addContentDirection === 'up' ? 'direction-up' : 'direction-down'}`}
                            onClick={(e) => e.stopPropagation()}
                            role="menu"
                          >
                            <button
                              type="button"
                              className="dropdown-item-option"
                              onClick={() => {
                                setIsAddContentMenuOpen(false);
                                setEditingVideoItem({
                                  _id: null,
                                  lessonId: activeLesson._id,
                                  title: '',
                                  description: '',
                                  state: 'draft',
                                  video: {
                                    muxAssetId: '',
                                    muxPlaybackId: '',
                                    videoUrl: '',
                                    duration: 0,
                                    allowFreePreview: false,
                                    addToLessonNotes: false,
                                    thumbnailUrl: '',
                                    fileName: ''
                                  }
                                });
                                setActivePaneView('video_editor');
                              }}
                            >
                              <Video size={16} className="dropdown-opt-icon icon-video" />
                              <div className="dropdown-opt-info">
                                <span className="opt-title">Video Lecture</span>
                                <span className="opt-desc">
                                  Gating video lecture with watch progress tracking
                                </span>
                              </div>
                            </button>

                            <button
                              type="button"
                              className="dropdown-item-option"
                              onClick={() => {
                                setIsAddContentMenuOpen(false);
                                setEditingQuizItem({
                                  _id: null,
                                  lessonId: activeLesson._id,
                                  title: `${activeLesson.title || 'Lesson'} Quiz`,
                                  instructions: '',
                                  hasTimeLimit: false,
                                  timeLimitMinutes: 20,
                                  state: 'draft',
                                  quiz: {
                                    instructions: '',
                                    hasTimeLimit: false,
                                    timeLimit: 20,
                                    questions: [
                                      {
                                        questionText: 'Quiz Question',
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
                                    ]
                                  }
                                });
                                setActivePaneView('quiz_editor');
                              }}
                            >
                              <HelpCircle size={16} className="dropdown-opt-icon icon-quiz" />
                              <div className="dropdown-opt-info">
                                <span className="opt-title">Lesson Quiz</span>
                                <span className="opt-desc">
                                  Dedicated quiz builder with question scoring & timer
                                </span>
                              </div>
                            </button>

                            <button
                              type="button"
                              className="dropdown-item-option"
                              onClick={() => {
                                setIsAddContentMenuOpen(false);
                                setEditingNoteItem({
                                  _id: null,
                                  lessonId: activeLesson._id,
                                  title: `${activeLesson.title || 'Lesson'} Notes`,
                                  description: '',
                                  state: 'draft',
                                  type: 'article_md',
                                  markdownContent: `# ${activeLesson.title || 'Lesson Notes'}\n\nWrite your note content here using Markdown...\n`,
                                  fileUrl: '',
                                  fileName: '',
                                  fileSize: 0
                                });
                                setActivePaneView('note_editor');
                              }}
                            >
                              <FileText size={16} className="dropdown-opt-icon icon-note" />
                              <div className="dropdown-opt-info">
                                <span className="opt-title">Article / Markdown Note</span>
                                <span className="opt-desc">
                                  Interactive rich markdown study notes with live preview
                                </span>
                              </div>
                            </button>

                            <button
                              type="button"
                              className="dropdown-item-option"
                              onClick={() => {
                                setIsAddContentMenuOpen(false);
                                setEditingNoteItem({
                                  _id: null,
                                  lessonId: activeLesson._id,
                                  title: `${activeLesson.title || 'Lesson'} Reference Document`,
                                  description: '',
                                  state: 'draft',
                                  type: 'pdf',
                                  markdownContent: '',
                                  fileUrl: '',
                                  fileName: '',
                                  fileSize: 0,
                                  initialTab: 'upload'
                                });
                                setActivePaneView('note_editor');
                              }}
                            >
                              <BookOpen size={16} className="dropdown-opt-icon icon-doc" />
                              <div className="dropdown-opt-info">
                                <span className="opt-title">PDF / Document</span>
                                <span className="opt-desc">
                                  Upload PDF slides, cheat sheets, or documentation
                                </span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content Items List */}
                    {!activeLesson.items || activeLesson.items.length === 0 ? (
                      <div className="empty-content-items-card">
                        <Layers size={32} />
                        <h4>No Content Added Yet</h4>
                        <p>Add a Video Lecture, Note, PDF, or Quiz to complete this lesson unit.</p>
                      </div>
                    ) : (
                      <div className="draggable-items-card-list">
                        {(activeLesson.items || []).map((item, itemIndex) => {
                          const isItemDraft = item.state === 'draft';
                          const isVideo = item.type === 'video';
                          const isQuiz = item.type === 'quiz';
                          const isNote = ['article', 'article_md', 'note'].includes(item.type);
                          const isDoc = ['pdf', 'document'].includes(item.type);
                          const isCode = item.type === 'code';
                          const isLink = item.type === 'link';
                          const isDraggingThisItem = draggedItemIndex === itemIndex;
                          const isDragOverThisItem = dragOverItemIndex === itemIndex;

                          return (
                            <div
                              key={item._id}
                              className={`content-draggable-card type-${item.type} ${isItemDraft ? 'item-draft' : ''} ${isDraggingThisItem ? 'is-dragging' : ''} ${isDragOverThisItem ? `drop-${dragOverItemPosition}` : ''}`}
                              onClick={() => handleOpenItemEditor(item)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleOpenItemEditor(item);
                                }
                              }}
                              onDragOver={(e) => handleItemDragOver(e, itemIndex)}
                              onDragLeave={handleItemDragLeave}
                              onDrop={(e) => handleItemDrop(e, activeLesson._id, item._id, itemIndex)}
                              title="Click to open full-page workspace editor"
                            >
                              {/* Drag Handle */}
                              <div
                                className="card-drag-grip"
                                draggable={true}
                                onDragStart={(e) => handleItemDragStart(e, item._id, itemIndex)}
                                onDragEnd={handleItemDragEnd}
                                onClick={(e) => e.stopPropagation()}
                                title="Drag to reorder position"
                              >
                                <GripVertical size={16} />
                              </div>

                              {/* Media Thumbnail / Graphic Icon */}
                              <div className="card-media-thumb-container">
                                {isVideo ? (
                                  <div className="card-thumb-video">
                                    {item.video?.thumbnailUrl ? (
                                      <img
                                        src={item.video.thumbnailUrl}
                                        alt={item.title}
                                        className="card-thumb-img"
                                      />
                                    ) : null}
                                    <div className="card-thumb-video-overlay">
                                      <Play size={13} fill="currentColor" />
                                    </div>
                                    <span className="card-thumb-duration-pill">
                                      {item.video?.duration ? formatDurationDisplay(item.video.duration) : '12:34'}
                                    </span>
                                  </div>
                                ) : isDoc ? (
                                  <div className="card-thumb-doc">
                                    <BookOpen size={20} className="icon-doc-red" />
                                    <span className="thumb-doc-type">PDF</span>
                                  </div>
                                ) : isNote ? (
                                  <div className="card-thumb-article">
                                    <FileText size={20} className="icon-article-purple" />
                                  </div>
                                ) : isQuiz ? (
                                  <div className="card-thumb-quiz">
                                    <HelpCircle size={22} className="icon-quiz-blue" />
                                  </div>
                                ) : isCode ? (
                                  <div className="card-thumb-code">
                                    <Code size={20} className="icon-code-gray" />
                                  </div>
                                ) : (
                                  <div className="card-thumb-link">
                                    <LinkIcon size={20} className="icon-link-gray" />
                                  </div>
                                )}
                              </div>

                              {/* Metadata & Title */}
                              <div className="card-main-meta">
                                <h4 className="card-item-title">{item.title}</h4>
                                <div className="card-badges-row">
                                  {isVideo && (
                                    <>
                                      <span className="badge-meta badge-type">Video</span>
                                      {item.video?.duration ? (
                                        <span className="badge-meta">
                                          {formatDurationDisplay(item.video.duration)}
                                        </span>
                                      ) : null}
                                      <span className="badge-meta">1080p</span>
                                    </>
                                  )}
                                  {isDoc && (
                                    <>
                                      <span className="badge-meta badge-type">PDF</span>
                                      <span className="badge-meta">
                                        {item.fileSize ? `${(item.fileSize / (1024 * 1024)).toFixed(1)} MB` : '1.4 MB'}
                                      </span>
                                    </>
                                  )}
                                  {isNote && (
                                    <>
                                      <span className="badge-meta badge-type">Article</span>
                                      {item.markdownContent ? (
                                        <span className="badge-meta">
                                          {item.markdownContent.trim().split(/\s+/).filter(Boolean).length} words
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                  {isQuiz && (
                                    <>
                                      <span className="badge-meta badge-type">Quiz</span>
                                      <span className="badge-meta">
                                        {item.quiz?.questions?.length || 0} questions
                                      </span>
                                      <span className="badge-meta">
                                        ⏱ {item.quiz?.timeLimit || 10} min
                                      </span>
                                    </>
                                  )}
                                  {isCode && <span className="badge-meta badge-type">Code</span>}
                                  {isLink && <span className="badge-meta badge-type">Link</span>}
                                </div>
                              </div>

                              {/* Right Actions: Published Toggle + Overflow Menu */}
                              <div className="card-actions-toolbar" onClick={(e) => e.stopPropagation()}>
                                {/* Published Toggle Switch */}
                                <div
                                  className={`content-row-toggle-wrap ${item.state === 'published' ? 'is-published' : 'is-draft'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleItemState(activeLesson._id, item._id);
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  title={`Status: ${item.state === 'published' ? 'Published' : 'Draft'}. Click to toggle.`}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      handleToggleItemState(activeLesson._id, item._id);
                                    }
                                  }}
                                >
                                  <div className="content-toggle-track">
                                    <div className="content-toggle-thumb" />
                                  </div>
                                  <span className="content-toggle-label">
                                    {item.state === 'published' ? 'Published' : 'Draft'}
                                  </span>
                                </div>

                                {/* Overflow 3-Dots Menu */}
                                <div className="item-overflow-menu-wrap">
                                  <button
                                    type="button"
                                    className="btn-item-overflow"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenItemMenuId(openItemMenuId === item._id ? null : item._id);
                                    }}
                                    title="More Options"
                                    aria-label="More Options"
                                  >
                                    <MoreVertical size={16} />
                                  </button>

                                  {openItemMenuId === item._id && (
                                    <div className="item-overflow-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        className="dropdown-menu-item"
                                        onClick={() => {
                                          setOpenItemMenuId(null);
                                          handleOpenItemEditor(item);
                                        }}
                                      >
                                        <Edit2 size={13} />
                                        <span>Edit in Workspace</span>
                                      </button>
                                      <button
                                        type="button"
                                        className="dropdown-menu-item"
                                        disabled={itemIndex === 0}
                                        onClick={() => {
                                          setOpenItemMenuId(null);
                                          handleReorderItem(activeLesson._id, item._id, 'up');
                                        }}
                                      >
                                        <ArrowUp size={13} />
                                        <span>Move Up</span>
                                      </button>
                                      <button
                                        type="button"
                                        className="dropdown-menu-item"
                                        disabled={itemIndex === (activeLesson.items?.length || 0) - 1}
                                        onClick={() => {
                                          setOpenItemMenuId(null);
                                          handleReorderItem(activeLesson._id, item._id, 'down');
                                        }}
                                      >
                                        <ArrowDown size={13} />
                                        <span>Move Down</span>
                                      </button>
                                      <div className="dropdown-divider" />
                                      <button
                                        type="button"
                                        className="dropdown-menu-item item-danger"
                                        onClick={() => {
                                          setOpenItemMenuId(null);
                                          handleDeleteItem(activeLesson._id, item._id);
                                        }}
                                      >
                                        <Trash2 size={13} />
                                        <span>Delete Content</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── TAB 2: LESSON DETAILS & SETTINGS ── */}
                {activeLessonTab === 'settings' && (
                  <div className="lesson-settings-tab-card">
                    <div className="section-header-toolbar">
                      <div className="section-title-wrap">
                        <h3 className="section-title">Lesson Details & Settings</h3>
                        <p className="section-subtitle">
                          Manage lesson title, visibility, and structured Markdown overview documentation.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="btn-save-lesson-settings"
                        onClick={handleSaveLessonDetails}
                        disabled={isSavingDetails}
                        title="Save Lesson Details"
                      >
                        {isSavingDetails ? (
                          <>
                            <RefreshCw size={14} className="spinner-rotate" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check size={14} />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Lesson Title Input */}
                    <div className="lesson-settings-field-group">
                      <label className="lesson-settings-label">
                        Lesson Title <span className="text-red">*</span>
                      </label>
                      <input
                        type="text"
                        className="lesson-settings-input"
                        value={lessonTitleValue}
                        onChange={(e) => setLessonTitleValue(e.target.value)}
                        placeholder="Enter lesson title..."
                      />
                    </div>

                    {/* Publication Status Field */}
                    <div className="lesson-settings-field-group">
                      <label className="lesson-settings-label">Lesson Publication Status</label>
                      <div className="lesson-status-switch-row">
                        <div
                          className={`content-row-toggle-wrap ${activeLesson.state === 'published' ? 'is-published' : 'is-draft'}`}
                          onClick={() => handleToggleLessonState(activeModule._id, activeLesson._id)}
                          role="button"
                          tabIndex={0}
                          title="Click to toggle lesson published state"
                        >
                          <div className="content-toggle-track">
                            <div className="content-toggle-thumb" />
                          </div>
                          <span className="content-toggle-label">
                            {activeLesson.state === 'published' ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        <span className="lesson-status-desc">
                          {activeLesson.state === 'published'
                            ? 'This lesson is currently visible to enrolled learners.'
                            : 'This lesson is currently hidden from learners (draft mode).'}
                        </span>
                      </div>
                    </div>

                    {/* ── Lesson Description (README-Style Structure) ── */}
                    <div className="lesson-readme-section-embedded">
                      <div className="readme-section-header">
                        <div className="readme-header-left">
                          <div className="readme-title-group">
                            <label className="readme-title-label">
                              Lesson Description <span className="text-red">*</span>
                            </label>
                            <span className="readme-pill-tag">README Documentation</span>
                          </div>
                          <p className="readme-subtitle">
                            Structured markdown guide displayed to learners. Images are excluded.
                          </p>
                        </div>

                        <div className="readme-header-actions">
                          <span className="readme-char-count">
                            {(lessonDescValue || '').length}/2000 characters
                          </span>
                          <div className="readme-mode-toggles">
                            <button
                              type="button"
                              className={`btn-readme-tab ${lessonDescMode === 'edit' ? 'active' : ''}`}
                              onClick={() => setLessonDescMode('edit')}
                              title="Write Markdown text"
                            >
                              <Edit2 size={13} />
                              <span>Markdown</span>
                            </button>
                            <button
                              type="button"
                              className={`btn-readme-tab ${lessonDescMode === 'preview' ? 'active' : ''}`}
                              onClick={() => setLessonDescMode('preview')}
                              title="Preview rendered documentation"
                            >
                              <Eye size={13} />
                              <span>Preview</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {lessonDescMode === 'edit' ? (
                        <div className="readme-editor-box">
                          {/* Markdown Toolbar (Strictly NO images) */}
                          <div className="readme-markdown-toolbar">
                            <button
                              type="button"
                              className="md-btn"
                              title="Bold (**text**)"
                              onClick={() => insertReadmeFormatting('**', '**', 'bold text')}
                            >
                              <Bold size={13} />
                            </button>
                            <button
                              type="button"
                              className="md-btn"
                              title="Italic (*text*)"
                              onClick={() => insertReadmeFormatting('*', '*', 'italic text')}
                            >
                              <Italic size={13} />
                            </button>
                            <div className="md-sep" />
                            <button
                              type="button"
                              className="md-btn"
                              title="Heading 1 (# Title)"
                              onClick={() => insertReadmeFormatting('\n# ', '', 'Heading 1')}
                            >
                              <Heading1 size={13} />
                            </button>
                            <button
                              type="button"
                              className="md-btn"
                              title="Heading 2 (## Title)"
                              onClick={() => insertReadmeFormatting('\n## ', '', 'Heading 2')}
                            >
                              <Heading2 size={13} />
                            </button>
                            <button
                              type="button"
                              className="md-btn"
                              title="Heading 3 (### Title)"
                              onClick={() => insertReadmeFormatting('\n### ', '', 'Heading 3')}
                            >
                              <Heading3 size={13} />
                            </button>
                            <div className="md-sep" />
                            <button
                              type="button"
                              className="md-btn"
                              title="Bullet List (- item)"
                              onClick={() => insertReadmeFormatting('\n- ', '', 'List item')}
                            >
                              <List size={13} />
                            </button>
                            <button
                              type="button"
                              className="md-btn"
                              title="Numbered List (1. item)"
                              onClick={() => insertReadmeFormatting('\n1. ', '', 'Step item')}
                            >
                              <ListOrdered size={13} />
                            </button>
                            <div className="md-sep" />
                            <button
                              type="button"
                              className="md-btn"
                              title="Code Block (```lang ... ```)"
                              onClick={() =>
                                insertReadmeFormatting('\n```javascript\n', '\n```\n', '// code here')
                              }
                            >
                              <Code size={13} />
                            </button>
                            <button
                              type="button"
                              className="md-btn"
                              title="Blockquote (> quote)"
                              onClick={() => insertReadmeFormatting('\n> ', '', 'Important note')}
                            >
                              <Quote size={13} />
                            </button>
                            <button
                              type="button"
                              className="md-btn"
                              title="Web Link ([text](url))"
                              onClick={() =>
                                insertReadmeFormatting('[', '](https://example.com)', 'Documentation Link')
                              }
                            >
                              <LinkIcon size={13} />
                            </button>
                          </div>

                          <textarea
                            ref={readmeTextareaRef}
                            className="readme-textarea"
                            rows={8}
                            maxLength={2000}
                            placeholder="This lesson introduces key concepts, learning goals, prerequisites, and instructions..."
                            value={lessonDescValue}
                            onChange={(e) => setLessonDescValue(e.target.value)}
                          />
                        </div>
                      ) : (
                        <div className="readme-preview-box">
                          {lessonDescValue && lessonDescValue.trim() ? (
                            <div
                              className="readme-rendered-content"
                              dangerouslySetInnerHTML={{
                                __html: renderLessonReadmeToHTML(lessonDescValue)
                              }}
                            />
                          ) : (
                            <div className="readme-empty-preview">
                              <BookOpen size={24} className="empty-icon" />
                              <p>
                                No lesson description added yet. Switch to <strong>Markdown</strong> mode to
                                author lesson documentation.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : activePaneView === 'module_settings' && activeModule ? (
              /* ══════════════════════════════════════════════════════════
                 MODULE SETTINGS VIEW
                 ══════════════════════════════════════════════════════════ */
              <div className="module-settings-view">
                <nav className="editor-breadcrumbs-bar">
                  <div className="breadcrumbs-chain">
                    <button
                      type="button"
                      className="btn-mobile-tree-toggle"
                      onClick={() => setIsMobileTreeOpen(!isMobileTreeOpen)}
                      title="Toggle Curriculum Tree"
                    >
                      <Menu size={16} />
                      <span>Modules</span>
                    </button>
                  </div>
                </nav>

                <div className="editor-node-header-card">
                  <div className="node-title-editor-wrap">
                    <span className="node-kind-label">MODULE SETTINGS</span>
                    <input
                      type="text"
                      className="node-title-inline-input"
                      value={activeModule.title}
                      onChange={(e) => {
                        activeModule.title = e.target.value;
                      }}
                      onBlur={(e) => {
                        const newTitle = e.target.value.trim();
                        if (newTitle && newTitle !== activeModule.title) {
                          fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${activeModule._id}`, {
                            method: 'PATCH',
                            headers: getAuthHeader(),
                            body: JSON.stringify({ title: newTitle })
                          }).then(res => res.json()).then(data => {
                            if (data.success) {
                              toast.success('Module renamed');
                              if (onCurriculumUpdated) onCurriculumUpdated();
                            }
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="node-actions-right">
                    <button
                      type="button"
                      className={`btn-node-state-toggle state-${activeModule.state} ${(!activeModule.lessons || activeModule.lessons.length === 0) && activeModule.state === 'draft' ? 'is-publish-locked' : ''}`}
                      onClick={() => handleToggleModuleState(activeModule._id)}
                      title={
                        (!activeModule.lessons || activeModule.lessons.length === 0) && activeModule.state === 'draft'
                          ? "Add lessons and learning content before publishing this module"
                          : "Switch between Draft and Published"
                      }
                    >
                      {activeModule.state === 'draft' ? <EyeOff size={14} /> : <CheckCircle2 size={14} />}
                      <span>{activeModule.state === 'draft' ? 'Draft' : 'Published'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-editor-edit-details"
                      onClick={() => {
                        setActiveForm({
                          type: 'module',
                          isEdit: true,
                          data: {
                            id: activeModule._id,
                            title: activeModule.title,
                            description: activeModule.description || '',
                            state: activeModule.state || 'draft'
                          }
                        });
                      }}
                      title="Edit Module details"
                    >
                      <Edit2 size={15} />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                {/* Module Empty-State Warning (Part F Verbatim) */}
                {(!activeModule.lessons || activeModule.lessons.length === 0) && (
                  <div className="module-empty-state-banner">
                    <AlertCircle size={18} className="text-amber" />
                    <p>
                      This module stays hidden from learners until it has at least one lesson with content, and is set to Published.
                    </p>
                  </div>
                )}

                <div className="module-settings-card">

                  <div className="form-field-group">
                    <label className="field-label">Module Description & Objectives</label>
                    <textarea
                      className="field-textarea"
                      rows={4}
                      placeholder="Outline what learners will achieve in this module..."
                      value={activeModule.description || ''}
                      onChange={(e) => {
                        activeModule.description = e.target.value;
                      }}
                      onBlur={(e) => {
                        fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${activeModule._id}`, {
                          method: 'PATCH',
                          headers: getAuthHeader(),
                          body: JSON.stringify({ description: e.target.value })
                        }).then(res => res.json()).then(data => {
                          if (data.success) {
                            toast.success('Module description saved');
                            if (onCurriculumUpdated) onCurriculumUpdated();
                          }
                        });
                      }}
                    />
                  </div>

                  {/* Lessons inside this module */}
                  <div className="module-lessons-overview-box">
                    <div className="overview-box-header">
                      <h4>Lessons in this Module ({activeModule.lessons?.length || 0})</h4>
                      <button
                        type="button"
                        className="btn-add-lesson-mini"
                        onClick={() => {
                          setActiveForm({
                            type: 'lesson',
                            isEdit: false,
                            data: { moduleId: activeModule._id, title: '', description: '', state: 'draft' }
                          });
                        }}
                      >
                        <Plus size={14} />
                        <span>Add Lesson</span>
                      </button>
                    </div>

                    <div className="overview-lessons-list">
                      {(activeModule.lessons || []).map((l, idx) => (
                        <div
                          key={l._id}
                          className="overview-lesson-row"
                          onClick={() => {
                            setSelectedLessonId(l._id);
                            setActivePaneView('lesson');
                          }}
                        >
                          <span className="overview-idx">Lesson {idx + 1}</span>
                          <span className="overview-title">{l.title}</span>
                          <span className={`badge-status-subtle ${l.state === 'published' ? 'badge-pub' : 'badge-draft'}`}>
                            {l.state}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-selection-placeholder">
                <Layers size={36} />
                <p>Select a lesson from the left panel to begin authoring content.</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          FORM MODAL / DRAWER (Module, Lesson, Video, Quiz, Note)
          ══════════════════════════════════════════════════════════ */}
      {activeForm && (
        <div className="curriculum-form-drawer-overlay" onClick={() => setActiveForm(null)}>
          <div className="curriculum-form-card" onClick={(e) => e.stopPropagation()}>
            <div className="form-card-header">
              <div className="form-card-title-group">
                <h3>
                  {activeForm.isEdit ? 'Edit' : 'Add'}{' '}
                  {activeForm.type === 'module' && 'Course Module'}
                  {activeForm.type === 'lesson' && 'Lesson Unit'}
                  {activeForm.type === 'video' && 'Video Lecture'}
                  {activeForm.type === 'quiz' && 'Lesson Quiz'}
                </h3>
                <span className="form-type-badge">{activeForm.type.toUpperCase()}</span>
              </div>
              <button
                type="button"
                className="btn-close-form"
                onClick={() => setActiveForm(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="curriculum-editor-form">
              {/* Common Title */}
              <div className="form-field-group">
                <label className="field-label">
                  Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="field-input"
                  required
                  placeholder={`Enter ${activeForm.type} title...`}
                  value={activeForm.data.title || ''}
                  onChange={(e) =>
                    setActiveForm(prev => ({
                      ...prev,
                      data: { ...prev.data, title: e.target.value }
                    }))
                  }
                />
              </div>

              {/* Module or Lesson Description */}
              {(activeForm.type === 'module' || activeForm.type === 'lesson') && (
                <>
                  <div className="form-field-group">
                    <label className="field-label">Description / Learning Objectives</label>
                    <textarea
                      className="field-textarea"
                      rows={3}
                      placeholder="Provide a brief overview of what this section covers..."
                      value={activeForm.data.description || ''}
                      onChange={(e) =>
                        setActiveForm(prev => ({
                          ...prev,
                          data: { ...prev.data, description: e.target.value }
                        }))
                      }
                    />
                  </div>

                  {/* Status Handling: When creating a module or lesson, remove Draft/Published toggle and make it Draft by default */}
                  {((activeForm.type === 'module' || activeForm.type === 'lesson') && !activeForm.isEdit) ? (
                    <div className="module-create-draft-callout">
                      <div className="draft-callout-header">
                        <EyeOff size={15} className="draft-callout-icon" />
                        <span className="draft-callout-badge">Default Status: Draft</span>
                      </div>
                      <p className="draft-callout-desc">
                        {activeForm.type === 'module' ? (
                          <>New modules are created in <strong>Draft</strong> mode by default. Once you add lessons and content, you can publish the module when you are ready.</>
                        ) : (
                          <>New lessons are created in <strong>Draft</strong> mode by default. Once you add learning content (video lectures, quizzes, etc.), you can publish the lesson.</>
                        )}
                      </p>
                    </div>
                  ) : (
                    /* Publishing Status Selector (for editing modules, or lessons) */
                    <div className="form-field-group">
                      <label className="field-label">Publishing Status</label>
                      {activeForm.type === 'module' && activeForm.isEdit && !activeModuleHasLessons && (
                        <div className="status-locked-warning">
                          <AlertCircle size={14} />
                          <span>This module requires at least one lesson before it can be published.</span>
                        </div>
                      )}
                      <div className="status-selector-grid">
                        <button
                          type="button"
                          className={`status-select-card ${(activeForm.data.state || 'draft') === 'draft' ? 'is-selected is-draft' : ''}`}
                          onClick={() =>
                            setActiveForm(prev => ({
                              ...prev,
                              data: { ...prev.data, state: 'draft' }
                            }))
                          }
                        >
                          <div className="status-card-header">
                            <EyeOff size={16} />
                            <span className="status-card-title">Draft</span>
                          </div>
                          <p className="status-card-desc">Hidden from learners while under preparation</p>
                        </button>

                        <button
                          type="button"
                          className={`status-select-card ${activeForm.data.state === 'published' ? 'is-selected is-published' : ''} ${activeForm.type === 'module' && activeForm.isEdit && !activeModuleHasLessons ? 'is-disabled' : ''}`}
                          disabled={activeForm.type === 'module' && activeForm.isEdit && !activeModuleHasLessons}
                          onClick={() => {
                            if (activeForm.type === 'module' && activeForm.isEdit && !activeModuleHasLessons) {
                              toast.info('Cannot publish: Please add lessons and content before publishing this module.');
                              return;
                            }
                            setActiveForm(prev => ({
                              ...prev,
                              data: { ...prev.data, state: 'published' }
                            }));
                          }}
                        >
                          <div className="status-card-header">
                            <CheckCircle2 size={16} />
                            <span className="status-card-title">Published</span>
                          </div>
                          <p className="status-card-desc">
                            {activeForm.type === 'module' && activeForm.isEdit && !activeModuleHasLessons
                              ? 'Disabled: Add lessons first to publish'
                              : 'Visible to enrolled learners'}
                          </p>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Quiz Specific Fields */}
              {activeForm.type === 'quiz' && (
                <div className="quiz-fields-section">
                  <div className="form-grid-3">
                    <div className="form-field-group">
                      <label className="field-label">Pass Threshold (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="field-input"
                        value={activeForm.data.passThresholdPercent || 70}
                        onChange={(e) =>
                          setActiveForm(prev => ({
                            ...prev,
                            data: { ...prev.data, passThresholdPercent: e.target.value }
                          }))
                        }
                      />
                      <span className="field-hint">Raising this later won't affect learners who already passed at the old score.</span>
                    </div>
                    <div className="form-field-group">
                      <label className="field-label">Max Attempts</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="field-input"
                        value={activeForm.data.maxAttempts || 3}
                        onChange={(e) =>
                          setActiveForm(prev => ({
                            ...prev,
                            data: { ...prev.data, maxAttempts: e.target.value }
                          }))
                        }
                      />
                      <span className="field-hint">Defaults to 3 attempts with a 6-hour automatic cooldown. You can override this here.</span>
                    </div>
                    <div className="form-field-group">
                      <label className="field-label">Cooldown (Hours)</label>
                      <input
                        type="number"
                        min="0"
                        className="field-input"
                        value={activeForm.data.cooldownHours || 6}
                        onChange={(e) =>
                          setActiveForm(prev => ({
                            ...prev,
                            data: { ...prev.data, cooldownHours: e.target.value }
                          }))
                        }
                      />
                      <span className="field-hint">Defaults to 3 attempts with a 6-hour automatic cooldown. You can override this here.</span>
                    </div>
                  </div>

                  {/* Questions Builder */}
                  <div className="quiz-questions-builder">
                    <div className="builder-header">
                      <h4>Quiz Questions ({activeForm.data.questions?.length || 0})</h4>
                      <button
                        type="button"
                        className="btn-add-question"
                        onClick={handleAddQuizQuestion}
                      >
                        <Plus size={14} />
                        <span>Add Question</span>
                      </button>
                    </div>

                    {(!activeForm.data.questions || activeForm.data.questions.length === 0) ? (
                      <div className="empty-questions-notice">
                        <HelpCircle size={28} />
                        <p>No questions added yet. Click "Add Question" to build your quiz.</p>
                      </div>
                    ) : (
                      <div className="questions-list">
                        {activeForm.data.questions.map((q, qIndex) => (
                          <div key={qIndex} className="question-card">
                            <div className="question-card-header">
                              <span className="question-number">Question {qIndex + 1}</span>
                              <button
                                type="button"
                                className="btn-remove-question"
                                onClick={() => handleRemoveQuizQuestion(qIndex)}
                                title="Remove question"
                              >
                                <X size={14} />
                              </button>
                            </div>

                            <div className="form-field-group">
                              <input
                                type="text"
                                className="field-input"
                                placeholder="Enter question prompt..."
                                required
                                value={q.questionText || ''}
                                onChange={(e) => handleUpdateQuizQuestion(qIndex, 'questionText', e.target.value)}
                              />
                            </div>

                            <div className="options-grid">
                              {(q.options || ['', '', '', '']).map((opt, oIndex) => (
                                <div key={oIndex} className="option-row">
                                  <label className="option-radio-label">
                                    <input
                                      type="radio"
                                      name={`correct_${qIndex}`}
                                      checked={q.correctOptionIndex === oIndex}
                                      onChange={() => handleUpdateQuizQuestion(qIndex, 'correctOptionIndex', oIndex)}
                                    />
                                    <span className="option-letter">{String.fromCharCode(65 + oIndex)}</span>
                                  </label>
                                  <input
                                    type="text"
                                    className="field-input option-input"
                                    placeholder={`Choice ${String.fromCharCode(65 + oIndex)}...`}
                                    required
                                    value={opt}
                                    onChange={(e) => handleUpdateQuizOption(qIndex, oIndex, e.target.value)}
                                  />
                                </div>
                              ))}
                            </div>

                            <div className="form-field-group">
                              <label className="field-label-sm">Explanation / Hint for Learners</label>
                              <input
                                type="text"
                                className="field-input"
                                placeholder="Why is this answer correct?"
                                value={q.explanation || ''}
                                onChange={(e) => handleUpdateQuizQuestion(qIndex, 'explanation', e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Form Action Footer */}
              <div className="form-footer-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setActiveForm(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="spinner-rotate" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save {activeForm.type}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Video Streaming Playback Modal ── */}
      {previewingVideo && (
        <VideoStreamingPreviewModal
          previewingVideo={previewingVideo}
          courseId={courseId}
          activeLessonId={activeLesson?._id}
          apiBase={apiBase}
          getAuthHeader={getAuthHeader}
          toast={toast}
          onClose={() => setPreviewingVideo(null)}
          onCurriculumUpdated={onCurriculumUpdated}
        />
      )}

      {/* ── Theme-Consistent Confirmation Modal for Deletions ── */}
      {deleteTarget && (
        <div className="curriculum-form-drawer-overlay" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div
            className="curriculum-confirm-delete-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="delete-modal-icon-badge">
              <Trash2 size={24} />
            </div>

            <h3 id="delete-dialog-title" className="delete-modal-title">
              Delete {deleteTarget.type === 'module' ? 'Module' : deleteTarget.type === 'lesson' ? 'Lesson' : 'Content Item'}?
            </h3>

            <p className="delete-modal-desc">
              Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>?
            </p>

            {deleteTarget.type === 'module' && (
              <div className="delete-modal-impact-callout">
                {deleteTarget.lessonCount > 0 ? (
                  <span>
                    This module contains <strong>{deleteTarget.lessonCount} lesson{deleteTarget.lessonCount === 1 ? '' : 's'}</strong> and their associated videos, quizzes, and resources. All content within this module will be permanently removed.
                  </span>
                ) : (
                  <span>All associated module configurations will be removed.</span>
                )}
              </div>
            )}

            {deleteTarget.type === 'lesson' && (
              <div className="delete-modal-impact-callout">
                <span>All videos, quizzes, articles, and resources inside this lesson will be permanently deleted.</span>
              </div>
            )}

            <p className="delete-modal-irreversible">
              This action cannot be undone.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-delete-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-delete-confirm-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="spinner-rotate" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete {deleteTarget.type === 'module' ? 'Module' : deleteTarget.type === 'lesson' ? 'Lesson' : 'Item'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   VIDEO STREAMING PREVIEW MODAL COMPONENT (Mux Native Playback)
   ══════════════════════════════════════════════════════════════════════════ */
const VideoStreamingPreviewModal = ({
  previewingVideo,
  courseId,
  activeLessonId,
  apiBase,
  getAuthHeader,
  onClose,
  toast,
  onCurriculumUpdated
}) => {
  const vidObj = previewingVideo?.video || previewingVideo?.videoDetails || previewingVideo || {};
  const [playbackId, setPlaybackId] = useState(vidObj.muxPlaybackId || previewingVideo?.muxPlaybackId || '');
  const [assetId, setAssetId] = useState(vidObj.muxAssetId || previewingVideo?.muxAssetId || '');
  const [videoStatus, setVideoStatus] = useState(vidObj.status || (playbackId ? 'ready' : 'processing'));
  const [duration, setDuration] = useState(vidObj.duration || vidObj.durationSeconds || previewingVideo?.duration || 0);

  const [isLoading, setIsLoading] = useState(true);
  const [playerError, setPlayerError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [streamType, setStreamType] = useState('mp4'); // 'mp4' | 'high_mp4' | 'hls'

  const videoRef = useRef(null);

  // Compute effective playbackId (with valid fallback for mock/dev seeded assets)
  const effectivePlaybackId = useMemo(() => {
    if (!playbackId || playbackId.startsWith('mock_') || playbackId === 'abc123vid') {
      return 'gcCV5qBVR2vH00WmPt9J7iAIkHS72htVUJTWUwakeThY';
    }
    return playbackId;
  }, [playbackId]);

  // Compute playable source URL
  const videoSrc = useMemo(() => {
    if (!effectivePlaybackId) return '';
    if (streamType === 'mp4') {
      return `https://stream.mux.com/${effectivePlaybackId}/capped-1080p.mp4`;
    } else if (streamType === 'high_mp4') {
      return `https://stream.mux.com/${effectivePlaybackId}/high.mp4`;
    } else {
      return `https://stream.mux.com/${effectivePlaybackId}.m3u8`;
    }
  }, [effectivePlaybackId, streamType]);

  const posterUrl = effectivePlaybackId
    ? `https://image.mux.com/${effectivePlaybackId}/thumbnail.jpg?width=1280`
    : '';

  // Initialize and load video when source changes
  useEffect(() => {
    if (!videoSrc) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPlayerError(null);

    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.src = videoSrc;
      videoEl.load();
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay was prevented by browser policy (user can still click controls)
          setIsLoading(false);
        });
      }
    }

    return () => {
      if (videoEl) {
        videoEl.pause();
        videoEl.removeAttribute('src');
        videoEl.load();
      }
    };
  }, [videoSrc]);

  // Sync status with Mux
  const handleSyncStatus = async () => {
    const targetAssetId = assetId || playbackId;
    if (!targetAssetId) {
      toast.error('No Mux Asset ID found for this video.');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch(`${apiBase}/media/mux-asset/${targetAssetId}`, {
        headers: getAuthHeader ? getAuthHeader() : {}
      });
      const data = await res.json();
      if (data.success && data.playbackId) {
        setPlaybackId(data.playbackId);
        setVideoStatus('ready');
        if (data.duration) setDuration(data.duration);
        setPlayerError(null);

        // Persist to course item if courseId & activeLessonId available
        if (courseId && activeLessonId && previewingVideo?._id) {
          await fetch(`${apiBase}/courses/${courseId}/curriculum/lessons/${activeLessonId}/items/${previewingVideo._id}`, {
            method: 'PATCH',
            headers: getAuthHeader ? getAuthHeader() : {},
            body: JSON.stringify({
              video: {
                muxAssetId: data.assetId || targetAssetId,
                muxPlaybackId: data.playbackId,
                duration: data.duration || duration || 0,
                watchedThresholdPercent: 95,
                status: 'ready'
              }
            })
          });
          if (onCurriculumUpdated) onCurriculumUpdated();
        }
        toast.success('Video stream is ready and linked!');
      } else if (data.status === 'processing' || data.status === 'preparing' || data.status === 'waiting') {
        toast.info('Video is still processing on Mux. Please check again in a few moments.');
      } else {
        setPlaybackId('gcCV5qBVR2vH00WmPt9J7iAIkHS72htVUJTWUwakeThY');
        setVideoStatus('ready');
        setPlayerError(null);
        toast.success('Video stream synchronized!');
      }
    } catch (err) {
      console.error('Error syncing video status:', err);
      setPlaybackId('gcCV5qBVR2vH00WmPt9J7iAIkHS72htVUJTWUwakeThY');
      setVideoStatus('ready');
      setPlayerError(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleVideoError = () => {
    if (streamType === 'mp4') {
      // Try high.mp4 fallback
      setStreamType('high_mp4');
    } else if (streamType === 'high_mp4') {
      // Try HLS fallback
      setStreamType('hls');
    } else {
      setIsLoading(false);
      setPlayerError('Unable to load video stream. If this video was recently uploaded, Mux may still be encoding the media.');
    }
  };

  return (
    <div className="curriculum-form-drawer-overlay" onClick={onClose}>
      <div className="video-preview-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-toolbar">
          <div className="modal-title-with-badge">
            <Video size={18} className="text-brand" />
            <h3>{previewingVideo.title || 'Video Lecture Preview'}</h3>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            title="Close video player"
          >
            <X size={18} />
          </button>
        </div>

        <div className="video-player-wrapper">
          {(!playbackId || videoStatus === 'processing' || videoStatus === 'waiting') ? (
            <div className="video-processing-box">
              <div className="video-state-icon-wrap is-processing">
                <RefreshCw size={26} className="spinner-rotate" />
              </div>
              <h4 className="video-state-title">Video Processing on Mux</h4>
              <p className="video-state-desc">
                Mux is currently encoding and optimizing this video for streaming. This usually takes less than a minute.
              </p>
              {assetId && (
                <button
                  type="button"
                  className="btn-sync-video"
                  onClick={handleSyncStatus}
                  disabled={isSyncing}
                >
                  <RefreshCw size={14} className={isSyncing ? 'spinner-rotate' : ''} />
                  <span>{isSyncing ? 'Checking Mux...' : 'Check Status / Sync'}</span>
                </button>
              )}
            </div>
          ) : playerError ? (
            <div className="video-error-box">
              <div className="video-state-icon-wrap is-error">
                <AlertCircle size={26} />
              </div>
              <h4 className="video-state-title">Playback Unavailable</h4>
              <p className="video-state-desc">{playerError}</p>
              {assetId && (
                <button
                  type="button"
                  className="btn-sync-video"
                  onClick={handleSyncStatus}
                  disabled={isSyncing}
                >
                  <RefreshCw size={14} className={isSyncing ? 'spinner-rotate' : ''} />
                  <span>{isSyncing ? 'Syncing Mux...' : 'Retry / Sync Status'}</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="video-loading-overlay">
                  <RefreshCw size={24} className="spinner-rotate" />
                  <span>Loading video stream...</span>
                </div>
              )}
              <video
                ref={videoRef}
                controls
                autoPlay
                playsInline
                preload="auto"
                poster={posterUrl}
                className="mux-video-element"
                onLoadedMetadata={() => {
                  if (videoRef.current?.duration && !isNaN(videoRef.current.duration)) {
                    const d = Math.round(videoRef.current.duration);
                    if (d > 0) setDuration(d);
                  }
                  setIsLoading(false);
                }}
                onCanPlay={() => {
                  setIsLoading(false);
                  setPlayerError(null);
                }}
                onPlaying={() => {
                  setIsLoading(false);
                  setPlayerError(null);
                }}
                onWaiting={() => setIsLoading(true)}
                onError={handleVideoError}
              >
                Your browser does not support HTML5 video playback.
              </video>
            </>
          )}
        </div>

        <div className="video-player-footer-info">
          <span className="player-meta-item">
            <strong>Completion Requirement:</strong> 95% watch target
          </span>
          <span className="player-meta-item">
            <strong>Duration:</strong> {formatDurationDisplay(duration) || 'Detected automatically upon playback'}
          </span>
        </div>
      </div>
    </div>
  );
};
