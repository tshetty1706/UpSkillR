import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Layers,
  Plus,
  Edit2,
  ChevronDown,
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
  Menu
} from 'lucide-react';
import { InstructorTip } from './Common/InstructorTip';
import { DeviceFileUploader } from './Common/DeviceFileUploader';

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

  // 'lesson' | 'module_settings'
  const [activePaneView, setActivePaneView] = useState('lesson');

  // Expanded modules in the left tree
  const [expandedModules, setExpandedModules] = useState(() => {
    const initial = {};
    if (modules.length > 0) initial[modules[0]._id] = true;
    return initial;
  });

  // Mobile tree drawer open/close
  const [isMobileTreeOpen, setIsMobileTreeOpen] = useState(false);

  // Dismissible lesson hint (stored in localStorage as allowed by Rule G)
  const [isLessonTipDismissed, setIsLessonTipDismissed] = useState(() => {
    return localStorage.getItem('upskillr_dismissed_lesson_tip') === 'true';
  });

  // Dropdown menu state for "+ Add Content Item"
  const [isAddContentMenuOpen, setIsAddContentMenuOpen] = useState(false);

  // Active modal/drawer form state
  // null | { type: 'module' | 'lesson' | 'video' | 'quiz', isEdit: boolean, data: {} }
  const [activeForm, setActiveForm] = useState(null);
  const [isReplacingVideo, setIsReplacingVideo] = useState(false);
  const [saving, setSaving] = useState(false);

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


  const toggleModuleAccordion = (modId) => {
    setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  const handleDismissLessonTip = () => {
    setIsLessonTipDismissed(true);
    try {
      localStorage.setItem('upskillr_dismissed_lesson_tip', 'true');
    } catch (e) {
      // localStorage policy
    }
  };

  /* ─────────────────────────────────────────────────────────────
     FRACTIONAL SORTING REORDER HELPER
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

  /* ─────────────────────────────────────────────────────────────
     MUTATION HANDLERS (Live Backend Integration)
     ───────────────────────────────────────────────────────────── */

  // Module State Toggle
  const handleToggleModuleState = async (moduleId) => {
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
        payload = {
          title: data.title.trim(),
          description: (data.description || '').trim(),
          state: data.state || 'draft'
        };
      } else if (type === 'lesson') {
        url = isEdit
          ? `${apiBase}/courses/${courseId}/curriculum/modules/${data.moduleId}/lessons/${data.id}`
          : `${apiBase}/courses/${courseId}/curriculum/modules/${data.moduleId}/lessons`;
        payload = {
          title: data.title.trim(),
          description: (data.description || '').trim(),
          state: data.state || 'draft'
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

        // Immediately select and expand newly created entities
        if (type === 'module' && !isEdit && resData.module?._id) {
          setSelectedModuleId(resData.module._id);
          setExpandedModules(prev => ({ ...prev, [resData.module._id]: true }));
          setSelectedLessonId(null);
          setActivePaneView('module_settings');
        } else if (type === 'lesson' && !isEdit && resData.lesson?._id) {
          setSelectedModuleId(data.moduleId);
          setSelectedLessonId(resData.lesson._id);
          setActivePaneView('lesson');
          setExpandedModules(prev => ({ ...prev, [data.moduleId]: true }));
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
      {/* ── Subpage Header ── */}
      <div className="subpage-header-row">
        <div className="subpage-title-group">
          <button
            type="button"
            className="btn-back-nav"
            onClick={onBack}
            title="Return to Course Content hub"
          >
            <ArrowLeft size={18} />
            <span>Back to Course Content</span>
          </button>
          <div className="subpage-heading-block">
            <h2 className="subpage-title">Curriculum Structure Editor</h2>
            <p className="subpage-subtitle">
              Design modules, lessons, video lectures, and quizzes with real-time progression control.
            </p>
          </div>
        </div>

        <div className="subpage-header-actions">
          {onEnterPreview && (
            <button
              type="button"
              className="btn-preview-learner"
              onClick={onEnterPreview}
              title="Preview real progression as a learner"
            >
              <Eye size={16} />
              <span>Preview as Learner</span>
            </button>
          )}

          {/* Mobile tree navigation toggle */}
          <button
            type="button"
            className="btn-mobile-tree-toggle"
            onClick={() => setIsMobileTreeOpen(!isMobileTreeOpen)}
            title="Toggle Curriculum Tree"
          >
            <Menu size={18} />
            <span>Modules</span>
          </button>
        </div>
      </div>


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
          {/* ══════════════════════════════════════════════════════════
              LEFT PANEL: COURSE HIERARCHY TREE
              ══════════════════════════════════════════════════════════ */}
          <aside className={`curriculum-hierarchy-sidebar ${isMobileTreeOpen ? 'mobile-open' : ''}`}>
            <div className="hierarchy-sidebar-header">
              <div className="hierarchy-course-title-wrap">
                <BookOpen size={16} className="text-brand" />
                <h4 className="hierarchy-course-title" title={course?.title || 'Course Curriculum'}>
                  {course?.title || 'Course Curriculum'}
                </h4>
              </div>
              <span className="hierarchy-modules-count">
                {modules.length} {modules.length === 1 ? 'Module' : 'Modules'}
              </span>
            </div>

            <div className="hierarchy-modules-tree">
              {modules.map((module, modIndex) => {
                const isActiveModule = module._id === selectedModuleId;
                const isExpanded = expandedModules[module._id] ?? isActiveModule;
                const isModuleDraft = module.state === 'draft';
                const lessons = module.lessons || [];

                return (
                  <div
                    key={module._id}
                    className={`hierarchy-module-node ${isActiveModule ? 'is-active-module' : ''} ${isModuleDraft ? 'is-draft' : ''}`}
                  >
                    {/* Module Row Header */}
                    <div className="hierarchy-module-row">
                      <button
                        type="button"
                        className="btn-tree-accordion"
                        onClick={() => toggleModuleAccordion(module._id)}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </button>

                      <div className="hierarchy-module-info">
                        <span className="hierarchy-module-badge">Mod {modIndex + 1}</span>
                        <span className="hierarchy-module-name" title={module.title}>
                          {module.title}
                        </span>
                      </div>

                      <div className="hierarchy-module-actions">
                        {/* Edit Module Button */}
                        <button
                          type="button"
                          className="btn-hierarchy-icon"
                          title="Edit Module"
                          onClick={() => {
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
                          <Settings size={13} />
                        </button>

                        {/* Reorder Module Up/Down */}
                        <div className="hierarchy-reorder-group">
                          <button
                            type="button"
                            className="btn-hierarchy-reorder"
                            disabled={modIndex === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderModule(module._id, 'up');
                            }}
                            title="Move Module Up"
                          >
                            <ArrowUp size={11} />
                          </button>
                          <button
                            type="button"
                            className="btn-hierarchy-reorder"
                            disabled={modIndex === modules.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderModule(module._id, 'down');
                            }}
                            title="Move Module Down"
                          >
                            <ArrowDown size={11} />
                          </button>
                        </div>
                      </div>
                    </div>


                    {/* Nested Lessons List */}
                    {isExpanded && (
                      <div className="hierarchy-lessons-sublist">
                        {lessons.length === 0 ? (
                          <div className="hierarchy-empty-lessons">
                            <span>No lessons yet</span>
                            <button
                              type="button"
                              className="btn-add-first-lesson"
                              onClick={() => {
                                setActiveForm({
                                  type: 'lesson',
                                  isEdit: false,
                                  data: { moduleId: module._id, title: '', description: '' }
                                });
                              }}
                            >
                              + Add Lesson
                            </button>
                          </div>
                        ) : (
                          lessons.map((lesson, lesIndex) => {
                            const isSelected = lesson._id === selectedLessonId && activePaneView === 'lesson';
                            const isLessonDraft = lesson.state === 'draft';
                            const isAutoDraft = isModuleDraft && !isLessonDraft;

                            return (
                              <div
                                key={lesson._id}
                                className={`hierarchy-lesson-item ${isSelected ? 'is-selected-lesson' : ''} ${isLessonDraft ? 'is-draft' : ''}`}
                                onClick={() => {
                                  setSelectedModuleId(module._id);
                                  setSelectedLessonId(lesson._id);
                                  setActivePaneView('lesson');
                                  setIsMobileTreeOpen(false);
                                }}
                              >
                                <div className="lesson-item-left">
                                  <span className="lesson-num-tag">{modIndex + 1}.{lesIndex + 1}</span>
                                  <span className="lesson-item-title" title={lesson.title}>
                                    {lesson.title}
                                  </span>
                                </div>

                                <div className="lesson-item-right">
                                  {isAutoDraft ? (
                                    <span className="badge-status-subtle badge-autodraft" title="Hidden because Module is Draft">
                                      Auto-Draft
                                    </span>
                                  ) : isLessonDraft ? (
                                    <span className="badge-status-subtle badge-draft">Draft</span>
                                  ) : (
                                    <span className="badge-status-subtle badge-pub">Published</span>
                                  )}

                                  <div className="hierarchy-reorder-group">
                                    <button
                                      type="button"
                                      className="btn-hierarchy-reorder"
                                      disabled={lesIndex === 0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReorderLesson(module._id, lesson._id, 'up');
                                      }}
                                      title="Move Lesson Up"
                                    >
                                      <ArrowUp size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-hierarchy-reorder"
                                      disabled={lesIndex === lessons.length - 1}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReorderLesson(module._id, lesson._id, 'down');
                                      }}
                                      title="Move Lesson Down"
                                    >
                                      <ArrowDown size={11} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}

                        {lessons.length > 0 && (
                          <button
                            type="button"
                            className="btn-tree-add-lesson"
                            onClick={() => {
                              setActiveForm({
                                type: 'lesson',
                                isEdit: false,
                                data: { moduleId: module._id, title: '', description: '' }
                              });
                            }}
                          >
                            <Plus size={13} />
                            <span>Add Lesson</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hierarchy-sidebar-footer">
              <button
                type="button"
                className="btn-sidebar-add-module"
                onClick={() => {
                  setActiveForm({
                    type: 'module',
                    isEdit: false,
                    data: { title: '', description: '', state: 'draft' }
                  });
                }}
              >
                <Plus size={15} />
                <span>Add Module</span>
              </button>
            </div>
          </aside>

          {/* ══════════════════════════════════════════════════════════
              MAIN EDITOR PANE
              ══════════════════════════════════════════════════════════ */}
          <main className="curriculum-main-editor-pane">
            {activePaneView === 'lesson' && activeLesson ? (
              <div className="lesson-editor-view">
                {/* Breadcrumbs */}
                <nav className="editor-breadcrumbs-bar">
                  <span className="breadcrumb-root">Courses</span>
                  <ChevronRight size={14} className="crumb-sep" />
                  <span className="breadcrumb-item">{course?.title || 'Course'}</span>
                  <ChevronRight size={14} className="crumb-sep" />
                  <span className="breadcrumb-item">{activeModule?.title || 'Module'}</span>
                  <ChevronRight size={14} className="crumb-sep" />
                  <span className="breadcrumb-active">{activeLesson.title}</span>
                </nav>

                {/* Lesson Header Row */}
                <div className="editor-node-header-card">
                  <div className="node-title-editor-wrap">
                    <span className="node-kind-label">LESSON UNIT</span>
                    <input
                      type="text"
                      className="node-title-inline-input"
                      value={activeLesson.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        // Quick local feedback
                        activeLesson.title = newTitle;
                      }}
                      onBlur={(e) => {
                        const newTitle = e.target.value.trim();
                        if (newTitle && newTitle !== activeLesson.title) {
                          // Persist rename on blur
                          fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${activeModule._id}/lessons/${activeLesson._id}`, {
                            method: 'PATCH',
                            headers: getAuthHeader(),
                            body: JSON.stringify({ title: newTitle })
                          }).then(res => res.json()).then(data => {
                            if (data.success) {
                              toast.success('Lesson renamed');
                              if (onCurriculumUpdated) onCurriculumUpdated();
                            }
                          });
                        }
                      }}
                    />
                  </div>

                  <div className="node-actions-right">
                    {onEnterPreview && (
                      <button
                        type="button"
                        className="btn-editor-preview"
                        onClick={onEnterPreview}
                        title="Simulate learner experience"
                      >
                        <Eye size={15} />
                        <span>Preview as Learner</span>
                      </button>
                    )}

                    {/* Draft / Published Toggle Switch */}
                    <button
                      type="button"
                      className={`btn-node-state-toggle state-${activeLesson.state}`}
                      onClick={() => handleToggleLessonState(activeModule._id, activeLesson._id)}
                      title="There's no delete in this system — switch to Draft to hide something from learners."
                    >
                      {activeLesson.state === 'draft' ? <EyeOff size={14} /> : <CheckCircle2 size={14} />}
                      <span>{activeLesson.state === 'draft' ? 'Draft' : 'Published'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn-editor-edit-details"
                      onClick={() => {
                        setActiveForm({
                          type: 'lesson',
                          isEdit: true,
                          data: {
                            moduleId: activeModule._id,
                            id: activeLesson._id,
                            title: activeLesson.title,
                            description: activeLesson.description,
                            state: activeLesson.state || 'draft'
                          }
                        });
                      }}
                      title="Edit Lesson description"
                    >
                      <Edit2 size={15} />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>

                {/* ── Section: Lesson Content (Draggable Items) ── */}
                <div className="lesson-content-section">
                  <div className="section-header-toolbar">
                    <div className="section-title-wrap">
                      <h3 className="section-title">Lesson Content</h3>
                      <span className="items-count-badge">
                        {(activeLesson.items?.length || 0)} Items Total
                      </span>
                    </div>

                    {/* + Add Content Item Dropdown */}
                    <div className="add-content-dropdown-wrapper">
                      <button
                        type="button"
                        className="btn-add-content-dropdown"
                        onClick={() => setIsAddContentMenuOpen(!isAddContentMenuOpen)}
                      >
                        <Plus size={16} />
                        <span>Add Content Item</span>
                        <ChevronDown size={14} />
                      </button>

                      {isAddContentMenuOpen && (
                        <div
                          className="add-content-dropdown-menu"
                          onClick={() => setIsAddContentMenuOpen(false)}
                        >
                          <button
                            type="button"
                            className="dropdown-item-option"
                            onClick={() => {
                              setActiveForm({
                                type: 'video',
                                isEdit: false,
                                data: {
                                  lessonId: activeLesson._id,
                                  title: '',
                                  muxAssetId: '',
                                  muxPlaybackId: '',
                                  duration: 0,
                                  watchedThresholdPercent: 95
                                }
                              });
                            }}
                          >
                            <Video size={16} className="dropdown-opt-icon icon-video" />
                            <div className="dropdown-opt-info">
                              <span className="opt-title">Video Lecture</span>
                              <span className="opt-desc">Gating video lecture with watch progress tracking</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            className="dropdown-item-option"
                            onClick={() => {
                              setActiveForm({
                                type: 'quiz',
                                isEdit: false,
                                data: {
                                  lessonId: activeLesson._id,
                                  title: '',
                                  passThresholdPercent: 70,
                                  maxAttempts: 3,
                                  cooldownHours: 6,
                                  questions: [
                                    {
                                      questionText: '',
                                      options: ['', '', '', ''],
                                      correctOptionIndex: 0,
                                      explanation: '',
                                      points: 1
                                    }
                                  ]
                                }
                              });
                            }}
                          >
                            <HelpCircle size={16} className="dropdown-opt-icon icon-quiz" />
                            <div className="dropdown-opt-info">
                              <span className="opt-title">Lesson Quiz</span>
                              <span className="opt-desc">Gating test with attempts & pass score</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item Cards List */}
                  {(!activeLesson.items || activeLesson.items.length === 0) ? (
                    <div className="empty-content-items-card">
                      <Layers size={32} />
                      <h4>No Content Added Yet</h4>
                      <p>Add a Video Lecture or Quiz to complete this lesson unit.</p>
                    </div>
                  ) : (
                    <div className="draggable-items-card-list">
                      {/* Video and Quiz Content Items */}
                      {(activeLesson.items || []).map((item, itemIndex) => {
                        const isItemDraft = item.state === 'draft';
                        const isVideo = item.type === 'video';
                        const isQuiz = item.type === 'quiz';

                        return (
                          <div
                            key={item._id}
                            className={`content-draggable-card type-${item.type} ${isItemDraft ? 'item-draft' : ''}`}
                          >
                            <div className="card-drag-grip" title="Reorder position">
                              <GripVertical size={16} />
                            </div>

                            <div className="card-type-icon-wrapper">
                              {isVideo ? <Video size={18} /> : <HelpCircle size={18} />}
                            </div>

                            <div className="card-main-meta">
                              <div className="card-title-row">
                                <h4 className="card-item-title">{item.title}</h4>
                                <span className="card-version-tag">v{item.version || 1}</span>
                              </div>

                              <div className="card-badges-row">
                                {isVideo && item.video && (
                                  <>
                                    <span className="badge-meta">
                                      <Clock size={11} />
                                      {formatDurationDisplay(item.video.duration) || 'Processing duration...'}
                                    </span>
                                    <span className={`badge-meta ${item.video.muxPlaybackId ? 'badge-mux-ready' : 'badge-mux-processing'}`}>
                                      {item.video.muxPlaybackId ? 'Video ready' : 'Processing video'}
                                    </span>
                                    <span className="badge-meta badge-gating">
                                      Completion: 95% Watch Target
                                    </span>
                                  </>
                                )}

                                {isQuiz && item.quiz && (
                                  <>
                                    <span className="badge-meta">
                                      {item.quiz.questions?.length || 0} Questions
                                    </span>
                                    <span className="badge-meta badge-gating">
                                      Completion: Pass {item.quiz.passThresholdPercent || 70}% • {item.quiz.maxAttempts || 3} Attempts • {item.quiz.cooldownHours || 6}h Cooldown
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Item Actions Right */}
                            <div className="card-actions-toolbar">
                              {/* State Toggle Button */}
                              <button
                                type="button"
                                className={`btn-item-state-badge state-${item.state}`}
                                onClick={() => handleToggleItemState(activeLesson._id, item._id)}
                                title="There's no delete in this system — switch to Draft to hide something from learners."
                              >
                                {isItemDraft ? <EyeOff size={13} /> : <CheckCircle2 size={13} />}
                                <span>{isItemDraft ? 'Draft' : 'Published'}</span>
                              </button>

                              {/* Play Video Button */}
                              {isVideo && item.video?.muxPlaybackId && (
                                <button
                                  type="button"
                                  className="btn-item-action-play"
                                  title="Play Video Stream"
                                  onClick={() => setPreviewingVideo(item)}
                                >
                                  <Play size={13} />
                                  <span>Play</span>
                                </button>
                              )}

                              {/* Sync Video Transcoding Status */}
                              {isVideo && !item.video?.muxPlaybackId && item.video?.muxAssetId && (
                                <button
                                  type="button"
                                  className="btn-item-action-check"
                                  title="Check Video Processing Status"
                                  disabled={isCheckingMux}
                                  onClick={() => handleCheckMuxAsset(item)}
                                >
                                  <RefreshCw size={12} className={isCheckingMux ? 'spinner-rotate' : ''} />
                                  <span>Sync Status</span>
                                </button>
                              )}

                              {/* Reorder Up/Down */}
                              <div className="item-reorder-pair">
                                <button
                                  type="button"
                                  className="btn-item-reorder"
                                  disabled={itemIndex === 0}
                                  onClick={() => handleReorderItem(activeLesson._id, item._id, 'up')}
                                  title="Move Item Up"
                                >
                                  <ArrowUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="btn-item-reorder"
                                  disabled={itemIndex === (activeLesson.items?.length || 0) - 1}
                                  onClick={() => handleReorderItem(activeLesson._id, item._id, 'down')}
                                  title="Move Item Down"
                                >
                                  <ArrowDown size={13} />
                                </button>
                              </div>

                              {/* Edit Item */}
                              <button
                                type="button"
                                className="btn-item-icon-edit"
                                title="Edit Item Details"
                                onClick={() => {
                                  const vidObj = item.video || item.videoDetails || {};
                                  setActiveForm({
                                    type: item.type,
                                    isEdit: true,
                                    data: {
                                      lessonId: activeLesson._id,
                                      id: item._id,
                                      title: item.title,
                                      muxPlaybackId: vidObj.muxPlaybackId || item.muxPlaybackId || '',
                                      muxAssetId: vidObj.muxAssetId || item.muxAssetId || '',
                                      duration: vidObj.duration || vidObj.durationSeconds || item.duration || 0,
                                      videoUrl: vidObj.videoUrl || item.videoUrl || '',
                                      ...(item.type === 'video' ? vidObj : (item.quiz || item.quizDetails || {}))
                                    }
                                  });
                                }}
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : activePaneView === 'module_settings' && activeModule ? (
              /* ══════════════════════════════════════════════════════════
                 MODULE SETTINGS VIEW
                 ══════════════════════════════════════════════════════════ */
              <div className="module-settings-view">
                <nav className="editor-breadcrumbs-bar">
                  <span className="breadcrumb-root">Courses</span>
                  <ChevronRight size={14} className="crumb-sep" />
                  <span className="breadcrumb-item">{course?.title || 'Course'}</span>
                  <ChevronRight size={14} className="crumb-sep" />
                  <span className="breadcrumb-active">{activeModule.title} (Settings)</span>
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
                      className={`btn-node-state-toggle state-${activeModule.state}`}
                      onClick={() => handleToggleModuleState(activeModule._id)}
                      title="There's no delete in this system — switch to Draft to hide something from learners."
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
                            data: { moduleId: activeModule._id, title: '', description: '' }
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

                  {/* Publishing Status Selector */}
                  <div className="form-field-group">
                    <label className="field-label">Publishing Status</label>
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
                        className={`status-select-card ${activeForm.data.state === 'published' ? 'is-selected is-published' : ''}`}
                        onClick={() =>
                          setActiveForm(prev => ({
                            ...prev,
                            data: { ...prev.data, state: 'published' }
                          }))
                        }
                      >
                        <div className="status-card-header">
                          <CheckCircle2 size={16} />
                          <span className="status-card-title">Published</span>
                        </div>
                        <p className="status-card-desc">Visible to enrolled learners</p>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Video Specific Fields */}
              {activeForm.type === 'video' && (
                <div className="video-fields-section">
                  {/* Case A: Existing Video Attached (and not in Replace Mode) */}
                  {activeForm.isEdit && (activeForm.data.muxAssetId || activeForm.data.muxPlaybackId) && !isReplacingVideo ? (
                    <div className="existing-video-attached-card">
                      <div className="existing-video-header">
                        <div className="existing-video-title-wrap">
                          <div className="video-card-icon-pill">
                            <Video size={18} />
                          </div>
                          <div>
                            <span className="existing-video-badge-label">Existing Video Attached</span>
                            <h4 className="existing-video-title">{activeForm.data.title || 'Video Lecture'}</h4>
                          </div>
                        </div>
                        <span className={`badge-meta ${activeForm.data.muxPlaybackId ? 'badge-mux-ready' : 'badge-mux-processing'}`}>
                          {activeForm.data.muxPlaybackId ? 'Video ready' : 'Processing video'}
                        </span>
                      </div>

                      <div className="existing-video-meta-grid">
                        <div className="meta-grid-item">
                          <span className="meta-label">Duration:</span>
                          <span className="meta-value">
                            <Clock size={13} />
                            {formatDurationDisplay(activeForm.data.duration) || 'Processing video...'}
                          </span>
                        </div>
                        <div className="meta-grid-item">
                          <span className="meta-label">Completion Target:</span>
                          <span className="meta-value text-emerald">
                            <CheckCircle2 size={13} />
                            95% watched
                          </span>
                        </div>
                      </div>

                      {/* Embedded Video Player */}
                      {(activeForm.data.muxPlaybackId || activeForm.data.videoUrl) && (
                        <div className="existing-video-player-box" style={{ marginTop: '14px', marginBottom: '14px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#0f172a', border: '1px solid var(--border-color, #334155)' }}>
                          <video
                            controls
                            preload="metadata"
                            poster={activeForm.data.muxPlaybackId ? `https://image.mux.com/${activeForm.data.muxPlaybackId}/thumbnail.jpg?width=640` : ''}
                            style={{ width: '100%', maxHeight: '260px', display: 'block' }}
                          >
                            {activeForm.data.muxPlaybackId && (
                              <>
                                <source
                                  src={`https://stream.mux.com/${activeForm.data.muxPlaybackId}/capped-1080p.mp4`}
                                  type="video/mp4"
                                />
                                <source
                                  src={`https://stream.mux.com/${activeForm.data.muxPlaybackId}.m3u8`}
                                  type="application/x-mpegURL"
                                />
                              </>
                            )}
                            {activeForm.data.videoUrl && !activeForm.data.muxPlaybackId && (
                              <source src={activeForm.data.videoUrl} type="video/mp4" />
                            )}
                            Your browser does not support HTML5 video playback.
                          </video>
                        </div>
                      )}

                      <div className="existing-video-actions-row">
                        {activeForm.data.muxPlaybackId && (
                          <button
                            type="button"
                            className="btn-preview-existing-video"
                            onClick={() => setPreviewingVideo({
                              title: activeForm.data.title,
                              video: {
                                muxPlaybackId: activeForm.data.muxPlaybackId,
                                duration: activeForm.data.duration
                              }
                            })}
                          >
                            <Play size={14} />
                            <span>Preview Video</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn-replace-video-action"
                          onClick={() => setIsReplacingVideo(true)}
                        >
                          <RefreshCw size={14} />
                          <span>Replace Video</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Case B: New video or actively replacing existing video */
                    <div className="form-field-group">
                      {isReplacingVideo && (
                        <div className="replace-video-banner">
                          <div className="banner-text">
                            <strong>Replace Video:</strong> Select a replacement video file from your device. The existing video will remain attached until the new upload completes.
                          </div>
                          <button
                            type="button"
                            className="btn-cancel-replace"
                            onClick={() => setIsReplacingVideo(false)}
                          >
                            Keep Existing Video
                          </button>
                        </div>
                      )}

                      <label className="field-label">
                        {isReplacingVideo ? 'Upload Replacement Video from Device' : 'Upload Video Lecture from Device'}
                      </label>
                      <DeviceFileUploader
                        fileType="video"
                        accept="video/*"
                        maxSizeMB={500}
                        uploadEndpoint={`${apiBase}/courses/${courseId}/curriculum/upload/video`}
                        getAuthHeader={getAuthHeader}
                        currentUrl={activeForm.data.muxPlaybackId ? `https://stream.mux.com/${activeForm.data.muxPlaybackId}.m3u8` : ''}
                        onUploadSuccess={({ response }) => {
                          if (response) {
                            setActiveForm(prev => ({
                              ...prev,
                              data: {
                                ...prev.data,
                                muxAssetId: response.muxAssetId || response.assetId,
                                muxPlaybackId: response.muxPlaybackId || response.playbackId,
                                duration: response.duration || prev.data.duration || 0,
                                status: response.status || (response.playbackId ? 'ready' : 'processing')
                              }
                            }));
                            if (isReplacingVideo) {
                              setIsReplacingVideo(false);
                              toast.success('Replacement video uploaded successfully');
                            }
                          }
                        }}
                        helpText="Upload MP4, WebM, or MOV video lecture from device (Up to 500MB)."
                      />
                    </div>
                  )}

                  <div className="video-completion-rules-notice">
                    <div className="notice-rule-badge">
                      <CheckCircle2 size={15} className="text-emerald" />
                      <span>Completion Target: <strong>95% watched</strong> (applied automatically)</span>
                    </div>
                    {formatDurationDisplay(activeForm.data.duration) ? (
                      <div className="notice-duration-badge">
                        <Clock size={14} />
                        <span>Video Duration: <strong>{formatDurationDisplay(activeForm.data.duration)}</strong></span>
                      </div>
                    ) : (
                      <div className="notice-duration-badge">
                        <Clock size={14} />
                        <span>Video Duration: <strong>Detected automatically upon upload</strong></span>
                      </div>
                    )}
                  </div>
                </div>
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
        <div className="curriculum-modal-backdrop" onClick={() => setPreviewingVideo(null)}>
          <div className="video-player-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header-toolbar">
              <div className="modal-title-with-badge">
                <Video size={18} className="text-brand" />
                <h3>{previewingVideo.title}</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setPreviewingVideo(null)}
                title="Close player"
              >
                <X size={18} />
              </button>
            </div>

            <div className="video-player-wrapper">
              <video
                controls
                autoPlay
                poster={previewingVideo.video?.muxPlaybackId ? `https://image.mux.com/${previewingVideo.video.muxPlaybackId}/thumbnail.jpg?width=1280` : ''}
                className="mux-video-element"
              >
                {previewingVideo.video?.muxPlaybackId && (
                  <>
                    <source
                      src={`https://stream.mux.com/${previewingVideo.video.muxPlaybackId}/capped-1080p.mp4`}
                      type="video/mp4"
                    />
                    <source
                      src={`https://stream.mux.com/${previewingVideo.video.muxPlaybackId}.m3u8`}
                      type="application/x-mpegURL"
                    />
                  </>
                )}
                Your browser does not support HTML5 video playback.
              </video>
            </div>

            <div className="video-player-footer-info">
              <span className="player-meta-item">
                <strong>Completion Requirement:</strong> 95% watch target
              </span>
              <span className="player-meta-item">
                <strong>Duration:</strong> {formatDurationDisplay(previewingVideo.video?.duration) || 'Detected automatically'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
