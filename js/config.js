// Firebase Configuration
// Extracted from index.html for maintainability
// ========================================
// FIREBASE CONFIGURATION
// ========================================
// TODO: Replace these values with your Firebase config from the Firebase Console
// Follow the setup guide: Firebase-Setup-Guide.docx
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

// Check if Firebase is configured
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

// Initialize Firebase only if configured
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuthUid = null;
// Promise that resolves when Firebase auth is ready (or immediately if not configured)
let firebaseAuthReady = Promise.resolve(null);

if (isFirebaseConfigured) {
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
async function firebaseRestRead(path) {
  if (!isFirebaseConfigured) return null;
  var user = firebase.auth().currentUser;
  if (!user) {
    try { await firebaseAuthReady; user = firebase.auth().currentUser; } catch(e) {}
  }
  if (!user) throw new Error('No Firebase auth user');
  var token = await user.getIdToken();
  var url = firebaseConfig.databaseURL + '/' + path + '.json?auth=' + token;
  var response = await fetch(url);
  if (!response.ok) throw new Error('REST read failed: HTTP ' + response.status);
  return response.json();
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
    var data = await firebaseRestRead(path);
    return { exists: data !== null, val: data, source: 'rest' };
  } catch (e) {
    console.error('[firebaseRead] REST also failed for', path, ':', e.message);
    throw e;
  }
}
