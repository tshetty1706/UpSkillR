import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { CourseOverviewTemplate } from './CourseOverviewTemplate';
import './CourseOverviewPreviewModal.css';

export const CourseOverviewPreviewModal = ({
  isOpen,
  onClose,
  course,
  overview,
  user
}) => {
  if (!isOpen) return null;

  return (
    <div className="overview-modal-backdrop" onClick={onClose}>
      <div className="overview-modal-wrapper" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="overview-modal-header">
          <div className="modal-title-group">
            <span className="modal-live-tag">LIVE PREVIEW</span>
            <h2>Learner Course Overview Preview</h2>
            <p>This is exactly how prospective learners will see your course before enrolling.</p>
          </div>
          <button
            type="button"
            className="modal-close-icon-btn"
            onClick={onClose}
            aria-label="Close preview modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="overview-modal-scroll-body">
          <CourseOverviewTemplate
            course={course}
            overview={overview}
            instructor={{
              name: user?.fullName || 'UpSkillr Instructor',
              headline: user?.headline || 'Course Instructor',
              bio: user?.bio || '',
              profilePhoto: user?.profilePhoto || ''
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

        {/* Modal Footer */}
        <div className="overview-modal-footer">
          <span className="modal-footer-note">
            Preview is rendered purely from your transient form inputs. No draft record has been saved.
          </span>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
