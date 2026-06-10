/**
 * Auth middleware — middleware/auth.js
 * Verifies Firebase ID tokens sent in Authorization: Bearer <token>
 */

const { admin } = require('../services/firebaseAdmin');
const { getOrCreateUser } = require('../services/firebaseAdmin');

// ── Required auth (returns 401 if no valid token) ─────────────────────────
async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.userId  = decoded.uid;
    req.userEmail = decoded.email;

    // Sync user profile to Firestore (creates if first login)
    req.user = await getOrCreateUser(decoded.uid, {
      name:     decoded.name     || decoded.email?.split('@')[0] || 'User',
      email:    decoded.email    || '',
      photoURL: decoded.picture  || null,
      provider: decoded.firebase?.sign_in_provider || 'email'
    });

    next();
  } catch (err) {
    console.warn('Token verification failed:', err.code || err.message);
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}

// ── Optional auth (continues even if no token) ─────────────────────────────
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next();

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.userId    = decoded.uid;
    req.userEmail = decoded.email;
    req.user      = await getOrCreateUser(decoded.uid, {
      name:     decoded.name     || decoded.email?.split('@')[0] || 'User',
      email:    decoded.email    || '',
      photoURL: decoded.picture  || null,
      provider: decoded.firebase?.sign_in_provider || 'email'
    });
  } catch {
    // Invalid token — just continue as guest
  }

  next();
}

module.exports = { auth, optionalAuth };
