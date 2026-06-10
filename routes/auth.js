/**
 * Auth routes — routes/auth.js
 *
 * With Firebase, actual sign-up/sign-in happens CLIENT-SIDE via the Firebase JS SDK.
 * The backend only needs:
 *  - GET /api/auth/me        — return the current user's Firestore profile
 *  - POST /api/auth/profile  — update display name / other editable fields
 *  - GET /api/auth/google-status — tell frontend whether Google auth is configured
 */

const express = require('express');
const router  = express.Router();
const { auth }             = require('../middleware/auth');
const { db, getOrCreateUser } = require('../services/firebaseAdmin');
const { admin }            = require('../services/firebaseAdmin');

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', auth, (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    user: {
      id:              u.uid || u.id,
      name:            u.name,
      email:           u.email,
      photoURL:        u.photoURL || null,
      provider:        u.provider || 'email',
      totalAnalyses:   u.totalAnalyses   || 0,
      bestShadowScore: u.bestShadowScore  || 0,
      createdAt:       u.createdAt
    }
  });
});

// ── POST /api/auth/profile — update editable fields ───────────────────────
router.post('/profile', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const updates  = {};
    if (name && name.trim().length >= 2) updates.name = name.trim();

    if (Object.keys(updates).length > 0) {
      await db.collection('users').doc(req.userId).update(updates);
    }

    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ error: 'Could not update profile.' });
  }
});

// ── GET /api/auth/google-status ────────────────────────────────────────────
// Firebase always supports Google sign-in (client-side), so this is always true
router.get('/google-status', (req, res) => {
  res.json({ enabled: true, provider: 'firebase' });
});

module.exports = router;
