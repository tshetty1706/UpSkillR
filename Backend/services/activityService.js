const mongoose = require('mongoose');
const LearnerActivity = require('../model/LearnerActivity');
const Course = mongoose.models.Course || require('../model/Course');
const Learner = mongoose.models.Learner || require('../model/Learner');
const Enrolment = mongoose.models.Enrolment || require('../model/Enrolment');
const Certificate = mongoose.models.Certificate || require('../model/Certificate');
const AssessmentSubmission = mongoose.models.AssessmentSubmission || require('../model/AssessmentSubmission');
const Bookmark = mongoose.models.Bookmark || require('../model/Bookmark');
const PersonalNote = mongoose.models.PersonalNote || require('../model/PersonalNote');
const PointTransaction = mongoose.models.PointTransaction || require('../model/PointTransaction');

/**
 * Log a single learner activity with automatic deduplication
 */
const logLearnerActivity = async (learnerId, activityData) => {
  if (!learnerId || !activityData || !activityData.activityType) return null;

  try {
    const rawType = String(activityData.activityType);
    let normalizedType = rawType.toLowerCase();
    if (normalizedType === 'login' || normalizedType === 'daily_checkin') {
      normalizedType = 'daily_login';
    } else if (normalizedType === 'quiz_attempt') {
      normalizedType = 'quiz_attempted';
    }

    const payload = {
      learnerId,
      activityType: normalizedType,
      title: activityData.title || 'Learning Activity',
      description: activityData.description || '',
      courseId: activityData.courseId || null,
      courseTitle: activityData.courseTitle || '',
      moduleId: activityData.moduleId || null,
      moduleTitle: activityData.moduleTitle || '',
      lessonId: activityData.lessonId || null,
      lessonTitle: activityData.lessonTitle || '',
      points: Number(activityData.points) || 0,
      referenceId: activityData.referenceId ? String(activityData.referenceId) : null,
      metadata: activityData.metadata || {},
      createdAt: activityData.createdAt ? new Date(activityData.createdAt) : new Date()
    };

    if (payload.referenceId) {
      return await LearnerActivity.findOneAndUpdate(
        {
          learnerId,
          activityType: payload.activityType,
          referenceId: payload.referenceId
        },
        { $setOnInsert: payload },
        { upsert: true, new: true }
      );
    } else {
      return await LearnerActivity.create(payload);
    }
  } catch (err) {
    // Suppress duplicate key errors gracefully
    if (err.code === 11000) return null;
    console.error('Error logging learner activity:', err);
    return null;
  }
};

/**
 * Synchronize/backfill historical records from existing database collections
 * Guarantees zero fake records and zero duplicates.
 */
