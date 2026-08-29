import React, { useState, useEffect } from 'react';
import { Search, Sparkles, BookOpen, Users, Award, ArrowRight, User } from 'lucide-react';
import './ExploreInstructors.css';
import { Avatar } from '../../../common/Avatar/Avatar';

export const ExploreInstructors = () => {
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/instructors');
      const data = await response.json();
      if (data.success) {
        setInstructors(data.instructors || []);
      }
    } catch (err) {
      console.error('Failed to fetch instructors', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCourses = (name) => {
    const path = `/explore?instructor=${encodeURIComponent(name)}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  };

  const filteredInstructors = instructors.filter((inst) => {
    const matchesName = inst.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesExpertise = inst.expertise && inst.expertise.some(exp => 
      exp.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesName || matchesExpertise;
  });

  return (
    <div className="explore-instructors-page section">
      <div className="container">
        {/* Header */}
        <div className="explore-header text-center">
          <div className="badge-pill">
            <Sparkles size={14} />
            <span>Expert Mentors</span>
          </div>
          <h1 className="explore-title">Learn from the Best</h1>
          <p className="explore-subtitle">
            Connect with our industry-leading instructors, master real-world skills, and accelerate your learning journey.
          </p>
        </div>

        {/* Search Bar */}
        <div className="explore-toolbar">
          <div className="search-box-wrapper width-full max-width-md margin-center">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search instructors by name or expertise (e.g. Web Development)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Instructors Cards Grid */}
        {loading ? (
          <div className="loading-workspace-spinner">Loading instructors...</div>
        ) : filteredInstructors.length === 0 ? (
          <div className="empty-courses-card" style={{ marginTop: '2rem' }}>
            <User size={32} />
            <h2>No Instructors Found</h2>
            <p>Try searching for a different name or skill category.</p>
          </div>
        ) : (
          <div className="explore-instructors-grid">
            {filteredInstructors.map((inst) => (
              <div key={inst._id} className="instructor-card">
                <div className="instructor-avatar-container">
                  <div className="instructor-avatar-ring">
                    <Avatar image={inst.avatar} name={inst.fullName} size="medium" />
                  </div>
                </div>

                <div className="instructor-card-body">
                  <h3 className="instructor-name">{inst.fullName}</h3>
                  <p className="instructor-email">{inst.email}</p>

                  <div className="instructor-expertise">
                    {inst.expertise && inst.expertise.length > 0 ? (
                      inst.expertise.map((exp, idx) => (
                        <span key={idx} className="expertise-badge">
                          {exp}
                        </span>
                      ))
                    ) : (
                      <span className="expertise-badge empty">
                        General Education
                      </span>
                    )}
                  </div>

                  <div className="instructor-stats-row">
                    <div className="stat-metric">
                      <BookOpen size={14} className="stat-icon" />
                      <div>
                        <span className="stat-value">{inst.coursesCount || 0}</span>
                        <span className="stat-label">Courses</span>
                      </div>
                    </div>
                    <div className="stat-metric">
                      <Users size={14} className="stat-icon" />
                      <div>
                        <span className="stat-value">{inst.learnersCount || 0}</span>
                        <span className="stat-label">Students</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="instructor-card-footer">
                  <button
                    type="button"
                    className="btn btn-outline btn-block"
                    onClick={() => handleViewCourses(inst.fullName)}
                    disabled={!inst.coursesCount}
                  >
                    <span>View Courses</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExploreInstructors;
