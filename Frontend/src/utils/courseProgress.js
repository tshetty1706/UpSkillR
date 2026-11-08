/**
 * Shared single-source-of-truth course progress calculator for UpSkillR.
 * 
 * Formula:
 * Course Progress = (Number of completed required content items / Total required content items) * 100
 * Module Progress = (Completed required content items in that module / Total required content items in that module) * 100
 * 
 * Status Classification:
 * - Not Started: No required content items completed (0%).
 * - In Progress (Enrolled): At least one required content item completed, below 100%.
 * - Completed: Every required content item across all published modules completed (exactly 100%).
 */

export const calculateCourseProgress = (enrolment, courseOverride = null) => {
  if (!enrolment) {
    return {
      course: null,
      progressPct: 0,
      category: 'not_started',
      status: 'not_started',
      isCompleted: false,
      completedRequiredItems: 0,
      totalRequiredItems: 1,
      completedCount: 0,
      totalLessons: 1,
      lessons: [],
      validDone: new Set(),
      modulesProgress: []
    };
  }

  const course = courseOverride || (typeof enrolment.courseId === 'object' && enrolment.courseId !== null
    ? enrolment.courseId
    : { _id: enrolment.courseId, title: enrolment.courseTitle, modules: enrolment.modules });

  const completedList = (enrolment.completedLessons || []).map(String);
  const rawModules = Array.isArray(course?.modules) ? course.modules : [];

  let totalRequiredItems = 0;
  let completedRequiredItems = 0;
  const modulesProgress = [];
  const allLessons = [];
  const validDoneLessons = new Set();

  rawModules.forEach((m) => {
    let modTotal = 0;
    let modDone = 0;
    const lessons = Array.isArray(m.lessons) ? m.lessons : [];

    lessons.forEach((l) => {
      allLessons.push(l);
      const items = Array.isArray(l.items) && l.items.length > 0
        ? l.items
        : (Array.isArray(l.contentItems) && l.contentItems.length > 0 ? l.contentItems : []);

      let lessonAllDone = false;
      if (items.length > 0) {
        let lessonItemsDone = 0;
        items.forEach((it) => {
          modTotal++;
          totalRequiredItems++;
          if (completedList.includes(String(it._id))) {
            modDone++;
            completedRequiredItems++;
            lessonItemsDone++;
          }
        });
        lessonAllDone = (lessonItemsDone === items.length);
      } else {
        modTotal++;
        totalRequiredItems++;
        if (completedList.includes(String(l._id))) {
          modDone++;
          completedRequiredItems++;
          lessonAllDone = true;
        }
      }

      if (lessonAllDone) {
        validDoneLessons.add(allLessons.length - 1);
      }
    });

    const modPct = modTotal > 0 ? Math.round((modDone / modTotal) * 100) : 100;
    modulesProgress.push({
      _id: m._id,
      title: m.title,
      totalItems: modTotal,
      completedItems: modDone,
      progressPercentage: modPct,
      isCompleted: modTotal > 0 && modDone >= modTotal
    });
  });

  // Calculate course progress percentage:
  // Course Progress = (Number of completed required content items / Total required content items) * 100
  let progressPct = 0;
  if (totalRequiredItems > 0) {
    if (completedRequiredItems >= totalRequiredItems) {
      progressPct = 100;
    } else if (completedRequiredItems > 0) {
      // e.g. 8 of 9 items: 8 / 9 * 100 = 88.89% -> 89%
      progressPct = Math.min(Math.round((completedRequiredItems / totalRequiredItems) * 100), 99);
    } else {
      progressPct = 0;
    }
  } else {
    // If course curriculum details are not populated in this enrolment object,
    // fallback to authoritative backend values
    const backendPct = Number(enrolment.progressPercentage) || 0;
    const isBackendCompleted = (enrolment.status === 'completed' || enrolment.status === 'COMPLETED') && backendPct === 100;
    progressPct = isBackendCompleted ? 100 : Math.min(backendPct, 99);
  }

  // Strict classification rule:
  // 0% -> Not Started
  // >0% and <100% -> Enrolled / In Progress
  // 100% -> Completed
  let category = 'not_started';
  if (progressPct >= 100) {
    category = 'completed';
  } else if (progressPct > 0) {
    category = 'enrolled'; // 'enrolled' tab represents In Progress
  } else {
    category = 'not_started';
  }

  const isCompleted = progressPct === 100;

  return {
    course,
    progressPct,
    category,
    status: isCompleted ? 'completed' : (progressPct > 0 ? 'in_progress' : 'not_started'),
    isCompleted,
    completedRequiredItems,
    totalRequiredItems: Math.max(totalRequiredItems, 1),
    completedCount: completedRequiredItems,
    totalLessons: Math.max(totalRequiredItems, 1),
    lessons: allLessons,
    validDone: validDoneLessons,
    modulesProgress
  };
};

export default calculateCourseProgress;
