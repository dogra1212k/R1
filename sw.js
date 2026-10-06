'use strict';
// Only cache this app's own shell. Movies, embeds and third-party requests stay online.
const CACHE = 'r1-stream-shell-v1';
const SHELL = ['./', 'index.html', 'admin.html', 'styles.css', 'js/catalog.js', 'js/core.js', 'js/app.js', 'js/admin.js', 'manifest.webmanifest', 'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('r1-stream-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url), scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname) || /\.(mp4|webm)$/i.test(url.pathname)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && response.type === 'basic') { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy))); }
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request); if (cached) return cached;
    return new Response('This file is not available offline. Reconnect and try again.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }));
});
