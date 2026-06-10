/**
 * Profile routes — routes/profile.js
 * Uses Firestore instead of MongoDB
 */

const express = require('express');
const router  = express.Router();
const { auth } = require('../middleware/auth');
const { getUserProfile } = require('../services/firebaseAdmin');

// ── GET /api/profile ───────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const profileData = await getUserProfile(req.userId);

    if (!profileData) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    res.json({
      success: true,
      profile: {
        user: {
          id:        profileData.user.uid || profileData.user.id,
          name:      profileData.user.name,
          email:     profileData.user.email,
          photoURL:  profileData.user.photoURL || null,
          provider:  profileData.user.provider || 'email',
          createdAt: profileData.user.createdAt,
          lastActive:profileData.user.lastActive
        },
        stats:          profileData.stats,
        latestAnalysis: profileData.latestAnalysis
      }
    });
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({ error: 'Could not fetch profile.' });
  }
});

module.exports = router;
