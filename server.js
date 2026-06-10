require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

// Initialize Firebase Admin first (before routes)
require('./services/firebaseAdmin');

// Route imports
const authRoutes     = require('./routes/auth');
const analysisRoutes = require('./routes/analysis');
const profileRoutes  = require('./routes/profile');

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── Core Middleware ────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Static Files ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/analyze', analysisRoutes);
app.use('/api/profile', profileRoutes);

// ── Health Check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:   'ok',
    message:  'ShadowSkills AI is running 🚀',
    database: 'Firebase Firestore',
    auth:     'Firebase Authentication'
  });
});

// ── SPA Fallback ───────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  const htmlFile = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(htmlFile)) res.sendFile(htmlFile);
  else res.status(404).json({ error: 'Page not found' });
});

// ── Start (Local Development Only) ─────────────────────────────────────────
if (process.env.NODE_ENV !== 'production' && !process.env.FUNCTIONS_EMULATOR && !process.env.FIREBASE_CONFIG) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`\n🌟 ShadowSkills AI`);
    console.log(`🚀 Server:    http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard.html`);
    console.log(`🔬 Analyze:   http://localhost:${PORT}/analyze.html`);
    console.log(`🔥 Database:  Firebase Firestore\n`);
  });
}

// ── Export as Firebase Cloud Function ──────────────────────────────────────
const { onRequest } = require('firebase-functions/v2/https');
exports.api = onRequest({
  cors: true,
  maxInstances: 10,
  memory: '256MiB'
}, app);
