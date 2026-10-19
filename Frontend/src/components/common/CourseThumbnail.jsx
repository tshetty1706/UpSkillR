import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  getEffectiveThumbnail,
  isCustomThumbnail,
  brokenImageCache,
  lightThumbnail,
  darkThumbnail
} from '../../utils/thumbnailUtils';

/**
 * Reusable CourseThumbnail component that automatically resolves
 * custom uploaded thumbnails vs theme-appropriate defaults (light/dark).
 * Guarantees synchronous theme updates across all course cards without
 * retaining stale theme variants.
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
  const trimmedSrc = typeof src === 'string' ? src.trim() : src;
  const isCustom = isCustomThumbnail(trimmedSrc);
  const isKnownBroken = typeof trimmedSrc === 'string' && brokenImageCache.has(trimmedSrc);

  const [hasError, setHasError] = useState(isKnownBroken);

  // When src changes, sync error state with cache
  useEffect(() => {
    const broken = typeof trimmedSrc === 'string' && brokenImageCache.has(trimmedSrc);
    setHasError(broken);
  }, [trimmedSrc]);

  // Determine active theme default thumbnail
  const defaultThumbnail = isDarkMode ? darkThumbnail : lightThumbnail;

  // If not custom OR if custom image failed to load, strictly use active theme default thumbnail
  const effectiveSrc = (!isCustom || hasError)
    ? defaultThumbnail
    : getEffectiveThumbnail(trimmedSrc, isDarkMode);

  const handleError = () => {
    if (!hasError && isCustom && typeof trimmedSrc === 'string') {
      brokenImageCache.add(trimmedSrc);
      setHasError(true);
    }
  };

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
      onError={handleError}
      loading="lazy"
      {...props}
    />
  );
};

export default CourseThumbnail;

