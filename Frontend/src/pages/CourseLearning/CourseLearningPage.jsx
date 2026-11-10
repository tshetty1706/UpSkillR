import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Award,
  Play,
  Star,
  Users,
  Download,
  AlertCircle,
  Info,
  RefreshCw,
  MessageSquare,
  X,
  Trophy,
  Bell,
  ArrowRight,
  CheckCircle2,
  Lock,
  Clock,
  FileText,
  PlayCircle,
  HelpCircle,
  FileDown,
  Code,
  Check,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Layers,
  Sparkles,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { Avatar } from '../../components/common/Avatar/Avatar';
import { CourseThumbnail } from '../../components/common/CourseThumbnail';
import { CourseRatingModal } from '../../components/learner/dashboard/LearnerDashboardOverview/CourseRatingModal';
import { CourseLeaderboardView } from '../CourseWorkspace/components/CourseLeaderboardView.jsx';
import { CourseAssessmentsTab } from './components/CourseAssessmentsTab.jsx';
import { useToast } from '../../context/ToastContext';
import { API_BASE } from '../../config/api';
import { getCourseReturnUrl, getCourseReturnLabel, navigateTo } from '../../utils/navigationHelper';
import { getReviewerDisplayName, getReviewerAvatar } from '../../utils/reviewerDisplay';
import { isCourseCertificateEnabled } from '../../utils/courseCertificate';
import './CourseLearningPage.css';

