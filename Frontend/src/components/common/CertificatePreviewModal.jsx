import React from 'react';
import { X, Award, CheckCircle2, ShieldCheck, Eye } from 'lucide-react';
import './CertificatePreviewModal.css';

export const CertificatePreviewModal = ({
  isOpen,
  onClose,
  courseTitle = 'Course Title',
  instructorName = 'UpSkillr Instructor',
  instructorDesignation = 'Course Instructor'
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="cert-preview-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cert-preview-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="cert-preview-header">
          <div className="cert-preview-header-title">
            <Award size={20} className="cert-header-icon" />
            <div>
              <h3>Course Certificate Preview</h3>
              <p>Preview of the certificate learners will receive upon completing this course</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-cert-preview-close"
            onClick={onClose}
            aria-label="Close certificate preview"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="cert-preview-notice">
          <ShieldCheck size={18} className="notice-icon" />
          <span>
            Verified with QR code & collision-safe ID. Instructor signature is automatically rendered in cursive script from your profile.
          </span>
        </div>

        {/* Certificate Mockup Canvas */}
        <div className="cert-preview-canvas-wrapper">
          <div className="cert-preview-canvas">
            <img
              src="/assets/certificate_template_raw.png"
              alt="UpSkillR Certificate Template"
              className="cert-bg-image"
              onError={(e) => {
                e.target.src = '/assets/certificate_template.png';
              }}
            />
            {/* Dynamic Overlay Elements positioned precisely */}
            <div className="cert-overlay-layer">
              {/* Student Name Box */}
              <div className="cert-student-box">
                <span className="cert-student-name">Jane Doe</span>
              </div>

              {/* Course Title Box */}
              <div className="cert-course-box">
                <span className="cert-course-title">{courseTitle || 'Course Title'}</span>
              </div>

              {/* Meta Row: Date & ID */}
              <div className="cert-date-box">
                <span className="cert-meta-val">{todayStr}</span>
              </div>
              <div className="cert-id-box">
                <span className="cert-meta-val">UPSK-2026-SAMPLE</span>
              </div>

              {/* Instructor Signature & Designation */}
              <div className="cert-signature-box">
                <span className="cert-cursive-signature">{instructorName || 'Instructor'}</span>
              </div>
              <div className="cert-instructor-box">
                <span className="cert-instructor-name">{instructorName || 'Instructor Name'}</span>
                <span className="cert-instructor-role">{instructorDesignation || 'Course Instructor'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="cert-preview-footer">
          <div className="cert-preview-info-tags">
            <span className="info-tag">
              <CheckCircle2 size={14} /> 1024x682 High-Res PNG
            </span>
            <span className="info-tag">
              <CheckCircle2 size={14} /> Cloudinary Stored
            </span>
            <span className="info-tag">
              <CheckCircle2 size={14} /> Publicly Verifiable
            </span>
          </div>
          <button type="button" className="btn-cert-preview-done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
