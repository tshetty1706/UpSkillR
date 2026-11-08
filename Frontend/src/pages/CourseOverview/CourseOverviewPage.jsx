import React from 'react';
import { CourseLearningPage } from '../CourseLearning/CourseLearningPage';

/**
 * CourseOverviewPage
 * Authoritative course overview page component.
 * Directly renders the redesigned CourseLearningPage to eliminate any legacy UI flashing.
 */
export const CourseOverviewPage = ({ courseId, user = null }) => {
  return <CourseLearningPage courseId={courseId} user={user} />;
};

export default CourseOverviewPage;
