import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Video,
  FileText,
  HelpCircle,
  Eye,
  Globe,
  Lock,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Users,
  AlertTriangle
} from 'lucide-react';
import './CourseManager.css';
import { useToast } from '../../../../context/ToastContext';

export const CourseManager = ({ courseId, onBack, onUpdateCourse, onPublishToggle }) => {
  const { toast } = useToast();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'lessons', 'resources', 'assessments', 'publish'
  const [saving, setSaving] = useState(false);

  // Edit Course Info state
  const [editInfo, setEditInfo] = useState({
    title: '',
    description: '',
    category: '',
    skillLevel: 'Beginner',
    thumbnail: '',
    price: 0
  });

  // Lesson form
  const [newLesson, setNewLesson] = useState({ title: '', duration: '10 min', videoUrl: '', description: '' });

  // Resource form
  const [newResource, setNewResource] = useState({ title: '', fileUrl: '', fileType: 'PDF Document' });

  // Assessment form
  const [newAssessment, setNewAssessment] = useState({ title: '', questionText: '', option0: '', option1: '' });

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/courses/${courseId}`);
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        setEditInfo({
          title: data.course.title,
          description: data.course.description,
          category: data.course.category,
          skillLevel: data.course.skillLevel,
          thumbnail: data.course.thumbnail,
          price: data.course.price
        });
      }
    } catch (err) {
      console.error('Failed to fetch course details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`http://localhost:5000/api/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...editInfo,
          lastUpdatedAt: course?.updatedAt
        })
      });
      const data = await response.json();
      if (response.status === 409) {
        toast.error(data.message || 'This course was updated elsewhere. Another session has saved newer changes. Please review the latest version before saving again.');
        return;
      }
      if (data.success) {
        setCourse(data.course);
        toast.success('Course information saved successfully!');
        if (onUpdateCourse) {
          onUpdateCourse(data.course);
        }
      }
    } catch (err) {
      toast.error('Failed to update course.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    if (!newLesson.title.trim()) return;
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`http://localhost:5000/api/courses/${courseId}/lessons`, {
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
        setNewLesson({ title: '', duration: '10 min', videoUrl: '', description: '' });
        toast.success('Lesson added successfully!');
        if (onUpdateCourse) {
          onUpdateCourse(data.course);
        }
      }
    } catch (err) {
      toast.error('Failed to add lesson.');
    }
  };

  const handleDeleteLesson = async (idx) => {
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`http://localhost:5000/api/courses/${courseId}/lessons/${idx}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        toast.success('Lesson deleted successfully!');
        if (onUpdateCourse) {
          onUpdateCourse(data.course);
        }
      }
    } catch (err) {
      toast.error('Failed to delete lesson.');
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();
    if (!newResource.title.trim()) return;
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`http://localhost:5000/api/courses/${courseId}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...newResource, fileUrl: newResource.fileUrl || '#' })
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        setNewResource({ title: '', fileUrl: '', fileType: 'PDF Document' });
        toast.success('Resource added successfully!');
        if (onUpdateCourse) {
          onUpdateCourse(data.course);
        }
      }
    } catch (err) {
      toast.error('Failed to add resource.');
    }
  };

  const handleDeleteResource = async (idx) => {
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`http://localhost:5000/api/courses/${courseId}/resources/${idx}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        toast.success('Resource deleted successfully!');
        if (onUpdateCourse) {
          onUpdateCourse(data.course);
        }
      }
    } catch (err) {
      toast.error('Failed to delete resource.');
    }
  };

  const handleAddAssessment = async (e) => {
    e.preventDefault();
    if (!newAssessment.title.trim()) return;
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`http://localhost:5000/api/courses/${courseId}/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newAssessment.title,
          instructions: 'Complete all questions.',
          passingScore: 70,
          questions: [
            {
              questionText: newAssessment.questionText || 'Default Question',
              options: [newAssessment.option0 || 'True', newAssessment.option1 || 'False'],
              correctAnswerIndex: 0
            }
          ]
        })
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        setNewAssessment({ title: '', questionText: '', option0: '', option1: '' });
        toast.success('Assessment added successfully!');
        if (onUpdateCourse) {
          onUpdateCourse(data.course);
        }
      }
    } catch (err) {
      toast.error('Failed to add assessment.');
    }
  };

  const handleDeleteAssessment = async (idx) => {
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`http://localhost:5000/api/courses/${courseId}/assessments/${idx}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCourse(data.course);
        toast.success('Assessment deleted successfully!');
        if (onUpdateCourse) {
          onUpdateCourse(data.course);
        }
      }
    } catch (err) {
      toast.error('Failed to delete assessment.');
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

      {/* Tabs */}
      <div className="manager-tabs-bar">
        <button
          type="button"
          className={`manager-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BookOpen size={16} />
          <span>Course Overview</span>
        </button>
        <button
          type="button"
          className={`manager-tab ${activeTab === 'lessons' ? 'active' : ''}`}
          onClick={() => setActiveTab('lessons')}
        >
          <Video size={16} />
          <span>Lessons ({course.lessons?.length || 0})</span>
        </button>
        <button
          type="button"
          className={`manager-tab ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          <FileText size={16} />
          <span>Resources ({course.resources?.length || 0})</span>
        </button>
        <button
          type="button"
          className={`manager-tab ${activeTab === 'assessments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assessments')}
        >
          <HelpCircle size={16} />
          <span>Assessments ({course.assessments?.length || 0})</span>
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

      {/* Tab Panels */}
      <div className="manager-panel-card">
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <form className="manager-form" onSubmit={handleSaveInfo}>
            <h2>Edit Course Information</h2>
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
                <label className="form-label">Description</label>
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
                  <option value="All Levels">All Levels</option>
                </select>
              </div>

              <div className="form-group span-2">
                <label className="form-label">Thumbnail URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={editInfo.thumbnail}
                  onChange={(e) => setEditInfo({ ...editInfo, thumbnail: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: '1rem' }}>
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Information'}</span>
            </button>
          </form>
        )}

        {/* LESSONS */}
        {activeTab === 'lessons' && (
          <div className="manager-sub-section">
            <h2>Course Lessons Manager</h2>
            <div className="add-subitem-card">
              <h3>Add New Lesson</h3>
              <div className="wizard-form-grid">
                <div className="form-group span-2">
                  <label className="form-label">Lesson Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Lesson title..."
                    value={newLesson.title}
                    onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Video Link</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://..."
                    value={newLesson.videoUrl}
                    onChange={(e) => setNewLesson({ ...newLesson, videoUrl: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="10 min"
                    value={newLesson.duration}
                    onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
                  />
                </div>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAddLesson} style={{ marginTop: '0.75rem' }}>
                <Plus size={16} />
                <span>Add Lesson</span>
              </button>
            </div>

            <div className="subitem-list" style={{ marginTop: '1rem' }}>
              <h3>Current Lessons ({course.lessons?.length || 0})</h3>
              {course.lessons?.map((ls, idx) => (
                <div key={idx} className="subitem-row">
                  <Video size={18} className="accent-green" />
                  <div className="subitem-info">
                    <span className="subitem-title">Lesson {idx + 1}: {ls.title}</span>
                    <span className="subitem-meta">{ls.duration}</span>
                  </div>
                  <button type="button" className="delete-subitem-btn" onClick={() => handleDeleteLesson(idx)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESOURCES */}
        {activeTab === 'resources' && (
          <div className="manager-sub-section">
            <h2>Course Resources Manager</h2>
            <div className="add-subitem-card">
              <h3>Add Study Resource</h3>
              <div className="wizard-form-grid">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Resource title"
                    value={newResource.title}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">File Link</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://..."
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

            <div className="subitem-list" style={{ marginTop: '1rem' }}>
              <h3>Attached Resources ({course.resources?.length || 0})</h3>
              {course.resources?.map((res, idx) => (
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
              ))}
            </div>
          </div>
        )}

        {/* ASSESSMENTS */}
        {activeTab === 'assessments' && (
          <div className="manager-sub-section">
            <h2>Assessments Manager</h2>
            <div className="add-subitem-card">
              <h3>Add Quiz Assessment</h3>
              <div className="wizard-form-grid">
                <div className="form-group span-2">
                  <label className="form-label">Assessment Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Quiz title"
                    value={newAssessment.title}
                    onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })}
                  />
                </div>
                <div className="form-group span-2">
                  <label className="form-label">Question Text</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter question"
                    value={newAssessment.questionText}
                    onChange={(e) => setNewAssessment({ ...newAssessment, questionText: e.target.value })}
                  />
                </div>
              </div>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleAddAssessment} style={{ marginTop: '0.75rem' }}>
                <Plus size={16} />
                <span>Add Assessment</span>
              </button>
            </div>

            <div className="subitem-list" style={{ marginTop: '1rem' }}>
              <h3>Created Assessments ({course.assessments?.length || 0})</h3>
              {course.assessments?.map((ass, idx) => (
                <div key={idx} className="subitem-row">
                  <HelpCircle size={18} className="accent-green" />
                  <div className="subitem-info">
                    <span className="subitem-title">{ass.title}</span>
                    <span className="subitem-meta">{ass.questions?.length || 0} Questions</span>
                  </div>
                  <button type="button" className="delete-subitem-btn" onClick={() => handleDeleteAssessment(idx)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PUBLISH */}
        {activeTab === 'publish' && (
          <div className="manager-sub-section">
            <h2>Publishing Settings</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Publishing your course makes it visible to learners browsing courses on UpSkillR.
            </p>

            {/* Zero-lesson publish gate */}
            {course.lessons.length === 0 && (
              <div className="publish-lesson-warning">
                <AlertTriangle size={18} />
                <div>
                  <strong>Cannot publish yet</strong>
                  <p>Add at least one lesson before publishing this course. Use the Lessons tab to add content.</p>
                </div>
              </div>
            )}

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
                disabled={course.lessons.length === 0 && course.status !== 'published'}
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
    </div>
  );
};
