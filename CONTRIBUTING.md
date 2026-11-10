# Contributing

Thanks for helping out. Habit Heatmap is deliberately small and local-first.

## Ground rules

- Data stays in the browser. No backend, accounts, sync, analytics, or third-party scripts.
- No keyboard shortcuts. Normal accessibility (focus order, labels, focus states) is required.
- Components don't call Dexie directly. Use `lib/db/repository.ts`.
- Keep logic (dates, streaks, heatmap, export) in pure, tested functions.
- Never derive local dates through UTC (`toISOString().slice(0, 10)` is a bug here).

## Setup

```bash
npm install
npm run dev
```

Before opening a PR, run `npm run lint && npm run typecheck && npm test && npm run build`.

## Pull requests

Keep PRs focused, add tests for logic changes, and describe user-visible changes. Be kind in reviews.
