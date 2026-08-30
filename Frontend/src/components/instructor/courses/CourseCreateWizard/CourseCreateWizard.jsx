import React, { useState } from 'react';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Video,
  Globe,
  Lock,
  Save,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  BookOpen
} from 'lucide-react';
import './CourseCreateWizard.css';

const API_BASE = 'http://localhost:5000/api';

const CATEGORIES = [
  'Web Development',
  'Data Science',
  'Design',
  'Business',
  'Marketing',
  'Artificial Intelligence',
  'Cybersecurity'
];

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

const DEFAULT_THUMBNAIL =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80';

const STEPS = [
  { num: 1, label: 'Course Details' },
  { num: 2, label: 'Add Lessons' },
  { num: 3, label: 'Review & Publish' }
];

export const CourseCreateWizard = ({ courses = [], onCourseCreated, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Server state — set after Step 1 saves
  const [courseId, setCourseId] = useState(null);
  const [course, setCourse] = useState(null);

  // Step 1 form state
  const [courseInfo, setCourseInfo] = useState({
    title: '',
    description: '',
    category: 'Web Development',
    skillLevel: 'Beginner',
    thumbnail: DEFAULT_THUMBNAIL,
    price: 0,
    skills: ''
  });
  const [step1Dirty, setStep1Dirty] = useState(false);
  const [titleWarningAcknowledged, setTitleWarningAcknowledged] = useState(false);

  // Save feedback states
  const [saveState, setSaveState] = useState('idle'); // 'idle'|'saving'|'saved'|'error'
  const [step1Error, setStep1Error] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Step 2 — lesson form
  const [newLesson, setNewLesson] = useState({
    title: '',
    description: '',
    videoUrl: '',
    duration: '10 min',
    content: ''
  });
  const [lessonSaving, setLessonSaving] = useState(false);
  const [lessonError, setLessonError] = useState('');

  // Step 3 — publish state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState(false);

  const getToken = () => localStorage.getItem('upskillr_token');

  // ─── Step 1: Change handlers ───
  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setCourseInfo((prev) => ({ ...prev, [name]: value }));
    setStep1Dirty(true);
    setDuplicateWarning('');
    setStep1Error('');
    if (name === 'title') {
      setTitleWarningAcknowledged(false);
    }
  };

  // ─── Step 1: Save (creates or updates draft) ───
  const handleSaveStep1 = async (bypassDuplicateCheck = false) => {
    const { title, description, category } = courseInfo;
    if (!title.trim()) { setStep1Error('Course title is required.'); return; }
    if (!description.trim()) { setStep1Error('Course description is required.'); return; }
    if (!category.trim()) { setStep1Error('Please select a category.'); return; }

    // Client-side duplicate check (case-insensitive, normalized)
    const isDuplicate = (courses || []).some(
      (c) => c.title.trim().toLowerCase() === title.trim().toLowerCase()
    );

    if (isDuplicate && !titleWarningAcknowledged && !bypassDuplicateCheck) {
      setDuplicateWarning(`Similar title detected: "${title}" is similar to one of your existing courses. If this is intentional, you can click "Continue Anyway".`);
      return;
    }

    setStep1Error('');
    setSaveState('saving');

    try {
      const token = getToken();
      let response, data;

      if (courseId) {
        // Draft already exists — update it
        response = await fetch(`${API_BASE}/courses/${courseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ...courseInfo,
            skills: courseInfo.skills ? courseInfo.skills.split(',').map(s => s.trim()).filter(Boolean) : []
          })
        });
        data = await response.json();
      } else {
        // First save — create draft on server
        response = await fetch(`${API_BASE}/courses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ...courseInfo,
            skills: courseInfo.skills ? courseInfo.skills.split(',').map(s => s.trim()).filter(Boolean) : []
          })
        });
        data = await response.json();
      }

      if (data.success) {
        setCourseId(data.course._id);
        setCourse(data.course);
        setCourseInfo({
          title: data.course.title,
          description: data.course.description,
          category: data.course.category,
          skillLevel: data.course.skillLevel,
          thumbnail: data.course.thumbnail,
          price: data.course.price,
          skills: Array.isArray(data.course.skills) ? data.course.skills.join(', ') : ''
        });
        setSaveState('saved');
        setStep1Dirty(false);
        setDuplicateWarning('');

        // Brief "Saved" feedback, then advance
        setTimeout(() => {
          setSaveState('idle');
          setCurrentStep(2);
        }, 700);
      } else {
        setSaveState('error');
        setStep1Error(data.message || 'Failed to save course information. Please try again.');
      }
    } catch {
      setSaveState('error');
      setStep1Error('Network error. Please check your connection and try again.');
    }
  };

  // ─── Step 2: Add Lesson (immediate server save) ───
  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!newLesson.title.trim()) return;
    if (!courseId) return;

    setLessonError('');
    setLessonSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/courses/${courseId}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newLesson)
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        setNewLesson({
          title: '',
          description: '',
          videoUrl: '',
          duration: '10 min',
          content: ''
        });
      } else {
        setLessonError(data.message || 'Failed to add lesson.');
      }
    } catch {
      setLessonError('Network error while saving lesson. Please try again.');
    } finally {
      setLessonSaving(false);
    }
  };

  // ─── Step 2: Delete Lesson ───
  const handleDeleteLesson = async (idx) => {
    if (!courseId) return;
    setLessonError('');
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/courses/${courseId}/lessons/${idx}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
      } else {
        setLessonError(data.message || 'Failed to remove lesson.');
      }
    } catch {
      setLessonError('Network error while removing lesson.');
    }
  };

  // ─── Step 3: Publish ───
  const handlePublish = async () => {
    if (!courseId) return;
    const lessonCount = course?.lessons?.length || 0;
    if (lessonCount === 0) {
      setPublishError('Add at least one lesson before publishing this course.');
      return;
    }

    setIsPublishing(true);
    setPublishError('');
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE}/courses/${courseId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'published' })
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        setPublishSuccess(true);
        // Notify parent after brief success display
        setTimeout(() => {
          onCourseCreated && onCourseCreated(data.course);
        }, 1800);
      } else {
        // Backend might still return zero-lesson error
        setPublishError(data.message || 'Failed to publish course. Please try again.');
      }
    } catch {
      setPublishError('Network error. Please check your connection and try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  // ─── Save as Draft and Exit ───
  const handleSaveDraftAndExit = () => {
    onCourseCreated && onCourseCreated(course);
  };

  // ─── Cancel (warn if step 1 has unsaved input and no draft yet) ───
  const handleCancel = () => {
    if (!courseId && step1Dirty && courseInfo.title.trim()) {
      if (!window.confirm('You have unsaved changes. Leave without saving?')) return;
    }
    onCancel();
  };

  const lessonCount = course?.lessons?.length || 0;
  const canPublish = lessonCount > 0;

  return (
    <div className="course-wizard-container">

      {/* ── Wizard Header ── */}
      <div className="wizard-header">
        <button type="button" className="back-btn" onClick={handleCancel}>
          <ArrowLeft size={16} />
          <span>Back to My Courses</span>
        </button>
        <div className="wizard-header-title-row">
          <h1 className="wizard-heading">Create New Course</h1>
          {courseId && (
            <span className={`wizard-course-status-badge ${course?.status || 'draft'}`}>
              {course?.status === 'published'
                ? <><Globe size={12} /><span>Published</span></>
                : <><Lock size={12} /><span>Draft</span></>}
            </span>
          )}
        </div>
      </div>

      {/* ── Step Bar ── */}
      <div className="wizard-steps-bar">
        {STEPS.map((step, i) => (
          <React.Fragment key={step.num}>
            <div
              className={`step-item ${currentStep === step.num ? 'active' : ''} ${currentStep > step.num ? 'completed' : ''}`}
              onClick={() => {
                // Allow clicking back to already-completed steps only
                if (step.num < currentStep || (step.num === 2 && courseId)) {
                  setCurrentStep(step.num);
                }
              }}
              style={{ cursor: step.num < currentStep || (step.num === 2 && courseId) ? 'pointer' : 'default' }}
            >
              <div className="step-number">
                {currentStep > step.num ? <Check size={14} /> : step.num}
              </div>
              <span className="step-label">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`step-connector ${currentStep > step.num ? 'done' : ''}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step Content ── */}
      <div className="wizard-card-workspace">

        {/* ═══ STEP 1: Course Details ═══ */}
        {currentStep === 1 && (
          <div className="wizard-step-panel">
            <div className="wizard-panel-header-row">
              <div>
                <h2 className="panel-title">Step 1: Course Details</h2>
                <p className="panel-subtitle">
                  Provide the basic information that helps learners discover your course.
                  This will be saved as a Draft on the server.
                </p>
              </div>
              {saveState === 'saving' && (
                <div className="save-state-indicator saving">
                  <Loader2 size={14} className="spin-icon" />
                  <span>Saving...</span>
                </div>
              )}
              {saveState === 'saved' && (
                <div className="save-state-indicator saved">
                  <CheckCircle2 size={14} />
                  <span>Saved</span>
                </div>
              )}
            </div>

            {/* Duplicate title soft warning */}
            {duplicateWarning && (
              <div className="wizard-warning-banner">
                <AlertTriangle size={15} />
                <span>{duplicateWarning}</span>
              </div>
            )}

            {/* Step 1 error */}
            {step1Error && (
              <div className="wizard-error-banner">
                <AlertTriangle size={15} />
                <span>{step1Error}</span>
                <button type="button" className="banner-close-btn" onClick={() => setStep1Error('')}>×</button>
              </div>
            )}

            <div className="wizard-form-grid">
              <div className="form-group span-2">
                <label className="form-label">
                  Course Title <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  className="form-input"
                  placeholder="e.g. Master React 19 & Next.js Development"
                  value={courseInfo.title}
                  onChange={handleInfoChange}
                />
              </div>

              <div className="form-group span-2">
                <label className="form-label">
                  Course Description <span className="required-star">*</span>
                </label>
                <textarea
                  name="description"
                  className="form-textarea"
                  rows={4}
                  placeholder="Write a clear, compelling summary of what learners will gain from this course..."
                  value={courseInfo.description}
                  onChange={handleInfoChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  name="category"
                  className="form-select"
                  value={courseInfo.category}
                  onChange={handleInfoChange}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Skill Level</label>
                <select
                  name="skillLevel"
                  className="form-select"
                  value={courseInfo.skillLevel}
                  onChange={handleInfoChange}
                >
                  {SKILL_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div className="form-group span-2">
                <label className="form-label">Topics / Skills (comma-separated)</label>
                <input
                  type="text"
                  name="skills"
                  className="form-input"
                  placeholder="e.g. React, Hooks, Router"
                  value={courseInfo.skills}
                  onChange={handleInfoChange}
                />
              </div>

              <div className="form-group span-2">
                <label className="form-label">Thumbnail Image URL</label>
                <input
                  type="text"
                  name="thumbnail"
                  className="form-input"
                  placeholder="https://example.com/thumbnail.jpg"
                  value={courseInfo.thumbnail}
                  onChange={handleInfoChange}
                />
                {courseInfo.thumbnail && (
                  <div className="thumb-preview-wrap">
                    <img
                      src={courseInfo.thumbnail}
                      alt="Thumbnail preview"
                      className="thumb-preview"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Add Lessons ═══ */}
        {currentStep === 2 && (
          <div className="wizard-step-panel">
            <div className="wizard-panel-header-row">
              <div>
                <h2 className="panel-title">Step 2: Add Course Lessons</h2>
                <p className="panel-subtitle">
                  Add video lessons to your course. Each lesson is saved immediately to the server.
                </p>
              </div>
              <div className="lesson-count-badge">
                <Video size={14} />
                <span>{lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}</span>
              </div>
            </div>

            {lessonError && (
              <div className="wizard-error-banner">
                <AlertTriangle size={15} />
                <span>{lessonError}</span>
                <button type="button" className="banner-close-btn" onClick={() => setLessonError('')}>×</button>
              </div>
            )}

            {/* Add Lesson Form */}
            <div className="add-subitem-card">
              <h3>Add New Lesson</h3>
              <div className="wizard-form-grid">
                <div className="form-group span-2">
                  <label className="form-label">
                    Lesson Title <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Introduction to Component Lifecycle"
                    value={newLesson.title}
                    onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Video Stream URL</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://youtube.com/... or video link"
                    value={newLesson.videoUrl}
                    onChange={(e) => setNewLesson({ ...newLesson, videoUrl: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 15 min"
                    value={newLesson.duration}
                    onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
                  />
                </div>
                <div className="form-group span-2">
                  <label className="form-label">Lesson Notes / Description</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Key takeaways or summary notes..."
                    value={newLesson.description}
                    onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleAddLesson}
                disabled={lessonSaving || !newLesson.title.trim()}
                style={{ marginTop: '0.75rem' }}
              >
                {lessonSaving
                  ? <><Loader2 size={15} className="spin-icon" /><span>Adding...</span></>
                  : <><Plus size={15} /><span>Add Lesson to Course</span></>}
              </button>
            </div>

            {/* Lessons List */}
            <div className="subitem-list">
              <h3>Added Lessons ({lessonCount})</h3>
              {lessonCount === 0 ? (
                <div className="empty-lessons-state">
                  <Video size={26} />
                  <p>No lessons added yet. Use the form above to add your first lesson.</p>
                </div>
              ) : (
                (course?.lessons || []).map((ls, idx) => (
                  <div key={idx} className="subitem-row">
                    <span className="lesson-order-num">{idx + 1}</span>
                    <Video size={16} className="accent-green" />
                    <div className="subitem-info">
                      <span className="subitem-title">{ls.title}</span>
                      <span className="subitem-meta">
                        {ls.duration}
                        {ls.videoUrl ? ` · ${ls.videoUrl.length > 45 ? ls.videoUrl.substring(0, 45) + '…' : ls.videoUrl}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="delete-subitem-btn"
                      onClick={() => handleDeleteLesson(idx)}
                      title="Remove lesson"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Review & Publish ═══ */}
        {currentStep === 3 && (
          <div className="wizard-step-panel">
            <h2 className="panel-title">Step 3: Review & Publish</h2>
            <p className="panel-subtitle">
              Review your course before publishing it live to learners on UpSkillr.
            </p>

            {publishSuccess ? (
              /* ── Published Success State ── */
              <div className="publish-success-box">
                <div className="publish-success-icon">
                  <CheckCircle2 size={44} />
                </div>
                <h3>Course Published!</h3>
                <p>Your course is now live and visible to learners on UpSkillr. Redirecting to your courses...</p>
              </div>
            ) : (
              <>
                {/* Course Preview */}
                <div className="preview-course-card">
                  {course?.thumbnail && (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="preview-thumb"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div className="preview-body">
                    <span className="category-pill">{course?.category}</span>
                    <h2>{course?.title || 'Untitled Course'}</h2>
                    <p className="preview-description">
                      {course?.description || 'No description provided.'}
                    </p>
                    <div className="preview-stats">
                      <span>Level: <strong>{course?.skillLevel}</strong></span>
                      <span>Lessons: <strong>{lessonCount}</strong></span>
                      <span>Status: <strong style={{ textTransform: 'capitalize' }}>{course?.status || 'draft'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Zero-lesson publish gate */}
                {!canPublish && (
                  <div className="publish-block-warning">
                    <AlertTriangle size={20} className="warning-icon" />
                    <div>
                      <strong>Cannot publish yet</strong>
                      <p>Add at least one lesson before publishing this course. Go back to Step 2 to add lessons.</p>
                    </div>
                  </div>
                )}

                {publishError && (
                  <div className="wizard-error-banner">
                    <AlertTriangle size={15} />
                    <span>{publishError}</span>
                    <button type="button" className="banner-close-btn" onClick={() => setPublishError('')}>×</button>
                  </div>
                )}

                <div className="publish-final-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleSaveDraftAndExit}
                  >
                    <Lock size={16} />
                    <span>Save as Draft & Exit</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!canPublish || isPublishing}
                    onClick={handlePublish}
                    title={!canPublish ? 'Add at least one lesson to publish' : 'Publish course live'}
                  >
                    {isPublishing
                      ? <><Loader2 size={16} className="spin-icon" /><span>Publishing...</span></>
                      : <><Globe size={16} /><span>Publish Course Live</span></>}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Navigation Bar ── */}
        {!publishSuccess && (
          <div className="wizard-actions-bar">
            {currentStep > 1 && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                <ArrowLeft size={16} />
                <span>Previous Step</span>
              </button>
            )}

            {currentStep === 1 && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                {duplicateWarning && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }}
                    onClick={() => {
                      setTitleWarningAcknowledged(true);
                      handleSaveStep1(true);
                    }}
                  >
                    <span>Continue Anyway</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSaveStep1(false)}
                  disabled={saveState === 'saving'}
                >
                  {saveState === 'saving'
                    ? <><Loader2 size={16} className="spin-icon" /><span>Saving...</span></>
                    : <><Save size={16} /><span>{courseId ? 'Update & Continue' : 'Save & Continue'}</span></>}
                </button>
              </div>
            )}

            {currentStep === 2 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCurrentStep(3)}
                style={{ marginLeft: 'auto' }}
              >
                <span>Review & Publish</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
