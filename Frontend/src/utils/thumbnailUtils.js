import lightThumbnail from '../assets/thumbnail/light_thumbnail.png';
import darkThumbnail from '../assets/thumbnail/dark_thumbnail.png';

/**
 * Checks whether a thumbnail is a valid custom uploaded thumbnail.
 * Returns false if thumbnail is empty, null, undefined, or the obsolete unsplash placeholder.
 */
export const isCustomThumbnail = (thumbnail) => {
  if (!thumbnail || typeof thumbnail !== 'string') return false;
  const trimmed = thumbnail.trim();
  if (!trimmed) return false;
  // If it's the obsolete unsplash placeholder, treat as not a custom thumbnail
  if (trimmed.includes('photo-1516321318423-f06f85e504b3')) return false;
  // If it's the default light or dark theme thumbnail, treat as not a custom thumbnail
  if (trimmed.includes('light_thumbnail') || trimmed.includes('dark_thumbnail')) return false;
  if (trimmed === lightThumbnail || trimmed === darkThumbnail) return false;
  return true;
};

/**
 * Returns the effective thumbnail according to mandatory priority:
 * 1. Custom uploaded thumbnail (takes priority in both light & dark mode)
 * 2. If no custom thumbnail exists:
 *    - Light mode -> light_thumbnail.png
 *    - Dark mode  -> dark_thumbnail.png
 */
export const getEffectiveThumbnail = (thumbnail, isDarkMode = false) => {
  if (isCustomThumbnail(thumbnail)) {
    return thumbnail.trim();
  }
  return isDarkMode ? darkThumbnail : lightThumbnail;
};

export { lightThumbnail, darkThumbnail };
