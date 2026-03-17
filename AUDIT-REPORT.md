# Safety App Comprehensive Audit Report

**Date**: 2026-03-17
**Auditor**: Claude (Automated Deep Audit)
**Scope**: Full codebase — 140+ files, 22 JS services, 16 React components, CI/CD, Firebase rules, SW, PWA
**Test Suite**: 956 tests passing, 93.45% statement coverage

---

## EXECUTIVE SUMMARY

The JMart Steel Safety App is a production-grade PWA with strong fundamentals: pre-compiled JSX (no runtime Babel), pinned CDN versions, circuit-breaker patterns, REST API fallbacks, and aggressive storage management. However, this audit uncovered **10 bugs** (2 critical, 4 medium, 4 low) and **9 advisory findings** that should be addressed.

**All bugs identified below have been fixed in this commit.**

---

## CRITICAL BUGS (Fixed)

### BUG-1: GitHub Pages Deployment Broken — Wrong Path
**File**: `.github/workflows/pages-deploy.yml:32`
**Severity**: CRITICAL
**Impact**: GitHub Pages deploy uploads from `./public` which **does not exist**. The deploy either fails silently or serves nothing.
**Root Cause**: Firebase Hosting serves from `.` (root), but the Pages workflow references `./public`.
**Fix**: Changed upload path to `.` to match the actual file structure.

### BUG-2: Firebase Security Rules Missing `errors` Path
**File**: `firebase.rules.json`
**Severity**: CRITICAL
**Impact**: `ErrorTelemetry._syncToFirebase()` writes to `jmart-safety/errors/{deviceId}/{key}` but this path has **no rule** in `firebase.rules.json`. Writes fail with PERMISSION_DENIED. Error telemetry is silently broken in production.
**Fix**: Added `errors` rule allowing authenticated devices to write error logs (append-only for safety).

---

## MEDIUM BUGS (Fixed)

### BUG-3: ESLint Config Missing — `npm run lint` Broken
**File**: Project root (missing `.eslintrc.json`)
**Severity**: MEDIUM
**Impact**: `npm run lint` fails with "ESLint couldn't find a configuration file." The lint script in package.json is non-functional. CI doesn't run lint (only tests), so this was never caught.
**Fix**: Created `.eslintrc.json` with appropriate config for the project's browser globals + React JSX pattern.

### BUG-4: `firebaseRead()` Timer Leak on REST Fallback
**File**: `js/config.js:88-97`
**Severity**: MEDIUM
**Impact**: When the SDK times out and falls back to REST, the SDK's `.once('value')` listener is never detached. It keeps a live Firebase connection open that serves no purpose and wastes battery/bandwidth on mobile.
**Fix**: Added cleanup of the dangling SDK listener when falling back to REST.

### BUG-5: CSP Missing Firebase Storage Domain
**File**: `index.html:6`
**Severity**: MEDIUM
**Impact**: `connect-src` allows `*.googleapis.com` but not `*.firebasestorage.app`. Photo uploads via `PhotoUploadManager` go to `firebasestorage.app` which may be blocked by the CSP on strict browsers.
**Fix**: Added `https://*.firebasestorage.app` to `connect-src`.

---

## LOW BUGS (Fixed)

### BUG-6: Service Worker Calls `skipWaiting()` Twice
**File**: `sw.js:271,496`
**Severity**: LOW
**Impact**: `self.skipWaiting()` is called both at the end of the install event AND in the message handler. The install-time call makes the message-based SKIP_WAITING from the main thread redundant. Not harmful, but the install-time `skipWaiting()` means new SWs activate before the main thread can coordinate, potentially causing unexpected reloads.
**Fix**: Removed `skipWaiting()` from install event. The main thread sends SKIP_WAITING after detecting the new SW, giving it proper control over the update flow.

### BUG-7: ErrorTelemetry Writes to Unprotected Firebase Path
**File**: `js/errorTelemetry.js:224`
**Severity**: LOW (mitigated by BUG-2 fix)
**Impact**: Error logs are written outside the `jmart-safety/` prefix to paths like `jmart-safety/errors/...`. This is now protected by the rules fix in BUG-2.
**No additional code change needed** — the Firebase rules fix covers this.

### BUG-8: AuditLogManager Missing Firebase Auth Gate
**File**: `js/auditLogManager.js:43`
**Severity**: MEDIUM
**Impact**: `AuditLogManager.log()` writes directly to Firebase without waiting for `firebaseAuthReady`. If called before anonymous auth completes, the write fails with PERMISSION_DENIED. Audit entries are lost (only local copy remains).
**Fix**: Added `await firebaseAuthReady` with 5s timeout before Firebase write.

### BUG-9: TrainingCertGenerator Missing ToastNotifier Guard
**File**: `js/trainingCertGenerator.js:319`
**Severity**: LOW
**Impact**: Error catch block calls `ToastNotifier.error()` without checking if `ToastNotifier` exists. If the toast script hasn't loaded yet, this throws an unhandled reference error, hiding the original certificate generation error.
**Fix**: Added `typeof ToastNotifier !== 'undefined'` guard.

