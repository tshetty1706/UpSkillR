import React, { useState, useEffect } from 'react';
import { InstructorLayout } from '../../components/instructor/common/InstructorLayout/InstructorLayout';
import { InstructorSidebar } from '../../components/instructor/common/InstructorSidebar/InstructorSidebar';
import { InstructorDashboardOverview } from '../../components/instructor/dashboard/InstructorDashboardOverview/InstructorDashboardOverview';
import { MyCourses } from '../../components/instructor/courses/MyCourses/MyCourses';
import { CourseManager } from '../../components/instructor/courses/CourseManager/CourseManager';
import { CourseCreationFlow } from '../../components/instructor/courses/courseCreation/CourseCreationFlow';
import { DedicatedContentEditorPage } from '../../components/instructor/courses/CourseManager/CourseModules/DedicatedEditor/DedicatedContentEditorPage';
import { InstructorQuestionsManager } from '../../components/instructor/questions/InstructorQuestionsManager';
import { InstructorProfile } from '../../components/instructor/profile/InstructorProfile/InstructorProfile';
import { InstructorAnalytics } from '../../components/instructor/analytics/InstructorAnalytics/InstructorAnalytics';
import { InstructorAssessmentsReview } from '../../components/instructor/assessments/InstructorAssessmentsReview';
import { useToast } from '../../context/ToastContext';
import { API_BASE } from '../../config/api';

