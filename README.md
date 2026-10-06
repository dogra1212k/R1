# R1 Stream

A responsive, free-to-watch movie web app made with **HTML, CSS and vanilla JavaScript**. Dark cinema layout, original R1 branding, and a starter collection of eight Blender films. No payment, subscription, API key, framework, or build step is required.

## Start

With Node.js 20 or newer:

```sh
npm start
```

Open **http://localhost:4173**. The small Node script only serves static files; it is not an authentication or catalog backend. Alternatively, serve the folder with any static HTTP server. Opening `index.html` directly works for basic browsing, but HTTPS or localhost is required for installation, reliable embedded playback and offline shell caching.

## Admin

Open **admin.html**, or use the lock icon in the app. Enter **9809**.

- Add, edit, delete and feature movies.
- Use an official YouTube video URL or a direct HTTPS `.mp4` / `.webm` URL.
- Add a poster URL, original release year, language, creator credit and license.
- Export/import JSON backups. Import and restore show a confirmation before replacing the collection.
- Export `catalog.js`, then replace `js/catalog.js` in this repository to publish a new default collection.

**The PIN is a browser-only demo lock. It is visible in `js/admin.js` and can be bypassed. It is not secure authentication.** Admin edits, watchlists and playback history use browser storage, and are not shared between devices or visitors. Do not store private data here. A production shared admin needs a backend with server-side authentication, permissions and persistent storage. Changing the PIN in JavaScript does not make it secure.

## Publish free with GitHub Pages

This app works from a repository subpath such as `/R1/`.

1. In this repository, open **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select **main** and **/ (root)**, then save.
4. Once GitHub finishes deploying, open the URL shown in Pages settings. For this repository the expected address is `https://dogra1212k.github.io/R1/`.

That address is not live merely because the code was committed: Pages must first be enabled and its deployment completed. `.nojekyll` is included; no workflow or paid hosting is needed.

On Android Chrome, open the HTTPS app and choose **Add to Home screen / Install app**. An Install app button also appears in the footer when the browser offers installation. This is an installable website (PWA), not a native APK. The app shell can work offline after being visited; online films cannot.

## Features

- Featured movie, responsive cards, genre filters, instant search, release-year sorting.
- Movie information, free playback through the official YouTube player, and a native player for direct MP4/WebM files.
- Watchlist and recently opened films. Direct video playback can resume from saved progress; YouTube progress remains managed by YouTube.
- Admin code gate, catalog editing, backups and downloadable shared defaults.
- Keyboard-accessible dialogs, focus indicators, mobile layout, reduced-motion support and image/error fallbacks.
- Installable app shell; no ads or payments added by R1. YouTube may display its own advertising.

“Latest releases” sorts your catalog by actual release year. The starter films are from 2008–2023, not current cinema releases. New licensed films can be added in Studio. There is no automatic movie scraping or subscription-service access.

## Content and rights

Only add videos you own or are allowed to distribute. This repository does not provide unauthorized Netflix films or newly released commercial movies. It is independent of Netflix and Blender Studio.

Demo films link to official videos listed by Blender Studio. Included artwork comes from the corresponding project pages and is resized/compressed and cropped by the UI. Agent 327 uses the R1 placeholder and an unchanged official video embed, with its separate CC BY-ND terms. Creator attribution and license links are shown in each movie and in **Film credits**. Film ownership stays with its respective creators. See [CREDITS.md](CREDITS.md) and [Blender’s remixing information](https://studio.blender.org/remixing/).

Remote playback depends on the provider, connection, region and browser. The player has an original-video link if embedding is unavailable. No quality, availability, captions or permanent third-party hosting is guaranteed.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Movie browsing and player dialogs |
| `admin.html` | PIN gate and movie manager |
| `styles.css` | Responsive cinema and admin styles |
| `js/catalog.js` | Default movie collection |
| `js/core.js` | Validation, storage, icons and shared helpers |
| `js/app.js` | Browse, filter, watchlist and playback |
| `js/admin.js` | Demo PIN and catalog editing |
| `sw.js`, `manifest.webmanifest` | Installation and offline app shell |
| `assets/` | Credited movie artwork and original R1 icons |

## Checks

```sh
npm run check
npm test
```

The dependency-free tests cover invalid/unsafe URLs and imports, attribution and assets, catalog persistence, empty and corrupt storage, watchlists, resume data, failed writes and preview-server path traversal. The GitHub Actions workflow runs the same syntax and test checks on pushes and pull requests. No npm install is required.

## Hindi quick guide

1. App mein lock icon kholo, code **9809** dalo.
2. **Add movie** dabao aur apni/licensed movie ka YouTube ya direct video link dalo.
3. Movie ka naam, poster, year aur baaki details bhar kar **Save movie** karo.
4. Ye change abhi isi browser mein dikhega. Sabhi visitors ke liye **Export catalog.js** karo aur GitHub mein `js/catalog.js` replace karo.
5. PIN sirf demo lock hai. Secure admin aur sabhi devices par shared updates ke liye backend banana hoga.
