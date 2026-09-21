import React, { useState, useEffect } from 'react';
import { DedicatedEditorLayout } from './DedicatedEditorLayout';
import { ModuleLessonEditor } from '../ModuleLessonEditor';
import { NotesResourcesEditor } from '../NotesResourcesEditor';
import { AssessmentEditor } from '../AssessmentEditor';
import { LearnerPreview } from '../LearnerPreview';
import { useToast } from '../../../../../../context/ToastContext';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { API_BASE } from '../../../../../../config/api';

export const DedicatedContentEditorPage = ({
  editorType = 'content-modules', // 'content-modules' | 'content-resources' | 'content-assessments'
  courseId,
  user,
  onBackToWorkspace,
  onNavigate
}) => {
  const { toast } = useToast();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [notes, setNotes] = useState([]);
  const [courseAssessments, setCourseAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const getAuthHeader = () => {
    const token = localStorage.getItem('upskillr_token');
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  };

  useEffect(() => {
    if (courseId) {
      loadCourseAndCurriculum();
    }
  }, [courseId]);

  const loadCourseAndCurriculum = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      // 1. Fetch course metadata
      const courseRes = await fetch(`${API_BASE}/courses/${courseId}`, {
        headers: getAuthHeader()
      });
      const courseData = await courseRes.json();

      if (!courseRes.ok || !courseData.success) {
        setErrorMessage(courseData.message || 'Course not found or access denied.');
        setLoading(false);
        return;
      }

      setCourse(courseData.course);

      // 2. Fetch full curriculum tree
      const curRes = await fetch(`${API_BASE}/courses/${courseId}/curriculum`, {
        headers: getAuthHeader()
      });
      const curData = await curRes.json();

      if (curData.success) {
        setModules(curData.modules || []);
        setNotes(curData.notes || []);
        setCourseAssessments(curData.courseAssessments || []);
      } else {
        toast.error(curData.message || 'Failed to fetch curriculum data');
      }
    } catch (err) {
      console.error('Error loading dedicated editor data:', err);
      setErrorMessage('Network error connecting to course servers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const refreshCurriculum = async () => {
    try {
      const curRes = await fetch(`${API_BASE}/courses/${courseId}/curriculum`, {
        headers: getAuthHeader()
      });
      const curData = await curRes.json();
      if (curData.success) {
        setModules(curData.modules || []);
        setNotes(curData.notes || []);
        setCourseAssessments(curData.courseAssessments || []);
      }
    } catch (err) {
      console.error('Failed to refresh curriculum:', err);
    }
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="dedicated-editor-root">
        <div className="dedicated-editor-loading-state">
          <RefreshCw size={36} className="spinner-rotate text-brand" />
          <p>Loading Course Studio Editor...</p>
        </div>
      </div>
    );
  }

  // Error / Access Denied Screen
  if (errorMessage || !course) {
    return (
      <div className="dedicated-editor-root">
        <div className="dedicated-editor-error-state">
          <AlertCircle size={44} className="text-danger" />
          <h3>Unable to Load Course Editor</h3>
          <p>{errorMessage || 'The requested course does not exist or you do not have instructor permissions to edit it.'}</p>
          <button
            type="button"
            className="btn-primary-action"
            onClick={onBackToWorkspace}
          >
            Return to Workspace
          </button>
        </div>
      </div>
    );
  }

  // Configuration per editorType
  const editorConfigs = {
    'content-modules': {
      pageTitle: 'Module & Lesson',
      breadcrumbSection: 'Module & Lesson',
      guidanceTitle: 'Module & Lesson Editor',
      guidanceType: 'sparkle',
    },
    'content-resources': {
      pageTitle: 'Notes & Resources',
      breadcrumbSection: 'Notes & Resources',
      guidanceTitle: 'Notes & Supplementary Resources',
      guidanceType: 'info',
    },
    'content-assessments': {
      pageTitle: 'Course Assessment',
      breadcrumbSection: 'Course Assessment',
      guidanceTitle: 'Milestone Assessment Editor',
      guidanceType: 'warning',
    }
  };

  const currentConfig = editorConfigs[editorType] || editorConfigs['content-modules'];

  return (
    <DedicatedEditorLayout
      courseTitle={course.title || 'Untitled Course'}
      courseStatus={course.status || 'draft'}
      pageTitle={currentConfig.pageTitle}
      breadcrumbSection={currentConfig.breadcrumbSection}
      guidanceTitle={currentConfig.guidanceTitle}
      guidanceType={currentConfig.guidanceType}
      onBackToWorkspace={onBackToWorkspace}
      onTogglePreview={() => setPreviewMode(!previewMode)}
      previewMode={previewMode}
      showPreviewAction={true}
    >
      {/* ── Preview Simulation Mode ── */}
      {previewMode ? (
        <LearnerPreview
          modules={modules}
          notes={notes}
          courseAssessments={courseAssessments}
          onExitPreview={() => setPreviewMode(false)}
          toast={toast}
        />
      ) : (
        <>
          {/* ── 1. MODULE & LESSONS EDITOR ── */}
          {editorType === 'content-modules' && (
            <ModuleLessonEditor
              courseId={courseId}
              modules={modules}
              onBack={onBackToWorkspace}
              onCurriculumUpdated={refreshCurriculum}
              apiBase={API_BASE}
              getAuthHeader={getAuthHeader}
              toast={toast}
            />
          )}

          {/* ── 2. NOTES & RESOURCES EDITOR ── */}
          {editorType === 'content-resources' && (
            <NotesResourcesEditor
              courseId={courseId}
              modules={modules}
              notes={notes}
              onBack={onBackToWorkspace}
              onCurriculumUpdated={refreshCurriculum}
              apiBase={API_BASE}
              getAuthHeader={getAuthHeader}
              toast={toast}
            />
          )}

          {/* ── 3. ASSESSMENT EDITOR ── */}
          {editorType === 'content-assessments' && (
            <AssessmentEditor
              courseId={courseId}
              modules={modules}
              courseAssessments={courseAssessments}
              onBack={onBackToWorkspace}
              onNavigateToModules={() => {
                if (onNavigate) {
                  onNavigate('content-modules', courseId);
                }
              }}
              onCurriculumUpdated={refreshCurriculum}
              apiBase={API_BASE}
              getAuthHeader={getAuthHeader}
              toast={toast}
            />
          )}
        </>
      )}
    </DedicatedEditorLayout>
  );
};
