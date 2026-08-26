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

  return null;
};

/**
 * Helper to find a user by ID and role, or fallback to searching both collections if role is omitted.
 * @param {string} id 
 * @param {string} [role] 
 * @returns {Promise<Object|null>}
 */
const findUserById = async (id, role) => {
  if (!id) return null;

  if (role === 'instructor') {
    return await Instructor.findById(id);
  }
  if (role === 'learner') {
    return await Learner.findById(id);
  }

  const learner = await Learner.findById(id);
  if (learner) return learner;

  return await Instructor.findById(id);
};

module.exports = {
  Learner,
  Instructor,
  findUserByEmail,
  findUserById
};
