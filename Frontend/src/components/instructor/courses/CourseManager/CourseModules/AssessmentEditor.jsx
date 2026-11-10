import React, { useState, useEffect, useCallback } from 'react';
import { AssessmentDashboard } from './AssessmentDashboard/AssessmentDashboard';
import { AssessmentCreationWizard } from './AssessmentDashboard/AssessmentCreationWizard';

const getAssessmentIdFromLocation = () => {
  const pathMatch = window.location.pathname.match(
    /\/instructor\/courses\/[a-f0-9]{24}\/(?:content\/)?assessments\/([a-f0-9]{24})(?:\/|$)/i
  );
  if (pathMatch) return pathMatch[1];
  return new URLSearchParams(window.location.search).get('assessmentId') || null;
};

export const AssessmentEditor = ({
  courseId,
  modules = [],
  courseAssessments = [],
  onBack,
  onNavigateToModules,
  onCurriculumUpdated,
  apiBase = 'http://localhost:5000/api',
  getAuthHeader = () => ({}),
  toast
}) => {
  // 'dashboard' | 'create' | 'edit'
  const [viewMode, setViewMode] = useState('dashboard');
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [initialEditStep, setInitialEditStep] = useState(1);

  const [selectedAssessmentId, setSelectedAssessmentId] = useState(() => {
    const fromUrl = getAssessmentIdFromLocation();
    if (fromUrl && courseAssessments.some(a => String(a._id) === String(fromUrl))) {
      return fromUrl;
    }
    return fromUrl || (courseAssessments.length > 0 ? courseAssessments[0]._id : null);
  });

  const syncUrlToAssessment = useCallback((assessmentId) => {
    if (!courseId) return;
    const isDedicatedAssessmentsRoute = /\/instructor\/courses\/[a-f0-9]{24}\/(?:content\/)?assessments/i.test(
      window.location.pathname
    );
    if (!isDedicatedAssessmentsRoute) return;

    const targetPath = assessmentId
      ? `/instructor/courses/${courseId}/content/assessments/${assessmentId}`
      : `/instructor/courses/${courseId}/content/assessments`;

    if (window.location.pathname !== targetPath) {
      window.history.replaceState({}, '', targetPath);
    }
  }, [courseId]);

  const handleSelectAssessment = useCallback((assessmentId) => {
    setSelectedAssessmentId(assessmentId || null);
    syncUrlToAssessment(assessmentId || null);
  }, [syncUrlToAssessment]);

  // Keep selectedAssessmentId synchronized with route changes & curriculum updates
  useEffect(() => {
    const syncFromLocation = () => {
      const urlId = getAssessmentIdFromLocation();
      if (urlId && courseAssessments.some(a => String(a._id) === String(urlId))) {
        setSelectedAssessmentId(urlId);
      }
    };
    window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('upskillr_navigate', syncFromLocation);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.removeEventListener('upskillr_navigate', syncFromLocation);
    };
  }, [courseAssessments]);

  useEffect(() => {
    if (courseAssessments.length > 0) {
      const exists = courseAssessments.some(a => String(a._id) === String(selectedAssessmentId));
      if (!exists) {
        const firstId = courseAssessments[0]._id;
        setSelectedAssessmentId(firstId);
        syncUrlToAssessment(firstId);
      } else {
        syncUrlToAssessment(selectedAssessmentId);
      }
    } else if (selectedAssessmentId !== null) {
      setSelectedAssessmentId(null);
      syncUrlToAssessment(null);
    }
  }, [courseAssessments, selectedAssessmentId, syncUrlToAssessment]);

  const handleStartCreate = () => {
    setEditingAssessment(null);
    setInitialEditStep(0);
    setViewMode('create');
  };

  const handleStartEdit = (assessment, step = 1) => {
    if (assessment?._id) {
      handleSelectAssessment(assessment._id);
    }
    setEditingAssessment(assessment);
    setInitialEditStep(step);
    setViewMode('edit');
  };

  const handleCancelWizard = () => {
    setEditingAssessment(null);
    setInitialEditStep(1);
    setViewMode('dashboard');
  };

  const handleSaveSuccess = (savedAssessment) => {
    if (savedAssessment?._id) {
      handleSelectAssessment(savedAssessment._id);
    }
    setViewMode('dashboard');
    setEditingAssessment(null);
    setInitialEditStep(1);
    if (onCurriculumUpdated) {
      onCurriculumUpdated();
    }
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <AssessmentCreationWizard
        courseId={courseId}
        modules={modules}
        initialAssessment={editingAssessment}
        initialStep={viewMode === 'edit' ? initialEditStep : 0}
        onCancel={handleCancelWizard}
        onSaveSuccess={handleSaveSuccess}
        apiBase={apiBase}
        getAuthHeader={getAuthHeader}
        toast={toast}
      />
    );
  }

  return (
    <AssessmentDashboard
      courseId={courseId}
      modules={modules}
      courseAssessments={courseAssessments}
      selectedAssessmentId={selectedAssessmentId}
      onSelectAssessment={handleSelectAssessment}
      onBack={onBack}
      onNavigateToModules={onNavigateToModules}
      onCurriculumUpdated={onCurriculumUpdated}
      onCreateNewAssessment={handleStartCreate}
      onEditAssessment={handleStartEdit}
      apiBase={apiBase}
      getAuthHeader={getAuthHeader}
      toast={toast}
    />
  );
};
