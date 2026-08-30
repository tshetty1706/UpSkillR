# 🤝 UpSkillr Learner Dashboard - Equal 50/50 Work Split Plan

Branch: `learner-dashboard`

This document details an equal split of the Learner Dashboard Functional Requirements (**FR-05** to **FR-09**) across **Developer 1** and **Developer 2**.

---

## 📌 Work Split Overview

| Developer | Assigned FRs | Primary Scope | Core Responsibilities |
|---|---|---|---|
| **Developer 1** | **FR-05 & FR-06** | **Course Discovery & Single-Click Enrolment** | Course Catalog Browsing, Search & Category Filters, Single-Action 1-Click Enrolment UI & API. |
| **Developer 2** | **FR-07, FR-08 & FR-09** | **Progress Tracking & Course Rating** | Dashboard Progress Stat Cards, Lesson Completion Checklist, Progress Bars, Rate & Review Modal & Rating API. |

---

## 🛠️ Developer 1 (Person A) - Detailed Scope

### Functional Requirements:
- **FR-05**: Allow learners to browse available courses.
- **FR-06**: Allow learners to enrol in a course through a single action.

### 💻 Frontend Tasks ([LearnerDashboardOverview.jsx](file:///c:/UpSkillR/Frontend/src/components/learner/dashboard/LearnerDashboardOverview/LearnerDashboardOverview.jsx)):
1. **Catalog Search & Filter Toolbar**:
   - Implement live title/description/instructor search input.
   - Implement category filter pills (*All, Web Development, Data Science, Design, AI & ML, Business*).
   - Implement skill level filter dropdown (*Beginner, Intermediate, Advanced, All Levels*).
2. **Available Course Cards Grid**:
   - Render published course cards with thumbnail, title, description, level badge, price, star rating, and learner count.
3. **Single-Action Enrolment Action**:
   - Add 1-Click **"Enroll"** button on un-enrolled course cards.
   - Connect button to `POST /api/courses/enrol` with immediate optimistic UI state update to *"Enrolled — Go to Course"*.
   - Trigger floating toast notification upon enrolment.

### ⚙️ Backend Tasks ([courseController.js](file:///c:/UpSkillR/Backend/controller/courseController.js) & [courseRoutes.js](file:///c:/UpSkillR/Backend/routes/courseRoutes.js)):
1. `GET /api/courses/published`: Ensure support for search query params (`?search=`, `?category=`, `?level=`).
2. `POST /api/courses/enrol`: Handle single-action enrolment, prevent duplicate enrolments, and save student name/email to MongoDB `enrolments` collection.

---

## 🛠️ Developer 2 (Person B) - Detailed Scope

### Functional Requirements:
- **FR-07**: Track lesson completion and overall course progress.
- **FR-08**: Present progress and course completion status on dashboard.
- **FR-09**: Allow learners to rate completed courses and submit feedback.

### 💻 Frontend Tasks ([LearnerDashboardOverview.jsx](file:///c:/UpSkillR/Frontend/src/components/learner/dashboard/LearnerDashboardOverview/LearnerDashboardOverview.jsx) & [CourseRatingModal.jsx](file:///c:/UpSkillR/Frontend/src/components/learner/dashboard/LearnerDashboardOverview/CourseRatingModal.jsx)):
1. **Dashboard Overview Stat Cards**:
   - Render 4 summary stat widgets (*Enrolled Courses*, *In Progress*, *Completed Courses*, *Lessons Completed*).
2. **Enrolled Course Cards & Progress Bar**:
   - Display animated overall progress bar (0-100%).
   - Render dynamic status badges (*"In Progress"* vs *"Completed"*).
3. **Interactive Lesson Checklist Drawer**:
   - Build expandable lesson list accordion with duration badges and interactive *"Mark Complete"* checkmarks.
   - Connect to `POST /api/courses/progress` to recalculate progress % in real time.
4. **Course Rating & Feedback Modal**:
   - Unlock *"Rate & Review"* button when progress reaches 100%.
   - Implement `CourseRatingModal` (1-5 star picker, highlight strength tags, feedback text box).
   - Display submitted star rating and review quote on completed course cards.

### ⚙️ Backend Tasks ([Enrolment.js](file:///c:/UpSkillR/Backend/model/Enrolment.js), [courseController.js](file:///c:/UpSkillR/Backend/controller/courseController.js) & [courseRoutes.js](file:///c:/UpSkillR/Backend/routes/courseRoutes.js)):
1. `GET /api/courses/learner/my-enrolments`: Return enrolled courses with populated course details, lesson completion array, and progress %.
2. `POST /api/courses/progress`: Update completed lesson indices array and recompute progress %.
3. `POST /api/courses/rate`: Add schema fields to `Enrolment` model (`rating`, `feedback`, `feedbackTags`, `ratedAt`), save feedback, and recalculate course average rating on `Course` model.

---

## 🔄 Recommended Git Collaboration Workflow

Since both developers are working on the `learner-dashboard` branch:
1. **Pull Before Starting**: Always run `git pull origin learner-dashboard` before starting your work.
2. **Focused Commits**:
   - Developer 1 commit message format: `feat(learner-catalog): add search filters and 1-click enrolment`
   - Developer 2 commit message format: `feat(learner-progress): add lesson completion tracking and course rating modal`
3. **Conflict Prevention**: Developer 1 focuses primarily on the **Catalog/Browse View & Enrolment** sections of `LearnerDashboardOverview.jsx`, while Developer 2 focuses on **My Enrolled Courses, Stat Cards, Lesson Accordion & Rating Modal**.
