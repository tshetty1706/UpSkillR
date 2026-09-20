import React from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { InstructorTip } from '../Common/InstructorTip';
import './DedicatedEditor.css';

export const DedicatedEditorLayout = ({
  courseTitle = 'Course',
  courseStatus = 'draft',
  pageTitle = 'Content Editor',
  breadcrumbSection = 'Content',
  guidanceTitle = 'Instructor Guidance',
  guidanceMessage = '',
  guidanceType = 'tip',
  onBackToWorkspace,
  onTogglePreview,
  previewMode = false,
  showPreviewAction = true,
  children
}) => {
  return (
    <div className="dedicated-editor-root">
      {/* ── Top Dedicated App Bar ── */}
      <header className="dedicated-editor-appbar">
        <div className="appbar-left-group">
          {/* Brand Mark */}
          <div className="appbar-brand-mark">
            <span className="brand-logo-text">UpSkillr</span>
            <span className="brand-badge-studio">STUDIO</span>
          </div>

          <div className="appbar-vertical-divider" />

          {/* Back to Workspace Button */}
          <button
            type="button"
            className="btn-back-to-workspace"
            onClick={onBackToWorkspace}
            title="Return to Course Workspace"
          >
            <ArrowLeft size={16} />
            <span>Back to Workspace</span>
          </button>

          <div className="appbar-vertical-divider" />

          {/* Breadcrumb Hierarchy */}
          <nav className="editor-breadcrumbs" aria-label="Breadcrumb">
            <span className="crumb-segment crumb-courses">Courses</span>
            <ChevronRight size={14} className="crumb-arrow" />
            <span className="crumb-segment crumb-course-name" title={courseTitle}>
              {courseTitle}
            </span>
            <ChevronRight size={14} className="crumb-arrow" />
            <span className="crumb-segment crumb-active">{breadcrumbSection}</span>
          </nav>
        </div>

        <div className="appbar-right-group">
          {/* Course Status Pill */}
          <span className={`status-pill status-${courseStatus}`}>
            <span className="status-dot" />
            <span>{courseStatus === 'published' ? 'Published' : 'Draft'}</span>
          </span>

          {/* Preview as Learner Toggle */}
          {showPreviewAction && (
            <button
              type="button"
              className={`btn-preview-learner-appbar ${previewMode ? 'active' : ''}`}
              onClick={onTogglePreview}
              title={previewMode ? 'Exit simulation mode' : 'Preview progression as learner'}
            >
              {previewMode ? <EyeOff size={15} /> : <Eye size={15} />}
              <span>{previewMode ? 'Exit Preview' : 'Preview as Learner'}</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Main Focused Content Workspace ── */}
      <main className="dedicated-editor-main-container">
        {/* Editor Guidance Banner */}
        {guidanceMessage && !previewMode && (
          <div className="dedicated-guidance-wrapper">
            <InstructorTip
              type={guidanceType}
              title={guidanceTitle}
              message={guidanceMessage}
            />
          </div>
        )}

        {/* Dedicated Page Body */}
        <div className="dedicated-editor-content-card">
          {children}
        </div>
      </main>
    </div>
  );
};
