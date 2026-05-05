#!/usr/bin/env node
/**
 * Aborts a deploy if dist/version.json doesn't match the embedded
 * __JMART_ASSET_VERSION__ in the HTML files. Catches the case where someone
 * manually edits dist/index.html (or a build runs partially) and the runtime
 * forceUpdateCheck loop kicks in across all live devices.
 *
 * Wired in via firebase.json:hosting.predeploy.
 *
 * Exits 0 if consistent, 1 if any HTML file's embedded version differs from
 * version.json's "version" field.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const VERSION_FILE = path.join(DIST, 'version.json');
const HTML_FILES = ['index.html', 'jmart-safety-app.html', 'artsteel-hub.html'];

function fail(msg) {
  console.error('[verify-version-consistency] FAIL: ' + msg);
  console.error('[verify-version-consistency] Run `node scripts/build-dist.js` to regenerate a consistent dist/.');
  process.exit(1);
}

if (!fs.existsSync(DIST)) fail('dist/ not found — nothing to verify');
if (!fs.existsSync(VERSION_FILE)) fail('dist/version.json missing');

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
} catch (e) {
  fail('dist/version.json is not valid JSON: ' + e.message);
}
if (!manifest.version) fail('dist/version.json has no "version" field');
const declared = manifest.version;

const PATTERN = /window\.__JMART_ASSET_VERSION__\s*=\s*['"]([^'"]+)['"]/;
const mismatches = [];

for (const rel of HTML_FILES) {
  const file = path.join(DIST, rel);
  if (!fs.existsSync(file)) {
    console.warn('[verify-version-consistency] skipping missing file: ' + rel);
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');
  const m = content.match(PATTERN);
  if (!m) {
    console.warn('[verify-version-consistency] no __JMART_ASSET_VERSION__ embed found in ' + rel);
    continue;
  }
  if (m[1] !== declared) {
    mismatches.push(rel + ': HTML embeds "' + m[1] + '" but version.json says "' + declared + '"');
  } else {
    console.log('[verify-version-consistency] ' + rel + ' = ' + declared + ' OK');
  }
}

if (mismatches.length > 0) {
  console.error('');
  for (const m of mismatches) console.error('[verify-version-consistency] ' + m);
  fail(mismatches.length + ' HTML file(s) drift from version.json');
}

console.log('[verify-version-consistency] OK — all files match version ' + declared);
