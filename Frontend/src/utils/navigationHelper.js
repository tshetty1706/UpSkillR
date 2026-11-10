/**
 * Navigation helper to ensure seamless return navigation across all courses,
 * workspaces, tabs, and pages in UpSkillR.
 */

export const isCourseInternalUrl = (url = '') => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.startsWith('/courses/') ||
    lower.startsWith('/course/') ||
    lower.startsWith('/learn/') ||
    lower.startsWith('/quiz/') ||
    lower.startsWith('/assessment/')
  );
};

export const recordCourseReturnUrl = (customOrigin = null) => {
  try {
    const origin = customOrigin || (window.location.pathname + window.location.search);
    if (origin && !isCourseInternalUrl(origin)) {
      sessionStorage.setItem('upskillr_course_return_url', origin);
    }
  } catch (e) {}
};

export const getCourseReturnUrl = (fallback = '/learner/my-learning') => {
  try {
    const stored = sessionStorage.getItem('upskillr_course_return_url');
    if (stored && !isCourseInternalUrl(stored)) {
      return stored;
    }
  } catch (e) {}
  return fallback;
};

export const getCourseReturnLabel = (userRole = 'learner') => {
  try {
    const returnUrl = sessionStorage.getItem('upskillr_course_return_url');
    if (!returnUrl) {
      return userRole === 'learner' ? 'Back to My Learning' : 'Back to Courses';
    }
    const lower = returnUrl.toLowerCase();
    if (lower.includes('/my-learning')) {
      if (lower.includes('tab=completed')) return 'Back to Completed Courses';
      if (lower.includes('tab=not_started')) return 'Back to Not Started Courses';
      return 'Back to My Learning';
    }
    if (lower.includes('/bookmarks')) return 'Back to Bookmarks';
    if (lower.includes('/achievements')) return 'Back to Achievements';
    if (lower.includes('/feedback')) return 'Back to Feedback';
    if (lower.includes('/explore')) return 'Back to Explore';
    if (lower.includes('/dashboard')) return 'Back to Dashboard';
    if (lower.includes('/instructors')) return 'Back to Instructors';
    if (lower === '/' || lower === '') return 'Back to Home';
  } catch (e) {}
  return 'Back';
};

export const navigateTo = (path) => {
  try {
    if (isCourseInternalUrl(path)) {
      recordCourseReturnUrl();
    }
    window.history.pushState({}, '', path);
    window.dispatchEvent(new CustomEvent('upskillr_navigate', { detail: { path } }));
  } catch (e) {
    window.location.href = path;
  }
};
