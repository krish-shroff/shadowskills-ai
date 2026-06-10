// =============================================
// ROADMAP PAGE — roadmap.js
// =============================================

let analysisData = null;
let currentPhase = 'threeMonth';

const phaseDescriptions = {
  threeMonth: '🌱 <strong>Foundation Phase (Months 1–3)</strong>: Focus on building core competencies, establishing learning habits, and completing foundational certifications. This phase sets the groundwork for everything that follows.',
  sixMonth: '🌿 <strong>Growth Phase (Months 4–6)</strong>: Apply your foundational skills in real projects, close critical skill gaps, and begin networking with professionals in your target field.',
  oneYear: '🌳 <strong>Mastery Phase (Months 7–12)</strong>: Establish yourself as a credible candidate, build a strong portfolio, and actively pursue opportunities in your target career.'
};

function initRoadmap() {
  // 1️⃣ Fresh from sessionStorage
  const fromSession = sessionStorage.getItem('lastAnalysis');
  if (fromSession) {
    try {
      analysisData = JSON.parse(fromSession);
      renderRoadmap(analysisData);
      return;
    } catch {}
  }

  // 2️⃣ From localStorage (set by dashboard on return)
  const fromLocal = localStorage.getItem('lastAnalysis');
  if (fromLocal) {
    try {
      analysisData = JSON.parse(fromLocal);
      sessionStorage.setItem('lastAnalysis', fromLocal);
      renderRoadmap(analysisData);
      return;
    } catch {}
  }

  // 3️⃣ Logged-in user — fetch from MongoDB
  if (Auth.isLoggedIn()) {
    // Show a loading indicator
    const timeline = document.getElementById('roadmap-timeline');
    if (timeline) {
      timeline.innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
          <div style="width:56px;height:56px;border:3px solid rgba(124,58,237,0.2);border-top:3px solid #7c3aed;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
          <p style="color:var(--text-secondary);">Loading your saved roadmap...</p>
        </div>`;
    }

    fetch('/api/analyze/latest', {
      headers: { Authorization: `Bearer ${Auth.getToken()}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.analysis) {
          analysisData = data.analysis;
          localStorage.setItem('lastAnalysis', JSON.stringify(analysisData));
          sessionStorage.setItem('lastAnalysis', JSON.stringify(analysisData));
          renderRoadmap(analysisData);
        } else {
          showEmptyRoadmap();
        }
      })
      .catch(() => showEmptyRoadmap());
    return;
  }

  // 4️⃣ Guest with no data
  showEmptyRoadmap();
}

function showEmptyRoadmap() {
  document.getElementById('no-roadmap-state').style.display = 'block';
  document.getElementById('roadmap-timeline').style.display = 'none';
  document.getElementById('target-career-banner').style.display = 'none';
  document.getElementById('focus-skills-section').style.display = 'none';
  document.getElementById('growth-section').style.display = 'none';
  document.getElementById('phase-desc').style.display = 'none';
}

function renderRoadmap(data) {
  // Phase counts
  const r = data.roadmap || {};
  document.getElementById('phase-3-count').textContent = (r.threeMonth || []).length;
  document.getElementById('phase-6-count').textContent = (r.sixMonth || []).length;
  document.getElementById('phase-12-count').textContent = (r.oneYear || []).length;

  // Target Career Banner (top recommendation)
  const topCareer = (data.careerRecommendations || [])[0];
  if (topCareer) {
    document.getElementById('target-career-banner').style.display = 'block';
    document.getElementById('target-career-name').textContent = topCareer.title;
    document.getElementById('target-career-match').innerHTML = `
      <div class="score">${topCareer.match}%</div>
      <div class="label">Match</div>
    `;
  }

  // Focus Skills (all skill gaps from top 3 careers)
  const skillGaps = new Set();
  (data.careerRecommendations || []).slice(0, 3).forEach(c => {
    (c.skillGaps || []).forEach(g => skillGaps.add(g));
  });
  const focusContainer = document.getElementById('focus-skills-grid');
  if (focusContainer && skillGaps.size > 0) {
    focusContainer.innerHTML = [...skillGaps].map(g => `
      <div style="display:flex;align-items:center;gap:8px;padding:10px 16px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:var(--radius-full);">
        <span style="font-size:0.9rem;">⚠</span>
        <span style="font-size:0.87rem;color:#fcd34d;font-weight:600;">${g}</span>
      </div>
    `).join('');
  }

  // Growth Prediction
  const growthEl = document.getElementById('growth-prediction-text');
  if (growthEl) growthEl.textContent = data.growthPrediction || '';

  // Render initial phase
  switchPhase('threeMonth');
}

window.switchPhase = function(phase) {
  currentPhase = phase;

  // Update tabs
  ['threeMonth', 'sixMonth', 'oneYear'].forEach(p => {
    const tab = document.getElementById(`tab-${p}`);
    if (tab) tab.classList.toggle('active', p === phase);
  });

  // Update phase cards highlight
  const cardMap = { threeMonth: '3', sixMonth: '6', oneYear: '12' };
  Object.entries(cardMap).forEach(([p, num]) => {
    const card = document.getElementById(`phase-card-${num}`);
    if (card) card.style.borderColor = p === phase ? 'rgba(124,58,237,0.4)' : 'var(--color-border)';
  });

  // Phase description
  const descEl = document.getElementById('phase-desc-text');
  if (descEl) descEl.innerHTML = phaseDescriptions[phase] || '';

  // Render timeline
  renderTimeline(phase);
};

function renderTimeline(phase) {
  const timeline = document.getElementById('roadmap-timeline');
  if (!timeline) return;

  const items = analysisData?.roadmap?.[phase] || [];

  if (items.length === 0) {
    timeline.innerHTML = '<p style="color:var(--text-muted);">No items for this phase.</p>';
    return;
  }

  timeline.innerHTML = items.map((item, i) => `
    <div class="timeline-item" style="animation-delay: ${i * 0.15}s;">
      <div class="timeline-dot"></div>
      <div class="card" style="padding: var(--space-xl);">
        <h3 class="timeline-title">${item.title}</h3>
        <p class="timeline-desc">${item.description}</p>

        ${item.skills?.length ? `
          <div style="margin-bottom: var(--space-md);">
            <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:8px;">🛠️ Skills to Develop</div>
            <div class="tags-row">
              ${item.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
            </div>
          </div>` : ''}

        ${item.resources?.length ? `
          <div style="margin-bottom: var(--space-md);">
            <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted);margin-bottom:8px;">📚 Resources</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${item.resources.map(r => `
                <span style="padding:4px 12px;background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.2);border-radius:var(--radius-full);font-size:0.78rem;color:var(--cyan-lt);">
                  📖 ${r}
                </span>
              `).join('')}
            </div>
          </div>` : ''}

        ${item.milestone ? `
          <div class="timeline-milestone">
            <span>🏆</span> ${item.milestone}
          </div>` : ''}
      </div>
    </div>
  `).join('');

  // Trigger animations
  setTimeout(() => {
    timeline.querySelectorAll('.timeline-item').forEach((item, i) => {
      item.style.opacity = '0';
      item.style.transform = 'translateX(-20px)';
      setTimeout(() => {
        item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        item.style.opacity = '1';
        item.style.transform = 'none';
      }, i * 120);
    });
  }, 50);
}

// Init
initRoadmap();
