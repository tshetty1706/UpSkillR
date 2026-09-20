import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { CourseCreationStepper } from './Stepper/CourseCreationStepper';
import { Step1BasicInfo } from './Step1BasicInfo/Step1BasicInfo';
import { Step2Thumbnail } from './Step2Thumbnail/Step2Thumbnail';
import { Step3Overview } from './Step3Overview/Step3Overview';
import { Step4ReviewCreate } from './Step4ReviewCreate/Step4ReviewCreate';
import { CourseOverviewPreviewModal } from './OverviewTemplate/CourseOverviewPreviewModal';
import { useToast } from '../../../../context/ToastContext';
import './CourseCreationFlow.css';

const DEFAULT_FALLBACK_THUMBNAIL =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80';

export const CourseCreationFlow = ({ user, onCancel, onCourseCreated, onNavigate }) => {
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState(1);

  // Transient Form State (NOT saved to DB until final submission on Step 4)
  const [basicInfo, setBasicInfo] = useState({
    title: '',
    category: '',
    skillLevel: 'Beginner',
    language: 'English',
    shortDescription: '',
    tags: []
  });

  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');

  const [overviewData, setOverviewData] = useState({
    fullDescription: '',
    prerequisites: [],
    learningOutcomes: ['', '', ''],
    skills: [],
    techStack: [],
    targetAudience: [],
    benefits: [],
    certificate: true,
    instructorMessage: '',
    optionalLinks: [],
    faqs: []
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCourse, setCreatedCourse] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const isDirty =
    Boolean(basicInfo.title || basicInfo.shortDescription || thumbnailFile || overviewData.fullDescription);

  const handleStepChange = (targetStep) => {
    if (targetStep <= maxVisitedStep) {
      setCurrentStep(targetStep);
    }
  };

  const advanceToStep = (nextStep) => {
    setCurrentStep(nextStep);
    if (nextStep > maxVisitedStep) {
      setMaxVisitedStep(nextStep);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleThumbnailChange = (file, previewUrl) => {
    setThumbnailFile(file);
    setThumbnailPreview(previewUrl);
  };

  const handleExitRequest = () => {
    if (isDirty && !createdCourse) {
      setShowExitConfirm(true);
    } else {
      onCancel();
    }
  };

  const confirmExitAndDiscard = () => {
    setShowExitConfirm(false);
    onCancel();
  };

  // Final Atomic Course Creation (Section 15.1 & 24)
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const formData = new FormData();

      formData.append('title', basicInfo.title);
      formData.append('category', basicInfo.category);
      formData.append('skillLevel', basicInfo.skillLevel);
      formData.append('language', basicInfo.language);
      formData.append('shortDescription', basicInfo.shortDescription);
      formData.append('tags', JSON.stringify(basicInfo.tags || []));
      formData.append('price', '0');

      // Thumbnail
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      } else if (thumbnailPreview) {
        formData.append('thumbnail', thumbnailPreview);
      } else {
        formData.append('thumbnail', DEFAULT_FALLBACK_THUMBNAIL);
      }

      // Overview object
      const cleanOverview = {
        ...overviewData,
        learningOutcomes: (overviewData.learningOutcomes || []).filter((o) => o && o.trim())
      };
      formData.append('overview', JSON.stringify(cleanOverview));

      const res = await fetch('http://localhost:5000/api/courses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Course created successfully!');
        setCreatedCourse(data.course);
        if (onCourseCreated) {
          onCourseCreated(data.course);
        }
      } else {
        toast.error(data.message || 'Failed to create course. Please review the inputs.');
      }
    } catch (err) {
      console.error('Course Creation Error:', err);
      toast.error('Network error during course creation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="course-creation-flow-root">
      {/* Top Creation App Bar */}
      <header className="creation-flow-appbar">
        <div className="appbar-brand">
          <span className="appbar-logo">UpSkillr</span>
          <span className="appbar-divider">/</span>
          <span className="appbar-subtitle">Course Studio Creation</span>
        </div>

        <button
          type="button"
          className="appbar-exit-btn"
          onClick={handleExitRequest}
          title="Exit Course Creation"
        >
          <X size={18} />
          <span>Exit Studio</span>
        </button>
      </header>

      {/* Stepper Progress Bar */}
      {!createdCourse && (
        <div className="creation-stepper-sticky-wrapper">
          <CourseCreationStepper
            currentStep={currentStep}
            onStepClick={handleStepChange}
            maxVisitedStep={maxVisitedStep}
          />
        </div>
      )}

      {/* Dynamic Step View */}
      <main className="creation-step-container">
        {currentStep === 1 && (
          <Step1BasicInfo
            data={basicInfo}
            onChange={setBasicInfo}
            onNext={() => advanceToStep(2)}
            onCancel={handleExitRequest}
          />
        )}

        {currentStep === 2 && (
          <Step2Thumbnail
            thumbnailFile={thumbnailFile}
            thumbnailPreview={thumbnailPreview}
            onThumbnailChange={handleThumbnailChange}
            onNext={() => advanceToStep(3)}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <Step3Overview
            overviewData={overviewData}
            onChange={setOverviewData}
            onNext={() => advanceToStep(4)}
            onBack={() => setCurrentStep(2)}
            onOpenPreview={() => setIsPreviewOpen(true)}
          />
        )}

        {currentStep === 4 && (
          <Step4ReviewCreate
            basicInfo={basicInfo}
            thumbnailPreview={thumbnailPreview || DEFAULT_FALLBACK_THUMBNAIL}
            overviewData={overviewData}
            onEditStep={(stepNum) => setCurrentStep(stepNum)}
            onOpenPreview={() => setIsPreviewOpen(true)}
            onSubmit={handleFinalSubmit}
            isSubmitting={isSubmitting}
            createdCourse={createdCourse}
            onNavigateAfterCreation={(tab, courseId) => {
              if (onNavigate) {
                onNavigate(tab, courseId);
              } else {
                onCancel();
              }
            }}
          />
        )}
      </main>

      {/* Live Learner Overview Modal Preview */}
      <CourseOverviewPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        course={{
          ...basicInfo,
          thumbnail: thumbnailPreview || DEFAULT_FALLBACK_THUMBNAIL
        }}
        overview={overviewData}
        user={user}
      />

      {/* Discard / Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="exit-modal-backdrop">
          <div className="exit-modal-box">
            <div className="exit-modal-icon">
              <AlertTriangle size={32} />
            </div>
            <h3>Discard Incomplete Course?</h3>
            <p>
              You have unsaved changes. Leaving now will discard all entered details. Per UpSkillr guidelines, incomplete courses are never saved to the database.
            </p>
            <div className="exit-modal-actions">
              <button
                type="button"
                className="btn-exit-cancel"
                onClick={() => setShowExitConfirm(false)}
              >
                Keep Editing
              </button>
              <button
                type="button"
                className="btn-exit-discard"
                onClick={confirmExitAndDiscard}
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
