const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { getCloudinaryConfig } = require('../controller/mediaController');

const FOLDER = 'upskillr/achievements/badges';
const CONFIG_FILE = path.join(__dirname, '../config/badgeCloudinaryUrls.json');

const BADGES = [
  {
    publicId: 'knowledge-seeker-normal',
    tier: 'normal',
    category: 'course_completion',
    localFile: path.join(__dirname, '../assets/badges/knowledge-seeker-normal.png'),
    fallbackFile: '/assets/badges/knowledge-seeker-normal.png'
  },
  {
    publicId: 'perfectionist-normal',
    tier: 'normal',
    category: 'quiz_excellence',
    localFile: path.join(__dirname, '../assets/badges/perfectionist-normal.png'),
    fallbackFile: '/assets/badges/perfectionist-normal.png'
  }
];

/**
 * Upload badge image to Cloudinary idempotently.
 * Returns { publicId, secureUrl, format, bytes }
 */
async function uploadBadgeToCloudinary(badge) {
  const config = getCloudinaryConfig();
  const cloudName = config.cloudName || 'dudqnkdte';
  const defaultSecureUrl = `https://res.cloudinary.com/${cloudName}/image/upload/v1/${FOLDER}/${badge.publicId}.png`;

  if (!fs.existsSync(badge.localFile)) {
    console.warn(`Badge file not found at ${badge.localFile}`);
    return {
      publicId: badge.publicId,
      secureUrl: defaultSecureUrl,
      fallbackUrl: badge.fallbackFile,
      isUploaded: false
    };
  }

  // If credentials are incomplete or disabled, use canonical Cloudinary URL with fallback
  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    return {
      publicId: badge.publicId,
      secureUrl: defaultSecureUrl,
      fallbackUrl: badge.fallbackFile,
      isUploaded: false
    };
  }

  try {
    const fileBuffer = fs.readFileSync(badge.localFile);
    const base64Data = `data:image/png;base64,${fileBuffer.toString('base64')}`;
    const timestamp = Math.round(new Date().getTime() / 1000);

    const paramsToSign = `folder=${FOLDER}&overwrite=false&public_id=${badge.publicId}&timestamp=${timestamp}${config.apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    const params = new URLSearchParams();
    params.append('file', base64Data);
    params.append('api_key', config.apiKey);
    params.append('timestamp', timestamp.toString());
    params.append('signature', signature);
    params.append('folder', FOLDER);
    params.append('public_id', badge.publicId);
    params.append('overwrite', 'false');

    const res = await axios.post(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 45000
      }
    );

    if (res.data?.secure_url) {
      return {
        publicId: res.data.public_id || badge.publicId,
        secureUrl: res.data.secure_url,
        fallbackUrl: badge.fallbackFile,
        isUploaded: true
      };
    }
  } catch (err) {
    // Cloudinary upload non-fatal fallback
    console.warn(`Cloudinary upload warning for ${badge.publicId}:`, err.response?.data?.error?.message || err.message);
  }

  return {
    publicId: badge.publicId,
    secureUrl: defaultSecureUrl,
    fallbackUrl: badge.fallbackFile,
    isUploaded: false
  };
}

/**
 * Ensures all Normal badge images are registered with Cloudinary URLs.
 */
async function ensureBadgesUploadedToCloudinary() {
  const results = {};
  for (const badge of BADGES) {
    const res = await uploadBadgeToCloudinary(badge);
    results[badge.publicId] = res;
  }

  try {
    const configDir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(results, null, 2), 'utf8');
  } catch (e) {
    console.warn('Could not write badgeCloudinaryUrls.json cache:', e.message);
  }

  return results;
}

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  ensureBadgesUploadedToCloudinary().then((res) => {
    console.log('Badge Cloudinary sync completed:', JSON.stringify(res, null, 2));
    process.exit(0);
  }).catch((err) => {
    console.error('Badge Cloudinary sync error:', err);
    process.exit(1);
  });
}

module.exports = {
  ensureBadgesUploadedToCloudinary,
  uploadBadgeToCloudinary,
  BADGES
};
