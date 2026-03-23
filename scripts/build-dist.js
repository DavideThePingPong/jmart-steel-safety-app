#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const RETRYABLE_REMOVE_ERRORS = new Set(['EBUSY', 'ENOTEMPTY', 'EPERM']);

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const FILES = [
  'index.html',
  'offline.html',
  'reset.html',
  'manifest.json',
  'sw.js',
  'artsteel-hub.html',
  'hub-manifest.json',
  'hub-sw.js',
  'jmart-safety-app.html',
  'steel-app.html',
  'Glass-Suction-Cups-Training-10Jun2025.pdf',
  'Steel-Inspection-Test-Plan.pdf'
];

const DIRECTORIES = [
  'icons',
  'js'
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

function copyFile(relativePath) {
  const source = path.join(ROOT, relativePath);
  const destination = path.join(DIST, relativePath);
  if (!fs.existsSync(source)) {
    console.warn('[build-dist] Skipping missing file:', relativePath);
    return;
  }
  ensureDir(path.dirname(destination));
  fs.copyFileSync(source, destination);
  console.log('  copied file:', relativePath);
}

function copyDirectory(relativePath) {
  const source = path.join(ROOT, relativePath);
  const destination = path.join(DIST, relativePath);
  if (!fs.existsSync(source)) {
    console.warn('[build-dist] Skipping missing directory:', relativePath);
    return;
  }
  fs.cpSync(source, destination, { recursive: true, force: true });
  console.log('  copied dir :', relativePath);
}

console.log('Packaging deployable Firebase bundle...');
removeDir(DIST);
ensureDir(DIST);

FILES.forEach(copyFile);
DIRECTORIES.forEach(copyDirectory);

console.log('');
console.log('Deploy bundle ready at dist/');