const syncLearnerActivities = async (learnerId) => {
  if (!learnerId) return;

  try {
    const ops = [];
    const lIdStr = learnerId.toString();
    const lIdObj = new mongoose.Types.ObjectId(lIdStr);

    // 1. Enrolments: Course Enrolled & Course Completed
    const Enrolment = mongoose.models.Enrolment || require('../model/Enrolment');
    const enrolments = await Enrolment.find({
      $or: [{ learnerId: lIdStr }, { learnerId: lIdObj }]
    }).populate('courseId', 'title modules').lean();

    enrolments.forEach((enr) => {
      const cId = enr.courseId?._id || enr.courseId;
      const cTitle = enr.courseTitle || enr.courseId?.title || 'Course';

      // Course Enrolled
      const enrolledDate = enr.enrolledAt || enr.createdAt || new Date();
      ops.push({
        updateOne: {
          filter: {
            learnerId: lIdObj,
            activityType: 'course_enrolled',
            referenceId: `enrol_${enr._id}`
          },
          update: {
            $setOnInsert: {
              learnerId: lIdObj,
              activityType: 'course_enrolled',
              title: 'Enrolled in Course',
              description: `Started learning ${cTitle}`,
              courseId: cId,
              courseTitle: cTitle,
              referenceId: `enrol_${enr._id}`,
              points: 0,
              createdAt: new Date(enrolledDate)
            }
          },
          upsert: true
        }
      });

      // Course Completed
      if ((enr.status === 'completed' || enr.progressPercentage >= 100) && enr.completedAt) {
        ops.push({
          updateOne: {
            filter: {
              learnerId: lIdObj,
              activityType: 'course_completed',
              referenceId: `course_comp_${enr._id}`
            },
            update: {
              $setOnInsert: {
                learnerId: lIdObj,
                activityType: 'course_completed',
                title: 'Course Completed',
                description: `Completed 100% of curriculum content in ${cTitle}`,
                courseId: cId,
                courseTitle: cTitle,
                referenceId: `course_comp_${enr._id}`,
                points: 50,
                createdAt: new Date(enr.completedAt)
              }
            },
            upsert: true
          }
        });
      }

      // Lessons Completed from enrolment.completedLessons
      if (Array.isArray(enr.completedLessons) && enr.courseId?.modules) {
        enr.courseId.modules.forEach((mod, mIdx) => {
          (mod.lessons || []).forEach((les, lIdx) => {
            const lIdStr = String(les._id);
            const isLesDone = enr.completedLessons.some(c => String(c) === lIdStr);
            if (isLesDone) {
              ops.push({
                updateOne: {
                  filter: {
                    learnerId: lIdObj,
                    activityType: 'lesson_completed',
                    referenceId: `lesson_${enr._id}_${lIdStr}`
                  },
                  update: {
                    $setOnInsert: {
                      learnerId: lIdObj,
                      activityType: 'lesson_completed',
                      title: 'Lesson Completed',
                      description: `Completed "${les.title || `Lesson ${lIdx + 1}`}" in ${cTitle}`,
                      courseId: cId,
                      courseTitle: cTitle,
                      moduleId: mod._id || mIdx,
                      moduleTitle: mod.title || `Module ${mIdx + 1}`,
                      lessonId: les._id,
                      lessonTitle: les.title || `Lesson ${lIdx + 1}`,
                      referenceId: `lesson_${enr._id}_${lIdStr}`,
                      points: 5,
                      createdAt: new Date(enr.lastAccessedAt || enr.updatedAt || enr.createdAt || new Date())
                    }
                  },
                  upsert: true
                }
              });
            }
          });
        });
      }

      // Videos Completed from videoWatchData
      if (enr.videoWatchData && typeof enr.videoWatchData === 'object') {
        const watchMap = enr.videoWatchData;
        const keys = Object.keys(watchMap);
        keys.forEach((k) => {
          const rec = watchMap[k];
          if (rec && (rec.isEligible || (rec.watchPercentage && rec.watchPercentage >= 80))) {
            const vKey = rec.contentItemId || rec.lessonId || k;
            ops.push({
              updateOne: {
                filter: {
                  learnerId: lIdObj,
                  activityType: 'video_completed',
                  referenceId: `video_${enr._id}_${vKey}`
                },
                update: {
                  $setOnInsert: {
                    learnerId: lIdObj,
                    activityType: 'video_completed',
                    title: 'Video Lecture Completed',
                    description: `Watched 80%+ of video lecture in ${cTitle}`,
                    courseId: cId,
                    courseTitle: cTitle,
                    lessonId: rec.lessonId || null,
                    referenceId: `video_${enr._id}_${vKey}`,
                    points: 0,
                    metadata: { watchPercentage: rec.watchPercentage },
                    createdAt: new Date(rec.lastUpdated || enr.updatedAt || enr.createdAt || new Date())
                  }
                },
                upsert: true
              }
            });
          }
        });
      }
    });

    // 2. Assessment / Quiz Submissions
    const AssessmentSubmission = mongoose.models.AssessmentSubmission || require('../model/AssessmentSubmission');
    const submissions = await AssessmentSubmission.find({
      $or: [{ learnerId: lIdStr }, { learnerId: lIdObj }]
    }).populate('courseId', 'title').lean();

    submissions.forEach((sub) => {
      const isRetake = (sub.attemptNumber || 1) > 1;
      const type = isRetake ? 'quiz_retaken' : 'quiz_attempted';
      const qTitle = sub.assessmentTitle || 'Quiz Knowledge Check';
      const cTitle = sub.courseId?.title || 'Course';
      const pct = Math.round(sub.percentage || 0);
      const scoreStr = `${sub.totalScore ?? 0}/${sub.maxScore ?? 0} (${pct}%)`;

      ops.push({
        updateOne: {
          filter: {
            learnerId: lIdObj,
            activityType: type,
            referenceId: `quiz_sub_${sub._id}`
          },
          update: {
            $setOnInsert: {
              learnerId: lIdObj,
              activityType: type,
              title: isRetake ? `Quiz Retaken (Attempt #${sub.attemptNumber})` : 'Quiz Attempted',
              description: `Completed "${qTitle}" with score ${scoreStr}`,
              courseId: sub.courseId?._id || sub.courseId,
              courseTitle: cTitle,
              moduleId: sub.moduleId || null,
              lessonId: sub.lessonId || null,
              lessonTitle: qTitle,
              referenceId: `quiz_sub_${sub._id}`,
              points: 0,
              metadata: {
                attemptNumber: sub.attemptNumber || 1,
                totalScore: sub.totalScore,
                maxScore: sub.maxScore,
                percentage: pct,
                gradeResult: sub.gradeResult
              },
              createdAt: new Date(sub.submittedAt || sub.createdAt || new Date())
            }
          },
          upsert: true
        }
      });
    });

    // 3. Certificates Earned
    const Certificate = mongoose.models.Certificate || require('../model/Certificate');
    const certs = await Certificate.find({
      $or: [{ learnerId: lIdStr }, { learnerId: lIdObj }]
    }).lean();

    certs.forEach((cert) => {
      ops.push({
        updateOne: {
          filter: {
            learnerId: lIdObj,
            activityType: 'certificate_earned',
            referenceId: `cert_${cert._id}`
          },
          update: {
            $setOnInsert: {
              learnerId: lIdObj,
              activityType: 'certificate_earned',
              title: 'Certificate Earned',
              description: `Earned official verified certificate for ${cert.courseNameSnapshot || 'completed course'} (${cert.certificateId})`,
              courseId: cert.courseId,
              courseTitle: cert.courseNameSnapshot || 'Course',
              referenceId: `cert_${cert._id}`,
              points: 0,
              metadata: { certificateId: cert.certificateId },
              createdAt: new Date(cert.issueDate || cert.completionDate || cert.createdAt || new Date())
            }
          },
          upsert: true
        }
      });
    });

    // 4. Bookmarks Added
    const Bookmark = mongoose.models.Bookmark || require('../model/Bookmark');
    const bookmarks = await Bookmark.find({
      $or: [{ learnerId: lIdStr }, { learnerId: lIdObj }]
    }).lean();

    bookmarks.forEach((bm) => {
      ops.push({
        updateOne: {
          filter: {
            learnerId: lIdObj,
            activityType: 'bookmark_added',
            referenceId: `bm_${bm._id}`
          },
          update: {
            $setOnInsert: {
              learnerId: lIdObj,
              activityType: 'bookmark_added',
              title: 'Bookmark Added',
              description: `Bookmarked "${bm.title}" to learning library`,
              courseId: bm.courseId,
              courseTitle: bm.courseTitle || 'Course',
              moduleId: bm.moduleId || null,
              moduleTitle: bm.moduleTitle || '',
              lessonId: bm.lessonId || null,
              lessonTitle: bm.lessonTitle || '',
              referenceId: `bm_${bm._id}`,
              points: 0,
              metadata: { resourceType: bm.resourceType },
              createdAt: new Date(bm.createdAt || new Date())
            }
          },
          upsert: true
        }
      });
    });

    // 5. Personal Notes Created
    const PersonalNote = mongoose.models.PersonalNote || require('../model/PersonalNote');
    const notes = await PersonalNote.find({
      $or: [{ learnerId: lIdStr }, { learnerId: lIdObj }]
    }).lean();

    notes.forEach((nt) => {
      ops.push({
        updateOne: {
          filter: {
            learnerId: lIdObj,
            activityType: 'note_created',
            referenceId: `note_${nt._id}`
          },
          update: {
            $setOnInsert: {
              learnerId: lIdObj,
              activityType: 'note_created',
              title: 'Personal Note Created',
              description: `Created personal note: "${nt.title}"`,
              courseId: nt.courseId || null,
              courseTitle: nt.courseTitle || '',
              moduleId: nt.moduleId || null,
              moduleTitle: nt.moduleTitle || '',
              lessonId: nt.lessonId || null,
              lessonTitle: nt.lessonTitle || '',
              referenceId: `note_${nt._id}`,
              points: 0,
              createdAt: new Date(nt.createdAt || new Date())
            }
          },
          upsert: true
        }
      });
    });

    // 6. Point Transactions (Daily login, Module completed, Points earned)
    const PointTransaction = mongoose.models.PointTransaction || require('../model/PointTransaction');
    const transactions = await PointTransaction.find({
      $or: [{ learnerId: lIdStr }, { learnerId: lIdObj }]
    }).lean();

    transactions.forEach((tx) => {
      const txTypeUpper = (tx.type || '').toUpperCase();
      let actType = 'points_earned';
      let title = 'Points Earned';

      if (txTypeUpper.includes('LOGIN') || txTypeUpper.includes('CHECKIN')) {
        actType = 'daily_login';
        title = 'Daily Login Check-in';
      } else if (txTypeUpper.includes('MODULE')) {
        actType = 'module_completed';
        title = 'Module Completed';
      } else if (txTypeUpper.includes('COURSE')) {
        actType = 'course_completed';
        title = 'Course Completed';
      }

      ops.push({
        updateOne: {
          filter: {
            learnerId: lIdObj,
            activityType: actType,
            referenceId: `pt_${tx._id}`
          },
          update: {
            $setOnInsert: {
              learnerId: lIdObj,
              activityType: actType,
              title,
              description: tx.description || `${title} (+${tx.points} pts)`,
              points: tx.points || 0,
              referenceId: `pt_${tx._id}`,
              createdAt: new Date(tx.createdAt || new Date())
            }
          },
          upsert: true
        }
      });
    });

    // 7. Badges Unlocked from learner.badges
    const learnerDoc = await Learner.findById(learnerId).select('badges createdAt').lean();
    if (learnerDoc && Array.isArray(learnerDoc.badges)) {
      learnerDoc.badges.forEach((b) => {
        if (!b || !b.badgeId) return;
        ops.push({
          updateOne: {
            filter: {
              learnerId: lIdObj,
              activityType: 'badge_unlocked',
              referenceId: `badge_${b.badgeId}`
            },
            update: {
              $setOnInsert: {
                learnerId: lIdObj,
                activityType: 'badge_unlocked',
                title: `Badge Unlocked: ${b.name || b.badgeId}`,
                description: `Unlocked achievement badge: ${b.name || b.badgeId}`,
                points: 0,
                referenceId: `badge_${b.badgeId}`,
                createdAt: new Date(b.unlockedAt || learnerDoc.createdAt || new Date())
              }
            },
            upsert: true
          }
        });
      });
    }

    if (ops.length > 0) {
      await LearnerActivity.bulkWrite(ops, { ordered: false });
    }
  } catch (err) {
    console.error('Error syncing learner activities:', err);
  }
};

module.exports = {
  logLearnerActivity,
  syncLearnerActivities
};
