// =============================================
// ANALYZE PAGE — analyze.js  (questionnaire)
// =============================================

let currentStep = 0;
const TOTAL_STEPS = 5;
let selectedFile = null;
let formAnswers  = {};

// Radio state stores
const radioState = {};

// ── Step metadata ──────────────────────────────────────────────────────────
const STEP_META = [
  { label: 'About You',           pct:  0 },
  { label: 'Your Project',        pct: 20 },
  { label: 'Skills & Experiences',pct: 40 },
  { label: 'How You Think',       pct: 60 },
  { label: 'Growth & Goals',      pct: 80 }
];

// ── Chip helpers ────────────────────────────────────────────────────────────
function initChips() {
  document.querySelectorAll('.chips').forEach(container => {
    container.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const isMulti = !container.dataset.single;
        if (isMulti) {
          chip.classList.toggle('selected');
        } else {
          container.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
        }
      });
    });
  });
  // Single-select chips
  document.getElementById('chips-status')?.setAttribute('data-single','1');
  document.getElementById('chips-group-role')?.setAttribute('data-single','1');
}

function getChipValues(id) {
  return [...document.querySelectorAll(`#${id} .chip.selected`)].map(c => c.dataset.val);
}

// ── Radio card helpers ──────────────────────────────────────────────────────
function pickRadio(key, value, activeId, ...others) {
  radioState[key] = value;
  document.getElementById(activeId)?.classList.add('selected');
  others.forEach(id => document.getElementById(id)?.classList.remove('selected'));
}

function pickSingle(card, key) {
  const cards = card.closest('.radio-cards').querySelectorAll('.radio-card');
  cards.forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  radioState[key] = card.querySelector('.radio-card-text').textContent.trim();
}

// ── Char counter ────────────────────────────────────────────────────────────
window.updateCount = (el, countId, max) => {
  const len = el.value.length;
  const counter = document.getElementById(countId);
  if (counter) {
    counter.textContent = len;
    counter.style.color = len > max * .85 ? 'var(--amber)' : 'var(--text-muted)';
  }
  if (len > max) el.value = el.value.substring(0, max);
};

// ── Progress update ─────────────────────────────────────────────────────────
function updateProgress(step) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  document.getElementById('prog-bar').style.width  = pct + '%';
  document.getElementById('step-pct').textContent  = pct + '%';
  document.getElementById('step-label').textContent =
    `Step ${step + 1} of ${TOTAL_STEPS} · ${STEP_META[step]?.label || ''}`;

  for (let i = 0; i < TOTAL_STEPS; i++) {
    const dot = document.getElementById(`dot-${i}`);
    if (!dot) continue;
    dot.className = 'step-dot' + (i < step ? ' done' : i === step ? ' active' : '');
  }
}

