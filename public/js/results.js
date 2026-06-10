// =============================================
// RESULTS PAGE — results.js
// =============================================

let analysisData = null;
let currentSkillTab = 'technical';

// Show a banner telling the user if their analysis was saved or if they should login
function showSaveBanner() {
  const saved   = sessionStorage.getItem('analysisSavedToAccount') === 'true';
  const loggedIn = Auth.isLoggedIn();

  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    z-index: 999; display: flex; align-items: center; gap: 12px;
    padding: 14px 22px; border-radius: 14px; font-size: 0.9rem; font-weight: 600;
    backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: fadeInUp 0.4s ease; white-space: nowrap; max-width: 90vw;
  `;

  if (loggedIn && saved) {
    banner.style.background = 'rgba(16,185,129,0.15)';
    banner.style.border = '1px solid rgba(16,185,129,0.35)';
    banner.style.color  = '#6ee7b7';
    banner.innerHTML    = '✅ Analysis saved to your account — available next time you log in!';
  } else if (!loggedIn) {
    banner.style.background = 'rgba(124,58,237,0.15)';
    banner.style.border = '1px solid rgba(124,58,237,0.35)';
    banner.style.color  = '#a78bfa';
    banner.innerHTML    = `🔒 <span>Want to save your results?</span> <a href="/login.html" style="color:#fff;font-weight:700;text-decoration:underline;margin-left:6px;">Login / Register →</a>`;
  } else {
    return; // Already logged in but wasn't a new analysis — no banner needed
  }

  document.body.appendChild(banner);
  setTimeout(() => {
    banner.style.transition = 'opacity 0.5s ease';
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 500);
  }, 5000);
}

// PERSONALITY EMOJIS
const personalityEmojis = {
  'innovator': '💡', 'leader': '👑', 'creative': '🎨', 'analyst': '🔬',
  'strategist': '♟️', 'visionary': '🔮', 'builder': '🏗️', 'solver': '🧩',
  'communicator': '🗣️', 'empathetic': '💚', 'default': '🌟'
};

function getPersonalityEmoji(type = '') {
  const lower = type.toLowerCase();
  for (const [key, emoji] of Object.entries(personalityEmojis)) {
    if (lower.includes(key)) return emoji;
  }
  return '🌟';
}

function initResults() {
  // 1️⃣ Fresh analysis just done — in sessionStorage
  const fromSession = sessionStorage.getItem('lastAnalysis');
  if (fromSession) {
    try {
      analysisData = JSON.parse(fromSession);
      renderResults(analysisData);
      return;
    } catch {}
  }

  // 2️⃣ Returning visitor — try localStorage (set by dashboard)
  const fromLocal = localStorage.getItem('lastAnalysis');
  if (fromLocal) {
    try {
      analysisData = JSON.parse(fromLocal);
      renderResults(analysisData);
      // Also sync to sessionStorage for this session
      sessionStorage.setItem('lastAnalysis', fromLocal);
      return;
    } catch {}
  }

  // 3️⃣ Logged-in user with no local cache — fetch from MongoDB
  if (Auth.isLoggedIn()) {
    showLoadingState();
    const token = Auth.getToken();
    fetch('/api/analyze/latest', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.analysis) {
          analysisData = data.analysis;
          // Cache it locally for fast future loads
          localStorage.setItem('lastAnalysis', JSON.stringify(analysisData));
          sessionStorage.setItem('lastAnalysis', JSON.stringify(analysisData));
          hideLoadingState();
          renderResults(analysisData);
        } else {
          showNoResults();
        }
      })
      .catch(() => showNoResults());
    return;
  }

  // 4️⃣ Not logged in, no data anywhere
  showNoResults();
}

function showLoadingState() {
  const main = document.querySelector('main .container') || document.querySelector('main');
  if (!main) return;
  const div = document.createElement('div');
  div.id = 'results-loading';
  div.style.cssText = 'text-align:center;padding:80px 20px;';
  div.innerHTML = `
    <div style="width:60px;height:60px;border:3px solid rgba(124,58,237,0.2);border-top:3px solid #7c3aed;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 24px;"></div>
    <p style="color:var(--text-secondary);font-size:1rem;">Loading your saved skills profile...</p>
  `;
  main.prepend(div);
}

function hideLoadingState() {
  document.getElementById('results-loading')?.remove();
}

function showNoResults() {
  document.querySelector('main').innerHTML = `
    <div style="text-align:center; padding: var(--space-3xl); padding-top: 150px;">
      <div style="font-size:4rem;margin-bottom:var(--space-lg);">🔬</div>
      <h1 style="margin-bottom:var(--space-md);">No results yet</h1>
      <p style="color:var(--text-secondary);margin-bottom:var(--space-xl);">Run an analysis first to see your results here.</p>
      <a href="/analyze.html" class="btn btn-primary btn-lg">Start Analysis →</a>
    </div>
  `;
}

function renderResults(data) {
  // Badge
  const badge = document.getElementById('ai-badge-text');
  if (badge) badge.textContent = data.aiPowered !== false ? '✨ Gemini AI Results' : '🤖 Demo Results';

  // Shadow Score Gauge
  setTimeout(() => animateGauge(data.shadowScore || 0), 500);

  // Personality
  const emoji = getPersonalityEmoji(data.personalityType);
  setText('personality-emoji', emoji);
  setText('personality-type', data.personalityType || 'Unique Thinker');
  setText('personality-text', data.personalityInsights || '');

  // Strengths
  renderList('strengths-list', data.strengths || [], '✓', 'var(--green)');
  // Improvements
  renderList('improvements-list', data.areasOfImprovement || [], '→', 'var(--amber)');

  // Radar Chart
  const categories = ['Technical', 'Interpersonal', 'Leadership', 'Creative', 'Problem Solving'];
  const avgScores = [
    avg(data.skills?.technical),
    avg(data.skills?.interpersonal),
    avg(data.skills?.leadership),
    avg(data.skills?.creative),
    avg(data.skills?.problemSolving)
  ];
  setTimeout(() => createRadarChart('radar-chart', categories, avgScores), 600);

  // Skill Bars
  renderSkillBars(data);

  // Detailed Skills
  renderDetailedSkills(data.skills || {});

  // Hidden Skills
  renderHiddenSkills(data.hiddenSkills || []);

  // Career Recommendations
  renderCareers(data.careerRecommendations || []);

  // Skill Gap Analysis
  if (data.skillGapAnalysis) renderSkillGap(data.skillGapAnalysis);

  // Future Self
  if (data.futureSelf) renderFutureSelf(data.futureSelf);

  // Growth Prediction
  setText('growth-prediction', data.growthPrediction || 'Analysis complete.');

  // Show save status banner
  setTimeout(showSaveBanner, 1500);
}

function renderSkillGap(gap) {
  const el = document.getElementById('skill-gap-content');
  if (!el || !gap) return;

  const priorityColors = { High: '#ef4444', Medium: '#f59e0b', Low: '#06b6d4' };

  el.innerHTML = `
    <div class="card" style="padding:var(--space-xl);background:linear-gradient(135deg,rgba(239,68,68,0.06),rgba(124,58,237,0.06));border-color:rgba(239,68,68,0.18);">
      <!-- Header row -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:var(--space-xl);">
        <div>
          <div style="font-size:0.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:6px;">DREAM CAREER</div>
          <div style="font-size:1.25rem;font-weight:800;font-family:var(--font-display);">🎯 ${gap.dreamCareer || 'Not specified'}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:2rem;font-weight:800;color:${(gap.currentReadiness||0) >= 60 ? 'var(--green)' : (gap.currentReadiness||0) >= 40 ? 'var(--amber)' : '#ef4444'};">${gap.currentReadiness || 0}%</div>
          <div style="font-size:0.78rem;color:var(--text-muted);">Current Readiness</div>
        </div>
      </div>

      <!-- Readiness bar -->
      <div style="margin-bottom:var(--space-xl);">
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-muted);margin-bottom:8px;">
          <span>Progress to Dream Career</span>
          <span>${gap.timeToReady || 'N/A'}</span>
        </div>
        <div class="progress-track" style="height:10px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden;">
          <div style="height:100%;width:0%;background:var(--grad-primary);border-radius:99px;transition:width 1.2s ease;"
               data-width="${gap.currentReadiness || 0}" id="gap-bar"></div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);">
        <!-- Missing Skills -->
        <div>
          <div style="font-size:0.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:14px;">⚠ Skills to Build</div>
          ${(gap.missingSkills || []).map(s => `
            <div style="margin-bottom:14px;padding:14px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:12px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span style="font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:99px;background:${priorityColors[s.priority] || '#7c3aed'}22;color:${priorityColors[s.priority] || '#7c3aed'};">${s.priority || 'Medium'}</span>
                <span style="font-weight:700;font-size:0.9rem;">${s.name}</span>
              </div>
              <div style="font-size:0.8rem;color:var(--text-muted);">📚 ${s.howToLearn || ''}</div>
            </div>
          `).join('')}
        </div>

        <!-- Existing Strengths -->
        <div>
          <div style="font-size:0.78rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:14px;">✅ You Already Have</div>
          ${(gap.existingRelevantSkills || []).map(s => `
            <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.18);border-radius:10px;margin-bottom:10px;">
              <span style="color:var(--green);font-size:1rem;">✓</span>
              <span style="font-size:0.88rem;font-weight:600;">${s}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Animate bar
  setTimeout(() => {
    const bar = document.getElementById('gap-bar');
    if (bar) bar.style.width = bar.dataset.width + '%';
  }, 300);
}

function renderFutureSelf(future) {
  const el = document.getElementById('future-self-content');
  if (!el || !future) return;

  const stages = [
    { key: 'sixMonths',  label: '6 Months',  icon: '🌱', color: 'var(--cyan)',   gradient: 'rgba(6,182,212,0.12)'  },
    { key: 'oneYear',    label: '1 Year',     icon: '⚡', color: 'var(--amber)',  gradient: 'rgba(245,158,11,0.12)' },
    { key: 'threeYears', label: '3 Years',    icon: '🚀', color: 'var(--purple)', gradient: 'rgba(124,58,237,0.15)' }
  ];

  el.innerHTML = stages.map((s, i) => `
    <div class="card" style="
      padding:var(--space-xl);
      background:${s.gradient};
      border-color:${s.color}44;
      text-align:center;
      animation:fadeInUp 0.5s ease ${i*0.15}s both;
    ">
      <div style="font-size:2.2rem;margin-bottom:12px;">${s.icon}</div>
      <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);margin-bottom:8px;font-weight:700;">${s.label}</div>
      <div style="font-size:1rem;font-weight:800;color:#fff;line-height:1.3;">${future[s.key] || '—'}</div>
    </div>
  `).join('');
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderList(id, items, icon, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.map(item => `
    <div style="display:flex;align-items:flex-start;gap:8px;font-size:0.87rem;">
      <span style="color:${color};font-weight:700;flex-shrink:0;">${icon}</span>
      <span style="color:var(--text-secondary);">${item}</span>
    </div>
  `).join('');
}

function renderSkillBars(data) {
  const container = document.getElementById('skill-bars');
  if (!container) return;

  const categories = [
    { key: 'technical', label: 'Technical', icon: '💻', color: 'var(--purple)' },
    { key: 'interpersonal', label: 'Interpersonal', icon: '🤝', color: 'var(--cyan)' },
    { key: 'leadership', label: 'Leadership', icon: '👑', color: 'var(--amber)' },
    { key: 'creative', label: 'Creative', icon: '🎨', color: 'var(--pink)' },
    { key: 'problemSolving', label: 'Problem Solving', icon: '🧩', color: 'var(--green)' }
  ];

  container.innerHTML = categories.map(cat => {
    const score = avg(data.skills?.[cat.key] || []);
    return `
      <div class="skill-row">
        <div class="skill-name">${cat.icon} ${cat.label}</div>
        <div class="progress-bar" style="flex:1;">
          <div class="progress-fill" data-width="${score}" style="background:linear-gradient(90deg,${cat.color},var(--cyan));"></div>
        </div>
        <div class="skill-level">${score}</div>
      </div>
    `;
  }).join('');

  // Animate
  setTimeout(() => {
    container.querySelectorAll('.progress-fill').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  }, 400);
}

function renderDetailedSkills(skills) {
  const allTabs = ['technical', 'interpersonal', 'leadership', 'creative', 'problemSolving'];
  window._skillsData = skills;
  showSkillTab('technical');
}

window.showSkillTab = function(tab) {
  currentSkillTab = tab;
  const allTabs = ['technical', 'interpersonal', 'leadership', 'creative', 'problemSolving'];

  // Update tabs
  allTabs.forEach(t => {
    const btn = document.getElementById(`skills-tab-${t}`);
    if (btn) btn.classList.toggle('active', t === tab);
  });

  const skills = (window._skillsData || {})[tab] || [];
  const container = document.getElementById('detailed-skills-content');
  if (!container) return;

  if (skills.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);">No skills detected in this category.</p>';
    return;
  }

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-md);">
      ${skills.map(s => `
        <div class="skill-row" style="margin-bottom:0;">
          <div class="skill-name">${s.name}</div>
          <div class="progress-bar" style="flex:1;">
            <div class="progress-fill" data-width="${s.level || 50}" style="width:0%;"></div>
          </div>
          <div class="skill-level">${s.level || 50}%</div>
        </div>
      `).join('')}
    </div>
  `;

  setTimeout(() => {
    container.querySelectorAll('.progress-fill').forEach(bar => {
      bar.style.transition = 'width 0.8s ease';
      bar.style.width = bar.dataset.width + '%';
    });
  }, 50);
};

