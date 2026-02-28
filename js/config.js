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
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseDb = firebase.database();
    // Sign in anonymously so security rules can use auth.uid
    firebaseAuthReady = firebase.auth().signInAnonymously().then(cred => {
      firebaseAuthUid = cred.user.uid;
      console.log('Firebase connected, auth uid:', firebaseAuthUid);
      return cred.user.uid;
    }).catch(err => {
      console.warn('Anonymous auth failed (app still works):', err.message);
      return null;
    });
    console.log('Firebase connected successfully!');
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
} else {
  console.log('Firebase not configured - running in local-only mode. See Firebase-Setup-Guide.docx for setup instructions.');
}
