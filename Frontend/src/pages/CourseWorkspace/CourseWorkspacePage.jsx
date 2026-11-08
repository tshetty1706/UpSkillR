import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ArrowLeft, BookOpen, Paperclip, Award, Bell, CheckCircle2,
  Play, PlayCircle, FileText, Code, HelpCircle, Layers,
  ChevronDown, ChevronUp, Star, Users, ExternalLink, Download,
  Clock, Check, Sparkles, AlertCircle, RefreshCw, MessageSquare,
  ShieldCheck, Lock, ChevronLeft, ChevronRight, X, FileDown,
  Bookmark, Sun, Moon, Menu, Trophy, PenLine, Folder
} from 'lucide-react';
import { Avatar } from '../../components/common/Avatar/Avatar';
import { CourseRatingModal } from '../../components/learner/dashboard/LearnerDashboardOverview/CourseRatingModal';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { API_BASE } from '../../config/api';
import {
  normalizeContentType,
  getContentTypeMeta,
  getContentTypeIcon
} from './utils/contentTypeHelper.jsx';
import { LessonContentRenderer } from './components/LessonContentRenderer.jsx';
import './CourseWorkspacePage.css';

/**
 * Helper to check if an announcement is created within last 7 days
 */
/**
 * Format total seconds into user-friendly duration badge ('1 min', '15 min', etc.)
 * Prevents videos under 60 seconds from being formatted as '0 min'.
 */
const formatDurationBadge = (totalSeconds) => {
  const secs = Number(totalSeconds);
  if (isNaN(secs) || secs <= 0) return null;
  if (secs < 60) {
    return '1 min';
  }
  return `${Math.round(secs / 60)} min`;
};

