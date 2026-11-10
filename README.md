# Habit Heatmap

A local-first habit tracker with GitHub-style heatmaps. Tap to log a day, watch your streaks grow, and see a year of consistency at a glance.

**[See Live Demo](https://habit-heatmap-xyz.vercel.app/)**

**Your data never leaves your browser.** No accounts, no backend, no analytics, no third-party scripts.

<!-- TODO: add a screenshot (docs/screenshot.png) and a short GIF of logging a day, then reference them here. -->

## Features

- One-tap logging for today; tap any square on the heatmap (or use the date picker) to edit past days
- Per-habit yearly heatmap and a combined overview heatmap (5 intensity levels)
- Current streak, longest streak, total days, and 30/365-day completion rate
- Save any heatmap as a PNG, generated entirely in your browser
- Export and import all data as versioned JSON (merge or replace), with a gentle backup reminder
- Light and dark themes, configurable week start, responsive layout
- Installable PWA that works offline
- Accessible by default: semantic HTML, visible focus states, labelled heatmap cells, reduced-motion support

## Privacy and your data

Everything is stored in your browser's IndexedDB. Nothing is sent over the network.

**Clearing site data deletes your habits.** Data doesn't sync between devices. Export a JSON backup from **Settings → Your data** to keep a copy or move to another device. The app asks the browser for persistent storage to reduce the chance of automatic eviction, and reminds you to back up (every 30 days by default).

## Stack

Next.js (App Router) · TypeScript (strict) · Tailwind CSS v4 + CSS variable tokens · Dexie (IndexedDB) · Zod · Vitest · custom SVG heatmap · hand-written service worker. Fonts (Bricolage Grotesque, IBM Plex Mono) are self-hosted and bundled under the SIL Open Font License; see app/fonts/.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit + component tests
npm run lint
npm run typecheck
npm run build && npm start
```

The service worker only registers in production builds (`npm run build && npm start`).

## Project layout

```
app/            routes: / (today), /habit?id=… (detail), /settings, manifest
components/     heatmap/, habits/, ui/, layout/
lib/            dates, streaks, heatmap grid, export/import, PNG export, db/ (repository)
hooks/          live-query hooks (Dexie)
tests/          Vitest suites
public/         icons and the service worker
```

Design notes:

- UI code never calls Dexie directly. It goes through `lib/db/repository.ts`.
- Dates are local calendar strings (`YYYY-MM-DD`) and are never derived through UTC. Date math is DST-safe.
- The habit detail view lives at `/habit?id=…` rather than `/habits/[id]`. Habit ids only exist in the user's browser, so a query string keeps the route statically prerendered, which lets the service worker cache it for offline use.
- Rename the product in `lib/config.ts`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Out of scope by design: accounts, sync or any backend, analytics, keyboard shortcuts.

## License

[MIT](LICENSE)
