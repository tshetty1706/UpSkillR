import React, { useState, useMemo, useRef } from 'react';
import {
  Sparkles,
  Flame,
  Clock,
  Calendar,
  Tag,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  BookOpen,
  Layers,
  ShieldCheck,
  Info,
  SlidersHorizontal,
  Compass
} from 'lucide-react';
import {
  TRENDING_CATEGORIES,
  MOCK_TRENDING_ANNOUNCEMENTS,
  getCategoryCounts
} from '../../../data/trendingAnnouncements';
import './TrendingInTechSection.css';

/**
 * Trending in Tech Section
 * Centralized platform announcement and industry tech trends feed for learners.
 * Replaces the legacy Recent Learning Activity section on the Learner Dashboard.
 */
export const TrendingInTechSection = ({
  onSelectAnnouncement,
  onExploreCourses
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All Updates');
  const categoryScrollRef = useRef(null);

  // Compute category counts for filter badges
  const categoryCounts = useMemo(() => {
    return getCategoryCounts();
  }, []);

  // Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    if (selectedCategory === 'All Updates') {
      return MOCK_TRENDING_ANNOUNCEMENTS;
    }
    return MOCK_TRENDING_ANNOUNCEMENTS.filter(
      (item) => item.category === selectedCategory
    );
  }, [selectedCategory]);

  // Horizontal scroll handler for category tabs
  const scrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="trending-tech-section" aria-label="Trending in Tech">
      {/* 1. SECTION HEADER */}
      <div className="trending-section-header">
        <div className="trending-header-main">
          <div className="trending-badge-row">
            <span className="trending-indicator-pill">
              <Flame size={14} className="trending-flame-icon" />
              <span>TRENDING IN TECH</span>
            </span>
            <span className="editorial-preview-pill" title="Sample announcements curated for preview">
              <Info size={13} />
              <span>Editorial Preview</span>
            </span>
          </div>

          <h2 className="trending-section-title">Trending in Tech</h2>
          <p className="trending-section-subtitle">
            Stay updated with emerging technologies, upcoming courses, and industry announcements.
          </p>
        </div>

        {/* Optional Explore Shortcut */}
        {onExploreCourses && (
          <div className="trending-header-action">
            <button
              type="button"
              className="btn-explore-shortcut"
              onClick={onExploreCourses}
              title="Explore full published course catalog"
            >
              <Compass size={15} />
              <span>Explore Courses</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 2. CATEGORY FILTERS (Horizontally Scrollable) */}
      <div className="trending-filter-bar-container">
        <button
          type="button"
          className="category-scroll-btn left"
          onClick={() => scrollCategories('left')}
          aria-label="Scroll categories left"
          title="Scroll categories left"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="trending-categories-scroll" ref={categoryScrollRef} role="tablist">
          {TRENDING_CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            const count = categoryCounts[category] ?? 0;

            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`trending-category-pill ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                <span>{category}</span>
                <span className={`category-count-badge ${isSelected ? 'active' : ''}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="category-scroll-btn right"
          onClick={() => scrollCategories('right')}
          aria-label="Scroll categories right"
          title="Scroll categories right"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 3. ANNOUNCEMENTS CARDS GRID */}
      {filteredAnnouncements.length > 0 ? (
        <div className="trending-cards-grid">
          {filteredAnnouncements.map((announcement) => {
            const hasBadge = Boolean(announcement.badge);
            const isUpcoming = announcement.badge === 'UPCOMING';
            const isTrending = announcement.badge === 'TRENDING';
            const isNew = announcement.badge === 'NEW';

            return (
              <article
                key={announcement.id}
                className={`trending-card ${announcement.isPinned ? 'is-pinned' : ''}`}
                onClick={() => onSelectAnnouncement && onSelectAnnouncement(announcement)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectAnnouncement && onSelectAnnouncement(announcement);
                  }
                }}
                aria-label={`Announcement: ${announcement.title}`}
              >
                {/* Card Visual Header / Cover Image */}
                <div className="trending-card-visual">
                  <img
                    src={announcement.coverImage}
                    alt={announcement.title}
                    className="trending-card-img"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback gradient if external image fails
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement.classList.add('visual-fallback');
                    }}
                  />
                  <div className="trending-card-visual-overlay" />

                  {/* Category Chip (Top-Left) */}
                  <div className="visual-top-chips">
                    <span className="card-category-chip">
                      {announcement.category}
                    </span>

                    {/* Status Badge (Top-Right) */}
                    {hasBadge && (
                      <span
                        className={`card-status-badge ${
                          isTrending ? 'trending' : isUpcoming ? 'upcoming' : 'new'
                        }`}
                      >
                        {isTrending && <Flame size={12} />}
                        {isUpcoming && <Sparkles size={12} />}
                        {isNew && <Sparkles size={12} />}
                        <span>{announcement.badge}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="trending-card-body">
                  <div className="trending-card-main-content">
                    {/* Title */}
                    <h3 className="trending-card-title" title={announcement.title}>
                      {announcement.title}
                    </h3>

                    {/* Description */}
                    <p className="trending-card-desc">
                      {announcement.description}
                    </p>

                    {/* Technology Tags */}
                    {Array.isArray(announcement.tags) && announcement.tags.length > 0 && (
                      <div className="trending-tags-row">
                        {announcement.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="tech-tag-pill">
                            #{tag}
                          </span>
                        ))}
                        {announcement.tags.length > 3 && (
                          <span className="tech-tag-pill more">
                            +{announcement.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer / Metadata */}
                  <div className="trending-card-footer">
                    <div className="trending-publisher-meta">
                      <div className="publisher-avatar">
                        <span>UA</span>
                      </div>
                      <div className="publisher-text-box">
                        <span className="publisher-name">{announcement.publisherName}</span>
                        <div className="publisher-sub-meta">
                          <span className="publish-date">{announcement.formattedDate}</span>
                          <span className="meta-separator">•</span>
                          <span className="read-time">{announcement.readTime}</span>
                        </div>
                      </div>
                    </div>

                    {/* Upcoming Launch Notice or Read More Button */}
                    <div className="card-action-container">
                      {announcement.upcomingDate ? (
                        <div className="upcoming-tag-indicator" title="Course in development">
                          <Clock size={12} />
                          <span>{announcement.upcomingDate}</span>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        className="btn-read-more"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAnnouncement && onSelectAnnouncement(announcement);
                        }}
                        aria-label={`Read more about ${announcement.title}`}
                      >
                        <span>Read More</span>
                        <ArrowRight size={14} className="read-more-arrow" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="trending-empty-state">
          <div className="empty-icon-wrap">
            <Compass size={32} />
          </div>
          <h3 className="empty-title">No announcements in this category</h3>
          <p className="empty-desc">
            We haven't posted any updates under "{selectedCategory}" yet. Explore other categories or check back soon!
          </p>
          <button
            type="button"
            className="btn-reset-filter"
            onClick={() => setSelectedCategory('All Updates')}
          >
            Show All Updates ({categoryCounts['All Updates'] || 0})
          </button>
        </div>
      )}
    </section>
  );
};

export default TrendingInTechSection;
