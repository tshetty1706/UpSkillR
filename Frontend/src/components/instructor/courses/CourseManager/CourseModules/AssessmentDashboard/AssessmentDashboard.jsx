import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit2,
  Trash2,
  Award,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  FileText,
  Lock,
  Unlock,
  Eye,
  Shuffle,
  Sparkles,
  BookOpen,
  HelpCircle,
  MoreVertical
} from 'lucide-react';
import './AssessmentDashboard.css';

export const AssessmentDashboard = ({
  courseId,
  modules = [],
  courseAssessments = [],
  onBack,
  onNavigateToModules,
  onCurriculumUpdated,
  onCreateNewAssessment,
  onEditAssessment,
  apiBase = 'http://localhost:5000/api',
  getAuthHeader = () => ({}),
  toast
}) => {
  // Sidebar open/closed state (matches ModuleLessonEditor behavior, default collapsed dock)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Selected assessment ID for detail view
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(() => {
    return courseAssessments.length > 0 ? courseAssessments[0]._id : null;
  });

  // Search filter in sidebar
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');

  // Dropdown menu state in sidebar or header
  const [openMenuAssessmentId, setOpenMenuAssessmentId] = useState(null);

  // Theme-styled delete confirmation modal state (No browser confirm)
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    assessmentId: null,
    assessmentTitle: '',
    assessmentCode: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggle publishing state
  const [isTogglingState, setIsTogglingState] = useState(false);

  // Scroll container and active item refs
  const dockListRef = useRef(null);
  const sidebarListRef = useRef(null);
  const activeDockBtnRef = useRef(null);
  const activeSidebarCardRef = useRef(null);

  // Scroll boundary states for navigation arrows
  const [dockCanScrollUp, setDockCanScrollUp] = useState(false);
  const [dockCanScrollDown, setDockCanScrollDown] = useState(false);
  const [sidebarCanScrollUp, setSidebarCanScrollUp] = useState(false);
  const [sidebarCanScrollDown, setSidebarCanScrollDown] = useState(false);

  // Boundary check functions
  const checkDockScroll = () => {
    const el = dockListRef.current;
    if (!el) return;
    setDockCanScrollUp(el.scrollTop > 2);
    setDockCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  };

  const checkSidebarScroll = () => {
    const el = sidebarListRef.current;
    if (!el) return;
    setSidebarCanScrollUp(el.scrollTop > 2);
    setSidebarCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  };

  const handleDockScroll = () => {
    checkDockScroll();
  };

  const handleSidebarScroll = () => {
    checkSidebarScroll();
  };

  // Scroll arrow action handlers
  const handleScrollDockUp = () => {
    if (dockListRef.current) {
      dockListRef.current.scrollBy({ top: -90, behavior: 'smooth' });
    }
  };

  const handleScrollDockDown = () => {
    if (dockListRef.current) {
      dockListRef.current.scrollBy({ top: 90, behavior: 'smooth' });
    }
  };

  const handleScrollSidebarUp = () => {
    if (sidebarListRef.current) {
      sidebarListRef.current.scrollBy({ top: -140, behavior: 'smooth' });
    }
  };

  const handleScrollSidebarDown = () => {
    if (sidebarListRef.current) {
      sidebarListRef.current.scrollBy({ top: 140, behavior: 'smooth' });
    }
  };

  // Keyboard shortcut: Escape closes assessment sidebar overlay
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  // Window resize listener to recheck scroll boundaries
  useEffect(() => {
    const handleResize = () => {
      checkDockScroll();
      if (isSidebarOpen) checkSidebarScroll();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // Sync selected assessment when assessments list updates
  useEffect(() => {
    if (courseAssessments.length > 0) {
      const exists = courseAssessments.some(a => String(a._id) === String(selectedAssessmentId));
      if (!exists) {
        setSelectedAssessmentId(courseAssessments[0]._id);
      }
    } else {
      setSelectedAssessmentId(null);
    }
  }, [courseAssessments, selectedAssessmentId]);

  // Find currently active assessment object
  const activeAssessment = useMemo(() => {
    if (!selectedAssessmentId) return null;
    return courseAssessments.find(a => String(a._id) === String(selectedAssessmentId)) || null;
  }, [selectedAssessmentId, courseAssessments]);

  // Active assessment index (A1, A2...)
  const activeIndex = useMemo(() => {
    if (!activeAssessment) return -1;
    return courseAssessments.findIndex(a => String(a._id) === String(activeAssessment._id));
  }, [activeAssessment, courseAssessments]);

  // Filtered assessments in sidebar
  const filteredAssessments = useMemo(() => {
    if (!sidebarSearchQuery.trim()) return courseAssessments;
    const qLower = sidebarSearchQuery.toLowerCase();
    return courseAssessments.filter(a =>
      (a.title || '').toLowerCase().includes(qLower) ||
      (a.description || '').toLowerCase().includes(qLower)
    );
  }, [courseAssessments, sidebarSearchQuery]);

  // Auto-scroll active dock badge and recheck dock boundaries
  useEffect(() => {
    const timer = setTimeout(() => {
      checkDockScroll();
      if (activeDockBtnRef.current) {
        activeDockBtnRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [courseAssessments, selectedAssessmentId]);

  // Auto-scroll active sidebar card and recheck sidebar boundaries when opened
  useEffect(() => {
    if (isSidebarOpen) {
      const timer = setTimeout(() => {
        checkSidebarScroll();
        if (activeSidebarCardRef.current) {
          activeSidebarCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSidebarOpen, filteredAssessments, selectedAssessmentId]);

  // Toggle draft / published state via Backend API
  const handleToggleState = async (assessmentId, e) => {
    if (e) e.stopPropagation();
    setIsTogglingState(true);
    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/assessments/${assessmentId}/toggle-state`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        toast?.success?.(data.message || `Assessment updated to ${data.state}.`);
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast?.error?.(data.message || 'Failed to update assessment state.');
      }
    } catch (err) {
      console.error('Toggle assessment state error:', err);
      toast?.error?.('Network error updating assessment state.');
    } finally {
      setIsTogglingState(false);
    }
  };

  // Delete Assessment via Backend API
  const handleDeleteAssessment = async () => {
    if (!deleteModalState.assessmentId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${apiBase}/courses/${courseId}/curriculum/assessments/${deleteModalState.assessmentId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        toast?.success?.('Assessment deleted successfully.');
        setDeleteModalState({ isOpen: false, assessmentId: null, assessmentTitle: '', assessmentCode: '' });
        if (onCurriculumUpdated) onCurriculumUpdated();
      } else {
        toast?.error?.(data.message || 'Failed to delete assessment.');
      }
    } catch (err) {
      console.error('Delete assessment error:', err);
      toast?.error?.('Network error deleting assessment.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculated active assessment stats
  const activeQuestions = activeAssessment?.questions || [];
  const activeTotalQuestions = activeQuestions.length;
  const activeTotalMarks = activeAssessment?.totalMarks || activeQuestions.reduce((s, q) => s + (Number(q.marks) || 1), 0);
  const activeAvgMarks = activeTotalQuestions > 0 ? (activeTotalMarks / activeTotalQuestions).toFixed(1) : 0;
  const activeTimeLimit = activeAssessment?.timeLimit || activeAssessment?.durationMinutes || 45;
  const activeRequiredModuleIds = (activeAssessment?.requiredModuleIds || []).map(String);

  return (
    <div className="assessment-studio-root">
      <div className="as-layout-wrapper">
        {/* Subtle backdrop when sidebar overlay is open */}
        {isSidebarOpen && (
          <div
            className="as-sidebar-backdrop"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close Assessment Sidebar Overlay"
          />
        )}

        {/* ══════════════════════════════════════════════════════════════════
            1. COLLAPSED DOCK (Always mounted at left edge; sticky under 64px header)
            ══════════════════════════════════════════════════════════════════ */}
        <aside className="as-collapsed-dock" aria-label="Assessment Rail Navigation">
          <div className="as-dock-header">
            <button
              type="button"
              className="as-dock-toggle-btn"
              onClick={() => setIsSidebarOpen(true)}
              title="Expand Assessment Sidebar"
              aria-label="Expand Assessment Sidebar"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            className={`as-dock-scroll-arrow as-dock-scroll-up ${!dockCanScrollUp ? 'is-disabled' : ''}`}
            onClick={handleScrollDockUp}
            disabled={!dockCanScrollUp}
            title={dockCanScrollUp ? "Scroll Assessments Up" : "Reached Top"}
            aria-label="Scroll Assessments Up"
          >
            <ChevronUp size={15} />
          </button>

          <div
            className="as-dock-list-scrollable"
            ref={dockListRef}
            onScroll={handleDockScroll}
          >
            {courseAssessments.map((ass, idx) => {
              const isActive = String(ass._id) === String(selectedAssessmentId);
              const isDraft = (ass.state || 'draft') === 'draft';
              const code = `A${idx + 1}`;

              return (
                <button
                  key={ass._id}
                  ref={isActive ? activeDockBtnRef : null}
                  type="button"
                  className={`as-dock-badge-btn ${isActive ? 'is-active' : ''} ${isDraft ? 'is-draft' : ''}`}
                  onClick={() => setSelectedAssessmentId(ass._id)}
                  title={`${code}: ${ass.title || 'Assessment'} (${isDraft ? 'Draft' : 'Published'})`}
                >
                  {code}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={`as-dock-scroll-arrow as-dock-scroll-down ${!dockCanScrollDown ? 'is-disabled' : ''}`}
            onClick={handleScrollDockDown}
            disabled={!dockCanScrollDown}
            title={dockCanScrollDown ? "Scroll Assessments Down" : "Reached Bottom"}
            aria-label="Scroll Assessments Down"
          >
            <ChevronDown size={15} />
          </button>

          <div className="as-dock-footer">
            <button
              type="button"
              className="as-dock-add-btn"
              onClick={onCreateNewAssessment}
              title="Create New Assessment"
              aria-label="Create New Assessment"
            >
              <Plus size={18} />
            </button>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════════════════
            2. EXPANDED SIDEBAR OVERLAY (Opens ABOVE the page)
            Matches Module & Lesson Sidebar Overlay Positioning & Dimensions
            ══════════════════════════════════════════════════════════════════ */}
        <aside
          className={`as-sidebar-panel ${isSidebarOpen ? 'is-open' : 'is-closed'}`}
          aria-label="Assessments Sidebar"
          aria-hidden={!isSidebarOpen}
        >
          <div className="as-sidebar-header">
            <div className="as-sidebar-header-top">
              <div className="as-sidebar-title-wrap">
                <div className="as-sidebar-title-icon">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="as-sidebar-main-title">Course Assessments</h3>
                  <p className="as-sidebar-subtitle">
                    {courseAssessments.length} {courseAssessments.length === 1 ? 'Assessment' : 'Assessments'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="as-sidebar-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSidebarOpen(false);
                }}
                title="Collapse Sidebar"
                aria-label="Collapse Sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            <div className="as-sidebar-search-wrap">
              <Search size={14} className="as-sidebar-search-icon" />
              <input
                type="text"
                className="as-sidebar-search-input"
                placeholder="Search assessments..."
                value={sidebarSearchQuery}
                onChange={(e) => setSidebarSearchQuery(e.target.value)}
              />
              {sidebarSearchQuery && (
                <button
                  type="button"
                  className="as-sidebar-search-clear"
                  onClick={() => setSidebarSearchQuery('')}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Up Navigation Arrow for Expanded Sidebar */}
          <button
            type="button"
            className={`as-sidebar-scroll-arrow as-sidebar-scroll-up ${!sidebarCanScrollUp ? 'is-disabled' : ''}`}
            onClick={handleScrollSidebarUp}
            disabled={!sidebarCanScrollUp}
            title={sidebarCanScrollUp ? "Scroll Assessments Up" : "Reached Top"}
            aria-label="Scroll Assessments Up"
          >
            <ChevronUp size={16} />
          </button>

          {/* Independent Scrollable List of Assessment Cards */}
          <div
            className="as-sidebar-items-scrollable"
            ref={sidebarListRef}
            onScroll={handleSidebarScroll}
          >
            {filteredAssessments.length === 0 ? (
              <div className="sidebar-empty-state">
                <div className="empty-circle-icon">
                  <Award size={24} />
                </div>
                <h5>{sidebarSearchQuery ? 'No Matches Found' : 'No Assessments Yet'}</h5>
                <p>
                  {sidebarSearchQuery
                    ? `No assessments match "${sidebarSearchQuery}"`
                    : 'Create comprehensive module-gated milestone assessments for this course.'}
                </p>
                {!sidebarSearchQuery && (
                  <button
                    type="button"
                    className="btn-as-action btn-as-action-primary mt-2"
                    onClick={onCreateNewAssessment}
                  >
                    <Plus size={14} />
                    <span>Create First Assessment</span>
                  </button>
                )}
              </div>
            ) : (
              filteredAssessments.map((ass) => {
                const globalIndex = courseAssessments.findIndex(a => String(a._id) === String(ass._id));
                const code = `A${globalIndex + 1}`;
                const isActive = String(ass._id) === String(selectedAssessmentId);
                const isDraft = (ass.state || 'draft') === 'draft';
                const qCount = (ass.questions || []).length;
                const totalPts = ass.totalMarks || (ass.questions || []).reduce((s, q) => s + (Number(q.marks) || 1), 0);

                return (
                  <div
                    key={ass._id}
                    ref={isActive ? activeSidebarCardRef : null}
                    className={`as-sidebar-card ${isActive ? 'is-active' : ''}`}
                    onClick={() => setSelectedAssessmentId(ass._id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${code}: ${ass.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedAssessmentId(ass._id);
                      }
                    }}
                  >
                    <div className="as-card-top-row">
                      <span className="as-card-id-badge">{code}</span>
                      <span className={`as-card-status-pill ${isDraft ? 'is-draft' : 'is-published'}`}>
                        <span className="as-card-status-dot" />
                        <span>{isDraft ? 'Draft' : 'Published'}</span>
                      </span>
                    </div>

                    <h4 className="as-card-title" title={ass.title}>
                      {ass.title || 'Untitled Assessment'}
                    </h4>

                    <div className="as-card-meta-row">
                      <span>{qCount} {qCount === 1 ? 'Question' : 'Questions'}</span>
                      <span className="as-meta-dot-sep">•</span>
                      <span>{totalPts} {totalPts === 1 ? 'Mark' : 'Marks'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Down Navigation Arrow for Expanded Sidebar */}
          <button
            type="button"
            className={`as-sidebar-scroll-arrow as-sidebar-scroll-down ${!sidebarCanScrollDown ? 'is-disabled' : ''}`}
            onClick={handleScrollSidebarDown}
            disabled={!sidebarCanScrollDown}
            title={sidebarCanScrollDown ? "Scroll Assessments Down" : "Reached Bottom"}
            aria-label="Scroll Assessments Down"
          >
            <ChevronDown size={16} />
          </button>

          <div className="as-sidebar-footer">
            <button
              type="button"
              className="btn-sidebar-create-as"
              onClick={onCreateNewAssessment}
            >
              <Plus size={16} />
              <span>Create Assessment</span>
            </button>
          </div>
        </aside>

        {/* ══════════════════════════════════════════════════════════════════
            3. MAIN CONTENT VIEWPORT (Selected Assessment Dashboard)
            ══════════════════════════════════════════════════════════════════ */}
        <main className="as-main-viewport">
          {!activeAssessment ? (
            <div className="as-main-container-inner">
              <div className="as-card-section text-center p-12">
                <div className="w-16 h-16 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto mb-4">
                  <Award size={32} />
                </div>
                <h3 className="text-xl font-bold text-primary">No Assessment Selected</h3>
                <p className="text-secondary text-sm max-w-md mx-auto mt-2">
                  Create comprehensive, module-gated assessments to evaluate learner understanding of course concepts.
                </p>
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    className="btn-as-action btn-as-action-primary"
                    onClick={onCreateNewAssessment}
                  >
                    <Plus size={16} />
                    <span>Create New Assessment</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="as-main-container-inner">
              {/* Detail Header Card */}
              <div className="as-detail-header-card">
                <div className="as-header-left-group">
                  <span className="as-header-id-badge">
                    A{activeIndex + 1}
                  </span>

                  <div className="as-header-title-box">
                    <div className="as-header-title-row">
                      <h2 className="as-header-title-text" title={activeAssessment.title}>
                        {activeAssessment.title}
                      </h2>
                      <span
                        className={`as-card-status-pill cursor-pointer ${
                          activeAssessment.state === 'published' ? 'is-published' : 'is-draft'
                        }`}
                        onClick={(e) => handleToggleState(activeAssessment._id, e)}
                        title="Click to toggle Draft / Published state"
                      >
                        <span className="as-card-status-dot" />
                        <span>{activeAssessment.state === 'published' ? 'Published' : 'Draft'}</span>
                      </span>
                    </div>
                    <span className="text-xs text-muted">
                      Last updated {new Date(activeAssessment.updatedAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="as-header-actions-group">
                  <button
                    type="button"
                    className="btn-as-action btn-as-action-secondary"
                    onClick={() => onEditAssessment(activeAssessment)}
                    title="Edit Assessment Details and Questions"
                  >
                    <Edit2 size={14} />
                    <span>Edit Assessment</span>
                  </button>

                  <button
                    type="button"
                    className="btn-as-action btn-as-action-secondary"
                    onClick={(e) => handleToggleState(activeAssessment._id, e)}
                    disabled={isTogglingState}
                  >
                    {activeAssessment.state === 'published' ? (
                      <>
                        <Lock size={14} />
                        <span>Unpublish</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Publish</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn-as-action btn-as-action-danger"
                    onClick={() => {
                      setDeleteModalState({
                        isOpen: true,
                        assessmentId: activeAssessment._id,
                        assessmentTitle: activeAssessment.title,
                        assessmentCode: `A${activeIndex + 1}`
                      });
                    }}
                    title="Delete Assessment"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              {/* Card 1: Assessment Overview & Description */}
              <div className="as-card-section">
                <div className="as-card-section-header">
                  <div className="as-section-title-wrap">
                    <div className="as-section-icon-badge">
                      <Award size={16} />
                    </div>
                    <h3 className="as-section-title">Assessment Overview</h3>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="text-base font-bold text-primary">{activeAssessment.title}</h4>
                  <p className="text-sm text-secondary leading-relaxed">
                    {activeAssessment.description || 'No description provided for this assessment.'}
                  </p>
                </div>

                <div className="as-metrics-grid mt-2">
                  <div className="as-metric-pill-card">
                    <span className="as-metric-label">Duration</span>
                    <span className="as-metric-value">{activeTimeLimit} min</span>
                  </div>
                  <div className="as-metric-pill-card">
                    <span className="as-metric-label">Questions</span>
                    <span className="as-metric-value">{activeTotalQuestions}</span>
                  </div>
                  <div className="as-metric-pill-card">
                    <span className="as-metric-label">Total Marks</span>
                    <span className="as-metric-value">{activeTotalMarks}</span>
                  </div>
                  <div className="as-metric-pill-card">
                    <span className="as-metric-label">Avg Marks/Q</span>
                    <span className="as-metric-value">{activeAvgMarks}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Prerequisite Modules Gating */}
              <div className="as-card-section">
                <div className="as-card-section-header">
                  <div className="as-section-title-wrap">
                    <div className="as-section-icon-badge">
                      <Layers size={16} />
                    </div>
                    <h3 className="as-section-title">Prerequisite Modules (Module Gating)</h3>
                  </div>

                  <span className="text-xs font-semibold text-brand">
                    {activeRequiredModuleIds.length} {activeRequiredModuleIds.length === 1 ? 'Module Required' : 'Modules Required'}
                  </span>
                </div>

                <div className="as-gating-callout">
                  <Lock size={16} className="text-brand flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Unlocking Condition:</strong> Learners will unlock this assessment only after 100% completing every lesson in all selected prerequisite modules.
                  </span>
                </div>

                {activeRequiredModuleIds.length === 0 ? (
                  <p className="text-sm text-secondary">
                    No prerequisite modules selected. This assessment is accessible immediately to all enrolled learners.
                  </p>
                ) : (
                  <div className="as-prereq-modules-grid">
                    {activeRequiredModuleIds.map(mId => {
                      const mod = modules.find(m => String(m._id) === mId);
                      const modIdx = modules.findIndex(m => String(m._id) === mId);

                      return (
                        <div key={mId} className="as-prereq-module-card">
                          <span className="as-module-id-badge">M{modIdx + 1}</span>
                          <div className="as-module-info-col">
                            <span className="as-module-card-title">{mod?.title || 'Module'}</span>
                            <span className="as-module-card-meta">
                              {(mod?.lessons || []).length} lessons
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card 3: Questions Overview */}
              <div className="as-card-section">
                <div className="as-card-section-header">
                  <div className="as-section-title-wrap">
                    <div className="as-section-icon-badge">
                      <HelpCircle size={16} />
                    </div>
                    <h3 className="as-section-title">Questions Preview ({activeTotalQuestions})</h3>
                  </div>

                  <button
                    type="button"
                    className="btn-as-action btn-as-action-secondary text-xs"
                    onClick={() => onEditAssessment(activeAssessment)}
                  >
                    <Edit2 size={13} />
                    <span>Manage Questions</span>
                  </button>
                </div>

                {activeQuestions.length === 0 ? (
                  <p className="text-sm text-muted">No questions created yet in this assessment.</p>
                ) : (
                  <div className="as-questions-table-wrap">
                    <table className="as-questions-table">
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>#</th>
                          <th>Question Prompt</th>
                          <th style={{ width: '140px' }}>Type</th>
                          <th style={{ width: '90px' }}>Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeQuestions.map((q, qIdx) => (
                          <tr key={q._id || qIdx}>
                            <td className="font-bold text-muted">Q{qIdx + 1}</td>
                            <td className="font-medium text-primary line-clamp-1">{q.questionText}</td>
                            <td>
                              <span className="as-q-type-badge uppercase">
                                {q.type === 'multiple_response' ? 'Multiple Response' : q.type === 'true_false' ? 'True / False' : 'MCQ'}
                              </span>
                            </td>
                            <td className="font-bold text-brand">{q.marks || 1} pts</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Card 4: Assessment Controls & Configuration */}
              <div className="as-card-section">
                <div className="as-card-section-header">
                  <div className="as-section-title-wrap">
                    <div className="as-section-icon-badge">
                      <Shuffle size={16} />
                    </div>
                    <h3 className="as-section-title">Assessment Controls & Configuration</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg bg-surface-subtle flex flex-col gap-1">
                    <span className="text-xs text-muted font-bold uppercase">Time Limit</span>
                    <span className="text-sm font-semibold text-primary">{activeTimeLimit} Minutes</span>
                  </div>

                  <div className="p-3 border rounded-lg bg-surface-subtle flex flex-col gap-1">
                    <span className="text-xs text-muted font-bold uppercase">Question Order</span>
                    <span className="text-sm font-semibold text-primary">
                      {activeAssessment.shuffleQuestions ? 'Shuffled for Each Learner' : 'Original Instructor Order'}
                    </span>
                  </div>

                  <div className="p-3 border rounded-lg bg-surface-subtle flex flex-col gap-1">
                    <span className="text-xs text-muted font-bold uppercase">Result Visibility</span>
                    <span className="text-sm font-semibold text-primary">
                      {activeAssessment.resultVisibility === 'after_review' ? 'After Instructor Review' : 'Immediate'}
                    </span>
                  </div>
                </div>

                {activeAssessment.instructions && (
                  <div className="p-3 border rounded-lg bg-surface-subtle mt-2 flex flex-col gap-1">
                    <span className="text-xs text-muted font-bold uppercase">Learner Instructions</span>
                    <p className="text-xs text-secondary leading-relaxed">
                      {activeAssessment.instructions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Theme-Styled Delete Confirmation Modal ── */}
      {deleteModalState.isOpen && (
        <div className="as-modal-backdrop" onClick={() => setDeleteModalState({ isOpen: false, assessmentId: null, assessmentTitle: '', assessmentCode: '' })}>
          <div className="as-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="as-modal-header">
              <div className="as-modal-icon-badge icon-danger">
                <Trash2 size={20} />
              </div>
              <h3 className="as-modal-title">Delete Assessment</h3>
            </div>
            <p className="as-modal-body-text">
              Are you sure you want to delete <strong>{deleteModalState.assessmentCode}: {deleteModalState.assessmentTitle}</strong>? This action will permanently remove the assessment and all questions.
            </p>
            <div className="as-modal-actions">
              <button
                type="button"
                className="btn-as-action btn-as-action-secondary"
                onClick={() => setDeleteModalState({ isOpen: false, assessmentId: null, assessmentTitle: '', assessmentCode: '' })}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-as-action btn-as-action-danger"
                onClick={handleDeleteAssessment}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Assessment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
