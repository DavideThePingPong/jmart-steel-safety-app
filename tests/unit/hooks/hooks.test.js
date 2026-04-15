/**
 * hooks.test.js — Regression tests for js/components/hooks.jsx
 *
 * Covers two key regression bugs:
 *   1. confirmUpdate dropped version/modifiedBy/status metadata when updating a form.
 *   2. useDeviceAuth Firebase listeners never cleaned up (memory leak).
 *
 * Because hooks.jsx defines functions on `window` and uses React hooks as globals
 * (no module exports), we test key logic patterns by reading the source and verifying
 * the code structure, plus testing extractable logic directly.
 */

const fs = require('fs');
const path = require('path');

const hooksPath = path.resolve(__dirname, '../../../js/components/hooks.jsx');
let hooksCode;

beforeAll(() => {
  hooksCode = fs.readFileSync(hooksPath, 'utf-8');
});

// ==========================================================================
// REGRESSION #3: prestart template sync must fail safe on deletes
// ==========================================================================
describe('usePrestartTemplates - shared template sync [REGRESSION]', () => {
  it('should define a pending template ops storage key', () => {
    expect(hooksCode).toContain("const PRESTART_TEMPLATE_PENDING_KEY = 'jmart-prestart-template-pending'");
  });

  it('should queue per-template Firebase operations instead of root set writes', () => {
    const templateBlock = hooksCode.slice(
      hooksCode.indexOf('const PRESTART_TEMPLATE_STORAGE_KEY'),
      hooksCode.indexOf('// Export to window for cross-file access')
    );

    expect(templateBlock).toContain('queuePrestartTemplateOp');
    expect(templateBlock).toContain('templateRef.remove()');
    expect(templateBlock).toContain('templateRef.set(nextOp.template)');
    expect(templateBlock).not.toContain("firebaseDb.ref(FIREBASE_TEMPLATES_PATH).set(obj)");
  });

  it('should reconcile remote templates through pending ops instead of republishing local empties', () => {
    const templateBlock = hooksCode.slice(
      hooksCode.indexOf('function usePrestartTemplates'),
      hooksCode.indexOf('// Export to window for cross-file access')
    );

    expect(templateBlock).toContain('applyPendingPrestartTemplateOps');
    expect(templateBlock).toContain('readPendingPrestartTemplateOps');
    expect(templateBlock).not.toContain('Local has templates but Firebase is empty');
    expect(templateBlock).not.toContain('writeTemplatesToFirebase(local)');
  });

  it('should listen for storage changes on both templates and pending ops', () => {
    const templateBlock = hooksCode.slice(
      hooksCode.indexOf('function usePrestartTemplates'),
      hooksCode.indexOf('// Export to window for cross-file access')
    );

    expect(templateBlock).toContain("event.key !== PRESTART_TEMPLATE_STORAGE_KEY && event.key !== PRESTART_TEMPLATE_PENDING_KEY");
  });
});

