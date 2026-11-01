import React from 'react';
import { Trophy, Flame, Star, Award, CheckCircle2, Sparkles, Clock } from 'lucide-react';
import './LearnerAchievementsView.css';

export const LearnerAchievementsView = ({
  gamification = { points: 0, currentStreak: 0, longestStreak: 0 },
  enrolments = []
}) => {
  const completedCoursesCount = enrolments.filter(
    (e) => e.progressPercentage === 100 || e.status === 'completed'
  ).length;

  let totalModulesDone = 0;
  enrolments.forEach((e) => {
    totalModulesDone += (e.completedLessons || []).length;
  });

  return (
    <div className="learner-achievements-page">
      <div className="achievements-header">
        <h1 className="achievements-page-title">Achievements</h1>
        <p className="achievements-page-subtitle">
          Track your learning milestones, streaks, and platform activity.
        </p>
      </div>

      {/* Real Gamification Stats Summary Cards */}
      <div className="achievements-stats-grid">
        <div className="achieve-stat-card">
          <div className="achieve-icon-box streak-icon">
            <Flame size={24} />
          </div>
          <div className="achieve-stat-meta">
            <span className="achieve-stat-number">{gamification.currentStreak || 0} Days</span>
            <span className="achieve-stat-label">Current Streak</span>
          </div>
        </div>

        <div className="achieve-stat-card">
          <div className="achieve-icon-box best-streak-icon">
            <Trophy size={24} />
          </div>
          <div className="achieve-stat-meta">
            <span className="achieve-stat-number">{gamification.longestStreak || 0} Days</span>
            <span className="achieve-stat-label">Best Streak</span>
          </div>
        </div>

        <div className="achieve-stat-card">
          <div className="achieve-icon-box points-icon">
            <Star size={24} />
          </div>
          <div className="achieve-stat-meta">
            <span className="achieve-stat-number">{gamification.points || 0}</span>
            <span className="achieve-stat-label">Total Points</span>
          </div>
        </div>

        <div className="achieve-stat-card">
          <div className="achieve-icon-box completed-icon">
            <Award size={24} />
          </div>
          <div className="achieve-stat-meta">
            <span className="achieve-stat-number">{completedCoursesCount}</span>
            <span className="achieve-stat-label">Completed Courses</span>
          </div>
        </div>
      </div>

      {/* Extensible Architecture Roadmap Notice (No fake badges or fake leaderboards) */}
      <div className="achievements-roadmap-card">
        <div className="roadmap-header">
          <div className="roadmap-icon-wrap" aria-hidden="true">
            <Sparkles size={22} className="accent-green" />
          </div>
          <div>
            <h2 className="roadmap-title">Verifiable Skill Badges & Certificates</h2>
            <p className="roadmap-desc">
              Your daily logins, module completions (+5 pts each), and completed courses are being
              recorded to your learning audit log. Complete course milestones to unlock certificates on your profile.
            </p>
          </div>
        </div>

        <div className="roadmap-milestones-list">
          <div className="roadmap-milestone-item">
            <div className="milestone-status-bullet done">
              <CheckCircle2 size={16} />
            </div>
            <div className="milestone-text">
              <strong>Learning Streak Tracker:</strong> Daily activity logging is active.
            </div>
          </div>

          <div className="roadmap-milestone-item">
            <div className="milestone-status-bullet done">
              <CheckCircle2 size={16} />
            </div>
            <div className="milestone-text">
              <strong>Module Mastery:</strong> Earn 5 points for every lesson module completed.
            </div>
          </div>

          <div className="roadmap-milestone-item">
            <div className="milestone-status-bullet pending">
              <Clock size={16} />
            </div>
            <div className="milestone-text">
              <strong>Course Certificates:</strong> Complete 100% of any published course to view & download your certificate.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnerAchievementsView;

