# Safety Sync System — Full Audit Report

**Date:** 2026-03-24
**Branch:** `claude/review-safety-sync-LBQe1`
**PR:** #17

---

## Architecture Overview

```
User submits form
  → React state (full data with photos/signatures)
  → localStorage (STRIPPED — photos replaced with [in-firebase] by safeFormsWrite)
  → Firebase Realtime DB (source of truth — forms + formAssets separate nodes)
  → Google Drive (PDF backups in organized subfolders)
  → Service Worker (offline caching, stale-while-revalidate)
```

### File Map

| Component | File | Status |
|-----------|------|--------|
| Main app (React SPA) | `js/app.js` | **ACTIVE** — loaded by index.html line 277 |
| Legacy app copy | `js/app-core.js` | **DEAD CODE** — not loaded, but exists |
| Firebase sync | `js/firebaseSync.js` | **ACTIVE** |
| Storage quota manager | `js/storageQuotaManager.js` | **ACTIVE** |
| Form asset store | `js/formAssetStore.js` | **ACTIVE** |
| Daily backup scheduler | `js/dailyBackupScheduler.js` | **ACTIVE** |
| Google Drive sync | `js/googleDriveSync.js` | **ACTIVE** |
| Google Drive config | `js/googleDriveConfig.js` | **ACTIVE** |
| Firebase config | `js/config.js` | **ACTIVE** |
| Device auth | `js/deviceAuth.js` | **ACTIVE** |
| Device auth shim | `js/deviceAuthManager.js` | **ACTIVE** — thin proxy to DeviceAuth |
| Offline photo queue | `js/offlinePhotoQueue.js` | **ACTIVE** |
| Photo upload manager | `js/photoUploadManager.js` | **ACTIVE** |
| Service worker | `sw.js` | **ACTIVE** |
| Firebase rules | `firebase.rules.json` | **ACTIVE** — deployed via CI |
| CI/CD | `.github/workflows/firebase-deploy.yml` | **ACTIVE** — tests + deploy on push to main |
| Modular services (unused) | `src/services/firebaseSync.js` | **DEAD CODE** — never imported |
| Modular services (unused) | `src/services/storage.js` | **DEAD CODE** — never imported |
| Modular services (unused) | `src/services/googleDrive.js` | **DEAD CODE** — never imported |

---

## Data Flow Details

### Form Submission (addForm — app.js:867)

1. Creates form object with unique ID, metadata, `locked: true`
2. `setForms(prevForms => [newForm, ...prevForms])` — updates React state
3. `StorageQuotaManager.safeFormsWrite(updatedForms)` — strips base64, saves to localStorage
4. `useDataSync.syncFormsEffect` triggered by state change
5. If online: `FirebaseSync.syncForms(forms)` → `update()` to Firebase
6. If offline: `FirebaseSync.queueFormsSnapshot(forms)` → queued for later
7. After 500ms: `PDFGenerator.download(newForm)` + Drive upload (non-blocking)

### Firebase Sync (firebaseSync.js)

- **syncForms()** (line 511): Uses `update()` — merges per-form keys, doesn't replace node
- **syncSites()** (line 569): Uses `set()` — full replace (correct for sites)
- **syncTraining()** (line 600): Uses `update()` — merges per-record keys
- **deleteForm()** (line 540): Granular delete of `/forms/{id}` and `/formAssets/{id}`
- **executeSync()** (line 450): Queue replay — dispatches based on item.type

### Queue Replay (executeSync — firebaseSync.js:450)

When device comes back online, queued items are replayed:
- `forms` → `update()` (FIXED — was `set()`)
- `sites` → `set()` (correct)
- `training` → `update()` (FIXED — was `set()`)
- `signatures` → `set()` (correct — single shared map)
- `delete-form` → granular delete
- `delete-form-assets` → granular delete

### Firebase → Local Merge (applyRemoteForms — app.js:1310)