export const InstructorDashboard = ({ user, onLogout }) => {
  const { toast } = useToast();
  const getInitialRoute = () => {
    const path = window.location.pathname;

    // Dedicated Content Editor standalone routes
    const modulesMatch = path.match(/\/instructor\/courses\/([a-f0-9]{24})\/content\/modules/i);
    if (modulesMatch) {
      return { tab: 'content-modules', courseId: modulesMatch[1] };
    }
    const resourcesMatch = path.match(/\/instructor\/courses\/([a-f0-9]{24})\/content\/resources/i);
    if (resourcesMatch) {
      return { tab: 'content-resources', courseId: resourcesMatch[1] };
    }
    const assessmentsMatch = path.match(/\/instructor\/courses\/([a-f0-9]{24})\/content\/assessments/i);
    if (assessmentsMatch) {
      return { tab: 'content-assessments', courseId: assessmentsMatch[1] };
    }

    const workspaceMatch = path.match(/\/instructor\/courses\/([a-f0-9]{24})\/workspace/i);
    if (workspaceMatch) {
      return { tab: 'manage-course', courseId: workspaceMatch[1] };
    }
    if (path.startsWith('/instructor/courses/create')) {
      return { tab: 'create-course', courseId: null };
    }
    if (path.startsWith('/instructor/courses')) {
      return { tab: 'my-courses', courseId: null };
    }
    if (path.startsWith('/instructor/assessments')) {
      return { tab: 'assessments', courseId: null };
    }
    if (path.startsWith('/instructor/analytics')) {
      return { tab: 'analytics', courseId: null };
    }
    if (path.startsWith('/instructor/inquiries')) {
      return { tab: 'inquiries', courseId: null };
    }
    if (path.startsWith('/instructor/profile')) {
      return { tab: 'profile', courseId: null };
    }
    return { tab: 'dashboard', courseId: null };
  };

  const initialRoute = getInitialRoute();
  const [activeTab, setActiveTab] = useState(initialRoute.tab);
  const [selectedCourseId, setSelectedCourseId] = useState(initialRoute.courseId);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    publishedCourses: 0,
    draftCourses: 0,
    totalLearners: 0,
    averageRating: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstructorData();

    const syncRouteFromPath = () => {
      const route = getInitialRoute();
      setActiveTab(route.tab);
      setSelectedCourseId(route.courseId);
    };

    window.addEventListener('popstate', syncRouteFromPath);
    return () => window.removeEventListener('popstate', syncRouteFromPath);
  }, []);

  const fetchInstructorData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`${API_BASE}/courses/instructor/my-courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setCourses(data.courses || []);
        setStats(
          data.stats || {
            totalCourses: 0,
            publishedCourses: 0,
            draftCourses: 0,
            totalLearners: 0,
            averageRating: null
          }
        );
      }
    } catch (err) {
      console.error('Failed to fetch instructor courses', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (tab, courseId = null) => {
    setActiveTab(tab);
    if (courseId) {
      setSelectedCourseId(courseId);
    } else if (
      tab !== 'manage-course' &&
      tab !== 'content-modules' &&
      tab !== 'content-resources' &&
      tab !== 'content-assessments'
    ) {
      setSelectedCourseId(null);
    }

    if (tab === 'manage-course' && courseId) {
      window.history.pushState({}, '', `/instructor/courses/${courseId}/workspace`);
    } else if (tab === 'content-modules' && courseId) {
      window.history.pushState({}, '', `/instructor/courses/${courseId}/content/modules`);
    } else if (tab === 'content-resources' && courseId) {
      window.history.pushState({}, '', `/instructor/courses/${courseId}/content/resources`);
    } else if (tab === 'content-assessments' && courseId) {
      window.history.pushState({}, '', `/instructor/courses/${courseId}/content/assessments`);
    } else if (tab === 'my-courses') {
      window.history.pushState({}, '', '/instructor/courses');
    } else if (tab === 'create-course') {
      window.history.pushState({}, '', '/instructor/courses/create');
    } else if (tab === 'assessments') {
      window.history.pushState({}, '', '/instructor/assessments');
    } else if (tab === 'analytics') {
      window.history.pushState({}, '', '/instructor/analytics');
    } else if (tab === 'inquiries') {
      window.history.pushState({}, '', '/instructor/inquiries');
    } else if (tab === 'profile') {
      window.history.pushState({}, '', '/instructor/profile');
    } else if (tab === 'dashboard') {
      window.history.pushState({}, '', '/instructor/dashboard');
    }
  };

  const handleUpdateCourse = (updatedCourse) => {
    setCourses((prevCourses) => {
      const updatedList = prevCourses.map((c) => {
        if (c._id === updatedCourse._id) {
          return { ...c, ...updatedCourse, learnersCount: c.learnersCount || 0 };
        }
        return c;
      });

      // Recalculate stats locally
      const totalCourses = updatedList.length;
      const publishedCourses = updatedList.filter((c) => c.status === 'published').length;
      const draftCourses = updatedList.filter((c) => c.status === 'draft').length;

      // Rating average
      const ratedCourses = updatedList.filter((c) => c.rating !== null && c.rating !== undefined);
      const averageRating = ratedCourses.length > 0
        ? ratedCourses.reduce((sum, c) => sum + c.rating, 0) / ratedCourses.length
        : null;

      setStats((prevStats) => ({
        ...prevStats,
        totalCourses,
        publishedCourses,
        draftCourses,
        averageRating: averageRating !== null ? Math.round(averageRating * 10) / 10 : null
      }));

      return updatedList;
    });
  };

  // Publish / Unpublish toggle
  const handlePublishToggle = async (courseId, currentStatus) => {
    try {
      const token = localStorage.getItem('upskillr_token');
      const targetStatus = currentStatus === 'published' ? 'draft' : 'published';
      const response = await fetch(`${API_BASE}/courses/${courseId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        handleUpdateCourse(data.course);
      } else {
        // Show backend error (e.g. zero-lesson publish attempt)
        toast.error(data.message || 'Could not update course status.');
      }
    } catch (err) {
      toast.error('Error updating course status. Please try again.');
    }
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <InstructorDashboardOverview
            user={user}
            stats={stats}
            courses={courses}
            onNavigate={handleNavigate}
          />
        );

      case 'my-courses':
        return (
          <MyCourses
            courses={courses}
            onNavigate={handleNavigate}
            onPublishToggle={handlePublishToggle}
          />
        );

      case 'manage-course':
        return (
          <CourseManager
            courseId={selectedCourseId}
            user={user}
            onBack={() => handleNavigate('my-courses')}
            onUpdateCourse={handleUpdateCourse}
            onPublishToggle={handlePublishToggle}
            onNavigate={handleNavigate}
          />
        );

      case 'create-course':
        return (
          <CourseCreationFlow
            user={user}
            onCancel={() => setActiveTab('my-courses')}
            onCourseCreated={() => {
              fetchInstructorData();
            }}
            onNavigate={handleNavigate}
          />
        );

      case 'assessments':
        return <InstructorAssessmentsReview user={user} />;

      case 'inquiries':
        return <InstructorQuestionsManager />;

      case 'analytics':
      case 'learners':
        return <InstructorAnalytics stats={stats} courses={courses} />;

      case 'profile':
        return <InstructorProfile user={user} />;

      default:
        return (
          <InstructorDashboardOverview
            user={user}
            stats={stats}
            courses={courses}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  if (activeTab === 'create-course') {
    return (
      <CourseCreationFlow
        user={user}
        onCancel={() => setActiveTab('my-courses')}
        onCourseCreated={() => {
          fetchInstructorData();
        }}
        onNavigate={handleNavigate}
      />
    );
  }

  if (
    activeTab === 'content-modules' ||
    activeTab === 'content-resources' ||
    activeTab === 'content-assessments'
  ) {
    return (
      <DedicatedContentEditorPage
        editorType={activeTab}
        courseId={selectedCourseId}
        user={user}
        onBackToWorkspace={() => handleNavigate('manage-course', selectedCourseId)}
        onNavigate={handleNavigate}
      />
    );
  }

  return (
    <InstructorLayout
      sidebar={
        <InstructorSidebar
          activeTab={activeTab}
          setActiveTab={(tab) => handleNavigate(tab)}
          user={user}
          onLogout={onLogout}
        />
      }
      loading={loading}
    >
      {renderActiveTabContent()}
    </InstructorLayout>
  );
};
