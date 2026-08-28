import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Video,
  Users,
  Clock,
  Globe,
  Lock,
  FileEdit,
  CheckCircle2
} from 'lucide-react';
import './MyCourses.css';

export const MyCourses = ({ courses, onNavigate, onPublishToggle }) => {
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'published' | 'draft'
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = courses.filter((course) => {
    const matchesStatus =
      filterStatus === 'all' ? true : course.status === filterStatus;
    const matchesQuery =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="my-courses-page">

      {/* Page Header */}
      <div className="courses-page-header">
        <div className="header-title-group">
          <h1 className="page-title">My Courses</h1>
          <p className="page-subtitle">
            Manage your created courses, lessons, resources, and publishing settings.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onNavigate('create-course')}
        >
          <Plus size={18} />
          <span>Create New Course</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="courses-toolbar">
        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All Courses ({courses.length})
          </button>
          <button
            type="button"
            className={`filter-tab ${filterStatus === 'published' ? 'active' : ''}`}
            onClick={() => setFilterStatus('published')}
          >
            Published ({courses.filter((c) => c.status === 'published').length})
          </button>
          <button
            type="button"
            className={`filter-tab ${filterStatus === 'draft' ? 'active' : ''}`}
            onClick={() => setFilterStatus('draft')}
          >
            Drafts ({courses.filter((c) => c.status === 'draft').length})
          </button>
        </div>

        <div className="search-box-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by title or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div className="empty-courses-card">
          <div className="empty-icon-box">
            <BookOpen size={32} />
          </div>
          <h2>No Courses Found</h2>
          <p>
            {searchQuery || filterStatus !== 'all'
              ? 'No courses match your search criteria. Try adjusting your filters.'
              : 'You have not created any courses yet. Create your first course to get started.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('create-course')}
          >
            <Plus size={18} />
            <span>Create Course</span>
          </button>
        </div>
      ) : (
        <div className="courses-card-grid">
          {filteredCourses.map((course) => (
            <div key={course._id} className="course-card">

              {/* Thumbnail */}
              <div className="course-card-thumb-wrap">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="course-card-thumb"
                />
                <span className={`status-badge ${course.status}`}>
                  {course.status === 'published' ? (
                    <><Globe size={12} /><span>Published</span></>
                  ) : (
                    <><Lock size={12} /><span>Draft</span></>
                  )}
                </span>
                <span className="level-badge">{course.skillLevel}</span>
              </div>

              {/* Card Body */}
              <div className="course-card-body">
                <span className="course-category">{course.category}</span>
                <h3 className="course-title">{course.title}</h3>
                <p className="course-description">{course.description}</p>

                <div className="course-metrics-row">
                  <div className="metric-item">
                    <Video size={14} />
                    <span>{course.lessons?.length || 0} Lessons</span>
                  </div>
                  <div className="metric-item">
                    <Users size={14} />
                    <span>{course.learnersCount || 0} Learners</span>
                  </div>
                  <div className="metric-item">
                    <Clock size={14} />
                    <span>{new Date(course.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer — Edit + Publish/Unpublish */}
              <div className="course-card-footer">
                <button
                  type="button"
                  className="btn btn-primary btn-sm btn-block"
                  onClick={() => onNavigate('manage-course', course._id)}
                >
                  <FileEdit size={15} />
                  <span>Edit Course</span>
                </button>

                <button
                  type="button"
                  className={`btn btn-sm btn-block ${course.status === 'published' ? 'btn-outline' : 'btn-publish'}`}
                  onClick={() => onPublishToggle(course._id, course.status)}
                  title={course.status === 'published' ? 'Move back to Draft' : 'Publish Course Live'}
                >
                  {course.status === 'published' ? (
                    <><Lock size={14} /><span>Unpublish</span></>
                  ) : (
                    <><Globe size={14} /><span>Publish</span></>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
