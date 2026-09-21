import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  Lock,
  Unlock,
  CheckCircle2,
  EyeOff,
  Plus,
  Edit2,
  HelpCircle,
  Clock,
  RefreshCw,
  X,
  AlertCircle,
  Layers,
  Sparkles
} from 'lucide-react';
import { InstructorTip } from './Common/InstructorTip';

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
  // Drawer / Form state: null | { isEdit: boolean, data: {} }
  const [activeForm, setActiveForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Inspector preview modal for viewing questions
  const [inspectingAssessment, setInspectingAssessment] = useState(null);

  /* ─────────────────────────────────────────────────────────────
     MUTATION HANDLERS (Live Backend Integration)
     ───────────────────────────────────────────────────────────── */
  const handleToggleAssessmentState = async (assessmentId) => {
    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/assessments/${assessmentId}/toggle-state`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Assessment toggled to ${data.assessment?.state || 'new state'}`);
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(data.message || 'Failed to toggle assessment state');
      }
    } catch (err) {
      console.error('Error toggling assessment state:', err);
      toast.error('Network error toggling assessment state');
    }
  };

  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    if (!activeForm) return;

    const { isEdit, data } = activeForm;
    if (!data.title || !data.title.trim()) {
      toast.error('Please enter an assessment title');
      return;
    }
    if (!data.requiredModuleIds || data.requiredModuleIds.length === 0) {
      toast.error('Please select at least one required module for this assessment');
      return;
    }
    if (!data.questions || data.questions.length === 0) {
      toast.error('Please add at least one question to the assessment');
      return;
    }

    for (let i = 0; i < data.questions.length; i++) {
      const q = data.questions[i];
      if (!q.questionText || !q.questionText.trim()) {
        toast.error(`Question ${i + 1} is missing question text`);
        return;
      }
      if (!q.options || q.options.some(opt => !opt.trim())) {
        toast.error(`Question ${i + 1} has empty options`);
        return;
      }
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `${apiBase}/courses/${courseId}/curriculum/assessments/${data._id || data.id}`
        : `${apiBase}/courses/${courseId}/curriculum/assessments`;
      const method = isEdit ? 'PATCH' : 'POST';

      const payload = {
        title: data.title.trim(),
        description: (data.description || '').trim(),
        requiredModuleIds: data.requiredModuleIds,
        passThresholdPercent: Number(data.passThresholdPercent) || 70,
        maxAttempts: Number(data.maxAttempts) || 3,
        cooldownHours: Number(data.cooldownHours) || 6,
        questions: data.questions
      };

      const res = await fetch(url, {
        method,
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      if (resData.success) {
        toast.success(isEdit ? 'Assessment updated successfully' : 'Assessment created successfully');
        setActiveForm(null);
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast.error(resData.message || 'Failed to save assessment');
      }
    } catch (err) {
      console.error('Error saving assessment:', err);
      toast.error('Network error saving assessment');
    } finally {
      setSaving(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────
     REQUIRED MODULE CHECKBOX HELPER
     ───────────────────────────────────────────────────────────── */
  const toggleRequiredModule = (modId) => {
    setActiveForm(prev => {
      const currentIds = prev.data.requiredModuleIds || [];
      const updated = currentIds.includes(modId)
        ? currentIds.filter(id => id !== modId)
        : [...currentIds, modId];
      return {
        ...prev,
        data: { ...prev.data, requiredModuleIds: updated }
      };
    });
  };

  /* ─────────────────────────────────────────────────────────────
     QUESTION BUILDER HELPERS
     ───────────────────────────────────────────────────────────── */
  const handleAddQuestion = () => {
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

  const handleUpdateQuestion = (qIndex, field, val) => {
    setActiveForm(prev => {
      const questions = [...(prev.data.questions || [])];
      questions[qIndex] = { ...questions[qIndex], [field]: val };
      return { ...prev, data: { ...prev.data, questions } };
    });
  };

  const handleUpdateOption = (qIndex, oIndex, val) => {
    setActiveForm(prev => {
      const questions = [...(prev.data.questions || [])];
      const options = [...(questions[qIndex].options || [])];
      options[oIndex] = val;
      questions[qIndex] = { ...questions[qIndex], options };
      return { ...prev, data: { ...prev.data, questions } };
    });
  };

  const handleRemoveQuestion = (qIndex) => {
    setActiveForm(prev => {
      const questions = (prev.data.questions || []).filter((_, i) => i !== qIndex);
      return { ...prev, data: { ...prev.data, questions } };
    });
  };

  const getModuleTitle = (modId) => {
    const mod = modules.find(m => m._id === modId);
    return mod ? mod.title : 'Module';
  };

  return (
    <div className="assessment-editor-subpage">
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
            <h2 className="subpage-title">Course Assessments</h2>
            <p className="subpage-subtitle">
              Create comprehensive assessments and define required module gates learners must complete to unlock them.
            </p>
          </div>
        </div>

        <div className="subpage-header-actions">
          {modules.length > 0 && (
            <button
              type="button"
              className="btn-primary-action"
              onClick={() => {
                setActiveForm({
                  isEdit: false,
                  data: {
                    title: '',
                    description: '',
                    requiredModuleIds: modules.length > 0 ? [modules[0]._id] : [],
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
              <Plus size={16} />
              <span>Create Assessment</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Guidance Tip ── */}
      <InstructorTip
        type="warning"
        title="Sequential Progression & Assessment Gating"
        message="Assessments are gated milestones. When you link required modules, learners cannot sit for this assessment until they have 100% completed all lectures and quizzes in those prerequisite modules."
      />

      {/* ── Validation: If 0 modules exist in course ── */}
      {modules.length === 0 ? (
        <div className="empty-module-warning-card">
          <div className="warning-icon-circle">
            <Layers size={36} />
          </div>
          <h3>Prerequisite: At Least 1 Module Required</h3>
          <p>
            You can create an assessment once this course has at least one module.
          </p>
          <button
            type="button"
            className="btn-primary-action"
            onClick={onNavigateToModules}
          >
            <Layers size={16} />
            <span>Go to Module & Lessons Editor</span>
          </button>
        </div>
      ) : null}

      {/* ── Active Form Modal / Drawer ── */}
      {activeForm && (
        <div className="curriculum-form-drawer-overlay">
          <div className="curriculum-form-card assessment-form-card">
            <div className="form-card-header">
              <div className="form-card-title-group">
                <h3>{activeForm.isEdit ? 'Edit Assessment' : 'New Milestone Assessment'}</h3>
                <span className="form-type-badge badge-amber">ASSESSMENT</span>
              </div>
              <button
                type="button"
                className="btn-close-form"
                onClick={() => setActiveForm(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAssessment} className="curriculum-editor-form">
              {/* Title & Description */}
              <div className="form-field-group">
                <label className="field-label">
                  Assessment Title <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="field-input"
                  required
                  placeholder="e.g., Mid-Term Architectural Competency Exam"
                  value={activeForm.data.title || ''}
                  onChange={(e) =>
                    setActiveForm(prev => ({
                      ...prev,
                      data: { ...prev.data, title: e.target.value }
                    }))
                  }
                />
              </div>

              <div className="form-field-group">
                <label className="field-label">Instructions / Description for Candidates</label>
                <textarea
                  className="field-textarea"
                  rows={3}
                  placeholder="Outline the scope, grading criteria, and instructions for learners..."
                  value={activeForm.data.description || ''}
                  onChange={(e) =>
                    setActiveForm(prev => ({
                      ...prev,
                      data: { ...prev.data, description: e.target.value }
                    }))
                  }
                />
              </div>

              {/* ── Module Unlock Prerequisites Checklist ── */}
              <div className="required-modules-picker-box">
                <div className="picker-header">
                  <Lock size={16} className="text-amber" />
                  <h4>Prerequisite Required Modules (Learners must finish these to unlock)</h4>
                </div>
                <p className="picker-hint">
                  Choose exactly which modules must be finished before this unlocks.
                </p>

                <div className="modules-checkbox-list">
                  {modules.map((m, idx) => {
                    const isChecked = (activeForm.data.requiredModuleIds || []).includes(m._id);
                    return (
                      <label key={m._id} className={`module-checkbox-item ${isChecked ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRequiredModule(m._id)}
                        />
                        <div className="item-details">
                          <span className="mod-label">Module {idx + 1}</span>
                          <span className="mod-name">{m.title}</span>
                          <span className="mod-lessons-count">({m.lessons?.length || 0} lessons)</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Thresholds & Cooldown Rules */}
              <div className="form-grid-3">
                <div className="form-field-group">
                  <label className="field-label">Pass Threshold (%)</label>
                  <input
                    type="number"
                    min="10"
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
                  <label className="field-label">Retake Cooldown (Hours)</label>
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
              <div className="assessment-questions-builder">
                <div className="builder-header">
                  <h4>Assessment Questions ({activeForm.data.questions?.length || 0})</h4>
                  <button
                    type="button"
                    className="btn-add-question"
                    onClick={handleAddQuestion}
                  >
                    <Plus size={14} />
                    <span>Add Question</span>
                  </button>
                </div>

                {(!activeForm.data.questions || activeForm.data.questions.length === 0) ? (
                  <div className="empty-questions-notice">
                    <HelpCircle size={28} />
                    <p>No questions added yet. Click "Add Question" to configure your assessment questions.</p>
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
                            onClick={() => handleRemoveQuestion(qIndex)}
                            title="Remove question"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="form-field-group">
                          <input
                            type="text"
                            className="field-input"
                            placeholder="Enter the assessment question prompt..."
                            required
                            value={q.questionText || ''}
                            onChange={(e) => handleUpdateQuestion(qIndex, 'questionText', e.target.value)}
                          />
                        </div>

                        <div className="options-grid">
                          {(q.options || ['', '', '', '']).map((opt, oIndex) => (
                            <div key={oIndex} className="option-row">
                              <label className="option-radio-label">
                                <input
                                  type="radio"
                                  name={`ass_correct_${qIndex}`}
                                  checked={q.correctOptionIndex === oIndex}
                                  onChange={() => handleUpdateQuestion(qIndex, 'correctOptionIndex', oIndex)}
                                />
                                <span className="option-letter">{String.fromCharCode(65 + oIndex)}</span>
                              </label>
                              <input
                                type="text"
                                className="field-input option-input"
                                placeholder={`Choice ${String.fromCharCode(65 + oIndex)}...`}
                                required
                                value={opt}
                                onChange={(e) => handleUpdateOption(qIndex, oIndex, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="form-field-group">
                          <label className="field-label-sm">Explanation / Remediation Rationale</label>
                          <input
                            type="text"
                            className="field-input"
                            placeholder="Explain why this choice is correct for candidate review..."
                            value={q.explanation || ''}
                            onChange={(e) => handleUpdateQuestion(qIndex, 'explanation', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                      <span>Saving Assessment...</span>
                    </>
                  ) : (
                    <span>Save Assessment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assessments List ── */}
      {modules.length > 0 && (
        <div className="assessments-repository-section">
          {courseAssessments.length === 0 ? (
            <div className="assessments-empty-card">
              <Award size={40} />
              <h3>No Assessments Configured</h3>
              <p>
                Define milestone assessments to evaluate learner competency once they finish prerequisite modules.
              </p>
              <button
                type="button"
                className="btn-primary-action"
                onClick={() => {
                  setActiveForm({
                    isEdit: false,
                    data: {
                      title: '',
                      description: '',
                      requiredModuleIds: [modules[0]._id],
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
                <Plus size={16} />
                <span>Create First Assessment</span>
              </button>
            </div>
          ) : (
            <div className="assessments-grid">
              {courseAssessments.map((ass) => {
                const isDraft = ass.state === 'draft';
                const requiredMods = (ass.requiredModuleIds || []).map(id => getModuleTitle(id));

                return (
                  <div key={ass._id} className={`assessment-card-node ${isDraft ? 'is-draft' : ''}`}>
                    <div className="assessment-card-header">
                      <div className="header-left">
                        <Award size={22} className="assessment-award-icon" />
                        <h4 className="assessment-title">{ass.title}</h4>
                      </div>

                      <div className="header-actions">
                        <button
                          type="button"
                          className={`btn-state-badge state-${ass.state}`}
                          onClick={() => handleToggleAssessmentState(ass._id)}
                          title="There's no delete in this system — switch to Draft to hide something from learners."
                        >
                          {isDraft ? <EyeOff size={13} /> : <CheckCircle2 size={13} />}
                          <span>{isDraft ? 'Draft' : 'Published'}</span>
                        </button>

                        <button
                          type="button"
                          className="btn-icon-action"
                          title="Edit Assessment"
                          onClick={() => {
                            setActiveForm({
                              isEdit: true,
                              data: {
                                id: ass._id,
                                title: ass.title,
                                description: ass.description,
                                requiredModuleIds: ass.requiredModuleIds || [],
                                passThresholdPercent: ass.passThresholdPercent || 70,
                                maxAttempts: ass.maxAttempts || 3,
                                cooldownHours: ass.cooldownHours || 6,
                                questions: ass.questions || []
                              }
                            });
                          }}
                        >
                          <Edit2 size={15} />
                        </button>
                      </div>
                    </div>

                    {ass.description && (
                      <p className="assessment-desc-text">{ass.description}</p>
                    )}

                    {/* Prerequisite Gate Notice */}
                    <div className="assessment-prereq-box">
                      <div className="prereq-label">
                        <Lock size={13} />
                        <span>Prerequisites:</span>
                      </div>
                      <div className="prereq-tags">
                        {requiredMods.length > 0 ? (
                          requiredMods.map((title, i) => (
                            <span key={i} className="prereq-pill">{title}</span>
                          ))
                        ) : (
                          <span className="prereq-pill empty">None specified</span>
                        )}
                      </div>
                    </div>

                    {/* Meta specs */}
                    <div className="assessment-specs-row">
                      <div className="spec-item">
                        <span className="spec-label">Pass Score</span>
                        <span className="spec-value">{ass.passThresholdPercent || 70}%</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Max Attempts</span>
                        <span className="spec-value">{ass.maxAttempts || 3}</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Cooldown</span>
                        <span className="spec-value">{ass.cooldownHours || 6}h</span>
                      </div>
                      <div className="spec-item">
                        <span className="spec-label">Questions</span>
                        <span className="spec-value">{ass.questions?.length || 0}</span>
                      </div>
                    </div>

                    <div className="assessment-card-footer">
                      <button
                        type="button"
                        className="btn-inspect-questions"
                        onClick={() => setInspectingAssessment(ass)}
                      >
                        <HelpCircle size={14} />
                        <span>Review Questions ({ass.questions?.length || 0})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Inspect Questions Modal ── */}
      {inspectingAssessment && (
        <div className="resource-preview-modal-overlay" onClick={() => setInspectingAssessment(null)}>
          <div className="resource-preview-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <div className="preview-header-info">
                <h3>{inspectingAssessment.title} — Questions</h3>
                <span className="modal-scope-tag">
                  {inspectingAssessment.questions?.length || 0} Questions Total
                </span>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setInspectingAssessment(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="preview-modal-body">
              <div className="inspect-questions-list">
                {(inspectingAssessment.questions || []).map((q, idx) => (
                  <div key={idx} className="inspect-question-item">
                    <div className="item-top">
                      <span className="q-idx">Q{idx + 1}.</span>
                      <h4 className="q-text">{q.questionText}</h4>
                    </div>

                    <div className="inspect-options-list">
                      {(q.options || []).map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`inspect-option-row ${q.correctOptionIndex === oIdx ? 'correct-option' : ''}`}
                        >
                          <span className="opt-letter">{String.fromCharCode(65 + oIdx)}</span>
                          <span className="opt-text">{opt}</span>
                          {q.correctOptionIndex === oIdx && (
                            <span className="correct-badge">
                              <CheckCircle2 size={13} /> Correct Answer
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="q-explanation-box">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
