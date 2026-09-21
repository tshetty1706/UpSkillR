import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getEffectiveThumbnail } from '../../utils/thumbnailUtils';

/**
 * Reusable CourseThumbnail component that automatically resolves
 * custom uploaded thumbnails vs theme-appropriate defaults (light/dark).
 */
export const CourseThumbnail = ({
  src,
  alt = 'Course Thumbnail',
  className = '',
  style = {},
  onClick,
  ...props
}) => {
  const { isDarkMode } = useTheme();
  const effectiveSrc = getEffectiveThumbnail(src, isDarkMode);

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
      onError={(e) => {
        // Fallback to default theme thumbnail if image fails
        const fallback = getEffectiveThumbnail('', isDarkMode);
        if (e.currentTarget.src !== fallback) {
          e.currentTarget.src = fallback;
        }
      }}
      {...props}
    />
  );
};

export default CourseThumbnail;
