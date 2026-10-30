import React from 'react';
import {
  Layers,
  Award,
  ArrowRight,
  FileText,
  Video,
  HelpCircle,
  Lock,
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

  const totalVideos = modules.reduce((acc, m) => {
    return acc + (m.lessons || []).reduce((lAcc, l) => {
      const items = l.items || l.contentItems || [];
      return lAcc + items.filter(i => (i.type || '').toLowerCase() === 'video').length;
    }, 0);
  }, 0);

  const totalQuizzes = modules.reduce((acc, m) => {
    return acc + (m.lessons || []).reduce((lAcc, l) => {
      const items = l.items || l.contentItems || [];
      return lAcc + items.filter(i => (i.type || '').toLowerCase() === 'quiz').length;
    }, 0);
  }, 0);

  const totalNotes = modules.reduce((acc, m) => {
    return acc + (m.lessons || []).reduce((lAcc, l) => {
      const items = l.items || l.contentItems || [];
      return lAcc + items.filter(i => ['article', 'article_md', 'note'].includes((i.type || '').toLowerCase())).length;
    }, 0);
  }, 0);

  const totalDocs = modules.reduce((acc, m) => {
    return acc + (m.lessons || []).reduce((lAcc, l) => {
      const items = l.items || l.contentItems || [];
      return lAcc + items.filter(i => ['pdf', 'document'].includes((i.type || '').toLowerCase())).length;
    }, 0);
  }, 0);

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
            Design and organize your curriculum structure, video lectures, notes, quizzes, and module assessments.
          </p>
        </div>
      </div>

      {/* ── Main Navigation Cards Grid (Module & Lessons + Assessment) ── */}
      <div className="content-cards-grid two-cards-grid">
        {/* Card 1: Module & Lessons (Integrated with Notes, Articles, and Documents) */}
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
              <div className="stat-pill" title={`${totalVideos} Video Lectures`}>
                <Video size={13} />
                <span>{totalVideos} {totalVideos === 1 ? 'Video' : 'Videos'}</span>
              </div>
              <div className="stat-pill" title={`${totalQuizzes} Quizzes`}>
                <HelpCircle size={13} />
                <span>{totalQuizzes} {totalQuizzes === 1 ? 'Quiz' : 'Quizzes'}</span>
              </div>
              <div className="stat-pill" title={`${totalNotes} Notes & Articles`}>
                <FileText size={13} />
                <span>{totalNotes} {totalNotes === 1 ? 'Note' : 'Notes'}</span>
              </div>
              {totalDocs > 0 && (
                <div className="stat-pill" title={`${totalDocs} Documents`}>
                  <BookOpen size={13} />
                  <span>{totalDocs} {totalDocs === 1 ? 'Doc' : 'Docs'}</span>
                </div>
              )}
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

        {/* Card 2: Assessment (Module-Gated) */}
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
              <h3 className="card-title">Assessment</h3>
              <p className="card-description">
                Create milestone assessments and define which modules learners must complete before unlocking them.
              </p>
            </div>

            <div className="card-stats-row">
              <div className="stat-pill">
                <Award size={13} />
                <span>{courseAssessments.length} Assessments</span>
              </div>
              <div className="stat-pill">
                <Lock size={13} />
                <span>Module-Gated</span>
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
