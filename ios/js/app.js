// JMart Steel Safety App - iOS JavaScript
// Additional scripts loaded by service worker

console.log('[iOS] App scripts loaded');

// iOS PWA detection
const isIOSPWA = window.navigator.standalone === true;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

if (isIOS && !isIOSPWA) {
  console.log('[iOS] Running in Safari - can be installed as PWA');
}
