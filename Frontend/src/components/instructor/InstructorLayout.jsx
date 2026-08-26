import React, { useState, useEffect } from 'react';
import { InstructorSidebar } from './InstructorSidebar';
import { InstructorDashboard } from './InstructorDashboard';
import { MyCourses } from './MyCourses';
import { CourseCreateWizard } from './CourseCreateWizard';
import { CourseManager } from './CourseManager';
import { InstructorProfile } from './InstructorProfile';
import { InstructorAnalytics } from './InstructorAnalytics';
import { Navbar } from '../common/Navbar/Navbar';
import './InstructorLayout.css';

export const InstructorLayout = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'my-courses', 'create-course', 'manage-course', 'lessons', 'resources', 'assessments', 'analytics', 'learners', 'profile'
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({ totalCourses: 0, publishedCourses: 0, draftCourses: 0, totalLearners: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstructorData();
  }, []);

  const fetchInstructorData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch('http://localhost:5000/api/courses/instructor/my-courses', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setCourses(data.courses || []);
        setStats(data.stats || { totalCourses: 0, publishedCourses: 0, draftCourses: 0, totalLearners: 0 });
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

  const handleSaveNewCourse = async (coursePayload) => {
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch('http://localhost:5000/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(coursePayload)
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message || 'Course saved successfully!');
        await fetchInstructorData();
        setActiveTab('my-courses');
      } else {
        alert(data.message || 'Failed to create course.');
      }
    } catch (err) {
      alert('Error creating course.');
    }
  };

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
        alert(data.message);
        fetchInstructorData();
      }
    } catch (err) {
      alert('Error updating status.');
    }
  };

  const handleDeleteCourse = async (courseId, courseTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${courseTitle}"?`)) return;
    try {
      const token = localStorage.getItem('upskillr_token');
      const response = await fetch(`http://localhost:5000/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        alert('Course deleted.');
        fetchInstructorData();
      }
    } catch (err) {
      alert('Error deleting course.');
    }
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <InstructorDashboard
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
            onDeleteCourse={handleDeleteCourse}
          />
        );
      case 'create-course':
        return (
          <CourseCreateWizard
            onSaveCourse={handleSaveNewCourse}
            onCancel={() => setActiveTab('my-courses')}
          />
        );
      case 'manage-course':
        return (
          <CourseManager
            courseId={selectedCourseId}
            onBack={() => setActiveTab('my-courses')}
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
          <InstructorDashboard
            user={user}
            stats={stats}
            courses={courses}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div className="instructor-studio-layout">
      {/* Top Navbar */}
      <Navbar />

      <div className="instructor-studio-body">
        {/* Left Collapsible/Responsive Sidebar */}
        <InstructorSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          onLogout={onLogout}
        />

        {/* Main Content Workspace */}
        <main className="instructor-main-workspace">
          <div className="container workspace-container">
            {loading ? (
              <div className="loading-workspace-spinner">
                <span>Loading Instructor Studio...</span>
              </div>
            ) : (
              renderActiveTabContent()
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
