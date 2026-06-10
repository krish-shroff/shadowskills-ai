// =============================================
// GLOBAL UTILITIES — main.js  (updated)
// =============================================

const Auth = {
  getToken: () => localStorage.getItem('token'),
  getUser:  () => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } },
  isLoggedIn: () => !!localStorage.getItem('token'),
  logout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  }
};
window.Auth   = Auth;
window.logout = () => Auth.logout();

// API helper
window.api = {
  async request(path, options = {}) {
    const token   = Auth.getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res  = await fetch(path, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  get:    (path)       => window.api.request(path),
  post:   (path, body) => window.api.request(path, { method:'POST', body: JSON.stringify(body) }),
  delete: (path)       => window.api.request(path, { method:'DELETE' })
};

// ── Dynamic Navbar ──────────────────────────────────────────────────────────
function buildNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  // Scroll effect
  window.addEventListener('scroll', () =>
    navbar.classList.toggle('scrolled', window.scrollY > 20));

  const actions = navbar.querySelector('.nav-actions');
  if (!actions) return;

  // Wipe and rebuild nav-actions based on auth state
  if (Auth.isLoggedIn()) {
    const user   = Auth.getUser();
    const initials = user?.name ? user.name.charAt(0).toUpperCase() : '?';

    actions.innerHTML = `
      <a href="/analyze.html"   class="btn btn-ghost  btn-sm" id="nav-analyze">Analyze</a>
      <a href="/dashboard.html" class="btn btn-ghost  btn-sm" id="nav-dashboard">Dashboard</a>
      <div class="nav-user" style="display:flex;align-items:center;gap:10px;">
        <div style="
          width:34px;height:34px;border-radius:50%;
          background:var(--grad-primary);
          display:flex;align-items:center;justify-content:center;
          font-weight:800;font-size:0.85rem;color:#fff;cursor:default;
          border:2px solid rgba(124,58,237,0.4);
        " title="${user?.name || ''}">${initials}</div>
        <button
          id="nav-logout-btn"
          onclick="confirmLogout()"
          class="btn btn-sm"
          style="
            background:rgba(239,68,68,0.1);
            border:1px solid rgba(239,68,68,0.25);
            color:#fca5a5;
            font-size:0.8rem;
            padding:6px 14px;
            border-radius:var(--radius-full);
            cursor:pointer;
            transition:all 0.2s ease;
          "
          onmouseover="this.style.background='rgba(239,68,68,0.2)'"
          onmouseout="this.style.background='rgba(239,68,68,0.1)'"
        >
          Sign Out
        </button>
      </div>
    `;
  } else {
    // Not logged in — ensure login button is visible
    if (!document.getElementById('nav-login-btn')) {
      actions.innerHTML = `
        <a href="/analyze.html" class="btn btn-ghost btn-sm">Try Free</a>
        <a href="/login.html"   class="btn btn-primary btn-sm" id="nav-login-btn">Sign In</a>
      `;
    }
  }
}

window.confirmLogout = () => {
  // Quick toast confirmation then log out
  if (confirm('Sign out of ShadowSkills AI?')) Auth.logout();
};

buildNavbar();

// ── Scroll-triggered fade-in ───────────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ── Animated counter ────────────────────────────────────────────────────────
window.animateCounter = (el, target) => {
  const start = Date.now(), dur = 1500;
  const tick = () => {
    const p = Math.min((Date.now() - start) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
document.querySelectorAll('.hero-stat .stat-number[data-target]').forEach(el => {
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { animateCounter(el, +el.dataset.target); }
  }, { threshold: 0.5 }).observe(el);
});

// ── Particles canvas ─────────────────────────────────────────────────────
const canvas = document.getElementById('particles-canvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  let W = canvas.width  = window.innerWidth;
  let H = canvas.height = window.innerHeight;
  window.addEventListener('resize', () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });

  const pts = Array.from({ length: 70 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4,
    r: Math.random() * 2 + .5,
    color: Math.random() > .5 ? '#7c3aed' : '#06b6d4'
  }));

  (function draw() {
    ctx.clearRect(0, 0, W, H);
    pts.forEach(p => {
      p.x = (p.x + p.vx + W) % W;
      p.y = (p.y + p.vy + H) % H;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = p.color + '55'; ctx.fill();
    });
    pts.forEach((a, i) => pts.slice(i+1).forEach(b => {
      const d = Math.hypot(a.x-b.x, a.y-b.y);
      if (d < 100) {
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
        ctx.strokeStyle = `rgba(124,58,237,${.07*(1-d/100)})`; ctx.lineWidth=.5; ctx.stroke();
      }
    }));
    requestAnimationFrame(draw);
  })();
}

// ── Gauge animator ──────────────────────────────────────────────────────────
window.animateGauge = (score) => {
  const fill    = document.getElementById('gauge-fill');
  const scoreEl = document.getElementById('gauge-score');
  if (!fill || !scoreEl) return;
  const circ = 2 * Math.PI * 90;
  setTimeout(() => {
    fill.style.strokeDashoffset = circ * (1 - score / 100);
    animateCounter(scoreEl, score);
  }, 300);
};

// ── Radar chart ─────────────────────────────────────────────────────────────
window.createRadarChart = (id, labels, data) => {
  const el = document.getElementById(id);
  if (!el) return;
  if (el._chartInstance) el._chartInstance.destroy();
  el._chartInstance = new Chart(el, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: 'rgba(124,58,237,.15)',
        borderColor: '#7c3aed', borderWidth: 2,
        pointBackgroundColor: '#06b6d4', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          min:0, max:100,
          ticks: { display: false },
          grid:       { color: 'rgba(255,255,255,.08)' },
          angleLines: { color: 'rgba(255,255,255,.08)' },
          pointLabels:{ color: '#94a3b8', font:{ size:12, family:'Inter' } }
        }
      },
      plugins: { legend: { display: false } },
      animation: { duration: 1000, easing: 'easeInOutQuart' }
    }
  });
};

// ── Toast ───────────────────────────────────────────────────────────────────
window.showToast = (message, type = 'success') => {
  document.getElementById('toast')?.remove();
  const t = document.createElement('div');
  t.id = 'toast';
  Object.assign(t.style, {
    position:'fixed', bottom:'24px', right:'24px', zIndex:'9999',
    padding:'14px 20px', borderRadius:'12px', fontSize:'.9rem', fontWeight:'600',
    background: type==='success' ? 'rgba(16,185,129,.9)' : 'rgba(239,68,68,.9)',
    color:'#fff', backdropFilter:'blur(8px)',
    boxShadow:'0 8px 32px rgba(0,0,0,.4)', animation:'fadeInUp .3s ease',
    maxWidth:'320px'
  });
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
};

// ── Format date ──────────────────────────────────────────────────────────────
window.formatDate = (d) => d
  ? new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })
  : 'N/A';
