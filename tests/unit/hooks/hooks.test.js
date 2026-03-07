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
