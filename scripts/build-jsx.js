/**
 * JMart Steel Safety App — JSX Build Script
 *
 * Pre-compiles all React JSX components into a single js/app.js file.
 * Eliminates the need for Babel Standalone (3.3MB) at runtime.
 *
 * Usage: node scripts/build-jsx.js
 *
 * IMPORTANT: File order matters! bootstrap.jsx must be last because it
 * references components defined in earlier files. This order matches
 * the original loading order in index.html.
 */

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const ROOT = path.resolve(__dirname, '..');

// Same order as index.html lines 294-311 — DO NOT reorder
const FILES = [
  'js/components/shared.jsx',
  'js/components/hooks.jsx',
  'js/components/modals.jsx',
  'js/components/auth.jsx',
  'js/components/app.jsx',
  'js/components/dashboard.jsx',
  'js/components/training.jsx',
  'js/components/form-prestart.jsx',
  'js/components/form-incident.jsx',
  'js/components/form-toolbox.jsx',
  'js/components/form-inspection.jsx',
  'js/components/form-itp.jsx',
  'js/components/form-steel-itp.jsx',
  'js/components/view-emergency.jsx',
  'js/components/view-settings.jsx',
  'js/components/view-recordings.jsx',
  'js/components/view-archive-map.jsx',
  'js/components/bootstrap.jsx'
];

console.log('Building JMart Safety App...');
console.log('  Files:', FILES.length);

// Read and concatenate all JSX sources
const sources = FILES.map(f => {
  const fullPath = path.join(ROOT, f);
  if (!fs.existsSync(fullPath)) {
    console.error('  ❌ Missing:', f);
    process.exit(1);
  }
  const src = fs.readFileSync(fullPath, 'utf8');
  console.log('  ✓', f, '(' + (src.length / 1024).toFixed(1) + ' KB)');
  return '// === ' + f + ' ===\n' + src;
});

const combined = sources.join('\n\n');
console.log('  Combined:', (combined.length / 1024).toFixed(0), 'KB');

// Babel transform — JSX → JS
const result = babel.transformSync(combined, {
  presets: ['@babel/preset-react'],
  filename: 'app.jsx',
  sourceMaps: false,
  compact: false
});

if (!result || !result.code) {
  console.error('❌ Babel transform failed');
  process.exit(1);
}

// Write output
const outPath = path.join(ROOT, 'js', 'app.js');
fs.writeFileSync(outPath, result.code, 'utf8');

const sizeKB = (result.code.length / 1024).toFixed(0);
console.log('');
console.log('✅ Built js/app.js (' + sizeKB + ' KB)');