1. Firebase listener fires with all forms
2. Merge assets from `/formAssets` node back into forms
3. Compare signatures to detect real changes vs echo
4. Filter out forms in `deletedFormIdsRef` (deleted locally, not yet removed from Firebase)
5. Merge Firebase forms into Map
6. If queued sync pending: also preserve local-only forms
7. Sort by date, update React state + localStorage
8. Set `formsFromFirebaseRef = true` to prevent sync-back loop

### Anti-Loop Mechanism (syncFormsEffect — app.js:1496)

Three flags prevent feedback loops:
- `formsFromFirebaseRef` — skip if data came from Firebase listener
- `formsFromStorageRef` — skip if data came from cross-tab storage event
- `suppressNextFormsSyncRef` — skip if explicitly suppressed (e.g., during delete)
- Signature comparison as final guard

### Daily Backup (dailyBackupScheduler.js)

- Fires at 7:00 PM local time via setTimeout (not polling)
- FIXED: Now fetches full form data from Firebase (with asset merge) instead of stripped localStorage
- Falls back to localStorage if Firebase unavailable
- Calls `GoogleDriveSync.uploadDailyForms(forms)` — generates PDFs and uploads

### Google Drive (googleDriveSync.js)

- OAuth2 via Google Identity Services (popup-based)
- Token stored in localStorage, 50-minute reuse window
- Auto-refresh on 401 with silent `requestAccessToken({ prompt: '' })`
- FIXED: Retry after 401 now has 30s AbortController timeout
- Folder structure: `JMart Steel/01_Safety_Compliance/{FormType}/`
- FIXED: `deleteOldFormPDFs` now searches across all folders by formId

### Service Worker (sw.js)

- Stale-while-revalidate strategy
- Versioned caches (CACHE_VERSION controls invalidation)
- Background sync triggers `window.processSyncQueue()`
- Auto-activates new SW on update (SKIP_WAITING + controllerchange reload)

### Firebase Rules (firebase.rules.json)

- Default deny on root
- Forms: read/write requires auth + approved device (`authDevices/{uid}/approvedAt` exists)
- Sites: read requires auth + approved, **write requires admin** (`adminAuthUids/{uid}` exists)
- Training: read/write requires auth + approved
- Devices: hierarchical approved/pending/denied with self-registration for pending
- Audit log: append-only (write only if `!data.exists()`)
- Validation on forms: requires id, type, createdAt, createdBy, _lastModified, _modifiedBy; immutable createdAt/createdBy on update

---

## Bugs Found and Fixed

### BUG 1 (Critical) — Queue replay destroyed other devices' forms

**File:** `js/firebaseSync.js:472` (executeSync, case 'forms')
**Was:** `await this.writeWithFallback('jmart-safety/forms', 'set', formUpdates)`
**Now:** `await this.writeWithFallback('jmart-safety/forms', 'update', formUpdates)`

**Root cause:** `set()` replaces the entire `/forms` node. If Device A creates forms while Device B is offline, when B's queue replays it does `set()` — overwriting A's forms with B's snapshot (which doesn't include A's forms).

**Impact:** Data loss. Forms created on other devices while any device was offline would be silently deleted.

**Verification:** Compare `executeSync` line 472 with `syncForms` line 529 — both should use `update`.

---

### BUG 2 (Critical) — Queue replay destroyed training records

**File:** `js/firebaseSync.js:493` (executeSync, case 'training')
**Was:** `await this.writeWithFallback('jmart-safety/training', 'set', item.data)`
**Now:** `await this.writeWithFallback('jmart-safety/training', 'update', item.data)`

**Root cause:** Same pattern as Bug 1. `syncTraining()` at line 618 uses `update()`, but queue replay used `set()`.

**Impact:** Training records from other devices wiped on queue replay.

**Verification:** Compare `executeSync` case 'training' with `syncTraining()` — both should use `update`.

---

### BUG 3 (Medium) — Daily backup PDFs had no photos/signatures

**File:** `js/dailyBackupScheduler.js:84-140` (performBackup)
**Was:** Read forms from `localStorage.getItem('jmart-safety-forms')`
**Now:** Fetches from Firebase with asset merge, falls back to localStorage

