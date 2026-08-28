const Learner = require('./Learner');
const Instructor = require('./Instructor');

/**
 * Helper to search for a user across both 'learners' and 'instructors' collections by email.
 * @param {string} email 
 * @returns {Promise<{ user: Object, role: string, model: Object } | null>}
 */
const findUserByEmail = async (email) => {
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();

  const learner = await Learner.findOne({ email: normalizedEmail });
  if (learner) {
    return { user: learner, role: 'learner', model: Learner };
  }

  const instructor = await Instructor.findOne({ email: normalizedEmail });
  if (instructor) {
    return { user: instructor, role: 'instructor', model: Instructor };
  }

const Learner = mongoose.model('Learner', userSchema, 'learner');
const Instructor = mongoose.model('Instructor', userSchema, 'instructor');

module.exports = {
  Learner,
  Instructor
};
