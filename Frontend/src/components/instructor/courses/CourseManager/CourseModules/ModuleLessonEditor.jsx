import React, { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { InstructorTip } from './Common/InstructorTip';
import { DeviceFileUploader } from './Common/DeviceFileUploader';

export const ModuleLessonEditor = ({
  courseId,
  modules = [],
  onBack,
  onCurriculumUpdated,
  apiBase = 'http://localhost:5000/api',
  getAuthHeader,
  toast
}) => {
  const [expandedModules, setExpandedModules] = useState(() => {
    const initial = {};
    if (modules.length > 0) initial[modules[0]._id] = true;
    return initial;
  });
  const [expandedLessons, setExpandedLessons] = useState({});

  // Active drawer / editor form state: null | { type: 'module' | 'lesson' | 'video' | 'quiz', isEdit: boolean, data: {} }
  const [activeForm, setActiveForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const toggleModuleAccordion = (modId) => {
    setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  const toggleLessonAccordion = (lessId) => {
    setExpandedLessons(prev => ({ ...prev, [lessId]: !prev[lessId] }));
  };

  /* ─────────────────────────────────────────────────────────────
     STATE TOGGLE (Draft <-> Published) - ZERO HARD DELETES
     ───────────────────────────────────────────────────────────── */
  const handleToggleModuleState = async (modId) => {
    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${modId}/toggle-state`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Module state updated to: ${data.state}`);
        onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Could not toggle module state');
      }
    } catch (err) {
      toast.error('Network error updating module state');
    }
  };

  const handleToggleLessonState = async (modId, lessId) => {
    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/modules/${modId}/lessons/${lessId}/toggle-state`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Lesson state updated to: ${data.state}`);
        onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Could not toggle lesson state');
      }
    } catch (err) {
      toast.error('Network error updating lesson state');
    }
  };

  const handleToggleItemState = async (lessId, itemId) => {
    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/lessons/${lessId}/items/${itemId}/toggle-state`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Item state updated to: ${data.state}`);
        onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Could not toggle item state');
      }
    } catch (err) {
      toast.error('Network error updating item state');
    }
  };

  /* ─────────────────────────────────────────────────────────────
     FRACTIONAL SORT REORDERING
     ───────────────────────────────────────────────────────────── */
  const handleReorder = async (type, parentId, id, direction, list) => {
    const currentIndex = list.findIndex(item => item._id === id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    let prevKey = null;
    let nextKey = null;

    if (direction === 'up') {
      nextKey = list[targetIndex].sortKey;
      prevKey = targetIndex > 0 ? list[targetIndex - 1].sortKey : null;
    } else {
      prevKey = list[targetIndex].sortKey;
      nextKey = targetIndex < list.length - 1 ? list[targetIndex + 1].sortKey : null;
    }

    try {
      let endpoint = '';
      if (type === 'module') {
        endpoint = `${apiBase}/courses/${courseId}/curriculum/modules/${id}/reorder`;
      } else if (type === 'lesson') {
        endpoint = `${apiBase}/courses/${courseId}/curriculum/modules/${parentId}/lessons/${id}/reorder`;
      } else if (type === 'item') {
        endpoint = `${apiBase}/courses/${courseId}/curriculum/lessons/${parentId}/items/${id}/reorder`;
      }

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify({ prevKey, nextKey })
      });
      const data = await res.json();
      if (data.success) {
        onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to reorder');
      }
    } catch (err) {
      toast.error('Error reordering');
    }
  };

  /* ─────────────────────────────────────────────────────────────
     SAVE FORM SUBMISSION
     ───────────────────────────────────────────────────────────── */
  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!activeForm) return;

    setSaving(true);
    try {
      let url = '';
      let method = activeForm.isEdit ? 'PATCH' : 'POST';
      let body = {};

      const { type, isEdit, data } = activeForm;

      if (type === 'module') {
        url = isEdit
          ? `${apiBase}/courses/${courseId}/curriculum/modules/${data.id}`
          : `${apiBase}/courses/${courseId}/curriculum/modules`;
        body = { title: data.title, description: data.description };
      } else if (type === 'lesson') {
        url = isEdit
          ? `${apiBase}/courses/${courseId}/curriculum/modules/${data.moduleId}/lessons/${data.id}`
          : `${apiBase}/courses/${courseId}/curriculum/modules/${data.moduleId}/lessons`;
        body = { title: data.title, description: data.description };
      } else if (type === 'video') {
        url = isEdit
          ? `${apiBase}/courses/${courseId}/curriculum/lessons/${data.lessonId}/items/${data.id}`
          : `${apiBase}/courses/${courseId}/curriculum/lessons/${data.lessonId}/items`;
        body = {
          type: 'video',
          title: data.title,
          video: {
            muxAssetId: data.muxAssetId || `asset_${Date.now()}`,
            muxPlaybackId: data.muxPlaybackId || `playback_${Date.now()}`,
            duration: Number(data.duration) || 300,
            watchedThresholdPercent: Number(data.watchedThresholdPercent) || 90
          }
        };
      } else if (type === 'quiz') {
        url = isEdit
          ? `${apiBase}/courses/${courseId}/curriculum/lessons/${data.lessonId}/items/${data.id}`
          : `${apiBase}/courses/${courseId}/curriculum/lessons/${data.lessonId}/items`;
        body = {
          type: 'quiz',
          title: data.title,
          quiz: {
            passThresholdPercent: Number(data.passThresholdPercent) || 70,
            maxAttempts: Number(data.maxAttempts) || 3,
            cooldownHours: Number(data.cooldownHours) || 6,
            questions: data.questions || []
          }
        };
      }

      const res = await fetch(url, {
        method,
        headers: getAuthHeader(),
        body: JSON.stringify(body)
      });
      const resData = await res.json();
      if (resData.success) {
        toast.success(`Saved successfully`);
        setActiveForm(null);
        onCurriculumUpdated();
      } else {
        toast.error(resData.message || 'Failed to save');
      }
    } catch (err) {
      console.error('Error saving curriculum item:', err);
      toast.error('Network error during save');
    } finally {
      setSaving(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     QUIZ QUESTION BUILDER HELPERS
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
            <h2 className="subpage-title">Module & Lessons Structure</h2>
            <p className="subpage-subtitle">
              Build and organize modules, lessons, video lectures, and quizzes with fractional order keys.
            </p>
          </div>
        </div>

        <div className="subpage-header-actions">
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
            <span>Add Module</span>
          </button>
        </div>
      </div>

      {/* ── Guidance Tip ── */}
      <InstructorTip
        type="tip"
        title="Progression & Content Rules"
        message="Video lectures and quizzes are gating items that dictate learner sequential progression. To archive any item, toggle its state to Draft. Zero items are ever permanently erased."
      />

      {/* ── Active Form Modal / Drawer (Clean Dedicated Form) ── */}
      {activeForm && (
        <div className="curriculum-form-drawer-overlay">
          <div className="curriculum-form-card">
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
              )}

              {/* Video Specific Fields */}
              {activeForm.type === 'video' && (
                <div className="video-fields-section">
                  <div className="form-field-group">
                    <label className="field-label">Upload Video Lecture from Device</label>
                    <DeviceFileUploader
                      fileType="video"
                      accept="video/*"
                      maxSizeMB={500}
                      uploadEndpoint={`${apiBase}/courses/${courseId}/curriculum/upload/video`}
                      getAuthHeader={getAuthHeader}
                      currentUrl={activeForm.data.muxPlaybackId ? `http://localhost:5000/uploads/videos/${activeForm.data.muxPlaybackId}` : ''}
                      onUploadSuccess={({ url, response }) => {
                        if (response) {
                          setActiveForm(prev => ({
                            ...prev,
                            data: {
                              ...prev.data,
                              muxAssetId: response.muxAssetId,
                              muxPlaybackId: response.muxPlaybackId,
                              duration: response.duration || prev.data.duration || 300
                            }
                          }));
                        }
                      }}
                      helpText="Upload MP4, WebM, or MOV video lecture directly from your computer (Up to 500MB)."
                    />
                  </div>

                  <div className="form-grid-row">
                    <div className="form-field-group">
                      <label className="field-label">Duration (seconds)</label>
                      <input
                        type="number"
                        min="1"
                        className="field-input"
                        value={activeForm.data.duration || 300}
                        onChange={(e) =>
                          setActiveForm(prev => ({
                            ...prev,
                            data: { ...prev.data, duration: e.target.value }
                          }))
                        }
                      />
                    </div>
                    <div className="form-field-group">
                      <label className="field-label">
                        Watched Threshold (%) <span className="threshold-indicator">Gating Target</span>
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="100"
                        className="field-input"
                        value={activeForm.data.watchedThresholdPercent || 90}
                        onChange={(e) =>
                          setActiveForm(prev => ({
                            ...prev,
                            data: { ...prev.data, watchedThresholdPercent: e.target.value }
                          }))
                        }
                      />
                      <span className="field-hint">Learner must watch this % before lesson is marked complete.</span>
                    </div>
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

      {/* ── Empty State if no modules exist ── */}
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
        /* ── Modules Accordion Tree List ── */
        <div className="modules-accordion-tree">
          {modules.map((module, modIndex) => {
            const isExpanded = !!expandedModules[module._id];
            const isModuleDraft = module.state === 'draft';
            const lessons = module.lessons || [];

            return (
              <div
                key={module._id}
                className={`module-accordion-node ${isModuleDraft ? 'node-is-draft' : 'node-is-published'}`}
              >
                {/* Module Header Bar */}
                <div className="module-header-bar">
                  <div className="module-left-block">
                    <button
                      type="button"
                      className="btn-accordion-toggle"
                      onClick={() => toggleModuleAccordion(module._id)}
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>

                    <div className="module-info-group">
                      <div className="module-title-line">
                        <span className="module-index-badge">Module {modIndex + 1}</span>
                        <h3 className="module-title-text">{module.title}</h3>
                      </div>
                      {module.description && (
                        <p className="module-description-text">{module.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Module Actions Right */}
                  <div className="module-actions-group">
                    {/* State Toggle Badge */}
                    <button
                      type="button"
                      className={`btn-state-toggle state-${module.state}`}
                      onClick={() => handleToggleModuleState(module._id)}
                      title={`Toggle to ${isModuleDraft ? 'Published' : 'Draft'}`}
                    >
                      {isModuleDraft ? <EyeOff size={13} /> : <CheckCircle2 size={13} />}
                      <span>{isModuleDraft ? 'Draft' : 'Published'}</span>
                    </button>

                    {/* Reorder Buttons */}
                    <div className="reorder-btn-pair">
                      <button
                        type="button"
                        className="btn-reorder"
                        title="Move Up"
                        disabled={modIndex === 0}
                        onClick={() => handleReorder('module', null, module._id, 'up', modules)}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-reorder"
                        title="Move Down"
                        disabled={modIndex === modules.length - 1}
                        onClick={() => handleReorder('module', null, module._id, 'down', modules)}
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    {/* Edit Module */}
                    <button
                      type="button"
                      className="btn-icon-action"
                      title="Edit Module Details"
                      onClick={() => {
                        setActiveForm({
                          type: 'module',
                          isEdit: true,
                          data: {
                            id: module._id,
                            title: module.title,
                            description: module.description
                          }
                        });
                      }}
                    >
                      <Edit2 size={15} />
                    </button>

                    {/* Add Lesson */}
                    <button
                      type="button"
                      className="btn-subaction-add"
                      onClick={() => {
                        setActiveForm({
                          type: 'lesson',
                          isEdit: false,
                          data: {
                            moduleId: module._id,
                            title: '',
                            description: ''
                          }
                        });
                      }}
                    >
                      <Plus size={14} />
                      <span>Add Lesson</span>
                    </button>
                  </div>
                </div>

                {/* Module Body / Lessons List */}
                {isExpanded && (
                  <div className="module-body-expanded">
                    {lessons.length === 0 ? (
                      <div className="empty-subnode-prompt">
                        <p>No lessons in this module yet.</p>
                        <button
                          type="button"
                          className="btn-link-action"
                          onClick={() => {
                            setActiveForm({
                              type: 'lesson',
                              isEdit: false,
                              data: {
                                moduleId: module._id,
                                title: '',
                                description: ''
                              }
                            });
                          }}
                        >
                          + Add first lesson
                        </button>
                      </div>
                    ) : (
                      <div className="lessons-container">
                        {lessons.map((lesson, lessIndex) => {
                          const isLessonExpanded = !!expandedLessons[lesson._id];
                          const isLessonDraft = lesson.state === 'draft';
                          const isAutoDraft = isModuleDraft && !isLessonDraft;
                          const items = lesson.items || [];

                          return (
                            <div
                              key={lesson._id}
                              className={`lesson-accordion-node ${isLessonDraft ? 'node-is-draft' : ''}`}
                            >
                              {/* Lesson Header Bar */}
                              <div className="lesson-header-bar">
                                <div className="lesson-left-block">
                                  <button
                                    type="button"
                                    className="btn-accordion-toggle-sm"
                                    onClick={() => toggleLessonAccordion(lesson._id)}
                                  >
                                    {isLessonExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  </button>

                                  <div className="lesson-title-info">
                                    <span className="lesson-index-badge">
                                      Lesson {modIndex + 1}.{lessIndex + 1}
                                    </span>
                                    <span className="lesson-title-text">{lesson.title}</span>
                                    {isAutoDraft && (
                                      <span className="auto-draft-badge" title="Hidden because parent module is draft">
                                        Auto-Draft (Module Draft)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="lesson-actions-group">
                                  {/* Lesson State Toggle */}
                                  <button
                                    type="button"
                                    className={`btn-state-toggle-sm state-${lesson.state}`}
                                    onClick={() => handleToggleLessonState(module._id, lesson._id)}
                                  >
                                    {isLessonDraft ? 'Draft' : 'Published'}
                                  </button>

                                  {/* Reorder Buttons */}
                                  <div className="reorder-btn-pair">
                                    <button
                                      type="button"
                                      className="btn-reorder-sm"
                                      title="Move Up"
                                      disabled={lessIndex === 0}
                                      onClick={() =>
                                        handleReorder('lesson', module._id, lesson._id, 'up', lessons)
                                      }
                                    >
                                      <ArrowUp size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-reorder-sm"
                                      title="Move Down"
                                      disabled={lessIndex === lessons.length - 1}
                                      onClick={() =>
                                        handleReorder('lesson', module._id, lesson._id, 'down', lessons)
                                      }
                                    >
                                      <ArrowDown size={13} />
                                    </button>
                                  </div>

                                  {/* Edit Lesson */}
                                  <button
                                    type="button"
                                    className="btn-icon-action-sm"
                                    onClick={() => {
                                      setActiveForm({
                                        type: 'lesson',
                                        isEdit: true,
                                        data: {
                                          moduleId: module._id,
                                          id: lesson._id,
                                          title: lesson.title,
                                          description: lesson.description
                                        }
                                      });
                                    }}
                                  >
                                    <Edit2 size={13} />
                                  </button>

                                  {/* Add Video */}
                                  <button
                                    type="button"
                                    className="btn-item-add video-btn"
                                    onClick={() => {
                                      setActiveForm({
                                        type: 'video',
                                        isEdit: false,
                                        data: {
                                          lessonId: lesson._id,
                                          title: '',
                                          duration: 300,
                                          watchedThresholdPercent: 90
                                        }
                                      });
                                    }}
                                  >
                                    <Video size={13} />
                                    <span>+ Video</span>
                                  </button>

                                  {/* Add Quiz */}
                                  <button
                                    type="button"
                                    className="btn-item-add quiz-btn"
                                    onClick={() => {
                                      setActiveForm({
                                        type: 'quiz',
                                        isEdit: false,
                                        data: {
                                          lessonId: lesson._id,
                                          title: '',
                                          passThresholdPercent: 70,
                                          maxAttempts: 3,
                                          cooldownHours: 6,
                                          questions: []
                                        }
                                      });
                                    }}
                                  >
                                    <HelpCircle size={13} />
                                    <span>+ Quiz</span>
                                  </button>
                                </div>
                              </div>

                              {/* Lesson Items List */}
                              {isLessonExpanded && (
                                <div className="lesson-items-body">
                                  {items.length === 0 ? (
                                    <div className="empty-items-prompt">
                                      <span>No lectures or quizzes yet. Add a Video Lecture or Quiz above.</span>
                                    </div>
                                  ) : (
                                    <div className="items-list">
                                      {items.map((item, itemIndex) => {
                                        const isItemDraft = item.state === 'draft';
                                        const isItemAutoDraft = (isModuleDraft || isLessonDraft) && !isItemDraft;

                                        return (
                                          <div
                                            key={item._id}
                                            className={`item-row-card type-${item.type} ${isItemDraft ? 'item-is-draft' : ''}`}
                                          >
                                            <div className="item-left-block">
                                              <div className="item-type-icon">
                                                {item.type === 'video' ? <Video size={16} /> : <HelpCircle size={16} />}
                                              </div>
                                              <div className="item-meta-info">
                                                <span className="item-title">{item.title}</span>
                                                <div className="item-badges-row">
                                                  {item.type === 'video' && item.video && (
                                                    <>
                                                      <span className="meta-tag">
                                                        <Clock size={11} />
                                                        {Math.round((item.video.duration || 0) / 60)} min
                                                      </span>
                                                      <span className="meta-tag threshold-tag">
                                                        Target: {item.video.watchedThresholdPercent || 90}% watch
                                                      </span>
                                                    </>
                                                  )}
                                                  {item.type === 'quiz' && item.quiz && (
                                                    <>
                                                      <span className="meta-tag">
                                                        {item.quiz.questions?.length || 0} Questions
                                                      </span>
                                                      <span className="meta-tag threshold-tag">
                                                        Pass: {item.quiz.passThresholdPercent || 70}%
                                                      </span>
                                                    </>
                                                  )}
                                                  {isItemAutoDraft && (
                                                    <span className="auto-draft-tag">
                                                      Auto-Draft
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            <div className="item-actions-group">
                                              {/* Toggle Item State */}
                                              <button
                                                type="button"
                                                className={`btn-item-state state-${item.state}`}
                                                onClick={() => handleToggleItemState(lesson._id, item._id)}
                                              >
                                                {isItemDraft ? 'Draft' : 'Published'}
                                              </button>

                                              {/* Reorder Buttons */}
                                              <div className="reorder-btn-pair">
                                                <button
                                                  type="button"
                                                  className="btn-reorder-xs"
                                                  title="Move Up"
                                                  disabled={itemIndex === 0}
                                                  onClick={() =>
                                                    handleReorder('item', lesson._id, item._id, 'up', items)
                                                  }
                                                >
                                                  <ArrowUp size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  className="btn-reorder-xs"
                                                  title="Move Down"
                                                  disabled={itemIndex === items.length - 1}
                                                  onClick={() =>
                                                    handleReorder('item', lesson._id, item._id, 'down', items)
                                                  }
                                                >
                                                  <ArrowDown size={12} />
                                                </button>
                                              </div>

                                              {/* Edit Item */}
                                              <button
                                                type="button"
                                                className="btn-icon-action-xs"
                                                onClick={() => {
                                                  setActiveForm({
                                                    type: item.type,
                                                    isEdit: true,
                                                    data: {
                                                      lessonId: lesson._id,
                                                      id: item._id,
                                                      title: item.title,
                                                      ...(item.type === 'video' ? item.video : item.quiz)
                                                    }
                                                  });
                                                }}
                                              >
                                                <Edit2 size={12} />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