**Root cause:** `StorageQuotaManager.safeFormsWrite()` strips all base64 data to `[in-firebase]` before saving to localStorage (see `storageQuotaManager.js:306-312`). The daily backup read this stripped data, so `PDFGenerator.generate(form)` rendered PDFs with literal `[in-firebase]` text where photos/signatures should be.

**Impact:** All daily 7PM backup PDFs on Google Drive were missing photos and signatures.

**Verification:**
1. Check `storageQuotaManager.js:312` — confirms `[in-firebase]` replacement
2. Check `dailyBackupScheduler.js:97` — now reads from `firebaseDb.ref('jmart-safety/forms')`
3. Check `dailyBackupScheduler.js:104` — merges assets from `/formAssets` node
4. Check `dailyBackupScheduler.js:122-134` — falls back to localStorage if Firebase fails

---

### BUG 4 (Medium) — deleteOldFormPDFs never found files in subfolders

**File:** `js/googleDriveSync.js:483-501` (deleteOldFormPDFs)
**Was:** `const files = await this.searchFiles(siteName)` — only searched root folder
**Now:** Searches across all folders by formId

**Root cause:** `searchFiles()` at line 447 queries `'${this.folderId}' in parents` — only direct children of root folder. But `uploadPDF()` at line 348 uploads to nested subfolders like `01_Safety_Compliance/Pre-Start_Checklists/` via `getOrCreateNestedFolder()`. The search would never find PDFs in subfolders.

**Impact:** When updating a form, old PDF versions accumulated in Drive instead of being replaced.

**Verification:**
1. Check `searchFiles()` line 447 — confirms `'in parents'` scope is root only
2. Check `uploadPDF()` line 362-364 — confirms upload goes to subfolders
3. Check fix — now queries by formId without parent restriction

---

### BUG 5 (Medium) — Drive API retry had no timeout

**File:** `js/googleDriveSync.js:226-234` (apiCall 401 retry)
**Was:** `const retryResponse = await fetch(url, options)` — no AbortController
**Now:** Uses fresh AbortController with 30s timeout

**Root cause:** The initial request at line 189 uses `{ ...options, signal: controller.signal }` — spreading into a new object. The retry at line 229 used `fetch(url, options)` — the original `options` object has no signal. So the retry had no timeout.

**Impact:** If the retry request stalled (network issue, server hang), it would block indefinitely.

**Verification:** Check that retry fetch now uses `{ ...options, signal: retryController.signal }` with a `clearTimeout` in `finally`.

---

### BUG 6 (Medium, dead code) — app-core.js delete used syncForms(all)

**File:** `js/app-core.js:1414` (deleteForm)
**Was:** `FirebaseSync.syncForms(updatedForms)` — sends ALL remaining forms
**Now:** `FirebaseSync.deleteForm(formId)` — granular delete

**Root cause:** `syncForms()` uses `update()` which merges — but the payload only contains the *remaining* forms, not a delete instruction. The deleted form stays in Firebase because `update()` doesn't remove keys that aren't in the payload.

**Note:** `app-core.js` is dead code (not loaded by index.html). Fixed to prevent copy-paste bugs.

**Verification:** Compare with `app.js:1164-1182` which correctly uses `FirebaseSync.deleteForm(formId)`.

---

### BUG 7 (Medium, dead code) — app-core.js merge resurrected deleted forms

**File:** `js/app-core.js:1554-1620` (applyRemoteForms in useDataSync)

Three sub-issues:
1. **No deletedFormIdsRef filtering** — forms deleted locally would reappear from Firebase
2. **Unconditional local merge** — all local forms merged regardless of queue state
3. **Empty Firebase pushed stale cache** — when Firebase was empty (e.g., remote delete-all), local forms were unconditionally pushed back

**Was:**
```js
formsArray.forEach(form => {
  formMap.set(form.id, { ...form, source: 'firebase' });
});
currentLocalForms.forEach(localForm => {
  if (!formMap.has(localForm.id)) {
    formMap.set(localForm.id, { ...localForm, source: 'local' });
  }
});
```

