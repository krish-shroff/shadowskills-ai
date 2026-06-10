// =============================================
// DASHBOARD PAGE — dashboard.js
// =============================================

let analysisData = null;

async function initDashboard() {
  // Redirect if not logged in
  if (!Auth.isLoggedIn()) {
    window.location.href = '/login.html';
    return;
  }

  // Load user info
  const user = Auth.getUser();
  if (user) {
    document.getElementById('welcome-msg').textContent = `Welcome back, ${user.name.split(' ')[0]}! 👋`;
    document.getElementById('sidebar-name').textContent = user.name;
    document.getElementById('sidebar-email').textContent = user.email;
    document.getElementById('sidebar-avatar').textContent = user.name.charAt(0).toUpperCase();
  }

  // Show loading spinner in stats
  ['stat-score', 'stat-analyses', 'stat-skills', 'stat-careers'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<span style="opacity:0.4;font-size:1rem;">...</span>';
  });

  try {
    // ── Load user profile + latest analysis from MongoDB ──────────────────
    const profileData = await api.get('/api/profile');

    if (profileData.profile) {
      const { stats, latestAnalysis, user: profileUser } = profileData.profile;

      // Update stat cards
      document.getElementById('stat-analyses').textContent = stats.totalAnalyses || 0;
      document.getElementById('stat-score').textContent   = stats.bestShadowScore || '—';
      document.getElementById('stat-careers').textContent = 5;

      if (latestAnalysis) {
        analysisData = latestAnalysis;

        // ── Persist to localStorage + sessionStorage so results/roadmap ──
        // pages load instantly without hitting the API again
        const cached = JSON.stringify(analysisData);
        localStorage.setItem('lastAnalysis', cached);
        sessionStorage.setItem('lastAnalysis', cached);

        // Show nav links to results / roadmap
        document.getElementById('nav-results').style.display = 'block';
        document.getElementById('nav-roadmap').style.display = 'block';

        // Count all skills
        const allSkills = [
          ...(analysisData.skills?.technical     || []),
          ...(analysisData.skills?.interpersonal || []),
          ...(analysisData.skills?.leadership    || []),
          ...(analysisData.skills?.creative      || []),
          ...(analysisData.skills?.problemSolving|| []),
          ...(analysisData.hiddenSkills          || [])
        ];
        document.getElementById('stat-skills').textContent = allSkills.length;

        document.getElementById('no-analysis-state').style.display  = 'none';
        document.getElementById('dashboard-content').style.display  = 'block';
        renderDashboard(analysisData);
      } else {
        showNoAnalysis();
      }
    }

    // ── Load history ──────────────────────────────────────────────────────
    const historyData = await api.get('/api/analyze/history');
    if (historyData.analyses && historyData.analyses.length > 0) {
      renderHistory(historyData.analyses);
    } else if (!analysisData) {
      showNoAnalysis();
    }

  } catch (err) {
    console.warn('API fetch failed, trying local cache:', err.message);

    // Fallback: use localStorage cache if API is down
    const cached = localStorage.getItem('lastAnalysis');
    if (cached) {
      try {
        analysisData = JSON.parse(cached);
        document.getElementById('no-analysis-state').style.display  = 'none';
        document.getElementById('dashboard-content').style.display  = 'block';
        document.getElementById('nav-results').style.display = 'block';
        document.getElementById('nav-roadmap').style.display = 'block';
        renderDashboard(analysisData);
        return;
      } catch {}
    }
    showNoAnalysis();
  }
}

// ─── Load a specific past analysis by clicking history item ──────────────────
window.loadAnalysis = function(id) {
  if (!id) return;
  // Show loading toast
  showToast('Loading analysis...', 'success');

  api.get(`/api/analyze/${id}`)
    .then(data => {
      if (data.success && data.analysis) {
        const cached = JSON.stringify(data.analysis);
        localStorage.setItem('lastAnalysis', cached);
        sessionStorage.setItem('lastAnalysis', cached);
        showToast('Analysis loaded! Redirecting to results...', 'success');
        setTimeout(() => window.location.href = '/results.html', 800);
      }
    })
    .catch(err => showToast('Could not load analysis: ' + err.message, 'error'));
};

function showNoAnalysis() {
  document.getElementById('stat-score').textContent    = '—';
  document.getElementById('stat-analyses').textContent = '0';
  document.getElementById('stat-skills').textContent   = '—';
  document.getElementById('no-analysis-state').style.display  = 'block';
  document.getElementById('dashboard-content').style.display  = 'none';
}

