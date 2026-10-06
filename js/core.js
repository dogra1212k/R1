'use strict';
(() => {
  const KEYS = Object.freeze({ catalog: 'r1.catalog.v1', list: 'r1.list.v1', history: 'r1.history.v1', admin: 'r1.admin.session' });
  const paths = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    play: '<path d="m8 4 12 8-12 8z" fill="currentColor" stroke="none"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
    film: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M7 12h10"/>',
    ticket: '<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM8 7v2m0 2v2m0 2v2"/>',
    edit: '<path d="m14 5 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',
    'arrow-left': '<path d="m10 5-7 7 7 7M3 12h18"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.film}</svg>`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function fillIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
  function read(key, fallback) { try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); } catch { return fallback; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { throw new Error('Could not save. Browser storage is full or disabled. Export a backup before clearing data.'); } }
  function httpsURL(value, optional = false) {
    if (!value && optional) return '';
    let url;
    try { url = new URL(String(value)); } catch { throw new Error('Use a complete HTTPS link.'); }
    if (url.protocol !== 'https:' || url.username || url.password || String(value).length > 2000) throw new Error('Only public HTTPS links without passwords are supported.');
    return url.href;
  }
  function parseVideo(value) {
    const url = new URL(httpsURL(value));
    const host = url.hostname.toLowerCase();
    const youtube = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];
    let id;
    if (host === 'youtu.be') id = url.pathname.slice(1);
    else if (youtube.includes(host)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else if (/^\/(embed|shorts)\//.test(url.pathname)) id = url.pathname.split('/')[2];
    }
    if (id && /^[\w-]{11}$/.test(id)) return { type: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}` };
    if (youtube.includes(host) || host === 'youtu.be') throw new Error('Use a valid YouTube video link, not a channel or playlist.');
    if (!/\.(mp4|webm)$/i.test(url.pathname)) throw new Error('Use an official YouTube link or a direct .mp4 / .webm video link.');
    return { type: 'file', url: url.href };
  }
  function imageURL(value) {
    if (!value) return '';
    if (/^assets\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpg|jpeg|svg)$/i.test(value) && !value.includes('..')) return value;
    return httpsURL(value);
  }
  function requiredText(value, name, length) {
    if (typeof value !== 'string' || !value.trim() || value.length > length) throw new Error(`${name} is required (maximum ${length} characters).`);
    return value.trim();
  }
  function validateMovie(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('A movie entry must be an object.');
    const id = requiredText(raw.id, 'Movie ID', 80);
    if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id)) throw new Error('Movie IDs may contain letters, numbers, hyphens and underscores.');
    const year = Number(raw.year), duration = Number(raw.duration);
    if (!Number.isInteger(year) || year < 1888 || year > 2100) throw new Error('Enter a valid release year (1888–2100).');
    if (!Number.isInteger(duration) || duration < 1 || duration > 1000) throw new Error('Movie length must be 1–1000 minutes.');
    const video = parseVideo(raw.video);
    const movie = {
      id, title: requiredText(raw.title, 'Title', 100), year, duration,
      genre: requiredText(raw.genre, 'Genre', 40), language: requiredText(raw.language, 'Audio language', 40),
      description: requiredText(raw.description, 'Description', 1000), video: video.url,
      poster: imageURL(raw.poster), backdrop: imageURL(raw.backdrop || raw.poster),
      credit: requiredText(raw.credit, 'Creator credit', 200), license: requiredText(raw.license, 'License', 100),
      source: httpsURL(raw.source, true), licenseUrl: httpsURL(raw.licenseUrl, true),
      featured: raw.featured === true, added: Number.isFinite(raw.added) ? raw.added : Date.now()
    };
    return movie;
  }
  function validateCatalog(raw) {
    if (!Array.isArray(raw) || raw.length > 500) throw new Error('A catalog must be an array of up to 500 movies.');
    const movies = raw.map(validateMovie);
    if (new Set(movies.map(m => m.id)).size !== movies.length) throw new Error('Every movie needs a unique ID.');
    return movies;
  }
  function catalog() {
    const saved = read(KEYS.catalog, null);
    if (saved !== null) { try { return validateCatalog(saved); } catch { /* A damaged backup never breaks the app. */ } }
    return validateCatalog(window.R1_DEFAULT_MOVIES || []);
  }
  function saveCatalog(movies) { const valid = validateCatalog(movies); write(KEYS.catalog, valid); return valid; }
  function getList() { const value = read(KEYS.list, []); return Array.isArray(value) ? value.filter(id => typeof id === 'string') : []; }
  function toggleList(id) {
    const current = getList(); const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
    write(KEYS.list, next); return next.includes(id);
  }
  function getHistory() {
    const value = read(KEYS.history, []);
    return Array.isArray(value) ? value.filter(item => item && typeof item.id === 'string' && Number.isFinite(item.opened)).slice(0, 50) : [];
  }
  function remember(id, time, duration) {
    const history = getHistory(), previous = history.find(entry => entry.id === id);
    const item = { id, opened: Date.now(), time: Number.isFinite(time) ? Math.max(0, time) : previous?.time || 0, duration: Number.isFinite(duration) ? Math.max(0, duration) : previous?.duration || 0 };
    write(KEYS.history, [item, ...history.filter(entry => entry.id !== id)].slice(0, 50));
  }
  let toastTimer;
  function toast(message) {
    const el = document.getElementById('toast'); if (!el) return;
    el.textContent = message; el.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
  }
  function download(name, content, mime) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function durationLabel(minutes) { return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ''}`.trim() : `${minutes} min`; }
  function initializeUI() {
    fillIcons();
    document.addEventListener('click', event => {
      const close = event.target.closest('[data-close]');
      if (close) document.getElementById(close.dataset.close)?.close();
    });
    document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }));
    document.addEventListener('error', event => { if (event.target instanceof HTMLImageElement) event.target.classList.add('failed'); }, true);
  }
  window.R1 = Object.freeze({ KEYS, icon, escape, fillIcons, read, write, httpsURL, parseVideo, imageURL, validateMovie, validateCatalog, catalog, saveCatalog, getList, toggleList, getHistory, remember, toast, download, durationLabel });
  initializeUI();
})();
