'use strict';
(() => {
  const { escape: esc, icon, durationLabel: length, toast } = R1;
  const $ = id => document.getElementById(id);
  let movies = R1.catalog(), currentGenre = 'All', currentView = 'home', detailId = null, playingId = null, savedAt = 0;
  const viewNames = { home: 'Home', movies: 'Movies', latest: 'Latest releases', watchlist: 'My list' };
  const compare = {
    featured: (a, b) => Number(b.featured) - Number(a.featured) || b.added - a.added,
    newest: (a, b) => b.year - a.year || b.added - a.added,
    title: (a, b) => a.title.localeCompare(b.title),
    shortest: (a, b) => a.duration - b.duration
  };
  function metadata(movie) { return `<span>${movie.year}</span><span>${esc(length(movie.duration))}</span><span>${esc(movie.genre)}</span><span class="meta-tag">FREE</span>`; }
  function listButton(movie, compact = false) {
    const saved = R1.getList().includes(movie.id);
    return `<button class="${compact ? 'card-bookmark' : 'button button-quiet'}" data-list="${esc(movie.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remove' : 'Add'} ${esc(movie.title)} ${saved ? 'from' : 'to'} my list">${icon(saved ? 'check' : 'plus')}${compact ? '' : saved ? 'In my list' : 'My list'}</button>`;
  }
  function card(movie, showProgress = false) {
    const progress = showProgress ? R1.getHistory().find(item => item.id === movie.id) : null;
    const percent = progress?.duration > 0 ? Math.min(100, Math.max(0, (progress.time / progress.duration) * 100)) : 0;
    return `<article class="movie-card"><div class="card-art"><div class="card-fallback" aria-hidden="true">R1</div>${movie.poster ? `<img src="${esc(movie.poster)}" alt="" loading="lazy" width="640" height="400">` : ''}<button class="card-details-button" data-details="${esc(movie.id)}" aria-label="View ${esc(movie.title)} details"></button>${movie.featured ? '<span class="card-flag">OUR PICK</span>' : ''}<span class="card-overlay"><span class="card-play">${icon('play')}</span></span>${listButton(movie, true)}${percent > 0 ? `<div class="card-progress" aria-label="${Math.round(percent)} percent watched"><span style="width:${percent}%"></span></div>` : ''}</div><div class="card-text"><h3 class="card-title">${esc(movie.title)}</h3><p class="card-meta"><span>${movie.year}</span><span>${esc(movie.genre)}</span><span>${esc(length(movie.duration))}</span></p></div></article>`;
  }
  function renderHero() {
    const movie = movies.find(item => item.featured) || movies[0];
    const visible = movie && currentView === 'home' && !$('search').value.trim() && currentGenre === 'All';
    $('hero').hidden = !visible;
    if (!visible) return;
    $('hero').innerHTML = `${movie.backdrop ? `<img class="hero-art" src="${esc(movie.backdrop)}" alt="" fetchpriority="high">` : ''}<div class="hero-content"><div class="hero-kicker"><span>R1</span><span>TONIGHT’S PICK</span></div><h2>${esc(movie.title)}</h2><div class="hero-meta">${metadata(movie)}</div><p class="hero-description">${esc(movie.description)}</p><div class="hero-buttons"><button class="button button-light" data-play="${esc(movie.id)}">${icon('play')} Watch now</button><button class="button button-quiet" data-details="${esc(movie.id)}">${icon('info')} More info</button></div></div><div class="hero-index">FREE TO WATCH<span class="active"></span></div>`;
  }
  function renderGenres() {
    const genres = ['All', ...new Set(movies.map(m => m.genre).sort())];
    if (!genres.includes(currentGenre)) currentGenre = 'All';
    $('genres').innerHTML = genres.map(genre => `<button class="genre-chip" data-genre="${esc(genre)}" aria-pressed="${currentGenre === genre}">${esc(genre)}</button>`).join('');
  }
  function render() {
    const query = $('search').value.trim().toLowerCase();
    const list = R1.getList(), savedCount = movies.filter(m => list.includes(m.id)).length;
    $('list-count').hidden = !savedCount; $('list-count').textContent = savedCount;
    document.querySelectorAll('[data-view]').forEach(link => { if (link.dataset.view === currentView) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    renderGenres(); renderHero();
    const titles = { home: 'Made for movie nights.', movies: 'Find your next favorite.', latest: 'The latest in your collection.', watchlist: 'A little something for later.' };
    const descriptions = { home: 'Open movies. Big stories. All free to watch.', movies: 'Explore every film in your collection.', latest: 'Browse by original release year. Add licensed new releases in Studio.', watchlist: 'Your saved movies, kept in this browser.' };
    $('view-title').textContent = query ? `Results for “${$('search').value.trim()}”` : titles[currentView];
    $('view-eyebrow').textContent = query ? 'SEARCH YOUR COLLECTION' : currentView === 'home' ? 'FIND YOUR NEXT FAVORITE' : viewNames[currentView].toUpperCase();
    $('view-description').textContent = descriptions[currentView];
    $('grid-heading').textContent = currentView === 'watchlist' ? 'Your saved movies' : currentView === 'latest' ? 'Latest releases' : 'The open cinema collection';
    const filtered = movies.filter(movie => (currentView !== 'watchlist' || list.includes(movie.id)) && (currentGenre === 'All' || movie.genre === currentGenre) && (!query || [movie.title, movie.description, movie.genre, movie.language, String(movie.year)].some(v => v.toLowerCase().includes(query)))).sort(compare[$('sort').value] || compare.featured);
    $('movie-grid').innerHTML = filtered.map(movie => card(movie)).join('');
    $('results-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'movie' : 'movies'}`;
    $('empty-state').hidden = filtered.length !== 0;
    $('empty-title').textContent = currentView === 'watchlist' && !savedCount ? 'Your movie night starts here.' : 'No movies found';
    $('empty-text').textContent = currentView === 'watchlist' && !savedCount ? 'Tap + on any movie to save it for later.' : 'Try another title, genre, or language.';
    $('reset-filters').textContent = currentView === 'watchlist' && !savedCount ? 'Explore movies' : 'Show all movies';
    const recent = R1.getHistory().map(item => movies.find(movie => movie.id === item.id)).filter(Boolean).slice(0, 4);
    $('history-section').hidden = !(recent.length && currentView === 'home' && !query && currentGenre === 'All');
    $('history-grid').innerHTML = recent.map(movie => card(movie, true)).join('');
    document.title = `${viewNames[currentView]} — R1 Stream`;
  }
  function details(movie) {
    detailId = movie.id;
    $('details-content').innerHTML = `${movie.backdrop ? `<img class="details-art" src="${esc(movie.backdrop)}" alt="">` : '<div class="details-art"></div>'}<div class="details-body"><h2 id="details-title">${esc(movie.title)}</h2><div class="hero-meta">${metadata(movie)}<span>${esc(movie.language)}</span></div><div class="hero-buttons"><button class="button button-primary" data-play="${esc(movie.id)}">${icon('play')} Watch now</button>${listButton(movie)}</div><p class="details-description">${esc(movie.description)}</p><p class="credit-note">${esc(movie.credit)} · ${esc(movie.license)}${movie.source ? ` · <a href="${esc(movie.source)}" target="_blank" rel="noopener noreferrer">Original film</a>` : ''}</p></div>`;
    if (!$('details-dialog').open) $('details-dialog').showModal();
  }
  function savePlayback(force = false) {
    const video = $('player-mount').querySelector('video');
    if (!video || !playingId || !Number.isFinite(video.duration)) return;
    if (!force && Date.now() - savedAt < 5000) return;
    savedAt = Date.now();
    try { R1.remember(playingId, video.currentTime, video.duration); } catch { /* Playback remains available with storage disabled. */ }
  }
  function play(movie) {
    if ($('details-dialog').open) $('details-dialog').close();
    const source = R1.parseVideo(movie.video);
    playingId = movie.id; savedAt = 0;
    $('player-title').textContent = movie.title;
    $('player-source').href = source.url;
    $('player-error').hidden = true;
    $('player-mount').replaceChildren();
    try { R1.remember(movie.id); } catch (error) { toast(error.message); }
    if (source.type === 'youtube') {
      const frame = document.createElement('iframe');
      frame.title = `${movie.title} — official film player`;
      frame.src = `https://www.youtube-nocookie.com/embed/${source.id}?autoplay=1&playsinline=1&rel=0`;
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      $('player-mount').append(frame);
      $('player-note').textContent = 'Official YouTube player. Use its controls for captions and quality. If it cannot load, open the original video.';
    } else {
      const video = document.createElement('video'); video.controls = true; video.playsInline = true; video.preload = 'metadata'; video.src = source.url;
      if (movie.poster) video.poster = movie.poster;
      const previous = R1.getHistory().find(item => item.id === movie.id);
      video.addEventListener('loadedmetadata', () => {
        if (previous?.time > 5 && previous.time < video.duration - 10) video.currentTime = previous.time;
        video.play().catch(() => { $('player-note').textContent = 'Tap the video’s play button to start.'; });
      }, { once: true });
      video.addEventListener('timeupdate', () => savePlayback());
      video.addEventListener('pause', () => savePlayback(true));
      video.addEventListener('ended', () => savePlayback(true));
      video.addEventListener('error', () => { $('player-error').textContent = 'This video could not load. Check your connection or try the original video link.'; $('player-error').hidden = false; });
      $('player-mount').append(video);
      $('player-note').textContent = 'Playback progress is saved in this browser. Use the player controls for volume and fullscreen.';
    }
    $('player-dialog').showModal();
    render();
  }
  $('player-dialog').addEventListener('close', () => {
    savePlayback(true); const video = $('player-mount').querySelector('video');
    if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
    $('player-mount').replaceChildren(); playingId = null; render();
  });
  $('details-dialog').addEventListener('close', () => { detailId = null; });
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-details],[data-play],[data-list],[data-genre]'); if (!target) return;
    if (target.dataset.genre) { currentGenre = target.dataset.genre; render(); document.querySelector(`[data-genre="${CSS.escape(currentGenre)}"]`)?.focus({ preventScroll: true }); return; }
    const id = target.dataset.details || target.dataset.play || target.dataset.list, movie = movies.find(m => m.id === id); if (!movie) return;
    if (target.dataset.details) details(movie);
    if (target.dataset.play) play(movie);
    if (target.dataset.list) {
      try { const added = R1.toggleList(id); toast(added ? 'Added to your list.' : 'Removed from your list.'); render(); if (detailId === id) { details(movie); $('details-content').querySelector('[data-list]')?.focus(); } else document.querySelector(`[data-list="${CSS.escape(id)}"]`)?.focus({ preventScroll: true }); }
      catch (error) { toast(error.message); }
    }
  });
  function navigate() {
    currentView = Object.hasOwn(viewNames, location.hash.slice(1)) ? location.hash.slice(1) : 'home';
    currentGenre = 'All'; $('search').value = ''; $('sort').value = currentView === 'latest' ? 'newest' : 'featured';
    render(); window.scrollTo({ top: 0, behavior: 'instant' });
  }
  window.addEventListener('hashchange', navigate);
  $('search').addEventListener('input', render);
  $('sort').addEventListener('change', render);
  $('search-toggle').addEventListener('click', () => {
    const open = $('search-wrap').classList.toggle('search-open'); $('search-toggle').setAttribute('aria-expanded', String(open)); if (open) $('search').focus();
  });
  $('search').addEventListener('keydown', event => { if (event.key === 'Escape') { $('search').value = ''; $('search-wrap').classList.remove('search-open'); $('search-toggle').setAttribute('aria-expanded', 'false'); render(); $('search-toggle').focus(); } });
  $('reset-filters').addEventListener('click', () => { if (location.hash !== '#movies') location.hash = 'movies'; else navigate(); });
  $('clear-history').addEventListener('click', () => { try { R1.write(R1.KEYS.history, []); render(); toast('Viewing history cleared.'); } catch (error) { toast(error.message); } });
  $('credits-button').addEventListener('click', () => {
    $('credits-list').innerHTML = movies.map(m => `<div class="credit-row"><strong>${esc(m.title)} (${m.year})</strong>${esc(m.credit)} · ${m.licenseUrl ? `<a href="${esc(m.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(m.license)}</a>` : esc(m.license)}${m.source ? ` · <a href="${esc(m.source)}" target="_blank" rel="noopener noreferrer">Source</a>` : ''}</div>`).join(''); $('credits-dialog').showModal();
  });
  window.addEventListener('storage', event => { if ([R1.KEYS.catalog, R1.KEYS.list, R1.KEYS.history].includes(event.key) || event.key === null) { movies = R1.catalog(); render(); if (detailId) { const updated = movies.find(m => m.id === detailId); if (updated) details(updated); else $('details-dialog').close(); } } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) savePlayback(true); });
  window.addEventListener('pagehide', () => savePlayback(true));
  let installPrompt;
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('install-button').hidden = false; });
  $('install-button').addEventListener('click', async () => { if (!installPrompt) return; await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('install-button').hidden = true; });
  window.addEventListener('appinstalled', () => { $('install-button').hidden = true; toast('R1 Stream is ready on your home screen.'); });
  if ('serviceWorker' in navigator && ['https:', 'http:'].includes(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  navigate();
})();
