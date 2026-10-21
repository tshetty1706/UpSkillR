import React, { useEffect } from 'react';
import { ArrowLeft, X, Eye } from 'lucide-react';
import { CourseOverviewTemplate } from './CourseOverviewTemplate';
import './CourseOverviewPreviewModal.css';

export const CourseOverviewPreviewModal = ({
  isOpen,
  onClose,
  course,
  overview,
  user
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="overview-fullpage-preview" role="dialog" aria-modal="true">
      {/* Sticky Top Header Banner */}
      <header className="overview-preview-sticky-bar">
        <div className="preview-sticky-container">
          <div className="preview-left-group">
            <button
              type="button"
              className="btn-exit-preview-nav"
              onClick={onClose}
              title="Return to Course Creation"
            >
              <ArrowLeft size={18} />
              <span>Exit Learner Preview</span>
            </button>
            <div className="preview-divider" />
            <div className="preview-title-meta">
              <span className="preview-mode-pill">
                <Eye size={12} />
                <span>LEARNER PREVIEW</span>
              </span>
              <span className="preview-course-title" title={course?.title}>
                {course?.title || 'Untitled Course'}
              </span>
            </div>
          </div>

          <div className="preview-right-group">
            <span className="preview-transient-notice">
              Unpublished draft preview
            </span>
            <button
              type="button"
              className="btn-close-preview-circle"
              onClick={onClose}
              aria-label="Close preview"
              title="Close Preview (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Full Page Body */}
      <main className="overview-preview-full-content">
        <div className="overview-preview-body-container">
          <CourseOverviewTemplate
            course={course}
            overview={overview}
            instructor={{
              name: user?.fullName || 'UpSkillr Instructor',
              headline: user?.headline || 'Course Instructor',
              bio: user?.bio || '',
              profilePhoto: user?.profilePhoto || user?.avatar || ''
            }}
            stats={{
              totalEnrolments: 0,
              averageRating: null,
              reviewCount: 0,
              overviewViews: 0
            }}
            reviews={[]}
            questions={[]}
            isPreviewMode={true}
          />
        </div>
      </main>
    </div>
  );
};