// ── Step navigation ─────────────────────────────────────────────────────────
window.nextStep = () => {
  if (!validateStep(currentStep)) return;
  collectStep(currentStep);

  document.getElementById(`step-${currentStep}`).style.display = 'none';
  currentStep++;
  const next = document.getElementById(`step-${currentStep}`);
  if (next) {
    next.style.display = 'block';
    next.style.animation = 'fadeInUp .35s ease';
  }
  updateProgress(currentStep);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.prevStep = () => {
  document.getElementById(`step-${currentStep}`).style.display = 'none';
  currentStep--;
  const prev = document.getElementById(`step-${currentStep}`);
  if (prev) prev.style.display = 'block';
  updateProgress(currentStep);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ── Validation ──────────────────────────────────────────────────────────────
function validateStep(step) {
  if (step === 0) {
    const name = document.getElementById('q-name')?.value.trim();
    if (!name) { showStepError('Please enter your name.'); return false; }
    const status = getChipValues('chips-status');
    if (!status.length) { showStepError('Please select your current status.'); return false; }
    const dream = document.getElementById('q-dream')?.value.trim();
    if (!dream) { showStepError('Please tell us your dream career.'); return false; }
  }
  if (step === 1) {
    const proj = document.getElementById('q-project')?.value.trim();
    if (!proj || proj.length < 20) {
      showStepError('Please describe your project in at least a sentence or two.'); return false;
    }
  }
  clearStepError();
  return true;
}

function showStepError(msg) {
  let err = document.getElementById('step-err');
  if (!err) {
    err = document.createElement('div');
    err.id = 'step-err';
    err.style.cssText = `
      padding:12px 16px; border-radius:10px; font-size:.86rem; font-weight:600;
      background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3); color:#fca5a5;
      margin-bottom:16px; animation:fadeInUp .3s ease;
    `;
    const card = document.querySelector('.wizard-card');
    card.insertBefore(err, card.firstChild);
  }
  err.textContent = '⚠ ' + msg;
}

function clearStepError() {
  document.getElementById('step-err')?.remove();
}

// ── Collect step data ────────────────────────────────────────────────────────
function collectStep(step) {
  if (step === 0) {
    formAnswers.name     = document.getElementById('q-name')?.value.trim();
    formAnswers.age      = document.getElementById('q-age')?.value;
    formAnswers.status   = getChipValues('chips-status')[0] || '';
    formAnswers.dream    = document.getElementById('q-dream')?.value.trim();
    formAnswers.fields   = getChipValues('chips-fields');
  }
  if (step === 1) {
    formAnswers.project  = document.getElementById('q-project')?.value.trim();
    formAnswers.workMode = radioState['work-mode'] || 'Solo';
    formAnswers.role     = document.getElementById('q-role')?.value.trim();
  }
  if (step === 2) {
    formAnswers.leadership  = getChipValues('chips-lead');
    formAnswers.communication = getChipValues('chips-comm');
    formAnswers.creative    = getChipValues('chips-create');
    formAnswers.sport       = document.getElementById('q-sport')?.value.trim();
    formAnswers.sportRole   = document.getElementById('q-sport-role')?.value;
  }
  if (step === 3) {
    formAnswers.challenge      = document.getElementById('q-challenge')?.value.trim();
    formAnswers.solution       = document.getElementById('q-solution')?.value.trim();
    formAnswers.challengeStyle = radioState['challenge-approach'] || '';
    formAnswers.groupRole      = getChipValues('chips-group-role')[0] || '';
  }
  if (step === 4) {
    formAnswers.personality  = radioState['personality'] || '';
    formAnswers.hoursPerWeek = document.getElementById('q-hours')?.value;
    formAnswers.learning     = document.getElementById('q-learning')?.value.trim();
    formAnswers.achievement  = document.getElementById('q-achievement')?.value.trim();
  }
}

// ── Build text summary for Gemini ──────────────────────────────────────────
function buildAnalysisText() {
  const a = formAnswers;
  const lines = [
    `CANDIDATE PROFILE`,
    `Name: ${a.name || 'Unknown'}`,
    `Age: ${a.age || 'Not specified'}`,
    `Status: ${a.status || 'Not specified'}`,
    `Dream Career: ${a.dream || 'Not specified'}`,
    `Fields of Interest: ${(a.fields || []).join(', ') || 'Not specified'}`,
    ``,
    `PROJECT EXPERIENCE`,
    `Project Description: ${a.project || 'Not provided'}`,
    `Work Style: ${a.workMode || 'Not specified'}`,
    `Role: ${a.role || 'Not specified'}`,
    ``,
    `LEADERSHIP & ACTIVITIES`,
    `Leadership Experiences: ${(a.leadership || []).join(', ') || 'None'}`,
    `Communication Experiences: ${(a.communication || []).join(', ') || 'None'}`,
    `Creative Work: ${(a.creative || []).join(', ') || 'None'}`,
    `Sports: ${a.sport ? `${a.sport} (${a.sportRole || 'Member'})` : 'None'}`,
    ``,
    `PROBLEM SOLVING`,
    `Challenge Faced: ${a.challenge || 'Not provided'}`,
    `How They Solved It: ${a.solution || 'Not provided'}`,
    `Challenge Approach Style: ${a.challengeStyle || 'Not specified'}`,
    `Group Role Preference: ${a.groupRole || 'Not specified'}`,
    ``,
    `GROWTH & GOALS`,
    `Personality Type: ${a.personality || 'Not specified'}`,
    `Weekly Learning Hours: ${a.hoursPerWeek || 'Not specified'}`,
    `Currently Learning: ${a.learning || 'Not specified'}`,
    `Proudest Achievement: ${a.achievement || 'Not provided'}`,
  ];
  return lines.join('\n');
}

// ── File handling ────────────────────────────────────────────────────────────
window.handleFile = (file) => {
  if (!file) return;
  const allowed = ['pdf','docx','doc','txt'];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!allowed.includes(ext)) { showToast('Only PDF, DOCX, and TXT supported.', 'error'); return; }
  if (file.size > 5 * 1024 * 1024) { showToast('File too large. Max 5MB.', 'error'); return; }
  selectedFile = file;
  const icons = { pdf:'📕', docx:'📘', doc:'📘', txt:'📄' };
  document.getElementById('fp-icon').textContent = icons[ext] || '📄';
  document.getElementById('fp-name').textContent = file.name;
  document.getElementById('fp-size').textContent = formatBytes(file.size);
  document.getElementById('file-preview').classList.add('show');
};

window.removeFile = () => {
  selectedFile = null;
  document.getElementById('file-input').value = '';
  document.getElementById('file-preview').classList.remove('show');
};

window.handleDrag = (e, over) => {
  e.preventDefault();
  document.getElementById('drop-zone').classList.toggle('drag-over', over);
};

window.handleDrop = (e) => {
  e.preventDefault();
  document.getElementById('drop-zone').classList.remove('drag-over');
  handleFile(e.dataTransfer.files[0]);
};

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024*1024) return (b/1024).toFixed(1) + ' KB';
  return (b/(1024*1024)).toFixed(1) + ' MB';
}

