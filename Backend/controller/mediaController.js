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

exports.getCloudinaryConfig = getCloudinaryConfig;

/**
 * Upload a memory buffer directly to Cloudinary without touching local disk
 */
exports.uploadBufferToCloudinary = async (fileBuffer, mimetype, originalname = 'file', folder = 'upskillr_uploads') => {
  const config = getCloudinaryConfig();
  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    throw new Error('Cloudinary credentials are not configured on the server. Please check CLOUDINARY_URL in .env.');
  }

  const base64Data = `data:${mimetype};base64,${fileBuffer.toString('base64')}`;

  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${config.apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    const params = new URLSearchParams();
    params.append('file', base64Data);
    params.append('api_key', config.apiKey);
    params.append('timestamp', timestamp.toString());
    params.append('signature', signature);
    params.append('folder', folder);

    const uploadRes = await axios.post(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`,
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 60000
      }
    );

    if (!uploadRes.data || !uploadRes.data.secure_url) {
      throw new Error('Cloudinary did not return a valid secure_url');
    }

    return {
      public_id: uploadRes.data.public_id,
      secure_url: uploadRes.data.secure_url,
      format: uploadRes.data.format,
      bytes: uploadRes.data.bytes
    };
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.error('Cloudinary upload failure:', errMsg);
    throw new Error(`Cloudinary upload failed: ${errMsg}`);
  }
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
              mp4_support: 'capped-1080p'
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
 * GET /api/media/mux-upload/:uploadId
 * Check status of an upload and its underlying Mux asset
 */
exports.getMuxUploadStatus = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;

    if (!tokenId || !tokenSecret) {
      return res.json({
        success: true,
        status: 'ready',
        isMock: true,
        assetId: `mock_asset_${uploadId}`,
        playbackId: `mock_playback_${uploadId}`,
        duration: 0
      });
    }

    const uploadRes = await axios.get(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
      auth: { username: tokenId, password: tokenSecret },
      timeout: 8000
    });

    const uploadData = uploadRes.data?.data;
    if (!uploadData) {
      return res.status(404).json({ success: false, message: 'Upload not found on Mux.' });
    }

    if (uploadData.status === 'waiting') {
      return res.json({ success: true, status: 'waiting', uploadId });
    }

    if (uploadData.status === 'errored' || uploadData.status === 'timed_out') {
      return res.json({
        success: false,
        status: 'failed',
        message: uploadData.error?.message || `Mux upload ${uploadData.status}`
      });
    }

    // Asset created - fetch asset details
    const assetId = uploadData.asset_id;
    if (!assetId) {
      return res.json({ success: true, status: 'processing', uploadId });
    }

    const assetRes = await axios.get(`https://api.mux.com/video/v1/assets/${assetId}`, {
      auth: { username: tokenId, password: tokenSecret },
      timeout: 8000
    });

    const asset = assetRes.data?.data;
    if (!asset) {
      return res.json({ success: true, status: 'processing', assetId });
    }

    if (asset.status === 'ready') {
      const playbackId = asset.playback_ids?.[0]?.id || '';
      const duration = Math.round(asset.duration || 0);

      return res.json({
        success: true,
        status: 'ready',
        assetId: asset.id,
        playbackId,
        duration,
        videoUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : '',
        mp4Url: playbackId ? `https://stream.mux.com/${playbackId}/capped-1080p.mp4` : '',
        thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : ''
      });
    }

    if (asset.status === 'errored') {
      return res.json({
        success: false,
        status: 'failed',
        message: asset.errors?.messages?.[0] || 'Mux video processing error.'
      });
    }

    // Still preparing
    return res.json({
      success: true,
      status: 'processing',
      assetId: asset.id
    });
  } catch (err) {
    console.error('getMuxUploadStatus error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/media/mux-asset/:assetId
 * Query Mux asset directly for playback info and duration
 */
exports.getMuxAssetStatus = async (req, res) => {
  try {
    const { assetId } = req.params;
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;

    if (!tokenId || !tokenSecret || assetId.startsWith('mock_') || assetId.startsWith('mux_mock_')) {
      const fallbackPlaybackId = 'gcCV5qBVR2vH00WmPt9J7iAIkHS72htVUJTWUwakeThY';
      return res.json({
        success: true,
        status: 'ready',
        isMock: true,
        assetId,
        playbackId: fallbackPlaybackId,
        duration: 8,
        videoUrl: `https://stream.mux.com/${fallbackPlaybackId}.m3u8`,
        mp4Url: `https://stream.mux.com/${fallbackPlaybackId}/capped-1080p.mp4`,
        thumbnailUrl: `https://image.mux.com/${fallbackPlaybackId}/thumbnail.jpg`
      });
    }

    const assetRes = await axios.get(`https://api.mux.com/video/v1/assets/${assetId}`, {
      auth: { username: tokenId, password: tokenSecret },
      timeout: 8000
    });

    const asset = assetRes.data?.data;
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found on Mux.' });
    }

    const playbackId = asset.playback_ids?.[0]?.id || '';
    const duration = Math.round(asset.duration || 0);

    return res.json({
      success: true,
      status: asset.status,
      assetId: asset.id,
      playbackId,
      duration,
      videoUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : '',
      mp4Url: playbackId ? `https://stream.mux.com/${playbackId}/capped-1080p.mp4` : '',
      thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : ''
    });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ success: false, status: 'not_found', message: 'Asset not found on Mux.' });
    }
    console.error('getMuxAssetStatus error:', err.response?.data || err.message);
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