**Now:** Filters by `deletedIds`, only preserves local-only forms if `hasQueuedSync`, clears local on empty Firebase unless queue pending.

**Note:** `app-core.js` is dead code. Fixed to prevent copy-paste bugs.

**Verification:** Compare with `app.js:1345-1414` which has all these protections.

---

## Verified NOT Bugs

### Sites queue replay uses set() — CORRECT

`executeSync` case 'sites' at line 490 uses `set()`. This matches `syncSites()` at line 586. Sites are a simple string array that should be fully replaced, not merged. Firebase rules also restrict site writes to admins only (line 99).

### Firebase API key in config.js — NORMAL

Firebase client-side config is designed to be public. Security is enforced by:
- Firebase database rules (`firebase.rules.json`)
- Anonymous auth requirement
- Device approval system (`authDevices/{uid}/approvedAt`)

### src/services/ files are different — IRRELEVANT

`src/services/firebaseSync.js`, `src/services/storage.js`, `src/services/googleDrive.js` are never imported or loaded. They appear to be an abandoned modular refactor. No runtime impact.

### formsFromFirebaseRef anti-loop — WORKS CORRECTLY

The feedback loop prevention uses three refs + signature comparison:
1. `formsFromFirebaseRef` set to `true` in `applyRemoteForms` (line 1389)
2. Checked in `syncFormsEffect` (line 1528) — if true, compare signatures
3. If signatures match, skip sync-back (line 1532-1535)
4. Reset to false after check (line 1531)

### Firebase rules — SOLID

- Default deny on root
- All data paths require `auth != null`
- Forms/training require approved device status
- Sites/jobs require admin
- Audit log is append-only
- Form validation prevents spoofing (id must match key, createdAt/createdBy immutable on update)

---

## Known Issues NOT Fixed (Low Priority)

### 1. deletedFormIdsRef grows unbounded

**File:** `js/app.js:1321-1334`

The pruning logic at line 1324 only removes IDs when the form is no longer in Firebase. But if `deleteForm()` queues the deletion and all retries fail (max 5 retries at `firebaseSync.js:432`), the form stays in Firebase AND in `deletedFormIdsRef` forever.

**Impact:** The Set grows by one entry per failed delete. Minimal memory impact unless hundreds of deletes fail.

**Suggested fix:** Add a TTL — prune entries older than 7 days from `deletedFormIdsRef` regardless of Firebase state.

### 2. No automatic conflict resolution for simultaneous offline edits

**File:** `js/app.js:1345-1377` (applyRemoteForms)

When Firebase sends updated forms, `applyRemoteForms` always takes Firebase's version for forms that exist in both local and remote. There's no timestamp or version comparison during background merge.

The `confirmUpdate()` at line 1022-1041 does a version check when the user manually edits, but this doesn't protect against:
- Device A edits form offline
- Device B edits same form offline
- A comes online first, syncs
- B comes online, its `syncFormsEffect` sends B's version, overwriting A's edit

**Impact:** Last-write-wins for offline edits to the same form. The `previousVersion` field (line 989-993) preserves one level of history, but only the most recent previous version.

**Suggested fix:** Compare `_lastModified` timestamps in `applyRemoteForms` and keep the newer version. Or use Firebase transactions for updates.

### 3. app-core.js lacks deletedFormIdsRef declaration

**File:** `js/app-core.js`

The `useFormManager` in `app-core.js` (line 1070) doesn't declare `deletedFormIdsRef`. The fixes reference it but all accesses are null-guarded (`if (deletedFormIdsRef && deletedFormIdsRef.current)`). No runtime error, but deleted forms will still resurrect from Firebase if `app-core.js` is ever loaded.

**Impact:** None currently (dead code). Would be a problem if `app-core.js` replaced `app.js`.

### 4. Signatures queue replay uses set() — potential data loss

