import lightThumbnail from '../assets/thumbnail/light_thumbnail.png';
import darkThumbnail from '../assets/thumbnail/dark_thumbnail.png';

// Session-level set of known broken/unreachable thumbnail URLs to eliminate repeated 404s and visual flashes
export const brokenImageCache = new Set();

/**
 * Checks whether a thumbnail is a valid custom uploaded thumbnail.
 * Returns false if thumbnail is empty, null, undefined, the obsolete unsplash placeholder,
 * or the default light/dark theme assets.
 */
export const isCustomThumbnail = (thumbnail) => {
  if (!thumbnail) return false;
  if (typeof thumbnail === 'object') {
    const candidate = thumbnail.light || thumbnail.dark || thumbnail.lightUrl || thumbnail.darkUrl || thumbnail.url || thumbnail.src;
    return isCustomThumbnail(candidate);
  }
  if (typeof thumbnail !== 'string') return false;
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
 * 1. If thumbnail is an object with light/dark variants, pick the matching theme variant.
 * 2. If valid custom uploaded thumbnail exists (and has not failed), returns it.
 * 3. If no custom thumbnail exists (or if it's default/placeholder/empty):
 *    - Light mode -> light_thumbnail.png
 *    - Dark mode  -> dark_thumbnail.png
 */
export const getEffectiveThumbnail = (thumbnail, isDarkMode = false) => {
  const defaultThemeThumb = isDarkMode ? darkThumbnail : lightThumbnail;

  if (!thumbnail) {
    return defaultThemeThumb;
  }

  // Handle object structure: { light: '...', dark: '...' } or { lightUrl: '...', darkUrl: '...' }
  if (typeof thumbnail === 'object') {
    const candidate = isDarkMode
      ? (thumbnail.dark || thumbnail.darkUrl || thumbnail.url || thumbnail.src)
      : (thumbnail.light || thumbnail.lightUrl || thumbnail.url || thumbnail.src);
    if (candidate && isCustomThumbnail(candidate) && !brokenImageCache.has(typeof candidate === 'string' ? candidate.trim() : candidate)) {
      return typeof candidate === 'string' ? candidate.trim() : candidate;
    }
    return defaultThemeThumb;
  }

  if (typeof thumbnail === 'string') {
    const trimmed = thumbnail.trim();
    if (isCustomThumbnail(trimmed) && !brokenImageCache.has(trimmed)) {
      return trimmed;
    }
  }

  return defaultThemeThumb;
};

export { lightThumbnail, darkThumbnail };