const isAnnouncementNew = (item) => {
  if (!item) return false;
  if (typeof item.isNew === 'boolean') return item.isNew;
  const rawDate = item.publishedAt || item.createdAt;
  if (!rawDate) return false;
  const itemDate = new Date(rawDate);
  if (isNaN(itemDate.getTime())) return false;
  const diffInDays = (Date.now() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffInDays >= -1 && diffInDays <= 7;
};

export const CourseWorkspacePage = ({ courseId, user = null }) => {
  const { toast } = useToast();
  const { isDarkMode, toggleTheme } = useTheme();

  // ─── Data States ───
  const [course, setCourse] = useState(null);
  const [enrolment, setEnrolment] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sidebar collapse toggles
  const [isSidebar1Collapsed, setIsSidebar1Collapsed] = useState(false);
  const [isSidebar2Collapsed, setIsSidebar2Collapsed] = useState(false);

  // Mobile drawer states: null | 'lessons' | 'items'
  const [mobileDrawer, setMobileDrawer] = useState(null);

  // Selected Curriculum Position
  const [selectedModuleIdx, setSelectedModuleIdx] = useState(0);
  const [selectedLessonIdx, setSelectedLessonIdx] = useState(0);
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);

  // Video player state
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const lastSavedTimeRef = useRef(0);

  // 80% Video Watch Tracking State
  const [videoWatchStatus, setVideoWatchStatus] = useState({
    percentage: 0,
    isEligible: false,
    uniqueWatchedDuration: 0,
    totalDuration: 0
  });

  // Interactive Quiz state in Panel 3
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScoreData, setQuizScoreData] = useState(null);

  // Practical Code Practice state
  const [codeEditorInput, setCodeEditorInput] = useState('');
  const [codeOutput, setCodeOutput] = useState('');
  const [isExecutingCode, setIsExecutingCode] = useState(false);

  // Modals state
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  // ─── Workspace Bookmarks & Personal Notes State ───
  const [isCurrentBookmarked, setIsCurrentBookmarked] = useState(false);
  const [currentBookmarkId, setCurrentBookmarkId] = useState(null);
  const [workspaceFolders, setWorkspaceFolders] = useState([]);
  const [isWorkspaceNoteModalOpen, setIsWorkspaceNoteModalOpen] = useState(false);
  const [workspaceNoteTitle, setWorkspaceNoteTitle] = useState('');
  const [workspaceNoteContent, setWorkspaceNoteContent] = useState('');
  const [workspaceNoteFolderId, setWorkspaceNoteFolderId] = useState('');
  const [savingWorkspaceNote, setSavingWorkspaceNote] = useState(false);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);

  // ─── 1. Fetch Course Data, Progress & Announcements ───
  const fetchWorkspaceData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);

    const token = sessionStorage.getItem('upskillr_token');
    const authHeaders = {};
    if (token) authHeaders['Authorization'] = `Bearer ${token}`;

    try {
      // 1. Fetch Course Structure from Backend
      const courseRes = await fetch(`${API_BASE}/courses/public/${courseId}`, {
        headers: authHeaders
      });
      const courseData = await courseRes.json();

      if (!courseData.success || !courseData.course) {
        setError(courseData.message || 'Course content could not be loaded.');
        setLoading(false);
        return;
      }
      setCourse(courseData.course);

      // 2. Fetch Learner Enrollment & Progress
      if (token) {
        try {
          const progressRes = await fetch(`${API_BASE}/courses/${courseId}/progress`, {
            headers: authHeaders
          });
          const progressData = await progressRes.json();
          if (progressData.success && progressData.enrolment) {
            setEnrolment(progressData.enrolment);
          }
        } catch (e) {
          console.warn('Progress fetch warning:', e);
        }

        // 3. Fetch Learner Announcements (NoticeBoard)
        try {
          const noticesRes = await fetch(`${API_BASE}/courses/${courseId}/learner-announcements`, {
            headers: authHeaders
          });
          const noticesData = await noticesRes.json();
          if (noticesData.success && Array.isArray(noticesData.announcements)) {
            setAnnouncements(noticesData.announcements);
          }
        } catch (e) {
          console.warn('Announcements fetch warning:', e);
        }
      }
    } catch (err) {
      console.error('Failed to load course workspace:', err);
      setError('Unable to load learning workspace. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  // ─── 2. Normalize Modules & Lessons Curriculum Tree ───
  const modulesList = useMemo(() => {
    if (!course) return [];
    const rawModules = Array.isArray(course.modules) && course.modules.length > 0
      ? course.modules
      : [];

    if (rawModules.length > 0) {
      return rawModules.map((mod, mIdx) => {
        const rawLessons = Array.isArray(mod.lessons) ? mod.lessons : [];
        return {
          _id: mod._id || `module-${mIdx}`,
          title: mod.title || `Module ${mIdx + 1}`,
          description: mod.description || '',
          order: mod.order || mIdx + 1,
          lessons: rawLessons.map((les, lIdx) => {
            const rawItems = Array.isArray(les.items) && les.items.length > 0
              ? les.items
              : Array.isArray(les.contentItems) && les.contentItems.length > 0
              ? les.contentItems
              : [];
            return {
              _id: les._id || `lesson-${mIdx}-${lIdx}`,
              title: les.title || `Lesson ${mIdx + 1}.${lIdx + 1}`,
              description: les.description || '',
              order: les.order || lIdx + 1,
              type: les.type || rawItems[0]?.type || 'article',
              items: rawItems,
              notes: Array.isArray(les.notes) ? les.notes : [],
              duration: (les.duration && les.duration !== '0 min') ? les.duration : (rawItems[0]?.video?.duration ? formatDurationBadge(rawItems[0].video.duration) : null)
            };
          })
        };
      });
    }

    // Fallback if course has root lessons
    const rawLessons = Array.isArray(course.lessons) ? course.lessons : [];
    if (rawLessons.length > 0) {
      return [{
        _id: 'default-mod-0',
        title: 'Module 1: Course Curriculum',
        description: course.description || '',
        order: 1,
        lessons: rawLessons.map((les, lIdx) => ({
          _id: les._id || `lesson-0-${lIdx}`,
          title: les.title || `Lesson ${lIdx + 1}`,
          description: les.description || '',
          order: les.order || lIdx + 1,
          type: les.type || (Array.isArray(les.items) && les.items[0]?.type) || 'article',
          items: Array.isArray(les.items) ? les.items : [],
          notes: Array.isArray(les.notes) ? les.notes : [],
          duration: les.duration || null
        }))
      }];
    }

    return [];
  }, [course]);

  // Linear flat list of all lessons for linear navigation
  const flatLessonsList = useMemo(() => {
    const list = [];
    modulesList.forEach((mod, mIdx) => {
      (mod.lessons || []).forEach((les, lIdx) => {
        list.push({
          moduleIdx: mIdx,
          lessonIdx: lIdx,
          moduleTitle: mod.title,
          lesson: les,
          globalIndex: list.length
        });
      });
    });
    return list;
  }, [modulesList]);

  // ─── 3. Lesson & Item Completion Checkers ───
  // Check if an individual item is completed
  const isItemCompleted = useCallback((item, lesson, mIdx, lIdx) => {
    if (!enrolment) return false;
    if (!Array.isArray(enrolment.completedLessons)) return false;
    const completedList = enrolment.completedLessons.map(String);
    if (item?._id && completedList.includes(String(item._id))) return true;

    // Quizzes can ONLY be completed by direct quiz attempt submission, NEVER inherited from parent lesson
    const itemType = String(item?.type || '').trim().toLowerCase();
    const isQuizItem = (itemType === 'quiz' || itemType.includes('quiz') || itemType === 'assessment') &&
                       !['video', 'article', 'article_md', 'pdf', 'note', 'text', 'document', 'code', 'exercise'].includes(itemType);
    if (isQuizItem) {
      return false;
    }

    // For non-quiz items: if the parent lesson is marked completed in enrolment, its items are also complete
    const combinedKey = `${mIdx}-${lIdx}`;
    const flatItem = flatLessonsList.find(f => f.moduleIdx === mIdx && f.lessonIdx === lIdx);
    if (
      (lesson?._id && completedList.includes(String(lesson._id))) ||
      completedList.includes(combinedKey) ||
      (flatItem && completedList.includes(String(flatItem.globalIndex)))
    ) {
      return true;
    }

    return false;
  }, [enrolment, flatLessonsList]);

  // Lesson Completion Checker (all items in the lesson completed OR lesson explicitly marked)
  const isLessonCompleted = useCallback((mIdx, lIdx, lesson) => {
    if (!enrolment || !lesson) return false;
    if (!Array.isArray(enrolment.completedLessons)) return false;
    const completedList = enrolment.completedLessons.map(String);

    if (lesson.items && lesson.items.length > 0) {
      return lesson.items.every((it) => isItemCompleted(it, lesson, mIdx, lIdx));
    }

    const combinedKey = `${mIdx}-${lIdx}`;
    const flatItem = flatLessonsList.find(f => f.moduleIdx === mIdx && f.lessonIdx === lIdx);
    if (
      (lesson._id && completedList.includes(String(lesson._id))) ||
      completedList.includes(combinedKey) ||
      (flatItem && completedList.includes(String(flatItem.globalIndex)))
    ) {
      return true;
    }

    return false;
  }, [enrolment, flatLessonsList, isItemCompleted]);

  // Total and completed required content items across the entire course
  const { totalContentItemsCount, completedContentItemsCount } = useMemo(() => {
    let total = 0;
    let completed = 0;
    modulesList.forEach((mod, mIdx) => {
      (mod.lessons || []).forEach((les, lIdx) => {
        const items = Array.isArray(les.items) && les.items.length > 0 ? les.items : [];
        if (items.length > 0) {
          items.forEach(it => {
            total += 1;
            if (isItemCompleted(it, les, mIdx, lIdx)) {
              completed += 1;
            }
          });
        } else {
          total += 1;
          if (isLessonCompleted(mIdx, lIdx, les)) {
            completed += 1;
          }
        }
      });
    });
    return { totalContentItemsCount: Math.max(total, 1), completedContentItemsCount: completed };
  }, [modulesList, isItemCompleted, isLessonCompleted]);

  // Check if course is 100% completed
  const isCourseCompleted = useMemo(() => {
    if (!enrolment) return false;
    if (totalContentItemsCount > 0 && completedContentItemsCount >= totalContentItemsCount) {
      return true;
    }
    return enrolment.status === 'completed' && Number(enrolment.progressPercentage) >= 100;
  }, [enrolment, totalContentItemsCount, completedContentItemsCount]);

  // Course Progress Percentage
  const progressPct = useMemo(() => {
    if (!enrolment) return 0;
    if (totalContentItemsCount > 0) {
      if (completedContentItemsCount >= totalContentItemsCount) return 100;
      return Math.min(Math.round((completedContentItemsCount / totalContentItemsCount) * 100), 99);
    }
    const backendPct = Number(enrolment.progressPercentage) || 0;
    return enrolment.status === 'completed' && backendPct >= 100 ? 100 : Math.min(backendPct, 99);
  }, [enrolment, completedContentItemsCount, totalContentItemsCount]);

  // Module Progress and completion status
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

  // Module completion status
  const isModuleCompleted = useCallback((mIdx) => {
    const mod = modulesList[mIdx];
    if (!mod || !mod.lessons || mod.lessons.length === 0) return false;
    return getModuleProgress(mIdx) >= 100;
  }, [modulesList, getModuleProgress]);

  // ─── 4. Sequential Unlocking Logic ───
  const isModuleUnlocked = useCallback((mIdx) => {
    if (mIdx === 0) return true;
    return isModuleCompleted(mIdx - 1);
  }, [isModuleCompleted]);

  const isLessonUnlocked = useCallback((mIdx, lIdx) => {
    if (!isModuleUnlocked(mIdx)) return false;
    if (lIdx === 0) return true;
    const mod = modulesList[mIdx];
    if (!mod || !mod.lessons) return false;
    for (let i = 0; i < lIdx; i++) {
      if (!isLessonCompleted(mIdx, i, mod.lessons[i])) {
        return false;
      }
    }
    return true;
  }, [isModuleUnlocked, modulesList, isLessonCompleted]);

  // ─── 5. Auto-Resume / Resolve Selected Module, Lesson & Content Item ───
  useEffect(() => {
    if (!modulesList.length) return;

    // Check query params if navigated to specific module/lesson/item
    const searchStr = window.location.search || (window.location.href.includes('?') ? '?' + window.location.href.split('?')[1] : '');
    const urlParams = new URLSearchParams(searchStr);
    const paramMod = urlParams.get('module') ?? urlParams.get('moduleId');
    const paramLes = urlParams.get('lesson') ?? urlParams.get('lessonId');
    const paramItem = urlParams.get('item') ?? urlParams.get('itemId');

    let targetMIdx = -1;
    let targetLIdx = -1;
    let targetIIdx = -1;

    if (paramMod !== null) {
      const mNum = parseInt(paramMod, 10);
      if (!isNaN(mNum) && mNum >= 0 && mNum < modulesList.length) {
        targetMIdx = mNum;
      } else {
        const found = modulesList.findIndex((m) => String(m._id) === String(paramMod));
        if (found !== -1) targetMIdx = found;
      }
    }

    if (targetMIdx !== -1) {
      const currentMod = modulesList[targetMIdx];
      const modLessons = currentMod?.lessons || [];

      if (paramLes !== null) {
        const lNum = parseInt(paramLes, 10);
        if (!isNaN(lNum) && lNum >= 0 && lNum < modLessons.length) {
          targetLIdx = lNum;
        } else {
          const found = modLessons.findIndex((l) => String(l._id) === String(paramLes));
          if (found !== -1) targetLIdx = found;
        }
      }

      if (targetLIdx === -1) {
        // Find first incomplete lesson in this module
        const incLIdx = modLessons.findIndex((l, lIdx) => !isLessonCompleted(targetMIdx, lIdx, l));
        targetLIdx = incLIdx !== -1 ? incLIdx : 0;
      }

      const currentLes = modLessons[targetLIdx];
      const items = currentLes?.items || [];
      if (paramItem !== null) {
        const iNum = parseInt(paramItem, 10);
        if (!isNaN(iNum) && iNum >= 0 && iNum < items.length) {
          targetIIdx = iNum;
        } else {
          const found = items.findIndex((it) => String(it._id) === String(paramItem));
          if (found !== -1) targetIIdx = found;
        }
      }
      if (targetIIdx === -1) {
        targetIIdx = 0;
      }

      setSelectedModuleIdx(targetMIdx);
      setSelectedLessonIdx(targetLIdx);
      setSelectedItemIdx(targetIIdx);
      return;
    }

    // Restore from saved enrolment last accessed identifiers
    if (enrolment?.lastAccessedModuleId || enrolment?.lastAccessedLessonId) {
      const savedModId = String(enrolment.lastAccessedModuleId);
      const savedLesId = String(enrolment.lastAccessedLessonId);

      let foundMIdx = -1;
      let foundLIdx = -1;

      modulesList.forEach((m, mIdx) => {
        if (String(m._id) === savedModId || String(mIdx) === savedModId) {
          foundMIdx = mIdx;
        }
        (m.lessons || []).forEach((l, lIdx) => {
          if (String(l._id) === savedLesId || String(lIdx) === savedLesId) {
            foundMIdx = mIdx;
            foundLIdx = lIdx;
          }
        });
      });

      if (foundMIdx !== -1) {
        setSelectedModuleIdx(foundMIdx);
        if (foundLIdx !== -1) {
          setSelectedLessonIdx(foundLIdx);
          setSelectedItemIdx(0);
          return;
        }
      }
    }

    // Default: Resume first incomplete unlocked lesson
    const firstIncomplete = flatLessonsList.find(
      (item) =>
        isLessonUnlocked(item.moduleIdx, item.lessonIdx) &&
        !isLessonCompleted(item.moduleIdx, item.lessonIdx, item.lesson)
    );

    if (firstIncomplete) {
      setSelectedModuleIdx(firstIncomplete.moduleIdx);
      setSelectedLessonIdx(firstIncomplete.lessonIdx);
      setSelectedItemIdx(0);
    } else {
      setSelectedModuleIdx(0);
      setSelectedLessonIdx(0);
      setSelectedItemIdx(0);
    }
  }, [modulesList, enrolment, isLessonUnlocked, isLessonCompleted, flatLessonsList]);

  // Active module & lesson objects
  const activeModule = modulesList[selectedModuleIdx] || modulesList[0] || null;
  const activeLesson = activeModule?.lessons?.[selectedLessonIdx] || activeModule?.lessons?.[0] || null;
  const lessonItems = useMemo(() => {
    return Array.isArray(activeLesson?.items) ? activeLesson.items : [];
  }, [activeLesson]);

  // Active content item within lesson
  const activeContentItem = useMemo(() => {
    if (lessonItems.length === 0) return null;
    return lessonItems[selectedItemIdx] || lessonItems[0] || null;
  }, [lessonItems, selectedItemIdx]);

  // DYNAMIC CONTENT TYPE NORMALIZATION (Same source of truth for Sidebar & Main Content)
  const contentType = useMemo(() => {
    return normalizeContentType(activeContentItem, activeLesson);
  }, [activeContentItem, activeLesson]);

  const hasPlayableVideo = useMemo(() => {
    if (contentType !== 'video') return false;
    const vUrl = activeContentItem?.video?.videoUrl || activeLesson?.video?.videoUrl || activeLesson?.videoUrl;
    const muxId = activeContentItem?.video?.muxPlaybackId || activeLesson?.video?.muxPlaybackId;
    const cloudUrl = activeContentItem?.video?.cloudinaryUrl;
    return Boolean(
      (typeof vUrl === 'string' && vUrl.trim().length > 0) ||
      (typeof muxId === 'string' && muxId.trim().length > 0) ||
      (typeof cloudUrl === 'string' && cloudUrl.trim().length > 0)
    );
  }, [contentType, activeContentItem, activeLesson]);

  const contentTypeMeta = useMemo(() => {
    return getContentTypeMeta(contentType);
  }, [contentType]);

  // Starter code initialization for exercise/code lessons
  useEffect(() => {
    if (activeLesson) {
      const codeItem = (activeLesson.items || []).find(
        (i) => i.type === 'code' || i.type === 'exercise' || i.type === 'code_practice'
      );
      const starterCode =
        codeItem?.content ||
        codeItem?.bodyMarkdown ||
        '// Write your JavaScript solution here\nfunction solution() {\n  return true;\n}\nconsole.log("Output:", solution());';
      setCodeEditorInput(starterCode);
      setCodeOutput('');
      setQuizAnswers({});
      setQuizScoreData(null);
      setQuizSubmitted(false);
    }
  }, [activeLesson?._id, selectedItemIdx]);

  // ─── Track Bookmark State for Current Resource ───
  const currentResourceId = activeContentItem?._id || activeLesson?._id;

  const checkCurrentBookmark = useCallback(async () => {
    if (!courseId || !currentResourceId) return;
    const token = sessionStorage.getItem('upskillr_token');
    if (!token) return;

    try {
      const res = await fetch(
        `${API_BASE}/learners/me/bookmarks/check?courseId=${courseId}&resourceId=${currentResourceId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (json.success) {
        setIsCurrentBookmarked(json.isBookmarked);
        setCurrentBookmarkId(json.bookmarkId);
      }
    } catch (e) {
      console.warn('Failed to verify bookmark status:', e);
    }
  }, [courseId, currentResourceId]);

  useEffect(() => {
    checkCurrentBookmark();
  }, [checkCurrentBookmark]);

  // Fetch available folders for bookmarking
  const fetchWorkspaceFolders = useCallback(async () => {
    const token = sessionStorage.getItem('upskillr_token');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/learners/me/folders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.folders)) {
        setWorkspaceFolders(json.folders);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchWorkspaceFolders();
  }, [fetchWorkspaceFolders]);

  // Toggle bookmark or assign to folder
  const handleToggleLessonBookmark = async (folderId = null) => {
    const token = sessionStorage.getItem('upskillr_token');
    if (!token) {
      toast.warning('Please log in to save bookmarks.');
      return;
    }

    if (!currentResourceId) return;

    try {
      if (isCurrentBookmarked && currentBookmarkId && !folderId) {
        if (!window.confirm('Remove this lesson from your Learning Library?')) {
          return;
        }
        setIsCurrentBookmarked(false);
        toast.info('Removed from My Learning Library.');
        await fetch(`${API_BASE}/learners/me/bookmarks/${currentBookmarkId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentBookmarkId(null);
      } else {
        const payload = {
          courseId,
          resourceId: currentResourceId,
          resourceType: contentType,
          title: activeContentItem?.title || activeLesson?.title || 'Lesson',
          courseTitle: course?.title,
          courseThumbnail: course?.thumbnail,
          moduleId: activeModule?._id || selectedModuleIdx,
          moduleTitle: activeModule?.title || `Module ${selectedModuleIdx + 1}`,
          lessonId: activeLesson?._id || selectedLessonIdx,
          lessonTitle: activeLesson?.title || `Lesson ${selectedLessonIdx + 1}`,
          contentPreview: activeContentItem?.markdownContent || activeContentItem?.description || '',
          duration: activeLesson?.duration || '',
          totalMarks: activeContentItem?.quiz?.totalMarks || null,
          totalQuestions: activeContentItem?.quiz?.questions?.length || null,
          folderId: folderId || null,
          url: `/learn/${courseId}?module=${selectedModuleIdx}&lesson=${selectedLessonIdx}`,
          action: 'add'
        };

        const res = await fetch(`${API_BASE}/learners/me/bookmarks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          setIsCurrentBookmarked(true);
          setCurrentBookmarkId(json.bookmark?._id || null);
          toast.success(folderId ? 'Saved to folder in Learning Library!' : 'Saved to My Learning Library!');
        } else {
          toast.error(json.message || 'Failed to save bookmark.');
        }
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      toast.error('Unable to update bookmark.');
    }
  };

  // Save personal note from workspace
  const handleSaveWorkspaceNote = async (e) => {
    e.preventDefault();
    if (!workspaceNoteTitle.trim() || !workspaceNoteContent.trim()) return;

    const token = sessionStorage.getItem('upskillr_token');
    if (!token) {
      toast.warning('Please log in to save notes.');
      return;
    }

    setSavingWorkspaceNote(true);
    try {
      const payload = {
        title: workspaceNoteTitle.trim(),
        content: workspaceNoteContent.trim(),
        courseId,
        courseTitle: course?.title,
        moduleId: activeModule?._id || selectedModuleIdx,
        moduleTitle: activeModule?.title || `Module ${selectedModuleIdx + 1}`,
        lessonId: activeLesson?._id || selectedLessonIdx,
        lessonTitle: activeLesson?.title || `Lesson ${selectedLessonIdx + 1}`,
        folderId: workspaceNoteFolderId || null,
        url: `/learn/${courseId}?module=${selectedModuleIdx}&lesson=${selectedLessonIdx}`
      };

      const res = await fetch(`${API_BASE}/learners/me/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Personal note saved to My Learning Library!');
        setIsWorkspaceNoteModalOpen(false);
        setWorkspaceNoteTitle('');
        setWorkspaceNoteContent('');
        setWorkspaceNoteFolderId('');
      } else {
        toast.error(json.message || 'Failed to save note.');
      }
    } catch (err) {
      console.error('Error saving workspace note:', err);
      toast.error('Failed to save personal note.');
    } finally {
      setSavingWorkspaceNote(false);
    }
  };

  // Record access position to backend on lesson switch
  const recordAccessPosition = useCallback(async (mIdx, lIdx, videoTime = 0) => {
    const token = sessionStorage.getItem('upskillr_token');
    if (!token || !courseId) return;

    const mod = modulesList[mIdx];
    const les = mod?.lessons?.[lIdx];

    try {
      await fetch(`${API_BASE}/courses/${courseId}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId,
          moduleId: mod?._id || mIdx,
          lessonId: les?._id || lIdx,
          videoTime
        })
      });
    } catch (e) {
      // Background ping
    }
  }, [courseId, modulesList]);

  // Handle module click
  const handleSelectModule = (mIdx) => {
    if (!isModuleUnlocked(mIdx)) {
      toast.info('Complete previous module lessons to unlock this module.');
      return;
    }
    setSelectedModuleIdx(mIdx);
    setSelectedLessonIdx(0);
    setSelectedItemIdx(0);
    setMobileDrawer(null);
    recordAccessPosition(mIdx, 0);
  };

  // Handle selecting a specific lesson or part
  const handleSelectPart = (mIdx, lIdx, itIdx = 0) => {
    if (!isLessonUnlocked(mIdx, lIdx)) {
      toast.info('Complete the preceding lessons first to unlock this lesson.');
      return;
    }
    setSelectedModuleIdx(mIdx);
    setSelectedLessonIdx(lIdx);
    setSelectedItemIdx(itIdx);
    setMobileDrawer(null);

    // Reset code/quiz states
    setCodeOutput('');
    setQuizSubmitted(false);
    setQuizAnswers({});
    setQuizScoreData(null);

    // Synchronize URL parameters
    const nextUrl = `/learn/${courseId}?module=${mIdx}&lesson=${lIdx}&item=${itIdx}`;
    window.history.replaceState(null, '', nextUrl);

    recordAccessPosition(mIdx, lIdx);
  };

  // Backward-compatible lesson click
  const handleSelectLesson = (mIdx, lIdx) => {
    handleSelectPart(mIdx, lIdx, 0);
  };

  // ─── Module-Specific Completion Percentage for Selected Module ───
  const currentModuleProgress = useMemo(() => {
    if (!activeModule) return 0;
    if (isCourseCompleted) return 100;
    const modLessons = activeModule.lessons || [];
    if (modLessons.length === 0) return 0;

    let totalItems = 0;
    let completedItems = 0;

    modLessons.forEach((les, lIdx) => {
      const items = Array.isArray(les.items) && les.items.length > 0 ? les.items : [];
      if (items.length > 0) {
        items.forEach((it) => {
          totalItems += 1;
          if (isItemCompleted(it, les, selectedModuleIdx, lIdx)) {
            completedItems += 1;
          }
        });
      } else {
        totalItems += 1;
        if (isLessonCompleted(selectedModuleIdx, lIdx, les)) {
          completedItems += 1;
        }
      }
    });

    if (totalItems === 0) return 100;
    if (completedItems >= totalItems) return 100;
    return Math.round((completedItems / totalItems) * 100);
  }, [activeModule, isCourseCompleted, isItemCompleted, isLessonCompleted, selectedModuleIdx]);

  // ─── Synchronize 80% Video Watch Status for Active Lesson ───
  useEffect(() => {
    if (!activeLesson) return;
    const targetId = activeContentItem?._id || activeLesson._id;
    const isDone = isItemCompleted(activeContentItem, activeLesson, selectedModuleIdx, selectedLessonIdx);
    if (isDone || (contentType === 'video' && !hasPlayableVideo)) {
      setVideoWatchStatus({ percentage: 100, isEligible: true, uniqueWatchedDuration: 0, totalDuration: 0 });
      return;
    }

    if (enrolment?.videoWatchData) {
      const keys = [String(targetId), String(activeLesson._id), `${selectedModuleIdx}-${selectedLessonIdx}`];
      let rec = null;
      for (const k of keys) {
        if (enrolment.videoWatchData[k]) {
          rec = enrolment.videoWatchData[k];
          break;
        }
      }
      if (rec) {
        const pct = rec.watchPercentage || 0;
        setVideoWatchStatus({
          percentage: pct,
          isEligible: pct >= 80,
          uniqueWatchedDuration: rec.uniqueWatchedDuration || 0,
          totalDuration: rec.totalDuration || 0
        });
        return;
      }
    }

    setVideoWatchStatus({
      percentage: 0,
      isEligible: false,
      uniqueWatchedDuration: 0,
      totalDuration: 0
    });
  }, [activeContentItem?._id, activeLesson?._id, selectedModuleIdx, selectedLessonIdx, enrolment?.videoWatchData, isItemCompleted, contentType, hasPlayableVideo]);

  // ─── Mark Complete Action ───
  const handleToggleComplete = async () => {
    if (!activeLesson) return;
    const token = sessionStorage.getItem('upskillr_token') || localStorage.getItem('upskillr_token');
    if (!token) {
      toast.warning('Please log in as a learner to track progress.');
      return;
    }

    const currentlyDone = isItemCompleted(activeContentItem, activeLesson, selectedModuleIdx, selectedLessonIdx);
    const newStatus = !currentlyDone;

    // Quiz Completion Guard: Quizzes can ONLY be completed via submitting a quiz attempt!
    if (contentType === 'quiz') {
      if (!currentlyDone) {
        toast.warning('You must attempt and submit the quiz to mark it as complete.');
        return;
      } else {
        toast.info('Completed quizzes cannot be unmarked as incomplete.');
        return;
      }
    }

    // 80% Video Watch Requirement Guard (only enforced if there is a playable video with duration > 0)
    if (newStatus && contentType === 'video' && hasPlayableVideo && (videoDuration > 0 || videoWatchStatus.totalDuration > 0)) {
      const isEligible = Boolean(videoWatchStatus.isEligible || (videoWatchStatus.percentage >= 80));
      if (!isEligible) {
        toast.warning('You need to watch full video to mark the lesson as complete.');
        return;
      }
    }

    const targetIdentifier = activeContentItem?._id || activeLesson._id || `${selectedModuleIdx}-${selectedLessonIdx}`;

    // Optimistic UI update
    setEnrolment((prev) => {
      if (!prev) return prev;
      const currentArr = Array.isArray(prev.completedLessons) ? [...prev.completedLessons] : [];
      const idsToToggle = [
        String(targetIdentifier),
        activeLesson?._id ? String(activeLesson._id) : null,
        activeContentItem?._id ? String(activeContentItem._id) : null
      ].filter(Boolean);

      let updatedArr = [];
      if (newStatus) {
        updatedArr = Array.from(new Set([...currentArr, ...idsToToggle]));
      } else {
        updatedArr = currentArr.filter((id) => !idsToToggle.includes(String(id)));
      }
      return {
        ...prev,
        completedLessons: updatedArr
      };
    });

    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/lessons/${targetIdentifier}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          completed: newStatus,
          moduleId: activeModule?._id || selectedModuleIdx,
          lessonId: activeLesson?._id || selectedLessonIdx
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        // Revert optimistic UI update
        setEnrolment((prev) => {
          if (!prev) return prev;
          const currentArr = Array.isArray(prev.completedLessons) ? [...prev.completedLessons] : [];
          const idsToToggle = [
            String(targetIdentifier),
            activeLesson?._id ? String(activeLesson._id) : null,
            activeContentItem?._id ? String(activeContentItem._id) : null
          ].filter(Boolean);
          const reverted = currentlyDone
            ? Array.from(new Set([...currentArr, ...idsToToggle]))
            : currentArr.filter((id) => !idsToToggle.includes(String(id)));
          return {
            ...prev,
            completedLessons: reverted
          };
        });

        const errMsg = errorData.message || `Server returned ${res.status}`;
        if (errMsg.includes('80%') || errMsg.toLowerCase().includes('watch')) {
          toast.warning('You need to watch full video to mark the lesson as complete.');
        } else if (errMsg.toLowerCase().includes('quiz') || errorData.requiresQuizSubmission) {
          toast.warning(errMsg || 'You must attempt and submit the quiz to mark it as complete.');
        } else {
          toast.error(errMsg);
        }
        return;
      }

      const data = await res.json();

      if (data.success) {
        if (data.enrolment) {
          setEnrolment(data.enrolment);
        }

        const itemLabel = activeContentItem?.title || activeLesson.title;
        if (newStatus) {
          toast.success(`✓ "${itemLabel}" marked as completed!`);
          window.dispatchEvent(new CustomEvent('upskillr_points_updated'));

          // Display specific reward notifications for module or course completions
          if (Array.isArray(data.awardedBadges) && data.awardedBadges.length > 0) {
            data.awardedBadges.forEach((msg) => {
              toast.success(`⭐ ${msg}`);
            });
          } else if (data.pointsAwarded > 0) {
            toast.success(`⭐ +${data.pointsAwarded} Points awarded!`);
          }

          if (data.isCourseCompleted || data.enrolment?.progressPercentage === 100) {
            toast.success('🎓 Congratulations! You completed all lessons in this course!');
          }
        } else {
          toast.info(`"${itemLabel}" marked as incomplete.`);
        }

        // Re-fetch progress to stay in sync with backend gamification
        try {
          const progressRes = await fetch(`${API_BASE}/courses/${courseId}/progress`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (progressRes.ok) {
            const progressData = await progressRes.json();
            if (progressData.success && progressData.enrolment) {
              setEnrolment(progressData.enrolment);
            }
          }
        } catch (fetchErr) {
          // Background sync
        }
      } else {
        toast.error(data.message || 'Could not update lesson progress.');
      }
    } catch (err) {
      console.error('Error toggling complete:', err);
      toast.error(err.message || 'Network error updating progress.');
    }
  };

  // ─── Module-Specific Previous / Next Navigation Across Items & Lessons ───
  const modLessons = activeModule?.lessons || [];
  const hasItemPrev = selectedItemIdx > 0;
  const hasLessonPrevInModule = selectedLessonIdx > 0;
  const canGoPrevious = hasItemPrev || hasLessonPrevInModule;

  const hasItemNext = lessonItems.length > 0 && selectedItemIdx < lessonItems.length - 1;
  const hasLessonNextInModule = selectedLessonIdx < modLessons.length - 1;
  const isLastItemInModule = !hasItemNext && !hasLessonNextInModule;

  const handleGoPrevious = () => {
    if (hasItemPrev) {
      handleSelectPart(selectedModuleIdx, selectedLessonIdx, selectedItemIdx - 1);
      return;
    }
    if (hasLessonPrevInModule) {
      const prevLIdx = selectedLessonIdx - 1;
      const prevLes = modLessons[prevLIdx];
      const prevItems = prevLes?.items || [];
      const prevLastItemIdx = Math.max(0, prevItems.length - 1);
      handleSelectPart(selectedModuleIdx, prevLIdx, prevLastItemIdx);
    }
  };

  const handleGoNext = () => {
    if (hasItemNext) {
      handleSelectPart(selectedModuleIdx, selectedLessonIdx, selectedItemIdx + 1);
      return;
    }
    if (hasLessonNextInModule) {
      const nextLIdx = selectedLessonIdx + 1;
      if (!isLessonUnlocked(selectedModuleIdx, nextLIdx)) {
        toast.info('Complete the current lesson first to proceed to the next lesson.');
        return;
      }
      handleSelectPart(selectedModuleIdx, nextLIdx, 0);
      return;
    }
    // At the end of the module
    toast.success(`🎉 You have finished Module ${selectedModuleIdx + 1}: ${activeModule?.title || 'Module'}!`);
    handleOpenCourseDetails();
  };

  // ─── Video Player Handlers ───
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = Math.floor(videoRef.current.currentTime);
    setVideoCurrentTime(current);

    // Auto-save every 10 seconds
    if (Math.abs(current - lastSavedTimeRef.current) >= 10) {
      lastSavedTimeRef.current = current;
      recordAccessPosition(selectedModuleIdx, selectedLessonIdx, current);
    }
  };

  // ─── Interactive Inline Quiz Submission ───
  const handleQuizAnswerSelect = (qIdx, optIdx, isMulti = false) => {
    if (quizSubmitted) return;
    if (isMulti) {
      setQuizAnswers((prev) => {
        const arr = Array.isArray(prev[qIdx]) ? prev[qIdx] : prev[qIdx] !== undefined ? [prev[qIdx]] : [];
        const nextArr = arr.includes(optIdx) ? arr.filter((i) => i !== optIdx) : [...arr, optIdx];
        return { ...prev, [qIdx]: nextArr };
      });
    } else {
      setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
    }
  };

  const handleQuizSubmit = async (questions, passThreshold = 70) => {
    if (!questions.length) return;

    let earnedMarks = 0;
    let totalMarks = 0;
    let correctCount = 0;

    questions.forEach((q, idx) => {
      const qMarks = Number(q.marks) || 1;
      totalMarks += qMarks;
      const selected = quizAnswers[idx];
      const isMulti = q.type === 'multiple_response';

      if (isMulti) {
        const correctArr = Array.isArray(q.correctOptionIndexes) && q.correctOptionIndexes.length > 0
          ? q.correctOptionIndexes.map(Number)
          : [Number(q.correctAnswerIndex ?? 0)];
        const selArr = (Array.isArray(selected) ? selected : [selected]).map(Number);
        if (correctArr.sort().join(',') === selArr.sort().join(',')) {
          earnedMarks += qMarks;
          correctCount++;
        }
      } else {
        const correctIdx = q.correctAnswerIndex !== undefined ? Number(q.correctAnswerIndex) : 0;
        if (selected === correctIdx) {
          earnedMarks += qMarks;
          correctCount++;
        }
      }
    });

    const percent = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 100;
    const passed = percent >= passThreshold;

    setQuizScoreData({
      earnedMarks,
      totalMarks,
      correctCount,
      totalCount: questions.length,
      percentage: percent,
      passed
    });
    setQuizSubmitted(true);

    if (passed) {
      toast.success(`🎉 Quiz passed with ${percent}%!`);
      if (!isLessonCompleted(selectedModuleIdx, selectedLessonIdx, activeLesson)) {
        handleToggleComplete();
      }
    } else {
      toast.error(`Quiz score: ${percent}%. Minimum required is ${passThreshold}%. Try again!`);
    }
  };

  // ─── Code Execution Runner ───
  const handleRunCode = () => {
    setIsExecutingCode(true);
    setCodeOutput('Executing in workspace sandbox...\n');

    setTimeout(() => {
      try {
        const logs = [];
        const originalLog = console.log;
        console.log = (...args) => {
          logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        };

        const result = new Function(codeEditorInput)();
        console.log = originalLog;

        const outputStr = logs.length > 0 ? logs.join('\n') : `Execution returned: ${String(result)}`;
        setCodeOutput(`✓ Execution Successful:\n--------------------------\n${outputStr}`);
      } catch (err) {
        setCodeOutput(`❌ Runtime Error:\n--------------------------\n${err.message}`);
      } finally {
        setIsExecutingCode(false);
      }
    }, 400);
  };

  // ─── Back to Course Overview ───
  const handleOpenCourseDetails = () => {
    const path = `/courses/${courseId}`;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  };

  // ─── Collect Course-Level Attachments & Assessments ───
  const allAttachments = useMemo(() => {
    if (!course) return [];
    const list = [];
    (course.notes || []).forEach((n) => list.push({ ...n, scopeName: 'Course Level' }));
    modulesList.forEach((m) => {
      (m.notes || []).forEach((n) => list.push({ ...n, scopeName: m.title }));
      (m.lessons || []).forEach((l) => {
        (l.notes || []).forEach((n) => list.push({ ...n, scopeName: `${m.title} > ${l.title}` }));
      });
    });
    return list;
  }, [course, modulesList]);

  const allAssessments = useMemo(() => {
    if (!course) return [];
    return course.courseAssessments || [];
  }, [course]);

  if (loading) {
    return (
      <div className="workspace-loading-screen">
        <div className="workspace-loading-card">
          <div className="workspace-spinner" />
          <h2>Loading Learning Workspace...</h2>
          <p>Restoring your curriculum position and lesson materials.</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="workspace-error-screen">
        <div className="workspace-error-card">
          <AlertCircle size={44} className="error-icon" />
          <h2>Unable to Load Course</h2>
          <p>{error || 'Course content is currently unavailable.'}</p>
          <div className="error-actions-row">
            <button type="button" className="btn-workspace-primary" onClick={handleOpenCourseDetails}>
              <ArrowLeft size={16} />
              <span>Back to Course Overview</span>
            </button>
            <button type="button" className="btn-workspace-secondary" onClick={fetchWorkspaceData}>
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`course-learning-workspace ${isDarkMode ? 'theme-dark' : 'theme-light'}`}>
      {/* ─── WORKSPACE TOP HEADER (DEDICATED TO ACTIVE MODULE) ─── */}
      <header className="workspace-top-header" role="banner">
        <div className="workspace-header-row-1">
          {/* Left: Back to Course Overview + UpSkillR Brand */}
          <div className="header-row1-left">
            <button
              type="button"
              className="btn-back-overview"
              onClick={handleOpenCourseDetails}
              title="Return to Course Overview"
              aria-label="Back to Course Overview"
            >
              <ArrowLeft size={16} />
              <span>Back to Course Overview</span>
            </button>

            <span className="header-v-divider" />

            <div className="header-brand-logo">
              <span className="brand-badge-pill">UpSkillR</span>
            </div>
          </div>

          {/* Center: Current Module Name (NOT course name!) */}
          <div className="header-row1-center">
            <h1
              className="header-module-title"
              title={activeModule ? `Module ${selectedModuleIdx + 1}: ${activeModule.title}` : 'Learning Workspace'}
            >
              {activeModule ? `Module ${selectedModuleIdx + 1}: ${activeModule.title}` : 'Learning Workspace'}
            </h1>
          </div>

          {/* Right: Module-Specific Progress, Theme Toggle, Mobile Triggers & Feedback */}
          <div className="header-row1-right">
            {/* Mobile Drawer Trigger Buttons */}
            <div className="mobile-drawer-triggers">
              <button
                type="button"
                className="btn-mobile-drawer-trigger"
                onClick={() => setMobileDrawer((p) => (p === 'lessons' ? null : 'lessons'))}
                aria-label="Toggle lessons navigation"
                title="Lessons list"
              >
                <Layers size={15} />
                <span>Lessons</span>
              </button>

              <button
                type="button"
                className="btn-mobile-drawer-trigger"
                onClick={() => setMobileDrawer((p) => (p === 'items' ? null : 'items'))}
                aria-label="Toggle content items"
                title="Content list"
              >
                <Menu size={15} />
                <span>Contents</span>
              </button>
            </div>

            {/* Module-Specific Progress Badge */}
            <div
              className="header-progress-wrap"
              title={`Module ${selectedModuleIdx + 1} completion: ${currentModuleProgress}%`}
            >
              <div className="progress-mini-bar-track">
                <div
                  className="progress-mini-bar-fill"
                  style={{ width: `${currentModuleProgress}%` }}
                />
              </div>
              <span className="progress-mini-text">{currentModuleProgress}% Complete</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              className="btn-workspace-theme-toggle"
              onClick={toggleTheme}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Feedback Rating Button */}
            <button
              type="button"
              className="btn-feedback-action"
              onClick={() => setIsRatingOpen(true)}
              title="Rate Course & Share Feedback"
              aria-label="Share Feedback"
            >
              <Star size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── THREE-PANEL LEARNING VIEWPORT ─── */}
      <div className="workspace-main-body">
        {/* ─── PANEL 1: SIDEBAR 1 – LESSONS OF THE SELECTED MODULE (~250px) ─── */}
        <aside
          className={`workspace-sidebar-modules ${isSidebar1Collapsed ? 'collapsed' : ''} ${mobileDrawer === 'lessons' ? 'mobile-open' : ''}`}
          aria-label={`Module ${selectedModuleIdx + 1} Lessons`}
        >
          <div className="sidebar-module-brand-header">
            {!isSidebar1Collapsed && (
              <div className="sidebar-module-brand-info">
                <span className="sidebar-module-badge">MODULE {selectedModuleIdx + 1}</span>
                <h3 className="sidebar-module-heading" title={activeModule?.title}>
                  {activeModule?.title || `Module ${selectedModuleIdx + 1}`}
                </h3>
                <span className="sidebar-module-sub-count">
                  {(activeModule?.lessons || []).length} {activeModule?.lessons?.length === 1 ? 'Lesson' : 'Lessons'}
                </span>
              </div>
            )}
            <button
              type="button"
              className="btn-collapse-sidebar"
              onClick={() => setIsSidebar1Collapsed((p) => !p)}
              title={isSidebar1Collapsed ? 'Expand Lessons Sidebar' : 'Collapse Lessons Sidebar'}
              aria-label={isSidebar1Collapsed ? 'Expand lessons sidebar' : 'Collapse lessons sidebar'}
            >
              {isSidebar1Collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          </div>

          <div className="sidebar-module-lessons-scroll-list" role="list">
            {(activeModule?.lessons || []).map((les, lIdx) => {
              const isSelected = selectedLessonIdx === lIdx;
              const isDone = isLessonCompleted(selectedModuleIdx, lIdx, les);
              const isUnlocked = isLessonUnlocked(selectedModuleIdx, lIdx);
              const lesItems = Array.isArray(les.items) && les.items.length > 0 ? les.items : [];
              const itemsCount = lesItems.length;

              return (
                <div
                  key={les._id || lIdx}
                  className={`sidebar-lesson-card ${isSelected ? 'selected' : ''} ${isDone ? 'completed' : ''} ${!isUnlocked ? 'locked' : ''}`}
                  role="listitem"
                  onClick={() => {
                    if (!isUnlocked) {
                      toast.info('Complete the preceding lessons first to unlock this lesson.');
                      return;
                    }
                    handleSelectPart(selectedModuleIdx, lIdx, 0);
                  }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (!isUnlocked) {
                        toast.info('Complete the preceding lessons first to unlock this lesson.');
                        return;
                      }
                      handleSelectPart(selectedModuleIdx, lIdx, 0);
                    }
                  }}
                  title={`${les.title} (Lesson ${selectedModuleIdx + 1}.${lIdx + 1})`}
                  aria-label={`${les.title}, ${isDone ? 'Completed' : !isUnlocked ? 'Locked' : 'Available'}`}
                >
                  {isSidebar1Collapsed ? (
                    <div className="lesson-collapsed-indicator">
                      {isDone ? (
                        <CheckCircle2 size={16} className="status-icon done" />
                      ) : !isUnlocked ? (
                        <Lock size={14} className="status-icon lock" />
                      ) : (
                        <span className="lesson-collapsed-num">{selectedModuleIdx + 1}.{lIdx + 1}</span>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="sidebar-lesson-status-col">
                        {isDone ? (
                          <CheckCircle2 size={16} className="status-icon done" />
                        ) : !isUnlocked ? (
                          <Lock size={14} className="status-icon lock" />
                        ) : isSelected ? (
                          <span className="status-icon active-dot" />
                        ) : (
                          <span className="status-icon pending-bullet" />
                        )}
                      </div>

                      <div className="sidebar-lesson-info-col">
                        <span className="sidebar-lesson-num-label">
                          Lesson {selectedModuleIdx + 1}.{lIdx + 1}
                        </span>
                        <h4 className="sidebar-lesson-title" title={les.title}>
                          {les.title}
                        </h4>
                        <div className="sidebar-lesson-meta-row">
                          {itemsCount > 0 && (
                            <span>{itemsCount} {itemsCount === 1 ? 'Content' : 'Contents'}</span>
                          )}
                          {itemsCount > 0 && les.duration && <span className="meta-dot">•</span>}
                          {les.duration && <span>{les.duration}</span>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ─── PANEL 2: SIDEBAR 2 – LESSON CONTENT ITEMS NAVIGATION (~280px) ─── */}
        <aside
          className={`workspace-sidebar-lessons ${isSidebar2Collapsed ? 'collapsed' : ''} ${mobileDrawer === 'items' ? 'mobile-open' : ''}`}
          aria-label="Lesson Content Items"
        >
          <div className="sidebar-lessons-header">
            {!isSidebar2Collapsed && (
              <div className="module-context-block">
                <span className="module-context-super">
                  LESSON {selectedModuleIdx + 1}.{selectedLessonIdx + 1} &bull; {activeLesson?.title}
                </span>
                <h3 className="module-context-title" title={activeLesson?.title}>
                  Content Items ({lessonItems.length > 0 ? lessonItems.length : 1})
                </h3>
              </div>
            )}
            <button
              type="button"
              className="btn-collapse-sidebar"
              onClick={() => setIsSidebar2Collapsed((p) => !p)}
              title={isSidebar2Collapsed ? 'Expand Content Sidebar' : 'Collapse Content Sidebar'}
              aria-label={isSidebar2Collapsed ? 'Expand content sidebar' : 'Collapse content sidebar'}
            >
              {isSidebar2Collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          </div>

          <div className="sidebar-lessons-scroll-list" role="list">
            {lessonItems.length > 0 ? (
              lessonItems.map((item, itIdx) => {
                const itType = normalizeContentType(item, activeLesson);
                const itMeta = getContentTypeMeta(itType);
                const isPartActive = selectedItemIdx === itIdx;
                const isPartDone = isItemCompleted(item, activeLesson, selectedModuleIdx, selectedLessonIdx);

                if (isSidebar2Collapsed) {
                  return (
                    <button
                      key={item._id || itIdx}
                      type="button"
                      className={`lesson-nav-row collapsed-item-btn ${isPartActive ? 'selected' : ''} ${isPartDone ? 'completed' : ''}`}
                      onClick={() => handleSelectPart(selectedModuleIdx, selectedLessonIdx, itIdx)}
                      title={`${selectedLessonIdx + 1}.${itIdx + 1} ${item.title || activeLesson?.title} (${itMeta.label})`}
                      aria-label={`${item.title || activeLesson?.title}`}
                    >
                      <div className={`lesson-type-badge ${itMeta.badgeClass}`}>
                        {getContentTypeIcon(itType, 16)}
                      </div>
                    </button>
                  );
                }

                return (
                  <div
                    key={item._id || itIdx}
                    className={`lesson-part-row ${isPartActive ? 'selected' : ''} ${isPartDone ? 'completed' : ''}`}
                    role="listitem"
                    onClick={() => handleSelectPart(selectedModuleIdx, selectedLessonIdx, itIdx)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleSelectPart(selectedModuleIdx, selectedLessonIdx, itIdx);
                    }}
                    title={`${selectedLessonIdx + 1}.${itIdx + 1} ${item.title || activeLesson?.title} (${itMeta.label})`}
                  >
                    <div className={`lesson-type-badge ${itMeta.badgeClass}`}>
                      {getContentTypeIcon(itType, 15)}
                    </div>

                    <div className="lesson-part-info">
                      <span className="lesson-part-name" title={item.title || activeLesson?.title}>
                        {selectedLessonIdx + 1}.{itIdx + 1} {item.title || `${itMeta.label} Part ${itIdx + 1}`}
                      </span>
                      <div className="lesson-part-meta">
                        <span className="lesson-type-name">{itMeta.label}</span>
                        {item.wordCount && <span className="lesson-meta-dot">•</span>}
                        {item.wordCount && <span>{item.wordCount} words</span>}
                        {item.video?.duration && <span className="lesson-meta-dot">•</span>}
                        {item.video?.duration && <span>{item.video.duration}</span>}
                        {item.duration && !item.wordCount && !item.video?.duration && <span className="lesson-meta-dot">•</span>}
                        {item.duration && !item.wordCount && !item.video?.duration && <span>{item.duration}</span>}
                      </div>
                    </div>

                    <div className="lesson-status-badge">
                      {isPartDone ? (
                        <CheckCircle2 size={15} className="lesson-check-icon done" />
                      ) : isPartActive ? (
                        <span className="lesson-current-indicator" />
                      ) : (
                        <span className="lesson-pending-dot" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Single Item Lesson View Fallback */
              <div
                className={`lesson-nav-row selected ${isLessonCompleted(selectedModuleIdx, selectedLessonIdx, activeLesson) ? 'completed' : ''}`}
                role="listitem"
              >
                <div className={`lesson-type-badge ${contentTypeMeta.badgeClass}`}>
                  {getContentTypeIcon(contentType, 16)}
                </div>
                <div className="lesson-nav-info">
                  <span className="lesson-nav-name">{activeLesson?.title || 'Lesson Overview'}</span>
                  <div className="lesson-meta-row">
                    <span className="lesson-type-name">{contentTypeMeta.label}</span>
                    {activeLesson?.duration && <span className="lesson-meta-dot">•</span>}
                    {activeLesson?.duration && <span>{activeLesson.duration}</span>}
                  </div>
                </div>
                <div className="lesson-status-badge">
                  {isLessonCompleted(selectedModuleIdx, selectedLessonIdx, activeLesson) ? (
                    <CheckCircle2 size={15} className="lesson-check-icon done" />
                  ) : (
                    <span className="lesson-current-indicator" />
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Backdrop Overlay */}
        {mobileDrawer !== null && (
          <div
            className="workspace-mobile-overlay"
            onClick={() => setMobileDrawer(null)}
            aria-hidden="true"
          />
        )}

        {/* ─── PANEL 3: MAIN LEARNING CONTENT AREA ─── */}
        <main className="workspace-main-content-panel" role="main">
          <div className="curriculum-viewer-flow">
            {/* Clean Lesson Header Bar with Dynamic Type Badge & ONE Single Mark as Complete Button */}
            <div className="content-lesson-header-bar">
              <div className="content-lesson-header-left">
                <div className="content-breadcrumb-trail">
                  <span className="crumb-course" title={course.title}>{course.title}</span>
                  <span className="crumb-sep">→</span>
                  <span className="crumb-module">Module {selectedModuleIdx + 1}</span>
                  <span className="crumb-sep">→</span>
                  <span className="crumb-lesson">{activeLesson?.title || 'Lesson'}</span>
                </div>

                <div className="content-lesson-meta-row">
                  <h2 className="content-lesson-active-title">
                    {activeContentItem?.title && activeContentItem?.title !== activeLesson?.title
                      ? activeContentItem.title
                      : activeLesson?.title}
                  </h2>
                  <div className="content-lesson-badges">
                    {/* Dynamic Content Type Pill - Perfectly synchronized with Sidebar 2! */}
                    <span className={`content-type-pill ${contentTypeMeta.badgeClass}`}>
                      {getContentTypeIcon(contentType, 13)}
                      <span className="badge-type-label">{contentTypeMeta.label}</span>
                    </span>
                    {(() => {
                      const effectiveDur = (activeLesson?.duration && activeLesson.duration !== '0 min')
                        ? activeLesson.duration
                        : (videoDuration > 0 ? formatDurationBadge(videoDuration) : null);
                      if (!effectiveDur) return null;
                      return (
                        <span className="content-duration-badge">
                          <Clock size={13} />
                          <span>{effectiveDur}</span>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="content-lesson-header-right">
                {/* Workspace Bookmark Action Group */}
                <div className="workspace-bookmark-action-group">
                  <button
                    type="button"
                    className={`btn-action-bookmark ${isCurrentBookmarked ? 'is-bookmarked' : ''}`}
                    onClick={() => handleToggleLessonBookmark()}
                    title={isCurrentBookmarked ? 'Remove Bookmark' : 'Save to My Learning Library'}
                    aria-label={isCurrentBookmarked ? 'Bookmarked' : 'Bookmark Lesson'}
                  >
                    <Bookmark size={16} fill={isCurrentBookmarked ? 'currentColor' : 'none'} />
                    <span>{isCurrentBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-bookmark-folder-trigger"
                    onClick={() => setIsFolderPickerOpen((prev) => !prev)}
                    title="Save to specific folder"
                    aria-label="Select folder for bookmark"
                  >
                    <Folder size={14} />
                    <ChevronDown size={11} />
                  </button>

                  {/* Folder dropdown popover */}
                  {isFolderPickerOpen && (
                    <div className="bookmark-folder-popover">
                      <div className="folder-popover-header">
                        <span>Save to Folder:</span>
                        <button
                          type="button"
                          className="btn-popover-close"
                          onClick={() => setIsFolderPickerOpen(false)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                      <div className="folder-popover-list">
                        <button
                          type="button"
                          className="folder-popover-opt"
                          onClick={() => {
                            handleToggleLessonBookmark(null);
                            setIsFolderPickerOpen(false);
                          }}
                        >
                          <Layers size={13} />
                          <span>Unorganized</span>
                        </button>
                        {workspaceFolders.map((f) => (
                          <button
                            key={f._id}
                            type="button"
                            className="folder-popover-opt"
                            onClick={() => {
                              handleToggleLessonBookmark(f._id);
                              setIsFolderPickerOpen(false);
                            }}
                          >
                            <Folder size={13} style={{ color: f.color || '#10b981' }} />
                            <span>{f.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Personal Note Button */}
                <button
                  type="button"
                  className="btn-action-workspace-note"
                  onClick={() => {
                    setWorkspaceNoteTitle(`Note: ${activeContentItem?.title || activeLesson?.title || 'Lesson'}`);
                    setWorkspaceNoteContent('');
                    setIsWorkspaceNoteModalOpen(true);
                  }}
                  title="Add Personal Note for this lesson"
                  aria-label="Add Personal Note"
                >
                  <PenLine size={16} />
                  <span>Add Note</span>
                </button>

                {/* ONE Single Primary Mark as Complete Button with Silent 80% Watch & Quiz Submission Enforcement */}
                {(() => {
                  const isDone = isItemCompleted(activeContentItem, activeLesson, selectedModuleIdx, selectedLessonIdx);

                  // Quizzes have a dedicated submission-driven completion flow
                  if (contentType === 'quiz') {
                    if (isDone) {
                      return (
                        <div className="complete-btn-container">
                          <button
                            type="button"
                            className="btn-action-complete is-completed quiz-completed"
                            disabled
                            title="Quiz successfully submitted and completed"
                            aria-label="Quiz Completed"
                          >
                            <CheckCircle2 size={16} />
                            <span>Completed ✓</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="complete-btn-container">
                        <button
                          type="button"
                          className="btn-action-complete quiz-not-attempted"
                          disabled
                          title="Attempt and submit the quiz below to mark as completed"
                          aria-label="Quiz Not Attempted"
                        >
                          <HelpCircle size={16} />
                          <span>Not Attempted</span>
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="complete-btn-container">
                      <button
                        type="button"
                        className={`btn-action-complete ${isDone ? 'is-completed' : ''}`}
                        onClick={handleToggleComplete}
                        title={
                          isDone
                            ? 'Lesson is completed (Click to unmark)'
                            : 'Mark as Complete'
                        }
                        aria-label={
                          isDone
                            ? 'Completed'
                            : 'Mark as Complete'
                        }
                      >
                        <CheckCircle2 size={16} />
                        <span>{isDone ? 'Completed ✓' : 'Mark as Complete'}</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Dynamic Content Presentation Viewport with Centralized LessonContentRenderer */}
            <div className="content-presentation-viewport">
              <LessonContentRenderer
                lesson={activeLesson}
                contentItem={activeContentItem}
                contentType={contentType}
                course={course}
                moduleIdx={selectedModuleIdx}
                lessonIdx={selectedLessonIdx}
                itemIdx={selectedItemIdx}
                videoState={{
                  videoRef,
                  isCompleted: isItemCompleted(activeContentItem, activeLesson, selectedModuleIdx, selectedLessonIdx),
                  onWatchEligibilityChange: (status) => {
                    if (status) {
                      setVideoWatchStatus({
                        percentage: status.percentage || 0,
                        isEligible: Boolean(status.isEligible),
                        uniqueWatchedDuration: status.uniqueWatchedDuration || 0,
                        totalDuration: status.totalDuration || 0
                      });
                    }
                  },
                  onTimeUpdate: handleVideoTimeUpdate,
                  onPlay: () => setIsPlaying(true),
                  onPause: () => {
                    setIsPlaying(false);
                    if (videoRef.current) {
                      recordAccessPosition(
                        selectedModuleIdx,
                        selectedLessonIdx,
                        Math.floor(videoRef.current.currentTime)
                      );
                    }
                  },
                  onLoadedMetadata: (e) => setVideoDuration(e.target.duration)
                }}
                quizState={{
                  quizAnswers,
                  onAnswerSelect: handleQuizAnswerSelect,
                  onSubmit: handleQuizSubmit,
                  quizSubmitted,
                  quizScoreData,
                  onRetry: () => {
                    setQuizAnswers({});
                    setQuizSubmitted(false);
                    setQuizScoreData(null);
                  }
                }}
                codeState={{
                  codeEditorInput,
                  onCodeChange: setCodeEditorInput,
                  codeOutput,
                  onRunCode: handleRunCode,
                  isExecutingCode,
                  onResetCode: () => {
                    const codeItem = (activeLesson?.items || []).find(
                      (i) => i.type === 'code' || i.type === 'exercise' || i.type === 'code_practice'
                    );
                    setCodeEditorInput(
                      codeItem?.content ||
                        codeItem?.bodyMarkdown ||
                        '// Write your JavaScript solution here\nfunction solution() {\n  return true;\n}\nconsole.log("Output:", solution());'
                    );
                    setCodeOutput('');
                  }
                }}
                bookmarkState={{
                  isBookmarked: isCurrentBookmarked,
                  onToggleBookmark: handleToggleLessonBookmark
                }}
              />
            </div>

            {/* Bottom Lesson & Part Navigation Footer */}
            <footer className="workspace-bottom-nav-footer">
              <div className="bottom-nav-inner">
                <button
                  type="button"
                  className="btn-nav-prev"
                  onClick={handleGoPrevious}
                  disabled={!canGoPrevious}
                  aria-label="Previous Lesson or Part"
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <div className="bottom-nav-status-text">
                  <span className="nav-lesson-counter">
                    Lesson {selectedModuleIdx + 1}.{selectedLessonIdx + 1}
                    {lessonItems.length > 1 ? ` • Part ${selectedItemIdx + 1} of ${lessonItems.length}` : ''}
                  </span>
                  {isItemCompleted(activeContentItem, activeLesson, selectedModuleIdx, selectedLessonIdx) && (
                    <span className="status-completed-pill">Completed ✓</span>
                  )}
                </div>

                {!isLastItemInModule ? (
                  <button
                    type="button"
                    className="btn-nav-next"
                    onClick={handleGoNext}
                    aria-label="Next Lesson or Part"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-nav-next finished-course"
                    onClick={handleGoNext}
                    aria-label="Module Completed"
                  >
                    <CheckCircle2 size={16} />
                    <span>Module Complete!</span>
                  </button>
                )}
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* ─── WORKSPACE PERSONAL NOTE MODAL ─── */}
      {isWorkspaceNoteModalOpen && (
        <div className="library-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ws-note-title">
          <div className="library-modal-container note-modal-size">
            <div className="library-modal-header">
              <div className="modal-title-row">
                <PenLine size={20} className="modal-title-icon" />
                <h2 id="ws-note-title" className="library-modal-title">Personal Note on this Lesson</h2>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsWorkspaceNoteModalOpen(false)}
                aria-label="Close note modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWorkspaceNote} className="library-modal-body">
              <div className="workspace-note-context-box">
                <span className="context-course-title">{course?.title}</span>
                <span className="context-arrow">→</span>
                <span className="context-lesson-title">{activeContentItem?.title || activeLesson?.title}</span>
              </div>

              <div className="library-form-group">
                <label className="library-form-label">
                  Note Title <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  className="library-form-input"
                  value={workspaceNoteTitle}
                  onChange={(e) => setWorkspaceNoteTitle(e.target.value)}
                  placeholder="e.g., Key concept or formula to remember"
                  required
                  autoFocus
                />
              </div>

              <div className="library-form-group">
                <label className="library-form-label">Folder (Optional)</label>
                <select
                  className="library-form-select"
                  value={workspaceNoteFolderId}
                  onChange={(e) => setWorkspaceNoteFolderId(e.target.value)}
                >
                  <option value="">Unorganized (No Folder)</option>
                  {workspaceFolders.map((f) => (
                    <option key={f._id} value={f._id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="library-form-group">
                <label className="library-form-label">
                  Note Content <span className="required-star">*</span>
                </label>
                <textarea
                  className="library-form-textarea"
                  rows={6}
                  value={workspaceNoteContent}
                  onChange={(e) => setWorkspaceNoteContent(e.target.value)}
                  placeholder="Write your notes, code snippets, or revision points here..."
                  required
                />
              </div>

              <div className="library-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsWorkspaceNoteModalOpen(false)}
                  disabled={savingWorkspaceNote}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-save"
                  disabled={savingWorkspaceNote || !workspaceNoteTitle.trim() || !workspaceNoteContent.trim()}
                >
                  {savingWorkspaceNote ? 'Saving...' : 'Save to Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── COURSE RATING & FEEDBACK MODAL ─── */}
      <CourseRatingModal
        isOpen={isRatingOpen}
        onClose={() => setIsRatingOpen(false)}
        courseTitle={course?.title || 'Course'}
        onSubmit={async (ratingData) => {
          const token = sessionStorage.getItem('upskillr_token');
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
    </div>
  );
};

export default CourseWorkspacePage;
