import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Award,
  Play,
  Star,
  Users,
  Download,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  X,
  Trophy,
  Bell,
  ChevronDown,
  ChevronUp,
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
import { useToast } from '../../context/ToastContext';
import { API_BASE } from '../../config/api';
import { getCourseReturnUrl, getCourseReturnLabel, navigateTo } from '../../utils/navigationHelper';
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

  // Navigation tab state: 'curriculum' | 'reviews' | 'qa' | 'leaderboard' | 'assessments' | 'notices'
  const [activeTab, setActiveTab] = useState('curriculum');

  // Accordion state: object mapping module index -> boolean (default: all modules collapsed)
  const [expandedModules, setExpandedModules] = useState({});

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
    setAnnouncements([]);
    setUserCertificate(null);
    setReviews([]);
    setQuestions([]);
    setExpandedModules({});

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

      // 2. Fetch Learner Enrollment & Progress
      if (token) {
        try {
          const progressRes = await fetch(`${API_BASE}/courses/${courseId}/progress`, {
            headers: authHeaders
          });
          const progressData = await progressRes.json();
          if (progressData.success && progressData.enrolment) {
            setEnrolment(progressData.enrolment);
          } else {
            setEnrolment(null);
          }
        } catch (e) {
          console.warn('Progress fetch notice:', e);
          setEnrolment(null);
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
  }, [courseId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    fetchCourseData();
  }, [fetchCourseData]);

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

  // Calculate module progress percentage
  const getModuleProgress = useCallback((mIdx) => {
    const mod = modulesList[mIdx];
    if (!mod || !mod.lessons || mod.lessons.length === 0) return 0;

    let totalItems = 0;
    let completedItems = 0;

    (mod.lessons || []).forEach((les, lIdx) => {
      const items = Array.isArray(les.items) && les.items.length > 0 ? les.items : [];
      if (items.length > 0) {
        items.forEach((it) => {
          totalItems += 1;
          if (isItemCompleted(it, les, mIdx, lIdx)) {
            completedItems += 1;
          }
        });
      } else {
        totalItems += 1;
        if (isLessonCompleted(mIdx, lIdx, les)) {
          completedItems += 1;
        }
      }
    });

    if (totalItems === 0) return 100;
    if (completedItems >= totalItems) return 100;
    return Math.round((completedItems / totalItems) * 100);
  }, [modulesList, isItemCompleted, isLessonCompleted]);

  // Check if a module is completed
  const isModuleCompleted = useCallback((mIdx) => {
    const mod = modulesList[mIdx];
    if (!mod || !mod.lessons || mod.lessons.length === 0) return false;
    return getModuleProgress(mIdx) >= 100;
  }, [modulesList, getModuleProgress]);

  // Total lessons count
  const totalLessonsCount = useMemo(() => {
    return modulesList.reduce((sum, mod) => sum + (mod.lessons ? mod.lessons.length : 0), 0) || 1;
  }, [modulesList]);

  // Total content items count across all modules
  const totalContentsCount = useMemo(() => {
    let count = 0;
    modulesList.forEach((mod) => {
      count += getModuleItemsCount(mod);
    });
    return count || 1;
  }, [modulesList, getModuleItemsCount]);

  // Total completed contents count
  const completedContentsCount = useMemo(() => {
    if (!enrolment) return 0;
    let count = 0;
    modulesList.forEach((mod, mIdx) => {
      (mod.lessons || []).forEach((les, lIdx) => {
        if (Array.isArray(les.items) && les.items.length > 0) {
          les.items.forEach((it) => {
            if (isItemCompleted(it, les, mIdx, lIdx)) {
              count += 1;
            }
          });
        } else if (isLessonCompleted(mIdx, lIdx, les)) {
          count += 1;
        }
      });
    });
    return count;
  }, [enrolment, modulesList, isItemCompleted, isLessonCompleted]);

  // Check if course is 100% completed
  const isCourseCompleted = useMemo(() => {
    if (!enrolment) return false;
    if (totalContentsCount > 0 && completedContentsCount >= totalContentsCount) {
      return true;
    }
    return (enrolment.status === 'completed' || enrolment.status === 'COMPLETED') && Number(enrolment.progressPercentage) >= 100;
  }, [enrolment, totalContentsCount, completedContentsCount]);

  // Total quizzes count
  const totalQuizzesCount = useMemo(() => {
    let count = (course?.courseAssessments || []).length;
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
  }, [course, modulesList]);

  // Overall Course Progress Percentage
  const progressPct = useMemo(() => {
    if (!enrolment) return 0;
    if (totalContentsCount > 0) {
      if (completedContentsCount >= totalContentsCount) return 100;
      return Math.min(Math.round((completedContentsCount / totalContentsCount) * 100), 99);
    }
    const backendPct = Number(enrolment.progressPercentage) || 0;
    return (enrolment.status === 'completed' || enrolment.status === 'COMPLETED') && backendPct >= 100 ? 100 : Math.min(backendPct, 99);
  }, [enrolment, completedContentsCount, totalContentsCount]);

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
      sessionStorage.setItem('upskillr_redirect_after_login', `/courses/${courseId}`);
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
        try {
          const overviewRes = await fetch(`${API_BASE}/courses/public/${courseId}/overview`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const overviewData = await overviewRes.json();
          if (overviewData?.success && Array.isArray(overviewData.questions)) {
            setQuestions(overviewData.questions);
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

  const handleContinueModule = (mIdx) => {
    if (!isEnrolled) {
      handleEnroll();
      return;
    }
    const { lessonIdx, itemIdx } = getFirstIncompleteLessonInModule(mIdx);
    const navPath = `/learn/${courseId}?module=${mIdx}&lesson=${lessonIdx}&item=${itemIdx}`;
    window.history.pushState({}, '', navPath);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: navPath } }));
  };

  const handleOpenLesson = (mIdx, lIdx, itIdx = 0) => {
    if (!isEnrolled) {
      handleEnroll();
      return;
    }
    const navPath = `/learn/${courseId}?module=${mIdx}&lesson=${lIdx}&item=${itIdx}`;
    window.history.pushState({}, '', navPath);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path: navPath } }));
  };

  // Accordion Toggle Handlers
  const toggleModuleAccordion = (mIdx) => {
    setExpandedModules((prev) => ({
      ...prev,
      [mIdx]: !prev[mIdx]
    }));
  };

  const handleToggleAllModules = () => {
    const allExpanded = modulesList.length > 0 && modulesList.every((_, idx) => expandedModules[idx]);
    const newState = {};
    modulesList.forEach((_, idx) => {
      newState[idx] = !allExpanded;
    });
    setExpandedModules(newState);
  };

  // Certificate check
  const isCertificateEnabled = Boolean(
    course?.certificateSettings?.enabled ||
    course?.certificate === true ||
    course?.certificatesEnabled === true
  );

  const isEligibleForCertificate = isCourseCompleted || progressPct >= 100 || (enrolment && enrolment.status === 'completed');

  const handleGetCertificateClick = () => {
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

  // Helper for content item icon in curriculum breakdown
  const renderItemTypeIcon = (type, size = 13) => {
    const t = String(type || '').toLowerCase();
    if (t === 'video') return <PlayCircle size={size} />;
    if (t === 'quiz') return <HelpCircle size={size} />;
    if (t === 'pdf') return <FileDown size={size} />;
    if (t === 'exercise' || t === 'code') return <Code size={size} />;
    return <FileText size={size} />;
  };

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
                  <span className="enrollment-feature-tag">
                    <Award size={14} />
                    <span>Certificate Included</span>
                  </span>
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

                  <button
                    type="button"
                    className="btn-banner-secondary"
                    onClick={() => setIsRatingOpen(true)}
                    aria-label="Share Feedback"
                  >
                    <MessageSquare size={15} />
                    <span>Share Feedback</span>
                  </button>
                </div>
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
            onClick={() => setActiveTab('curriculum')}
          >
            <BookOpen size={16} />
            <span>Modules</span>
          </button>

          <button
            type="button"
            className={`learning-tab-nav-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            <Star size={16} />
            <span>Reviews</span>
            {reviews.length > 0 && (
              <span className="tab-pill-badge">{reviews.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`learning-tab-nav-btn ${activeTab === 'qa' ? 'active' : ''}`}
            onClick={() => setActiveTab('qa')}
          >
            <HelpCircle size={16} />
            <span>Q&amp;A</span>
            {questions.length > 0 && (
              <span className="tab-pill-badge">{questions.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`learning-tab-nav-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            <Trophy size={16} />
            <span>Leaderboard</span>
          </button>

          <button
            type="button"
            className={`learning-tab-nav-btn ${activeTab === 'assessments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assessments')}
          >
            <Award size={16} />
            <span>Assessments</span>
            {(course?.courseAssessments || []).length > 0 && (
              <span className="tab-pill-badge">{(course.courseAssessments).length}</span>
            )}
          </button>

          <button
            type="button"
            className={`learning-tab-nav-btn ${activeTab === 'notices' ? 'active' : ''}`}
            onClick={() => setActiveTab('notices')}
          >
            <Bell size={16} />
            <span>Notice Board</span>
            {announcements.length > 0 && (
              <span className="tab-pill-badge">{announcements.length}</span>
            )}
          </button>
        </div>
      </nav>

      {/* ─── 3. TAB CONTENT MAIN VIEWPORT ─── */}
      <main className="learning-main-viewport" role="main">
        {/* ─── TAB A: CURRICULUM & MODULE BREAKDOWN (GFG INSPIRED) ─── */}
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
                    <strong>{modulesList.length}</strong> Modules
                  </span>
                  <span className="curriculum-stat-pill">
                    <strong>{totalLessonsCount}</strong> Lessons
                  </span>
                  <span className="curriculum-stat-pill">
                    <strong>{totalContentsCount}</strong> Content Items
                  </span>
                  <span className="curriculum-stat-pill highlight">
                    <strong>{progressPct}%</strong> Complete
                  </span>
                </div>
              </div>

              <div className="curriculum-summary-right">
                <button
                  type="button"
                  className="btn-toggle-all-accordion"
                  onClick={handleToggleAllModules}
                  aria-label="Toggle all modules"
                >
                  <span>{modulesList.length > 0 && modulesList.every((_, idx) => expandedModules[idx]) ? 'Collapse All' : 'Expand All'}</span>
                </button>
              </div>
            </div>

            {/* Two-Column GFG Layout Grid */}
            <div className="gfg-curriculum-layout-grid">
              {/* LEFT / MAIN COLUMN (~68%) */}
              <div className="gfg-curriculum-main-column">
                {/* Expandable Module Cards Accordion Stack (Reference Image 2 & 3) */}
                <div className="gfg-modules-accordion-stack" role="list">
                  {modulesList.map((mod, mIdx) => {
                    const isExpanded = Boolean(expandedModules[mIdx]);
                    const isModDone = isModuleCompleted(mIdx);
                    const modPct = getModuleProgress(mIdx);
                    const modLessons = mod.lessons || [];
                    const modItemsCount = getModuleItemsCount(mod);

                    return (
                      <div
                        key={mod._id}
                        className={`gfg-module-accordion-card ${isExpanded ? 'is-expanded' : ''} ${isModDone ? 'is-done' : ''}`}
                        role="listitem"
                      >
                        {/* Module Card Header */}
                        <div
                          className="gfg-module-header-row"
                          onClick={() => toggleModuleAccordion(mIdx)}
                          role="button"
                          tabIndex={0}
                          aria-expanded={isExpanded}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') toggleModuleAccordion(mIdx);
                          }}
                        >
                          {/* Left: Module Number & Title */}
                          <div className="gfg-module-header-left">
                            <div className={`gfg-module-num-badge ${isModDone ? 'done' : ''}`}>
                              {isModDone ? <Check size={16} strokeWidth={3} /> : `M${mIdx + 1}`}
                            </div>

                            <div className="gfg-module-titles-box">
                              <h3 className="gfg-module-card-title">{mod.title}</h3>
                              <span className="gfg-module-topics-pill">
                                {modLessons.length} {modLessons.length === 1 ? 'Lesson' : 'Lessons'} &bull; {modItemsCount} {modItemsCount === 1 ? 'Item' : 'Items'}
                              </span>
                            </div>
                          </div>

                          {/* Right: Progress, Continue Button & Chevron */}
                          <div className="gfg-module-header-right">
                            {/* Mini Progress */}
                            <div className="gfg-module-mini-progress">
                              <span className="gfg-progress-pct-label">{modPct}%</span>
                              <div className="gfg-progress-bar-track">
                                <div
                                  className={`gfg-progress-bar-fill ${isModDone ? 'done' : ''}`}
                                  style={{ width: `${modPct}%` }}
                                />
                              </div>
                            </div>

                            {/* Module Action: Completed vs Continue */}
                            {isModDone ? (
                              <span className="gfg-badge-module-done">
                                <Check size={13} strokeWidth={3} />
                                <span>Completed</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="btn-gfg-module-continue"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleContinueModule(mIdx);
                                }}
                                aria-label={`Continue ${mod.title}`}
                              >
                                <span>Continue</span>
                              </button>
                            )}

                            {/* Chevron Toggle */}
                            <div className="gfg-chevron-toggle">
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                          </div>
                        </div>

                        {/* Module Expanded Content */}
                        {isExpanded && (
                          <div className="gfg-module-expanded-body">
                            {mod.description && (
                              <p className="gfg-module-description-text">{mod.description}</p>
                            )}

                            {/* Lessons List in Module */}
                            <div className="gfg-module-lessons-list" role="list">
                              {modLessons.map((les, lIdx) => {
                                const isLesDone = isLessonCompleted(mIdx, lIdx, les);
                                const lesItems = Array.isArray(les.items) && les.items.length > 0 ? les.items : [];

                                return (
                                  <div
                                    key={les._id || lIdx}
                                    className={`gfg-lesson-row-card ${isLesDone ? 'is-completed' : ''}`}
                                    onClick={() => handleOpenLesson(mIdx, lIdx)}
                                    role="listitem"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') handleOpenLesson(mIdx, lIdx);
                                    }}
                                  >
                                    <div className="gfg-lesson-row-left">
                                      <div className={`gfg-lesson-icon-circle ${isLesDone ? 'done' : ''}`}>
                                        {isLesDone ? (
                                          <CheckCircle2 size={16} className="text-emerald" />
                                        ) : (
                                          renderItemTypeIcon(les.type, 15)
                                        )}
                                      </div>

                                      <div className="gfg-lesson-details-box">
                                        <div className="gfg-lesson-title-line">
                                          <span className="gfg-lesson-order">
                                            {mIdx + 1}.{lIdx + 1}
                                          </span>
                                          <h4 className="gfg-lesson-item-title">{les.title}</h4>
                                        </div>

                                        {/* Content Items Pill Breakdown (Reference Image 4) */}
                                        {lesItems.length > 0 ? (
                                          <div className="gfg-lesson-content-badges">
                                            {lesItems.map((item, itIdx) => {
                                              const isItDone = isItemCompleted(item, les, mIdx, lIdx);
                                              return (
                                                <span
                                                  key={item._id || itIdx}
                                                  className={`gfg-item-badge type-${String(item.type || 'article').toLowerCase()} ${isItDone ? 'is-completed' : ''}`}
                                                >
                                                  {isItDone ? <Check size={11} strokeWidth={2.5} className="text-emerald" /> : renderItemTypeIcon(item.type, 12)}
                                                  <span>{item.title || `${item.type || 'Item'}`}</span>
                                                  {item.wordCount && (
                                                    <span className="badge-meta-words">({item.wordCount} words)</span>
                                                  )}
                                                  {item.video?.duration && (
                                                    <span className="badge-meta-words">({item.video.duration})</span>
                                                  )}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="gfg-lesson-content-badges">
                                            <span className={`gfg-item-badge type-${les.type || 'video'}`}>
                                              {renderItemTypeIcon(les.type, 12)}
                                              <span>{les.type || 'Lesson'}</span>
                                              {les.duration && <span className="badge-meta-words">({les.duration})</span>}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="gfg-lesson-row-right">
                                      {isLesDone ? (
                                        <span className="gfg-status-chip completed">
                                          <Check size={13} strokeWidth={3} />
                                          <span>Completed</span>
                                        </span>
                                      ) : (
                                        <span className="gfg-status-chip in-progress">
                                          <span>Available</span>
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        className="btn-gfg-open-lesson"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenLesson(mIdx, lIdx);
                                        }}
                                        aria-label={`Open lesson ${les.title}`}
                                      >
                                        <span>Open</span>
                                        <ChevronRight size={14} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT SIDEBAR COLUMN (~32%) (Reference Image 2) */}
              <aside className="gfg-curriculum-side-column" aria-label="Course Highlights & Certificate">
                {/* 1. Verified Certificate Promo Card */}
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
            <div className="tab-pane-header">
              <h2>Course Assessments &amp; Final Exams</h2>
              <p>Complete graded assessments to verify comprehensive mastery and validate your learning achievements.</p>
            </div>

            {(course?.courseAssessments || []).length === 0 ? (
              <div className="tab-empty-state-box">
                <Award size={40} className="empty-state-icon" />
                <h3>No Course Assessments Configured</h3>
                <p>
                  This course relies on continuous module knowledge checks and lesson quizzes. All lesson quizzes are integrated inside individual curriculum modules in the Learning Workspace.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleContinueLearning}
                  style={{ minHeight: '44px', marginTop: '14px' }}
                >
                  <Play size={16} />
                  <span>Go to Learning Workspace</span>
                </button>
              </div>
            ) : (
              <div className="assessments-card-grid">
                {(course.courseAssessments).map((ass, idx) => (
                  <div key={idx} className="assessment-card-box">
                    <div className="assessment-card-header">
                      <div className="assessment-icon-wrap">
                        <Award size={20} />
                      </div>
                      <div className="assessment-card-title-group">
                        <h4>{ass.title || `Assessment ${idx + 1}`}</h4>
                        <span className="assessment-meta-tag">
                          {ass.timeLimitMinutes ? `${ass.timeLimitMinutes} mins` : 'Untimed'} &bull; {ass.totalMarks || 100} Marks
                        </span>
                      </div>
                    </div>
                    {ass.description && <p className="assessment-card-desc">{ass.description}</p>}
                    <div className="assessment-card-footer">
                      <span className="passing-criteria">
                        Passing Score: {ass.passingPercentage || 60}%
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleContinueLearning}
                      >
                        <span>Start in Workspace</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB D: NOTICE BOARD (ANNOUNCEMENTS) ─── */}
        {activeTab === 'notices' && (
          <div className="tab-pane-container notices-tab-pane">
            <div className="tab-pane-header">
              <h2>Notice Board &amp; Instructor Announcements</h2>
              <p>Official course announcements, schedule updates, and syllabus changes posted by your instructor.</p>
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
            <div className="tab-pane-header">
              <h2>Learner Reviews &amp; Ratings</h2>
              <p>Authentic feedback from enrolled students who have experienced this course.</p>
            </div>

            {reviews.length === 0 ? (
              <div className="tab-empty-state-box">
                <Star size={40} className="empty-state-icon" />
                <h3>No Reviews Yet</h3>
                <p>Be among the first learners to share your honest course experience and feedback!</p>
                {isEnrolled && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setIsRatingOpen(true)}
                    style={{ minHeight: '44px', marginTop: '14px' }}
                  >
                    <MessageSquare size={16} />
                    <span>Share Course Feedback</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="reviews-card-grid">
                {reviews.map((rev, idx) => (
                  <div key={rev._id || idx} className="review-card-item">
                    <div className="review-card-header">
                      <div className="review-author-meta">
                        <Avatar
                          image={rev.learnerAvatar || rev.learnerId?.avatar}
                          name={rev.learnerName || 'Learner'}
                          size="small"
                        />
                        <div className="review-author-info">
                          <span className="review-author-name">{rev.learnerName || 'Learner'}</span>
                          <span className="review-date-text">
                            {rev.ratedAt ? new Date(rev.ratedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Verified Learner'}
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
                    {Array.isArray(rev.feedbackTags) && rev.feedbackTags.length > 0 && (
                      <div className="review-tags-list">
                        {rev.feedbackTags.map((tag, tIdx) => (
                          <span key={tIdx} className="review-tag-badge">✓ {tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB F: Q&A / COURSE DOUBTS ─── */}
        {activeTab === 'qa' && (
          <div className="tab-pane-container qa-tab-pane">
            <div className="tab-pane-header">
              <h2>Course Q&amp;A &amp; Doubts</h2>
              <p>Have questions about curriculum, projects, or setup? Ask the instructor directly.</p>
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
                  <MessageSquare size={15} />
                  <span>{submittingQuestion ? 'Submitting...' : 'Ask Doubt'}</span>
                </button>
              </div>
            </form>

            {questions.length === 0 ? (
              <div className="tab-empty-state-box">
                <HelpCircle size={40} className="empty-state-icon" />
                <h3>No Doubts Asked Yet</h3>
                <p>Have a question or concept you want clarified? Submit your question above!</p>
              </div>
            ) : (
              <div className="qa-questions-stack">
                {questions.map((q, idx) => (
                  <div key={q._id || idx} className="qa-question-card">
                    <div className="qa-question-header">
                      <span className="qa-q-badge">Q</span>
                      <h4 className="qa-question-text">{q.question}</h4>
                    </div>
                    {q.reply && (
                      <div className="qa-reply-box">
                        <span className="qa-a-badge">A</span>
                        <div className="qa-reply-body">
                          <p>{q.reply}</p>
                          <span className="qa-replied-by">Answered by {instructorName}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ─── MODALS ─── */}
      {/* 1. Course Rating & Feedback Modal */}
      <CourseRatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        courseTitle={course?.title || 'Course'}
        onSubmit={async (ratingData) => {
          const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
          if (token) {
            try {
              await fetch(`${API_BASE}/courses/rate`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  courseId,
                  rating: ratingData.rating,
                  feedback: ratingData.feedback,
                  feedbackTags: ratingData.feedbackTags
                })
              });
              toast.success('Thank you! Your course review has been recorded.');
              setIsRatingOpen(false);
            } catch (e) {
              toast.error('Failed to submit review.');
            }
          }
        }}
      />

      {/* 2. Official Certificate Preview Modal */}
      {isCertificateOpen && (
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