export const CourseLearningPage = ({ courseId, user = null }) => {
  const { toast } = useToast();

  const [course, setCourse] = useState(null);
  const [enrolment, setEnrolment] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [userCertificate, setUserCertificate] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Enrollment & Q&A action states
  const [enrolling, setEnrolling] = useState(false);
  const [questionInput, setQuestionInput] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [qaFilter, setQaFilter] = useState('all'); // 'all' | 'answered' | 'pending'

  // Navigation tab state: 'curriculum' | 'reviews' | 'qa' | 'leaderboard' | 'assessments' | 'notices'
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['curriculum', 'reviews', 'qa', 'leaderboard', 'assessments', 'notices'].includes(tabParam)) {
        return tabParam;
      }
    } catch (e) {}
    return 'curriculum';
  });

  // Course navigation tab unread notification counts (source of truth from backend)
  const [unreadCounts, setUnreadCounts] = useState({
    reviews: 0,
    qa: 0,
    assessments: 0,
    notices: 0,
    total: 0
  });
  const markInFlightRef = useRef(new Set());

  const fetchUnreadSectionCounts = useCallback(async () => {
    if (!courseId) return;
    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    if (!token || (user?.role && user.role !== 'learner')) {
      setUnreadCounts({ reviews: 0, qa: 0, assessments: 0, notices: 0, total: 0 });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/learners/me/notifications/course/${courseId}/unread-counts`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && data.unreadCounts) {
        setUnreadCounts({
          reviews: data.unreadCounts.reviews || 0,
          qa: data.unreadCounts.qa || 0,
          assessments: data.unreadCounts.assessments || 0,
          notices: data.unreadCounts.notices || 0,
          total: data.unreadCounts.total || 0
        });
      }
    } catch (err) {
      console.warn('Error fetching course section unread counts:', err);
    }
  }, [courseId, user?.role]);

  const markCourseSectionRead = useCallback(async (sectionKey) => {
    if (!courseId || !['reviews', 'qa', 'assessments', 'notices'].includes(sectionKey)) return;
    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    if (!token || (user?.role && user.role !== 'learner')) return;

    const lockKey = `${courseId}:${sectionKey}`;
    if (markInFlightRef.current.has(lockKey)) return;
    markInFlightRef.current.add(lockKey);

    const viewedAt = new Date().toISOString();

    // Clear UI badge immediately on section open
    setUnreadCounts((prev) => {
      if (!prev[sectionKey]) return prev;
      const next = { ...prev, [sectionKey]: 0 };
      next.total = next.reviews + next.qa + next.assessments + next.notices;
      return next;
    });

    try {
      const res = await fetch(`${API_BASE}/learners/me/notifications/course/${courseId}/mark-section-read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ section: sectionKey, viewedAt })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data.unreadCounts) {
          setUnreadCounts({
            reviews: data.unreadCounts.reviews || 0,
            qa: data.unreadCounts.qa || 0,
            assessments: data.unreadCounts.assessments || 0,
            notices: data.unreadCounts.notices || 0,
            total: data.unreadCounts.total || 0
          });
        }
        if ((data?.markedCount || 0) > 0) {
          window.dispatchEvent(
            new CustomEvent('upskillr_notifications_refresh', { detail: { source: 'course-section' } })
          );
        }
      }
    } catch (err) {
      console.warn(`Error marking ${sectionKey} notifications read:`, err);
    } finally {
      markInFlightRef.current.delete(lockKey);
    }
  }, [courseId, user?.role]);

  const handleTabChange = useCallback((tabKey) => {
    if (['reviews', 'qa', 'assessments', 'notices'].includes(tabKey)) {
      setUnreadCounts((prev) => {
        if (!prev[tabKey]) return prev;
        const next = { ...prev, [tabKey]: 0 };
        next.total = next.reviews + next.qa + next.assessments + next.notices;
        return next;
      });
    }
    setActiveTab(tabKey);
    try {
      const url = new URL(window.location.href);
      if (tabKey === 'curriculum') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tabKey);
      }
      window.history.replaceState({}, '', url.pathname + url.search);
    } catch (e) {
      console.error('Failed to sync tab in URL:', e);
    }
  }, []);

  // Backend-calculated course and module completion state
  const [backendProgress, setBackendProgress] = useState(null);

  // Modals state
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);

  // 1. Fetch Course Data, Learner Progress, Announcements & Certificates
  const fetchCourseData = useCallback(async () => {
    if (!courseId) return;
    // Prevent stale course data flash on course switch
    setLoading(true);
    setError(null);
    setCourse(null);
    setEnrolment(null);
    setBackendProgress(null);
    setAnnouncements([]);
    setUserCertificate(null);
    setReviews([]);
    setQuestions([]);

    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    const authHeaders = {};
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;

    try {
      // 1. Fetch Course Structure & Content + Public Overview (Reviews, Q&A)
      const [courseRes, overviewRes] = await Promise.all([
        fetch(`${API_BASE}/courses/public/${courseId}`, { headers: authHeaders }),
        fetch(`${API_BASE}/courses/public/${courseId}/overview`, { headers: authHeaders }).catch(() => null)
      ]);
      const courseData = await courseRes.json();

      if (!courseData.success || !courseData.course) {
        setError(courseData.message || 'Course content could not be loaded.');
        setLoading(false);
        return;
      }
      setCourse(courseData.course);

      if (overviewRes && overviewRes.ok) {
        const overviewData = await overviewRes.json().catch(() => null);
        if (overviewData?.success) {
          if (Array.isArray(overviewData.reviews)) setReviews(overviewData.reviews);
          if (Array.isArray(overviewData.questions)) setQuestions(overviewData.questions);
        }
      }

      // Fetch latest discussions (both pending and answered) and live reviews directly
      try {
        const [qRes, rRes] = await Promise.all([
          fetch(`${API_BASE}/courses/${courseId}/questions`, { headers: authHeaders }).catch(() => null),
          fetch(`${API_BASE}/courses/${courseId}/reviews`, { headers: authHeaders }).catch(() => null)
        ]);
        if (qRes && qRes.ok) {
          const qData = await qRes.json();
          if (qData?.success && Array.isArray(qData.questions)) {
            setQuestions(qData.questions);
          }
        }
        if (rRes && rRes.ok) {
          const rData = await rRes.json();
          if (rData?.success && Array.isArray(rData.reviews)) {
            setReviews(rData.reviews);
          }
        }
      } catch (e) {
        // Fallback to overview data
      }

      // 2. Fetch Learner Enrollment & Progress
      if (token) {
        try {
          const progressRes = await fetch(`${API_BASE}/courses/${courseId}/progress`, {
            headers: authHeaders
          });
          const progressData = await progressRes.json();
          if (progressData.success && typeof progressData.certificateEnabled === 'boolean') {
            setCourse((prev) =>
              prev
                ? {
                    ...prev,
                    certificate: progressData.certificateEnabled,
                    certificateSettings: { enabled: progressData.certificateEnabled }
                  }
                : prev
            );
            if (!progressData.certificateEnabled) {
              setUserCertificate(null);
            }
          }
          if (progressData.success && progressData.enrolment) {
            setEnrolment(progressData.enrolment);
            setBackendProgress({
              progressPercentage: progressData.progressPercentage ?? 0,
              completedContentsCount: progressData.completedContentsCount ?? 0,
              totalContentsCount: progressData.totalContentsCount ?? 1,
              isCompleted: Boolean(progressData.isCompleted),
              modulesProgress: Array.isArray(progressData.modulesProgress) ? progressData.modulesProgress : []
            });
          } else {
            setEnrolment(null);
            setBackendProgress(null);
          }
        } catch (e) {
          console.warn('Progress fetch notice:', e);
          setEnrolment(null);
          setBackendProgress(null);
        }

        // 3. Fetch Learner Announcements (Notice Board)
        try {
          const noticesRes = await fetch(`${API_BASE}/courses/${courseId}/learner-announcements`, {
            headers: authHeaders
          });
          const noticesData = await noticesRes.json();
          if (noticesData.success && Array.isArray(noticesData.announcements)) {
            setAnnouncements(noticesData.announcements);
          }
        } catch (e) {
          console.warn('Announcements fetch notice:', e);
        }

        // 4. Fetch Issued Certificate if available
        try {
          const certRes = await fetch(`${API_BASE}/certificates/me`, {
            headers: authHeaders
          });
          const ct = certRes.headers.get('content-type') || '';
          if (certRes.ok && ct.includes('application/json')) {
            const certData = await certRes.json().catch(() => null);
            if (certData?.success && Array.isArray(certData.certificates)) {
              const foundCert = certData.certificates.find((c) => {
                const cCourseId = typeof c.courseId === 'object' ? c.courseId?._id : c.courseId;
                return String(cCourseId) === String(courseId);
              });
              if (foundCert) {
                setUserCertificate(foundCert);
              }
            }
          }
        } catch (e) {
          // Gracefully suppress certificate check warnings
        }

        // 5. Record course access timestamp
        fetch(`${API_BASE}/courses/${courseId}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ courseId })
        }).catch(() => { });
      } else {
        setEnrolment(null);
      }
    } catch (err) {
      console.error('Error fetching course:', err);
      setError('Unable to load course. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [courseId, user?._id]);

  // Refresh live course data, certificate availability, reviews, and enrolment progress
  const lastLiveSyncRef = useRef(0);
  const refreshCourseReviews = useCallback(async () => {
    if (!courseId) return;
    lastLiveSyncRef.current = Date.now();
    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const [reviewsRes, courseRes, progressRes, certRes] = await Promise.all([
        fetch(`${API_BASE}/courses/${courseId}/reviews`, { headers: authHeaders }).catch(() => null),
        fetch(`${API_BASE}/courses/public/${courseId}`, { headers: authHeaders }).catch(() => null),
        token
          ? fetch(`${API_BASE}/courses/${courseId}/progress`, { headers: authHeaders }).catch(() => null)
          : Promise.resolve(null),
        token
          ? fetch(`${API_BASE}/certificates/me`, { headers: authHeaders }).catch(() => null)
          : Promise.resolve(null)
      ]);

      if (reviewsRes && reviewsRes.ok) {
        const rData = await reviewsRes.json().catch(() => null);
        if (rData?.success && Array.isArray(rData.reviews)) {
          setReviews(rData.reviews);
        }
      }
      if (courseRes && courseRes.ok) {
        const cData = await courseRes.json().catch(() => null);
        if (cData?.success && cData.course) {
          setCourse(cData.course);
        }
      }
      if (progressRes && progressRes.ok) {
        const pData = await progressRes.json().catch(() => null);
        if (pData?.success) {
          if (typeof pData.certificateEnabled === 'boolean') {
            setCourse((prev) =>
              prev
                ? {
                    ...prev,
                    certificate: pData.certificateEnabled,
                    certificateSettings: { enabled: pData.certificateEnabled }
                  }
                : prev
            );
            if (!pData.certificateEnabled) {
              setUserCertificate(null);
            }
          }
          if (pData.enrolment) {
            setEnrolment(pData.enrolment);
            setBackendProgress({
              progressPercentage: pData.progressPercentage ?? 0,
              completedContentsCount: pData.completedContentsCount ?? 0,
              totalContentsCount: pData.totalContentsCount ?? 1,
              isCompleted: Boolean(pData.isCompleted),
              modulesProgress: Array.isArray(pData.modulesProgress) ? pData.modulesProgress : []
            });
          }
        }
      }
      if (certRes && certRes.ok) {
        const ct = certRes.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const certData = await certRes.json().catch(() => null);
          if (certData?.success && Array.isArray(certData.certificates)) {
            const foundCert = certData.certificates.find((c) => {
              const cCourseId = typeof c.courseId === 'object' ? c.courseId?._id : c.courseId;
              return String(cCourseId) === String(courseId);
            });
            setUserCertificate(foundCert || null);
          }
        }
      }
    } catch (err) {
      console.warn('Error refreshing course reviews:', err);
    }
  }, [courseId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    fetchCourseData();
  }, [fetchCourseData]);

  // Fetch per-section unread notification counts & stay synced with NotificationBell / new content / instructor updates
  useEffect(() => {
    fetchUnreadSectionCounts();
    const interval = setInterval(fetchUnreadSectionCounts, 30000);
    const handleNotifRefresh = (e) => {
      if (e?.detail?.source === 'course-section') return;
      fetchUnreadSectionCounts();
    };
    const handleProgressSync = () => {
      fetchCourseData();
    };
    const handleLiveVisibilitySync = () => {
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      if (Date.now() - lastLiveSyncRef.current < 3000) return;
      refreshCourseReviews();
    };
    window.addEventListener('upskillr_notifications_refresh', handleNotifRefresh);
    window.addEventListener('upskillr_progress_updated', handleProgressSync);
    window.addEventListener('focus', handleLiveVisibilitySync);
    document.addEventListener('visibilitychange', handleLiveVisibilitySync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('upskillr_notifications_refresh', handleNotifRefresh);
      window.removeEventListener('upskillr_progress_updated', handleProgressSync);
      window.removeEventListener('focus', handleLiveVisibilitySync);
      document.removeEventListener('visibilitychange', handleLiveVisibilitySync);
    };
  }, [fetchUnreadSectionCounts, fetchCourseData, refreshCourseReviews]);

  // Mark currently unread section notifications as read whenever learner opens that section tab
  useEffect(() => {
    if (loading || !course?._id) return;
    if (['reviews', 'qa', 'assessments', 'notices'].includes(activeTab)) {
      markCourseSectionRead(activeTab);
    }
  }, [loading, course?._id, activeTab, markCourseSectionRead]);

  // Handle URL query parameters (e.g. ?tab=qa or ?questionId=...)
  useEffect(() => {
    const handleUrlParams = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['curriculum', 'reviews', 'qa', 'leaderboard', 'assessments', 'notices'].includes(tabParam)) {
        setActiveTab(tabParam);
      } else if (!tabParam) {
        setActiveTab('curriculum');
      }
    };
    handleUrlParams();
    window.addEventListener('popstate', handleUrlParams);
    window.addEventListener('upskillr_navigate', handleUrlParams);
    return () => {
      window.removeEventListener('popstate', handleUrlParams);
      window.removeEventListener('upskillr_navigate', handleUrlParams);
    };
  }, []);

  // Deep-link auto-scroll and highlight target question card
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const questionId = params.get('questionId');
    if (questionId && activeTab === 'qa' && questions.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`qa-question-${questionId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('qa-card-highlight-pulse');
          setTimeout(() => el.classList.remove('qa-card-highlight-pulse'), 3500);
        }
      }, 300);
    }
  }, [activeTab, questions]);

  // 2. Normalize Course Curriculum Tree
  const modulesList = useMemo(() => {
    if (!course) return [];
    const rawModules = Array.isArray(course.modules) && course.modules.length > 0
      ? course.modules
      : [];

    return rawModules.map((mod, mIdx) => {
      const rawLessons = Array.isArray(mod.lessons) ? mod.lessons : [];
      return {
        _id: mod._id || `module-${mIdx}`,
        title: mod.title || `Module ${mIdx + 1}`,
        description: mod.description || '',
        lessons: rawLessons.map((les, lIdx) => ({
          _id: les._id || `lesson-${mIdx}-${lIdx}`,
          title: les.title || `Lesson ${mIdx + 1}.${lIdx + 1}`,
          duration: les.duration || '10 min',
          type: les.type || 'video',
          video: les.video || null,
          items: Array.isArray(les.items) && les.items.length > 0
            ? les.items
            : Array.isArray(les.contentItems) && les.contentItems.length > 0
            ? les.contentItems
            : []
        }))
      };
    });
  }, [course]);

  // Check if a specific content item is completed
  const isItemCompleted = useCallback((item, lesson, mIdx, lIdx) => {
    if (!enrolment || !enrolment.completedLessons || !Array.isArray(enrolment.completedLessons)) return false;
    const completedList = enrolment.completedLessons.map(String);
    if (item?._id && completedList.includes(String(item._id))) return true;

    // Quizzes can ONLY be completed by direct quiz attempt submission, NEVER inherited
    const rawType = String(item?.type || '').trim().toLowerCase();
    const isQuiz = rawType === 'quiz' || rawType.includes('quiz') || Boolean(item?.quiz);
    if (isQuiz) {
      return false;
    }

    // For non-quiz items: if the parent lesson is marked completed in enrolment, its items are also complete
    const combinedKey = `${mIdx}-${lIdx}`;
    if (
      (lesson?._id && completedList.includes(String(lesson._id))) ||
      completedList.includes(combinedKey)
    ) {
      return true;
    }

    return false;
  }, [enrolment]);

  // Check if a lesson is completed
  const isLessonCompleted = useCallback((mIdx, lIdx, lesson) => {
    if (!enrolment || !lesson) return false;
    if (!enrolment.completedLessons || !Array.isArray(enrolment.completedLessons)) return false;
    const completedList = enrolment.completedLessons.map(String);

    if (lesson.items && lesson.items.length > 0) {
      return lesson.items.every((it) => isItemCompleted(it, lesson, mIdx, lIdx));
    }

    const combinedKey = `${mIdx}-${lIdx}`;
    if (
      (lesson._id && completedList.includes(String(lesson._id))) ||
      completedList.includes(combinedKey)
    ) {
      return true;
    }

    return false;
  }, [enrolment, isItemCompleted]);

  // Calculate items count inside a module
  const getModuleItemsCount = useCallback((mod) => {
    let count = 0;
    (mod.lessons || []).forEach((les) => {
      if (Array.isArray(les.items) && les.items.length > 0) {
        count += les.items.length;
      } else {
        count += 1;
      }
    });
    return count;
  }, []);

  // Resolve module progress strictly from backend completion calculations
  const getBackendModuleStats = useCallback((mIdx) => {
    const mod = modulesList[mIdx];
    if (!mod || !enrolment) {
      return { progressPercentage: 0, isCompleted: false };
    }
    const list = backendProgress?.modulesProgress;
    if (Array.isArray(list) && list.length > 0) {
      const match =
        list.find((mp) => mp._id && mod._id && String(mp._id) === String(mod._id)) ||
        list[mIdx];
      if (match) {
        return {
          progressPercentage: Number(match.progressPercentage) || 0,
          isCompleted: Boolean(match.isCompleted)
        };
      }
    }
    return { progressPercentage: 0, isCompleted: false };
  }, [modulesList, enrolment, backendProgress]);

  const getModuleProgress = useCallback((mIdx) => {
    return getBackendModuleStats(mIdx).progressPercentage;
  }, [getBackendModuleStats]);

  const isModuleCompleted = useCallback((mIdx) => {
    return getBackendModuleStats(mIdx).isCompleted;
  }, [getBackendModuleStats]);

  // Total lessons count
  const totalLessonsCount = useMemo(() => {
    return modulesList.reduce((sum, mod) => sum + (mod.lessons ? mod.lessons.length : 0), 0) || 1;
  }, [modulesList]);

  // Total content items count across all modules
  const totalContentsCount = useMemo(() => {
    if (backendProgress && typeof backendProgress.totalContentsCount === 'number' && backendProgress.totalContentsCount > 0) {
      return backendProgress.totalContentsCount;
    }
    let count = 0;
    modulesList.forEach((mod) => {
      count += getModuleItemsCount(mod);
    });
    return count || 1;
  }, [backendProgress, modulesList, getModuleItemsCount]);

  // Total completed contents count (from backend)
  const completedContentsCount = useMemo(() => {
    if (!enrolment) return 0;
    if (backendProgress && typeof backendProgress.completedContentsCount === 'number') {
      return backendProgress.completedContentsCount;
    }
    return 0;
  }, [enrolment, backendProgress]);

  // Check if course is 100% completed (from backend)
  const isCourseCompleted = useMemo(() => {
    if (!enrolment) return false;
    if (backendProgress) {
      return Boolean(backendProgress.isCompleted);
    }
    return (enrolment.status === 'completed' || enrolment.status === 'COMPLETED') && Number(enrolment.progressPercentage) >= 100;
  }, [enrolment, backendProgress]);

  // Total quizzes count (module/lesson quizzes only)
  const totalQuizzesCount = useMemo(() => {
    let count = 0;
    modulesList.forEach((mod) => {
      (mod.lessons || []).forEach((les) => {
        if (les.type === 'quiz') count += 1;
        if (Array.isArray(les.items)) {
          les.items.forEach((it) => {
            if (it.type === 'quiz' || it.quiz) count += 1;
          });
        }
      });
    });
    return count;
  }, [modulesList]);

  // Overall Course Progress Percentage (from backend)
  const progressPct = useMemo(() => {
    if (!enrolment) return 0;
    if (backendProgress && typeof backendProgress.progressPercentage === 'number') {
      return backendProgress.progressPercentage;
    }
    const backendPct = Number(enrolment.progressPercentage) || 0;
    return (enrolment.status === 'completed' || enrolment.status === 'COMPLETED') && backendPct >= 100 ? 100 : Math.min(backendPct, 99);
  }, [enrolment, backendProgress]);

  // Find the exact resume lesson & content item (first incomplete)
  const resumeInfo = useMemo(() => {
    for (let mIdx = 0; mIdx < modulesList.length; mIdx++) {
      const mod = modulesList[mIdx];
      for (let lIdx = 0; lIdx < (mod.lessons || []).length; lIdx++) {
        const les = mod.lessons[lIdx];
        const items = Array.isArray(les.items) && les.items.length > 0 ? les.items : [null];
        for (let itIdx = 0; itIdx < items.length; itIdx++) {
          const it = items[itIdx];
          const isDone = it ? isItemCompleted(it, les, mIdx, lIdx) : isLessonCompleted(mIdx, lIdx, les);
          if (!isDone) {
            return {
              moduleIdx: mIdx,
              lessonIdx: lIdx,
              itemIdx: itIdx,
              module: mod,
              lesson: les,
              item: it
            };
          }
        }
      }
    }
    const firstMod = modulesList[0];
    const firstLes = firstMod?.lessons?.[0];
    const firstItem = firstLes?.items?.[0] || null;
    return {
      moduleIdx: 0,
      lessonIdx: 0,
      itemIdx: 0,
      module: firstMod,
      lesson: firstLes,
      item: firstItem
    };
  }, [modulesList, isLessonCompleted, isItemCompleted]);

  // Find first incomplete lesson in a specific module
  const getFirstIncompleteLessonInModule = useCallback((mIdx) => {
    const mod = modulesList[mIdx];
    if (!mod || !mod.lessons) return { lessonIdx: 0, itemIdx: 0 };
    for (let lIdx = 0; lIdx < mod.lessons.length; lIdx++) {
      const les = mod.lessons[lIdx];
      const items = Array.isArray(les.items) && les.items.length > 0 ? les.items : [null];
      for (let itIdx = 0; itIdx < items.length; itIdx++) {
        const it = items[itIdx];
        const isDone = it ? isItemCompleted(it, les, mIdx, lIdx) : isLessonCompleted(mIdx, lIdx, les);
        if (!isDone) {
          return { lessonIdx: lIdx, itemIdx: itIdx };
        }
      }
    }
    return { lessonIdx: 0, itemIdx: 0 };
  }, [modulesList, isLessonCompleted, isItemCompleted]);

  // Enrollment state computed
  const isEnrolled = Boolean(enrolment);

  // ─── Enrollment & Question Submission Handlers ───
  const handleEnroll = async () => {
    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    if (!token) {
      toast.warning('Please log in as a Learner to enroll in this course.');
      sessionStorage.setItem('upskillr_redirect_after_login', `/courses/${courseId}`);
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/login' } }));
      return;
    }

    setEnrolling(true);
    try {
      const res = await fetch(`${API_BASE}/courses/enrol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ courseId })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || `Successfully enrolled in ${course?.title || 'course'}!`);
        await fetchCourseData();
      } else {
        toast.error(json.message || 'Enrollment failed.');
      }
    } catch (err) {
      console.error('Error during enrollment:', err);
      toast.error('Error during enrollment. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e?.preventDefault?.();
    if (!questionInput.trim()) return;

    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    if (!token) {
      toast.warning('Please log in as a learner to ask a question.');
      sessionStorage.setItem('upskillr_redirect_after_login', `/courses/${courseId}?tab=qa`);
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: '/login' } }));
      return;
    }

    setSubmittingQuestion(true);
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ question: questionInput.trim() })
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Your question has been submitted to the instructor!');
        setQuestionInput('');
        if (json.question) {
          setQuestions((prev) => [json.question, ...prev.filter((q) => q._id !== json.question._id)]);
        }
        try {
          const qRes = await fetch(`${API_BASE}/courses/${courseId}/questions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const qData = await qRes.json();
          if (qData?.success && Array.isArray(qData.questions)) {
            setQuestions(qData.questions);
          }
        } catch (e) {}
      } else {
        toast.error(json.message || 'Failed to submit question.');
      }
    } catch (err) {
      toast.error('Error submitting question. Please try again.');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  // ─── Navigation Handlers ───
  const handleBackToMyLearning = () => {
    const returnUrl = getCourseReturnUrl(user?.role === 'learner' ? '/learner/my-learning' : '/courses');
    navigateTo(returnUrl);
  };

  const backButtonLabel = useMemo(() => {
    return getCourseReturnLabel(user?.role || 'learner');
  }, [user]);

  const handleContinueLearning = () => {
    if (!isEnrolled) {
      handleEnroll();
      return;
    }
    const mIdx = resumeInfo.moduleIdx;
    const lIdx = resumeInfo.lessonIdx;
    const itIdx = resumeInfo.itemIdx;
    const navPath = `/learn/${courseId}?module=${mIdx}&lesson=${lIdx}&item=${itIdx}`;
    window.history.pushState({}, '', navPath);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: navPath } }));
  };

  // Resolve target lesson and content item inside a specific module when clicking Resume or Continue
  const getTargetLessonAndItemForModule = useCallback((mIdx, isModDone) => {
    const mod = modulesList[mIdx];
    if (!mod || !Array.isArray(mod.lessons) || mod.lessons.length === 0) {
      return { lessonIdx: 0, itemIdx: 0 };
    }

    const modLessons = mod.lessons;
    const byModMap = enrolment?.lastAccessedByModule;
    const modEntry =
      byModMap &&
      (byModMap[String(mod._id)] ||
        (typeof byModMap.get === 'function' ? byModMap.get(String(mod._id)) : null));

    let savedLessonId = modEntry?.lessonId ?? null;
    let savedItemId = modEntry?.itemId ?? null;

    if (
      (savedLessonId === null || savedLessonId === undefined) &&
      (String(enrolment?.lastAccessedModuleId) === String(mod._id) ||
        String(enrolment?.lastAccessedModuleId) === String(mIdx))
    ) {
      savedLessonId = enrolment?.lastAccessedLessonId ?? null;
      savedItemId = enrolment?.lastAccessedItemId ?? null;
    }

    if (savedLessonId !== null && savedLessonId !== undefined) {
      const foundLIdx = modLessons.findIndex(
        (l, idx) => String(l._id) === String(savedLessonId) || String(idx) === String(savedLessonId)
      );
      if (foundLIdx !== -1) {
        const targetLesson = modLessons[foundLIdx];
        const items = Array.isArray(targetLesson.items) && targetLesson.items.length > 0 ? targetLesson.items : [];
        let foundIIdx = 0;

        if (savedItemId !== null && savedItemId !== undefined && items.length > 0) {
          const matchItemIdx = items.findIndex(
            (it, idx) => String(it._id) === String(savedItemId) || String(idx) === String(savedItemId)
          );
          if (matchItemIdx !== -1) foundIIdx = matchItemIdx;
        } else if (!isModDone && items.length > 0) {
          const firstIncItemIdx = items.findIndex((it) => !isItemCompleted(it, targetLesson, mIdx, foundLIdx));
          foundIIdx = firstIncItemIdx !== -1 ? firstIncItemIdx : 0;
        }

        return { lessonIdx: foundLIdx, itemIdx: foundIIdx };
      }
    }

    if (!isModDone) {
      return getFirstIncompleteLessonInModule(mIdx);
    }

    return { lessonIdx: 0, itemIdx: 0 };
  }, [modulesList, enrolment, isItemCompleted, getFirstIncompleteLessonInModule]);

  const handleContinueModule = (mIdx, isModDone = false) => {
    if (!isEnrolled) {
      handleEnroll();
      return;
    }
    const mod = modulesList[mIdx];
    const { lessonIdx, itemIdx } = getTargetLessonAndItemForModule(mIdx, isModDone);
    const modIdParam = mod?._id ? `&moduleId=${encodeURIComponent(String(mod._id))}` : '';
    const navPath = `/learn/${courseId}?module=${mIdx}${modIdParam}&lesson=${lessonIdx}&item=${itemIdx}`;
    window.history.pushState({}, '', navPath);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: navPath } }));
  };

  // Certificate availability (strictly reflects instructor's backend course configuration)
  const isCertificateEnabled = isCourseCertificateEnabled(course);

  const isEligibleForCertificate = Boolean(
    isCertificateEnabled &&
    (isCourseCompleted || progressPct >= 100 || (enrolment && enrolment.status === 'completed'))
  );

  const handleGetCertificateClick = () => {
    if (!isCertificateEnabled) return;
    if (isEligibleForCertificate) {
      setIsCertificateOpen(true);
    } else {
      toast.info(`Complete 100% of the course to unlock your official verified certificate! Current progress: ${progressPct}%`);
    }
  };

  // Instructor Details Formatting
  const instructorObj = (course?.instructor && typeof course.instructor === 'object')
    ? course.instructor
    : (course?.instructorId && typeof course.instructorId === 'object')
    ? course.instructorId
    : null;

  const instructorName = instructorObj?.fullName || instructorObj?.name || course?.instructorName || 'Joy Arthur';
  const instructorAvatar = instructorObj?.avatar || instructorObj?.profilePicture || course?.instructorAvatar;
  const instructorDesignation = instructorObj?.designation || instructorObj?.specialization || course?.instructorDesignation || course?.instructorTitle || 'Senior Software Engineer';

  const formatCount = (num) => {
    if (!num) return '1,200';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  // Filtered Q&A Discussions
  const filteredQaQuestions = useMemo(() => {
    if (!Array.isArray(questions)) return [];
    if (qaFilter === 'answered') {
      return questions.filter((q) => q.status === 'answered' || Boolean(q.instructorReply));
    }
    if (qaFilter === 'pending') {
      return questions.filter((q) => q.status === 'pending' && !q.instructorReply);
    }
    return questions;
  }, [questions, qaFilter]);

  // ─── 3. Proper Shimmering Loading Skeleton Matching the NEW Course Page Layout ───
  if (loading) {
    return (
      <div className="course-learning-page-container skeleton-page" aria-busy="true" aria-label="Loading Course Overview">
        {/* 1. COMPACT HERO BANNER SKELETON */}
        <section className="learning-hero-banner compact-hero skeleton-hero-banner">
          <div className="learning-banner-inner">
            <div className="banner-top-nav-row">
              <div className="skl-box skl-back-pill" />
            </div>

            <div className="banner-main-grid">
              <div className="banner-info-column">
                <div className="skl-box skl-title-bar-1" />
                <div className="skl-box skl-title-bar-2" />
                <div className="skl-box skl-desc-bar-1" />
                <div className="skl-box skl-desc-bar-2" />

                <div className="banner-meta-row">
                  <div className="banner-instructor-badge skl-inst-badge">
                    <div className="skl-circle skl-inst-avatar" />
                    <div className="banner-instructor-info">
                      <div className="skl-box skl-inst-name" />
                      <div className="skl-box skl-inst-sub" />
                    </div>
                  </div>

                  <div className="banner-meta-chips">
                    <div className="skl-box skl-meta-chip" />
                    <div className="skl-box skl-meta-chip" />
                    <div className="skl-box skl-meta-chip" />
                  </div>
                </div>

                <div className="banner-progress-block">
                  <div className="skl-box skl-progress-track" />
                  <div className="skl-box skl-progress-label" />
                </div>
              </div>

              <div className="banner-visual-column">
                <div className="banner-device-frame skl-device-box">
                  <div className="skl-box skl-thumb-placeholder" />
                </div>
                <div className="banner-action-buttons-group">
                  <div className="skl-box skl-main-btn" />
                  <div className="banner-secondary-actions-row">
                    <div className="skl-box skl-sub-btn" />
                    <div className="skl-box skl-sub-btn" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. HORIZONTAL NAVIGATION TABS BAR SKELETON */}
        <nav className="learning-tabs-navbar skeleton-tabs-bar" aria-hidden="true">
          <div className="learning-tabs-nav-container">
            <div className="skl-box skl-tab-pill" />
            <div className="skl-box skl-tab-pill" />
            <div className="skl-box skl-tab-pill" />
            <div className="skl-box skl-tab-pill" />
            <div className="skl-box skl-tab-pill" />
            <div className="skl-box skl-tab-pill" />
          </div>
        </nav>

        {/* 3. MAIN CONTENT SKELETON (Curriculum & Side Column) */}
        <main className="learning-main-viewport" aria-hidden="true">
          <div className="gfg-curriculum-overview-container">
            <div className="curriculum-summary-header-row skeleton-summary-row">
              <div className="curriculum-summary-left">
                <div className="skl-box skl-summary-heading" />
                <div className="curriculum-stats-pills-row">
                  <div className="skl-box skl-stat-chip" />
                  <div className="skl-box skl-stat-chip" />
                  <div className="skl-box skl-stat-chip" />
                  <div className="skl-box skl-stat-chip" />
                </div>
              </div>
              <div className="curriculum-summary-right">
                <div className="skl-box skl-expand-pill" />
              </div>
            </div>

            <div className="gfg-curriculum-layout-grid">
              <div className="gfg-curriculum-main-column">
                <div className="gfg-modules-accordion-stack">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="gfg-module-accordion-card skeleton-module-item">
                      <div className="gfg-module-header-row">
                        <div className="gfg-module-header-left">
                          <div className="skl-box skl-m-badge" />
                          <div className="gfg-module-titles-box">
                            <div className="skl-box skl-m-title" />
                            <div className="skl-box skl-m-sub" />
                          </div>
                        </div>
                        <div className="gfg-module-header-right">
                          <div className="skl-box skl-m-pct" />
                          <div className="skl-box skl-m-action" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <aside className="gfg-curriculum-side-column">
                <div className="gfg-side-card certificate-promo-card skeleton-side-card">
                  <div className="skl-box skl-side-title" />
                  <div className="skl-box skl-side-desc" />
                  <div className="skl-box skl-side-item" />
                  <div className="skl-box skl-side-item" />
                  <div className="skl-box skl-side-item" />
                  <div className="skl-box skl-side-btn" />
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error View
  if (error || !course) {
    return (
      <div className="course-learning-error-screen">
        <div className="learning-error-card">
          <AlertCircle size={44} className="error-badge-icon" />
          <h2>Course Unavailable</h2>
          <p>{error || 'The requested course could not be found.'}</p>
          <div className="error-actions-btns">
            <button
              type="button"
              className="btn btn-primary"
              onClick={fetchCourseData}
              style={{ minHeight: '44px' }}
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleBackToMyLearning}
              style={{ minHeight: '44px' }}
            >
              <ArrowLeft size={16} />
              <span>{backButtonLabel}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="course-learning-page-container">
      {/* ─── 1. COMPACT HERO BANNER (Matches Reference Image 1) ─── */}
      <section className="learning-hero-banner compact-hero" aria-label="Course Overview Hero">
        <div className="learning-banner-inner">
          {/* Top Left Navigation Back Button */}
          <div className="banner-top-nav-row">
            <button
              type="button"
              className="btn-back-learning"
              onClick={handleBackToMyLearning}
              aria-label={backButtonLabel}
            >
              <ArrowLeft size={16} />
              <span>{backButtonLabel}</span>
            </button>
          </div>

          <div className="banner-main-grid">
            {/* Left Column: Course Details, Instructor & Progress */}
            <div className="banner-info-column">
              <h1 className="banner-course-title" title={course.title}>
                {course.title}
              </h1>

              <p className="banner-course-desc">
                {course.shortDescription ||
                  course.description ||
                  'Build modern, production-ready skills with hands-on projects, real-world examples, and industry best practices.'}
              </p>

              {/* Instructor Badge & Metadata Row */}
              <div className="banner-meta-row">
                <div className="banner-instructor-badge">
                  <Avatar
                    image={instructorAvatar}
                    name={instructorName}
                    size="small"
                    className="banner-instructor-avatar"
                  />
                  <div className="banner-instructor-info">
                    <span className="banner-instructor-name">{instructorName}</span>
                    <span className="banner-instructor-role">{instructorDesignation}</span>
                  </div>
                </div>

                <div className="banner-meta-chips">
                  {/* Rating */}
                  <span className="meta-chip rating-chip">
                    <Star size={14} className="star-fill" />
                    <span>{course.rating ? course.rating.toFixed(1) : '4.8'}</span>
                    <span className="meta-count">({course.reviewCount || '320'})</span>
                  </span>

                  {/* Learners Count */}
                  <span className="meta-chip learners-chip">
                    <Users size={14} />
                    <span>{formatCount(course.learnersCount || 1200)} learners</span>
                  </span>

                  {/* Skill Level */}
                  <span className="meta-chip level-chip">
                    {course.skillLevel || 'Intermediate'}
                  </span>
                </div>
              </div>

              {/* Progress Summary on Banner (Enrolled) vs Enrollment CTA (Unenrolled) */}
              {isEnrolled ? (
                <div className="banner-progress-block">
                  <div className="banner-progress-bar-wrap" aria-label={`Progress: ${progressPct}%`}>
                    <div
                      className="banner-progress-bar-fill"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="banner-progress-stats-text">
                    <span className="progress-percent-bold">{progressPct}% complete</span>
                    <span className="progress-count-sub">
                      Completed {completedContentsCount} of {totalContentsCount} contents
                    </span>
                  </div>
                </div>
              ) : (
                <div className="banner-enroll-cta-block">
                  <div className="banner-price-pill">
                    <span className="price-tag-label">PRICE</span>
                    <span className="price-tag-amount">Free</span>
                  </div>
                  <button
                    type="button"
                    className="btn-hero-enroll-action"
                    onClick={handleEnroll}
                    disabled={enrolling}
                    aria-label="Enroll for Free"
                  >
                    <BookOpen size={16} />
                    <span>{enrolling ? 'Enrolling...' : 'Enroll for Free →'}</span>
                  </button>
                  {isCertificateEnabled && (
                    <span className="enrollment-feature-tag">
                      <Award size={14} />
                      <span>Certificate Included</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Course Graphic & Action Controls */}
            <div className="banner-visual-column">
              {/* Laptop / Course Graphic Frame */}
              <div className="banner-device-frame">
                <CourseThumbnail
                  src={course?.thumbnail}
                  alt={course?.title || 'Course Thumbnail'}
                  className="banner-device-img"
                />
              </div>

              {/* Action Buttons Row */}
              <div className="banner-action-buttons-group">
                {/* Actions Row: Get Certificate & Share Feedback */}
                <div className="banner-secondary-actions-row">
                  {isCertificateEnabled && (
                    <button
                      type="button"
                      className={`btn-banner-secondary ${isEligibleForCertificate ? 'eligible' : ''}`}
                      onClick={handleGetCertificateClick}
                      aria-label="Get Certificate"
                    >
                      <Award size={15} />
                      <span>{isEligibleForCertificate ? 'Get Certificate' : 'Certificate'}</span>
                    </button>
                  )}

                  {isEnrolled && (
                    isCourseCompleted ? (
                      <button
                        type="button"
                        className="btn-banner-secondary eligible"
                        onClick={() => setIsRatingOpen(true)}
                        aria-label="Share Feedback"
                      >
                        <MessageSquare size={15} />
                        <span>Share Feedback</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-banner-secondary locked"
                        disabled
                        title="Complete 100% of this course to unlock ratings and reviews."
                        aria-label="Share Feedback Locked"
                      >
                        <Lock size={14} />
                        <span>Share Feedback</span>
                      </button>
                    )
                  )}
                </div>
                {isEnrolled && !isCourseCompleted && (
                  <div className="banner-feedback-lock-note">
                    <Lock size={12} />
                    <span>Complete 100% of this course to unlock ratings and reviews.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. HORIZONTAL NAVIGATION TABS BAR ─── */}
      <nav className="learning-tabs-navbar" aria-label="Course Overview Navigation">
        <div className="learning-tabs-nav-container">
          <button
            type="button"
            className={`learning-tab-nav-btn ${activeTab === 'curriculum' ? 'active' : ''}`}
            onClick={() => handleTabChange('curriculum')}
          >
            <BookOpen size={16} />
            <span>Modules</span>
          </button>

          <button
            type="button"
            className={`learning-tab-nav-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => handleTabChange('reviews')}
          >
            <Star size={16} />
            <span>Reviews</span>
            {unreadCounts.reviews > 0 && (
              <span className="tab-pill-badge" aria-label={`${unreadCounts.reviews} unread reviews`}>{unreadCounts.reviews}</span>
            )}
          </button>

          <button
            type="button"
            className={`learning-tab-nav-btn ${activeTab === 'qa' ? 'active' : ''}`}
            onClick={() => handleTabChange('qa')}
          >
            <HelpCircle size={16} />
            <span>Q&amp;A</span>
            {unreadCounts.qa > 0 && (
              <span className="tab-pill-badge" aria-label={`${unreadCounts.qa} unread Q&A updates`}>{unreadCounts.qa}</span>
            )}
          </button>

          <button
            type="button"
            className={`learning-tab-nav-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => handleTabChange('leaderboard')}
          >
            <Trophy size={16} />
            <span>Leaderboard</span>
          </button>

          <button
            type="button"
            className={`learning-tab-nav-btn ${activeTab === 'assessments' ? 'active' : ''}`}
            onClick={() => handleTabChange('assessments')}
          >
            <Award size={16} />
            <span>Assessments</span>
            {unreadCounts.assessments > 0 && (
              <span className="tab-pill-badge" aria-label={`${unreadCounts.assessments} unread assessments`}>{unreadCounts.assessments}</span>
            )}
          </button>

          <button
            type="button"
            className={`learning-tab-nav-btn ${activeTab === 'notices' ? 'active' : ''}`}
            onClick={() => handleTabChange('notices')}
          >
            <Bell size={16} />
            <span>Notice Board</span>
            {unreadCounts.notices > 0 && (
              <span className="tab-pill-badge" aria-label={`${unreadCounts.notices} unread notices`}>{unreadCounts.notices}</span>
            )}
          </button>
        </div>
      </nav>

      {/* ─── 3. TAB CONTENT MAIN VIEWPORT ─── */}
      <main className="learning-main-viewport" role="main">
        {/* ─── TAB A: SIMPLIFIED COURSE CURRICULUM (MODULES ONLY) ─── */}
        {activeTab === 'curriculum' && (
          <div className="gfg-curriculum-overview-container">
            {/* Curriculum Stats Header Bar */}
            <div className="curriculum-summary-header-row">
              <div className="curriculum-summary-left">
                <div className="curriculum-heading-with-icon">
                  <Layers size={22} className="curriculum-heading-icon" />
                  <h2 className="curriculum-main-heading">Course Curriculum</h2>
                </div>
                <div className="curriculum-stats-pills-row">
                  <span className="curriculum-stat-pill">
                    <strong>{modulesList.length}</strong> {modulesList.length === 1 ? 'Module' : 'Modules'}
                  </span>
                  <span className="curriculum-stat-pill highlight">
                    <strong>{progressPct}%</strong> Complete
                  </span>
                </div>
              </div>
            </div>

            {/* Two-Column Layout Grid */}
            <div className="gfg-curriculum-layout-grid">
              {/* LEFT / MAIN COLUMN (~68%) */}
              <div className="gfg-curriculum-main-column">
                {/* Compact Simplified Module Cards List */}
                <div className="gfg-modules-accordion-stack" role="list">
                  {modulesList.map((mod, mIdx) => {
                    const isModDone = isModuleCompleted(mIdx);
                    const modPct = getModuleProgress(mIdx);

                    return (
                      <div
                        key={mod._id || mIdx}
                        className={`gfg-module-accordion-card curriculum-module-card ${isModDone ? 'is-done' : ''}`}
                        role="listitem"
                      >
                        <div className="gfg-module-header-row curriculum-module-row">
                          {/* Left: Module Number & Title */}
                          <div className="gfg-module-header-left">
                            <div className={`gfg-module-num-badge ${isModDone ? 'done' : ''}`} aria-hidden="true">
                              {isModDone ? <Check size={16} strokeWidth={3} /> : `M${mIdx + 1}`}
                            </div>

                            <div className="gfg-module-titles-box">
                              <span className="curriculum-module-kicker">Module {mIdx + 1}</span>
                              <h3 className="gfg-module-card-title">{mod.title}</h3>
                            </div>
                          </div>

                          {/* Right: Progress, Completion Status & Resume / Continue Action */}
                          <div className="gfg-module-header-right curriculum-module-actions">
                            <div className="gfg-module-mini-progress">
                              <div className="gfg-progress-bar-track">
                                <div
                                  className={`gfg-progress-bar-fill ${isModDone ? 'done' : ''}`}
                                  style={{ width: `${modPct}%` }}
                                />
                              </div>
                              {isModDone ? (
                                <span className="gfg-badge-module-done">
                                  <Check size={13} strokeWidth={3} />
                                  <span>Completed</span>
                                </span>
                              ) : (
                                <span className="curriculum-progress-status-pill">
                                  {modPct}% Complete
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              className={`btn-gfg-module-action ${isModDone ? 'btn-continue' : 'btn-resume'}`}
                              onClick={() => handleContinueModule(mIdx, isModDone)}
                              aria-label={`${isModDone ? 'Continue' : 'Resume'} Module ${mIdx + 1}: ${mod.title}`}
                            >
                              <span>{isModDone ? 'Continue' : 'Resume'}</span>
                              <ArrowRight size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT SIDEBAR COLUMN (~32%) */}
              <aside className="gfg-curriculum-side-column" aria-label={isCertificateEnabled ? 'Course Highlights & Certificate' : 'Course Information'}>
                {isCertificateEnabled ? (
                  /* 1. Verified Certificate Promo Card */
                  <div className="gfg-side-card certificate-promo-card">
                    <div className="card-top-accent-line" />
                    <div className="promo-card-header">
                      <div className="promo-icon-badge">
                        <Award size={22} className="text-emerald" />
                      </div>
                      <div>
                        <span className="promo-super-label">UpSkillR Verified Credential</span>
                        <h4 className="promo-card-heading">Earn Your Course Certificate</h4>
                      </div>
                    </div>

                    <p className="promo-card-body">
                      Complete 100% of all lessons to earn an authentic, verifiable certificate signed by your course instructor.
                    </p>

                    <ul className="promo-benefits-list">
                      <li>
                        <ShieldCheck size={14} className="text-emerald" />
                        <span>Tamper-proof verifiable online credential</span>
                      </li>
                      <li>
                        <CheckCircle2 size={14} className="text-emerald" />
                        <span>Includes verified instructor designation</span>
                      </li>
                      <li>
                        <ExternalLink size={14} className="text-emerald" />
                        <span>Directly shareable on LinkedIn and portfolios</span>
                      </li>
                    </ul>

                    <div className="promo-action-box">
                      {isEligibleForCertificate ? (
                        <button
                          type="button"
                          className="btn-claim-certificate-glow"
                          onClick={handleGetCertificateClick}
                        >
                          <Award size={16} />
                          <span>View Verified Certificate</span>
                        </button>
                      ) : (
                        <div className="promo-locked-pill">
                          <Lock size={14} />
                          <span>Unlocks at 100% completion (Currently {progressPct}%)</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* 2. Informational Card when instructor disabled certificates */
                  <div className="gfg-side-card no-certificate-info-card">
                    <div className="promo-card-header">
                      <div className="promo-icon-badge no-cert-icon-badge">
                        <Info size={22} className="no-cert-info-icon" />
                      </div>
                      <div>
                        <h4 className="promo-card-heading">No Certificate Available</h4>
                      </div>
                    </div>

                    <p className="promo-card-body no-cert-card-body">
                      This course does not offer a certificate. You can still complete all modules, develop your skills and track your learning progress.
                    </p>
                  </div>
                )}
              </aside>
            </div>
          </div>
        )}

        {/* ─── TAB B: COURSE LEADERBOARD ─── */}
        {activeTab === 'leaderboard' && (
          <div className="tab-pane-container leaderboard-tab-pane">
            <CourseLeaderboardView
              courseId={courseId}
              courseTitle={course?.title}
              user={user}
            />
          </div>
        )}

        {/* ─── TAB C: COURSE ASSESSMENTS ─── */}
        {activeTab === 'assessments' && (
          <div className="tab-pane-container assessments-tab-pane">
            <div className="tab-pane-header tab-pane-header-with-count">
              <div>
                <h2>Course Assessments &amp; Final Exams</h2>
                <p>Complete graded milestone assessments to verify mastery and earn official Course Leaderboard points.</p>
              </div>
              <span className="tab-section-total-pill">
                {(course?.courseAssessments || []).length} {(course?.courseAssessments || []).length === 1 ? 'Assessment' : 'Assessments'}
              </span>
            </div>

            <CourseAssessmentsTab
              courseId={courseId}
              course={course}
              enrolment={enrolment}
              user={user}
            />
          </div>
        )}

        {/* ─── TAB D: NOTICE BOARD (ANNOUNCEMENTS) ─── */}
        {activeTab === 'notices' && (
          <div className="tab-pane-container notices-tab-pane">
            <div className="tab-pane-header tab-pane-header-with-count">
              <div>
                <h2>Notice Board &amp; Instructor Announcements</h2>
                <p>Official course announcements, schedule updates, and syllabus changes posted by your instructor.</p>
              </div>
              <span className="tab-section-total-pill">
                {announcements.length} {announcements.length === 1 ? 'Notice' : 'Notices'}
              </span>
            </div>

            {announcements.length === 0 ? (
              <div className="tab-empty-state-box">
                <Bell size={40} className="empty-state-icon" />
                <h3>No Announcements Yet</h3>
                <p>Check back later for updates, live session schedules, and supplementary notes from the instructor.</p>
              </div>
            ) : (
              <div className="announcements-timeline-stack">
                {announcements.map((ann, idx) => (
                  <div key={ann._id || idx} className="announcement-item-card">
                    <div className="announcement-card-header">
                      <div className="announcement-author-info">
                        <Avatar
                          image={ann.instructorAvatar || instructorAvatar}
                          name={ann.instructorName || instructorName}
                          size="small"
                        />
                        <div className="author-text-col">
                          <span className="author-name">{ann.instructorName || instructorName}</span>
                          <span className="publish-date">
                            {new Date(ann.publishedAt || ann.createdAt || Date.now()).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <h4 className="announcement-card-title">{ann.title}</h4>
                    <p className="announcement-card-body">{ann.content || ann.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB E: REVIEWS & RATINGS ─── */}
        {activeTab === 'reviews' && (
          <div className="tab-pane-container reviews-tab-pane">
            <div className="tab-pane-header tab-pane-header-with-count">
              <div>
                <h2>Learner Reviews &amp; Ratings</h2>
                <p>Authentic feedback from students who have completed this course.</p>
              </div>
              <div className="reviews-header-actions-group">
                <span className="tab-section-total-pill">
                  {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                </span>
                {isEnrolled && (
                  isCourseCompleted ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setIsRatingOpen(true)}
                      style={{ minHeight: '44px' }}
                    >
                      <Star size={16} />
                      <span>{enrolment?.rating ? 'Edit Review' : 'Rate & Review'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary reviews-locked-btn"
                      disabled
                      title="Complete 100% of this course to unlock ratings and reviews."
                      style={{ minHeight: '44px' }}
                    >
                      <Lock size={15} />
                      <span>Rate &amp; Review</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {isEnrolled && !isCourseCompleted && (
              <div className="reviews-completion-lock-banner" role="status">
                <Lock size={16} />
                <span>Complete 100% of this course to unlock ratings and reviews.</span>
              </div>
            )}

            {reviews.length === 0 ? (
              <div className="tab-empty-state-box">
                <Star size={40} className="empty-state-icon" />
                <h3>No Reviews Yet</h3>
                <p>
                  {isEnrolled && !isCourseCompleted
                    ? 'Complete 100% of this course to unlock ratings and reviews.'
                    : 'Be among the first learners to share your honest course experience and feedback!'}
                </p>
                {isEnrolled && isCourseCompleted && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setIsRatingOpen(true)}
                    style={{ minHeight: '44px', marginTop: '14px' }}
                  >
                    <MessageSquare size={16} />
                    <span>Share Feedback</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="reviews-card-grid">
                {reviews.map((rev, idx) => {
                  const reviewerName = getReviewerDisplayName(rev);
                  const reviewerAvatar = getReviewerAvatar(rev);
                  const reviewDate = rev.ratedAt || rev.createdAt || rev.updatedAt;
                  const reviewTags =
                    Array.isArray(rev.feedbackTags) && rev.feedbackTags.length > 0
                      ? rev.feedbackTags
                      : Array.isArray(rev.tags)
                        ? rev.tags
                        : [];

                  return (
                    <div key={rev._id || idx} className="review-card-item">
                      <div className="review-card-header">
                        <div className="review-author-meta">
                          <Avatar
                            image={reviewerAvatar}
                            name={reviewerName}
                            size="small"
                          />
                          <div className="review-author-info">
                            <span className="review-author-name">{reviewerName}</span>
                            <span className="review-date-text">
                              {reviewDate
                                ? new Date(reviewDate).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                : 'Verified Learner'}
                            </span>
                          </div>
                        </div>
                        <div className="review-stars-row">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              className={star <= (rev.rating || 5) ? 'star-gold' : 'star-muted'}
                            />
                          ))}
                        </div>
                      </div>
                      {rev.feedback && <p className="review-feedback-quote">"{rev.feedback}"</p>}
                      {reviewTags.length > 0 && (
                        <div className="review-tags-list">
                          {reviewTags.map((tag, tIdx) => (
                            <span key={tIdx} className="review-tag-badge">✓ {tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB F: Q&A / COURSE DOUBTS ─── */}
        {activeTab === 'qa' && (
          <div className="tab-pane-container qa-tab-pane">
            <div className="tab-pane-header qa-section-header">
              <div>
                <h2>Course Q&amp;A &amp; Doubts</h2>
                <p>Have questions about curriculum, projects, or setup? Ask the instructor directly.</p>
              </div>

              {/* Discussion Filter Pills */}
              {questions.length > 0 && (
                <div className="qa-filter-pills-row">
                  <button
                    type="button"
                    className={`qa-filter-pill ${qaFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setQaFilter('all')}
                  >
                    All ({questions.length})
                  </button>
                  <button
                    type="button"
                    className={`qa-filter-pill ${qaFilter === 'answered' ? 'active' : ''}`}
                    onClick={() => setQaFilter('answered')}
                  >
                    Answered ({questions.filter((q) => q.status === 'answered' || Boolean(q.instructorReply)).length})
                  </button>
                  <button
                    type="button"
                    className={`qa-filter-pill ${qaFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setQaFilter('pending')}
                  >
                    Pending ({questions.filter((q) => q.status === 'pending' && !q.instructorReply).length})
                  </button>
                </div>
              )}
            </div>

            {/* Question Submission Input Form */}
            <form className="qa-inquiry-box" onSubmit={handleAskQuestion}>
              <div className="qa-input-wrapper">
                <input
                  type="text"
                  className="qa-input-field"
                  placeholder={user ? "Ask a question or concept doubt about this course..." : "Log in as a learner to ask a doubt..."}
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  disabled={submittingQuestion}
                />
                <button
                  type="submit"
                  className="btn-qa-submit"
                  disabled={!questionInput.trim() || submittingQuestion}
                >
                  <MessageSquare size={16} />
                  <span>{submittingQuestion ? 'Submitting...' : 'Ask Doubt'}</span>
                </button>
              </div>
            </form>

            {/* Discussions Feed */}
            {questions.length === 0 ? (
              <div className="tab-empty-state-box qa-empty-state-box">
                <div className="qa-empty-icon-wrap">
                  <HelpCircle size={44} className="empty-state-icon" />
                </div>
                <h3>No Questions Yet</h3>
                <p>Have a question about this course? Start a discussion with your instructor.</p>
              </div>
            ) : filteredQaQuestions.length === 0 ? (
              <div className="tab-empty-state-box qa-empty-state-box">
                <HelpCircle size={38} className="empty-state-icon" />
                <h3>No Discussions Found</h3>
                <p>No questions match your selected filter.</p>
              </div>
            ) : (
              <div className="qa-questions-stack">
                {filteredQaQuestions.map((q, idx) => {
                  const isAnswered = q.status === 'answered' || Boolean(q.instructorReply);
                  const replyText = q.instructorReply || q.reply;
                  const replyName = q.instructorName || instructorName;
                  const replyAvatar = q.instructorAvatar || instructorAvatar;
                  const replyDesig = q.instructorDesignation || instructorDesignation;

                  return (
                    <div
                      key={q._id || idx}
                      id={`qa-question-${q._id}`}
                      className={`qa-question-card ${isAnswered ? 'is-answered' : 'is-pending'}`}
                    >
                      {/* Learner Info Header + Status Badge */}
                      <div className="qa-card-top-bar">
                        <div className="qa-learner-info">
                          {q.userAvatar ? (
                            <img
                              src={q.userAvatar}
                              alt={q.userName || 'Learner'}
                              className="qa-learner-avatar-img"
                            />
                          ) : (
                            <div className="qa-avatar-fallback">
                              {(q.userName || 'L').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="qa-learner-details">
                            <span className="qa-learner-name">{q.userName || 'Learner'}</span>
                            <span className="qa-post-time">
                              <Clock size={11} />
                              {q.createdAt
                                ? new Date(q.createdAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                : 'Recently'}
                            </span>
                          </div>
                        </div>

                        <div className="qa-status-pill-wrap">
                          {isAnswered ? (
                            <span className="qa-status-pill answered">
                              <CheckCircle2 size={13} />
                              <span>Answered</span>
                            </span>
                          ) : (
                            <span className="qa-status-pill pending">
                              <Clock size={13} />
                              <span>Pending Answer</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Content */}
                      <div className="qa-question-content-box">
                        <p className="qa-question-text">{q.question}</p>
                      </div>

                      {/* Pending Notice if waiting */}
                      {!isAnswered && (
                        <div className="qa-pending-notice">
                          <Clock size={13} />
                          <span>Waiting for instructor reply...</span>
                        </div>
                      )}

                      {/* Instructor Reply Nested Box */}
                      {isAnswered && replyText && (
                        <div className="qa-instructor-reply-card">
                          <div className="qa-reply-header-row">
                            <div className="qa-instructor-meta">
                              {replyAvatar ? (
                                <img
                                  src={replyAvatar}
                                  alt={replyName}
                                  className="qa-instructor-avatar-img"
                                />
                              ) : (
                                <div className="qa-instructor-avatar-fallback">
                                  {(replyName || 'I').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="qa-instructor-details">
                                <div className="qa-name-and-badge">
                                  <span className="qa-instructor-name">{replyName}</span>
                                  <span className="qa-instructor-badge">
                                    <ShieldCheck size={12} />
                                    <span>Instructor</span>
                                  </span>
                                </div>
                                <span className="qa-instructor-designation">{replyDesig}</span>
                              </div>
                            </div>

                            {q.replyTimestamp && (
                              <span className="qa-reply-time">
                                <Clock size={11} />
                                {new Date(q.replyTimestamp).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            )}
                          </div>

                          <div className="qa-reply-body-text">
                            <p>{replyText}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── MODALS ─── */}
      {/* 1. Course Rating & Feedback Modal (Shared Component with Review Course) */}
      <CourseRatingModal
        isOpen={isRatingOpen && isCourseCompleted}
        onClose={() => setIsRatingOpen(false)}
        course={course}
        courseId={courseId}
        courseTitle={course?.title || 'Course'}
        initialRating={
          enrolment?.rating
            ? {
                rating: enrolment.rating,
                feedback: enrolment.feedback || '',
                tags: enrolment.feedbackTags || []
              }
            : null
        }
        onSubmit={async () => {
          await refreshCourseReviews();
          setIsRatingOpen(false);
        }}
      />

      {/* 2. Official Certificate Preview Modal */}
      {isCertificateOpen && isCertificateEnabled && (
        <div className="certificate-modal-overlay" onClick={() => setIsCertificateOpen(false)}>
          <div
            className="certificate-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cert-title"
          >
            <div className="cert-modal-header">
              <h3 id="cert-title">Official Certificate of Completion</h3>
              <button
                type="button"
                className="btn-cert-close"
                onClick={() => setIsCertificateOpen(false)}
                aria-label="Close certificate modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* If Cloudinary certificate image is available, render authentic certificate! */}
            {userCertificate?.certificateImageUrl ? (
              <div className="certificate-modal-image-wrapper">
                <img
                  src={userCertificate.certificateImageUrl}
                  alt={`Certificate for ${course.title}`}
                  className="certificate-modal-image"
                />
              </div>
            ) : (
              /* Printable Certificate Canvas Fallback */
              <div className="certificate-document-canvas">
                <div className="cert-canvas-border">
                  <div className="cert-seal-badge">
                    <Award size={36} className="cert-award-icon" />
                  </div>
                  <span className="cert-brand-heading">UpSkillR Verified Certificate</span>
                  <p className="cert-presents-text">This certifies that</p>
                  <h2 className="cert-learner-name">{user?.fullName || user?.name || enrolment?.learnerName || 'Learner'}</h2>
                  <p className="cert-body-p">has successfully completed the comprehensive course curriculum for</p>
                  <h3 className="cert-course-name">{course.title}</h3>
                  <div className="cert-footer-meta">
                    <div className="cert-date-col">
                      <span className="meta-lbl">Date of Completion</span>
                      <span className="meta-val">
                        {new Date(userCertificate?.completionDate || enrolment?.completedAt || Date.now()).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="cert-id-col">
                      <span className="meta-lbl">Credential ID</span>
                      <span className="meta-val">{userCertificate?.certificateId || `UPSKILLR-${courseId.slice(-6).toUpperCase()}-${user?._id?.slice(-4) || 'VERIF'}`}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="cert-modal-actions">
              {userCertificate?.certificateImageUrl && (
                <a
                  href={userCertificate.certificateImageUrl}
                  download={`UpSkillR_Certificate_${userCertificate.certificateId || 'course'}.png`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                  style={{ minHeight: '44px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={16} />
                  <span>Download PNG</span>
                </a>
              )}

              {userCertificate?.certificateId && (
                <a
                  href={`/verify-certificate/${userCertificate.certificateId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                  style={{ minHeight: '44px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ExternalLink size={16} />
                  <span>Verify Online</span>
                </a>
              )}

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsCertificateOpen(false)}
                style={{ minHeight: '44px' }}
              >
                <span>Done</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseLearningPage;
