#!/usr/bin/env node

const { execFileSync } = require('child_process');

function getArg(name) {
  const direct = process.argv.find((arg) => arg === name);
  if (direct) return true;
  const prefixed = process.argv.find((arg) => arg.startsWith(name + '='));
  return prefixed ? prefixed.slice(name.length + 1) : null;
}

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
    }
  });
}

function dbGet(projectId, path) {
  return JSON.parse(runFirebase(['database:get', '--project=' + projectId, path]));
}

function dbSet(projectId, path, value) {
  return runFirebase([
    'database:set',
    '--project=' + projectId,
    '--force',
    '--data',
    JSON.stringify(value),
    path
  ]);
}

function main() {
  const projectId = getArg('--project') || 'jmart-steel-safety';
  const shouldWrite = !!getArg('--write');

  const approvedDevices = dbGet(projectId, '/jmart-safety/devices/approved') || {};
  const existingAuthDevices = dbGet(projectId, '/jmart-safety/authDevices') || {};
  const existingAdminAuthUids = dbGet(projectId, '/jmart-safety/adminAuthUids') || {};

  const authDeviceWrites = [];
  const adminUidWrites = [];

  Object.entries(approvedDevices).forEach(([deviceId, record]) => {
    if (!record || !record.authUid) return;

    if (!existingAuthDevices[record.authUid]) {
      authDeviceWrites.push({
        path: '/jmart-safety/authDevices/' + record.authUid,
        value: {
          deviceId: deviceId,
          isAdmin: !!record.isAdmin,
          approvedAt: record.approvedAt || new Date().toISOString(),
          lastSeen: record.lastSeen || new Date().toISOString(),
          deviceType: record.type || 'Unknown Device',
          deviceName: record.name || null
        }
      });
    }

    if (record.isAdmin && !existingAdminAuthUids[record.authUid]) {
      adminUidWrites.push({
        path: '/jmart-safety/adminAuthUids/' + record.authUid,
        value: true
      });
    }
  });

  console.log('Approved devices:', Object.keys(approvedDevices).length);
  console.log('Existing authDevices:', Object.keys(existingAuthDevices).length);
  console.log('Existing adminAuthUids:', Object.keys(existingAdminAuthUids).length);
  console.log('Auth device records to backfill:', authDeviceWrites.length);
  console.log('Admin auth UID records to backfill:', adminUidWrites.length);

  if (!shouldWrite) {
    console.log('Dry run only. Re-run with --write to apply.');
    return;
  }

  authDeviceWrites.forEach((item) => dbSet(projectId, item.path, item.value));
  adminUidWrites.forEach((item) => dbSet(projectId, item.path, item.value));

  console.log('Backfill complete.');
}

main();