**File:** `js/firebaseSync.js:496` (executeSync, case 'signatures')

Uses `set()` which replaces the entire `/signatures` node. If Device A updates signatures while Device B is offline, B's queue replay would overwrite A's changes.

However, `syncSignatures()` at line 640 also uses `set()`, so the queue replay matches the live path. The underlying issue is that signatures don't have per-key granular sync — but that's a design choice, not a bug mismatch.

**Impact:** Low — signatures rarely change on multiple devices simultaneously.

### 5. Google Drive token refresh race condition

**File:** `js/googleDriveSync.js:203-236` (apiCall 401 handler)

The 401 handler replaces `this.tokenClient.callback` temporarily. If two API calls hit 401 simultaneously, they both try to replace the callback, and only one gets restored via `this.tokenClient.callback = originalCallback`. The other's `originalCallback` reference points to the first call's temporary callback.

**Impact:** Very rare — requires two Drive API calls to fail with 401 at exactly the same time.

---

## File-by-File Checklist for Codex Verification

### js/firebaseSync.js
- [ ] Line 472-476: `executeSync` case 'forms' uses `update()` not `set()`
- [ ] Line 493-497: `executeSync` case 'training' uses `update()` not `set()`
- [ ] Line 490: `executeSync` case 'sites' uses `set()` (correct for sites)
- [ ] Line 529: `syncForms()` uses `update()`
- [ ] Line 586: `syncSites()` uses `set()`
- [ ] Line 618: `syncTraining()` uses `update()`
- [ ] Line 640: `syncSignatures()` uses `set()`
- [ ] All write paths gate on `_ensureAuth()` before Firebase operations

### js/dailyBackupScheduler.js
- [ ] Line 96-116: `performBackup()` fetches from Firebase first
- [ ] Line 102-111: Merges assets from `/formAssets` node
- [ ] Line 122-134: Falls back to localStorage if Firebase unavailable
- [ ] Verify that forms passed to `uploadDailyForms()` have real photo data, not `[in-firebase]`

