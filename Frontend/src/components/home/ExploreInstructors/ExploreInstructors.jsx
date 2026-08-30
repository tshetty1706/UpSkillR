import React, { useState, useEffect } from 'react';
import { Search, Sparkles, BookOpen, Users, Award, ArrowRight, User, Bookmark, CheckCircle2, Star } from 'lucide-react';
import './ExploreInstructors.css';
import { Avatar } from '../../common/Avatar/Avatar';
import exploreInstructorSvg from '../../../assets/illustrations/explore_instructor.svg?raw';

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
        {/* Explore Hero Redesign */}
        <div className="explore-hero">
          <div className="explore-hero-content">
            <div className="badge-pill hero-badge">
              <Sparkles size={14} />
              <span>EXPERT MENTORS</span>
            </div>
            <h1 className="explore-title">
              Learn from the <span className="text-highlight">Best</span>
            </h1>
            <p className="explore-subtitle">
              Connect with our industry-leading instructors, master real-world skills, and accelerate your learning journey.
            </p>
            <div className="explore-search-box">
              <Search size={20} className="explore-search-icon" />
              <input
                type="text"
                className="explore-search-input"
                placeholder="Search instructors by name or expertise (e.g. Web Development)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="explore-hero-illustration">
            <div
              className="explore-illustration"
              dangerouslySetInnerHTML={{ __html: exploreInstructorSvg }}
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
            {filteredInstructors.map((inst, index) => {
              const cardAccents = ['accent-green', 'accent-purple', 'accent-blue', 'accent-orange'];
              const accentClass = cardAccents[index % cardAccents.length];
              
              const maxSkills = 3;
              const displaySkills = (inst.expertise || []).slice(0, maxSkills);
              const hasMoreSkills = (inst.expertise || []).length > maxSkills;
              const remainingSkillsCount = (inst.expertise || []).length - maxSkills;
              
              const formatNumber = (num) => {
                if (num >= 1000) {
                  return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
                }
                return num;
              };
              
              return (
                <div key={inst._id} className={`instructor-card ${accentClass}`}>
                  {/* Decorative Bookmark */}
                  <button className="instructor-bookmark-btn" aria-label="Bookmark instructor">
                    <Bookmark size={18} className="bookmark-icon" />
                  </button>
                  
                  {/* Top Header Block: Horizontal Layout */}
                  <div className="instructor-card-header">
                    <div className="instructor-avatar-container">
                      <div className="instructor-avatar-bg-shape" />
                      <div className="instructor-avatar-wrapper">
                        <Avatar image={inst.avatar} name={inst.fullName} size="medium" />
                      </div>
                    </div>
                    
                    <div className="instructor-header-info">
                      <div className="instructor-name-row">
                        <h3 className="instructor-name">{inst.fullName}</h3>
                        {inst.isVerified && (
                          <CheckCircle2 size={14} className="verified-icon" />
                        )}
                      </div>
                      <p className="instructor-designation">
                        {inst.designation || 'Expert Educator'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Skill Chips / Tags Row */}
                  <div className="instructor-skills-chips">
                    {displaySkills.length > 0 ? (
                      displaySkills.map((skill, idx) => (
                        <span key={idx} className="skill-chip">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="skill-chip empty">General Education</span>
                    )}
                    {hasMoreSkills && (
                      <span className="skill-chip more-count">
                        +{remainingSkillsCount}
                      </span>
                    )}
                  </div>
                  
                  {/* Metrics Row: 3 Columns with vertical separators */}
                  <div className="instructor-metrics-row">
                    {/* Column 1: Rating */}
                    {inst.rating !== null && inst.rating !== undefined ? (
                      <div className="metric-col">
                        <div className="metric-value-wrapper">
                          <Star size={14} className="metric-icon star-icon" fill="currentColor" />
                          <span className="metric-value">{inst.rating.toFixed(1)}</span>
                        </div>
                        <span className="metric-label">({inst.ratingsCount || 0} reviews)</span>
                      </div>
                    ) : (
                      <div className="metric-col empty-rating">
                        <div className="metric-value-wrapper">
                          <Star size={14} className="metric-icon star-icon empty" />
                          <span className="metric-value">—</span>
                        </div>
                        <span className="metric-label">No ratings yet</span>
                      </div>
                    )}
                    
                    {/* Column 2: Learners */}
                    <div className="metric-col">
                      <div className="metric-value-wrapper">
                        <Users size={14} className="metric-icon" />
                        <span className="metric-value">{formatNumber(inst.learnersCount || 0)}</span>
                      </div>
                      <span className="metric-label">Learners</span>
                    </div>
                    
                    {/* Column 3: Courses */}
                    <div className="metric-col">
                      <div className="metric-value-wrapper">
                        <BookOpen size={14} className="metric-icon" />
                        <span className="metric-value">{inst.coursesCount || 0}</span>
                      </div>
                      <span className="metric-label">Courses</span>
                    </div>
                  </div>
                  
                  {/* Short bio */}
                  <p className="instructor-bio-text">
                    {inst.bio || 'Project-based instructor helping developers build practical web apps.'}
                  </p>
                  
                  {/* Footer Explore courses CTA button */}
                  <div className="instructor-card-footer">
                    <button
                      type="button"
                      className="btn btn-outline btn-block instructor-explore-courses-btn"
                      onClick={() => handleViewCourses(inst.fullName)}
                    >
                      <span>Explore Courses</span>
                      <ArrowRight size={14} className="arrow-icon" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExploreInstructors;
