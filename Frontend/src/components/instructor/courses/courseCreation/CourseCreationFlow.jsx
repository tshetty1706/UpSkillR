import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { CourseCreationStepper } from './Stepper/CourseCreationStepper';
import { Step1BasicInfo } from './Step1BasicInfo/Step1BasicInfo';
import { Step2Thumbnail } from './Step2Thumbnail/Step2Thumbnail';
import { Step3Overview } from './Step3Overview/Step3Overview';
import { Step4ReviewCreate } from './Step4ReviewCreate/Step4ReviewCreate';
import { CourseOverviewPreviewModal } from './OverviewTemplate/CourseOverviewPreviewModal';
import { useToast } from '../../../../context/ToastContext';
import { API_BASE } from '../../../../config/api';
import { lightThumbnail } from '../../../../utils/thumbnailUtils';
import './CourseCreationFlow.css';

const DEFAULT_FALLBACK_THUMBNAIL = lightThumbnail;

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

  // Final Course Creation submission logic
  const handleFinalSubmit = async () => {
    if (!basicInfo.title || !basicInfo.title.trim()) {
      toast.error('Please enter a course title in Step 1');
      setCurrentStep(1);
      return;
    }
    if (!basicInfo.category || !basicInfo.category.trim()) {
      toast.error('Please select a course category in Step 1');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = sessionStorage.getItem('upskillr_token');
      const formData = new FormData();
      formData.append('title', basicInfo.title.trim());
      formData.append('category', basicInfo.category.trim());
      formData.append('skillLevel', basicInfo.skillLevel || 'Beginner');
      formData.append('language', basicInfo.language || 'English');
      formData.append('shortDescription', (basicInfo.shortDescription || '').trim());
      formData.append('description', (basicInfo.shortDescription || '').trim());
      formData.append('fullDescription', (overviewData.fullDescription || '').trim());
      formData.append('certificate', overviewData.certificate ? 'true' : 'false');

      (overviewData.learningOutcomes || []).forEach(item => {
        if (item && item.trim()) formData.append('whatYouWillLearn', item.trim());
      });
      (overviewData.skills || []).forEach(skill => {
        if (skill && skill.trim()) formData.append('skills', skill.trim());
      });
      (overviewData.techStack || []).forEach(tech => {
        if (tech && tech.trim()) formData.append('techStack', tech.trim());
      });
      (overviewData.prerequisites || []).forEach(pre => {
        if (pre && pre.trim()) formData.append('prerequisites', pre.trim());
      });
      (basicInfo.tags || []).forEach(tag => {
        if (tag && tag.trim()) formData.append('tags', tag.trim());
      });

      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      } else if (thumbnailPreview && typeof thumbnailPreview === 'string' && thumbnailPreview.trim()) {
        formData.append('thumbnail', thumbnailPreview.trim());
      }

      const res = await fetch(`${API_BASE}/courses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success && data.course) {
        toast.success('Course created successfully as Draft!');
        setCreatedCourse(data.course);
        if (onCourseCreated) {
          onCourseCreated(data.course);
        }
      } else {
        toast.error(data.message || 'Failed to create course');
      }
    } catch (err) {
      console.error('Error creating course:', err);
      toast.error('Network error creating course. Please try again.');
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
            thumbnailPreview={thumbnailPreview || ''}
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
          thumbnail: thumbnailPreview || ''
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