### BUG-10: OfflinePhotoQueue Accumulates Duplicate Event Listeners
**File**: `js/offlinePhotoQueue.js:30`
**Severity**: LOW
**Impact**: `init()` adds a new `window.addEventListener('online', ...)` every time it's called. If `init()` is called multiple times, each online event triggers multiple `processQueue()` calls simultaneously, potentially uploading duplicate photos.
**Fix**: Added `_onlineListenerAdded` guard to prevent duplicate listener registration.

### BUG-11: FormValidator sanitizeForm Vulnerable to Circular References
**File**: `js/formValidator.js:42`
**Severity**: LOW
**Impact**: `sanitizeForm()` recursively traverses form objects but has no circular reference detection. Corrupt data from Firebase with circular references would cause infinite recursion and crash the app.
**Fix**: Added `Set`-based seen tracking to break circular references.

---

## ADVISORY FINDINGS (No Code Changes)

### ADV-1: Firebase API Key Exposed in Source
**File**: `js/config.js:10`
**Risk**: LOW (by design)
**Note**: Firebase web API keys are meant to be public and are restricted by security rules + domain allowlisting. This is standard Firebase architecture, not a leak. However, ensure Firebase Console has domain restrictions configured for this API key.

### ADV-2: Password Hash Cached in localStorage
**File**: `js/deviceAuth.js:790`
**Risk**: LOW
**Note**: The PBKDF2 password hash is cached in `jmart-password-hash` for offline login. This is a reasonable tradeoff for a safety app that must work offline, but the hash could theoretically be extracted from a stolen device. The PBKDF2 with 100,000 iterations provides adequate protection.

### ADV-3: Device Fingerprinting Uses Weak Hash
**File**: `js/deviceAuth.js:50-55`
**Risk**: LOW
**Note**: Device IDs use a simple djb2-style hash of browser characteristics. Collisions are theoretically possible but extremely unlikely in a small user base. The ID also includes a timestamp component, further reducing collision risk.

### ADV-4: No Rate Limiting on Device Registration
**File**: `js/deviceAuth.js:289-310`
**Risk**: LOW
**Note**: Any unauthenticated device can register as pending. Firebase security rules require auth, but anonymous auth is free. A malicious actor could spam pending device registrations. Mitigated by the fact this is an internal tool with a small user base.

### ADV-5: `sites` Validation Rule Uses String Length
**File**: `firebase.rules.json:87`
**Risk**: LOW
**Note**: Sites are validated with `newData.val().length < 50000`. Since sites are stored as an array, `val()` returns an object/array, and `.length` only works on strings in Firebase rules. For arrays, this check may not behave as expected. Consider using `newData.hasChildren()` or size-based validation.

### ADV-6: npm Audit — 4 Low Severity Vulnerabilities
**Packages**: `@tootallnate/once` → `http-proxy-agent` → `jsdom` → `jest-environment-jsdom`
**Risk**: LOW (test dependencies only, not in production bundle)
**Note**: These are in the test runner's dependency chain. No production impact. Fix available via `npm audit fix --force` but requires major version bump of jest-environment-jsdom.

### ADV-7: Service Worker Cache Version Manual Bump
**File**: `sw.js:12`
**Risk**: OPERATIONAL
**Note**: Cache version (`v71`) must be manually bumped after every change. If forgotten, users get stale code on first load. Consider automating this in the build script.

### ADV-8: Dual `space-y-*` Definitions in Tailwind CSS
**File**: `index.html:36-40`
**Risk**: COSMETIC
**Note**: The pre-compiled Tailwind CSS already defines `space-y-*` classes, but lines 36-40 redefine them with simpler rules. The duplicates are harmless (later rules win) but add unnecessary bytes.

### ADV-9: `src/` and `src-v3/` Legacy Code Still in Repo
**Risk**: MAINTENANCE
**Note**: These directories contain prototype/v3 code that isn't used in production. The Firebase hosting config correctly ignores them, but they add confusion. Consider moving to a separate branch or archive.

---

## TEST RESULTS

```
Test Suites: 41 passed, 41 total
Tests:       956 passed, 956 total
Coverage:    93.45% statements, 90.24% branches, 95.12% functions, 93.64% lines
Threshold:   80% enforced (all passing)
```

## BUILD RESULTS

```
Build: 17 JSX files → js/app.js (337 KB)
All files compiled successfully
```

---

## WHAT'S WORKING WELL

- **Circuit breaker pattern** in FirebaseSync prevents retry storms
- **REST API fallback** in `firebaseRead()` handles SDK WebSocket hangs
- **Storage quota management** with progressive degradation is excellent
- **PBKDF2 password hashing** with auto-migration from legacy formats
- **Device auth** with admin recovery, orphan cleanup, and self-healing
- **Pre-compiled JSX** eliminates 3.3MB Babel runtime dependency
- **Pinned CDN versions** prevent supply-chain attacks
- **Append-only audit log** in Firebase rules
- **Form validation** with field-level rules in formConstants.js
- **Lie-fi detection** via Firebase heartbeat (NetworkStatus)
- **Emergency boot cleanup** prevents storage-full app crashes
