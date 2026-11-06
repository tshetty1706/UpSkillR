import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Layers,
  BookOpen,
  Sparkles,
  Globe,
  Lock,
  BarChart3,
  Edit3,
  Save,
  X,
  Upload,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Clock,
  Users,
  Award,
  FileText,
  RefreshCw,
  Trash2,
  Zap,
  Plus,
  Bell,
  Eye,
  MessageSquare,
  UserCheck,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { CertificatePreviewModal } from '../../../common/CertificatePreviewModal';
import './CourseManager.css';
import { useToast } from '../../../../context/ToastContext';
import { DynamicTagInput } from '../courseCreation/Common/DynamicTagInput';
import { DynamicListInput } from '../courseCreation/Common/DynamicListInput';
import { CourseAnnouncements } from './CourseAnnouncements/CourseAnnouncements';
import { CourseModules } from './CourseModules/CourseModules';
import { CourseThumbnail } from '../../../common/CourseThumbnail';
import { API_BASE } from '../../../../config/api';

const CATEGORY_OPTIONS = [
  'Web Development',
  'Cloud Computing',
  'Data Science & Analytics',
  'AI & Machine Learning',
  'Mobile App Development',
  'DevOps & Site Reliability',
  'Cybersecurity & Ethical Hacking',
  'UI/UX Design',
  'Database Administration',
  'Software Architecture & System Design'
];

const SKILL_LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'];
const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Mandarin', 'Portuguese', 'Japanese', 'Other'];

