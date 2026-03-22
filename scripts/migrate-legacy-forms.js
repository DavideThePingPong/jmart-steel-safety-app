#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function getArg(name) {
  const direct = process.argv.find(arg => arg === name);
  if (direct) return true;
  const prefix = process.argv.find(arg => arg.startsWith(name + '='));
  if (prefix) return prefix.slice(name.length + 1);
  return null;
}

const writeMode = !!getArg('--write');
const projectId = getArg('--project') || 'jmart-steel-safety';
function runFirebase(args) {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'firebase';
  const finalArgs = process.platform === 'win32' ? ['/c', 'firebase.cmd', ...args] : args;
  return execFileSync(command, finalArgs, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      FIREBASE_SKIP_UPDATE_CHECK: 'true',
      CI: 'true'
    },
    maxBuffer: 100 * 1024 * 1024
  });
}

function normalizeFormCreatedAt(value, fallbackTs) {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return new Date(fallbackTs).toISOString();
}

function normalizeFormTimestamp(value, fallbackTs) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallbackTs;
}

function normalizeForms(rawForms) {
  const formsArray = Array.isArray(rawForms)
    ? rawForms.map((form, index) => ({ key: String(index), form }))
    : Object.entries(rawForms || {}).map(([key, form]) => ({ key, form }));

  const normalized = {};
  let missingCreatedBy = 0;
  let missingId = 0;
  let missingLastModified = 0;
  let missingModifiedBy = 0;

  formsArray.forEach(({ key, form }, index) => {
    if (!form) return;
    const fallbackTs = Date.now() + index;
    const formId = form.id || key || ('legacy-form-' + fallbackTs);
    const createdBy = form.createdBy || form._modifiedBy || 'legacy-migration';
    if (!form.createdBy) missingCreatedBy++;
    if (!form.id) missingId++;
    if (!form._lastModified) missingLastModified++;
    if (!form._modifiedBy) missingModifiedBy++;

    normalized[String(formId)] = {
      ...form,
      id: formId,
      type: form.type || 'unknown',
      createdAt: normalizeFormCreatedAt(form.createdAt, fallbackTs),
      createdBy,
      _lastModified: normalizeFormTimestamp(form._lastModified || form.updatedAt, fallbackTs),
      _modifiedBy: form._modifiedBy || createdBy
    };
  });

  return {
    normalized,
    summary: {
      nodeType: Array.isArray(rawForms) ? 'array' : typeof rawForms,
      count: Object.keys(normalized).length,
      missingCreatedBy,
      missingId,
      missingLastModified,
      missingModifiedBy
    }
  };
}

function main() {
  const rawJson = runFirebase([
    'database:get',
    '--project=' + projectId,
    '/jmart-safety/forms'
  ]);

  const rawForms = JSON.parse(rawJson);
  const { normalized, summary } = normalizeForms(rawForms);

  console.log('Legacy forms audit');
  console.log(JSON.stringify(summary, null, 2));

  if (!writeMode) {
    console.log('');
    console.log('Dry run only. Re-run with --write to back up the current node and replace it with normalized keyed records.');
    return;
  }

  const backupDir = path.join(os.tmpdir(), 'jmart-safety-migrations');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `forms-backup-${stamp}.json`);
  const outputPath = path.join(backupDir, `forms-normalized-${stamp}.json`);

  fs.writeFileSync(backupPath, JSON.stringify(rawForms, null, 2));
  fs.writeFileSync(outputPath, JSON.stringify(normalized, null, 2));

  runFirebase([
    'database:set',
    '--project=' + projectId,
    '--force',
    '/jmart-safety/forms',
    outputPath
  ]);

  console.log('');
  console.log('Migration complete.');
  console.log('Backup saved to:', backupPath);
  console.log('Normalized payload saved to:', outputPath);
}

main();
