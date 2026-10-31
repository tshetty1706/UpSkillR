import React, { useState } from 'react';
import { AssessmentDashboard } from './AssessmentDashboard/AssessmentDashboard';
import { AssessmentCreationWizard } from './AssessmentDashboard/AssessmentCreationWizard';

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

  const handleStartCreate = () => {
    setEditingAssessment(null);
    setViewMode('create');
  };

  const handleStartEdit = (assessment) => {
    setEditingAssessment(assessment);
    setViewMode('edit');
  };

  const handleCancelWizard = () => {
    setEditingAssessment(null);
    setViewMode('dashboard');
  };

  const handleSaveSuccess = (savedAssessment) => {
    setViewMode('dashboard');
    setEditingAssessment(null);
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