// ==========================================================================
// REGRESSION #1: confirmUpdate must preserve version metadata
// ==========================================================================
describe('useFormManager — confirmUpdate metadata preservation [REGRESSION]', () => {

  it('should build updatedForm with version field', () => {
    // The updateForm function must set version on the updated form object
    expect(hooksCode).toMatch(/version:\s*\(editingForm\?\.version\s*\|\|\s*1\)\s*\+\s*1/);
  });

  it('should build updatedForm with modifiedBy field', () => {
    expect(hooksCode).toMatch(/modifiedBy:\s*DeviceAuthManager\.deviceId/);
  });

  it('should build updatedForm with modifiedByName field', () => {
    expect(hooksCode).toMatch(/modifiedByName:/);
  });

  it('should build updatedForm with previousVersion field', () => {
    expect(hooksCode).toMatch(/previousVersion:\s*editingForm\s*\?/);
  });

  it('should build updatedForm with status field', () => {
    // Status must be preserved — was previously dropped
    expect(hooksCode).toMatch(/status:\s*['"]completed['"]/);
  });

  it('should spread metadata fields into the form during confirmUpdate', () => {
    // In confirmUpdate, the setForms callback must apply version, modifiedBy,
    // modifiedByName, previousVersion, and status onto the updated form.
    // Look for the spread pattern inside confirmUpdate's setForms callback.
    const confirmUpdateBlock = hooksCode.slice(
      hooksCode.indexOf('const confirmUpdate'),
      hooksCode.indexOf('const cancelUpdate')
    );
    expect(confirmUpdateBlock).toMatch(/version:\s*form\.version/);
    expect(confirmUpdateBlock).toMatch(/modifiedBy:\s*form\.modifiedBy/);
    expect(confirmUpdateBlock).toMatch(/modifiedByName:\s*form\.modifiedByName/);
    expect(confirmUpdateBlock).toMatch(/previousVersion:\s*form\.previousVersion/);
    expect(confirmUpdateBlock).toMatch(/status:\s*form\.status/);
  });

  it('should perform remote version check before writing in confirmUpdate', () => {
    const confirmUpdateBlock = hooksCode.slice(
      hooksCode.indexOf('const confirmUpdate'),
      hooksCode.indexOf('const cancelUpdate')
    );
    // Must check remote version from Firebase to detect conflicts
    expect(confirmUpdateBlock).toMatch(/remoteForm\.version\s*>\s*originalForm\.version/);
  });
});

// ==========================================================================
// REGRESSION #2: queued writes must not be reported as synced
// ==========================================================================
describe('useDataSync - queued sync handling [REGRESSION]', () => {

  it('should only mark forms as synced after an explicit success result', () => {
    const syncBlock = hooksCode.slice(
      hooksCode.indexOf('const syncFormsEffect'),
      hooksCode.indexOf('const syncSitesEffect')
    );

    expect(syncBlock).toMatch(/FirebaseSync\.syncForms\(forms\)\.then\(\(result\)\s*=>\s*\{/);
    expect(syncBlock).toMatch(/if\s*\(result\s*&&\s*result\.success\)[\s\S]*setSyncStatus\(FirebaseSync\.getPendingCount\(\)\s*>\s*0\s*\?\s*'pending'\s*:\s*'synced'\)/);
  });

  it('should only skip the next sync when the current forms still match the last remote snapshot', () => {
    const syncBlock = hooksCode.slice(
      hooksCode.indexOf('const syncFormsEffect'),
      hooksCode.indexOf('const syncSitesEffect')
    );

    expect(syncBlock).toContain('if (formsFromStorageRef.current)');
    expect(syncBlock).toContain('const remoteSignature = buildFormSignature(latestRemoteFormsRef.current || [])');
    expect(syncBlock).toContain('const currentSignature = buildFormSignature(forms)');
    expect(syncBlock).toContain('if (currentSignature === remoteSignature)');
  });

  it('should keep pending status when FirebaseSync queues the write', () => {
    const syncBlock = hooksCode.slice(
      hooksCode.indexOf('const syncFormsEffect'),
      hooksCode.indexOf('const syncSitesEffect')
    );

    expect(syncBlock).toMatch(/else if\s*\(result\s*&&\s*result\.queued\)[\s\S]*setSyncStatus\('pending'\)/);
  });

  it('should not trigger duplicate form syncs inside addForm or confirmUpdate', () => {
    const addFormBlock = hooksCode.slice(
      hooksCode.indexOf('const addForm'),
      hooksCode.indexOf('const unlockForm')
    );
    const confirmUpdateBlock = hooksCode.slice(
      hooksCode.indexOf('const confirmUpdate'),
      hooksCode.indexOf('const cancelUpdate')
    );

    expect(addFormBlock).not.toContain('FirebaseSync.syncForms(updatedForms)');
    expect(confirmUpdateBlock).not.toContain('FirebaseSync.syncForms(updatedForms)');
  });

  it('should suppress the next bulk forms sync when deleteForm already issued a direct delete', () => {
    const deleteBlockStart = hooksCode.indexOf('const deleteForm');
    const deleteBlock = hooksCode.slice(
      deleteBlockStart,
      hooksCode.indexOf('return {', deleteBlockStart)
    );
    const syncBlock = hooksCode.slice(
      hooksCode.indexOf('const syncFormsEffect'),
      hooksCode.indexOf('const syncSitesEffect')
    );

    expect(deleteBlock).toContain('suppressNextFormsSyncRef.current = true');
    expect(syncBlock).toContain('suppressNextFormsSyncRef.current');
  });

  it('should preserve pending status after a Firebase listener merge when the queue is not empty', () => {
    const mergeBlock = hooksCode.slice(
      hooksCode.indexOf('const applyRemoteForms'),
      hooksCode.indexOf('const unsubForms')
    );

    expect(mergeBlock).toContain('pendingAfterMerge');
    expect(mergeBlock).toContain("setSyncStatus(pendingAfterMerge > 0 ? 'pending' : 'synced')");
  });

  it('should not throttle away real remote mutations during the listener cooldown window', () => {
    const mergeBlock = hooksCode.slice(
      hooksCode.indexOf('const applyRemoteForms'),
      hooksCode.indexOf('const unsubForms')
    );

    expect(mergeBlock).toContain('hasRemoteMutation');
    expect(mergeBlock).toContain('!options.skipThrottle && !hasRemoteMutation && !hasRemoteDeletion');
  });

  it('should listen for storage events so same-browser tabs stay in sync', () => {
    const storageBlock = hooksCode.slice(
      hooksCode.indexOf('const syncSitesEffect'),
      hooksCode.indexOf('// Online/Offline detection')
    );

    expect(storageBlock).toContain("window.addEventListener('storage', handleStorage)");
    expect(storageBlock).toContain("event.key === 'jmart-safety-forms'");
    expect(storageBlock).toContain('formsFromStorageRef.current = true');
    expect(storageBlock).toContain("event.key === 'jmart-deleted-form-ids'");
    expect(storageBlock).toContain('deletedFormIdsRef.current = nextDeletedIds');
  });
});

// ==========================================================================
// REGRESSION #2: useDeviceAuth cleanup pattern
// ==========================================================================
describe('useDeviceAuth — Firebase listener cleanup [REGRESSION]', () => {

  it('should define a cleanups array for collecting unsubscribe functions', () => {
    const deviceAuthBlock = hooksCode.slice(
      hooksCode.indexOf('function useDeviceAuth'),
      hooksCode.indexOf('function usePWAInstall')
    );
    expect(deviceAuthBlock).toMatch(/const\s+cleanups\s*=\s*\[\]/);
  });

  it('should push listener unsubscribes into the cleanups array', () => {
    const deviceAuthBlock = hooksCode.slice(
      hooksCode.indexOf('function useDeviceAuth'),
      hooksCode.indexOf('function usePWAInstall')
    );
    // Must push at least notification, pending devices, approved devices, own status listeners
    const pushCount = (deviceAuthBlock.match(/cleanups\.push\(/g) || []).length;
    expect(pushCount).toBeGreaterThanOrEqual(3);
  });

  it('should return a cleanup function from useEffect that iterates cleanups', () => {
    const deviceAuthBlock = hooksCode.slice(
      hooksCode.indexOf('function useDeviceAuth'),
      hooksCode.indexOf('function usePWAInstall')
    );
    // The useEffect return must call forEach on cleanups to invoke each cleanup fn
    expect(deviceAuthBlock).toMatch(/return\s*\(\)\s*=>\s*\{[\s\S]*?cleanups\.forEach/);
  });

  it('should wrap cleanup calls in try-catch to prevent one failure from stopping others', () => {
    const deviceAuthBlock = hooksCode.slice(
      hooksCode.indexOf('function useDeviceAuth'),
      hooksCode.indexOf('function usePWAInstall')
    );
    // forEach callback should have try/catch
    expect(deviceAuthBlock).toMatch(/cleanups\.forEach\(fn\s*=>\s*\{\s*try\s*\{/);
  });

  it('should guard listener pushes with conditional check', () => {
    const deviceAuthBlock = hooksCode.slice(
      hooksCode.indexOf('function useDeviceAuth'),
      hooksCode.indexOf('function usePWAInstall')
    );
    // Each push should be guarded: if (unsubXxx) cleanups.push(unsubXxx)
    expect(deviceAuthBlock).toMatch(/if\s*\(unsub\w+\)\s*cleanups\.push\(unsub\w+\)/);
  });
});
