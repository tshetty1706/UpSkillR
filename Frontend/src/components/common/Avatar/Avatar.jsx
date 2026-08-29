import React, { useState, useEffect } from 'react';
import './Avatar.css';

/**
 * Reusable Avatar component for UpSkillr.
 * Displays user's uploaded avatar image if present and valid; otherwise,
 * falls back to the dynamic, styled name initial.
 *
 * @param {Object} props
 * @param {string} props.image - The avatar URL path (local uploads or OAuth external URLs)
 * @param {string} props.name - The user's name for generating initials
 * @param {('small'|'medium'|'large')} [props.size='medium'] - Standardized sizes
 * @param {string} [props.className=''] - Additional custom CSS classes
 * @param {Object} [props.style={}] - Inline style overrides
 */
export const Avatar = ({ image, name, size = 'medium', className = '', style = {} }) => {
  const [imageFailed, setImageFailed] = useState(false);

  // Reset image error state if the image source path changes
  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  // Extract the first meaningful letter of the user's name
  const getInitial = (userName) => {
    if (!userName || typeof userName !== 'string') return 'U';
    const trimmed = userName.trim();
    if (!trimmed) return 'U';
    return trimmed.charAt(0).toUpperCase();
  };

  // Convert relative upload paths to absolute backend URLs
  const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const backendUrl = 'http://localhost:5000';
    return `${backendUrl}${url}`;
  };

  const hasImage = image && !imageFailed;
  const initialLetter = getInitial(name);
  const fullImgUrl = getFullImageUrl(image);
  const accessibleAlt = name ? `${name}'s Profile Avatar` : 'User Profile Avatar';

  return (
    <div
      className={`avatar-container avatar-${size} ${className}`}
      style={style}
    >
      {hasImage ? (
        <img
          src={fullImgUrl}
          alt={accessibleAlt}
          className="avatar-image"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="avatar-initial" aria-label={accessibleAlt}>
          {initialLetter}
        </div>
      )}
    </div>
  );
};
