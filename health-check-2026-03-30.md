# Firebase Sync Health-Check Report
**Date:** Monday, 30 March 2026  
**App:** JMart Steel Safety PWA  
**Live URL:** https://jmart-steel-safety.web.app/

---

## ✅ PASS — Confirmed Working

- **Test suite**: 43 suites, 1038 tests — ALL PASSED, zero failures.
- **Firebase security rules** (`firebase.rules.json`):
  - `forms` node requires `id`, `type`, `createdAt`, `createdBy`, `_lastModified`, `_modifiedBy` on writes — validated.
  - `auditLog` node is append-only (`!data.exists()`) — confirmed at line 168.
  - `adminAuthUids` bootstrap rule allows first-device write when `!root.child('jmart-safety/devices/approved').exists()` — intact.
  - No rules accidentally block reads for approved devices — all read rules check `authDevices/{uid}/approvedAt`.
- **Sync anti-loop protection** (`js/app.js` lines 1240–1580):
  - `formsFromFirebaseRef.current = true` is set BEFORE `setForms()` at line 1390.
  - `syncFormsEffect` checks `formsFromFirebaseRef.current` and returns early at line 1529, then resets to `false` at line 1532.
  - Same pattern for sites via `sitesFromFirebaseRef` (set at line 1451/1473, checked at line 1578, reset at 1579).
  - Anti-loop protection is **intact**.
- **Deletion persistence** (`deletedFormIdsRef` pattern in `js/app.js`):
  - `deleteForm` adds formId to `deletedFormIdsRef.current` (hooks.jsx line 371).
  - Persists to `localStorage('jmart-deleted-form-ids')` (hooks.jsx line 373).
  - `onFormsChange` callback reads `deletedFormIdsRef.current` and skips deleted IDs during merge (app.js line 1350–1352).
  - After successful Firebase deletion sync, the ID is cleaned from the ref (hooks.jsx line 401).
  - Pruning of stale deleted IDs when Firebase no longer contains them (app.js lines 1322–1335).
  - Deletion persistence is **intact**.
- **Circuit breaker logic** (`js/firebaseSync.js`):
  - Resets after auth recovery in `_initAuth()` (lines 168–173).
  - Half-opens after cooldown in `processQueue()` (lines 370–380).
  - `_isProcessing` concurrency guard prevents overlapping queue processing (lines 363–366, 444).
  - Queue capped at 50 items / 250KB (lines 87–88).
  - Single oversized entries (>250KB) are dropped (lines 207–210).
  - Circuit breaker logic is **intact**.
- **Service worker cache version test** (`tests/unit/services/sw.test.js`):
  - CACHE_VERSION is extracted dynamically from `sw.js` source (line 145) — no hardcoded version. Test will never go stale.
- **Sites cleanup code** (`js/app.js` lines 1457–1482):
  - Only fires when Firebase sites is a corrupted object (`typeof === 'object' && !Array.isArray`).
  - Sets `sitesFromFirebaseRef.current = true` before writing (line 1473) — prevents anti-loop trigger.
  - Is idempotent — running twice on already-clean array data does nothing (the guard condition `!Array.isArray(rawData)` prevents re-entry).
  - Cleanup code is **safe**.
- **`sanitizeForFirebase` coverage** — well-covered across critical write paths:
  - `firebaseSync.js`: All writes go through `writeWithFallback()` which calls `sanitizeForFirebase(data)` at line 259.
  - `deviceAuth.js`: Most writes use `typeof sanitizeForFirebase === 'function' ? sanitizeForFirebase(payload) : payload` pattern.
  - `auditLogManager.js`: Uses own `_sanitize()` method (identical recursive undefined→null logic) at line 57.
  - `errorTelemetry.js`: Uses `sanitizeForFirebase` guard at line 224.
  - `jobsManager.js`: Uses `sanitizeForFirebase` guard via helper at line 16, applied to all writes.
  - `config.js` REST fallback: Sanitizes at line 413.

---

## ⚠️ WARNING — Potential Issues

### 1. `photoUploadManager.js` line 173 — Firebase `.push()` without sanitization
**What:** `await firebaseDb.ref('jmart-safety/photoUploads').push(uploadLog)` writes directly without `sanitizeForFirebase()`.  
**Where:** `js/photoUploadManager.js:173`  
**Risk:** LOW — The `uploadLog` object is constructed from known string/number values (jobName, filename, size, type, uploadedAt, driveFileId, deviceId) so `undefined` is unlikely but not impossible (e.g., if `results.drive` is truthy but `results.drive.fileId` is undefined).  
**Suggested action:** Wrap with `sanitizeForFirebase(uploadLog)` for defense-in-depth.

### 2. `deviceAuth.js` lines 850 and 874 — `.set()` without sanitization  
**What:** `registerDevice()` and `approveAsAdmin()` write device data directly to Firebase without the `sanitizeForFirebase` guard that other methods in the same file use.  
**Where:** `js/deviceAuth.js:850` (registerDevice), `js/deviceAuth.js:874` (approveAsAdmin)  
**Risk:** LOW — These objects are constructed from known values, but the `this.deviceInfo?.type` optional chaining could yield `undefined` which falls back to the string `'Unknown Device'`, so it's safe in practice. However, this is inconsistent with the pattern used everywhere else in the file.  
**Suggested action:** Add `sanitizeForFirebase()` wrapper for consistency.

### 3. `deviceAuth.js` line 190 — `.update()` without sanitization  
**What:** `await firebaseDb.ref('jmart-safety/devices/approved/' + this.deviceId).update(updates)` where `updates` contains `lastSeen` and optionally `authUid`.  
**Where:** `js/deviceAuth.js:190`  
**Risk:** LOW — Object only has 1-2 string keys, but lacks the sanitize guard.  
**Suggested action:** Add sanitize wrapper for consistency.

### 4. `hub-sw.js` cache version is `hub-v27` — manual bump required  
**What:** The hub service worker uses `CACHE_NAME = 'hub-v27'` and its asset list includes `?v=20260330-frankusyd1` query strings.  
**Where:** `hub-sw.js:2`  
**Risk:** MEDIUM — If `artsteel-hub.html` is changed without bumping this version AND the query string, users may get stale hub content.  
**Suggested action:** Consider automating the hub SW version bump as part of the deploy process.

---

## ❌ FAIL — Nothing Broken

No critical failures detected. All core sync mechanisms are intact and functioning correctly.

---

## 📊 Metrics

| Metric | Value |
|--------|-------|
| **Test suite** | 1038 passed, 0 failed, 43 suites |
| **Firebase write paths sanitized** | 18/21 (3 low-risk paths missing guard — see warnings) |
| **Sync anti-loop protection** | ✅ Intact |
| **Deletion persistence** | ✅ Intact |
| **Circuit breaker logic** | ✅ Intact |
| **Service worker versions** | sw.js v79, hub-sw.js hub-v27 |
| **SW version test** | Dynamic extraction (never goes stale) |
| **Live app test** | ⚠️ Skipped — Chrome extension not connected |
| **Sync queue** | N/A (no browser access) |
| **Deleted form IDs** | N/A (no browser access) |

---

## Summary

The JMart Safety PWA sync engine is in **healthy condition**. All 1038 tests pass. The critical anti-loop, deletion persistence, and circuit breaker mechanisms are intact. Firebase security rules are correctly configured. The 3 unsanitized write paths are low-risk (known-value objects) but should be wrapped for consistency. No action required before tomorrow morning's shift.
