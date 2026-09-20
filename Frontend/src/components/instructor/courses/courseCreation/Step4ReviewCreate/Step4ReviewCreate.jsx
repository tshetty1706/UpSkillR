import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Check,
  Edit3,
  Eye,
  Award,
  Layers,
  Globe,
  Tag,
  Loader2,
  Sparkles,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import './Step4ReviewCreate.css';

export const Step4ReviewCreate = ({
  basicInfo,
  thumbnailPreview,
  overviewData,
  onEditStep,
  onOpenPreview,
  onSubmit,
  isSubmitting,
  createdCourse = null,
  onNavigateAfterCreation
}) => {
  if (createdCourse) {
    return (
      <div className="creation-success-wrapper">
        <div className="success-icon-badge">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="success-title">Course Created Successfully as Draft!</h2>
        <p className="success-subtitle">
          Your course identity, thumbnail, and learner overview have been saved. Your course currently has 0 modules/lessons.
        </p>

        <div className="success-actions-row">
          <button
            type="button"
            className="btn-success-workspace"
            onClick={() => onNavigateAfterCreation('manage-course', createdCourse._id)}
          >
            <span>Open Course Workspace</span>
            <ArrowRight size={18} />
          </button>
          <button
            type="button"
            className="btn-success-mycourses"
            onClick={() => onNavigateAfterCreation('my-courses')}
          >
            <span>Go to My Courses</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="step-review-layout">
      {/* Header */}
      <div className="step-review-header">
        <span className="step-badge-tag">STEP 4 • FINAL REVIEW</span>
        <h1 className="step-review-heading">
          Review & <span className="accent-highlight">Create Course</span>
        </h1>
        <p className="step-review-subheading">
          Double-check all your course details before publishing the draft. You can edit any individual section below.
        </p>
      </div>

      <div className="review-cards-grid">
        {/* Card 1: Basic Information */}
        <div className="review-summary-card">
          <div className="review-card-top">
            <div className="review-card-title-wrap">
              <BookOpen size={20} className="review-header-icon" />
              <h3>Basic Information</h3>
            </div>
            <button
              type="button"
              className="btn-edit-shortcut"
              onClick={() => onEditStep(1)}
              title="Edit Basic Information"
            >
              <Edit3 size={15} />
              <span>Edit</span>
            </button>
          </div>

          <div className="review-data-rows">
            <div className="review-item">
              <span className="review-item-label">Title</span>
              <span className="review-item-val font-bold">{basicInfo.title || 'Untitled'}</span>
            </div>

            <div className="review-item-row-2">
              <div className="review-item">
                <span className="review-item-label">Category</span>
                <span className="review-item-val">{basicInfo.category || '—'}</span>
              </div>
              <div className="review-item">
                <span className="review-item-label">Level</span>
                <span className="review-item-val">{basicInfo.skillLevel || 'Beginner'}</span>
              </div>
            </div>

            <div className="review-item">
              <span className="review-item-label">Language</span>
              <span className="review-item-val">{basicInfo.language || 'English'}</span>
            </div>

            <div className="review-item">
              <span className="review-item-label">Short Description</span>
              <span className="review-item-val text-muted">{basicInfo.shortDescription || '—'}</span>
            </div>

            {basicInfo.tags && basicInfo.tags.length > 0 && (
              <div className="review-item">
                <span className="review-item-label">Tags</span>
                <div className="review-chips-wrap">
                  {basicInfo.tags.map((t, idx) => (
                    <span key={idx} className="review-chip">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Course Thumbnail */}
        <div className="review-summary-card">
          <div className="review-card-top">
            <div className="review-card-title-wrap">
              <Layers size={20} className="review-header-icon" />
              <h3>Course Thumbnail</h3>
            </div>
            <button
              type="button"
              className="btn-edit-shortcut"
              onClick={() => onEditStep(2)}
              title="Edit Thumbnail"
            >
              <Edit3 size={15} />
              <span>Edit</span>
            </button>
          </div>

          <div className="review-thumb-preview-box">
            <img
              src={thumbnailPreview || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'}
              alt="Course Thumbnail"
              className="review-thumb-img"
            />
          </div>
        </div>

        {/* Card 3: Course Overview */}
        <div className="review-summary-card review-card-span-2">
          <div className="review-card-top">
            <div className="review-card-title-wrap">
              <Sparkles size={20} className="review-header-icon" />
              <h3>Course Overview</h3>
            </div>
            <div className="review-actions-inline">
              <button
                type="button"
                className="btn-preview-shortcut"
                onClick={onOpenPreview}
                title="Preview Learner View"
              >
                <Eye size={15} />
                <span>Preview Learner View</span>
              </button>
              <button
                type="button"
                className="btn-edit-shortcut"
                onClick={() => onEditStep(3)}
                title="Edit Overview"
              >
                <Edit3 size={15} />
                <span>Edit</span>
              </button>
            </div>
          </div>

          <div className="review-data-rows">
            <div className="review-item">
              <span className="review-item-label">Course Description</span>
              <p className="review-desc-snippet">
                {overviewData.fullDescription || 'No description provided.'}
              </p>
            </div>

            {overviewData.skills && overviewData.skills.length > 0 && (
              <div className="review-item">
                <span className="review-item-label">Skills You'll Gain ({overviewData.skills.length})</span>
                <div className="review-skills-point-list">
                  {overviewData.skills.map((skill, idx) => (
                    <span key={idx} className="review-skill-point-chip">
                      <span className="review-point-marker">
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span>{skill}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="review-grid-3">
              <div className="review-item">
                <span className="review-item-label">Prerequisites ({overviewData.prerequisites?.length || 0})</span>
                <div className="review-chips-wrap">
                  {(overviewData.prerequisites || []).map((p, idx) => (
                    <span key={idx} className="review-chip">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="review-item">
                <span className="review-item-label">Learning Outcomes ({overviewData.learningOutcomes?.length || 0})</span>
                <ul className="review-list-compact">
                  {(overviewData.learningOutcomes || []).slice(0, 3).map((o, idx) => (
                    <li key={idx}>{o}</li>
                  ))}
                  {(overviewData.learningOutcomes || []).length > 3 && (
                    <li className="text-muted">+ {overviewData.learningOutcomes.length - 3} more</li>
                  )}
                </ul>
              </div>

              <div className="review-item">
                <span className="review-item-label">Certificate</span>
                <div className="cert-status-pill">
                  <Award size={16} className="accent-green" />
                  <span>
                    {overviewData.certificate !== false ? 'Certificate Included' : 'No Certificate'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Note Banner */}
      <div className="curriculum-notice-banner">
        <Layers size={22} className="banner-icon" />
        <div className="banner-text">
          <h4>Course Curriculum Phase</h4>
          <p>
            Your course will be created with <strong>0 modules and 0 lessons</strong>. Once created, you can author lessons, attach resources, and configure assessments at any time from your Course Manager.
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="step-actions-footer">
        <button
          type="button"
          className="btn-secondary-action"
          onClick={() => onEditStep(3)}
          disabled={isSubmitting}
        >
          <ArrowLeft size={18} />
          <span>Back to Overview</span>
        </button>

        <button
          type="button"
          className="btn-create-course-final"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="spinner-rotate" />
              <span>Creating Course...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Create Course</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
