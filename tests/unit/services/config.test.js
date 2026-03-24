/**
 * Config / firebaseRead Tests (js/config.js)
 *
 * Tests the firebaseRead() wrapper that races the SDK against a timeout
 * and falls back to the REST API.
 *
 * REGRESSION: timeout was not cleared when SDK resolved first, leaking timers.
 *             The fix adds clearTimeout(timeoutId) inside the .then() of the
 *             SDK promise branch.
 *
 * Strategy:
 *   config.js has heavy init side-effects (firebase.initializeApp, anonymous auth, etc).
 *   Rather than loading the whole file, we extract just the two async functions
 *   (firebaseRestRead, firebaseRead) and eval them with mocked globals. This keeps
 *   the tests fast and deterministic.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.resolve(__dirname, '..', '..', '..', 'js', 'config.js');

/**
 * Extract the firebaseRestRead and firebaseRead function bodies from config.js
 * and eval them into the global scope with the required globals pre-set.
 */
function loadFirebaseReadFunctions() {
  const source = fs.readFileSync(CONFIG_PATH, 'utf-8');

  // Extract from `async function firebaseRestRead(path) {` to the end of that function,
  // and `async function firebaseRead(path, timeoutMs) {` to end of file.
  // These are the last two function declarations at the top level.
  const restReadMatch = source.match(/async function firebaseRestRead[\s\S]*?^}/m);
  const readMatch = source.match(/async function firebaseRead[\s\S]*?^}/m);

  if (!restReadMatch || !readMatch) {
    throw new Error('Could not extract firebaseRead functions from config.js');
  }

  // Eval both functions into global scope
  // They reference: isFirebaseConfigured, firebase, firebaseAuthReady, firebaseConfig, firebaseDb, fetch, console
  eval(restReadMatch[0].replace(/^async function firebaseRestRead/, 'global.firebaseRestRead = async function'));
  eval(readMatch[0].replace(/^async function firebaseRead/, 'global.firebaseRead = async function'));
}

