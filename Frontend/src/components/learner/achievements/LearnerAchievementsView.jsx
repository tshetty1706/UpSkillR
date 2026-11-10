import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy,
  Flame,
  Star,
  Award,
  CheckCircle2,
  Sparkles,
  Clock,
  Search,
  ArrowUpDown,
  Download,
  Copy,
  Check,
  ExternalLink,
  Eye,
  X,
  Printer,
  ShieldCheck,
  Lock,
  BookOpen,
  Layers,
  Zap,
  ArrowRight,
  Filter,
  Calendar,
  Target
} from 'lucide-react';
import { API_BASE } from '../../../config/api';
import { partitionAchievementBadges } from '../../../utils/badgeProgress';
import './LearnerAchievementsView.css';

// ─── 4 Continuous Streak Badges Configuration ───
const STREAK_BADGES_CONFIG = [
  {
    badgeId: 'streak_30',
    tier: 'normal',
    category: 'streak',
    name: 'Streak Achiever',
    threshold: 30,
    requirement: 'Maintain a 30-day continuous streak',
    thresholdLabel: '30 Consecutive Days',
    description: 'Your learning journey is becoming a habit! Maintain a 30-day continuous streak.',
    image: '/assets/badges/streak-achiever.png'
  },
  {
    badgeId: 'streak_150',
    tier: 'bronze',
    category: 'streak',
    name: 'Bronze Streak',
    threshold: 150,
    requirement: 'Maintain a 150-day continuous streak',
    thresholdLabel: '150 Consecutive Days',
    description: 'Your dedication is impressive! Maintain 150 consecutive days of learning.',
    image: '/assets/badges/bronze-streak.png'
  },
  {
    badgeId: 'streak_500',
    tier: 'silver',
    category: 'streak',
    name: 'Silver Streak',
    threshold: 500,
    requirement: 'Maintain a 500-day continuous streak',
    thresholdLabel: '500 Consecutive Days',
    description: 'An exceptional commitment to learning. Maintain 500 consecutive days.',
    image: '/assets/badges/silver-streak.png'
  },
  {
    badgeId: 'streak_1000',
    tier: 'gold',
    category: 'streak',
    name: 'Master Streak',
    threshold: 1000,
    requirement: 'Maintain a 1,000-day continuous streak',
    thresholdLabel: '1,000 Consecutive Days',
    description: 'An extraordinary achievement! Maintain a continuous learning streak of 1,000 days.',
    image: '/assets/badges/master-streak.png'
  }
];

// ─── Cloudinary Normal Badges Configuration ───
const CLOUDINARY_KS_NORMAL = 'https://res.cloudinary.com/dudqnkdte/image/upload/v1/upskillr/achievements/badges/knowledge-seeker-normal.png';
const CLOUDINARY_PERF_NORMAL = 'https://res.cloudinary.com/dudqnkdte/image/upload/v1/upskillr/achievements/badges/perfectionist-normal.png';

// ─── 4 Knowledge Seeker Badges Configuration (Course Completion) ───
const KNOWLEDGE_SEEKER_CONFIG = [
  {
    badgeId: 'knowledge_seeker_normal',
    tier: 'normal',
    name: 'Knowledge Seeker Normal',
    threshold: 5,
    requirement: 'Complete 5 courses',
    description: 'Explore new subjects, expand your expertise, and complete 5 full courses.',
    image: CLOUDINARY_KS_NORMAL,
    cloudinaryUrl: CLOUDINARY_KS_NORMAL,
    fallbackImage: '/assets/badges/knowledge-seeker-normal.png'
  },
  {
    badgeId: 'knowledge_seeker_bronze',
    tier: 'bronze',
    name: 'Knowledge Seeker Bronze',
    threshold: 15,
    requirement: 'Complete 15 courses',
    description: 'Expand your horizons, master new domains, and complete 15 full courses.',
    image: '/assets/badges/knowledge-seeker-bronze.png',
    cloudinaryUrl: '/assets/badges/knowledge-seeker-bronze.png',
    fallbackImage: '/assets/badges/knowledge-seeker-bronze.png'
  },
  {
    badgeId: 'knowledge_seeker_silver',
    tier: 'silver',
    name: 'Knowledge Seeker Silver',
    threshold: 30,
    requirement: 'Complete 30 courses',
    description: 'Demonstrate impressive dedication to lifelong learning by completing 30 full courses.',
    image: '/assets/badges/knowledge-seeker-silver.png',
    cloudinaryUrl: '/assets/badges/knowledge-seeker-silver.png',
    fallbackImage: '/assets/badges/knowledge-seeker-silver.png'
  },
  {
    badgeId: 'knowledge_seeker_gold',
    tier: 'gold',
    name: 'Knowledge Seeker Gold',
    threshold: 50,
    requirement: 'Complete 50 courses',
    description: 'Reach the pinnacle of knowledge mastery by completing 50 full courses on UpSkillR.',
    image: '/assets/badges/knowledge-seeker-gold.png',
    cloudinaryUrl: '/assets/badges/knowledge-seeker-gold.png',
    fallbackImage: '/assets/badges/knowledge-seeker-gold.png'
  }
];

