import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Video,
  FileText,
  HelpCircle,
  Globe,
  Lock,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Layers,
  FileCode,
  Eye,
  Edit3,
  Clock,
  UserCheck,
  Award
} from 'lucide-react';
import './CourseManager.css';
import { useToast } from '../../../../context/ToastContext';

const API_BASE = 'http://localhost:5000/api';

export const CourseManager = ({ courseId, onBack, onUpdateCourse, onPublishToggle }) => {
  const { toast } = useToast();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lessons'); // 'overview', 'lessons', 'publish'
  const [saving, setSaving] = useState(false);

  // Edit Course Info
  const [editInfo, setEditInfo] = useState({
    title: '',
    shortDescription: '',
    description: '',
    category: '',
    skillLevel: 'Beginner',
    thumbnail: '',
    prerequisites: '',
    tags: ''
  });

  // Selected Lesson State
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);

  // Modals state
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceForm, setResourceForm] = useState({ title: '', description: '', file: null });
  const [uploadingResource, setUploadingResource] = useState(false);

  // Assessment Modals & Forms
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [assessmentForm, setAssessmentForm] = useState({
    title: '',
    description: '',
    instructions: '',
    type: 'Quiz',
    totalMarks: 10,
    passingMarks: 5,
    timeLimit: 30,
    attemptsAllowed: 1,
    dueDate: ''
  });

  // Question Form Modal
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [activeAssessmentId, setActiveAssessmentId] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    questionText: '',
    type: 'mcq',
    options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
    correctAnswer: 'Option 1',
    correctAnswerIndex: 0,
    marks: 2,
    evaluationInstructions: ''
  });

  // Review & Confirmation Modals
  const [reviewAssessment, setReviewAssessment] = useState(null);
  const [publishConfirmAssessment, setPublishConfirmAssessment] = useState(null);

  // Submissions Modal State
  const [viewSubmissionsAssessment, setViewSubmissionsAssessment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradingAnswers, setGradingAnswers] = useState([]);
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [gradingReason, setGradingReason] = useState('Instructor evaluated submission');
  const [savingGrade, setSavingGrade] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/courses/${courseId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        setEditInfo({
          title: data.course.title || '',
          shortDescription: data.course.shortDescription || data.course.description || '',
          description: data.course.description || '',
          category: data.course.category || '',
          skillLevel: data.course.skillLevel || 'Beginner',
          thumbnail: data.course.thumbnail || '',
          prerequisites: data.course.prerequisites || '',
          tags: Array.isArray(data.course.tags) ? data.course.tags.join(', ') : ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch course details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOverview = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editInfo,
          tags: editInfo.tags ? editInfo.tags.split(',').map(t => t.trim()).filter(Boolean) : []
        })
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        toast.success('Course details updated successfully!');
        if (onUpdateCourse) onUpdateCourse(data.course);
      } else {
        toast.error(data.message || 'Failed to update course.');
      }
    } catch {
      toast.error('Network error updating course.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Resource Upload ───
  const handleUploadResourceSubmit = async (e) => {
    e.preventDefault();
    if (!resourceForm.file) {
      toast.error('Please select a file to upload.');
      return;
    }

    setUploadingResource(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const formData = new FormData();
      formData.append('file', resourceForm.file);
      formData.append('title', resourceForm.title || resourceForm.file.name);
      formData.append('description', resourceForm.description);

      const response = await fetch(`${API_BASE}/courses/${courseId}/lessons/${selectedLessonIdx}/resources/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        setShowResourceModal(false);
        setResourceForm({ title: '', description: '', file: null });
        toast.success('Resource uploaded successfully!');
        if (onUpdateCourse) onUpdateCourse(data.course);
      } else {
        toast.error(data.message || 'Failed to upload resource.');
      }
    } catch {
      toast.error('Error uploading resource file.');
    } finally {
      setUploadingResource(false);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/courses/${courseId}/lessons/${selectedLessonIdx}/resources/${resourceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        toast.success('Resource deleted successfully.');
        if (onUpdateCourse) onUpdateCourse(data.course);
      }
    } catch {
      toast.error('Failed to delete resource.');
    }
  };

  // ─── Assessment Authoring ───
  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    if (!assessmentForm.title.trim()) {
      toast.error('Assessment title is required.');
      return;
    }

    try {
      const token = localStorage.getItem('upskillr_token');
      let url = `${API_BASE}/courses/${courseId}/lessons/${selectedLessonIdx}/assessments`;
      let method = 'POST';

      if (editingAssessment) {
        url = `${API_BASE}/courses/${courseId}/lessons/${selectedLessonIdx}/assessments/${editingAssessment._id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(assessmentForm)
      });

      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        setShowAssessmentModal(false);
        setEditingAssessment(null);
        setAssessmentForm({
          title: '',
          description: '',
          instructions: '',
          type: 'Quiz',
          totalMarks: 10,
          passingMarks: 5,
          timeLimit: 30,
          attemptsAllowed: 1,
          dueDate: ''
        });
        toast.success(editingAssessment ? 'Assessment updated!' : 'Assessment draft created!');
        if (onUpdateCourse) onUpdateCourse(data.course);
      }
    } catch {
      toast.error('Failed to save assessment.');
    }
  };

  const handleDeleteAssessment = async (assessmentId) => {
    if (!window.confirm('Delete this assessment and all questions?')) return;
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/courses/${courseId}/lessons/${selectedLessonIdx}/assessments/${assessmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        toast.success('Assessment deleted.');
        if (onUpdateCourse) onUpdateCourse(data.course);
      }
    } catch {
      toast.error('Failed to delete assessment.');
    }
  };

  // ─── Question Authoring ───
  const handleAddQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!questionForm.questionText.trim()) {
      toast.error('Question text is required.');
      return;
    }

    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/courses/${courseId}/lessons/${selectedLessonIdx}/assessments/${activeAssessmentId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(questionForm)
      });

      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        setShowQuestionModal(false);
        setQuestionForm({
          questionText: '',
          type: 'mcq',
          options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
          correctAnswer: 'Option 1',
          correctAnswerIndex: 0,
          marks: 2,
          evaluationInstructions: ''
        });
        toast.success('Question added to assessment!');
        if (onUpdateCourse) onUpdateCourse(data.course);
      }
    } catch {
      toast.error('Failed to add question.');
    }
  };

  const handleDeleteQuestion = async (assessmentId, questionId) => {
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/courses/${courseId}/lessons/${selectedLessonIdx}/assessments/${assessmentId}/questions/${questionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        toast.success('Question deleted.');
        if (onUpdateCourse) onUpdateCourse(data.course);
      }
    } catch {
      toast.error('Failed to delete question.');
    }
  };

  // ─── Publish Assessment Toggle ───
  const handlePublishAssessmentConfirm = async () => {
    if (!publishConfirmAssessment) return;
    try {
      const token = localStorage.getItem('upskillr_token');
      const targetStatus = publishConfirmAssessment.status === 'published' ? 'draft' : 'published';

      const response = await fetch(`${API_BASE}/courses/${courseId}/lessons/${selectedLessonIdx}/assessments/${publishConfirmAssessment._id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });

      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        setPublishConfirmAssessment(null);
        toast.success(`Assessment is now ${targetStatus.toUpperCase()}!`);
        if (onUpdateCourse) onUpdateCourse(data.course);
      }
    } catch {
      toast.error('Failed to update assessment status.');
    }
  };

  // ─── Submissions & Auditable Grading ───
  const handleOpenSubmissions = async (assessment) => {
    setViewSubmissionsAssessment(assessment);
    setLoadingSubmissions(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/courses/${courseId}/assessments/${assessment._id}/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSubmissions(data.submissions || []);
      }
    } catch {
      toast.error('Failed to load assessment submissions.');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleStartGrading = (sub) => {
    setGradingSubmission(sub);
    setGradingAnswers(sub.answers.map(a => ({
      _id: a._id,
      questionId: a.questionId,
      questionText: a.questionText,
      questionType: a.questionType,
      studentAnswer: a.studentAnswer,
      correctAnswer: a.correctAnswer,
      marksAwarded: a.marksAwarded || 0,
      maxMarks: a.maxMarks || 1,
      feedback: a.feedback || ''
    })));
    setGradingFeedback(sub.generalFeedback || '');
    setGradingReason('Instructor evaluated submission');
  };

  const handleSaveGradeSubmit = async () => {
    if (!gradingSubmission) return;
    setSavingGrade(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/courses/submissions/${gradingSubmission._id}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          answers: gradingAnswers,
          generalFeedback: gradingFeedback,
          reason: gradingReason
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Grade saved & audit record logged!');
        setGradingSubmission(null);
        // Refresh submissions
        if (viewSubmissionsAssessment) {
          handleOpenSubmissions(viewSubmissionsAssessment);
        }
      } else {
        toast.error(data.message || 'Failed to save grade.');
      }
    } catch {
      toast.error('Error saving grade evaluation.');
    } finally {
      setSavingGrade(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Course Workspace...</div>;
  }

  if (!course) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Course not found.</p>
        <button type="button" className="btn btn-outline" onClick={onBack}>Back to Courses</button>
      </div>
    );
  }

  // Combined lessons list (flat or inside modules)
  const currentLessons = course.lessons?.length > 0
    ? course.lessons
    : (course.modules || []).flatMap(m => m.lessons);

  const activeLesson = currentLessons[selectedLessonIdx] || currentLessons[0] || null;

  return (
    <div className="course-manager-workspace">
      {/* Header */}
      <div className="manager-header">
        <button type="button" className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to My Courses</span>
        </button>

        <div className="manager-header-info">
          <div className="title-row">
            <h1 className="course-manager-title">{course.title}</h1>
            <span className={`status-badge ${course.status}`}>
              {course.status === 'published' ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="course-manager-meta">
            Category: <strong>{course.category}</strong> • Level: <strong>{course.skillLevel}</strong> • Learners: <strong>{course.learnersCount || 0}</strong>
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="manager-tabs-bar">
        <button
          type="button"
          className={`manager-tab ${activeTab === 'lessons' ? 'active' : ''}`}
          onClick={() => setActiveTab('lessons')}
        >
          <Video size={16} />
          <span>Lesson Content, Resources & Assessments</span>
        </button>
        <button
          type="button"
          className={`manager-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BookOpen size={16} />
          <span>Course Details & Syllabus</span>
        </button>
        <button
          type="button"
          className={`manager-tab ${activeTab === 'publish' ? 'active' : ''}`}
          onClick={() => setActiveTab('publish')}
        >
          <Globe size={16} />
          <span>Publish & Status</span>
        </button>
      </div>

      {/* Main Workspace Panel */}
      <div className="manager-panel-card">
        {/* ═══ TAB 1: LESSON CONTENT, RESOURCES & ASSESSMENTS ═══ */}
        {activeTab === 'lessons' && (
          <div className="lessons-workspace-layout" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem' }}>
            {/* Sidebar: Lesson Navigator */}
            <div className="lessons-sidebar-nav">
              <h3>Lessons ({currentLessons.length})</h3>
              {currentLessons.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No lessons added yet.</p>
              ) : (
                currentLessons.map((ls, idx) => (
                  <div
                    key={idx}
                    className={`subitem-row ${selectedLessonIdx === idx ? 'active-lesson-select' : ''}`}
                    onClick={() => setSelectedLessonIdx(idx)}
                    style={{
                      cursor: 'pointer',
                      border: selectedLessonIdx === idx ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      background: selectedLessonIdx === idx ? 'var(--bg-tertiary)' : 'transparent',
                      padding: '10px'
                    }}
                  >
                    <Video size={16} className="accent-green" />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <span className="subitem-title" style={{ fontSize: '0.85rem' }}>Lesson {idx + 1}: {ls.title}</span>
                      <span className="subitem-meta" style={{ fontSize: '0.75rem' }}>{ls.duration}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Lesson Detail */}
            {activeLesson ? (
              <div className="selected-lesson-detail">
                <div style={{ borderBottom: '1px solid var(--border-color)', pb: '1rem', marginBottom: '1.25rem' }}>
                  <h2 style={{ margin: 0 }}>Lesson {selectedLessonIdx + 1}: {activeLesson.title}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                    {activeLesson.description || 'Manage content notes, resources, and assessments for this lesson.'}
                  </p>
                </div>

                {/* Section A: Lesson Content */}
                <div className="add-subitem-card" style={{ marginBottom: '1.5rem' }}>
                  <h3><Video size={16} className="accent-green" /> Lesson Content</h3>
                  <div className="wizard-form-grid">
                    <div className="form-group span-2">
                      <label className="form-label">Video Stream Link</label>
                      <input type="text" className="form-input" readOnly value={activeLesson.videoUrl || 'No video URL provided'} />
                    </div>
                    <div className="form-group span-2">
                      <label className="form-label">Content Notes / Overview</label>
                      <textarea className="form-textarea" rows={2} readOnly value={activeLesson.content || activeLesson.description || 'No specific notes.'} />
                    </div>
                  </div>
                </div>

                {/* Section B: Resources */}
                <div className="add-subitem-card" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}><FileText size={16} className="accent-green" /> Lesson Resources</h3>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowResourceModal(true)}>
                      <Plus size={14} />
                      <span>Upload Resource</span>
                    </button>
                  </div>

                  <div className="subitem-list">
                    {(activeLesson.resources || []).length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '8px' }}>
                        No resources attached to this lesson. Click "Upload Resource" to upload study files (PDF, PPT, DOC, ZIP, Images, Videos).
                      </p>
                    ) : (
                      activeLesson.resources.map((res, rIdx) => (
                        <div key={res._id || rIdx} className="subitem-row">
                          <FileText size={18} className="accent-green" />
                          <div className="subitem-info">
                            <span className="subitem-title">{res.title}</span>
                            <span className="subitem-meta">
                              {res.fileType || 'File'} • {res.fileSize || '1.0 MB'} • {res.originalName || 'Download'}
                            </span>
                          </div>
                          <a href={res.fileUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ padding: '4px 8px', fontSize: '0.78rem' }}>
                            View/Download
                          </a>
                          <button type="button" className="delete-subitem-btn" onClick={() => handleDeleteResource(res._id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Section C: Assessments */}
                <div className="add-subitem-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0 }}><HelpCircle size={16} className="accent-green" /> Lesson Assessments</h3>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => { setEditingAssessment(null); setShowAssessmentModal(true); }}>
                      <Plus size={14} />
                      <span>Add Assessment</span>
                    </button>
                  </div>

                  <div className="subitem-list">
                    {(activeLesson.assessments || []).length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '8px' }}>
                        No assessments created for this lesson yet. Click "Add Assessment" to author a quiz with MCQ, True/False, or Short/Long answer questions.
                      </p>
                    ) : (
                      activeLesson.assessments.map((ass) => (
                        <div key={ass._id} className="subitem-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <HelpCircle size={18} className="accent-green" />
                              <div>
                                <strong style={{ fontSize: '0.92rem' }}>{ass.title}</strong>
                                <span className={`status-badge ${ass.status}`} style={{ marginLeft: '8px', fontSize: '0.7rem' }}>
                                  {ass.status ? ass.status.toUpperCase() : 'DRAFT'}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => setReviewAssessment(ass)}
                                title="Review Assessment details and questions"
                              >
                                <Eye size={13} /> Review
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => setPublishConfirmAssessment(ass)}
                              >
                                {ass.status === 'published' ? <><Lock size={13} /> Unpublish</> : <><Globe size={13} /> Publish</>}
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleOpenSubmissions(ass)}
                              >
                                <UserCheck size={13} /> View Submissions
                              </button>
                              <button
                                type="button"
                                className="delete-subitem-btn"
                                onClick={() => handleDeleteAssessment(ass._id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                            <span>Total Marks: <strong>{ass.totalMarks || 10}</strong></span>
                            <span>Passing Marks: <strong>{ass.passingMarks || 5}</strong></span>
                            <span>Time Limit: <strong>{ass.timeLimit || 30} mins</strong></span>
                            <span>Questions: <strong>{ass.questions?.length || 0}</strong></span>
                          </div>

                          {/* Questions authoring list */}
                          <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Questions ({ass.questions?.length || 0})</span>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                                onClick={() => { setActiveAssessmentId(ass._id); setShowQuestionModal(true); }}
                              >
                                <Plus size={12} /> Add Question
                              </button>
                            </div>

                            {(ass.questions || []).length === 0 ? (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>No questions added yet. Click "+ Add Question" to add MCQ, True/False, or Short/Long answer questions.</span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {ass.questions.map((q, qIdx) => (
                                  <div key={q._id || qIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '4px', fontSize: '0.82rem' }}>
                                    <span>
                                      <strong>Q{qIdx + 1}.</strong> {q.questionText} <span style={{ color: 'var(--color-primary)', textTransform: 'uppercase', fontSize: '0.7rem' }}>({q.type})</span>
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{q.marks || 1} mark(s)</span>
                                      <button type="button" className="delete-subitem-btn" onClick={() => handleDeleteQuestion(ass._id, q._id)}>
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p>No lesson selected.</p>
            )}
          </div>
        )}

        {/* ═══ TAB 2: COURSE DETAILS & SYLLABUS ═══ */}
        {activeTab === 'overview' && (
          <form className="manager-form" onSubmit={handleSaveOverview}>
            <h2>Course Details & Syllabus Settings</h2>
            <div className="wizard-form-grid">
              <div className="form-group span-2">
                <label className="form-label">Course Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={editInfo.title}
                  onChange={(e) => setEditInfo({ ...editInfo, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group span-2">
                <label className="form-label">Short Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={editInfo.shortDescription}
                  onChange={(e) => setEditInfo({ ...editInfo, shortDescription: e.target.value })}
                />
              </div>

              <div className="form-group span-2">
                <label className="form-label">Full Description</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={editInfo.description}
                  onChange={(e) => setEditInfo({ ...editInfo, description: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  className="form-input"
                  value={editInfo.category}
                  onChange={(e) => setEditInfo({ ...editInfo, category: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Skill Level</label>
                <select
                  className="form-select"
                  value={editInfo.skillLevel}
                  onChange={(e) => setEditInfo({ ...editInfo, skillLevel: e.target.value })}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div className="form-group span-2">
                <label className="form-label">Prerequisites</label>
                <input
                  type="text"
                  className="form-input"
                  value={editInfo.prerequisites}
                  onChange={(e) => setEditInfo({ ...editInfo, prerequisites: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '1rem' }}>
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Overview Information'}</span>
            </button>
          </form>
        )}

        {/* ═══ TAB 3: PUBLISH & STATUS ═══ */}
        {activeTab === 'publish' && (
          <div className="manager-sub-section">
            <h2>Publishing Settings</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Publishing your course makes it visible to learners browsing courses on UpSkillr.
            </p>

            <div className="publish-status-box">
              <div className="status-box-info">
                <h3>Current Status: <span className="accent-green" style={{ textTransform: 'capitalize' }}>{course.status}</span></h3>
                <p>
                  {course.status === 'published'
                    ? 'Your course is live and learners can enrol in it.'
                    : 'Your course is currently a draft and hidden from learners.'}
                </p>
              </div>

              <button
                type="button"
                className={`btn ${course.status === 'published' ? 'btn-outline' : 'btn-primary'}`}
                onClick={async () => {
                  await onPublishToggle(course._id, course.status);
                  fetchCourseDetails();
                }}
              >
                {course.status === 'published' ? (
                  <><Lock size={16} /><span>Unpublish (Move to Draft)</span></>
                ) : (
                  <><Globe size={16} /><span>Publish Course Live</span></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODAL 1: Upload Resource Modal ═══ */}
      {showResourceModal && (
        <div className="modal-backdrop-overlay">
          <div className="modal-dialog-box">
            <h3>Upload Lesson Resource</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Upload study files from your device (PDF, PPT, DOC, XLS, ZIP, Images, Videos).
            </p>
            <form onSubmit={handleUploadResourceSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Resource Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Python Lecture Notes.pdf"
                  value={resourceForm.title}
                  onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Select File *</label>
                <input
                  type="file"
                  className="form-input"
                  onChange={(e) => setResourceForm({ ...resourceForm, file: e.target.files[0] })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Optional Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Notes for this lesson resource..."
                  value={resourceForm.description}
                  onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowResourceModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploadingResource}>
                  {uploadingResource ? 'Uploading...' : 'Upload Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL 2: Create / Edit Assessment Modal ═══ */}
      {showAssessmentModal && (
        <div className="modal-backdrop-overlay">
          <div className="modal-dialog-box" style={{ maxWidth: '520px' }}>
            <h3>{editingAssessment ? 'Edit Assessment' : 'Create Assessment'}</h3>
            <form onSubmit={handleSaveAssessment}>
              <div className="wizard-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group span-2">
                  <label className="form-label">Assessment Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Python Basics Quiz"
                    value={assessmentForm.title}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group span-2">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Test your understanding of Python basics"
                    value={assessmentForm.description}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, description: e.target.value })}
                  />
                </div>

                <div className="form-group span-2">
                  <label className="form-label">Instructions</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Answer all questions carefully..."
                    value={assessmentForm.instructions}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, instructions: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assessment Type</label>
                  <select
                    className="form-select"
                    value={assessmentForm.type}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, type: e.target.value })}
                  >
                    <option value="Quiz">Quiz</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Exam">Exam</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Total Marks</label>
                  <input
                    type="number"
                    className="form-input"
                    value={assessmentForm.totalMarks}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, totalMarks: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Passing Marks</label>
                  <input
                    type="number"
                    className="form-input"
                    value={assessmentForm.passingMarks}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, passingMarks: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Time Limit (mins)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={assessmentForm.timeLimit}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, timeLimit: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Attempts Allowed</label>
                  <input
                    type="number"
                    className="form-input"
                    value={assessmentForm.attemptsAllowed}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, attemptsAllowed: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date (optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={assessmentForm.dueDate}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAssessmentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL 3: Add Question Modal ═══ */}
      {showQuestionModal && (
        <div className="modal-backdrop-overlay">
          <div className="modal-dialog-box" style={{ maxWidth: '520px' }}>
            <h3>Add Assessment Question</h3>
            <form onSubmit={handleAddQuestionSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Question Text *</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. What is the output of print(2 + 3)?"
                  value={questionForm.questionText}
                  onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Question Type</label>
                <select
                  className="form-select"
                  value={questionForm.type}
                  onChange={(e) => {
                    const t = e.target.value;
                    let opts = questionForm.options;
                    let corr = questionForm.correctAnswer;
                    if (t === 'true_false') {
                      opts = ['True', 'False'];
                      corr = 'True';
                    } else if (t === 'short_answer' || t === 'long_answer') {
                      opts = [];
                      corr = '';
                    }
                    setQuestionForm({ ...questionForm, type: t, options: opts, correctAnswer: corr });
                  }}
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short Answer</option>
                  <option value="long_answer">Long Answer</option>
                </select>
              </div>

              {/* MCQ Options */}
              {questionForm.type === 'mcq' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Options & Correct Answer</label>
                  {questionForm.options.map((opt, oIdx) => (
                    <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={questionForm.correctAnswer === opt}
                        onChange={() => setQuestionForm({ ...questionForm, correctAnswer: opt, correctAnswerIndex: oIdx })}
                      />
                      <input
                        type="text"
                        className="form-input"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...questionForm.options];
                          newOpts[oIdx] = e.target.value;
                          setQuestionForm({ ...questionForm, options: newOpts });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* True/False Options */}
              {questionForm.type === 'true_false' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Correct Answer</label>
                  <select
                    className="form-select"
                    value={questionForm.correctAnswer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                  >
                    <option value="True">True</option>
                    <option value="False">False</option>
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Marks</label>
                <input
                  type="number"
                  className="form-input"
                  value={questionForm.marks}
                  onChange={(e) => setQuestionForm({ ...questionForm, marks: Number(e.target.value) })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowQuestionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL 4: Review Assessment Before Publishing ═══ */}
      {reviewAssessment && (
        <div className="modal-backdrop-overlay">
          <div className="modal-dialog-box" style={{ maxWidth: '580px' }}>
            <h3>Assessment Review: {reviewAssessment.title}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review assessment details and questions before publishing to learners.</p>

            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem' }}>
              <p><strong>Instructions:</strong> {reviewAssessment.instructions || 'N/A'}</p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '6px' }}>
                <span>Type: <strong>{reviewAssessment.type}</strong></span>
                <span>Total Marks: <strong>{reviewAssessment.totalMarks}</strong></span>
                <span>Passing Marks: <strong>{reviewAssessment.passingMarks}</strong></span>
                <span>Time: <strong>{reviewAssessment.timeLimit} mins</strong></span>
              </div>
            </div>

            <h4>Questions Checklist ({reviewAssessment.questions?.length || 0})</h4>
            <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.25rem' }}>
              {(reviewAssessment.questions || []).map((q, idx) => (
                <div key={idx} style={{ background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <strong>Q{idx + 1}: {q.questionText}</strong> ({q.type.toUpperCase()}) — Marks: {q.marks}
                  {q.type === 'mcq' && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Options: {q.options?.join(', ')} | Correct: <strong>{q.correctAnswer}</strong></div>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setReviewAssessment(null)}>
                Close Review
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const target = reviewAssessment;
                  setReviewAssessment(null);
                  setPublishConfirmAssessment(target);
                }}
              >
                Proceed to Publish Toggle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL 5: Publish Assessment Confirmation ═══ */}
      {publishConfirmAssessment && (
        <div className="modal-backdrop-overlay">
          <div className="modal-dialog-box">
            <h3>{publishConfirmAssessment.status === 'published' ? 'Unpublish Assessment?' : 'Publish Assessment?'}</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {publishConfirmAssessment.status === 'published'
                ? `Moving "${publishConfirmAssessment.title}" back to DRAFT will hide it from learners.`
                : `Publishing "${publishConfirmAssessment.title}" will make it available to all enrolled learners in this course.`}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setPublishConfirmAssessment(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handlePublishAssessmentConfirm}>
                Confirm Change Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL 6: View Submissions & Auditable Grading Modal ═══ */}
      {viewSubmissionsAssessment && (
        <div className="modal-backdrop-overlay">
          <div className="modal-dialog-box" style={{ maxWidth: '680px' }}>
            <h3>Submissions: {viewSubmissionsAssessment.title}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Review learner attempts, assign manual marks & feedback, and log auditable grade updates.
            </p>

            {loadingSubmissions ? (
              <p>Loading student submissions...</p>
            ) : submissions.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', marginBottom: '1rem' }}>
                <p>No student submissions received for this assessment yet.</p>
              </div>
            ) : (
              <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '1.25rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Student</th>
                      <th style={{ padding: '8px' }}>Submitted</th>
                      <th style={{ padding: '8px' }}>Score</th>
                      <th style={{ padding: '8px' }}>Status</th>
                      <th style={{ padding: '8px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => (
                      <tr key={sub._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px' }}>{sub.learnerName}</td>
                        <td style={{ padding: '8px' }}>{new Date(sub.submittedAt).toLocaleDateString()}</td>
                        <td style={{ padding: '8px' }}><strong>{sub.totalScore} / {sub.maxScore}</strong> ({sub.percentage}%)</td>
                        <td style={{ padding: '8px' }}>
                          <span className={`status-badge ${sub.status === 'graded' ? 'published' : 'draft'}`}>
                            {sub.status === 'graded' ? 'Graded' : 'Pending Review'}
                          </span>
                        </td>
                        <td style={{ padding: '8px' }}>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => handleStartGrading(sub)}>
                            Grade / Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grading Drawer for selected submission */}
            {gradingSubmission && (
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-primary)' }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Reviewing {gradingSubmission.learnerName}'s Submission</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {gradingAnswers.map((ans, aIdx) => (
                    <div key={aIdx} style={{ background: 'var(--bg-primary)', padding: '8px 10px', borderRadius: '6px', fontSize: '0.84rem' }}>
                      <strong>Q{aIdx + 1}: {ans.questionText}</strong>
                      <div style={{ margin: '4px 0', color: 'var(--text-primary)' }}>
                        Student Answer: <span style={{ fontWeight: 600 }}>{String(ans.studentAnswer || 'N/A')}</span>
                      </div>
                      {ans.correctAnswer && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Correct Answer: {String(ans.correctAnswer)}</div>}

                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '6px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Marks:
                          <input
                            type="number"
                            style={{ width: '60px', padding: '2px 4px' }}
                            value={ans.marksAwarded}
                            onChange={(e) => {
                              const updated = [...gradingAnswers];
                              updated[aIdx].marksAwarded = Number(e.target.value);
                              setGradingAnswers(updated);
                            }}
                          />
                          / {ans.maxMarks}
                        </label>

                        <input
                          type="text"
                          placeholder="Question feedback..."
                          className="form-input"
                          style={{ fontSize: '0.78rem', padding: '2px 6px', flex: 1 }}
                          value={ans.feedback}
                          onChange={(e) => {
                            const updated = [...gradingAnswers];
                            updated[aIdx].feedback = e.target.value;
                            setGradingAnswers(updated);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Instructor General Feedback</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Good explanation! Add more detail to question 2."
                    value={gradingFeedback}
                    onChange={(e) => setGradingFeedback(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Audit Reason for Grade Update</label>
                  <input
                    type="text"
                    className="form-input"
                    value={gradingReason}
                    onChange={(e) => setGradingReason(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setGradingSubmission(null)}>
                    Cancel Grading
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveGradeSubmit} disabled={savingGrade}>
                    {savingGrade ? 'Saving Grade...' : 'Save Grade (Append Audit Record)'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setViewSubmissionsAssessment(null)}>
                Close Submissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