describe('firebaseRead (js/config.js)', () => {
  let mockDbRef;
  let mockOnceResult;

  beforeEach(() => {
    // --- Mock Firebase SDK globals expected by the functions ---
    mockOnceResult = {
      exists: jest.fn(() => true),
      val: jest.fn(() => ({ key: 'value' }))
    };

    mockDbRef = {
      once: jest.fn(() => Promise.resolve(mockOnceResult))
    };

    const mockDb = {
      ref: jest.fn(() => mockDbRef)
    };

    // Set up globals that firebaseRead / firebaseRestRead reference
    global.firebaseDb = mockDb;
    global.isE2ERuntime = false;
    global.isFirebaseConfigured = true;
    global.firebaseAuthReady = Promise.resolve('test-uid');
    global.firebaseConfig = {
      databaseURL: 'https://jmart-steel-safety-default-rtdb.asia-southeast1.firebasedatabase.app'
    };
    global.firebase = {
      auth: jest.fn(() => ({
        currentUser: { uid: 'test-uid', getIdToken: jest.fn(() => Promise.resolve('token123')) }
      }))
    };

    // Mock fetch for REST fallback
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ rest: 'data' }) })
    );

    // Load just the two functions
    loadFirebaseReadFunctions();
  });

  afterEach(() => {
    delete global.firebaseDb;
    delete global.isE2ERuntime;
    delete global.isFirebaseConfigured;
    delete global.firebaseAuthReady;
    delete global.firebaseConfig;
    delete global.firebase;
    delete global.firebaseRead;
    delete global.firebaseRestRead;
    jest.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Existence
  // -----------------------------------------------------------------------
  it('should expose firebaseRead as a global function', () => {
    expect(typeof global.firebaseRead).toBe('function');
  });

  // -----------------------------------------------------------------------
  // SDK happy path
  // -----------------------------------------------------------------------
  it('should return SDK result when once() resolves within timeout', async () => {
    const result = await global.firebaseRead('forms/123', 3000);

    expect(result).toEqual({
      exists: true,
      val: { key: 'value' },
      source: 'sdk'
    });
    expect(global.firebaseDb.ref).toHaveBeenCalledWith('forms/123');
    expect(mockDbRef.once).toHaveBeenCalledWith('value');
  });

  it('should use default timeout of 3000ms when none specified', async () => {
    const origSetTimeout = global.setTimeout;
    const timeoutValues = [];
    global.setTimeout = jest.fn(function (fn, ms) {
      timeoutValues.push(ms);
      return origSetTimeout(fn, ms);
    });

    await global.firebaseRead('forms/456');

    // The default timeout parameter is 3000
    expect(timeoutValues).toContain(3000);

    global.setTimeout = origSetTimeout;
  });

  // -----------------------------------------------------------------------
  // Timer leak regression
  // -----------------------------------------------------------------------
  it('should clear the timeout when SDK resolves first [REGRESSION]', async () => {
    const origClearTimeout = global.clearTimeout;
    const clearedIds = [];
    global.clearTimeout = jest.fn((id) => {
      clearedIds.push(id);
      origClearTimeout(id);
    });

    await global.firebaseRead('forms/789', 5000);

    // The fix: clearTimeout(timeoutId) is called inside the .then() of the SDK promise
    expect(global.clearTimeout).toHaveBeenCalled();
    expect(clearedIds.length).toBeGreaterThan(0);

    global.clearTimeout = origClearTimeout;
  });

  // -----------------------------------------------------------------------
  // SDK timeout -> REST fallback
  // -----------------------------------------------------------------------
  it('should fall back to REST when SDK times out', async () => {
    // Make SDK hang forever
    mockDbRef.once.mockReturnValue(new Promise(() => {}));

    const result = await global.firebaseRead('forms/timeout', 50);

    expect(result).toEqual({
      exists: true,
      val: { rest: 'data' },
      source: 'rest'
    });
  });

  // -----------------------------------------------------------------------
  // SDK error -> REST fallback
  // -----------------------------------------------------------------------
  it('should fall back to REST when SDK throws a non-timeout error', async () => {
    mockDbRef.once.mockRejectedValue(new Error('PERMISSION_DENIED'));

    const result = await global.firebaseRead('forms/denied', 3000);

    expect(result).toEqual({
      exists: true,
      val: { rest: 'data' },
      source: 'rest'
    });
  });

  // -----------------------------------------------------------------------
  // REST fallback returns null
  // -----------------------------------------------------------------------
  it('should report exists:false when REST returns null', async () => {
    // SDK hangs
    mockDbRef.once.mockReturnValue(new Promise(() => {}));

    // REST returns null (path does not exist in DB)
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null)
    });

    const result = await global.firebaseRead('forms/nonexistent', 50);

    expect(result).toEqual({
      exists: false,
      val: null,
      source: 'rest'
    });
  });

  // -----------------------------------------------------------------------
  // Both fail
  // -----------------------------------------------------------------------
  it('should throw when both SDK and REST fail', async () => {
    // SDK hangs
    mockDbRef.once.mockReturnValue(new Promise(() => {}));

    // REST also fails
    global.fetch.mockRejectedValue(new Error('Network offline'));

    await expect(global.firebaseRead('forms/offline', 50)).rejects.toThrow();
  });

  // -----------------------------------------------------------------------
  // firebaseDb is null (not configured)
  // -----------------------------------------------------------------------
  it('should go straight to REST when firebaseDb is null', async () => {
    global.firebaseDb = null;

    const result = await global.firebaseRead('forms/noDb', 3000);

    expect(result).toEqual({
      exists: true,
      val: { rest: 'data' },
      source: 'rest'
    });

    // SDK should not have been touched
    expect(mockDbRef.once).not.toHaveBeenCalled();
  });

  it('should pass an AbortSignal to REST fallback requests', async () => {
    global.firebaseDb = null;

    await global.firebaseRead('forms/noDb', 3000);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/forms/noDb.json?auth=token123'),
      expect.objectContaining({
        signal: expect.any(Object)
      })
    );
  });
});
