// Hero flip: scroll-driven wave; crossing the trigger plays one full locked step (old wheel/touch trap removed).
// Clear stale anchor links; every entry starts at the hero.
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
const hero = document.querySelector('.hero');
const stage = document.querySelector('.hero-stage');
const grid = document.querySelector('#tiles');
// ?raw: bare-scroll diagnostic mode, no JS scroll control at all.
const RAW = new URLSearchParams(location.search).has('raw');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobile = window.matchMedia('(max-width:700px)');
let back = false;

// Flip thresholds come from the CSS params block on .hero-stage (style.css).
const cssNum = (name, fallback) => {
  const raw = getComputedStyle(stage).getPropertyValue(name).trim();
  // "1.1s" → 1100 (ms); px and plain numbers pass through.
  const value = parseFloat(raw) * (/^[\d.]+s$/i.test(raw) ? 1000 : 1);
  return Number.isFinite(value) ? value : fallback;
};
const TRIGGER = cssNum('--flip-trigger', 64);

function peekTile(tile) {
  if (back || window.scrollY > 4 || reducedMotion.matches || tile.classList.contains('peek')) return;
  tile.classList.add('peek');
  setTimeout(() => tile.classList.remove('peek'), 1400);
}
let flipDistance = 1;
function rebuildMetrics() {
  flipDistance = Math.max(stage.offsetHeight - hero.offsetHeight, 1);
}
function buildGrid() {
  grid.replaceChildren();
  const cols = mobile.matches ? 3 : 6, rows = 6;
  Array.from({ length: cols * rows }, (_, i) => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.style.setProperty('--col', `${i % cols}`);
    tile.style.setProperty('--row', `${Math.floor(i / cols)}`);
    tile.style.setProperty('--wave', `${(((i % cols) + Math.floor(i / cols)) / (cols + 4)).toFixed(4)}`);
    for (const side of ['front', 'back']) {
      const face = document.createElement('div');
      face.className = `face ${side}`;
      face.append(document.querySelector(`#${side}-scene`).content.cloneNode(true));
      tile.append(face);
    }
    tile.addEventListener('pointerenter', e => {
      if (e.pointerType === 'mouse') peekTile(tile);
    });
    let tapStart = null;
    tile.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' && e.isPrimary !== false) {
        tapStart = { id: e.pointerId, x: e.clientX, y: e.clientY };
      }
    }, { passive: true });
    tile.addEventListener('pointerup', e => {
      const start = tapStart; tapStart = null;
      if (start && e.pointerId === start.id && Math.hypot(e.clientX - start.x, e.clientY - start.y) <= 10) {
        peekTile(tile);
      }
    }, { passive: true });
    tile.addEventListener('pointercancel', () => { tapStart = null; }, { passive: true });
    tile.addEventListener('animationend', () => tile.classList.remove('peek'));
    grid.append(tile);
    return tile;
  });
  rebuildMetrics();
}
function setSide(next) {
  if (next === back) return;
  back = next;
  hero.classList.toggle('is-back', back);
  document.querySelector('#about').setAttribute('aria-hidden', String(!back));
  document.querySelector('#hero-title').setAttribute('aria-hidden', String(back));
  document.querySelector('#scroll-text').textContent = back ? 'SCROLL TO DISCOVER' : 'SCROLL TO EXPLORE';
  document.querySelector('.scroll').href = back ? '#team' : '#about';
  document.querySelector('.scroll').setAttribute('aria-label', back ? '查看团队与项目' : '了解一梦');
}
function render() {
  const y = window.scrollY;
  const p = Math.min(Math.max(y / flipDistance, 0), 1);
  hero.classList.toggle('is-settled-back', p >= 0.98);
  setSide(p >= 0.5);
  debugUpdate();
}
let rafId = 0, scrollDir = 0, dirMark = window.scrollY, settleTimer = 0;
let busy = false, glidePos = null, glideToken = 0, navGuard = 0;
let touching = false;
const GLIDE_MS = cssNum('--flip-glide', 1100);
function finishGlide() {
  busy = false;
  glidePos = null;
  dirMark = window.scrollY;
  render();
}
// Self-timed flip that locks the page while it runs: one trigger = one full screen.
function glide(target) {
  if (busy || RAW) return;
  debugNote(`glide→${target}`);
  const from = window.scrollY, delta = target - from;
  if (reducedMotion.matches || !GLIDE_MS || Math.abs(delta) < 2) {
    window.scrollTo({ top: target, behavior: 'instant' });
    finishGlide();
    return;
  }
  const token = ++glideToken;
  const duration = Math.max(120, GLIDE_MS * Math.min(1, Math.abs(delta) / flipDistance));
  const t0 = performance.now();
  busy = true;
  glidePos = from;
  const step = now => {
    if (token !== glideToken) return;
    const k = Math.min((now - t0) / duration, 1);
    glidePos = from + delta * (1 - (1 - k) ** 3);
    window.scrollTo({ top: glidePos, behavior: 'instant' });
    if (k < 1) requestAnimationFrame(step);
    else finishGlide();
  };
  requestAnimationFrame(step);
}
window.addEventListener('wheel', e => { if (busy && !e.ctrlKey) e.preventDefault(); }, { passive: false });
// Touch: the finger owns the scroll (incl. momentum); the flip resumes once it rests.
let touchMode = false;
function abortGlide() {
  if (!busy) return;
  glideToken++;
  busy = false;
  glidePos = null;
  dirMark = window.scrollY;
}
window.addEventListener('touchstart', () => { touchMode = true; touching = true; abortGlide(); }, { passive: true });
const endTouch = () => { touching = false; clearTimeout(settleTimer); settleTimer = setTimeout(settle, 120); };
window.addEventListener('touchend', endTouch, { passive: true });
window.addEventListener('touchcancel', endTouch, { passive: true });
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  // Glide running: skip direction/trigger/settle below.
  if (busy) {
    if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; render(); });
    return;
  }
  // 12px hysteresis: sub-threshold jitter at the end of a flick keeps the previous direction.
  if (y - dirMark >= 12) { scrollDir = 1; dirMark = y; }
  else if (y - dirMark <= -12) { scrollDir = -1; dirMark = y; }
  // Crossing the trigger line plays the whole flip: one scroll = one screen (wheel only; touch settles when it rests).
  if (performance.now() > navGuard && scrollDir !== 0 && y > TRIGGER && y < flipDistance - TRIGGER && !touching && !touchMode) {
    glide(scrollDir > 0 ? flipDistance : 0);
  }
  if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; render(); });
  clearTimeout(settleTimer);
  settleTimer = setTimeout(settle, 100);
}, { passive: true });
if ('onscrollend' in window) window.addEventListener('scrollend', settle);
// A rest inside the flip zone settles across the trigger line.
function settle() {
  if (busy || touching) return;
  const y = window.scrollY;
  if (y <= 0 || y >= flipDistance) return;
  debugNote(`settle y=${Math.round(y)}`);
  const forward = scrollDir > 0 ? y > TRIGGER : y >= flipDistance - TRIGGER;
  glide(forward ? flipDistance : 0);
}
window.addEventListener('resize', () => { rebuildMetrics(); render(); });
mobile.addEventListener('change', () => { buildGrid(); render(); });
function goTo(top) {
  navGuard = performance.now() + 1500;
  window.scrollTo({ top, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
document.querySelectorAll('a[href="#about"]').forEach(a => a.addEventListener('click', e => {
  if (a.getAttribute('href') === '#team') { e.preventDefault(); openSection('#team'); return; }
  e.preventDefault(); glide(flipDistance);
}));
document.querySelectorAll('a[href="#top"]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault(); goTo(0);
}));
function openSection(hash) {
  const target = document.querySelector(hash);
  if (!target) return;
  navGuard = performance.now() + 1500;
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
document.querySelectorAll('a[href="#team"],a[href="#projects"],a[href="#capabilities"]').forEach(a => a.addEventListener('click', e => {
  e.preventDefault(); openSection(a.getAttribute('href'));
}));
// Debug overlay for feel testing: add ?debug to the URL.
const debugPanel = new URLSearchParams(location.search).has('debug') ? document.createElement('div') : null;
if (debugPanel) {
  debugPanel.id = 'debug-panel';
  debugPanel.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;padding:6px 8px;background:#000c;color:#fff;font:12px/1.5 monospace;white-space:pre;pointer-events:none';
  document.body.append(debugPanel);
}
let debugLines = [];
function debugNote(text) { if (debugPanel) debugLines = [...debugLines.slice(-7), text]; }
function debugUpdate() {
  if (!debugPanel) return;
  const first = document.querySelector('.tile');
  const range = first ? (getComputedStyle(first).animationRange || 'n/a') : '-';
  debugPanel.textContent = `y=${Math.round(window.scrollY)} D=${Math.round(flipDistance)} p=${(window.scrollY / flipDistance).toFixed(2)} dir=${scrollDir} busy=${busy ? 1 : 0} glide=${glidePos === null ? '-' : Math.round(glidePos)}\nrange0=${String(range).replace(/\s+/g, ' ')}\n${debugLines.join('\n')}`;
}
history.scrollRestoration = 'manual';
buildGrid();
render();
window.addEventListener('load', () => {
  if (!RAW) window.scrollTo({ top: 0, behavior: 'instant' });
  render();
});

// Full-width project rows are native <details>; the shared name keeps one open at a time.
const projectRows = [...document.querySelectorAll('.project-row')];
const projectToggles = projectRows.map(row => row.querySelector('summary'));
// One accessible summary label (number + title + one-line).
projectToggles.forEach(summary => {
  const title = summary.querySelector('.project-name').textContent;
  summary.setAttribute('aria-label', [
    summary.querySelector('.project-number').textContent,
    title,
    summary.querySelector('.project-one-line').textContent
  ].join(' '));
});
projectToggles.forEach((summary, index) => {
  summary.addEventListener('keydown', e => {
    let next = index;
    if (e.key === 'ArrowDown') next = (index + 1) % projectToggles.length;
    else if (e.key === 'ArrowUp') next = (index + projectToggles.length - 1) % projectToggles.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = projectToggles.length - 1;
    else return;
    e.preventDefault(); projectToggles[next].focus();
  });
});

// PROJECTS title: stroke copies that gather into the solid word near the top.
const titleBox = document.querySelector('.projects-title');
if (titleBox) {
  const text = titleBox.textContent.trim();
  const LAYERS = 5;
  titleBox.setAttribute('aria-label', text);
  titleBox.replaceChildren(...Array.from({ length: LAYERS }, (_, i) => {
    const layer = document.createElement('span');
    layer.className = 'title-layer';
    layer.style.setProperty('--rep', i);
    layer.textContent = text;
    if (i === 0) layer.dataset.core = '';
    else layer.setAttribute('aria-hidden', 'true');
    return layer;
  }));
}
