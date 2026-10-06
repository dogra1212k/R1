'use strict';
(() => {
  const { escape: esc, icon, toast } = R1;
  const $ = id => document.getElementById(id);
  // This is deliberately a client-side DEMO gate, not a secret or authentication.
  // A production admin must verify credentials and permissions on a backend.
  const ADMIN_PIN = '9809';
  let unlocked = false, movies = R1.catalog(), pendingConfirmation = null;
  try { unlocked = sessionStorage.getItem(R1.KEYS.admin) === 'unlocked'; } catch { /* Private browsing can disable storage. */ }
  function guard() { if (unlocked) return true; showScreen(); toast('Enter the admin code first.'); return false; }
  function showScreen() {
    $('login-panel').hidden = unlocked; $('admin-panel').hidden = !unlocked;
    if (unlocked) render();
  }
  function render() {
    const query = $('admin-search').value.trim().toLowerCase();
    $('total-movies').textContent = movies.length;
    $('total-genres').textContent = new Set(movies.map(m => m.genre)).size;
    const filtered = movies.filter(m => `${m.title} ${m.genre} ${m.year}`.toLowerCase().includes(query));
    $('admin-list').innerHTML = filtered.map(m => `<article class="admin-row">${m.poster ? `<img src="${esc(m.poster)}" alt="" width="100" height="63" loading="lazy">` : ''}<div class="admin-row-info"><h3>${esc(m.title)}${m.featured ? '<span class="admin-featured">Featured</span>' : ''}</h3><p>${m.year} · ${esc(m.genre)} · ${esc(R1.durationLabel(m.duration))}</p></div><div class="button-group"><button class="icon-button" data-edit="${esc(m.id)}" aria-label="Edit ${esc(m.title)}">${icon('edit')}</button><button class="icon-button danger-text" data-delete="${esc(m.id)}" aria-label="Delete ${esc(m.title)}">${icon('trash')}</button></div></article>`).join('');
    $('admin-empty').hidden = filtered.length > 0; $('admin-list').hidden = filtered.length === 0;
  }
  function commit(next, message) {
    movies = R1.saveCatalog(next); render(); if (message) toast(message);
  }
  function ask(title, description, action, callback) {
    $('confirm-title').textContent = title; $('confirm-description').textContent = description; $('confirm-yes').textContent = action;
    pendingConfirmation = callback; $('confirm-dialog').showModal(); $('confirm-cancel').focus();
  }
  $('confirm-cancel').addEventListener('click', () => $('confirm-dialog').close());
  $('confirm-dialog').addEventListener('close', () => { pendingConfirmation = null; });
  $('confirm-yes').addEventListener('click', () => {
    if (!guard()) return;
    const callback = pendingConfirmation; pendingConfirmation = null; $('confirm-dialog').close();
    try { callback?.(); } catch (error) { toast(error.message); }
  });
  $('login-form').addEventListener('submit', event => {
    event.preventDefault();
    if ($('admin-pin').value !== ADMIN_PIN) { $('login-error').textContent = 'Incorrect code. Please try again.'; $('admin-pin').setAttribute('aria-invalid', 'true'); $('admin-pin').value = ''; $('admin-pin').focus(); return; }
    unlocked = true; try { sessionStorage.setItem(R1.KEYS.admin, 'unlocked'); } catch { /* This tab remains unlocked until reload. */ }
    $('admin-pin').value = ''; $('admin-pin').removeAttribute('aria-invalid'); $('login-error').textContent = ''; showScreen(); $('add-movie').focus(); toast('Studio unlocked.');
  });
  $('logout-button').addEventListener('click', () => {
    unlocked = false; try { sessionStorage.removeItem(R1.KEYS.admin); } catch { /* No persisted session. */ }
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close()); showScreen(); $('admin-pin').focus();
  });
  function edit(movie) {
    if (!guard()) return;
    const form = $('movie-form'); form.reset(); $('movie-form-error').textContent = '';
    $('edit-title').textContent = movie ? 'Edit movie' : 'Add a movie';
    const values = movie || { id: '', title: '', year: new Date().getFullYear(), duration: 10, genre: 'Animation', language: 'English', video: '', poster: '', description: '', credit: '', license: 'Owned by me', source: '', featured: movies.length === 0 };
    for (const [name, value] of Object.entries(values)) {
      const field = form.elements.namedItem(name); if (!field) continue;
      if (field.type === 'checkbox') field.checked = value === true;
      else field.value = value;
    }
    const genre = form.elements.namedItem('genre');
    if (!genre.value && movie) { const option = new Option(movie.genre, movie.genre); genre.add(option); genre.value = movie.genre; }
    form.elements.namedItem('rights').checked = false;
    $('edit-dialog').showModal(); form.elements.namedItem('title').focus();
  }
  $('add-movie').addEventListener('click', () => edit());
  $('admin-search').addEventListener('input', render);
  $('admin-list').addEventListener('click', event => {
    if (!guard()) return;
    const button = event.target.closest('[data-edit],[data-delete]'); if (!button) return;
    const movie = movies.find(m => m.id === (button.dataset.edit || button.dataset.delete)); if (!movie) return;
    if (button.dataset.edit) edit(movie);
    else ask('Delete movie?', `“${movie.title}” will be removed from this browser’s collection.`, 'Delete movie', () => commit(movies.filter(m => m.id !== movie.id), 'Movie deleted.'));
  });
  $('movie-form').addEventListener('submit', event => {
    event.preventDefault(); if (!guard()) return;
    const form = $('movie-form'); if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    const existing = movies.find(m => m.id === data.id);
    try {
      const id = existing?.id || `movie-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
      const movie = R1.validateMovie({ ...data, id, featured: data.featured === 'on', backdrop: existing && data.poster === existing.poster ? existing.backdrop : data.poster, added: existing?.added || Date.now() });
      const next = movies.filter(m => m.id !== movie.id).map(m => movie.featured ? { ...m, featured: false } : m);
      next.push(movie); commit(next, existing ? 'Movie updated.' : 'Movie added.'); $('edit-dialog').close();
    } catch (error) { $('movie-form-error').textContent = error.message; }
  });
  $('export-json').addEventListener('click', () => {
    if (!guard()) return;
    R1.download('r1-catalog-backup.json', JSON.stringify({ version: 1, movies }, null, 2), 'application/json'); toast('Catalog backup downloaded.');
  });
  $('export-catalog').addEventListener('click', () => {
    if (!guard()) return;
    const json = JSON.stringify(movies, null, 2).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    R1.download('catalog.js', `'use strict';\n// R1 Stream catalog. Keep film credits and license information with each entry.\nwindow.R1_DEFAULT_MOVIES = ${json};\n`, 'text/javascript');
    toast('Replace js/catalog.js in your repo with this file to publish.');
  });
  $('import-json').addEventListener('click', () => { if (guard()) $('import-file').click(); });
  $('import-file').addEventListener('change', async event => {
    if (!guard()) return;
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('Use a JSON backup smaller than 1 MB.');
      const input = JSON.parse(await file.text());
      if (!guard()) return;
      const imported = R1.validateCatalog(Array.isArray(input) ? input : input.movies);
      ask('Replace your collection?', `This backup contains ${imported.length} movies. It will replace all ${movies.length} movies currently saved in this browser. Export a backup first if you want to keep them.`, 'Import collection', () => commit(imported, 'Catalog imported.'));
    } catch (error) { toast(error instanceof SyntaxError ? 'This file is not valid JSON.' : error.message); }
  });
  $('reset-catalog').addEventListener('click', () => {
    if (!guard()) return;
    ask('Restore starter collection?', 'This replaces your local movie edits with the collection shipped with the app. Your watchlist and history stay on this device.', 'Restore collection', () => commit(window.R1_DEFAULT_MOVIES, 'Starter collection restored.'));
  });
  window.addEventListener('storage', event => { if (event.key === R1.KEYS.catalog || event.key === null) { movies = R1.catalog(); if (unlocked) render(); } });
  showScreen();
})();
