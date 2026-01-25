// JMart Steel Safety App - Android JavaScript
// Additional scripts loaded by service worker

console.log('[Android] App scripts loaded');

// Android-specific install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('[Android] Install prompt available');
});
