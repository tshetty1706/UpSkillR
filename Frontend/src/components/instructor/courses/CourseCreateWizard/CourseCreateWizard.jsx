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
  Upload,
  Layers,
  ListPlus
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

const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const DEFAULT_THUMBNAIL =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80';

const STEPS = [
  { num: 1, label: 'Basic Info' },
  { num: 2, label: 'Course Overview' },
  { num: 3, label: 'Course Thumbnail' },
  { num: 4, label: 'Modules & Lessons' },
  { num: 5, label: 'Syllabus & Publish' }
];

export const CourseCreateWizard = ({ courses = [], onCourseCreated, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);

  // Server state — set after initial save
  const [courseId, setCourseId] = useState(null);
  const [course, setCourse] = useState(null);

  // Step 1: Basic Information & Thumbnail
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    category: 'Web Development',
    skillLevel: 'Beginner',
    shortDescription: '',
    tags: '',
    thumbnail: DEFAULT_THUMBNAIL
  });
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  // Step 2: Course Details & Template
  const [courseDetails, setCourseDetails] = useState({
    fullDescription: '',
    prerequisites: '',
    certificate: true,
    whatYouWillLearn: ['Learn foundational concepts', 'Build real-world projects'],
    techStack: ['Python', 'Git']
  });

  const [newLearnItem, setNewLearnItem] = useState('');
  const [newTechItem, setNewTechItem] = useState('');

  // Step 3: Modules & Lessons
  const [modules, setModules] = useState([
    {
      title: 'Module 1: Getting Started',
      description: 'Foundations and setup',
      lessons: [
        { title: 'Introduction & Setup', duration: '10 min', videoUrl: '', description: '' }
      ]
    }
  ]);
  const [activeModuleIdx, setActiveModuleIdx] = useState(0);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  const [newLesson, setNewLesson] = useState({
    title: '',
    duration: '10 min',
    videoUrl: '',
    description: ''
  });

  // UI state
  const [saveState, setSaveState] = useState('idle');
  const [wizardError, setWizardError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const getToken = () => localStorage.getItem('upskillr_token');

  // Handle Thumbnail File Upload
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setThumbnailUploading(true);
    setWizardError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = getToken();
      const response = await fetch(`${API_BASE}/courses/upload/thumbnail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setBasicInfo((prev) => ({ ...prev, thumbnail: data.fileUrl }));
      } else {
        setWizardError(data.message || 'Failed to upload thumbnail.');
      }
    } catch {
      setWizardError('Failed to upload thumbnail file.');
    } finally {
      setThumbnailUploading(false);
    }
  };

  // Add / Remove Learning Outcomes
  const handleAddLearnItem = () => {
    if (!newLearnItem.trim()) return;
    setCourseDetails((prev) => ({
      ...prev,
      whatYouWillLearn: [...prev.whatYouWillLearn, newLearnItem.trim()]
    }));
    setNewLearnItem('');
  };

  const handleRemoveLearnItem = (index) => {
    setCourseDetails((prev) => ({
      ...prev,
      whatYouWillLearn: prev.whatYouWillLearn.filter((_, i) => i !== index)
    }));
  };

  // Add / Remove Tech Stack
  const handleAddTechItem = () => {
    if (!newTechItem.trim()) return;
    setCourseDetails((prev) => ({
      ...prev,
      techStack: [...prev.techStack, newTechItem.trim()]
    }));
    setNewTechItem('');
  };

  const handleRemoveTechItem = (index) => {
    setCourseDetails((prev) => ({
      ...prev,
      techStack: prev.techStack.filter((_, i) => i !== index)
    }));
  };

  // Add Module
  const handleAddModule = () => {
    if (!newModuleTitle.trim()) return;
    const newMod = {
      title: newModuleTitle.trim(),
      description: '',
      lessons: []
    };
    setModules([...modules, newMod]);
    setActiveModuleIdx(modules.length);
    setNewModuleTitle('');
  };

  const handleDeleteModule = (idx) => {
    const updated = modules.filter((_, i) => i !== idx);
    setModules(updated);
    if (activeModuleIdx >= updated.length) {
      setActiveModuleIdx(Math.max(0, updated.length - 1));
    }
  };

  // Add Lesson inside Active Module
  const handleAddLessonToModule = () => {
    if (!newLesson.title.trim() || modules.length === 0) return;

    const updated = [...modules];
    updated[activeModuleIdx].lessons.push({ ...newLesson });
    setModules(updated);
    setNewLesson({ title: '', duration: '10 min', videoUrl: '', description: '' });
  };

  const handleDeleteLessonFromModule = (modIdx, lessonIdx) => {
    const updated = [...modules];
    updated[modIdx].lessons = updated[modIdx].lessons.filter((_, i) => i !== lessonIdx);
    setModules(updated);
  };

  // ─── STRICT VALIDATION BEFORE SAVING / CONTINUING ───
  const validateStep = (stepNumber) => {
    if (stepNumber === 1) {
      if (!basicInfo.title.trim()) {
        setWizardError('Course Title * is required.');
        return false;
      }
      if (!basicInfo.category.trim()) {
        setWizardError('Category / Subject Area * is required.');
        return false;
      }
      if (!basicInfo.skillLevel.trim()) {
        setWizardError('Course Level * is required.');
        return false;
      }
      if (!basicInfo.shortDescription.trim()) {
        setWizardError('Short Description * is required.');
        return false;
      }
    }

    if (stepNumber === 2) {
      if (!courseDetails.fullDescription.trim()) {
        setWizardError('Full Course Description * is required.');
        return false;
      }
      if (!courseDetails.prerequisites.trim()) {
        setWizardError('Prerequisites * is required.');
        return false;
      }
    }

    return true;
  };

  // Save Draft & Continue to next step
  const handleSaveDraft = async (nextStep = null) => {
    // 1. Strict validation of active step
    if (!validateStep(currentStep)) {
      return;
    }

    setWizardError('');
    setSaveState('saving');

    try {
      const token = getToken();
      const payload = {
        title: basicInfo.title,
        category: basicInfo.category,
        skillLevel: basicInfo.skillLevel,
        shortDescription: basicInfo.shortDescription,
        description: basicInfo.shortDescription,
        fullDescription: courseDetails.fullDescription || basicInfo.shortDescription,
        tags: basicInfo.tags ? basicInfo.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        thumbnail: basicInfo.thumbnail,
        prerequisites: courseDetails.prerequisites,
        certificate: courseDetails.certificate,
        whatYouWillLearn: courseDetails.whatYouWillLearn,
        techStack: courseDetails.techStack,
        modules,
        lessons: modules.flatMap(m => m.lessons)
      };

      let response, data;
      if (courseId) {
        response = await fetch(`${API_BASE}/courses/${courseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_BASE}/courses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      data = await response.json();
      if (data.success) {
        setCourseId(data.course._id);
        setCourse(data.course);
        setSaveState('saved');
        setTimeout(() => {
          setSaveState('idle');
          if (nextStep) setCurrentStep(nextStep);
        }, 400);
      } else {
        setSaveState('error');
        setWizardError(data.message || 'Failed to save draft.');
      }
    } catch {
      setSaveState('error');
      setWizardError('Network error saving course draft.');
    }
  };

  // ─── SAVE DRAFT AND EXIT (RETURNS TO MY COURSES) ───
  const handleSaveDraftAndExit = async () => {
    // Validate required fields first
    if (!basicInfo.title.trim()) {
      setWizardError('Course Title * is required to save draft.');
      return;
    }
    if (!basicInfo.shortDescription.trim()) {
      setWizardError('Short Description * is required to save draft.');
      return;
    }

    setWizardError('');
    setSaveState('saving');

    try {
      const token = getToken();
      const payload = {
        title: basicInfo.title,
        category: basicInfo.category,
        skillLevel: basicInfo.skillLevel,
        shortDescription: basicInfo.shortDescription,
        description: basicInfo.shortDescription,
        fullDescription: courseDetails.fullDescription || basicInfo.shortDescription,
        tags: basicInfo.tags ? basicInfo.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        thumbnail: basicInfo.thumbnail,
        prerequisites: courseDetails.prerequisites,
        certificate: courseDetails.certificate,
        whatYouWillLearn: courseDetails.whatYouWillLearn,
        techStack: courseDetails.techStack,
        modules,
        lessons: modules.flatMap(m => m.lessons)
      };

      let response, data;
      if (courseId) {
        response = await fetch(`${API_BASE}/courses/${courseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_BASE}/courses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      data = await response.json();
      if (data.success) {
        setSaveState('saved');
        setTimeout(() => {
          onCourseCreated && onCourseCreated(data.course);
        }, 300);
      } else {
        setSaveState('error');
        setWizardError(data.message || 'Failed to save draft.');
      }
    } catch {
      setSaveState('error');
      setWizardError('Network error saving course draft.');
    }
  };

  // Step 4: Publish Course Live
  const handlePublish = async () => {
    if (!validateStep(1) || !validateStep(2)) return;

    const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
    if (totalLessons === 0) {
      setWizardError('Please add at least one lesson before publishing this course.');
      return;
    }

    setIsPublishing(true);
    setWizardError('');
    try {
      const token = getToken();
      await fetch(`${API_BASE}/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ modules, lessons: modules.flatMap(m => m.lessons) })
      });

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
        setTimeout(() => {
          onCourseCreated && onCourseCreated(data.course);
        }, 1500);
      } else {
        setWizardError(data.message || 'Failed to publish course.');
      }
    } catch {
      setWizardError('Network error while publishing course.');
    } finally {
      setIsPublishing(false);
    }
  };

  const totalLessonsCount = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="course-wizard-container">
      {/* Wizard Header */}
      <div className="wizard-header">
        <button type="button" className="back-btn" onClick={onCancel}>
          <ArrowLeft size={16} />
          <span>Back to My Courses</span>
        </button>
        <div className="wizard-header-title-row">
          <h1 className="wizard-heading">Create Course</h1>
          {courseId && (
            <span className={`wizard-course-status-badge ${course?.status || 'draft'}`}>
              {course?.status === 'published'
                ? <><Globe size={12} /><span>Published</span></>
                : <><Lock size={12} /><span>Draft</span></>}
            </span>
          )}

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleSaveDraftAndExit}
            style={{ marginLeft: 'auto' }}
            disabled={saveState === 'saving'}
          >
            <Save size={14} />
            <span>Save Draft & Exit</span>
          </button>
        </div>
      </div>

      {/* Step Bar */}
      <div className="wizard-steps-bar">
        {STEPS.map((step, i) => (
          <React.Fragment key={step.num}>
            <div
              className={`step-item ${currentStep === step.num ? 'active' : ''} ${currentStep > step.num ? 'completed' : ''}`}
              onClick={() => {
                if (step.num < currentStep || courseId) {
                  if (validateStep(currentStep)) {
                    setCurrentStep(step.num);
                  }
                }
              }}
              style={{ cursor: step.num < currentStep || courseId ? 'pointer' : 'default' }}
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

      <div className="wizard-card-workspace">
        {wizardError && (
          <div className="wizard-error-banner" style={{ marginBottom: '1.25rem' }}>
            <AlertTriangle size={16} />
            <span>{wizardError}</span>
            <button type="button" className="banner-close-btn" onClick={() => setWizardError('')}>×</button>
          </div>
        )}

        {/* ═══ STEP 1: Basic Course Information ═══ */}
        {currentStep === 1 && (
          <div className="wizard-step-panel">
            <h2 className="panel-title">Basic Course Information</h2>
            <p className="panel-subtitle">Provide primary course information.</p>

            <div className="wizard-form-grid">
              <div className="form-group span-2">
                <label className="form-label">Course Title <span className="required-star">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Complete Python Developer in 2026"
                  value={basicInfo.title}
                  onChange={(e) => {
                    setBasicInfo({ ...basicInfo, title: e.target.value });
                    if (wizardError) setWizardError('');
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category / Subject Area <span className="required-star">*</span></label>
                <select
                  className="form-select"
                  value={basicInfo.category}
                  onChange={(e) => {
                    setBasicInfo({ ...basicInfo, category: e.target.value });
                    if (wizardError) setWizardError('');
                  }}
                  required
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Course Level <span className="required-star">*</span></label>
                <select
                  className="form-select"
                  value={basicInfo.skillLevel}
                  onChange={(e) => {
                    setBasicInfo({ ...basicInfo, skillLevel: e.target.value });
                    if (wizardError) setWizardError('');
                  }}
                  required
                >
                  {SKILL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="form-group span-2">
                <label className="form-label">Short Description <span className="required-star">*</span></label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Brief summary of what this course teaches..."
                  value={basicInfo.shortDescription}
                  onChange={(e) => {
                    setBasicInfo({ ...basicInfo, shortDescription: e.target.value });
                    if (wizardError) setWizardError('');
                  }}
                  required
                />
              </div>

              <div className="form-group span-2">
                <label className="form-label">Tags / Keywords (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Python, Variables, Functions, Backend"
                  value={basicInfo.tags}
                  onChange={(e) => setBasicInfo({ ...basicInfo, tags: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Course Overview ═══ */}
        {currentStep === 2 && (
          <div className="wizard-step-panel">
            <h2 className="panel-title">Course Overview</h2>
            <p className="panel-subtitle">Define prerequisites, learning outcomes, tech stack, and certificate options.</p>

            <div className="wizard-form-grid">
              <div className="form-group span-2">
                <label className="form-label">Full Course Description <span className="required-star">*</span></label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Comprehensive description of topics, projects, and target audience..."
                  value={courseDetails.fullDescription}
                  onChange={(e) => {
                    setCourseDetails({ ...courseDetails, fullDescription: e.target.value });
                    if (wizardError) setWizardError('');
                  }}
                  required
                />
              </div>

              <div className="form-group span-2">
                <label className="form-label">Prerequisites <span className="required-star">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Basic computer skills, no coding experience required."
                  value={courseDetails.prerequisites}
                  onChange={(e) => {
                    setCourseDetails({ ...courseDetails, prerequisites: e.target.value });
                    if (wizardError) setWizardError('');
                  }}
                  required
                />
              </div>

              <div className="form-group span-2">
                <label className="form-label">Certificate Granted on Completion?</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '4px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="certOption"
                      checked={courseDetails.certificate === true}
                      onChange={() => setCourseDetails({ ...courseDetails, certificate: true })}
                    />
                    <span>Yes (Issue Completion Certificate)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="certOption"
                      checked={courseDetails.certificate === false}
                      onChange={() => setCourseDetails({ ...courseDetails, certificate: false })}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* What You'll Learn List */}
              <div className="form-group span-2">
                <label className="form-label">What You'll Learn (Learning Outcomes)</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add learning outcome (e.g. Master Python data structures)"
                    value={newLearnItem}
                    onChange={(e) => setNewLearnItem(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLearnItem(); } }}
                  />
                  <button type="button" className="btn btn-outline" onClick={handleAddLearnItem}>
                    <Plus size={16} />
                  </button>
                </div>
                <div className="subitem-list">
                  {courseDetails.whatYouWillLearn.map((item, idx) => (
                    <div key={idx} className="subitem-row" style={{ padding: '8px 12px' }}>
                      <CheckCircle2 size={15} className="accent-green" />
                      <span className="subitem-title" style={{ flex: 1 }}>{item}</span>
                      <button type="button" className="delete-subitem-btn" onClick={() => handleRemoveLearnItem(idx)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech Stack List */}
              <div className="form-group span-2">
                <label className="form-label">Tech Stack You'll Learn</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add tech tool (e.g. FastAPI, PostgreSQL)"
                    value={newTechItem}
                    onChange={(e) => setNewTechItem(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTechItem(); } }}
                  />
                  <button type="button" className="btn btn-outline" onClick={handleAddTechItem}>
                    <Plus size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {courseDetails.techStack.map((tech, idx) => (
                    <span key={idx} className="category-chip active" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {tech}
                      <button type="button" onClick={() => handleRemoveTechItem(idx)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: Course Thumbnail ═══ */}
        {currentStep === 3 && (
          <div className="wizard-step-panel">
            <h2 className="panel-title">Course Thumbnail</h2>
            <p className="panel-subtitle">Upload a high-quality cover image for your course.</p>

            <div className="wizard-form-grid">
              <div className="form-group span-2">
                <label className="form-label">Course Cover Image</label>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                  {basicInfo.thumbnail && (
                    <img
                      src={basicInfo.thumbnail}
                      alt="Thumbnail Preview"
                      style={{ width: '220px', height: '124px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}
                    />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Upload size={16} />
                      <span>{thumbnailUploading ? 'Uploading Image...' : 'Upload Image File'}</span>
                      <input type="file" accept="image/*" onChange={handleThumbnailUpload} style={{ display: 'none' }} disabled={thumbnailUploading} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: Modules & Lessons Hierarchy ═══ */}
        {currentStep === 4 && (
          <div className="wizard-step-panel">
            <h2 className="panel-title">Modules & Lessons Structure</h2>
            <p className="panel-subtitle">Organize your course content into structured modules and lessons.</p>

            {/* Create Module Header */}
            <div className="add-subitem-card" style={{ marginBottom: '1.5rem' }}>
              <h3>Add New Module</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Module 2: Data Structures & Algorithms"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                />
                <button type="button" className="btn btn-primary" onClick={handleAddModule}>
                  <Plus size={16} />
                  <span>Add Module</span>
                </button>
              </div>
            </div>

            {/* Modules Accordion / List */}
            {modules.length === 0 ? (
              <div className="empty-subitems-state">
                <p>No modules created yet. Add a module above to get started.</p>
              </div>
            ) : (
              <div className="modules-layout-grid">
                {/* Left Module Tabs */}
                <div className="modules-sidebar-list">
                  {modules.map((mod, idx) => (
                    <div
                      key={idx}
                      className={`module-tab-item ${activeModuleIdx === idx ? 'active' : ''}`}
                      onClick={() => setActiveModuleIdx(idx)}
                    >
                      <div className="mod-info">
                        <span className="mod-num">Module {idx + 1}</span>
                        <h4 className="mod-title">{mod.title}</h4>
                        <span className="mod-lessons-count">{mod.lessons.length} lessons</span>
                      </div>
                      <button
                        type="button"
                        className="delete-mod-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteModule(idx);
                        }}
                        title="Delete Module"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Right Lessons Workspace */}
                {modules[activeModuleIdx] && (
                  <div className="module-content-card">
                    <div className="module-card-header">
                      <h3>{modules[activeModuleIdx].title}</h3>
                      <span className="badge badge-accent">{modules[activeModuleIdx].lessons.length} Lessons</span>
                    </div>

                    {/* Lesson Form */}
                    <div className="add-lesson-box">
                      <h4>Add Lesson to this Module</h4>
                      <div className="lesson-form-grid">
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Lesson Title (e.g. Intro to Arrays)"
                          value={newLesson.title}
                          onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                        />

                        <div className="lesson-form-row">
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Duration (e.g. 15 min)"
                            value={newLesson.duration}
                            onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
                          />
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Video Embed URL (Optional)"
                            value={newLesson.videoUrl}
                            onChange={(e) => setNewLesson({ ...newLesson, videoUrl: e.target.value })}
                          />
                        </div>

                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={handleAddLessonToModule}
                          disabled={!newLesson.title.trim()}
                          style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                        >
                          <Plus size={14} />
                          <span>Add Lesson</span>
                        </button>
                      </div>
                    </div>

                    {/* Lessons List */}
                    <div className="lessons-list">
                      {modules[activeModuleIdx].lessons.length === 0 ? (
                        <p className="no-lessons-text">No lessons added to this module yet.</p>
                      ) : (
                        modules[activeModuleIdx].lessons.map((les, lIdx) => (
                          <div key={lIdx} className="lesson-item-row">
                            <Video size={16} className="lesson-icon" />
                            <div className="lesson-details">
                              <span className="lesson-name">{les.title}</span>
                              <span className="lesson-duration">{les.duration}</span>
                            </div>
                            <button
                              type="button"
                              className="delete-subitem-btn"
                              onClick={() => handleDeleteLessonFromModule(activeModuleIdx, lIdx)}
                              title="Delete Lesson"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ STEP 5: Auto-Generated Syllabus & Publish ═══ */}
        {currentStep === 5 && (
          <div className="wizard-step-panel">
            <h2 className="panel-title">Automatically Generated Syllabus & Review</h2>
            <p className="panel-subtitle">Review the course syllabus generated dynamically from your modules & lessons.</p>

            {publishSuccess ? (
              <div className="publish-success-box">
                <div className="publish-success-icon"><CheckCircle2 size={44} /></div>
                <h3>Course Published Live!</h3>
                <p>Your course and syllabus are now live on UpSkillr. Redirecting to My Courses...</p>
              </div>
            ) : (
              <>
                {/* Generated Syllabus View */}
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                    <ListPlus size={18} className="accent-green" />
                    <h3 style={{ margin: 0 }}>Generated Syllabus ({modules.length} Modules • {totalLessonsCount} Lessons)</h3>
                  </div>

                  {modules.map((m, mIdx) => (
                    <div key={mIdx} style={{ marginBottom: '1rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>{m.title}</h4>
                      {m.lessons.length === 0 ? (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No lessons added.</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {m.lessons.map((les, lIdx) => (
                            <div key={lIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                              <Video size={14} />
                              <span>{les.title}</span>
                              <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{les.duration}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleSaveDraftAndExit}
                    disabled={saveState === 'saving'}
                  >
                    <Save size={16} />
                    <span>Save Draft & Exit</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={totalLessonsCount === 0 || isPublishing}
                    onClick={handlePublish}
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

        {/* Navigation Bar */}
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

            {currentStep < 5 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleSaveDraft(currentStep + 1)}
                disabled={saveState === 'saving'}
                style={{ marginLeft: 'auto' }}
              >
                {saveState === 'saving'
                  ? <><Loader2 size={16} className="spin-icon" /><span>Saving...</span></>
                  : <><span>Save & Continue</span><ArrowRight size={16} /></>}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
