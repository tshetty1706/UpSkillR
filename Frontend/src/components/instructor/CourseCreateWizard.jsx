import React, { useState } from 'react';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Video,
  FileText,
  HelpCircle,
  Eye,
  Globe,
  Lock,
  Sparkles,
  BookOpen
} from 'lucide-react';
import './CourseCreateWizard.css';

export const CourseCreateWizard = ({ onSaveCourse, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Info State
  const [courseInfo, setCourseInfo] = useState({
    title: '',
    description: '',
    category: 'Web Development',
    skillLevel: 'Beginner',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    price: 0
  });

  // Step 2: Lessons State
  const [lessons, setLessons] = useState([]);
  const [newLesson, setNewLesson] = useState({
    title: '',
    description: '',
    videoUrl: '',
    duration: '10 min',
    content: ''
  });

  // Step 3: Resources State
  const [resources, setResources] = useState([]);
  const [newResource, setNewResource] = useState({
    title: '',
    fileUrl: '',
    fileType: 'PDF Document'
  });

  // Step 4: Assessments State
  const [assessments, setAssessments] = useState([]);
  const [newAssessment, setNewAssessment] = useState({
    title: '',
    instructions: 'Complete all questions to test your knowledge.',
    questionText: '',
    option0: '',
    option1: '',
    option2: '',
    option3: '',
    correctAnswerIndex: 0
  });

  const categories = [
    'Web Development',
    'Data Science',
    'Design',
    'Business',
    'Marketing',
    'Artificial Intelligence',
    'Cybersecurity'
  ];

  const skillLevels = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];

  const handleInfoChange = (e) => {
    const { name, value } = e.target;
    setCourseInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddLesson = (e) => {
    e.preventDefault();
    if (!newLesson.title.trim()) return;
    setLessons((prev) => [...prev, { ...newLesson }]);
    setNewLesson({ title: '', description: '', videoUrl: '', duration: '10 min', content: '' });
  };

  const handleDeleteLesson = (index) => {
    setLessons((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddResource = (e) => {
    e.preventDefault();
    if (!newResource.title.trim()) return;
    setResources((prev) => [...prev, { ...newResource, fileUrl: newResource.fileUrl || '#' }]);
    setNewResource({ title: '', fileUrl: '', fileType: 'PDF Document' });
  };

  const handleDeleteResource = (index) => {
    setResources((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddAssessment = (e) => {
    e.preventDefault();
    if (!newAssessment.title.trim() || !newAssessment.questionText.trim()) return;

    const questions = [
      {
        questionText: newAssessment.questionText,
        options: [
          newAssessment.option0 || 'Option A',
          newAssessment.option1 || 'Option B',
          newAssessment.option2 || 'Option C',
          newAssessment.option3 || 'Option D'
        ],
        correctAnswerIndex: parseInt(newAssessment.correctAnswerIndex, 10) || 0
      }
    ];

    setAssessments((prev) => [
      ...prev,
      {
        title: newAssessment.title,
        instructions: newAssessment.instructions,
        passingScore: 70,
        questions
      }
    ]);

    setNewAssessment({
      title: '',
      instructions: 'Complete all questions to test your knowledge.',
      questionText: '',
      option0: '',
      option1: '',
      option2: '',
      option3: '',
      correctAnswerIndex: 0
    });
  };

  const handleDeleteAssessment = (index) => {
    setAssessments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (publishStatus = 'draft') => {
    if (!courseInfo.title.trim() || !courseInfo.description.trim()) {
      alert('Please fill in required course information.');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    const payload = {
      ...courseInfo,
      status: publishStatus,
      lessons,
      resources,
      assessments
    };

    await onSaveCourse(payload);
    setIsSubmitting(false);
  };

  const steps = [
    { num: 1, label: 'Course Info' },
    { num: 2, label: 'Lessons' },
    { num: 3, label: 'Resources' },
    { num: 4, label: 'Assessments' },
    { num: 5, label: 'Publish & Preview' }
  ];

  return (
    <div className="course-wizard-container">
      {/* Top Wizard Navigation */}
      <div className="wizard-header">
        <button type="button" className="back-btn" onClick={onCancel}>
          <ArrowLeft size={16} />
          <span>Back to My Courses</span>
        </button>
        <h1 className="wizard-heading">Create New Course</h1>
      </div>

      {/* Step Indicator */}
      <div className="wizard-steps-bar">
        {steps.map((step) => (
          <div
            key={step.num}
            className={`step-item ${currentStep === step.num ? 'active' : ''} ${
              currentStep > step.num ? 'completed' : ''
            }`}
            onClick={() => setCurrentStep(step.num)}
          >
            <div className="step-number">
              {currentStep > step.num ? <Check size={14} /> : step.num}
            </div>
            <span className="step-label">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Wizard Form Workspace */}
      <div className="wizard-card-workspace">
        {/* STEP 1: Basic Information */}
        {currentStep === 1 && (
          <div className="wizard-step-panel">
            <h2 className="panel-title">Step 1: Basic Course Information</h2>
            <p className="panel-subtitle">Provide details to help learners discover your course.</p>

            <div className="wizard-form-grid">
              <div className="form-group span-2">
                <label className="form-label">Course Title *</label>
                <input
                  type="text"
                  name="title"
                  className="form-input"
                  placeholder="e.g. Master React 19 & Next.js Development"
                  value={courseInfo.title}
                  onChange={handleInfoChange}
                  required
                />
              </div>

              <div className="form-group span-2">
                <label className="form-label">Course Description *</label>
                <textarea
                  name="description"
                  className="form-textarea"
                  rows={4}
                  placeholder="Write a clear, compelling summary of what learners will gain from this course..."
                  value={courseInfo.description}
                  onChange={handleInfoChange}
                  required
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
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
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
                  {skillLevels.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
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
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Lessons Manager */}
        {currentStep === 2 && (
          <div className="wizard-step-panel">
            <h2 className="panel-title">Step 2: Course Lessons & Modules</h2>
            <p className="panel-subtitle">Add video lessons and learning material to your course structure.</p>

            {/* Add Lesson Form */}
            <div className="add-subitem-card">
              <h3>Add New Lesson</h3>
              <div className="wizard-form-grid">
                <div className="form-group span-2">
                  <label className="form-label">Lesson Title *</label>
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
                  <label className="form-label">Lesson Description / Text Notes</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Key takeaways or summary notes..."
                    value={newLesson.description}
                    onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                  />
                </div>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAddLesson} style={{ marginTop: '0.75rem' }}>
                <Plus size={16} />
                <span>Add Lesson to Course</span>
              </button>
            </div>

            {/* Lessons List */}
            <div className="subitem-list">
              <h3>Added Lessons ({lessons.length})</h3>
              {lessons.length === 0 ? (
                <p className="empty-subitem-text">No lessons added yet. Use the form above to add your first lesson.</p>
              ) : (
                lessons.map((ls, idx) => (
                  <div key={idx} className="subitem-row">
                    <Video size={18} className="accent-green" />
                    <div className="subitem-info">
                      <span className="subitem-title">Lesson {idx + 1}: {ls.title}</span>
                      <span className="subitem-meta">{ls.duration} {ls.videoUrl && `• ${ls.videoUrl}`}</span>
                    </div>
                    <button type="button" className="delete-subitem-btn" onClick={() => handleDeleteLesson(idx)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Resources Manager */}
        {currentStep === 3 && (
          <div className="wizard-step-panel">
            <h2 className="panel-title">Step 3: Study Resources & Documents</h2>
            <p className="panel-subtitle">Attach downloadable slides, PDFs, code snippets, or reference links.</p>

            <div className="add-subitem-card">
              <h3>Add Study Resource</h3>
              <div className="wizard-form-grid">
                <div className="form-group">
                  <label className="form-label">Resource Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. React Cheatsheet PDF"
                    value={newResource.title}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Document Link / URL</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://drive.google.com/..."
                    value={newResource.fileUrl}
                    onChange={(e) => setNewResource({ ...newResource, fileUrl: e.target.value })}
                  />
                </div>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAddResource} style={{ marginTop: '0.75rem' }}>
                <Plus size={16} />
                <span>Add Resource</span>
              </button>
            </div>

            <div className="subitem-list">
              <h3>Attached Resources ({resources.length})</h3>
              {resources.length === 0 ? (
                <p className="empty-subitem-text">No resources attached yet.</p>
              ) : (
                resources.map((res, idx) => (
                  <div key={idx} className="subitem-row">
                    <FileText size={18} className="accent-green" />
                    <div className="subitem-info">
                      <span className="subitem-title">{res.title}</span>
                      <span className="subitem-meta">{res.fileType} • {res.fileUrl}</span>
                    </div>
                    <button type="button" className="delete-subitem-btn" onClick={() => handleDeleteResource(idx)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Assessments Manager */}
        {currentStep === 4 && (
          <div className="wizard-step-panel">
            <h2 className="panel-title">Step 4: Course Assessments & Quizzes</h2>
            <p className="panel-subtitle">Create quizzes to test learner comprehension.</p>

            <div className="add-subitem-card">
              <h3>Create Quiz Assessment</h3>
              <div className="wizard-form-grid">
                <div className="form-group span-2">
                  <label className="form-label">Quiz Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Module 1 Knowledge Check"
                    value={newAssessment.title}
                    onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })}
                  />
                </div>
                <div className="form-group span-2">
                  <label className="form-label">Question Text *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Which hook is used for side effects in React?"
                    value={newAssessment.questionText}
                    onChange={(e) => setNewAssessment({ ...newAssessment, questionText: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Option A</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="useState"
                    value={newAssessment.option0}
                    onChange={(e) => setNewAssessment({ ...newAssessment, option0: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Option B</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="useEffect"
                    value={newAssessment.option1}
                    onChange={(e) => setNewAssessment({ ...newAssessment, option1: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Option C</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="useContext"
                    value={newAssessment.option2}
                    onChange={(e) => setNewAssessment({ ...newAssessment, option2: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Option D</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="useReducer"
                    value={newAssessment.option3}
                    onChange={(e) => setNewAssessment({ ...newAssessment, option3: e.target.value })}
                  />
                </div>
                <div className="form-group span-2">
                  <label className="form-label">Correct Answer Index</label>
                  <select
                    className="form-select"
                    value={newAssessment.correctAnswerIndex}
                    onChange={(e) => setNewAssessment({ ...newAssessment, correctAnswerIndex: e.target.value })}
                  >
                    <option value={0}>Option A</option>
                    <option value={1}>Option B</option>
                    <option value={2}>Option C</option>
                    <option value={3}>Option D</option>
                  </select>
                </div>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAddAssessment} style={{ marginTop: '0.75rem' }}>
                <Plus size={16} />
                <span>Add Quiz Assessment</span>
              </button>
            </div>

            <div className="subitem-list">
              <h3>Created Quizzes ({assessments.length})</h3>
              {assessments.length === 0 ? (
                <p className="empty-subitem-text">No assessments created yet.</p>
              ) : (
                assessments.map((ass, idx) => (
                  <div key={idx} className="subitem-row">
                    <HelpCircle size={18} className="accent-green" />
                    <div className="subitem-info">
                      <span className="subitem-title">{ass.title}</span>
                      <span className="subitem-meta">{ass.questions?.length || 0} Questions • Passing score: {ass.passingScore}%</span>
                    </div>
                    <button type="button" className="delete-subitem-btn" onClick={() => handleDeleteAssessment(idx)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Preview & Publish */}
        {currentStep === 5 && (
          <div className="wizard-step-panel">
            <h2 className="panel-title">Step 5: Preview & Publish Course</h2>
            <p className="panel-subtitle">Review your complete course before publishing to learners on UpSkillr.</p>

            <div className="preview-course-card">
              <img src={courseInfo.thumbnail} alt={courseInfo.title} className="preview-thumb" />
              <div className="preview-body">
                <span className="category-pill">{courseInfo.category}</span>
                <h2>{courseInfo.title || 'Untitled Course'}</h2>
                <p>{courseInfo.description || 'No description provided.'}</p>
                <div className="preview-stats">
                  <span>Level: <strong>{courseInfo.skillLevel}</strong></span>
                  <span>Lessons: <strong>{lessons.length}</strong></span>
                  <span>Resources: <strong>{resources.length}</strong></span>
                  <span>Quizzes: <strong>{assessments.length}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Navigation Actions */}
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
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              <span>Next Step</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <div className="publish-final-actions">
              <button
                type="button"
                className="btn btn-outline"
                disabled={isSubmitting}
                onClick={() => handleSubmit('draft')}
              >
                <Lock size={16} />
                <span>Save as Draft</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                disabled={isSubmitting}
                onClick={() => handleSubmit('published')}
              >
                <Globe size={16} />
                <span>Publish Course Live</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
