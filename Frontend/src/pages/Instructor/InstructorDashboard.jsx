import React, { useState, useEffect } from 'react';
import { InstructorLayout } from '../../components/instructor/common/InstructorLayout/InstructorLayout';
import { InstructorSidebar } from '../../components/instructor/common/InstructorSidebar/InstructorSidebar';
import { InstructorDashboardOverview } from '../../components/instructor/dashboard/InstructorDashboardOverview/InstructorDashboardOverview';
import { MyCourses } from '../../components/instructor/courses/MyCourses/MyCourses';
import { CourseCreateWizard } from '../../components/instructor/courses/CourseCreateWizard/CourseCreateWizard';
import { CourseManager } from '../../components/instructor/courses/CourseManager/CourseManager';
import { InstructorProfile } from '../../components/instructor/profile/InstructorProfile/InstructorProfile';
import { InstructorAnalytics } from '../../components/instructor/analytics/InstructorAnalytics/InstructorAnalytics';
import { useToast } from '../../context/ToastContext';

export const InstructorDashboard = ({ user, onLogout }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
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
  }, []);

  const fetchInstructorData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch('http://localhost:5000/api/courses/instructor/my-courses', {
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
    }
  };

  // Called by CourseCreateWizard when the course is saved or published
  const handleCourseCreated = async (course) => {
    await fetchInstructorData();
    if (course?._id) {
      // Navigate to CourseManager so the instructor can add resources/assessments
      setSelectedCourseId(course._id);
      setActiveTab('manage-course');
    } else {
      setActiveTab('my-courses');
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
      const response = await fetch(`http://localhost:5000/api/courses/${courseId}/publish`, {
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
      case 'lessons':
      case 'resources':
      case 'assessments':
        return (
          <MyCourses
            courses={courses}
            onNavigate={handleNavigate}
            onPublishToggle={handlePublishToggle}
          />
        );

      case 'create-course':
        return (
          <CourseCreateWizard
            courses={courses}
            onCourseCreated={handleCourseCreated}
            onCancel={() => setActiveTab('my-courses')}
          />
        );

      case 'manage-course':
        return (
          <CourseManager
            courseId={selectedCourseId}
            onBack={() => setActiveTab('my-courses')}
            onUpdateCourse={handleUpdateCourse}
            onPublishToggle={handlePublishToggle}
          />
        );

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

  return (
    <InstructorLayout
      sidebar={
        <InstructorSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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