// ── Loading animation ────────────────────────────────────────────────────────
const LOAD_STEPS   = ['ls-1','ls-2','ls-3','ls-4','ls-5'];
const LOAD_DELAYS  = [0, 1500, 3000, 4500, 6000];

function showLoading() {
  document.getElementById('loading-overlay').classList.add('show');
  LOAD_STEPS.forEach(id => document.getElementById(id)?.classList.remove('active','done'));
  LOAD_STEPS.forEach((id, i) => {
    setTimeout(() => {
      if (i > 0) {
        const prev = document.getElementById(LOAD_STEPS[i-1]);
        prev?.classList.remove('active'); prev?.classList.add('done');
      }
      document.getElementById(id)?.classList.add('active');
    }, LOAD_DELAYS[i]);
  });
}

// ── Submit ───────────────────────────────────────────────────────────────────
window.submitAnalysis = async () => {
  collectStep(4);
  clearStepError();

  const btn = document.getElementById('analyze-btn');
  btn.disabled = true;
  btn.textContent = 'Analyzing…';
  showLoading();

  try {
    const formData  = new FormData();
    const textSummary = buildAnalysisText();
    formData.append('activityDescription', textSummary);
    formData.append('questionnaireData',   JSON.stringify(formAnswers));
    if (selectedFile) formData.append('resume', selectedFile);

    const token   = Auth.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res  = await fetch('/api/analyze', { method: 'POST', headers, body: formData });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Analysis failed');

    // Store full result + questionnaire answers
    const str = JSON.stringify(data.analysis);
    sessionStorage.setItem('lastAnalysis',    str);
    localStorage.setItem('lastAnalysis',      str);
    sessionStorage.setItem('questionnaireAnswers', JSON.stringify(formAnswers));
    sessionStorage.setItem('analysisSavedToAccount',
      token && data.analysisId ? 'true' : 'false');

    // Wait for animation then redirect
    setTimeout(() => window.location.href = '/results.html', 7500);

  } catch (err) {
    document.getElementById('loading-overlay').classList.remove('show');
    btn.disabled = false;
    btn.textContent = '✦ Reveal My Skills';
    showStepError('Error: ' + err.message);
    window.scrollTo({ top: 0 });
  }
};

// ── Init ─────────────────────────────────────────────────────────────────────
initChips();
updateProgress(0);
