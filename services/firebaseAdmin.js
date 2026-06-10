/**
 * Firebase Admin SDK — services/firebaseAdmin.js
 *
 * Initializes Firebase Admin once and exports admin + db (Firestore).
 * Reads credentials from:
 *   1. firebase-service-account.json  (if the file exists in project root)
 *   2. Environment variables FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }    = require('firebase-admin/firestore');
const { getAuth }                     = require('firebase-admin/auth');
const path  = require('path');
const fs    = require('fs');

let db;

function initFirebase() {
  if (getApps().length > 0) {
    // Already initialized
    db = getFirestore();
    return;
  }

  const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

  try {
    if (fs.existsSync(serviceAccountPath)) {
      // ── Option A: service account JSON file ───────────────────────────
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('✅ Firebase Admin: initialized from service-account.json');
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // ── Option B: environment variables ───────────────────────────────
      const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
        .replace(/\\n/g, '\n')   // Convert literal \n to real newlines
        .replace(/^"/, '')       // Strip a leading double quote if present
        .replace(/"$/, '')       // Strip a trailing double quote if present
        .replace(/^'/, '')       // Strip a leading single quote if present
        .replace(/'$/, '')       // Strip a trailing single quote if present
        .trim();                 // Clean up stray spaces

      initializeApp({
        credential: cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey
        })
      });
      console.log('✅ Firebase Admin: initialized from environment variables');
    } else {
      throw new Error(
        'No Firebase credentials found.\n' +
        '  → Place firebase-service-account.json in the project root, OR\n' +
        '  → Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env'
      );
    }

    db = getFirestore();

    // Enable Firestore settings
    db.settings({ ignoreUndefinedProperties: true });

  } catch (err) {
    console.warn('\n⚠️  Firebase Admin: Failed to initialize database connection.');
    console.warn('👉 Details:', err.message);
    console.warn('👉 Server will continue running, but Firebase-backed profile/save features will be disabled.\n');
    db = null;
  }
}

initFirebase();

// ── Admin Compat Object for Middleware ────────────────────────────────────
const admin = {
  auth: () => {
    try {
      return getAuth();
    } catch {
      // Graceful fallback dummy if Auth is disabled/uninitialized
      return {
        verifyIdToken: () => { throw new Error('Firebase Auth not initialized.'); }
      };
    }
  }
};

// ── Firestore helpers ──────────────────────────────────────────────────────

/** Get a user document from Firestore, creating it if it doesn't exist */
async function getOrCreateUser(uid, profileData = {}) {
  if (!db) {
    return {
      id: uid,
      name:            profileData.name  || 'Anonymous',
      email:           profileData.email || '',
      photoURL:        profileData.photoURL || null,
      provider:        profileData.provider || 'email',
      totalAnalyses:   0,
      bestShadowScore: 0,
      createdAt:       new Date(),
      lastActive:      new Date()
    };
  }

  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    const newUser = {
      uid,
      name:            profileData.name  || 'Anonymous',
      email:           profileData.email || '',
      photoURL:        profileData.photoURL || null,
      provider:        profileData.provider || 'email',
      totalAnalyses:   0,
      bestShadowScore: 0,
      createdAt:       FieldValue.serverTimestamp(),
      lastActive:      FieldValue.serverTimestamp()
    };
    await ref.set(newUser);
    return { id: uid, ...newUser };
  }

  // Update lastActive
  await ref.update({ lastActive: FieldValue.serverTimestamp() });
  return { id: uid, ...snap.data() };
}

/** Save analysis to Firestore and update user stats */
async function saveAnalysis(userId, analysisData, meta = {}) {
  if (!db) return null;

  const analysisRef = db.collection('analyses').doc();
  const now = FieldValue.serverTimestamp();

  const doc = {
    userId,
    ...analysisData,
    inputSummary: meta.inputSummary || '',
    inputType:    meta.inputType    || 'questionnaire',
    aiPowered:    meta.aiPowered    !== undefined ? meta.aiPowered : true,
    createdAt:    now
  };

  await analysisRef.set(doc);

  // Update user stats
  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    const userData = userSnap.data();
    const newBest = Math.max(userData.bestShadowScore || 0, analysisData.shadowScore || 0);
    await userRef.update({
      totalAnalyses:   FieldValue.increment(1),
      bestShadowScore: newBest,
      lastActive:      now
    });
  }

  return analysisRef.id;
}

/** Get analysis history for a user (most recent first) */
async function getUserAnalyses(userId, limit = 10) {
  if (!db) return [];

  const snap = await db.collection('analyses')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/** Get a single analysis by ID */
async function getAnalysisById(id) {
  if (!db) return null;

  const snap = await db.collection('analyses').doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

/** Get user profile from Firestore */
async function getUserProfile(userId) {
  if (!db) {
    return {
      user: {
        id: userId,
        name: 'Demo User',
        email: 'demo@example.com',
        photoURL: null,
        provider: 'email',
        createdAt: new Date(),
        lastActive: new Date()
      },
      stats: {
        totalAnalyses:   0,
        bestShadowScore: 0
      },
      latestAnalysis: null
    };
  }

  const userSnap = await db.collection('users').doc(userId).get();
  if (!userSnap.exists) return null;

  const userData = userSnap.data();

  // Get latest analysis
  const latestSnap = await db.collection('analyses')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  const latestAnalysis = latestSnap.empty ? null : {
    id: latestSnap.docs[0].id,
    ...latestSnap.docs[0].data()
  };

  return {
    user: { id: userId, ...userData },
    stats: {
      totalAnalyses:   userData.totalAnalyses   || 0,
      bestShadowScore: userData.bestShadowScore  || 0
    },
    latestAnalysis
  };
}

module.exports = {
  admin,
  db,
  getOrCreateUser,
  saveAnalysis,
  getUserAnalyses,
  getAnalysisById,
  getUserProfile
};
