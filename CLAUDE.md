# CLAUDE.md - Safety App Guidelines

## Device Authorization Rules

**These rules are permanent and apply even if the app is rebuilt from scratch.**

- **Davide's Android phone** — ALWAYS the admin device. This is the primary device. If no admin exists, this device reclaims admin automatically. Never require approval for this device.
- **Davide's Mac** — ALWAYS authorized. Auto-approve on registration, no pending state needed.
- **S.s (Samsung)** — ALWAYS authorized. Auto-approve on registration, no pending state needed.

If the device auth system is rebuilt, these three devices must be hardcoded as always-approved. The Android is always admin.

## ALWAYS Verify After Changes
**Every time you make a fix or change, you MUST verify it works before saying it's done. If Chrome JS execution is broken, say so — do NOT pretend you verified. If you can't verify, do a deep local code trace. If not 100% sure, redo it.**

## Deployment

- Firebase Hosting: https://jmart-steel-safety.web.app
- GitHub Pages: https://davidethepingpong.github.io/jmart-steel-safety-app
- Auto-deploys on push to main via GitHub Actions (firebase-deploy.yml)
- Service worker caches aggressively — bump CACHE_VERSION in sw.js after changes

## Key Architecture

- Single-file React app (index.html) compiled via Babel in-browser
- Firebase Realtime Database for sync (sites, forms, devices, jobs)
- localStorage as primary storage, Firebase as sync layer
- Two device auth systems: DeviceAuth (line ~105) and DeviceAuthManager (line ~1825) — both use localStorage key `jmart-device-id`

## Known Gotchas

- `syncSites()` must use `set()` not `update()` — update() accumulates entries and corrupts data
- Sites are plain strings, not objects — never spread a string (`{...site}`) into Firebase
- Firebase listener → setSites → useEffect → syncSites creates a feedback loop. Use `sitesFromFirebaseRef` flag to break it.
- Service worker stale-while-revalidate means users get old code on first load after deploy. Bump SW cache version to force refresh.