export const CourseManager = ({
  courseId,
  user = null,
  onBack,
  onUpdateCourse,
  onPublishToggle,
  onNavigate
}) => {
  const { toast } = useToast();

  // Active Workspace Tab: 'modules' | 'details' | 'overview' | 'publish' | 'analytics'
  const [activeTab, setActiveTab] = useState('modules');

  // Course Data
  const [course, setCourse] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Tab 2: Course Details Edit State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    title: '',
    category: '',
    skillLevel: 'Beginner',
    language: 'English',
    shortDescription: '',
    tags: [],
    thumbnail: ''
  });
  const [detailsThumbnailFile, setDetailsThumbnailFile] = useState(null);
  const [detailsThumbnailPreview, setDetailsThumbnailPreview] = useState('');
  const detailsFileRef = useRef(null);

  // Tab 3: Course Overview Edit & Preview State
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [savingOverview, setSavingOverview] = useState(false);
  const [overviewForm, setOverviewForm] = useState({
    fullDescription: '',
    prerequisites: [],
    learningOutcomes: [],
    skills: [],
    techStack: [],
    certificate: true,
    instructorMessage: '',
    faqs: []
  });

  const [showCertPreview, setShowCertPreview] = useState(false);
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [certStats, setCertStats] = useState({ totalIssued: 0, recipients: [], certificateEnabled: false });

  const storedUser = JSON.parse(sessionStorage.getItem('upskillr_user') || '{}');
  const [instructorInfo, setInstructorInfo] = useState({
    fullName: storedUser.fullName || 'UpSkillr Instructor',
    designation: storedUser.designation || 'Course Instructor'
  });

  const fetchCertificateStats = async (targetId) => {
    const cId = targetId || courseId || course?._id;
    if (!cId) return;
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/certificates/course/${cId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        setCertStats({
          totalIssued: data.totalIssued || 0,
          recipients: data.recipients || [],
          certificateEnabled: data.certificateEnabled
        });
      }
    } catch (e) {
      console.warn('Could not load course certificate stats:', e.message);
    }
  };

  const handlePreviewOverview = () => {
    const targetCourseId = courseId || course?._id;
    if (targetCourseId) {
      const path = `/courses/${targetCourseId}`;
      window.history.pushState({}, '', path);
      window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
    }
  };

  // FAQ addition in edit overview
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [activeFaqAccordion, setActiveFaqAccordion] = useState(null);

  useEffect(() => {
    if (courseId) {
      fetchWorkspaceData();
    }
  }, [courseId]);

  const fetchWorkspaceData = async () => {
    setLoading(true);
    setAccessDenied(false);
    setErrorMessage('');
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch Course Core Details
      const courseRes = await fetch(`${API_BASE}/courses/${courseId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        }
      });

      if (courseRes.status === 403) {
        setAccessDenied(true);
        setErrorMessage('You do not have permission to view or manage this course.');
        setLoading(false);
        return;
      }

      if (courseRes.status === 404) {
        setAccessDenied(true);
        setErrorMessage('Course not found or has been deleted.');
        setLoading(false);
        return;
      }

      const courseData = await courseRes.json();
      if (!courseData.success || !courseData.course) {
        setAccessDenied(true);
        setErrorMessage(courseData.message || 'Failed to load course details.');
        setLoading(false);
        return;
      }

      const fetchedCourse = courseData.course;
      setCourse(fetchedCourse);

      // Populate Details Form
      setDetailsForm({
        title: fetchedCourse.title || '',
        category: fetchedCourse.category || '',
        skillLevel: fetchedCourse.skillLevel || 'Beginner',
        language: fetchedCourse.language || 'English',
        shortDescription: fetchedCourse.shortDescription || fetchedCourse.description || '',
        tags: Array.isArray(fetchedCourse.tags) ? fetchedCourse.tags : [],
        thumbnail: fetchedCourse.thumbnail || ''
      });
      setDetailsThumbnailPreview(fetchedCourse.thumbnail || '');

      // 2. Fetch Structured Course Overview
      const overviewRes = await fetch(`${API_BASE}/courses/${courseId}/overview`, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeader
        }
      });

      const overviewData = await overviewRes.json().catch(() => null);
      if (overviewData && overviewData.success && overviewData.overview) {
        const fetchedOverview = overviewData.overview;
        setOverview(fetchedOverview);
        setOverviewForm({
          fullDescription: fetchedOverview.fullDescription || fetchedCourse.description || '',
          prerequisites: Array.isArray(fetchedOverview.prerequisites) ? fetchedOverview.prerequisites : [],
          learningOutcomes: Array.isArray(fetchedOverview.learningOutcomes) ? fetchedOverview.learningOutcomes : [],
          skills: Array.isArray(fetchedOverview.skills) ? fetchedOverview.skills : (fetchedCourse.skills || []),
          techStack: Array.isArray(fetchedOverview.techStack) ? fetchedOverview.techStack : [],
          certificate: fetchedOverview.certificate !== undefined ? fetchedOverview.certificate : true,
          instructorMessage: fetchedOverview.instructorMessage || '',
          faqs: Array.isArray(fetchedOverview.faqs) ? fetchedOverview.faqs : []
        });
      } else {
        // Fallback default overview structure
        const fallbackOverview = {
          courseId: fetchedCourse._id,
          fullDescription: fetchedCourse.description || '',
          prerequisites: Array.isArray(fetchedCourse.prerequisites) ? fetchedCourse.prerequisites : [],
          learningOutcomes: Array.isArray(fetchedCourse.whatYouWillLearn) ? fetchedCourse.whatYouWillLearn : [],
          skills: Array.isArray(fetchedCourse.skills) ? fetchedCourse.skills : [],
          techStack: [],
          certificate: true,
          instructorMessage: '',
          faqs: []
        };
        setOverview(fallbackOverview);
        setOverviewForm(fallbackOverview);
      }
      fetchCertificateStats(fetchedCourse._id || courseId);
    } catch (err) {
      console.error('Failed to load course workspace', err);
      setAccessDenied(true);
      setErrorMessage('Network error while connecting to course workspace.');
    } finally {
      setLoading(false);
    }
  };

  // ─── TAB 2: Save Course Details ───
  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!detailsForm.title.trim()) {
      toast.error('Course title is required.');
      return;
    }
    if (!detailsForm.category.trim()) {
      toast.error('Course category is required.');
      return;
    }
    if (!detailsForm.shortDescription.trim()) {
      toast.error('Short description is required.');
      return;
    }

    setSavingDetails(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');

      // 1. If new thumbnail file was picked, upload it first
      let updatedThumbnailUrl = detailsForm.thumbnail;
      if (detailsThumbnailFile) {
        const thumbData = new FormData();
        thumbData.append('thumbnail', detailsThumbnailFile);
        const thumbRes = await fetch(`${API_BASE}/courses/${courseId}/thumbnail`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: thumbData
        });
        const thumbJson = await thumbRes.json();
        if (thumbJson.success && thumbJson.thumbnail) {
          updatedThumbnailUrl = thumbJson.thumbnail;
        }
      }

      // 2. Save Core Basic Info
      const res = await fetch(`${API_BASE}/courses/${courseId}/basic-info`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: detailsForm.title.trim(),
          category: detailsForm.category.trim(),
          skillLevel: detailsForm.skillLevel,
          language: detailsForm.language,
          shortDescription: detailsForm.shortDescription.trim(),
          tags: detailsForm.tags
        })
      });

      const data = await res.json();
      if (data.success && data.course) {
        const mergedCourse = {
          ...data.course,
          thumbnail: updatedThumbnailUrl || data.course.thumbnail
        };
        setCourse(mergedCourse);
        setDetailsForm((prev) => ({ ...prev, thumbnail: mergedCourse.thumbnail }));
        setDetailsThumbnailPreview(mergedCourse.thumbnail || '');
        setDetailsThumbnailFile(null);
        setIsEditingDetails(false);
        toast.success('Course details updated successfully!');
        if (onUpdateCourse) onUpdateCourse(mergedCourse);
      } else {
        toast.error(data.message || 'Failed to update course details.');
      }
    } catch (err) {
      toast.error('Error saving course details. Please try again.');
    } finally {
      setSavingDetails(false);
    }
  };

  // ─── TAB 3: Save Course Overview ───
  const handleSaveOverview = async (e) => {
    e.preventDefault();
    if (!overviewForm.fullDescription.trim()) {
      toast.error('Full course description is required.');
      return;
    }

    setSavingOverview(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const res = await fetch(`${API_BASE}/courses/${courseId}/overview`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(overviewForm)
      });

      const data = await res.json();
      if (data.success && data.overview) {
        setOverview(data.overview);
        setIsEditingOverview(false);
        toast.success('Course overview updated successfully!');
        // Update parent course record if skills or outcomes were updated
        if (onUpdateCourse && course) {
          onUpdateCourse({
            ...course,
            skills: data.overview.skills || course.skills,
            whatYouWillLearn: data.overview.learningOutcomes || course.whatYouWillLearn
          });
        }
      } else {
        toast.error(data.message || 'Failed to update overview.');
      }
    } catch (err) {
      toast.error('Error saving course overview. Please try again.');
    } finally {
      setSavingOverview(false);
    }
  };

  // FAQ management helper in Edit Overview
  const handleAddFaq = () => {
    if (!newFaqQ.trim() || !newFaqA.trim()) {
      toast.error('Please enter both a question and answer for the FAQ.');
      return;
    }
    setOverviewForm({
      ...overviewForm,
      faqs: [...(overviewForm.faqs || []), { question: newFaqQ.trim(), answer: newFaqA.trim() }]
    });
    setNewFaqQ('');
    setNewFaqA('');
  };

  const handleRemoveFaq = (index) => {
    setOverviewForm({
      ...overviewForm,
      faqs: (overviewForm.faqs || []).filter((_, idx) => idx !== index)
    });
  };

  // Smart Description Formatter for View Mode
  const renderFormattedDescription = (text) => {
    if (!text || !text.trim()) {
      return <p className="desc-empty-text">No detailed description provided yet.</p>;
    }

    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

    return paragraphs.map((block, pIdx) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const isBulletList = lines.length > 1 && lines.every((l) => /^[-*•✓]\s+|^\d+\.\s+/.test(l));

      if (isBulletList) {
        return (
          <ul key={pIdx} className="workspace-desc-bullet-list">
            {lines.map((line, lIdx) => {
              const cleanText = line.replace(/^[-*•✓]\s+|^\d+\.\s+/, '');
              return (
                <li key={lIdx} className="workspace-desc-bullet-item">
                  <span className="workspace-bullet-check">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>{cleanText}</span>
                </li>
              );
            })}
          </ul>
        );
      }

      return (
        <p key={pIdx} className={pIdx === 0 ? 'workspace-desc-lead' : 'workspace-desc-p'}>
          {block}
        </p>
      );
    });
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="course-workspace-loading">
        <div className="workspace-loading-spinner" />
        <p>Loading course workspace...</p>
      </div>
    );
  }

  // Security Access Denied Screen (Strictly enforces ownership)
  if (accessDenied || !course) {
    return (
      <div className="course-workspace-access-denied">
        <div className="denied-icon-wrap">
          <ShieldAlert size={48} />
        </div>
        <h2>Access Denied</h2>
        <p>{errorMessage || 'You do not have permission to view or manage this course.'}</p>
        <button type="button" className="btn-workspace-return" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Return to My Courses</span>
        </button>
      </div>
    );
  }

  const wordCount = overview?.fullDescription
    ? overview.fullDescription.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 160));

  const currentPreviewOverview = isEditingOverview
    ? {
      ...overviewForm,
      fullDescription: overviewForm.fullDescription || '',
      learningOutcomes: overviewForm.learningOutcomes || [],
      skills: overviewForm.skills || [],
      prerequisites: overviewForm.prerequisites || [],
      techStack: overviewForm.techStack || [],
      certificate: overviewForm.certificate !== false,
      instructorMessage: overviewForm.instructorMessage || '',
      faqs: overviewForm.faqs || []
    }
    : (overview || {
      fullDescription: course?.shortDescription || course?.description || '',
      learningOutcomes: course?.whatYouWillLearn || [],
      skills: course?.tags || [],
      prerequisites: course?.prerequisites || [],
      techStack: course?.techStack || [],
      certificate: course?.certificate !== false,
      instructorMessage: '',
      faqs: []
    });

  return (
    <div className="course-workspace-container">
      {/* ═══ WORKSPACE TOP HEADER ═══ */}
      <header className="workspace-top-header">
        <div className="header-nav-left">
          <button type="button" className="btn-back-courses" onClick={onBack} title="Back to Courses">
            <ArrowLeft size={16} />
            <span>My Courses</span>
          </button>
          <span className="nav-divider">/</span>
          <span className="nav-current-title">{course.title}</span>
        </div>

        <div className="header-course-summary-row">
          <div className="header-title-lockup">
            <h1 className="workspace-course-title">{course.title}</h1>
            <span className={`workspace-status-badge ${course.status}`}>
              {course.status === 'published' ? (
                <>
                  <Globe size={13} />
                  <span>Published & Live</span>
                </>
              ) : (
                <>
                  <Lock size={13} />
                  <span>Draft Mode</span>
                </>
              )}
            </span>
          </div>

          <div className="header-actions-and-meta">
            <div className="header-meta-tags-wrap">
              <span className="meta-pill-item">
                Category: <strong>{course.category}</strong>
              </span>
              <span className="meta-pill-item">
                Level: <strong>{course.skillLevel}</strong>
              </span>
              <span className="meta-pill-item">
                Language: <strong>{course.language || 'English'}</strong>
              </span>
              <span className="meta-pill-item">
                Learners: <strong>{course.learnersCount || 0}</strong>
              </span>
              <span className="meta-pill-item">
                Views: <strong>{course.overviewViews || 0}</strong>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ 5 WORKSPACE NAVIGATION TABS (Strictly Based on Reference Diagram) ═══ */}
      <nav className="workspace-tabs-nav-bar" aria-label="Course Workspace Tabs">
        {/* Tab 1: Course Content */}
        <button
          type="button"
          className={`workspace-tab-btn ${activeTab === 'modules' ? 'active' : ''}`}
          onClick={() => setActiveTab('modules')}
        >
          <Layers size={21} strokeWidth={2.2} />
          <span>Course Content</span>
        </button>

        {/* Tab 2: Course Details & Syllabus */}
        <button
          type="button"
          className={`workspace-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          <BookOpen size={21} strokeWidth={2.2} />
          <span>Course Details & Syllabus</span>
        </button>

        {/* Tab 3: Course Overview */}
        <button
          type="button"
          className={`workspace-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Sparkles size={21} strokeWidth={2.2} />
          <span>Course Overview</span>
        </button>

        {/* Tab 4: Announcements (Strictly positioned between Course Overview and Publish Status) */}
        <button
          type="button"
          className={`workspace-tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          <Bell size={21} strokeWidth={2.2} />
          <span>Announcements</span>
        </button>

        {/* Tab 5: Publish Status */}
        <button
          type="button"
          className={`workspace-tab-btn ${activeTab === 'publish' ? 'active' : ''}`}
          onClick={() => setActiveTab('publish')}
        >
          <Globe size={21} strokeWidth={2.2} />
          <span>Publish Status</span>
        </button>

        {/* Tab 5: Analytics */}
        <button
          type="button"
          className={`workspace-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={21} strokeWidth={2.2} />
          <span>Analytics</span>
        </button>
      </nav>

      {/* ═══ ACTIVE TAB CONTENT PANEL ═══ */}
      <main className="workspace-content-card">
        {/* ─────────────────────────────────────────────────────────────
            TAB 1: MODULES (Curriculum Authoring & Learner Simulation)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'modules' && (
          <section className="workspace-panel-section modules-editor-panel">
            <CourseModules
              courseId={courseId}
              course={course}
              onCurriculumUpdated={fetchWorkspaceData}
              onNavigate={onNavigate}
            />
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: COURSE DETAILS & SYLLABUS
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'details' && (
          <section className="workspace-panel-section details-syllabus-panel">
            <div className="section-toolbar-row">
              <div className="toolbar-info">
                <h2 className="workspace-section-title">Course Details & Syllabus</h2>
                <p className="workspace-section-subtitle">
                  Review and update your core course identity, metadata, and curriculum overview.
                </p>
              </div>

              {!isEditingDetails && (
                <button
                  type="button"
                  className="btn-edit-action"
                  onClick={() => setIsEditingDetails(true)}
                >
                  <Edit3 size={16} />
                  <span>Edit Course Details</span>
                </button>
              )}
            </div>

            {/* VIEW MODE: Complete Course Details Review */}
            {!isEditingDetails ? (
              <div className="details-view-layout">
                <div className="details-cards-grid">
                  {/* Card 1: Core Information */}
                  <div className="workspace-info-card">
                    <h3 className="card-inner-heading">Core Information</h3>

                    <div className="info-data-table">
                      {/* Course Title (Full Width) */}
                      <div className="data-field-item field-full-width">
                        <span className="data-label">Course Title</span>
                        <div className="data-val font-semibold">{course.title || 'Untitled Course'}</div>
                      </div>

                      {/* Category (Col 1) & Skill Level (Col 2) */}
                      <div className="data-field-item">
                        <span className="data-label">Category</span>
                        <div className="data-val">{course.category || 'Not specified'}</div>
                      </div>

                      <div className="data-field-item">
                        <span className="data-label">Skill Level</span>
                        <div className="data-val">{course.skillLevel || 'All Levels'}</div>
                      </div>

                      {/* Language (Full Width) */}
                      <div className="data-field-item field-full-width">
                        <span className="data-label">Language</span>
                        <div className="data-val">{course.language || 'English'}</div>
                      </div>

                      {/* Short Description (Full Width) */}
                      <div className="data-field-item field-full-width">
                        <span className="data-label">Short Description</span>
                        <p className="data-val-desc">
                          {course.shortDescription || course.description || 'No short description provided.'}
                        </p>
                      </div>

                      {/* Tags & Keywords (Full Width) */}
                      <div className="data-field-item field-full-width">
                        <span className="data-label">Tags & Keywords</span>
                        <div className="data-chips-wrap">
                          {Array.isArray(course.tags) && course.tags.length > 0 ? (
                            course.tags.map((tag, idx) => (
                              <span key={idx} className="workspace-tag-chip">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted-italic">No tags added</span>
                          )}
                        </div>
                      </div>

                      {/* Metadata Divider */}
                      <div className="field-divider-row" />

                      {/* Created (Col 1) & Last Updated (Col 2) */}
                      <div className="data-field-item">
                        <span className="data-label">Created</span>
                        <div className="data-val-sm">
                          {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'Recently'}
                        </div>
                      </div>

                      <div className="data-field-item">
                        <span className="data-label">Last Updated</span>
                        <div className="data-val-sm">
                          {course.updatedAt ? new Date(course.updatedAt).toLocaleDateString() : 'Recently'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Thumbnail Preview */}
                  <div className="workspace-info-card">
                    <h3 className="card-inner-heading">Course Thumbnail</h3>
                    <div className="details-thumb-box">
                      <CourseThumbnail
                        src={course.thumbnail}
                        alt={course.title}
                        className="details-thumb-img"
                      />
                    </div>
                    <p className="details-thumb-note">
                      Displayed on the course catalog, search cards, and learner dashboard.
                    </p>
                  </div>
                </div>

                {/* Card 3: Syllabus Section (Dynamic Curriculum Reflection) */}
                <div className="workspace-info-card syllabus-structure-section">
                  <div className="syllabus-header-row">
                    <div className="syllabus-title-group">
                      <FileText size={20} className="accent-green" />
                      <h3 className="card-inner-heading" style={{ margin: 0 }}>
                        Syllabus Structure
                      </h3>
                    </div>
                    <span className="syllabus-counter-badge">
                      {(course.modules?.length || 0)} Modules • {course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || (course.lessons?.length || 0)} Lessons
                    </span>
                  </div>

                  {(!Array.isArray(course.modules) || course.modules.length === 0) ? (
                    <div className="empty-syllabus-banner">
                      <p className="empty-syllabus-main">No syllabus available yet</p>
                      <p className="empty-syllabus-sub">
                        Your syllabus will appear here after modules and lessons are created in the Modules tab.
                      </p>
                    </div>
                  ) : (
                    <div className="syllabus-modules-summary-list">
                      {course.modules.map((mod, idx) => (
                        <div key={mod._id || idx} className="syllabus-mod-item">
                          <div className="syllabus-mod-top">
                            <span className="syllabus-mod-title">Module {idx + 1}: {mod.title}</span>
                            <span className={`state-badge-sm ${mod.state || 'draft'}`}>{mod.state || 'draft'}</span>
                          </div>
                          {mod.description && <p className="syllabus-mod-desc">{mod.description}</p>}
                          {Array.isArray(mod.lessons) && mod.lessons.length > 0 && (
                            <ul className="syllabus-lesson-bullets">
                              {mod.lessons.map((less, lIdx) => (
                                <li key={less._id || lIdx} className="syllabus-lesson-bullet">
                                  <span>{idx + 1}.{lIdx + 1} {less.title}</span>
                                  <span className="lesson-item-count">
                                    {(less.items?.length || 0)} items
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* EDIT MODE: In-Place Edit Course Details Form */
              <form className="details-edit-form" onSubmit={handleSaveDetails}>
                <div className="form-grid-columns">
                  {/* Left Column: Form Fields */}
                  <div className="form-left-col">
                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-title">
                        Course Title <span className="required-star">*</span>
                      </label>
                      <input
                        id="edit-title"
                        type="text"
                        className="form-input"
                        value={detailsForm.title}
                        onChange={(e) => setDetailsForm({ ...detailsForm, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-row-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="edit-category">
                          Category <span className="required-star">*</span>
                        </label>
                        <select
                          id="edit-category"
                          className="form-select"
                          value={detailsForm.category}
                          onChange={(e) => setDetailsForm({ ...detailsForm, category: e.target.value })}
                          required
                        >
                          <option value="">Select a category</option>
                          {CATEGORY_OPTIONS.map((cat, idx) => (
                            <option key={idx} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="edit-skill-level">
                          Skill Level
                        </label>
                        <select
                          id="edit-skill-level"
                          className="form-select"
                          value={detailsForm.skillLevel}
                          onChange={(e) => setDetailsForm({ ...detailsForm, skillLevel: e.target.value })}
                        >
                          {SKILL_LEVEL_OPTIONS.map((lvl, idx) => (
                            <option key={idx} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="edit-language">
                        Language
                      </label>
                      <select
                        id="edit-language"
                        className="form-select"
                        value={detailsForm.language}
                        onChange={(e) => setDetailsForm({ ...detailsForm, language: e.target.value })}
                      >
                        {LANGUAGE_OPTIONS.map((lang, idx) => (
                          <option key={idx} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <div className="label-row">
                        <label className="form-label" htmlFor="edit-short-desc">
                          Short Description <span className="required-star">*</span>
                        </label>
                        <span className="char-count">
                          {detailsForm.shortDescription?.length || 0}/300
                        </span>
                      </div>
                      <textarea
                        id="edit-short-desc"
                        rows={4}
                        maxLength={300}
                        className="form-textarea workspace-no-resize"
                        value={detailsForm.shortDescription}
                        onChange={(e) => setDetailsForm({ ...detailsForm, shortDescription: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Tags & Search Keywords</label>
                      <DynamicTagInput
                        tags={detailsForm.tags}
                        onChange={(tags) => setDetailsForm({ ...detailsForm, tags })}
                        placeholder="Add a tag and press Enter..."
                        maxTags={8}
                      />
                    </div>
                  </div>

                  {/* Right Column: Thumbnail Uploader */}
                  <div className="form-right-col">
                    <label className="form-label">Course Thumbnail</label>
                    <div className="edit-thumbnail-preview-box">
                      <CourseThumbnail
                        src={detailsThumbnailPreview || course.thumbnail}
                        alt="Thumbnail Preview"
                        className="edit-thumbnail-img"
                      />
                    </div>

                    <input
                      ref={detailsFileRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          const validTypes = ['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp'];
                          const ext = file.name ? file.name.split('.').pop().toLowerCase() : '';
                          const validExts = ['jpg', 'jpeg', 'png', 'webp'];

                          if (!validTypes.includes(file.type?.toLowerCase()) && !validExts.includes(ext)) {
                            toast.error('Invalid format. Only JPG, JPEG, PNG, and WebP are allowed.');
                            e.target.value = '';
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('Image size exceeds 5MB limit. Please choose a smaller file.');
                            e.target.value = '';
                            return;
                          }

                          try {
                            setDetailsThumbnailFile(file);
                            setDetailsThumbnailPreview(URL.createObjectURL(file));
                          } catch (err) {
                            console.error('Failed to create thumbnail preview:', err);
                            toast.error('Failed to process selected image.');
                          }
                        }
                        e.target.value = '';
                      }}
                    />

                    <div className="thumb-edit-buttons">
                      <button
                        type="button"
                        className="btn-change-thumbnail"
                        onClick={() => detailsFileRef.current?.click()}
                      >
                        <RefreshCw size={15} />
                        <span>Choose New Image</span>
                      </button>
                    </div>
                    <p className="thumb-guidelines">
                      Recommended 1280 × 720 px, 16:9 ratio. JPG, PNG or WebP under 5MB.
                    </p>
                  </div>
                </div>

                {/* Edit Form Actions */}
                <div className="form-actions-bar">
                  <button
                    type="button"
                    className="btn-cancel-action"
                    disabled={savingDetails}
                    onClick={() => {
                      setDetailsForm({
                        title: course.title,
                        category: course.category,
                        skillLevel: course.skillLevel,
                        language: course.language || 'English',
                        shortDescription: course.shortDescription || course.description || '',
                        tags: course.tags || [],
                        thumbnail: course.thumbnail
                      });
                      setDetailsThumbnailPreview(course.thumbnail);
                      setDetailsThumbnailFile(null);
                      setIsEditingDetails(false);
                    }}
                  >
                    <span>Cancel</span>
                  </button>

                  <button
                    type="submit"
                    className="btn-save-primary"
                    disabled={savingDetails}
                  >
                    {savingDetails ? (
                      <>
                        <div className="mini-spinner" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Course Details</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: COURSE OVERVIEW (Edit & Preview Functionality)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <section className="workspace-panel-section course-overview-panel">
            <div className="section-toolbar-row">
              <div className="toolbar-info">
                <h2 className="workspace-section-title">Course Overview</h2>
                <p className="workspace-section-subtitle">
                  Configure the learner-facing marketing page, learning outcomes, skills, and FAQs.
                </p>
              </div>

              <div className="toolbar-actions-group">
                <button
                  type="button"
                  className="btn-preview-learner"
                  onClick={handlePreviewOverview}
                  title="Open live learner-facing overview page"
                >
                  <Eye size={16} />
                  <span>Preview Overview</span>
                </button>

                {!isEditingOverview && (
                  <button
                    type="button"
                    className="btn-edit-action"
                    onClick={() => setIsEditingOverview(true)}
                  >
                    <Edit3 size={16} />
                    <span>Edit Overview</span>
                  </button>
                )}
              </div>
            </div>

            {/* VIEW MODE: Stored Course Overview Information */}
            {!isEditingOverview ? (
              <div className="overview-view-layout">
                {/* Description Card */}
                <div className="workspace-info-card">
                  <div className="overview-subhead-row">
                    <div className="title-with-icon">
                      <BookOpen size={18} className="accent-green" />
                      <h3 className="card-inner-heading" style={{ margin: 0 }}>
                        About This Course
                      </h3>
                    </div>
                    {wordCount > 20 && (
                      <span className="workspace-read-pill">
                        <Clock size={13} /> {readTimeMinutes} min read
                      </span>
                    )}
                  </div>

                  <div className="workspace-formatted-desc">
                    {renderFormattedDescription(overview?.fullDescription)}
                  </div>

                  <div className="workspace-pillars-strip">
                    <div className="pillar-badge">
                      <Zap size={14} className="pillar-icon" />
                      <span>Practical Hands-on Focus</span>
                    </div>
                    <div className="pillar-badge">
                      <Sparkles size={14} className="pillar-icon" />
                      <span>Curated Curriculum</span>
                    </div>
                    {overview?.certificate !== false && (
                      <div className="pillar-badge">
                        <Award size={14} className="pillar-icon" />
                        <span>Verified Certificate Included</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* What You'll Learn (Outcomes) */}
                <div className="workspace-info-card">
                  <h3 className="card-inner-heading">
                    What You'll Learn ({Array.isArray(overview?.learningOutcomes) ? overview.learningOutcomes.length : 0})
                  </h3>
                  {Array.isArray(overview?.learningOutcomes) && overview.learningOutcomes.length > 0 ? (
                    <div className="workspace-outcomes-grid">
                      {overview.learningOutcomes.map((outcome, idx) => (
                        <div key={idx} className="workspace-outcome-item">
                          <Check size={16} className="outcome-check-green" />
                          <span>{outcome}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-italic">No learning outcomes added yet.</p>
                  )}
                </div>

                {/* Skills You'll Gain (Distinct Point Identity Badges) */}
                <div className="workspace-info-card">
                  <h3 className="card-inner-heading">
                    Skills You'll Gain ({Array.isArray(overview?.skills) ? overview.skills.length : 0})
                  </h3>
                  {Array.isArray(overview?.skills) && overview.skills.length > 0 ? (
                    <div className="workspace-skills-grid">
                      {overview.skills.map((skill, idx) => (
                        <div key={idx} className="workspace-skill-badge-card">
                          <div className="skill-check-circle">
                            <Check size={13} strokeWidth={3} />
                          </div>
                          <span className="skill-name">{skill}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-italic">No skills added yet.</p>
                  )}
                </div>

                {/* Prerequisites & Tech Stack */}
                <div className="workspace-two-cards-grid">
                  <div className="workspace-info-card">
                    <h3 className="card-inner-heading">Prerequisites</h3>
                    <div className="data-chips-wrap">
                      {Array.isArray(overview?.prerequisites) && overview.prerequisites.length > 0 ? (
                        overview.prerequisites.map((p, idx) => (
                          <span key={idx} className="workspace-tag-chip">
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-italic">No prerequisites specified.</span>
                      )}
                    </div>
                  </div>

                  <div className="workspace-info-card">
                    <h3 className="card-inner-heading">Technologies & Tools</h3>
                    <div className="data-chips-wrap">
                      {Array.isArray(overview?.techStack) && overview.techStack.length > 0 ? (
                        overview.techStack.map((tool, idx) => (
                          <span key={idx} className="workspace-tag-chip tech-color">
                            {tool}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-italic">No tools or technologies specified.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Certificate Status & Stats */}
                <div className="workspace-info-card certificate-card">
                  <div className="cert-card-left">
                    <Award size={28} className="accent-green" />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <h4 className="cert-heading" style={{ margin: 0 }}>Course Completion Certificate</h4>
                        <span className={`cert-status-pill ${overview?.certificate !== false ? 'status-enabled' : 'status-disabled'}`}>
                          {overview?.certificate !== false ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="cert-subtext" style={{ marginTop: '0.35rem' }}>
                        {overview?.certificate !== false
                          ? 'Learners receive a verified UpSkillR digital certificate with QR code and instructor signature upon finishing 100% of curriculum.'
                          : 'Certificates are disabled for this course. Learners complete normally without an issued certificate.'}
                      </p>

                      {overview?.certificate !== false && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Certificates Issued: <strong style={{ color: '#10b981' }}>{certStats.totalIssued}</strong>
                          </span>
                          {certStats.totalIssued > 0 && (
                            <button
                              type="button"
                              className="btn-cert-recipients-trigger"
                              onClick={() => setShowRecipientsModal(true)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              <Users size={14} />
                              <span>View Recipients ({certStats.totalIssued})</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-cert-preview-trigger"
                            onClick={() => setShowCertPreview(true)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            <Eye size={14} />
                            <span>Preview Certificate</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Personal Message to Learner */}
                <div className="workspace-info-card">
                  <div className="title-with-icon">
                    <MessageSquare size={18} className="accent-green" />
                    <h3 className="card-inner-heading" style={{ margin: 0 }}>
                      Personal Message to Learner
                    </h3>
                  </div>
                  {overview?.instructorMessage ? (
                    <blockquote className="workspace-instructor-quote">
                      "{overview.instructorMessage}"
                    </blockquote>
                  ) : (
                    <p className="text-muted-italic">No personal message set yet. Click Edit Overview to add one.</p>
                  )}
                </div>

                {/* FAQs */}
                {Array.isArray(overview?.faqs) && overview.faqs.length > 0 && (
                  <div className="workspace-info-card">
                    <h3 className="card-inner-heading">Frequently Asked Questions ({overview.faqs.length})</h3>
                    <div className="workspace-faq-list">
                      {overview.faqs.map((faq, idx) => {
                        const isOpen = activeFaqAccordion === idx;
                        return (
                          <div key={idx} className={`workspace-faq-item ${isOpen ? 'open' : ''}`}>
                            <button
                              type="button"
                              className="faq-q-btn"
                              onClick={() => setActiveFaqAccordion(isOpen ? null : idx)}
                            >
                              <span>{faq.question}</span>
                              <span className="accordion-arrow">{isOpen ? '▲' : '▼'}</span>
                            </button>
                            {isOpen && <p className="faq-a-body">{faq.answer}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* EDIT OVERVIEW MODE: Clean Structured Form */
              <form className="overview-edit-form" onSubmit={handleSaveOverview}>
                {/* Description */}
                <div className="form-group">
                  <div className="label-row">
                    <label className="form-label" htmlFor="overview-desc">
                      Full Course Description <span className="required-star">*</span>
                    </label>
                    <span className="char-count">
                      {overviewForm.fullDescription?.length || 0}/2000
                    </span>
                  </div>
                  <p className="field-subnote">
                    Write a detailed description about your course, including what it covers, who it is for, and why it's valuable.
                  </p>
                  <textarea
                    id="overview-desc"
                    rows={6}
                    maxLength={2000}
                    className="form-textarea workspace-no-resize"
                    value={overviewForm.fullDescription}
                    onChange={(e) => setOverviewForm({ ...overviewForm, fullDescription: e.target.value })}
                    required
                  />
                </div>

                {/* What You'll Learn */}
                <div className="form-group">
                  <label className="form-label">
                    What You'll Learn (Outcomes) <span className="required-star">*</span>
                  </label>
                  <p className="field-subnote">
                    Add key learning outcomes. Be specific and learner-focused.
                  </p>
                  <DynamicTagInput
                    tags={overviewForm.learningOutcomes || []}
                    onChange={(learningOutcomes) => setOverviewForm({ ...overviewForm, learningOutcomes })}
                    placeholder="Add a learning outcome and press Enter..."
                    maxTags={12}
                  />
                </div>

                {/* Skills You'll Gain */}
                <div className="form-group">
                  <label className="form-label">Skills You'll Gain</label>
                  <p className="field-subnote">
                    Skills will be rendered with distinct visual check badges in the course overview.
                  </p>
                  <DynamicTagInput
                    tags={overviewForm.skills}
                    onChange={(skills) => setOverviewForm({ ...overviewForm, skills })}
                    placeholder="Add a skill and press Enter..."
                    maxTags={12}
                  />
                </div>

                {/* Prerequisites */}
                <div className="form-group">
                  <label className="form-label">Prerequisites</label>
                  <DynamicTagInput
                    tags={overviewForm.prerequisites}
                    onChange={(prerequisites) => setOverviewForm({ ...overviewForm, prerequisites })}
                    placeholder="Add a prerequisite and press Enter..."
                    maxTags={8}
                  />
                </div>

                {/* Tech Stack */}
                <div className="form-group">
                  <label className="form-label">Tech Stack & Tools</label>
                  <DynamicTagInput
                    tags={overviewForm.techStack}
                    onChange={(techStack) => setOverviewForm({ ...overviewForm, techStack })}
                    placeholder="Add a tool (e.g. Docker, Git) and press Enter..."
                    maxTags={12}
                  />
                </div>

                {/* Certificate Settings Section */}
                <div className="workspace-certificate-settings-box" style={{ padding: '1.25rem', background: 'var(--surface-muted, #f8faf9)', border: '1px solid var(--border, #c6d3cb)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Award size={20} className="accent-green" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Certificate Settings</h3>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Configure whether learners receive an official UpSkillR course completion certificate upon finishing 100% of curriculum.
                  </p>

                  <div className="workspace-toggle-row" style={{ margin: 0 }}>
                    <label className="switch-container" aria-label="Provide Course Completion Certificates">
                      <input
                        type="checkbox"
                        checked={overviewForm.certificate === true}
                        onChange={(e) => setOverviewForm({ ...overviewForm, certificate: e.target.checked })}
                      />
                      <span className="slider-round" />
                    </label>
                    <div className="toggle-text-wrap">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="toggle-title">Provide Course Completion Certificates</span>
                        <span className={`cert-status-pill ${overviewForm.certificate === true ? 'status-enabled' : 'status-disabled'}`}>
                          {overviewForm.certificate === true ? 'Enabled' : 'Disabled (Default)'}
                        </span>
                      </div>
                      <span className="toggle-desc">
                        {overviewForm.certificate === true
                          ? 'A verified UpSkillR course completion certificate will be automatically generated with QR verification when learners complete all lessons.'
                          : 'Learners can complete the course normally, but no certificate will be generated.'}
                      </span>
                    </div>
                  </div>

                  {overviewForm.certificate === true && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.85rem 1rem', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <UserCheck size={15} style={{ color: '#10b981' }} />
                          <span style={{ color: 'var(--text-secondary)' }}>Instructor:</span>
                          <strong>{instructorInfo.fullName}</strong>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <ShieldCheck size={15} style={{ color: '#10b981' }} />
                          <span style={{ color: 'var(--text-secondary)' }}>Designation:</span>
                          <strong>{instructorInfo.designation}</strong>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#047857', background: '#ecfdf5', padding: '0.45rem 0.65rem', borderRadius: '6px' }}>
                        ✦ Handwritten cursive signature is automatically generated from your profile name. No signature image upload is required.
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-cert-preview-trigger"
                          onClick={() => setShowCertPreview(true)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.85rem', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <Eye size={15} />
                          <span>Preview Learner Certificate</span>
                        </button>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          Preview with your credentials and handwritten cursive signature.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Personal Message to Learner */}
                <div className="form-group">
                  <div className="label-row">
                    <label className="form-label" htmlFor="overview-instructor-message">
                      Personal Message to Learner
                    </label>
                    <span className="char-count">
                      {overviewForm.instructorMessage?.length || 0}/1000
                    </span>
                  </div>
                  <p className="field-subnote">
                    A personal greeting, encouragement, or advice to welcome prospective learners to this course.
                  </p>
                  <textarea
                    id="overview-instructor-message"
                    rows={3}
                    maxLength={1000}
                    className="form-textarea workspace-no-resize"
                    placeholder="e.g. Welcome to this course! I designed this curriculum to guide you through..."
                    value={overviewForm.instructorMessage || ''}
                    onChange={(e) => setOverviewForm({ ...overviewForm, instructorMessage: e.target.value })}
                  />
                </div>

                {/* FAQs Builder */}
                <div className="form-group faqs-edit-box">
                  <label className="form-label">Frequently Asked Questions (FAQs)</label>
                  {overviewForm.faqs && overviewForm.faqs.length > 0 && (
                    <div className="faqs-reorder-list">
                      {overviewForm.faqs.map((faq, idx) => (
                        <div key={idx} className="faq-edit-row">
                          <div className="faq-edit-content">
                            <strong>Q: {faq.question}</strong>
                            <p>{faq.answer}</p>
                          </div>
                          <button
                            type="button"
                            className="btn-faq-delete"
                            onClick={() => handleRemoveFaq(idx)}
                            title="Delete FAQ"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="add-faq-inputs-card">
                    <span className="add-faq-title">Add a New FAQ</span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Question (e.g. Is prior programming experience required?)"
                      value={newFaqQ}
                      onChange={(e) => setNewFaqQ(e.target.value)}
                    />
                    <textarea
                      rows={2}
                      className="form-textarea workspace-no-resize"
                      placeholder="Answer..."
                      value={newFaqA}
                      onChange={(e) => setNewFaqA(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-add-faq-pill"
                      onClick={handleAddFaq}
                    >
                      <Plus size={15} />
                      <span>Add FAQ Item</span>
                    </button>
                  </div>
                </div>

                {/* Edit Form Actions */}
                <div className="form-actions-bar">
                  <button
                    type="button"
                    className="btn-cancel-action"
                    disabled={savingOverview}
                    onClick={() => {
                      setOverviewForm({
                        fullDescription: overview?.fullDescription || '',
                        prerequisites: overview?.prerequisites || [],
                        learningOutcomes: overview?.learningOutcomes || [],
                        skills: overview?.skills || [],
                        techStack: overview?.techStack || [],
                        certificate: overview?.certificate !== false,
                        instructorMessage: overview?.instructorMessage || '',
                        faqs: overview?.faqs || []
                      });
                      setIsEditingOverview(false);
                    }}
                  >
                    <span>Cancel</span>
                  </button>

                  <button
                    type="submit"
                    className="btn-save-primary"
                    disabled={savingOverview}
                  >
                    {savingOverview ? (
                      <>
                        <div className="mini-spinner" />
                        <span>Saving Overview...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Course Overview</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: ANNOUNCEMENTS (Course-Specific Updates & Delivery)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'announcements' && (
          <section className="workspace-panel-section announcements-panel">
            <CourseAnnouncements
              courseId={courseId}
              course={course}
              user={user}
            />
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: PUBLISH STATUS (Existing Implementation Preserved)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'publish' && (
          <section className="workspace-panel-section publish-status-panel">
            <div className="section-toolbar-row">
              <div className="toolbar-info">
                <h2 className="workspace-section-title">Course Publish Status</h2>
                <p className="workspace-section-subtitle">
                  Control the visibility and live enrollment status of your course.
                </p>
              </div>
            </div>

            <div className="publish-status-card">
              <div className="publish-hero-row">
                <div className={`status-display-pill ${course.status}`}>
                  {course.status === 'published' ? (
                    <>
                      <Globe size={20} />
                      <span>Status: Published & Live</span>
                    </>
                  ) : (
                    <>
                      <Lock size={20} />
                      <span>Status: Draft Mode</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  className={`btn-publish-toggle ${course.status === 'published' ? 'btn-unpublish' : 'btn-publish-live'}`}
                  onClick={() => onPublishToggle(course._id, course.status)}
                >
                  {course.status === 'published' ? (
                    <>
                      <Lock size={16} />
                      <span>Move Back to Draft</span>
                    </>
                  ) : (
                    <>
                      <Globe size={16} />
                      <span>Publish Course Live</span>
                    </>
                  )}
                </button>
              </div>

              <div className="publish-explanation-box">
                {course.status === 'published' ? (
                  <p>
                    Your course is currently <strong>Live</strong> in the UpSkillR catalog. Learners can find your course, view the overview, and enroll in your curriculum.
                  </p>
                ) : (
                  <p>
                    Your course is currently in <strong>Draft Mode</strong>. Only you can view and edit this workspace. It is completely hidden from the public course catalog.
                  </p>
                )}
              </div>

              {/* Publication Checklist */}
              <div className="publication-checklist-box">
                <h3 className="checklist-heading">Course Readiness Checklist</h3>
                <ul className="checklist-items">
                  <li className="checklist-item checked">
                    <CheckCircle2 size={18} className="check-icon-green" />
                    <span>Basic Details configured (Title, Category, Skill Level)</span>
                  </li>
                  <li className="checklist-item checked">
                    <CheckCircle2 size={18} className="check-icon-green" />
                    <span>Course Overview & Learning Outcomes configured</span>
                  </li>
                  <li className="checklist-item checked">
                    <CheckCircle2 size={18} className="check-icon-green" />
                    <span>Course Thumbnail uploaded</span>
                  </li>
                  <li className={`checklist-item ${((course.modules?.length || 0) > 0 || (course.lessons?.length || 0) > 0) ? 'checked' : 'pending'}`}>
                    {((course.modules?.length || 0) > 0 || (course.lessons?.length || 0) > 0) ? (
                      <CheckCircle2 size={18} className="check-icon-green" />
                    ) : (
                      <AlertCircle size={18} className="check-icon-amber" />
                    )}
                    <span>
                      At least one module and lesson configured (Current: {course.modules?.length || 0} modules, {course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || (course.lessons?.length || 0)} lessons)
                    </span>
                  </li>
                </ul>
                {(!course.modules || course.modules.length === 0) && (
                  <p className="checklist-warning-note">
                    * UpSkillR requires at least 1 module and lesson before publishing a course live to learners.
                  </p>
                )}
              </div>

              {/* Curriculum Tree Audit Section */}
              <div className="curriculum-audit-card">
                <h3 className="checklist-heading">Curriculum Tree Status Audit</h3>
                <div className="audit-stats-row">
                  <div className="audit-stat-pill">
                    <span className="audit-stat-num">{course.modules?.length || 0}</span>
                    <span className="audit-stat-label">Total Modules</span>
                  </div>
                  <div className="audit-stat-pill published">
                    <span className="audit-stat-num">{course.modules?.filter(m => m.state === 'published').length || 0}</span>
                    <span className="audit-stat-label">Published Modules</span>
                  </div>
                  <div className="audit-stat-pill draft">
                    <span className="audit-stat-num">{course.modules?.filter(m => m.state === 'draft').length || 0}</span>
                    <span className="audit-stat-label">Draft Modules</span>
                  </div>
                  <div className="audit-stat-pill">
                    <span className="audit-stat-num">
                      {course.modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0}
                    </span>
                    <span className="audit-stat-label">Total Lessons</span>
                  </div>
                </div>
                {course.modules?.some(m => !m.lessons || m.lessons.length === 0) && (
                  <div className="audit-alert-box">
                    <AlertCircle size={16} />
                    <span>Auto-Draft Rule in effect: One or more modules contain zero lessons and are locked in draft mode.</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 5: ANALYTICS (Existing Implementation Preserved / Real Data)
           ───────────────────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <section className="workspace-panel-section analytics-panel">
            <div className="section-toolbar-row">
              <div className="toolbar-info">
                <h2 className="workspace-section-title">Course Analytics</h2>
                <p className="workspace-section-subtitle">
                  Real performance and engagement metrics for this course.
                </p>
              </div>
            </div>

            {/* Real Stats Cards */}
            <div className="analytics-metrics-grid">
              <div className="analytic-stat-card">
                <span className="stat-label">Total Enrolments</span>
                <span className="stat-value">{course.learnersCount || 0}</span>
                <span className="stat-sub">Active learners enrolled</span>
              </div>

              <div className="analytic-stat-card">
                <span className="stat-label">Overview Page Views</span>
                <span className="stat-value">{course.overviewViews || 0}</span>
                <span className="stat-sub">Unique learner visits</span>
              </div>

              <div className="analytic-stat-card">
                <span className="stat-label">Average Rating</span>
                <span className="stat-value">
                  {course.rating ? Number(course.rating).toFixed(1) : '—'}
                </span>
                <span className="stat-sub">
                  {course.reviewCount || 0} verified reviews
                </span>
              </div>

              <div className="analytic-stat-card">
                <span className="stat-label">Publication Status</span>
                <span className="stat-value capitalize">{course.status}</span>
                <span className="stat-sub">Current catalog state</span>
              </div>
            </div>

            {/* Informational Analytics Placeholder */}
            <div className="analytics-notice-card">
              <BarChart3 size={24} className="accent-green" />
              <div>
                <h4>Detailed Learner Engagement Analytics</h4>
                <p>
                  Comprehensive engagement graphs, video completion drop-offs, and assessment score distributions will automatically populate here as enrolled learners progress through lessons.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Certificate Preview Modal */}
      <CertificatePreviewModal
        isOpen={showCertPreview}
        onClose={() => setShowCertPreview(false)}
        courseTitle={course?.title || overviewForm.fullDescription?.slice(0, 40) || 'Course Completion'}
        instructorName={instructorInfo.fullName}
        instructorDesignation={instructorInfo.designation}
      />

      {/* Course Certificate Recipients Modal */}
      {showRecipientsModal && (
        <div className="cert-preview-overlay" onClick={() => setShowRecipientsModal(false)} role="dialog" aria-modal="true">
          <div className="cert-preview-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
            <div className="cert-preview-header">
              <div className="cert-preview-header-title">
                <Users size={20} className="cert-header-icon" />
                <div>
                  <h3>Issued Certificates ({certStats.totalIssued})</h3>
                  <p>Learners who have successfully earned a completion certificate for this course</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-cert-preview-close"
                onClick={() => setShowRecipientsModal(false)}
                aria-label="Close recipients modal"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: '60vh' }}>
              {certStats.recipients?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No learners have completed this course yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {certStats.recipients.map((rec, i) => (
                    <div
                      key={rec.certificateId || i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        background: 'var(--surface-muted, #0f172a)',
                        border: '1px solid var(--border, #334155)',
                        borderRadius: '8px',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rec.studentName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          ID: <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{rec.certificateId}</span> • Issued: {new Date(rec.issuedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <a
                          href={`/verify-certificate/${rec.certificateId}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.75rem',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                        >
                          <span>Verify</span>
                          <ExternalLink size={13} />
                        </a>
                        {rec.certificateImageUrl && (
                          <a
                            href={rec.certificateImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.75rem',
                              background: '#10b981',
                              color: '#ffffff',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              textDecoration: 'none'
                            }}
                          >
                            <span>View PNG</span>
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="cert-preview-footer">
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Certificates are permanently stored and digitally verified.
              </span>
              <button
                type="button"
                className="btn-cert-preview-done"
                onClick={() => setShowRecipientsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
