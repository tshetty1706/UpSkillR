import React from 'react';
import {
  Layers,
  Award,
  ArrowRight,
  CheckCircle2,
  BookOpen
} from 'lucide-react';

export const CourseContentLanding = ({
  modules = [],
  notes = [],
  courseAssessments = [],
  onNavigateSubView
}) => {
  // Aggregate stats across all lesson items
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const publishedModules = modules.filter(m => m.state === 'published' || m.status === 'published').length;
  const draftModules = modules.length - publishedModules;

  return (
    <div className="course-content-landing">
      {/* ── Toolbar / Header ── */}
      <div className="landing-header-toolbar">
        <div className="landing-title-block">
          <div className="landing-title-row">
            <h2 className="landing-main-title">Course Content</h2>
          </div>
          <p className="landing-subtitle">
            Design and organize your curriculum structure, video lectures, articles, documents, quizzes, and module assessments.
          </p>
        </div>
      </div>

      {/* ── Main Navigation Cards Grid (Module & Lessons + Assessments) ── */}
      <div className="content-cards-grid two-cards-grid">
        {/* Card 1: Module & Lessons */}
        <div
          className="content-nav-card card-modules"
          onClick={() => onNavigateSubView('modules')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateSubView('modules');
            }
          }}
        >
          <div className="card-top-accent accent-brand" />
          <div className="card-content-inner">
            <div className="card-icon-wrapper icon-brand">
              <Layers size={28} />
            </div>

            <div className="card-text-block">
              <h3 className="card-title">Module & Lessons</h3>
              <p className="card-description">
                Build your course structure with modules, lessons, video lectures, quizzes, articles, and documents.
              </p>
            </div>

            <div className="card-stats-row">
              <div className="stat-pill" title={`${modules.length} Modules`}>
                <Layers size={13} />
                <span>{modules.length} {modules.length === 1 ? 'Module' : 'Modules'}</span>
              </div>
              <div className="stat-pill" title={`${totalLessons} Lessons`}>
                <BookOpen size={13} />
                <span>{totalLessons} {totalLessons === 1 ? 'Lesson' : 'Lessons'}</span>
              </div>
            </div>

            <div className="card-meta-status">
              <span className="status-label">Status:</span>
              {modules.length > 0 ? (
                <span className="status-badge-active">
                  <CheckCircle2 size={12} />
                  <span>{publishedModules} Published{draftModules > 0 ? `, ${draftModules} Draft` : ''}</span>
                </span>
              ) : (
                <span className="status-badge-empty">Empty Structure</span>
              )}
            </div>

            <div className="card-footer-action">
              <span className="action-text">Open Editor</span>
              <ArrowRight size={16} className="arrow-icon" />
            </div>
          </div>
        </div>

        {/* Card 2: Assessments */}
        <div
          className="content-nav-card card-assessment"
          onClick={() => onNavigateSubView('assessments')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateSubView('assessments');
            }
          }}
        >
          <div className="card-top-accent accent-amber" />
          <div className="card-content-inner">
            <div className="card-icon-wrapper icon-amber">
              <Award size={28} />
            </div>

            <div className="card-text-block">
              <h3 className="card-title">Assessments</h3>
              <p className="card-description">
                Create milestone assessments and define which modules learners must complete before unlocking them.
              </p>
            </div>

            <div className="card-stats-row">
              <div className="stat-pill" title={`${courseAssessments.length} Assessments`}>
                <Award size={13} />
                <span>{courseAssessments.length} {courseAssessments.length === 1 ? 'Assessment' : 'Assessments'}</span>
              </div>
            </div>

            <div className="card-meta-status">
              <span className="status-label">Unlock Rule:</span>
              <span className="status-badge-gated">
                {modules.length > 0 ? 'Requires Module Completion' : 'Needs ≥ 1 Module'}
              </span>
            </div>

            <div className="card-footer-action">
              <span className="action-text">Open Assessments</span>
              <ArrowRight size={16} className="arrow-icon" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
