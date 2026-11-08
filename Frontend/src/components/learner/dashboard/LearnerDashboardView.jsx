import React, { useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  BookOpen,
  Compass,
  Bookmark,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { RecentlyViewedCard } from './RecentlyViewedCard';
import { calculateCourseProgress } from './MyLearningSection';
import { TrendingInTechSection } from '../trending/TrendingInTechSection';
import './LearnerDashboardView.css';

export const LearnerDashboardView = ({
  user,
  enrolments = [],
  recentlyViewedCourse = null,
  onNavigateToCourse,
  onSelectView,
  onSelectAnnouncement,
  loading = false
}) => {
  // Extract user display name (First name or full name)
  const userFullName = user?.fullName || user?.name || 'Learner';
  const firstName = userFullName.split(' ')[0] || userFullName;

  // Calculate learning statistics using the shared source of truth
  const stats = useMemo(() => {
    let inProgressCount = 0;
    let completedCount = 0;
    let notStartedCount = 0;

    enrolments.forEach((e) => {
      const { category } = calculateCourseProgress(e);
      if (category === 'enrolled') {
        inProgressCount += 1;
      } else if (category === 'completed') {
        completedCount += 1;
      } else {
        notStartedCount += 1;
      }
    });

    return {
      inProgressCount,
      completedCount,
      notStartedCount
    };
  }, [enrolments]);

  return (
    <div className="learner-dashboard-view">
      {/* 1. Welcome Section (Compact Greeting + Motivating Message, strictly on Dashboard only) */}
      <section className="dashboard-welcome-section" aria-label="Welcome greeting">
        <h1 className="dashboard-welcome-title">
          Welcome back, <span className="accent-user-name">{firstName}</span>! 👋
        </h1>
        <p className="dashboard-motivating-message">
          "A little progress each day adds up to big results. Keep learning, keep growing."
        </p>
      </section>

      {/* 2. Continue Learning Section (Single most recently viewed course) */}
      <RecentlyViewedCard
        course={recentlyViewedCourse}
        title="Continue Learning"
        onContinue={onNavigateToCourse}
        onMyLearning={() => onSelectView('my-learning', '/learner/my-learning?tab=enrolled')}
        onExplore={() => onSelectView('explore', '/learner/explore')}
        loading={loading}
      />

      {/* 3. Learning Overview Section (3 Compact Statistics) */}
      <section className="dashboard-overview-section" aria-label="Learning Overview">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">Learning Overview</h2>
        </div>

        <div className="dashboard-stats-grid">
          {/* Courses In Progress */}
          <div
            className="dashboard-stat-card in-progress"
            role="button"
            tabIndex={0}
            onClick={() => onSelectView('my-learning', '/learner/my-learning?tab=enrolled')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectView('my-learning', '/learner/my-learning?tab=enrolled');
              }
            }}
            title="View courses in progress"
          >
            <div className="stat-card-icon-box in-progress">
              <Clock size={22} />
            </div>
            <div className="stat-card-content">
              <span className="stat-card-number">{loading ? '—' : stats.inProgressCount}</span>
              <span className="stat-card-label">Courses In Progress</span>
            </div>
          </div>

          {/* Completed Courses */}
          <div
            className="dashboard-stat-card completed"
            role="button"
            tabIndex={0}
            onClick={() => onSelectView('my-learning', '/learner/my-learning?tab=completed')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectView('my-learning', '/learner/my-learning?tab=completed');
              }
            }}
            title="View completed courses"
          >
            <div className="stat-card-icon-box completed">
              <CheckCircle2 size={22} />
            </div>
            <div className="stat-card-content">
              <span className="stat-card-number">{loading ? '—' : stats.completedCount}</span>
              <span className="stat-card-label">Completed Courses</span>
            </div>
          </div>

          {/* Not Started */}
          <div
            className="dashboard-stat-card not-started"
            role="button"
            tabIndex={0}
            onClick={() => onSelectView('my-learning', '/learner/my-learning?tab=not_started')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectView('my-learning', '/learner/my-learning?tab=not_started');
              }
            }}
            title="View enrolled courses waiting to be started"
          >
            <div className="stat-card-icon-box not-started">
              <BookOpen size={22} />
            </div>
            <div className="stat-card-content">
              <span className="stat-card-number">{loading ? '—' : stats.notStartedCount}</span>
              <span className="stat-card-label">Not Started</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Trending in Tech Section (Platform Announcements & Industry Trends) */}
      <TrendingInTechSection
        onSelectAnnouncement={(announcement) => {
          if (onSelectAnnouncement) {
            onSelectAnnouncement(announcement);
          } else if (onSelectView) {
            onSelectView('trending-detail', `/learner/trending/${announcement.slug}`);
          }
        }}
        onExploreCourses={() => onSelectView('explore', '/learner/explore')}
      />
    </div>
  );
};

export default LearnerDashboardView; 