// ─── 4 Perfectionist Badges Configuration (Academic Excellence - First Attempt 90%+) ───
const PERFECTIONIST_CONFIG = [
  {
    badgeId: 'perfectionist_normal',
    tier: 'normal',
    name: 'Perfectionist Normal',
    threshold: 3,
    requirement: 'Score 90%+ in 3 first attempts',
    description: 'Score 90% or above in 3 unique quizzes on your first attempt.',
    image: CLOUDINARY_PERF_NORMAL,
    cloudinaryUrl: CLOUDINARY_PERF_NORMAL,
    fallbackImage: '/assets/badges/perfectionist-normal.png'
  },
  {
    badgeId: 'perfectionist_bronze',
    tier: 'bronze',
    name: 'Perfectionist Bronze',
    threshold: 10,
    requirement: 'Score 90%+ in 10 first attempts',
    description: 'Score 90% or above in 10 unique quizzes on your first attempt.',
    image: '/assets/badges/perfectionist-bronze.png',
    cloudinaryUrl: '/assets/badges/perfectionist-bronze.png',
    fallbackImage: '/assets/badges/perfectionist-bronze.png'
  },
  {
    badgeId: 'perfectionist_silver',
    tier: 'silver',
    name: 'Perfectionist Silver',
    threshold: 25,
    requirement: 'Score 90%+ in 25 first attempts',
    description: 'Score 90% or above in 25 unique quizzes on your first attempt.',
    image: '/assets/badges/perfectionist-silver.png',
    cloudinaryUrl: '/assets/badges/perfectionist-silver.png',
    fallbackImage: '/assets/badges/perfectionist-silver.png'
  },
  {
    badgeId: 'perfectionist_gold',
    tier: 'gold',
    name: 'Perfectionist Gold',
    threshold: 50,
    requirement: 'Score 90%+ in 50 first attempts',
    description: 'Score 90% or above in 50 unique quizzes on your first attempt.',
    image: '/assets/badges/perfectionist-gold.png',
    cloudinaryUrl: '/assets/badges/perfectionist-gold.png',
    fallbackImage: '/assets/badges/perfectionist-gold.png'
  }
];

