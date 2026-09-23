import React from 'react';
import {
  Layers,
  BookOpen,
  Award,
  Eye,
  ArrowRight,
  Sparkles,
  FileText,
  Video,
  HelpCircle,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { InstructorTip } from './Common/InstructorTip';

export const CourseContentLanding = ({
  modules = [],
  notes = [],
  courseAssessments = [],
  onNavigateSubView,
  onEnterPreview
}) => {
  // Aggregate stats
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const totalQuizzes = modules.reduce((acc, m) => {
    return acc + (m.lessons || []).reduce((lAcc, l) => {
      const items = l.items || [];
      return lAcc + items.filter(i => i.type?.toLowerCase() === 'quiz').length;
    }, 0);
  }, 0);

  const publishedModules = modules.filter(m => m.state === 'published').length;
  const draftModules = modules.length - publishedModules;

  const articleCount = notes.filter(n => n.type === 'article' || n.type === 'article_md').length;
  const pdfCount = notes.filter(n => n.type === 'pdf').length;
  const imageCount = notes.filter(n => n.type === 'image').length;

  return (
    <div className="course-content-landing">
      {/* ── Toolbar / Header ── */}
      <div className="landing-header-toolbar">
        <div className="landing-title-block">
          <div className="landing-title-row">
            <h2 className="landing-main-title">Course Content</h2>
          </div>
          <p className="landing-subtitle">
            Design and organize your curriculum structure, supplementary materials, and module assessments.
          </p>
        </div>

        <div className="landing-actions-block">
          <button
            type="button"
            className="btn-preview-learner"
            onClick={onEnterPreview}
            title="Experience the course through the learner's eyes with sequential gating"
          >
            <Eye size={16} />
            <span>Preview as Learner</span>
          </button>
        </div>
      </div>

      {/* ── 3 Main Navigation Cards Grid ── */}
      <div className="content-cards-grid">
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
                Build your course structure with modules, lessons, videos and quizzes.
              </p>
            </div>

            <div className="card-stats-row">
              <div className="stat-pill">
                <Layers size={13} />
                <span>{modules.length} {modules.length === 1 ? 'Module' : 'Modules'}</span>
              </div>
              <div className="stat-pill">
                <Video size={13} />
                <span>{totalLessons} {totalLessons === 1 ? 'Lesson' : 'Lessons'}</span>
              </div>
              <div className="stat-pill">
                <HelpCircle size={13} />
                <span>{totalQuizzes} {totalQuizzes === 1 ? 'Quiz' : 'Quizzes'}</span>
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

        {/* Card 2: Notes & Resources */}
        <div
          className="content-nav-card card-resources"
          onClick={() => onNavigateSubView('resources')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onNavigateSubView('resources');
            }
          }}
        >
          <div className="card-top-accent accent-indigo" />
          <div className="card-content-inner">
            <div className="card-icon-wrapper icon-indigo">
              <BookOpen size={28} />
            </div>

            <div className="card-text-block">
              <h3 className="card-title">Notes & Resources</h3>
              <p className="card-description">
                Add supporting articles, PDFs and images to your course.
              </p>
            </div>

            <div className="card-stats-row">
              <div className="stat-pill">
                <FileText size={13} />
                <span>{articleCount} Articles</span>
              </div>
              <div className="stat-pill">
                <BookOpen size={13} />
                <span>{pdfCount} PDFs</span>
              </div>
              <div className="stat-pill">
                <Sparkles size={13} />
                <span>{imageCount} Images</span>
              </div>
            </div>

            <div className="card-meta-status">
              <span className="status-badge-nongating">
                Non-gating supplementary
              </span>
            </div>

            <div className="card-footer-action">
              <span className="action-text">Open Resources</span>
              <ArrowRight size={16} className="arrow-icon" />
            </div>
          </div>
        </div>

        {/* Card 3: Assessment */}
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
                Create assessments and define which modules learners must complete before unlocking them.
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
