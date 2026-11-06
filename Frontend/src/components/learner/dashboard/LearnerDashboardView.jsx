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
import './LearnerDashboardView.css';

export const LearnerDashboardView = ({
  user,
  enrolments = [],
  recentlyViewedCourse = null,
  onNavigateToCourse,
  onSelectView,
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
        onMyLearning={() => onSelectView('my-learning', '/learner/my-learning')}
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
            onClick={() => onSelectView('my-learning', '/learner/my-learning')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectView('my-learning', '/learner/my-learning');
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
            onClick={() => onSelectView('my-learning', '/learner/my-learning')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectView('my-learning', '/learner/my-learning');
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
            onClick={() => onSelectView('my-learning', '/learner/my-learning')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectView('my-learning', '/learner/my-learning');
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

      {/* 4. Quick Navigation Section */}
      <section className="dashboard-quicknav-section" aria-label="Quick Navigation">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title">Quick Navigation</h2>
        </div>

        <div className="dashboard-quicknav-grid">
          {/* Card 1: My Learning */}
          <div
            className="quicknav-card"
            role="button"
            tabIndex={0}
            onClick={() => onSelectView('my-learning', '/learner/my-learning')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectView('my-learning', '/learner/my-learning');
              }
            }}
            aria-label="Navigate to My Learning page"
          >
            <div className="quicknav-icon-wrap my-learning">
              <BookOpen size={20} />
            </div>
            <div className="quicknav-info">
              <h3 className="quicknav-title">My Learning</h3>
              <p className="quicknav-desc">
                Access your enrolled courses, view modules, and manage learning progress.
              </p>
            </div>
            <div className="quicknav-arrow-wrap" aria-hidden="true">
              <ArrowRight size={18} className="quicknav-arrow" />
            </div>
          </div>

          {/* Card 2: Explore Courses */}
          <div
            className="quicknav-card"
            role="button"
            tabIndex={0}
            onClick={() => onSelectView('explore', '/learner/explore')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectView('explore', '/learner/explore');
              }
            }}
            aria-label="Navigate to Explore Courses page"
          >
            <div className="quicknav-icon-wrap explore">
              <Compass size={20} />
            </div>
            <div className="quicknav-info">
              <h3 className="quicknav-title">Explore Courses</h3>
              <p className="quicknav-desc">
                Discover new topics, view syllabus details, and enroll in available courses.
              </p>
            </div>
            <div className="quicknav-arrow-wrap" aria-hidden="true">
              <ArrowRight size={18} className="quicknav-arrow" />
            </div>
          </div>

          {/* Card 3: Bookmarks */}
          <div
            className="quicknav-card"
            role="button"
            tabIndex={0}
            onClick={() => onSelectView('bookmarks', '/learner/bookmarks')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectView('bookmarks', '/learner/bookmarks');
              }
            }}
            aria-label="Navigate to Bookmarks page"
          >
            <div className="quicknav-icon-wrap bookmarks">
              <Bookmark size={20} />
            </div>
            <div className="quicknav-info">
              <h3 className="quicknav-title">Bookmarks</h3>
              <p className="quicknav-desc">
                Quickly revisit your saved lessons, articles, notes, and video bookmarks.
              </p>
            </div>
            <div className="quicknav-arrow-wrap" aria-hidden="true">
              <ArrowRight size={18} className="quicknav-arrow" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LearnerDashboardView;