export const LearnerAchievementsView = ({
  gamification: initialGamification = { points: 0, currentStreak: 0, longestStreak: 0 },
  enrolments = [],
  onExploreCourses
}) => {
  // ─── 1. Core State ───
  const [stats, setStats] = useState({
    totalPoints: initialGamification.points || 0,
    currentStreak: initialGamification.currentStreak || 0,
    longestStreak: initialGamification.longestStreak || 0,
    completedCourses: 0,
    modulesCompleted: 0,
    badgesEarned: 0,
    streakBadgesUnlocked: 0,
    totalStreakBadges: 4,
    knowledgeSeekerBadgesUnlocked: 0,
    totalKnowledgeSeekerBadges: 4,
    perfectionistBadgesUnlocked: 0,
    totalPerfectionistBadges: 4,
    perfectionistQuizzesCount: 0
  });

  const [streakBadges, setStreakBadges] = useState([]);
  const [knowledgeSeekerBadges, setKnowledgeSeekerBadges] = useState([]);
  const [perfectionistBadges, setPerfectionistBadges] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [pointHistory, setPointHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── 2. Search, Filter & Pagination ───
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'oldest' | 'title'
  const [visibleCount, setVisibleCount] = useState(6);

  // ─── 3. Modal & Interactive State ───
  const [selectedCertModal, setSelectedCertModal] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Fetch all achievements, certificates, badges, and milestones
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    const token = sessionStorage.getItem('upskillr_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      // 1. Fetch Learner Profile Stats
      const statsPromise = fetch(`${API_BASE}/learners/me`, { headers })
        .then((r) => r.json())
        .catch(() => null);

      // 2. Fetch Earned Certificates
      const certsPromise = fetch(`${API_BASE}/certificates/me`, { headers })
        .then((r) => r.json())
        .catch(() => null);

      // 3. Fetch Milestones
      const milestonesPromise = fetch(`${API_BASE}/learners/me/milestones`, { headers })
        .then((r) => r.json())
        .catch(() => null);

      // 4. Fetch Point Transactions History (latest 5)
      const historyPromise = fetch(`${API_BASE}/learners/me/point-history?page=1&limit=5`, { headers })
        .then((r) => r.json())
        .catch(() => null);

      // 5. Fetch Learning Streak Badges
      const badgesPromise = fetch(`${API_BASE}/learners/me/badges`, { headers })
        .then((r) => r.json())
        .catch(() => null);

      const [statsRes, certsRes, milestonesRes, historyRes, badgesRes] = await Promise.all([
        statsPromise,
        certsPromise,
        milestonesPromise,
        historyPromise,
        badgesPromise
      ]);

      // Set Stats
      if (statsRes?.success && statsRes.stats) {
        setStats({
          totalPoints: statsRes.stats.totalPoints || 0,
          currentStreak: statsRes.stats.currentStreak || 0,
          longestStreak: statsRes.stats.longestStreak || 0,
          completedCourses: statsRes.stats.coursesCompleted || 0,
          modulesCompleted: statsRes.stats.modulesCompleted || 0,
          badgesEarned: statsRes.stats.badgesEarned ?? 0,
          streakBadgesUnlocked: statsRes.stats.streakBadgesUnlocked ?? 0,
          totalStreakBadges: statsRes.stats.totalStreakBadges ?? 4,
          knowledgeSeekerBadgesUnlocked: statsRes.stats.knowledgeSeekerBadgesUnlocked ?? 0,
          totalKnowledgeSeekerBadges: statsRes.stats.totalKnowledgeSeekerBadges ?? 4,
          perfectionistBadgesUnlocked: statsRes.stats.perfectionistBadgesUnlocked ?? 0,
          totalPerfectionistBadges: statsRes.stats.totalPerfectionistBadges ?? 4,
          perfectionistQuizzesCount: statsRes.stats.perfectionistQuizzesCount ?? 0
        });
      } else {
        // Fallback calculation from enrolments prop
        const completedCount = enrolments.filter(
          (e) => e.progressPercentage === 100 || e.status === 'completed'
        ).length;
        setStats((prev) => ({ ...prev, completedCourses: completedCount }));
      }

      // Set Badges
      if (badgesRes?.success) {
        if (Array.isArray(badgesRes.streakBadges)) {
          setStreakBadges(badgesRes.streakBadges);
        } else if (Array.isArray(badgesRes.badges)) {
          setStreakBadges(badgesRes.badges.filter(b => b.category === 'streak' || b.badgeId?.startsWith('streak_')));
        }

        if (Array.isArray(badgesRes.knowledgeSeekerBadges)) {
          setKnowledgeSeekerBadges(badgesRes.knowledgeSeekerBadges);
        } else if (Array.isArray(badgesRes.badges)) {
          setKnowledgeSeekerBadges(badgesRes.badges.filter(b => b.category === 'course_completion' || b.badgeId?.startsWith('knowledge_seeker_')));
        }

        if (Array.isArray(badgesRes.perfectionistBadges)) {
          setPerfectionistBadges(badgesRes.perfectionistBadges);
        } else if (Array.isArray(badgesRes.badges)) {
          setPerfectionistBadges(badgesRes.badges.filter(b => b.category === 'quiz_excellence' || b.badgeId?.startsWith('perfectionist_')));
        }

        if (badgesRes.stats) {
          setStats((prev) => ({
            ...prev,
            badgesEarned: badgesRes.stats.totalBadgesEarned ?? prev.badgesEarned ?? 0,
            streakBadgesUnlocked: badgesRes.stats.streakBadgesUnlocked ?? prev.streakBadgesUnlocked ?? 0,
            totalStreakBadges: badgesRes.stats.totalStreakBadges ?? 4,
            knowledgeSeekerBadgesUnlocked: badgesRes.stats.knowledgeSeekerBadgesUnlocked ?? prev.knowledgeSeekerBadgesUnlocked ?? 0,
            totalKnowledgeSeekerBadges: badgesRes.stats.totalKnowledgeSeekerBadges ?? 4,
            perfectionistBadgesUnlocked: badgesRes.stats.perfectionistBadgesUnlocked ?? prev.perfectionistBadgesUnlocked ?? 0,
            totalPerfectionistBadges: badgesRes.stats.totalPerfectionistBadges ?? 4,
            perfectionistQuizzesCount: badgesRes.stats.perfectionistQuizzesCount ?? prev.perfectionistQuizzesCount ?? 0
          }));
        }
      }

      // Set Certificates
      if (certsRes?.success && Array.isArray(certsRes.certificates)) {
        setCertificates(certsRes.certificates);
      } else {
        // Fallback to /learners/me/certificates if needed
        try {
          const fallbackCerts = await fetch(`${API_BASE}/learners/me/certificates`, { headers }).then((r) => r.json());
          if (fallbackCerts?.success && Array.isArray(fallbackCerts.certificates)) {
            setCertificates(fallbackCerts.certificates);
          }
        } catch (e) {}
      }

      // Set Milestones
      if (milestonesRes?.success && Array.isArray(milestonesRes.milestones)) {
        setMilestones(milestonesRes.milestones);
      }

      // Set Point History
      if (historyRes?.success && Array.isArray(historyRes.history)) {
        setPointHistory(historyRes.history);
      }
    } catch (err) {
      console.error('Error loading achievements dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [enrolments]);

  useEffect(() => {
    loadDashboardData();

    const handlePointsUpdate = () => loadDashboardData();
    const handleLiveSync = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      loadDashboardData();
    };
    window.addEventListener('upskillr_points_updated', handlePointsUpdate);
    window.addEventListener('upskillr_badge_unlocked', handlePointsUpdate);
    window.addEventListener('focus', handleLiveSync);
    document.addEventListener('visibilitychange', handleLiveSync);
    return () => {
      window.removeEventListener('upskillr_points_updated', handlePointsUpdate);
      window.removeEventListener('upskillr_badge_unlocked', handlePointsUpdate);
      window.removeEventListener('focus', handleLiveSync);
      document.removeEventListener('visibilitychange', handleLiveSync);
    };
  }, [loadDashboardData]);

  // ─── 4. Filtered & Sorted Certificates ───
  const filteredCertificates = useMemo(() => {
    let list = [...certificates];

    // Search filter by course title or certificate ID
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.courseTitle?.toLowerCase().includes(q) ||
          c.certificateId?.toLowerCase().includes(q) ||
          c.instructorName?.toLowerCase().includes(q)
      );
    }

    // Sort order
    if (sortBy === 'recent') {
      list.sort((a, b) => new Date(b.completionDate || b.issuedAt || 0) - new Date(a.completionDate || a.issuedAt || 0));
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.completionDate || a.issuedAt || 0) - new Date(b.completionDate || b.issuedAt || 0));
    } else if (sortBy === 'title') {
      list.sort((a, b) => (a.courseTitle || '').localeCompare(b.courseTitle || ''));
    }

    return list;
  }, [certificates, searchQuery, sortBy]);

  const visibleCertificates = useMemo(() => {
    return filteredCertificates.slice(0, visibleCount);
  }, [filteredCertificates, visibleCount]);

  // ─── 5. Actions ───
  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2200);
  };

  const handleDownloadCertificate = (cert) => {
    if (!cert.certificateImageUrl) return;
    const link = document.createElement('a');
    link.href = cert.certificateImageUrl;
    link.download = `UpSkillR_Certificate_${cert.certificateId || 'Course'}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const handleNavigateExplore = () => {
    if (onExploreCourses) {
      onExploreCourses();
    } else {
      window.history.pushState({}, '', '/explore');
      window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/explore' } }));
    }
  };

  // Helper to format badge unlock date
  const formatUnlockedDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Partition all achievement badges cleanly into unified Earned Badges + per-category Next In Progress
  const {
    earnedBadges,
    badgesInProgress,
    allCategoriesCompleted
  } = useMemo(
    () =>
      partitionAchievementBadges({
        streakBadges,
        knowledgeSeekerBadges,
        perfectionistBadges,
        streakConfig: STREAK_BADGES_CONFIG,
        knowledgeSeekerConfig: KNOWLEDGE_SEEKER_CONFIG,
        perfectionistConfig: PERFECTIONIST_CONFIG,
        stats
      }),
    [streakBadges, knowledgeSeekerBadges, perfectionistBadges, stats]
  );

  const totalPlatformBadgesCount =
    (stats.totalStreakBadges || 4) +
    (stats.totalKnowledgeSeekerBadges || 4) +
    (stats.totalPerfectionistBadges || 4);

  // Helper icon for milestones
  const getMilestoneIcon = (id) => {
    switch (id) {
      case 'first_course':
        return <BookOpen size={22} />;
      case 'first_module':
        return <Layers size={22} />;
      case 'streak_3':
        return <Flame size={22} />;
      case 'streak_7':
        return <Zap size={22} />;
      case 'streak_30':
        return <ShieldCheck size={22} />;
      case 'courses_5':
        return <Award size={22} />;
      case 'courses_10':
        return <Trophy size={22} />;
      default:
        return <Star size={22} />;
    }
  };

  return (
    <div className="learner-achievements-page">
      {/* ─── 1. TOP HEADER & LEARNING OVERVIEW ─── */}
      <header className="achievements-header">
        <h1 className="achievements-page-title">My Achievements</h1>
        <p className="achievements-page-subtitle">
          Every milestone tells a story of your learning journey.
        </p>
      </header>

      {/* ─── 2. STATS SUMMARY CARDS ─── */}
      <section className="achievements-stats-grid" aria-label="Learning Statistics">
        <div className="achieve-stat-card">
          <div className="achieve-icon-box streak-icon">
            <Flame size={24} />
          </div>
          <div className="achieve-stat-meta">
            <span className="achieve-stat-number">{stats.currentStreak} Days</span>
            <span className="achieve-stat-label">Current Streak</span>
          </div>
          <span className="stat-card-badge streak-badge">Active</span>
        </div>

        <div className="achieve-stat-card">
          <div className="achieve-icon-box best-streak-icon">
            <Trophy size={24} />
          </div>
          <div className="achieve-stat-meta">
            <span className="achieve-stat-number">{stats.longestStreak} Days</span>
            <span className="achieve-stat-label">Longest Streak</span>
          </div>
          <span className="stat-card-badge best-badge">Record</span>
        </div>

        <div className="achieve-stat-card">
          <div className="achieve-icon-box badges-stat-icon">
            <Award size={24} />
          </div>
          <div className="achieve-stat-meta">
            <span className="achieve-stat-number">{stats.badgesEarned ?? 0}</span>
            <span className="achieve-stat-label">Badges Earned</span>
          </div>
          <span className="stat-card-badge badges-badge">
            {(stats.streakBadgesUnlocked || 0) + (stats.knowledgeSeekerBadgesUnlocked || 0) + (stats.perfectionistBadgesUnlocked || 0)} / {(stats.totalStreakBadges || 4) + (stats.totalKnowledgeSeekerBadges || 4) + (stats.totalPerfectionistBadges || 4)} Badges
          </span>
        </div>

        <div className="achieve-stat-card">
          <div className="achieve-icon-box points-icon">
            <Star size={24} />
          </div>
          <div className="achieve-stat-meta">
            <span className="achieve-stat-number">{stats.totalPoints} pts</span>
            <span className="achieve-stat-label">Total Points</span>
          </div>
          <span className="stat-card-badge points-badge">+25 / Course</span>
        </div>

        <div className="achieve-stat-card">
          <div className="achieve-icon-box completed-icon">
            <CheckCircle2 size={24} />
          </div>
          <div className="achieve-stat-meta">
            <span className="achieve-stat-number">{stats.completedCourses}</span>
            <span className="achieve-stat-label">Completed Courses</span>
          </div>
          <span className="stat-card-badge completed-badge">100% Done</span>
        </div>
      </section>

      {/* ─── 3. SECTION ONE: EARNED BADGES (UNIFIED ACROSS CATEGORIES) ─── */}
      <section className="achievements-badges-panel earned-badges-panel" aria-label="Earned Badges">
        <div className="badges-panel-header">
          <div className="badges-panel-title-wrap">
            <Award size={20} className="badges-panel-icon-green" />
            <h2 className="badges-panel-title">Earned Badges</h2>
          </div>

          <span className="badges-earned-count-pill">
            {earnedBadges.length} {earnedBadges.length === 1 ? 'BADGE EARNED' : 'BADGES EARNED'}
          </span>
        </div>

        {loading && earnedBadges.length === 0 ? (
          <div className="badges-panel-loading">Loading your earned badges...</div>
        ) : earnedBadges.length === 0 ? (
          <div className="badges-earned-empty-state" role="status">
            <Award size={32} className="empty-state-award-icon" />
            <p className="empty-state-message">
              No badges earned yet. Keep learning to unlock your first achievement!
            </p>
          </div>
        ) : (
          <div className="achieve-earned-badges-grid">
            {earnedBadges.map((badge) => {
              const formattedDate = formatUnlockedDate(badge.unlockedAt);
              const tier = badge.tier || 'normal';
              const categoryKey = badge.category || 'streak';

              return (
                <article
                  key={badge.badgeId}
                  className={`achieve-earned-badge-card category-${categoryKey} tier-${tier}`}
                >
                  <div className="achieve-earned-artwork-wrap">
                    <img
                      src={badge.artworkSrc}
                      alt={`${badge.name} badge`}
                      className="achieve-earned-artwork-img"
                      loading="lazy"
                      onError={(e) => {
                        if (badge.fallbackArtworkSrc && e.currentTarget.src !== badge.fallbackArtworkSrc) {
                          e.currentTarget.src = badge.fallbackArtworkSrc;
                        }
                      }}
                    />
                    <span className="achieve-earned-check-icon" title="Unlocked & Verified" aria-label="Unlocked">
                      <CheckCircle2 size={13} />
                    </span>
                  </div>

                  <div className="achieve-earned-content">
                    <div className="achieve-badge-tags-row">
                      <span className="achieve-badge-category-tag">{badge.categoryLabel}</span>
                      <span className={`achieve-badge-tier-tag tier-tag-${tier}`}>{badge.tierLabel}</span>
                    </div>
                    <h3 className="achieve-earned-title">{badge.name}</h3>
                    <p className="achieve-earned-condition">{badge.requirement}</p>
                    <div className="achieve-earned-date-row">
                      <Calendar size={12} className="achieve-earned-cal-icon" />
                      <span>{formattedDate ? `Earned ${formattedDate}` : 'Unlocked'}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── 4. SECTION TWO: BADGES IN PROGRESS (NEXT TARGET PER CATEGORY) ─── */}
      <section className="achievements-badges-panel progress-badges-panel" aria-label="Badges in Progress">
        <div className="badges-panel-header">
          <div className="badges-panel-title-lockup">
            <div className="badges-panel-icon-box">
              <Target size={19} className="badges-panel-icon-amber" />
            </div>
            <div>
              <h2 className="badges-panel-title">Badges in Progress</h2>
              <p className="badges-panel-subtitle">
                Your immediate next achievement goal across each learning category.
              </p>
            </div>
          </div>

          <span className={`badges-progress-count-pill ${allCategoriesCompleted ? 'is-completed' : ''}`}>
            {allCategoriesCompleted
              ? `${earnedBadges.length} / ${totalPlatformBadgesCount} COMPLETED`
              : `${badgesInProgress.length} ${badgesInProgress.length === 1 ? 'ACTIVE GOAL' : 'ACTIVE GOALS'}`}
          </span>
        </div>

        {allCategoriesCompleted ? (
          <div className="achieve-all-completed-box" role="status">
            <div className="completed-celebration-icon-wrap">
              <Trophy size={28} />
            </div>
            <div className="completed-celebration-text">
              <h3>All Achievement Tiers Unlocked!</h3>
              <p>
                Remarkable achievement! You have conquered every tier across Learning Streak, Knowledge Seeker, and Perfectionist.
              </p>
            </div>
          </div>
        ) : (
          <div className="achieve-progress-badges-grid">
            {badgesInProgress.map((badge) => {
              const tier = badge.tier || 'normal';
              const categoryKey = badge.category || 'streak';
              const progressNum = Number(badge.progress || 0);
              const targetNum = Number(badge.threshold || 1);
              const pct = Math.min(100, Math.max(0, Number(badge.progressPercent ?? 0)));

              return (
                <article
                  key={badge.badgeId}
                  className={`achieve-progress-badge-card category-${categoryKey} tier-${tier}`}
                >
                  <div className="achieve-progress-card-top">
                    <div className="achieve-progress-artwork-wrap">
                      <img
                        src={badge.artworkSrc}
                        alt={`${badge.name} locked preview`}
                        className="achieve-progress-artwork-img"
                        loading="lazy"
                        onError={(e) => {
                          if (badge.fallbackArtworkSrc && e.currentTarget.src !== badge.fallbackArtworkSrc) {
                            e.currentTarget.src = badge.fallbackArtworkSrc;
                          }
                        }}
                      />
                      <span className="achieve-progress-lock-dot" title="Locked — In Progress" aria-hidden="true">
                        <Lock size={11} />
                      </span>
                    </div>

                    <div className="achieve-progress-meta">
                      <div className="achieve-badge-tags-row">
                        <span className="achieve-badge-category-tag">{badge.categoryLabel}</span>
                        <span className={`achieve-badge-tier-tag tier-tag-${tier}`}>{badge.tierLabel}</span>
                      </div>
                      <h3 className="achieve-progress-title">{badge.name}</h3>
                      <p className="achieve-progress-req">{badge.requirement}</p>
                    </div>
                  </div>

                  <div className="achieve-progress-meter-box">
                    <div className="achieve-progress-meter-row">
                      <span className="achieve-progress-metric-label">{badge.metricLabel}</span>
                      <span className="achieve-progress-metric-value">
                        {progressNum.toLocaleString()} / {targetNum.toLocaleString()} {badge.unit}
                      </span>
                    </div>
                    <div
                      className="achieve-progress-track"
                      role="progressbar"
                      aria-label={`${badge.name} progress`}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className={`achieve-progress-fill category-fill-${categoryKey} tier-fill-${tier}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── 5. CERTIFICATES SECTION (MAIN FOCUS) ─── */}
      <section className="achievements-certificates-section" aria-label="Course Certificates">
        <div className="cert-section-header">
          <div className="cert-title-lockup">
            <div className="cert-title-icon-badge">
              <Award size={22} className="accent-green" />
            </div>
            <div>
              <h2 className="cert-section-title">My Certificates</h2>
              <p className="cert-section-subtitle">
                Your learning achievements, officially recognized.
              </p>
            </div>
          </div>

          <span className="cert-counter-badge">
            {certificates.length} {certificates.length === 1 ? 'Certificate' : 'Certificates'}
          </span>
        </div>

        {/* Filter & Search Bar */}
        {certificates.length > 0 && (
          <div className="cert-controls-row">
            <div className="cert-search-input-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search certificates by course name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="cert-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn-clear-search"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="cert-sort-wrap">
              <ArrowUpDown size={15} className="sort-icon" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="cert-sort-select"
                aria-label="Sort certificates"
              >
                <option value="recent">Recently Earned</option>
                <option value="oldest">Oldest First</option>
                <option value="title">Course Name (A-Z)</option>
              </select>
            </div>
          </div>
        )}

        {/* Content: Loading / Empty / Grid */}
        {loading ? (
          <div className="cert-state-box loading-box">
            <div className="cert-spinner" />
            <p>Loading your verified certificates...</p>
          </div>
        ) : certificates.length === 0 ? (
          /* Empty State when no certificates earned */
          <div className="cert-empty-collection-box">
            <div className="empty-trophy-symbol">
              <Award size={52} className="accent-green" />
            </div>
            <h3 className="empty-collection-title">Your Certificate Collection Starts Here!</h3>
            <p className="empty-collection-desc">
              Complete your enrolled courses and earn certificates that showcase your skills and dedication.
            </p>
            <button
              type="button"
              className="btn-explore-collection"
              onClick={handleNavigateExplore}
            >
              <span>Explore Courses</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : filteredCertificates.length === 0 ? (
          /* Empty state when search filters out all certificates */
          <div className="cert-state-box no-results-box">
            <Filter size={32} className="text-muted" />
            <h4>No certificates match "{searchQuery}"</h4>
            <p>Try searching with another keyword or clear your search query.</p>
            <button
              type="button"
              className="btn-clear-filter"
              onClick={() => setSearchQuery('')}
            >
              Clear Filter
            </button>
          </div>
        ) : (
          /* Real Certificates Grid */
          <>
            <div className="certificates-grid">
              {visibleCertificates.map((cert) => {
                const completionDateStr = cert.completionDate || cert.issuedAt;
                const formattedDate = completionDateStr
                  ? new Date(completionDateStr).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : 'Completed';

                return (
                  <div key={cert.certificateId || cert._id} className="certificate-card">
                    {/* Actual Certificate Thumbnail Preview */}
                    <div
                      className="cert-card-preview-frame"
                      onClick={() => setSelectedCertModal(cert)}
                      title="Click to preview certificate in full resolution"
                    >
                      <img
                        src={cert.certificateImageUrl || '/assets/certificate_template.png'}
                        alt={`Certificate for ${cert.courseTitle}`}
                        className="cert-card-img"
                        loading="lazy"
                      />
                      <div className="cert-preview-hover-overlay">
                        <Eye size={20} />
                        <span>View Certificate</span>
                      </div>
                    </div>

                    {/* Certificate Card Body */}
                    <div className="cert-card-body">
                      <div className="cert-card-status-pill">
                        <ShieldCheck size={14} className="accent-green" />
                        <span>Verified & Authentic</span>
                      </div>

                      <h3 className="cert-card-title" title={cert.courseTitle}>
                        {cert.courseTitle}
                      </h3>

                      <div className="cert-card-meta-list">
                        <div className="cert-meta-row">
                          <span className="meta-label">Awarded To:</span>
                          <strong className="meta-value">{cert.studentName || 'Learner'}</strong>
                        </div>
                        <div className="cert-meta-row">
                          <span className="meta-label">Instructor:</span>
                          <span className="meta-value">{cert.instructorName || 'UpSkillR Instructor'}</span>
                        </div>
                        <div className="cert-meta-row">
                          <span className="meta-label">Date:</span>
                          <span className="meta-value">{formattedDate}</span>
                        </div>
                        <div className="cert-meta-row id-row">
                          <span className="meta-label">ID:</span>
                          <code className="cert-id-tag">{cert.certificateId}</code>
                          <button
                            type="button"
                            className="btn-copy-tag"
                            onClick={() => handleCopyId(cert.certificateId)}
                            title="Copy Certificate ID"
                          >
                            {copiedId === cert.certificateId ? (
                              <Check size={12} className="accent-green" />
                            ) : (
                              <Copy size={12} />
                            )}
                            <span>{copiedId === cert.certificateId ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Card Action Bar */}
                      <div className="cert-card-actions">
                        <button
                          type="button"
                          className="btn-action-view"
                          onClick={() => setSelectedCertModal(cert)}
                        >
                          <Eye size={15} />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          className="btn-action-download"
                          onClick={() => handleDownloadCertificate(cert)}
                          title="Download high-resolution PNG"
                        >
                          <Download size={15} />
                          <span>Download</span>
                        </button>

                        <a
                          href={`/verify-certificate/${cert.certificateId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-action-verify"
                          title="Open public verification page"
                        >
                          <span>Verify</span>
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Pagination */}
            {filteredCertificates.length > visibleCount && (
              <div className="cert-load-more-row">
                <button
                  type="button"
                  className="btn-load-more-certs"
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                >
                  <span>Load More Certificates</span>
                  <span className="load-count-chip">
                    +{filteredCertificates.length - visibleCount} remaining
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ─── 5. POINTS & REWARDS SYSTEM AUDIT LOG ─── */}
      <section className="achievements-rewards-section" aria-label="Points Rules and Activity">
        <div className="rewards-rules-header">
          <div className="rules-icon-wrap">
            <Star size={20} className="accent-green" />
          </div>
          <div>
            <h2 className="rewards-rules-title">Points & Activity Rules</h2>
            <p className="rewards-rules-subtitle">
              Points are awarded automatically based on genuine platform activity.
            </p>
          </div>
        </div>

        <div className="rewards-rules-grid">
          <div className="reward-rule-card">
            <span className="rule-points-pill">+1 point</span>
            <h4 className="rule-card-title">Daily Login</h4>
            <p className="rule-card-desc">
              Awarded once per calendar day upon your first successful login.
            </p>
          </div>

          <div className="reward-rule-card">
            <span className="rule-points-pill">+5 points</span>
            <h4 className="rule-card-title">Module Completion</h4>
            <p className="rule-card-desc">
              Awarded for completing all lesson checks and videos in a module.
            </p>
          </div>

          <div className="reward-rule-card">
            <span className="rule-points-pill">+25 points</span>
            <h4 className="rule-card-title">Course Completion</h4>
            <p className="rule-card-desc">
              Awarded when you finish 100% of curriculum & satisfy watch criteria.
            </p>
          </div>
        </div>

        {/* Recent Ledger Activity */}
        {pointHistory.length > 0 && (
          <div className="rewards-ledger-box">
            <h4 className="ledger-box-title">Recent Point Awards</h4>
            <div className="ledger-items-list">
              {pointHistory.map((tx, idx) => (
                <div key={tx._id || idx} className="ledger-item-row">
                  <div className="ledger-item-left">
                    <span className="ledger-type-dot" />
                    <div>
                      <span className="ledger-desc">{tx.description}</span>
                      <span className="ledger-date">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  <strong className="ledger-points">+{tx.points} pts</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── 6. DEDICATED CERTIFICATE VIEWER MODAL ─── */}
      {selectedCertModal && (
        <div
          className="cert-viewer-modal-overlay"
          onClick={() => setSelectedCertModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="cert-viewer-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="cert-viewer-header">
              <div className="cert-viewer-title-row">
                <Award size={22} className="accent-green" />
                <div>
                  <h3 className="cert-viewer-heading">{selectedCertModal.courseTitle}</h3>
                  <span className="cert-viewer-id">Certificate ID: {selectedCertModal.certificateId}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-cert-viewer-close"
                onClick={() => setSelectedCertModal(null)}
                aria-label="Close certificate dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* High-Resolution Document Canvas */}
            <div className="cert-viewer-canvas-wrap">
              <img
                src={selectedCertModal.certificateImageUrl || '/assets/certificate_template.png'}
                alt={`Certificate for ${selectedCertModal.courseTitle}`}
                className="cert-viewer-document-img"
              />
            </div>

            {/* Modal Actions */}
            <div className="cert-viewer-footer">
              <div className="cert-viewer-meta-tags">
                <span className="meta-tag">
                  <ShieldCheck size={14} className="accent-green" /> Officially Verified
                </span>
                <span className="meta-tag">
                  <Clock size={14} /> Completed:{' '}
                  {new Date(selectedCertModal.completionDate || selectedCertModal.issuedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="cert-viewer-action-btns">
                <button
                  type="button"
                  className="btn-viewer-copy"
                  onClick={() => handleCopyId(selectedCertModal.certificateId)}
                >
                  {copiedId === selectedCertModal.certificateId ? (
                    <Check size={15} className="accent-green" />
                  ) : (
                    <Copy size={15} />
                  )}
                  <span>{copiedId === selectedCertModal.certificateId ? 'Copied' : 'Copy ID'}</span>
                </button>

                <a
                  href={`/verify-certificate/${selectedCertModal.certificateId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-viewer-verify"
                >
                  <ExternalLink size={15} />
                  <span>Verify Online</span>
                </a>

                <button
                  type="button"
                  className="btn-viewer-download"
                  onClick={() => handleDownloadCertificate(selectedCertModal)}
                >
                  <Download size={15} />
                  <span>Download PNG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnerAchievementsView;