function renderDashboard(data) {
  // Shadow Score Gauge
  const score = data.shadowScore || 0;
  animateGauge(score);

  // Personality badge
  if (data.personalityType) {
    document.getElementById('personality-type-badge').textContent = data.personalityType;
  }

  // Radar Chart
  const categories = ['Technical', 'Interpersonal', 'Leadership', 'Creative', 'Problem\nSolving'];
  const avgScores = [
    avg(data.skills?.technical),
    avg(data.skills?.interpersonal),
    avg(data.skills?.leadership),
    avg(data.skills?.creative),
    avg(data.skills?.problemSolving)
  ];
  setTimeout(() => createRadarChart('radar-chart', categories, avgScores), 400);

  // Career Cards (top 3)
  const careerContainer = document.getElementById('career-cards');
  const careers = (data.careerRecommendations || []).slice(0, 3);
  if (careers.length > 0) {
    careerContainer.innerHTML = careers.map((c, i) => `
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
          ${c.growthRate  ? `<div class="career-meta-item">📈 ${c.growthRate}</div>`  : ''}
        </div>
        ${c.skillGaps?.length ? `
          <div style="margin-top:var(--space-sm);">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px;">SKILL GAPS</div>
            <div class="tags-row">${c.skillGaps.map(g => `<span class="gap-tag">⚠ ${g}</span>`).join('')}</div>
          </div>` : ''}
      </div>
    `).join('');
  }

  // Hidden Skills (top 4)
  const hiddenContainer = document.getElementById('hidden-skills-grid');
  const hidden = (data.hiddenSkills || []).slice(0, 4);
  if (hidden.length > 0) {
    hiddenContainer.innerHTML = hidden.map(s => `
      <div class="hidden-skill-card">
        <div class="hidden-skill-name">✨ ${s.name}</div>
        <div style="display:flex;align-items:center;gap:8px;margin:8px 0;">
          <div class="progress-bar" style="flex:1;">
            <div class="progress-fill" data-width="${s.level || 70}" style="width:0%;"></div>
          </div>
          <span style="font-size:0.78rem;color:var(--purple-lt);font-weight:700;">${s.level || 70}%</span>
        </div>
        ${s.reason ? `<div class="hidden-skill-reason">💡 ${s.reason}</div>` : ''}
      </div>
    `).join('');
    // Animate progress bars
    setTimeout(() => {
      document.querySelectorAll('#hidden-skills-grid .progress-fill').forEach(bar => {
        bar.style.transition = 'width 1s ease';
        bar.style.width = bar.dataset.width + '%';
      });
    }, 200);
  }
}

function renderHistory(analyses) {
  const container = document.getElementById('history-list');
  if (!analyses || analyses.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);">No past analyses found.</p>';
    return;
  }

  container.innerHTML = analyses.map((a, i) => `
    <div class="card" style="
      padding: var(--space-lg);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-md);
      ${i === 0 ? 'border-color:rgba(124,58,237,0.3);' : ''}
    ">
      <!-- Left: avatar + info -->
      <div style="display:flex;align-items:center;gap:var(--space-md);">
        <div style="
          width: 48px; height: 48px;
          border-radius: 50%;
          background: var(--grad-primary);
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-family: var(--font-display);
          font-size: 0.95rem; color: #fff; flex-shrink: 0;
        ">${a.shadowScore || 0}</div>
        <div>
          <div style="font-weight:700;margin-bottom:3px;">
            ${i === 0 ? '🕐 Latest · ' : ''}${a.personalityType || 'Skill Analysis'}
          </div>
          <div style="font-size:0.78rem;color:var(--text-muted);">
            ${formatDate(a.createdAt)}
            &nbsp;·&nbsp;
            ${a.inputType === 'file' ? '📄 File upload' : a.inputType === 'both' ? '📄+📝 File & Text' : '📝 Text input'}
          </div>
          ${a.inputSummary ? `
            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              "${a.inputSummary.substring(0, 80)}${a.inputSummary.length > 80 ? '...' : ''}"
            </div>` : ''}
        </div>
      </div>

      <!-- Right: badge + action buttons -->
      <div style="display:flex;align-items:center;gap:var(--space-sm);flex-wrap:wrap;">
        <span class="badge badge-${getScoreBadge(a.shadowScore)}">
          Score: ${a.shadowScore || 0}
        </span>
        ${a._id ? `
          <button
            class="btn btn-primary btn-sm"
            onclick="loadAnalysis('${a._id}')"
            title="View full results for this analysis"
          >
            📊 View Results
          </button>` : ''}
      </div>
    </div>
  `).join('');
}

function getScoreBadge(score) {
  if (score >= 80) return 'green';
  if (score >= 60) return 'cyan';
  if (score >= 40) return 'amber';
  return 'pink';
}

function avg(skills) {
  if (!skills || skills.length === 0) return 0;
  return Math.round(skills.reduce((sum, s) => sum + (s.level || 0), 0) / skills.length);
}

function scrollToHistory() {
  document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' });
}

// Init
initDashboard();
