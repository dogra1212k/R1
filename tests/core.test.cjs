const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function app() {
  const memory = new Map();
  const sandbox = {
    window: {}, URL, Blob, setTimeout, clearTimeout,
    document: { querySelectorAll: () => [], addEventListener() {}, getElementById: () => null },
    localStorage: { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) }
  };
  vm.createContext(sandbox);
  for (const file of ['catalog.js', 'core.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file), 'utf8'), sandbox);
  return { R1: sandbox.window.R1, memory, sandbox };
}
test('official starter films have valid playback links, local artwork and attribution', () => {
  const { R1 } = app();
  const movies = R1.catalog();
  assert.equal(movies.length, 8);
  assert.equal(movies.filter(m => m.featured).length, 1);
  for (const movie of movies) {
    assert.equal(R1.parseVideo(movie.video).type, 'youtube');
    assert.ok(movie.credit && movie.source && movie.licenseUrl);
    for (const file of [movie.poster, movie.backdrop]) assert.ok(fs.existsSync(path.join(__dirname, '..', file)), file);
  }
});
test('rejects executable URLs, lookalike YouTube domains, credentials and non-video links', () => {
  const { R1 } = app();
  for (const url of ['javascript:alert(1)', 'data:text/html,bad', 'http://example.com/a.mp4', 'https://youtube.com.evil.test/watch?v=eRsGyueVLvQ', 'https://user:secret@example.com/a.mp4', 'https://youtube.com/playlist?list=abc', 'https://example.com/movie.html']) assert.throws(() => R1.parseVideo(url), url);
  assert.equal(R1.parseVideo('https://youtu.be/eRsGyueVLvQ?t=20').id, 'eRsGyueVLvQ');
  assert.equal(R1.parseVideo('https://example.com/movie.webm?token=public').type, 'file');
});
test('rejects unsafe artwork and malformed or duplicate imported records', () => {
  const { R1 } = app(); const movie = R1.catalog()[0];
  for (const url of ['javascript:alert(1)', 'data:image/svg+xml,bad', '../secret.png', 'assets/../private.png']) assert.throws(() => R1.imageURL(url));
  assert.throws(() => R1.validateCatalog([movie, movie]));
  assert.throws(() => R1.validateCatalog({ movies: [] }));
  assert.throws(() => R1.validateCatalog([{ ...movie, year: 'not a year' }]));
  assert.throws(() => R1.validateCatalog([{ ...movie, id: '__proto__' }]));
  assert.throws(() => R1.validateCatalog([{ ...movie, duration: -1 }]));
  assert.equal(R1.escape('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
test('catalog edits persist and an intentionally empty collection stays empty', () => {
  const { R1 } = app(); const movie = R1.catalog()[0];
  R1.saveCatalog([{ ...movie, title: 'My licensed movie' }]);
  assert.equal(R1.catalog()[0].title, 'My licensed movie');
  R1.saveCatalog([]); assert.equal(R1.catalog().length, 0);
});
test('damaged browser data falls back safely instead of breaking browsing', () => {
  const { R1, memory } = app();
  memory.set(R1.KEYS.catalog, '{not-json'); assert.equal(R1.catalog().length, 8);
  memory.set(R1.KEYS.catalog, '[{"title":"bad"}]'); assert.equal(R1.catalog().length, 8);
  memory.set(R1.KEYS.list, '{}'); assert.equal(R1.getList().length, 0);
  memory.set(R1.KEYS.history, 'null'); assert.equal(R1.getHistory().length, 0);
});
test('watchlist toggles persist and opening a movie preserves resume progress', () => {
  const { R1 } = app();
  assert.equal(R1.toggleList('sintel'), true); assert.ok(R1.getList().includes('sintel'));
  assert.equal(R1.toggleList('sintel'), false); assert.equal(R1.getList().length, 0);
  R1.remember('sintel', 120, 900); R1.remember('sintel');
  assert.equal(R1.getHistory()[0].time, 120); assert.equal(R1.getHistory().length, 1);
});
test('failed storage writes report an error without claiming to save edits', () => {
  const { R1, sandbox } = app();
  sandbox.localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
  assert.throws(() => R1.saveCatalog([]), /Could not save/);
  assert.throws(() => R1.toggleList('sintel'), /Could not save/);
  assert.equal(R1.catalog().length, 8);
});