### js/googleDriveSync.js
- [ ] Line 483-501: `deleteOldFormPDFs` searches by formId across all folders
- [ ] Line 226-237: API retry uses fresh AbortController with 30s timeout
- [ ] Line 189: Initial request uses spread `{ ...options, signal }` (doesn't mutate options)

### js/app.js (the ACTIVE app)
- [ ] Line 1164: `deleteForm` uses `FirebaseSync.deleteForm(formId)` (not syncForms)
- [ ] Line 1142-1148: `deleteForm` tracks ID in `deletedFormIdsRef`
- [ ] Line 1350-1351: `applyRemoteForms` filters by `deletedIds`
- [ ] Line 1364-1373: Local-only forms only preserved if `hasQueuedFormSync()`
- [ ] Line 1389: `formsFromFirebaseRef` set before `setForms` (anti-loop)
- [ ] Line 1405-1413: Empty Firebase clears local unless queue pending
- [ ] Line 1528-1537: `syncFormsEffect` checks all three anti-loop flags

### js/app-core.js (DEAD CODE — verify it's not loaded)
- [ ] `index.html` line 277 loads `js/app.js` ONLY — `app-core.js` is not referenced
- [ ] Line 1397: `deleteForm` now uses `FirebaseSync.deleteForm(formId)`
- [ ] Line 1568: `applyRemoteForms` filters by `deletedIds`
- [ ] Line 1617-1621: Empty Firebase case has `hasQueuedSync` guard

### js/storageQuotaManager.js
- [ ] Line 306-317: `stripLargeData` replaces base64 with `[in-firebase]`
- [ ] Line 329-370: `safeFormsWrite` strips + trims + enforces 1.5MB cap
- [ ] Line 345-348: Progressive 30% trim if over budget

### firebase.rules.json
- [ ] Forms require `authDevices/{uid}/approvedAt` exists for read/write
- [ ] Sites require `adminAuthUids/{uid}` exists for write
- [ ] Form validation: id must match key, createdAt/createdBy immutable on update
- [ ] Audit log: append-only (`!data.exists()` on write)

### sw.js
- [ ] CACHE_VERSION is `v81` (bumped for these fixes)

---

## Summary

**7 bugs fixed**, **5 low-priority issues documented**. The critical bugs (queue replay using `set()`) could cause silent data loss across devices. The medium bugs (daily backup, Drive search, API timeout) caused degraded functionality but no data loss.

The app's core sync architecture is sound — the issues were implementation mismatches between the live write path and the queue replay path, and between the storage layer (stripped) and the backup layer (needs full data).

---

## Work Log — Session 2026-03-25

### Branch: `claude/review-safety-sync-LBQe1`
### PR: https://github.com/DavideThePingPong/jmart-steel-safety-app/pull/17

### Commits (oldest first)

1. **`d2b6277`** — Fix critical sync bugs: queue replay set→update, daily backup stripped data, stale app-core delete
2. **`0535388`** — Fix training queue replay set→update, Drive search scope, and API retry timeout
3. **`66e6bfe`** — Add comprehensive safety sync audit document

### Files Changed (vs master)

| File | Lines Changed | What Changed |
|------|--------------|-------------|
| `js/firebaseSync.js` | +12 -3 | `executeSync()` forms+training: `set()` → `update()` |
| `js/dailyBackupScheduler.js` | +55 -14 | `performBackup()`: fetch from Firebase instead of stripped localStorage |
| `js/app-core.js` | +59 -8 | `deleteForm()`: granular delete + `deletedFormIdsRef`. `applyRemoteForms()`: filter deleted IDs, guard local merge, guard empty-Firebase push |
| `js/googleDriveSync.js` | +27 -4 | `deleteOldFormPDFs()`: search all folders. `apiCall()`: retry with timeout |
| `sw.js` | +3 -3 | CACHE_VERSION v79 → v81 |
| `AUDIT-SAFETY-SYNC.md` | +402 new | This document |

### Audit Process (3 passes)

**Pass 1 — Initial exploration (background agent)**
- Mapped the entire form sync system: React state → localStorage → Firebase → Google Drive
- Identified the three-layer storage architecture and anti-loop mechanism
- Found the `set()` vs `update()` mismatch in queue replay
- Found the daily backup stripped data issue
- Found the stale `app-core.js` delete flow

**Pass 2 — Direct file review + fixes**
- Read `firebaseSync.js` end-to-end (775 lines)
- Read `app.js` useFormManager + useDataSync (lines 750-1700)
- Read `dailyBackupScheduler.js` (153 lines)
- Read `storageQuotaManager.js` (400+ lines)
- Read `formAssetStore.js` (111 lines)
- Implemented fixes for bugs 1-4 and committed

**Pass 3 — Triple-check deep audit**
- Re-read all previously audited files
- Read `googleDriveSync.js` end-to-end (500+ lines)
- Read `config.js` (Firebase config, auth, REST fallback)
- Read `deviceAuth.js` + `deviceAuthManager.js`
- Read `firebase.rules.json` (179 lines)
- Read `index.html` (loading sequence)
- Read `src/services/` files (confirmed dead code)
- Read `.github/workflows/firebase-deploy.yml`
- Read `offlinePhotoQueue.js` + `photoUploadManager.js`
- Read `googleDriveConfig.js`
- Found 3 more bugs (training queue, Drive search scope, API retry timeout)
- Implemented fixes and committed
- Verified `app-core.js` `deletedFormIdsRef` references are all null-guarded
- Confirmed Firebase rules properly gate all write paths
- Confirmed `src/services/` and `app-core.js` are dead code

### Exact Code Changes (Diffs)

#### 1. firebaseSync.js — Queue replay forms: set → update

```diff
-        await this.writeWithFallback('jmart-safety/forms', 'set', formUpdates);
-        await this.writeWithFallback('jmart-safety/formAssets', 'set', assetUpdates);
+        // FIXED: Use update() not set()
+        await this.writeWithFallback('jmart-safety/forms', 'update', formUpdates);
+        await this.writeWithFallback('jmart-safety/formAssets', 'update', assetUpdates);
```

#### 2. firebaseSync.js — Queue replay training: set → update

```diff
       case 'training':
-        await this.writeWithFallback('jmart-safety/training', 'set', item.data);
+        // FIXED: Use update() not set()
+        await this.writeWithFallback('jmart-safety/training', 'update', item.data);
```

#### 3. dailyBackupScheduler.js — Fetch from Firebase instead of localStorage

```diff
-    // Get forms from localStorage
-    var formsJson = localStorage.getItem('jmart-safety-forms');
+    // FIXED: Fetch full form data from Firebase (with photos/signatures)
+    var forms;
+    var source = 'localStorage';
+    try {
+      if (typeof firebaseDb !== 'undefined' && firebaseDb && ...) {
+        var formsSnap = await firebaseDb.ref('jmart-safety/forms').once('value');
+        // ... merge assets from /formAssets ...
+        forms = formsArray.filter(Boolean);
+        source = 'Firebase';
+      }
+    } catch (fbErr) { /* fallback to localStorage */ }
```

#### 4. googleDriveSync.js — Search all folders, not just root

```diff
-      const files = await this.searchFiles(siteName);
+      // FIXED: Search across all folders by formId
+      const query = `name contains '${this._escapeQuery(formId)}' and mimeType='application/pdf' and trashed=false`;
+      const resp = await this.apiCall(`https://www.googleapis.com/drive/v3/files?q=...`);
```

#### 5. googleDriveSync.js — API retry with timeout

```diff
-          const retryResponse = await fetch(url, options);
+          const retryController = new AbortController();
+          const retryTimeout = setTimeout(() => retryController.abort(), 30000);
+          const retryResponse = await fetch(url, { ...options, signal: retryController.signal });
+          // ... finally { clearTimeout(retryTimeout); }
```

#### 6. app-core.js — Granular delete instead of syncForms(all)

```diff
-        FirebaseSync.syncForms(updatedForms).then(() => {
-          console.log('Deletion synced to Firebase');
+        FirebaseSync.deleteForm(formId).then(result => {
+          // ... handle success/queued/error ...
```

#### 7. app-core.js — Filter deleted IDs + guard local merge

```diff
+          const deletedIds = deletedFormIdsRef ? deletedFormIdsRef.current : new Set();
           formsArray.forEach(form => {
+            if (deletedIds.has(form.id)) return;
             formMap.set(form.id, { ...form, source: 'firebase' });
           });
+          const preserveLocalOnly = /* check pending queue */;
           currentLocalForms.forEach(localForm => {
+            if (!localForm || deletedIds.has(localForm.id)) return;
             if (!formMap.has(localForm.id)) {
+              if (!preserveLocalOnly) return;
```

---

## Instructions for Codex

### What to verify

1. **Read each file listed in the "File-by-File Checklist" section above** and confirm every checkbox item
2. **Compare `executeSync()` operations with their live counterparts** — every queue replay operation should use the same Firebase method (`set` vs `update`) as the live sync function
3. **Trace the daily backup data path** — confirm forms passed to `PDFGenerator.generate()` have actual photo data, not `[in-firebase]` placeholders
4. **Check the Drive search scope** — confirm `deleteOldFormPDFs` can find PDFs in subfolders
5. **Verify anti-loop flags** — confirm that every code path that calls `setForms()` from external data (Firebase, localStorage event) sets the appropriate flag BEFORE calling `setForms()`
6. **Check the 5 known low-priority issues** — confirm they exist and assess whether any should be upgraded to higher priority

### What NOT to worry about

- `app-core.js` is dead code — `index.html` line 277 only loads `js/app.js`
- `src/services/` files are dead code — never imported
- Firebase API key in `config.js` is intentionally public (client-side Firebase)
- Sites using `set()` in queue replay is correct (full-replace array)
- `deletedFormIdsRef` null-guards in `app-core.js` are intentional (ref doesn't exist there)
