// Firebase Configuration
// Extracted from index.html for maintainability
// ========================================
// FIREBASE CONFIGURATION
// ========================================
// ========================================
const firebaseConfig = {
  apiKey: "AIzaSyAECfytYqggzmQ-Kxm_vqQWlEnBJMXz5H4",
  authDomain: "jmart-steel-safety.firebaseapp.com",
  databaseURL: "https://jmart-steel-safety-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jmart-steel-safety",
  storageBucket: "jmart-steel-safety.firebasestorage.app",
  messagingSenderId: "920798274486",
  appId: "1:920798274486:web:9d6cdd8853d82280665717"
};

// ========================================
// COMPANY DETAILS
// ========================================
const COMPANY_ABN = '94 164 562 207';

const runtimeMode = window.__JMART_RUNTIME_MODE__ || 'production';
const isE2ERuntime = runtimeMode === 'e2e';

function createE2EFirebaseRuntime() {
  const storageKey = 'jmart-e2e-firebase-db';
  const authUid = 'e2e-auth-user';
  const listeners = {
    value: new Map(),
    child_added: new Map()
  };
  let pushCounter = 0;

  const clone = (value) => {
    if (value === undefined) return null;
    if (value === null) return null;
    return JSON.parse(JSON.stringify(value));
  };

  const normalizePath = (path) => String(path || '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/');

  const splitPath = (path) => {
    const normalized = normalizePath(path);
    return normalized ? normalized.split('/') : [];
  };

  const createSnapshot = (path, value) => {
    const segments = splitPath(path);
    return {
      key: segments.length ? segments[segments.length - 1] : null,
      exists: () => value !== null && value !== undefined,
      val: () => clone(value)
    };
  };

  const defaultState = () => ({
    '.info': { connected: true },
    'jmart-safety': {}
  });

  const readState = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return defaultState();
      if (!parsed['.info']) parsed['.info'] = { connected: true };
      if (!parsed['jmart-safety']) parsed['jmart-safety'] = {};
      return parsed;
    } catch (e) {
      return defaultState();
    }
  };

  const writeState = (state) => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  };

  const getAtPath = (state, path) => {
    const segments = splitPath(path);
    let cursor = state;
    for (let i = 0; i < segments.length; i++) {
      if (cursor == null || typeof cursor !== 'object' || !(segments[i] in cursor)) {
        return null;
      }
      cursor = cursor[segments[i]];
    }
    return cursor === undefined ? null : cursor;
  };

  const setAtPath = (state, path, value) => {
    const segments = splitPath(path);
    if (segments.length === 0) return clone(value);
    let cursor = state;
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      if (!cursor[segment] || typeof cursor[segment] !== 'object') {
        cursor[segment] = {};
      }
      cursor = cursor[segment];
    }
    const lastSegment = segments[segments.length - 1];
    if (value === null || value === undefined) {
      delete cursor[lastSegment];
    } else {
      cursor[lastSegment] = clone(value);
    }
    return state;
  };

  const isRelatedPath = (listenerPath, changedPath) => {
    const listenerSegments = splitPath(listenerPath);
    const changedSegments = splitPath(changedPath);
    const minLength = Math.min(listenerSegments.length, changedSegments.length);
    for (let i = 0; i < minLength; i++) {
      if (listenerSegments[i] !== changedSegments[i]) {
        return false;
      }
    }
    return true;
  };

  const isDirectChildChange = (listenerPath, changedPath) => {
    const listenerSegments = splitPath(listenerPath);
    const changedSegments = splitPath(changedPath);
    if (changedSegments.length !== listenerSegments.length + 1) {
      return false;
    }
    for (let i = 0; i < listenerSegments.length; i++) {
      if (listenerSegments[i] !== changedSegments[i]) {
        return false;
      }
    }
    return true;
  };

  const notifyValueListeners = (changedPath) => {
    const state = readState();
    listeners.value.forEach((handlers, path) => {
      if (!isRelatedPath(path, changedPath)) return;
      const snapshot = createSnapshot(path, getAtPath(state, path));
      handlers.forEach(handler => {
        try { handler(snapshot); } catch (e) { console.warn('[E2E Firebase] value listener failed:', e.message); }
      });
    });
  };

  const notifyChildAddedListeners = (changedPath, previousState) => {
    const state = readState();
    listeners.child_added.forEach((handlers, path) => {
      if (!isDirectChildChange(path, changedPath)) return;
      const previousValue = getAtPath(previousState, changedPath);
      const nextValue = getAtPath(state, changedPath);
      if ((previousValue !== null && previousValue !== undefined) || nextValue === null || nextValue === undefined) {
        return;
      }
      const snapshot = createSnapshot(changedPath, nextValue);
      handlers.forEach(handler => {
        try { handler(snapshot); } catch (e) { console.warn('[E2E Firebase] child_added listener failed:', e.message); }
      });
    });
  };

  const commit = (changedPath, mutateFn) => {
    const previousState = readState();
    const nextState = clone(previousState);
    mutateFn(nextState);
    writeState(nextState);
    notifyValueListeners(changedPath);
    notifyChildAddedListeners(changedPath, previousState);
  };

  const addListener = (type, path, handler) => {
    if (!listeners[type].has(path)) listeners[type].set(path, new Set());
    listeners[type].get(path).add(handler);
    return handler;
  };

  const removeListener = (type, path, handler) => {
    if (!listeners[type].has(path)) return;
    if (handler) {
      listeners[type].get(path).delete(handler);
    } else {
      listeners[type].delete(path);
      return;
    }
    if (listeners[type].get(path).size === 0) {
      listeners[type].delete(path);
    }
  };

  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey) return;
    let previousState = defaultState();
    try {
      previousState = event.oldValue ? JSON.parse(event.oldValue) : defaultState();
    } catch (e) {}
    notifyValueListeners('');
    listeners.child_added.forEach((handlers, path) => {
      const previousChildren = getAtPath(previousState, path) || {};
      const nextChildren = getAtPath(readState(), path) || {};
      Object.keys(nextChildren).forEach((childKey) => {
        if (previousChildren[childKey] !== undefined) return;
        const snapshot = createSnapshot(path + '/' + childKey, nextChildren[childKey]);
        handlers.forEach(handler => {
          try { handler(snapshot); } catch (e) { console.warn('[E2E Firebase] storage child_added failed:', e.message); }
        });
      });
    });
  });

  const makeRef = (path) => {
    const normalizedPath = normalizePath(path);
    return {
      key: splitPath(normalizedPath).slice(-1)[0] || null,
      child: function(childPath) {
        return makeRef(normalizedPath ? normalizedPath + '/' + childPath : childPath);
      },
      set: function(value) {
        commit(normalizedPath, (state) => setAtPath(state, normalizedPath, value));
        return Promise.resolve();
      },
      update: function(updates) {
        commit(normalizedPath, (state) => {
          const existing = getAtPath(state, normalizedPath);
          const nextValue = (existing && typeof existing === 'object') ? { ...existing } : {};
          Object.keys(updates || {}).forEach((key) => {
            nextValue[key] = updates[key];
          });
          setAtPath(state, normalizedPath, nextValue);
        });
        return Promise.resolve();
      },
      remove: function() {
        commit(normalizedPath, (state) => setAtPath(state, normalizedPath, null));
        return Promise.resolve();
      },
      once: function(eventType) {
        if (eventType !== 'value') return Promise.resolve(createSnapshot(normalizedPath, null));
        return Promise.resolve(createSnapshot(normalizedPath, getAtPath(readState(), normalizedPath)));
      },
      on: function(eventType, handler) {
        const registered = addListener(eventType, normalizedPath, handler);
        if (eventType === 'value') {
          handler(createSnapshot(normalizedPath, getAtPath(readState(), normalizedPath)));
        }
        return registered;
      },
      off: function(eventType, handler) {
        removeListener(eventType, normalizedPath, handler);
      },
      push: function(value) {
        pushCounter += 1;
        const key = 'e2e-' + Date.now().toString(36) + '-' + pushCounter.toString(36);
        const childRef = makeRef(normalizedPath ? normalizedPath + '/' + key : key);
        if (arguments.length > 0) {
          return childRef.set(value).then(() => childRef);
        }
        return childRef;
      }
    };
  };

  return {
    authUid,
    db: {
      ref: makeRef
    },
    read: function(path) {
      return clone(getAtPath(readState(), path));
    }
  };
}

