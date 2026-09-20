const crypto = require('crypto');
const axios = require('axios');
const Course = require('../model/Course');

// Parse Cloudinary credentials from CLOUDINARY_URL or direct env vars
const getCloudinaryConfig = () => {
  if (process.env.CLOUDINARY_URL) {
    // Format: cloudinary://api_key:api_secret@cloud_name
    const regex = /^cloudinary:\/\/([^:]+):([^@]+)@([^/]+)/;
    const match = process.env.CLOUDINARY_URL.match(regex);
    if (match) {
      return {
        apiKey: match[1],
        apiSecret: match[2],
        cloudName: match[3]
      };
    }
  }
  return {
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || ''
  };
};

/**
 * POST /api/media/upload-credentials
 * Generate client-side direct upload signature/URL for Mux or Cloudinary
 */
exports.getUploadCredentials = async (req, res) => {
  try {
    const { type } = req.body; // 'video' | 'document' | 'image'

    if (type === 'video') {
      const tokenId = process.env.MUX_TOKEN_ID;
      const tokenSecret = process.env.MUX_TOKEN_SECRET;

      if (!tokenId || !tokenSecret) {
        // Mock fallback for development if credentials aren't set
        return res.json({
          success: true,
          provider: 'mux',
          isMock: true,
          uploadUrl: null,
          assetId: `mock_asset_${Date.now()}`,
          playbackId: `mock_playback_${Date.now()}`
        });
      }

      try {
        const response = await axios.post(
          'https://api.mux.com/video/v1/uploads',
          {
            new_asset_settings: {
              playback_policy: ['public'],
              mp4_support: 'standard'
            },
            cors_origin: '*'
          },
          {
            auth: {
              username: tokenId,
              password: tokenSecret
            },
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          }
        );

        const data = response.data?.data;
        return res.json({
          success: true,
          provider: 'mux',
          uploadUrl: data?.url,
          uploadId: data?.id,
          assetId: data?.asset_id || null
        });
      } catch (muxErr) {
        console.error('Mux Direct Upload Error:', muxErr.response?.data || muxErr.message);
        // Provide mock fallback so development workflow does not break
        return res.json({
          success: true,
          provider: 'mux',
          isMock: true,
          uploadUrl: null,
          assetId: `mock_asset_${Date.now()}`,
          playbackId: `mock_playback_${Date.now()}`,
          warning: 'Mux API call failed; returned development asset id.'
        });
      }
    } else {
      // Document / Image upload to Cloudinary
      const config = getCloudinaryConfig();
      if (!config.cloudName || !config.apiKey || !config.apiSecret) {
        return res.json({
          success: true,
          provider: 'cloudinary',
          isMock: true,
          uploadUrl: null,
          warning: 'Cloudinary configuration incomplete'
        });
      }

      const timestamp = Math.round(new Date().getTime() / 1000);
      const folder = 'upskillr_course_materials';
      const paramsToSign = `folder=${folder}&timestamp=${timestamp}${config.apiSecret}`;
      const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

      return res.json({
        success: true,
        provider: 'cloudinary',
        apiKey: config.apiKey,
        cloudName: config.cloudName,
        timestamp,
        folder,
        signature,
        uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`
      });
    }
  } catch (err) {
    console.error('getUploadCredentials error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/media/mux-webhook
 * Webhook handler for Mux events (video.asset.ready, etc.)
 */
exports.muxWebhook = async (req, res) => {
  try {
    const event = req.body;
    console.log('[MUX WEBHOOK]', event?.type);

    if (event?.type === 'video.asset.ready') {
      const assetId = event.data?.id;
      const playbackId = event.data?.playback_ids?.[0]?.id;
      const duration = event.data?.duration || 0;

      if (assetId && playbackId) {
        // Scan courses to update item video playbackId
        const courses = await Course.find({ 'modules.lessons.items.video.muxAssetId': assetId });
        for (const course of courses) {
          let updated = false;
          for (const mod of course.modules) {
            for (const lesson of mod.lessons) {
              for (const item of lesson.items) {
                if (item.video && item.video.muxAssetId === assetId) {
                  item.video.muxPlaybackId = playbackId;
                  item.video.duration = duration;
                  item.video.status = 'ready';
                  updated = true;
                }
              }
            }
          }
          if (updated) {
            await course.save();
          }
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('muxWebhook error:', err);
    res.status(500).json({ received: false, error: err.message });
  }
};
