import React, { useState, useEffect } from 'react';
import { useToast } from '../../../../../context/ToastContext';
import { CourseContentLanding } from './CourseContentLanding';
import { ModuleLessonEditor } from './ModuleLessonEditor';
import { NotesResourcesEditor } from './NotesResourcesEditor';
import { AssessmentEditor } from './AssessmentEditor';
import { LearnerPreview } from './LearnerPreview';
import './CourseModules.css';
import { API_BASE } from '../../../../../config/api';

export const CourseModules = ({ courseId, course, onCurriculumUpdated, onNavigate }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // Curriculum Data
  const [modules, setModules] = useState([]);
  const [notes, setNotes] = useState([]);
  const [courseAssessments, setCourseAssessments] = useState([]);

  // Sub-view navigation: 'landing' | 'modules' | 'resources' | 'assessments' | 'preview'
  const [contentSubView, setContentSubView] = useState('landing');

  // Auth token helper
  const getAuthHeader = () => {
    const token = sessionStorage.getItem('upskillr_token');
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  };

  useEffect(() => {
    if (courseId) {
      fetchCurriculum();
    }
  }, [courseId]);

  const fetchCurriculum = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/curriculum`, {
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.success) {
        setModules(data.modules || []);
        setNotes(data.notes || []);
        setCourseAssessments(data.courseAssessments || []);
      } else {
        toast.error(data.message || 'Failed to fetch curriculum tree');
      }
    } catch (err) {
      console.error('Error fetching curriculum tree:', err);
      toast.error('Network error loading curriculum tree');
    } finally {
      setLoading(false);
    }
  };

  const handleCurriculumUpdated = () => {
    fetchCurriculum();
    if (onCurriculumUpdated) {
      onCurriculumUpdated();
    }
  };

  if (loading && modules.length === 0 && notes.length === 0 && courseAssessments.length === 0) {
    return (
      <div className="curriculum-loading-state">
        <div className="mini-spinner" />
        <p>Loading course content...</p>
      </div>
    );
  }

  return (
    <div className="course-content-root-wrapper">
      {/* ── Sub-view 1: Landing Hub with 3 Clean Cards ── */}
      {contentSubView === 'landing' && (
        <CourseContentLanding
          modules={modules}
          notes={notes}
          courseAssessments={courseAssessments}
          onNavigateSubView={(subView) => {
            if (onNavigate) {
              onNavigate('content-' + subView, courseId);
            } else {
              setContentSubView(subView);
            }
          }}
          onEnterPreview={() => setContentSubView('preview')}
        />
      )}

      {/* ── Sub-view 2: Module & Lessons Dedicated Editor ── */}
      {contentSubView === 'modules' && (
        <ModuleLessonEditor
          courseId={courseId}
          course={course}
          modules={modules}
          notes={notes}
          onBack={() => setContentSubView('landing')}
          onCurriculumUpdated={handleCurriculumUpdated}
          onEnterPreview={() => setContentSubView('preview')}
          apiBase={API_BASE}
          getAuthHeader={getAuthHeader}
          toast={toast}
        />
      )}

      {/* ── Sub-view 3: Notes & Resources Dedicated Editor ── */}
      {contentSubView === 'resources' && (
        <NotesResourcesEditor
          courseId={courseId}
          modules={modules}
          notes={notes}
          onBack={() => setContentSubView('landing')}
          onCurriculumUpdated={handleCurriculumUpdated}
          apiBase={API_BASE}
          getAuthHeader={getAuthHeader}
          toast={toast}
        />
      )}

      {/* ── Sub-view 4: Assessment Dedicated Editor ── */}
      {contentSubView === 'assessments' && (
        <AssessmentEditor
          courseId={courseId}
          modules={modules}
          courseAssessments={courseAssessments}
          onBack={() => setContentSubView('landing')}
          onNavigateToModules={() => setContentSubView('modules')}
          onCurriculumUpdated={handleCurriculumUpdated}
          apiBase={API_BASE}
          getAuthHeader={getAuthHeader}
          toast={toast}
        />
      )}

      {/* ── Sub-view 5: Learner Preview Simulation ── */}
      {contentSubView === 'preview' && (
        <LearnerPreview
          modules={modules}
          notes={notes}
          courseAssessments={courseAssessments}
          onExitPreview={() => setContentSubView('landing')}
          toast={toast}
        />
      )}
    </div>
  );
};