// Check if Firebase is configured
const isFirebaseConfigured = isE2ERuntime || firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

// Initialize Firebase only if configured
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuthUid = null;
// Promise that resolves when Firebase auth is ready (or immediately if not configured)
let firebaseAuthReady = Promise.resolve(null);

if (isE2ERuntime) {
  const e2eRuntime = createE2EFirebaseRuntime();
  firebaseApp = { name: 'jmart-e2e' };
  firebaseDb = e2eRuntime.db;
  firebaseAuthUid = e2eRuntime.authUid;
  firebaseAuthReady = Promise.resolve(firebaseAuthUid);
  window.__JMART_E2E_FIREBASE__ = e2eRuntime;
  console.log('Firebase E2E runtime connected, auth uid:', firebaseAuthUid);
} else if (isFirebaseConfigured) {
  try {
    // Clear cached WebSocket failure flag — if a previous session had a transient
    // WS error (e.g. CSP blocking), the SDK remembers it and permanently falls back
    // to long-polling (which returns 503). Clearing on every startup forces a fresh
    // WebSocket attempt each time the app loads.
    try { localStorage.removeItem('firebase:previous_websocket_failure'); } catch(e) {}

    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseDb = firebase.database();
    // Sign in anonymously so security rules can use auth.uid
    firebaseAuthReady = firebase.auth().signInAnonymously().then(cred => {
      firebaseAuthUid = cred.user.uid;
      console.log('Firebase connected, auth uid:', firebaseAuthUid);
      // TASK-008: Start backup scheduler after auth is ready
      if (typeof DailyBackupScheduler !== 'undefined') {
        DailyBackupScheduler.start();
      }
      return cred.user.uid;
    }).catch(err => {
      console.warn('Anonymous auth failed (app still works):', err.message);
      // Still start scheduler even without auth (local backup still works)
      if (typeof DailyBackupScheduler !== 'undefined') {
        DailyBackupScheduler.start();
      }
      return null;
    });
    console.log('Firebase connected successfully!');
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
} else {
  console.log('Firebase not configured - running in local-only mode. See Firebase-Setup-Guide.docx for setup instructions.');
}

// ========================================
// REST API HELPER — Reliable Firebase reads
// ========================================
// The Firebase JS SDK's WebSocket data channel can silently break
// (once('value') hangs indefinitely) while the REST API works fine.
// This helper provides a reliable fallback for critical reads.
// ========================================
async function firebaseRestRead(path, timeoutMs) {
  if (isE2ERuntime && window.__JMART_E2E_FIREBASE__) {
    return window.__JMART_E2E_FIREBASE__.read(path);
  }
  if (!isFirebaseConfigured) return null;
  var user = firebase.auth().currentUser;
  if (!user) {
    try { await firebaseAuthReady; user = firebase.auth().currentUser; } catch(e) {}
  }
  if (!user) throw new Error('No Firebase auth user');
  var token = await user.getIdToken();
  var url = firebaseConfig.databaseURL + '/' + path + '.json?auth=' + token;
  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timeoutId = null;

  try {
    if (controller && timeoutMs) {
      timeoutId = setTimeout(function() {
        controller.abort();
      }, timeoutMs);
    }

    var response = await fetch(url, controller ? { signal: controller.signal } : undefined);
    if (!response.ok) throw new Error('REST read failed: HTTP ' + response.status);
    return response.json();
  } catch (e) {
    if (e && (e.name === 'AbortError' || /aborted/i.test(e.message || ''))) {
      throw new Error('REST read timed out');
    }
    throw e;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function firebaseRestWrite(path, operation, value, timeoutMs) {
  if (isE2ERuntime && window.__JMART_E2E_FIREBASE__) {
    var ref = window.__JMART_E2E_FIREBASE__.db.ref(path);
    if (operation === 'set') return ref.set(value);
    if (operation === 'update') return ref.update(value);
    if (operation === 'delete') return ref.remove();
    throw new Error('Unsupported REST write operation: ' + operation);
  }
  if (!isFirebaseConfigured) throw new Error('Firebase not configured');

  var user = firebase.auth().currentUser;
  if (!user) {
    try { await firebaseAuthReady; user = firebase.auth().currentUser; } catch(e) {}
  }
  if (!user) throw new Error('No Firebase auth user');

  var token = await user.getIdToken();
  var url = firebaseConfig.databaseURL + '/' + path + '.json?auth=' + token;
  var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var timeoutId = null;
  var method = operation === 'set' ? 'PUT' : operation === 'update' ? 'PATCH' : operation === 'delete' ? 'DELETE' : null;

  if (!method) throw new Error('Unsupported REST write operation: ' + operation);

  try {
    if (controller && timeoutMs) {
      timeoutId = setTimeout(function() {
        controller.abort();
      }, timeoutMs);
    }

    var options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (controller) options.signal = controller.signal;
    if (operation !== 'delete') {
      options.body = JSON.stringify(typeof sanitizeForFirebase === 'function' ? sanitizeForFirebase(value) : value);
    }

    var response = await fetch(url, options);
    if (!response.ok) throw new Error('REST write failed: HTTP ' + response.status);

    if (operation === 'delete') return null;
    return response.json();
  } catch (e) {
    if (e && (e.name === 'AbortError' || /aborted/i.test(e.message || ''))) {
      throw new Error('REST write timed out');
    }
    throw e;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// Wrapper: try SDK once() with timeout, fall back to REST
async function firebaseRead(path, timeoutMs) {
  timeoutMs = timeoutMs || 3000;
  // Try SDK first (fast if working, hangs if broken)
  if (firebaseDb) {
    try {
      var timeoutId;
      var result = await Promise.race([
        firebaseDb.ref(path).once('value').then(function(snap) {
          clearTimeout(timeoutId);
          return snap;
        }),
        new Promise(function(_, reject) {
          timeoutId = setTimeout(function() { reject(new Error('SDK_TIMEOUT')); }, timeoutMs);
        })
      ]);
      return { exists: result.exists(), val: result.val(), source: 'sdk' };
    } catch (e) {
      if (e.message === 'SDK_TIMEOUT') {
        console.warn('[firebaseRead] SDK timed out for', path, '— falling back to REST');
      } else {
        console.warn('[firebaseRead] SDK error for', path, ':', e.message, '— falling back to REST');
      }
    }
  }
  // REST fallback
  try {
    var data = await firebaseRestRead(path, Math.max(timeoutMs, 2500));
    return { exists: data !== null, val: data, source: 'rest' };
  } catch (e) {
    console.error('[firebaseRead] REST also failed for', path, ':', e.message);
    throw e;
  }
}
