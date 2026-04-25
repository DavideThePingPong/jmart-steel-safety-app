#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const RETRYABLE_REMOVE_ERRORS = new Set(['EBUSY', 'ENOTEMPTY', 'EPERM']);

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const HUB_ROOT = path.resolve(ROOT, '..', 'artsteel-hub-app');
const HUB_FALLBACK_ROOT = path.join(ROOT, 'hub-runtime');

const FILES = [
  'index.html',
  'offline.html',
  'reset.html',
  'manifest.json',
  'sw.js',
  'jmart-safety-app.html',
  'steel-app.html',
  'Glass-Suction-Cups-Training-10Jun2025.pdf',
  'Steel-Inspection-Test-Plan.pdf'
];

const HUB_FILES = [
  'artsteel-hub.html',
  'hub-reset.html',
  'hub-manifest.json',
  'hub-sw.js'
];

const DIRECTORIES = [
  'icons',
  'js'
];

const HUB_DIRECTORIES = [
  'icons'
];

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function removeDir(dirPath) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
      if (!fs.existsSync(dirPath)) return;
    } catch (error) {
      if (!RETRYABLE_REMOVE_ERRORS.has(error.code) || attempt === 5) {
        throw error;
      }
    }

    sleep(attempt * 100);
  }

  if (fs.existsSync(dirPath)) {
    throw new Error('[build-dist] Failed to remove dist directory after retries: ' + dirPath);
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(relativePath, options = {}) {
  const sourceRoot = options.sourceRoot || ROOT;
  const destinationPath = options.destinationPath || relativePath;
  const required = options.required === true;
  const source = path.join(sourceRoot, relativePath);
  const destination = path.join(DIST, destinationPath);
  if (!fs.existsSync(source)) {
    if (required) {
      throw new Error('[build-dist] Missing required file: ' + source);
    }
    console.warn('[build-dist] Skipping missing file:', relativePath);
    return;
  }
  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);
  console.log('  copied file:', destinationPath);
}

function copyDirectory(relativePath, options = {}) {
  const sourceRoot = options.sourceRoot || ROOT;
  const destinationPath = options.destinationPath || relativePath;
  const required = options.required === true;
  const source = path.join(sourceRoot, relativePath);
  const destination = path.join(DIST, destinationPath);
  if (!fs.existsSync(source)) {
    if (required) {
      throw new Error('[build-dist] Missing required directory: ' + source);
    }
    console.warn('[build-dist] Skipping missing directory:', relativePath);
    return;
  }
  fs.cpSync(source, destination, { recursive: true, force: true });
  console.log('  copied dir :', destinationPath);
}

console.log('Packaging deployable Firebase bundle...');
removeDir(DIST);
ensureDir(DIST);

FILES.forEach(copyFile);
const hubSourceRoot = fs.existsSync(HUB_ROOT) ? HUB_ROOT : HUB_FALLBACK_ROOT;
if (!fs.existsSync(hubSourceRoot)) {
  throw new Error('[build-dist] Hub runtime source not found. Checked: ' + HUB_ROOT + ' and ' + HUB_FALLBACK_ROOT);
}
if (hubSourceRoot === HUB_FALLBACK_ROOT) {
  console.warn('[build-dist] Standalone hub app not found. Falling back to repo mirror:', HUB_FALLBACK_ROOT);
}
HUB_FILES.forEach((relativePath) => copyFile(relativePath, {
  sourceRoot: hubSourceRoot,
  required: true
}));
DIRECTORIES.forEach(copyDirectory);
HUB_DIRECTORIES.forEach((relativePath) => copyDirectory(relativePath, {
  sourceRoot: hubSourceRoot,
  required: true
}));

// Stamp the build version into index.html so every deploy busts asset URLs.
// Without this, __JMART_ASSET_VERSION__ stays static and SW caches old app.js.
const buildVersion = 'b' + Date.now();
['index.html', 'jmart-safety-app.html', 'artsteel-hub.html'].forEach((relativePath) => {
  const file = path.join(DIST, relativePath);
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  const before = content;
  content = content.replace(
    /window\.__JMART_ASSET_VERSION__\s*=\s*['"][^'"]*['"]/,
    `window.__JMART_ASSET_VERSION__ = '${buildVersion}'`
  );
  if (content !== before) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('  stamped version:', relativePath, '→', buildVersion);
  }
});

// Write a tiny version.json for the runtime force-update check.
fs.writeFileSync(path.join(DIST, 'version.json'), JSON.stringify({ version: buildVersion, builtAt: new Date().toISOString() }), 'utf8');
console.log('  wrote version.json:', buildVersion);

console.log('');
console.log('Deploy bundle ready at dist/');
