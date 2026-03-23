/* ═══════════════════════════════════════════════════════════════
   ECONEWS — Main JavaScript
   Theme toggle · Router · Scroll animations · Quiz logic
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── THEME ───────────────────────────────────────────────────────
const Theme = (() => {
  const KEY = 'econews-theme';
  let current = localStorage.getItem(KEY) || 'dark';

  function apply(t) {
    current = t;
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(KEY, t);
    // Update toggle label
    const lbl = document.getElementById('theme-label');
    if (lbl) lbl.textContent = t === 'dark' ? 'Dark' : 'Light';
  }

  function toggle() {
    apply(current === 'dark' ? 'light' : 'dark');
    // Animate the whole page with a brief flash
    document.body.style.transition = 'background-color 0.4s ease, color 0.4s ease';
  }

  function init() { apply(current); }

  return { init, toggle, current: () => current };
})();

// ─── ROUTER ──────────────────────────────────────────────────────
const Router = (() => {
  const pages = [
    { key: 'home',         title: 'The Daily Economic',       file: 'pages/home.html' },
    { key: 'time-value',   title: 'Time Value of Money',       file: 'pages/time-value.html' },
    { key: 'interest',     title: 'Interest & Formulae',       file: 'pages/interest.html' },
    { key: 'cashflow',     title: 'Cash Flow & Diagrams',      file: 'pages/cashflow.html' },
    { key: 'depreciation', title: 'Depreciation & Depletion',  file: 'pages/depreciation.html' },
    { key: 'breakeven',    title: 'Break-Even Analysis',       file: 'pages/breakeven.html' },
    { key: 'present-worth',title: 'Present & Future Worth',    file: 'pages/present-worth.html' },
    { key: 'annuities',    title: 'Annuities & Series',        file: 'pages/annuities.html' },
    { key: 'rates',        title: 'Rate of Return & MARR',     file: 'pages/rates.html' },
    { key: 'glossary',     title: 'Quick Review & Glossary',   file: 'pages/glossary.html' },
  ];

  let currentKey = 'home';
  const cache = {};

  async function loadPage(key) {
    if (cache[key]) return cache[key];
    const pg = pages.find(p => p.key === key);
    if (!pg) return '<p>Page not found.</p>';
    try {
      const res = await fetch(pg.file);
      if (!res.ok) throw new Error('404');
      const html = await res.text();
      cache[key] = html;
      return html;
    } catch (e) {
      return `<div class="page-content"><p style="color:var(--accent-red);font-family:var(--font-body)">Could not load page: ${key}</p></div>`;
    }
  }

  async function goTo(key) {
    if (key === currentKey) return;
    const pg = pages.find(p => p.key === key);
    if (!pg) return;

    // Show loading
    const outlet = document.getElementById('page-outlet');
    outlet.style.opacity = '0';
    outlet.style.transform = 'translateY(8px)';
    outlet.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

    const html = await loadPage(key);
    currentKey = key;

    outlet.innerHTML = html;
    outlet.style.opacity = '1';
    outlet.style.transform = 'translateY(0)';

    // Update nav highlights
    updateNav(key);
    updateTopbarTitle(pg.title);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Re-run animations
    setTimeout(() => {
      Animations.observe();
      if (key === 'glossary') Glossary.init();
    }, 50);

    // Close mobile sidebar
    Sidebar.close();
  }

  function updateNav(key) {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === key);
    });
    document.querySelectorAll('.topbar-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === key);
    });
  }

  function updateTopbarTitle(title) {
    const el = document.getElementById('topbar-page-name');
    if (el) el.textContent = title;
  }

  function init() {
    // Attach nav click handlers
    document.querySelectorAll('[data-page]').forEach(el => {
      el.addEventListener('click', () => goTo(el.dataset.page));
    });
    // Load home
    loadPage('home').then(html => {
      const outlet = document.getElementById('page-outlet');
      outlet.innerHTML = html;
      updateNav('home');
      setTimeout(() => { Animations.observe(); }, 50);
    });
  }

  return { init, goTo, currentKey: () => currentKey };
})();

// ─── SIDEBAR ─────────────────────────────────────────────────────
const Sidebar = (() => {
  function toggle() {
    document.getElementById('sidebar').classList.toggle('open');
  }
  function close() {
    document.getElementById('sidebar').classList.remove('open');
  }
  return { toggle, close };
})();

// ─── READING PROGRESS ────────────────────────────────────────────
const Progress = (() => {
  function update() {
    const el = document.documentElement;
    const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
    const bar = document.getElementById('reading-progress');
    if (bar) bar.style.width = Math.min(pct, 100) + '%';
  }
  function init() {
    window.addEventListener('scroll', update, { passive: true });
  }
  return { init };
})();

// ─── SCROLL ANIMATIONS ───────────────────────────────────────────
const Animations = (() => {
  let observer;

  function observe() {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.fade-in, .slide-in-left').forEach(el => {
      observer.observe(el);
    });

    // Animate counters
    document.querySelectorAll('[data-counter]').forEach(el => {
      animateCounter(el);
    });
  }

  function animateCounter(el) {
    const target = parseFloat(el.dataset.counter);
    const suffix = el.dataset.suffix || '';
    const duration = 1200;
    const start = performance.now();
    const isFloat = String(target).includes('.');

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = eased * target;
      el.textContent = (isFloat ? value.toFixed(2) : Math.floor(value)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  return { observe };
})();

// ─── QUIZ LOGIC ──────────────────────────────────────────────────
const Quiz = (() => {
  function reveal(btn) {
    const ans = btn.nextElementSibling;
    const isShown = ans.classList.contains('show');
    ans.classList.toggle('show', !isShown);
    btn.textContent = isShown ? '▶ Reveal Answer' : '▼ Hide Answer';
  }

  // Expose globally for inline onclick
  window.revealAnswer = reveal;

  return {};
})();

// ─── GLOSSARY SEARCH ─────────────────────────────────────────────
const Glossary = (() => {
  function init() {
    const input = document.getElementById('gloss-search-input');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      document.querySelectorAll('.gloss-entry').forEach(entry => {
        const text = entry.textContent.toLowerCase();
        entry.style.display = (!q || text.includes(q)) ? '' : 'none';
      });
    });
  }
  return { init };
})();

// ─── TYPEWRITER EFFECT ───────────────────────────────────────────
const Typewriter = (() => {
  function run(el, text, speed = 40) {
    el.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
      el.textContent += text[i];
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
  }
  return { run };
})();

// ─── NEWSPAPER CLOCK ─────────────────────────────────────────────
function updateClock() {
  const el = document.getElementById('live-date');
  if (!el) return;
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  el.textContent = now.toLocaleDateString('en-GB', opts).toUpperCase();
}

// ─── FORMULA COPY ────────────────────────────────────────────────
function initFormulaCopy() {
  document.querySelectorAll('.formula-block').forEach(block => {
    block.style.cursor = 'pointer';
    block.title = 'Click to copy';
    block.addEventListener('click', () => {
      navigator.clipboard?.writeText(block.innerText).then(() => {
        const orig = block.style.borderLeftColor;
        block.style.borderLeftColor = 'var(--accent-green)';
        setTimeout(() => { block.style.borderLeftColor = orig; }, 800);
      });
    });
  });
}

// ─── INIT ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  Progress.init();
  Router.init();
  updateClock();
  setInterval(updateClock, 60000);

  // Theme toggle button
  document.getElementById('theme-toggle-btn')?.addEventListener('click', Theme.toggle);

  // Mobile sidebar toggle
  document.getElementById('mobile-toggle-btn')?.addEventListener('click', Sidebar.toggle);

  // Close sidebar on outside click
  document.addEventListener('click', e => {
    const sb = document.getElementById('sidebar');
    if (sb.classList.contains('open') && !sb.contains(e.target) && e.target.id !== 'mobile-toggle-btn') {
      Sidebar.close();
    }
  });

  // Re-init formula copy on any page load
  const outlet = document.getElementById('page-outlet');
  if (outlet) {
    const mo = new MutationObserver(() => initFormulaCopy());
    mo.observe(outlet, { childList: true });
  }
});

// Expose for inline onclick in pages
window.goTo = (key) => Router.goTo(key);
window.toggleSidebar = () => Sidebar.toggle();
