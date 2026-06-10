/**
 * Analysis routes — routes/analysis.js
 * Uses Firebase Firestore instead of MongoDB
 */

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const pdf      = require('pdf-parse');

const { auth, optionalAuth }   = require('../middleware/auth');
const { analyzeWithGemini }    = require('../services/geminiService');
const {
  saveAnalysis,
  getUserAnalyses,
  getAnalysisById
} = require('../services/firebaseAdmin');

// ── Multer file upload ─────────────────────────────────────────────────────
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// ── Extract text from uploaded file ───────────────────────────────────────
async function extractText(filePath, mimetype, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  try {
    if (ext === '.pdf') {
      const data = await pdf(fs.readFileSync(filePath));
      return data.text;
    }
    // txt / docx fallback (read as raw text)
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  } finally {
    // Clean up upload
    try { fs.unlinkSync(filePath); } catch {}
  }
}

// ── POST /api/analyze ──────────────────────────────────────────────────────
router.post('/', optionalAuth, upload.single('resume'), async (req, res) => {
  try {
    const desc     = req.body.activityDescription || '';
    const qData    = req.body.questionnaireData   || '';
    const file     = req.file;

    let fileText = '';
    if (file) {
      fileText = await extractText(file.path, file.mimetype, file.originalname);
    }

    // Build analysis content
    const combined = [desc, fileText].filter(Boolean).join('\n\n---\n\n');
    if (!combined.trim()) {
      return res.status(400).json({ error: 'Please provide a description or upload a file.' });
    }

    // Determine input type
    const inputType = file && desc ? 'both' : file ? 'file' : 'questionnaire';

    // Create short summary for history display
    const inputSummary = desc.substring(0, 120) || `File: ${file?.originalname || 'uploaded'}`;

    // Run AI analysis
    const result = await analyzeWithGemini(combined);
    const analysisData = result.data;
    analysisData.aiPowered = result.success;

    // Save to Firestore if user is logged in
    let analysisId = null;
    if (req.userId) {
      try {
        analysisId = await saveAnalysis(req.userId, analysisData, {
          inputSummary,
          inputType,
          aiPowered: result.success
        });
      } catch (dbErr) {
        console.warn('Firestore save failed:', dbErr.message);
      }
    }

    res.json({
      success:    true,
      analysis:   analysisData,
      analysisId,
      savedToAccount: !!analysisId
    });

  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: 'Analysis failed: ' + err.message });
  }
});

// ── GET /api/analyze/latest ────────────────────────────────────────────────
router.get('/latest', auth, async (req, res) => {
  try {
    const analyses = await getUserAnalyses(req.userId, 1);
    if (!analyses.length) {
      return res.status(404).json({ error: 'No analyses found.' });
    }
    res.json({ success: true, analysis: analyses[0] });
  } catch (err) {
    console.error('Latest analysis error:', err.message);
    res.status(500).json({ error: 'Could not fetch latest analysis.' });
  }
});

// ── GET /api/analyze/history ───────────────────────────────────────────────
router.get('/history', auth, async (req, res) => {
  try {
    const analyses = await getUserAnalyses(req.userId, 20);
    res.json({ success: true, analyses });
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ error: 'Could not fetch history.' });
  }
});

// ── GET /api/analyze/:id ───────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const analysis = await getAnalysisById(req.params.id);
    if (!analysis || analysis.userId !== req.userId) {
      return res.status(404).json({ error: 'Analysis not found.' });
    }
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch analysis.' });
  }
});

module.exports = router;
