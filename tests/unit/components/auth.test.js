/**
 * auth.test.js — Code-structure tests for LoginScreen & AppWithAuth (auth.jsx)
 *
 * Verifies password validation, first-setup flow, Firebase-less auth bypass,
 * timeout handling, and auth state machine.
 */

const fs = require('fs');
const path = require('path');

const authPath = path.resolve(__dirname, '../../../js/components/auth.jsx');
let code;

beforeAll(() => {
  code = fs.readFileSync(authPath, 'utf-8');
});

// ==========================================================================
// LoginScreen — Password Validation
// ==========================================================================
describe('LoginScreen — password validation', () => {

  it('should enforce minimum 8 character password on first setup', () => {
    expect(code).toMatch(/newPassword\.length\s*<\s*8/);
    expect(code).toMatch(/at least 8 characters/);
  });

  it('should check passwords match on first setup', () => {
    expect(code).toMatch(/newPassword\s*!==\s*confirmPassword/);
    expect(code).toMatch(/Passwords do not match/);
  });

  it('should require password input before login', () => {
    expect(code).toMatch(/!password/);
    expect(code).toMatch(/Please enter the password/);
  });

  it('should show "Incorrect password" on failed verification', () => {
    expect(code).toMatch(/Incorrect password/);
  });
});

// ==========================================================================
// LoginScreen — First-Time Setup
// ==========================================================================
describe('LoginScreen — first-time setup flow', () => {

  it('should detect first setup when no APP_PASSWORD_HASH', () => {
    expect(code).toMatch(/!DeviceAuthManager\.APP_PASSWORD_HASH/);
    expect(code).toMatch(/setIsFirstSetup\(true\)/);
  });

  it('should call DeviceAuthManager.setPassword on first setup', () => {
    expect(code).toMatch(/DeviceAuthManager\.setPassword\(newPassword\)/);
  });

  it('should call DeviceAuthManager.registerDevice on first setup', () => {
    expect(code).toMatch(/DeviceAuthManager\.registerDevice/);
  });

  it('should call DeviceAuthManager.approveAsAdmin on first setup', () => {
    expect(code).toMatch(/DeviceAuthManager\.approveAsAdmin\(\)/);
  });

  it('should show "First Time Setup" text', () => {
    expect(code).toMatch(/First Time Setup/);
  });

  it('should save device name to localStorage', () => {
    expect(code).toMatch(/localStorage\.setItem\(['"]jmart-device-name['"]/);
  });

  it('should handle setup timeout gracefully (8s)', () => {
    expect(code).toMatch(/setTimeout\(\s*\(\)\s*=>\s*reject\(new\s*Error\(['"]timeout['"]\)\)\s*,\s*8000\s*\)/);
  });
});

// ==========================================================================
// LoginScreen — Login Flow
// ==========================================================================
describe('LoginScreen — login flow', () => {

  it('should call DeviceAuthManager.verifyPassword', () => {
    expect(code).toMatch(/DeviceAuthManager\.verifyPassword\(password\)/);
  });

  it('should call onAuthenticated(true) on successful password', () => {
    expect(code).toMatch(/onAuthenticated\(true\)/);
  });

  it('should fire-and-forget device registration after login', () => {
    expect(code).toMatch(/DeviceAuthManager\.init\(\)/);
  });

  it('should handle login with Enter key', () => {
    expect(code).toMatch(/e\.key\s*===\s*'Enter'/);
  });
});

// ==========================================================================
// AppWithAuth — Auth State Machine
// ==========================================================================
describe('AppWithAuth — auth state machine', () => {

  it('should define auth states: loading, authenticated, unauthenticated, pending', () => {
    expect(code).toMatch(/['"]loading['"]/);
    expect(code).toMatch(/['"]authenticated['"]/);
    expect(code).toMatch(/['"]unauthenticated['"]/);
    expect(code).toMatch(/['"]pending['"]/);
  });

  it('should auto-authenticate when Firebase is not configured', () => {
    expect(code).toMatch(/!isFirebaseConfigured\s*\|\|\s*!firebaseDb/);
    expect(code).toMatch(/setAuthState\(['"]authenticated['"]\)/);
  });

  it('should handle auth timeout (5s)', () => {
    expect(code).toMatch(/setTimeout\(\s*\(\)\s*=>\s*reject\(new\s*Error\(['"]Auth timeout['"]\)\)\s*,\s*5000\s*\)/);
  });

  it('should set isAdmin from DeviceAuthManager', () => {
    expect(code).toMatch(/DeviceAuthManager\.isAdmin/);
  });

  it('should call DeviceAuthManager.updateLastSeen on authenticated', () => {
    expect(code).toMatch(/DeviceAuthManager\.updateLastSeen\(\)/);
  });

  it('should show loading spinner while auth state is loading', () => {
    expect(code).toMatch(/authState\s*===\s*['"]loading['"]/);
    expect(code).toMatch(/Loading\.\.\./);
  });

  it('should show LoginScreen for unauthenticated or pending', () => {
    expect(code).toMatch(/<LoginScreen/);
  });

  it('should render JMartSteelSafetyApp when authenticated', () => {
    expect(code).toMatch(/<JMartSteelSafetyApp/);
  });
});

// ==========================================================================
// Pending Approval Screen
// ==========================================================================
describe('LoginScreen — pending approval', () => {
  it('should show awaiting approval screen', () => {
    expect(code).toMatch(/Awaiting Approval/);
  });

  it('should display device ID for admin reference', () => {
    expect(code).toMatch(/DeviceAuthManager\.deviceId/);
  });

  it('should have "Check Again" reload button', () => {
    expect(code).toMatch(/Check Again/);
    expect(code).toMatch(/window\.location\.reload\(\)/);
  });
});

// ==========================================================================
// Window Exports
// ==========================================================================
describe('auth.jsx — exports', () => {
  it('should export window.LoginScreen', () => {
    expect(code).toMatch(/window\.LoginScreen\s*=\s*LoginScreen/);
  });

  it('should export window.AppWithAuth', () => {
    expect(code).toMatch(/window\.AppWithAuth\s*=\s*AppWithAuth/);
  });
});
