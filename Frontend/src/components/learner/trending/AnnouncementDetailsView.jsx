import React, { useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  Flame,
  Tag,
  Share2,
  Bookmark,
  CheckCircle2,
  Compass,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Info
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { MOCK_TRENDING_ANNOUNCEMENTS } from '../../../data/trendingAnnouncements';
import './AnnouncementDetailsView.css';

/**
 * AnnouncementDetailsView Component
 * Dedicated full details page/view for a single platform announcement or tech trend.
 */
export const AnnouncementDetailsView = ({
  announcement,
  onBack,
  onSelectAnnouncement,
  onExploreCourses
}) => {
  const { toast } = useToast();

  // Scroll to top upon mounting or when announcement changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [announcement?.id]);

  // Fallback if announcement not found
  if (!announcement) {
    return (
      <div className="announcement-not-found-view">
        <div className="not-found-box">
          <h2>Announcement Not Found</h2>
          <p>The announcement you requested may have been archived or moved.</p>
          <button type="button" className="btn-back-to-dashboard" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  const isTrending = announcement.badge === 'TRENDING';
  const isUpcoming = announcement.badge === 'UPCOMING';
  const isNew = announcement.badge === 'NEW';

  // Find 2 other related announcements to discover at the bottom
  const relatedAnnouncements = useMemo(() => {
    return MOCK_TRENDING_ANNOUNCEMENTS
      .filter((a) => a.id !== announcement.id)
      .slice(0, 3);
  }, [announcement.id]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('🔗 Link copied to clipboard!');
    } else {
      toast.info('Share URL: ' + window.location.href);
    }
  };

  return (
    <article className="announcement-details-root" aria-label={`Announcement: ${announcement.title}`}>
      {/* 1. TOP NAVIGATION / BREADCRUMB HEADER */}
      <div className="announcement-nav-bar">
        <button
          type="button"
          className="btn-back-breadcrumb"
          onClick={onBack}
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <nav className="announcement-breadcrumbs" aria-label="Breadcrumb">
          <span className="crumb-link" onClick={onBack}>Dashboard</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-link" onClick={onBack}>Trending in Tech</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-active">{announcement.category}</span>
        </nav>

        <div className="announcement-nav-actions">
          <button
            type="button"
            className="btn-nav-action"
            onClick={handleShare}
            title="Share Announcement"
            aria-label="Share announcement"
          >
            <Share2 size={16} />
            <span className="action-text">Share</span>
          </button>
        </div>
      </div>

      {/* 2. ANNOUNCEMENT HERO / HEADER */}
      <header className="announcement-header">
        <div className="header-chips-row">
          <span className="announcement-category-pill">
            {announcement.category}
          </span>

          {announcement.badge && (
            <span
              className={`announcement-badge-pill ${
                isTrending ? 'trending' : isUpcoming ? 'upcoming' : 'new'
              }`}
            >
              {isTrending && <Flame size={13} />}
              {isUpcoming && <Sparkles size={13} />}
              {isNew && <Sparkles size={13} />}
              <span>{announcement.badge}</span>
            </span>
          )}

          <span className="announcement-platform-tag">
            <Info size={12} />
            <span>Platform Announcement</span>
          </span>
        </div>

        <h1 className="announcement-hero-title">{announcement.title}</h1>

        <p className="announcement-lead-description">
          {announcement.description}
        </p>

        {/* Publisher & Meta Row */}
        <div className="announcement-meta-bar">
          <div className="author-card">
            <div className="author-avatar">
              <span>UA</span>
            </div>
            <div className="author-details">
              <span className="author-name">{announcement.publisherName}</span>
              <span className="author-role">{announcement.publisherRole || 'Platform Editorial'}</span>
            </div>
          </div>

          <div className="announcement-meta-chips">
            <div className="meta-chip">
              <Calendar size={14} />
              <span>{announcement.formattedDate}</span>
            </div>
            <div className="meta-chip">
              <Clock size={14} />
              <span>{announcement.readTime || '4 min read'}</span>
            </div>
            {announcement.upcomingDate && (
              <div className="meta-chip highlight-upcoming">
                <Sparkles size={14} />
                <span>Status: {announcement.upcomingDate}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. COVER IMAGE BANNER */}
      {announcement.coverImage && (
        <div className="announcement-cover-container">
          <img
            src={announcement.coverImage}
            alt={announcement.title}
            className="announcement-cover-image"
          />
        </div>
      )}

      {/* 4. MAIN ARTICLE CONTENT BODY */}
      <div className="announcement-content-container">
        {/* Intro Paragraph */}
        {announcement.content?.intro && (
          <p className="article-intro-text">
            {announcement.content.intro}
          </p>
        )}

        {/* Content Sections */}
        {Array.isArray(announcement.content?.sections) &&
          announcement.content.sections.map((section, idx) => (
            <section key={idx} className="article-section-block">
              {section.heading && (
                <h2 className="article-section-heading">{section.heading}</h2>
              )}

              {section.body && (
                <p className="article-body-p">{section.body}</p>
              )}

              {Array.isArray(section.bullets) && section.bullets.length > 0 && (
                <ul className="article-bullets-list">
                  {section.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} className="article-bullet-item">
                      <span className="bullet-dot" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

        {/* Key Takeaways Callout Card */}
        {Array.isArray(announcement.content?.keyTakeaways) &&
          announcement.content.keyTakeaways.length > 0 && (
            <div className="key-takeaways-callout">
              <div className="takeaways-header">
                <CheckCircle2 size={20} className="takeaways-icon" />
                <h3 className="takeaways-title">Key Takeaways for Learners</h3>
              </div>
              <ul className="takeaways-list">
                {announcement.content.keyTakeaways.map((point, kIdx) => (
                  <li key={kIdx} className="takeaways-item">
                    <span className="takeaways-check">✓</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Upcoming Course Spotlight Card (If Category is Upcoming Courses) */}
        {announcement.category === 'Upcoming Courses' && (
          <div className="upcoming-course-spotlight">
            <div className="spotlight-left">
              <span className="spotlight-badge">
                <Sparkles size={13} />
                <span>Curriculum in Active Development</span>
              </span>
              <h3 className="spotlight-title">Ready to level up your technical depth?</h3>
              <p className="spotlight-desc">
                This course is currently undergoing curriculum review and code sandbox verification by UpSkillR instructors. In the meantime, continue sharpening your skills in our live courses.
              </p>
            </div>
            {onExploreCourses && (
              <div className="spotlight-right">
                <button
                  type="button"
                  className="btn-spotlight-explore"
                  onClick={onExploreCourses}
                >
                  <Compass size={16} />
                  <span>Explore Live Courses</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Technology Tags Bar */}
        {Array.isArray(announcement.tags) && announcement.tags.length > 0 && (
          <div className="article-tags-container">
            <span className="tags-label">Related Technologies:</span>
            <div className="tags-pills-wrap">
              {announcement.tags.map((tag) => (
                <span key={tag} className="article-tech-pill">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. RELATED ANNOUNCEMENTS FOOTER */}
      {relatedAnnouncements.length > 0 && (
        <section className="related-announcements-section">
          <div className="related-header">
            <h3 className="related-title">More in Trending in Tech</h3>
            <button
              type="button"
              className="btn-back-link"
              onClick={onBack}
            >
              <span>Back to all announcements</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="related-cards-grid">
            {relatedAnnouncements.map((rel) => (
              <div
                key={rel.id}
                className="related-card"
                onClick={() => onSelectAnnouncement && onSelectAnnouncement(rel)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectAnnouncement && onSelectAnnouncement(rel);
                  }
                }}
              >
                <div className="related-card-img-wrap">
                  <img src={rel.coverImage} alt={rel.title} loading="lazy" />
                  <span className="related-category-chip">{rel.category}</span>
                </div>
                <div className="related-card-info">
                  <h4 className="related-card-title">{rel.title}</h4>
                  <p className="related-card-desc">{rel.description}</p>
                  <span className="related-read-more">
                    <span>Read Article</span>
                    <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. BOTTOM BACK BUTTON */}
      <div className="announcement-bottom-nav">
        <button
          type="button"
          className="btn-bottom-back"
          onClick={onBack}
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>
    </article>
  );
};

export default AnnouncementDetailsView;
