// ── DIAGNOSTIC ERROR CATCHERS ──────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('💥 CRITICAL UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 CRITICAL UNHANDLED REJECTION:', reason);
  process.exit(1);
});
// ───────────────────────────────────────────────────────────────────

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

// ── Export as Firebase Cloud Function ──────────────────────────────────────
const { onRequest } = require('firebase-functions/v2/https');
exports.api = onRequest({
  cors: true,
  maxInstances: 10,
  memory: '256MiB'
}, app);

// ── Unified Server Listener (Works on Render & Local) ──────────────────────
// Render passes a dynamic port via process.env.PORT. Fallback to 5000 locally.
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🌟 ShadowSkills AI Backend Active`);
  console.log(`🚀 Server listening on host 0.0.0.0 and port ${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📊 Local Dashboard: http://localhost:${PORT}/dashboard.html`);
  }
});
