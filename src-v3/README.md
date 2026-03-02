# JMart Steel Safety App - v3 Improvements

This folder contains improved versions of core services that address critical issues identified in the safety review.

## What's Fixed

### 1. Google Drive Service (`services/googleDrive.js`)

**Problems Fixed:**
- No retry mechanism (uploads could silently fail)
- Token stored in localStorage (XSS vulnerable)
- No progress feedback to users
- No offline queue for uploads

**Improvements:**
- Retry with exponential backoff (3 attempts, 1s -> 30s)
- Token stored in sessionStorage (cleared on tab close)
- Progress callbacks for UI feedback
- Upload queue persisted to localStorage for offline resilience
- Automatic queue processing when connection restored

**Usage:**
```javascript
import { createGoogleDriveSync } from './services/googleDrive';

const drive = createGoogleDriveSync({
  clientId: 'your-client-id',
  folderName: 'JMart Steel',
  onProgress: ({ stage, filename, progress }) => {
    console.log(`${filename}: ${stage} (${progress}%)`);
  },
  onStatusChange: (status) => {
    console.log('Drive status:', status);
  }
});

drive.init();

// Upload with automatic retry and queuing
const result = await drive.uploadPDF(pdfBlob, 'prestart-2026-02-05.pdf', 'prestart');
if (result.queued) {
  console.log('Upload queued - will sync when connected');
}
```

---

### 2. Firebase Sync Service (`services/firebaseSync.js`)

**Problems Fixed:**
- Full array overwrites (race condition - data loss)
- No conflict resolution
- Last write wins (unsafe for safety data)

**Improvements:**
- Granular updates: `saveForm()`, `saveSite()`, `saveTrainingRecord()`
- Each record has `_lastModified` timestamp and `_modifiedBy` device ID
- Conflict detection with `syncFormsWithConflictCheck()`
- Optional conflict resolution callback
- Legacy API still works (with deprecation warnings)

**Usage:**
```javascript
import { createFirebaseSync } from './services/firebaseSync';

const sync = createFirebaseSync(firebaseDb, localStorage, {
  onConflict: async ({ local, server, formId }) => {
    // Return 'local' to force local version
    // Return 'server' to keep server version
    // Return merged object for custom merge
    return 'server'; // Safe default: server wins
  }
});

sync.init();

// Granular update (SAFE - only updates this form)
await sync.saveForm({ id: 'form-123', ...formData });

// Create new form
const result = await sync.createForm(newFormData);
console.log('Created form:', result.id);

// Delete specific form
await sync.deleteForm('form-123');

// Batch sync with conflict check
await sync.syncFormsWithConflictCheck(localForms);
```

---

### 3. Service Worker (`sw.js`)

**Problems Fixed:**
- Babel not cached (app fails offline)
- Basic cache strategy (stale content)
- No CDN resource caching

**Improvements:**
- All CDN resources pre-cached (React, Babel, Tailwind, jsPDF, Firebase)
- Three caching strategies:
  - Cache-first for static assets
  - Network-first for API calls
  - Stale-while-revalidate for HTML/CDN (fast + fresh)
- Versioned caches (`jmart-static-v3`, `jmart-cdn-v3`)
- Background sync support for forms and Drive uploads
- Message API for cache control

**Usage:**
```javascript
// Register in main app
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./src-v3/sw.js')
    .then(reg => console.log('SW v3 registered'))
    .catch(err => console.error('SW registration failed:', err));
}

// Check cache status
navigator.serviceWorker.controller.postMessage({ type: 'GET_CACHE_STATUS' });

// Force update
navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
```

---

### 4. Form Validation Service (`services/formValidation.js`)

**New Service - WHS Compliance**

Ensures all safety forms meet Australian WHS Act 2011 requirements before submission.

**Features:**
- Required field validation per form type
- Signature validation (presence + format)
- Date validation (no future dates)
- Notifiable incident detection
- Checklist completion verification
- Strict mode option (warnings become errors)

**Usage:**
```javascript
import { createFormValidation, SEVERITY } from './services/formValidation';

const validator = createFormValidation({
  strictMode: false, // Set true to block on warnings
  onValidationError: (result, form, type) => {
    console.log('Validation failed:', result.errors);
  }
});

// Validate before submission
const result = validator.validate(prestartForm, 'prestart');

if (!result.valid) {
  result.errors.forEach(err => {
    showError(err.field, err.message);
  });
  return;
}

if (result.warnings.length > 0) {
  const proceed = confirm(`${result.warnings.length} warnings. Submit anyway?`);
  if (!proceed) return;
}

// Safe to submit
submitForm(prestartForm);
```

---

## Migration Guide

### From v2 to v3

1. **Google Drive**: No API changes, just import from new location
   ```javascript
   // Before
   import { createGoogleDriveSync } from './src/services/googleDrive';
   // After
   import { createGoogleDriveSync } from './src-v3/services/googleDrive';
   ```

2. **Firebase Sync**: Migrate to granular methods
   ```javascript
   // Before (unsafe)
   sync.syncForms(allForms);

   // After (safe)
   await sync.saveForm(updatedForm);
   // Or for batch with conflict check:
   await sync.syncFormsWithConflictCheck(localForms);
   ```

3. **Service Worker**: Update registration path
   ```javascript
   navigator.serviceWorker.register('./src-v3/sw.js');
   ```

4. **Form Validation**: Add validation before submission
   ```javascript
   const validator = createFormValidation();
   const result = validator.validate(form, formType);
   if (!result.valid) {
     // Show errors
     return;
   }
   // Submit
   ```

---

## Testing

Run the existing test suite - all tests should pass:

```bash
npm install
npm test
```

The v3 services maintain backward compatibility with existing tests.

---

## Security Notes

- Tokens now use sessionStorage (cleared on tab close)
- Firebase data includes device ID for audit trail
- Form validation prevents submission of incomplete safety records
- Conflict resolution defaults to server-wins (safer for safety data)
