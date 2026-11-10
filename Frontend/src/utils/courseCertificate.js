/**
 * Resolves whether a course offers a completion certificate based strictly on the
 * instructor's course configuration from the backend.
 * Never infers certificate availability from completion status or progress.
 *
 * @param {Object|null} course
 * @param {Object|null} [overview]
 * @returns {boolean}
 */
export const isCourseCertificateEnabled = (course, overview = null) => {
  if (course && typeof course === 'object') {
    if (
      course.certificate === true ||
      course.certificateSettings?.enabled === true ||
      course.certificatesEnabled === true
    ) {
      return true;
    }
    if (
      course.certificate === false ||
      course.certificateSettings?.enabled === false ||
      course.certificatesEnabled === false
    ) {
      return false;
    }
  }

  if (overview && typeof overview === 'object' && typeof overview.certificate === 'boolean') {
    return overview.certificate;
  }

  return false;
};