function renderHiddenSkills(hiddenSkills) {
  const container = document.getElementById('hidden-skills-grid');
  if (!container) return;

  if (hiddenSkills.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);">No hidden skills detected.</p>';
    return;
  }

  container.innerHTML = hiddenSkills.map((s, i) => `
    <div class="hidden-skill-card" style="animation-delay:${i * 0.1}s;">
      <div class="hidden-skill-name">✨ ${s.name}</div>
      <div style="display:flex;align-items:center;gap:8px;margin:10px 0;">
        <div class="progress-bar" style="flex:1;">
          <div class="progress-fill" data-width="${s.level || 70}" style="width:0%;"></div>
        </div>
        <span style="font-size:0.78rem;color:var(--purple-lt);font-weight:700;">${s.level || 70}%</span>
      </div>
      ${s.reason ? `<div class="hidden-skill-reason">💡 ${s.reason}</div>` : ''}
    </div>
  `).join('');

  setTimeout(() => {
    container.querySelectorAll('.progress-fill').forEach(bar => {
      bar.style.transition = 'width 1s ease';
      bar.style.width = bar.dataset.width + '%';
    });
  }, 300);
}

function renderCareers(careers) {
  const container = document.getElementById('career-grid');
  if (!container) return;

  if (careers.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);">No career recommendations found.</p>';
    return;
  }

  container.innerHTML = careers.map((c, i) => `
    <div class="career-card ${i === 0 ? 'card-glow' : ''}">
      <div class="career-header">
        <div>
          <div class="career-title">${i === 0 ? '⭐ ' : ''}${c.title}</div>
          <div class="career-industry">${c.industry || ''}</div>
        </div>
        <div class="match-score">
          <div class="score">${c.match}%</div>
          <div class="label">Match</div>
        </div>
      </div>
      <p class="career-desc">${c.description}</p>
      <div class="career-meta">
        ${c.salaryRange ? `<div class="career-meta-item">💰 ${c.salaryRange}</div>` : ''}
        ${c.growthRate ? `<div class="career-meta-item">📈 ${c.growthRate}</div>` : ''}
      </div>
      ${c.requiredSkills?.length ? `
        <div style="margin-top:var(--space-sm);">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px;">REQUIRED SKILLS</div>
          <div class="tags-row">${c.requiredSkills.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>
        </div>` : ''}
      ${c.skillGaps?.length ? `
        <div style="margin-top:var(--space-sm);">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px;">SKILL GAPS TO CLOSE</div>
          <div class="tags-row">${c.skillGaps.map(g => `<span class="gap-tag">⚠ ${g}</span>`).join('')}</div>
        </div>` : ''}
    </div>
  `).join('');
}

function avg(skills) {
  if (!skills || skills.length === 0) return 0;
  return Math.round(skills.reduce((sum, s) => sum + (s.level || 0), 0) / skills.length);
}

// Init
initResults();
