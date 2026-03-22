#!/usr/bin/env node

const { execFileSync } = require('child_process');

function getArg(name) {
  const direct = process.argv.find(arg => arg === name);
  if (direct) return true;
  const prefixed = process.argv.find(arg => arg.startsWith(name + '='));
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
  const deviceId = getArg('--device-id');

  if (!deviceId) {
    console.error('Usage: npm run recover:admin -- --device-id=<DEVICE_ID> [--project=<PROJECT_ID>]');
    process.exit(1);
  }

  let deviceRecord = null;
  let source = null;

  try {
    deviceRecord = dbGet(projectId, '/jmart-safety/devices/approved/' + deviceId);
    if (deviceRecord) source = 'approved';
  } catch (e) {}

  if (!deviceRecord) {
    try {
      deviceRecord = dbGet(projectId, '/jmart-safety/devices/pending/' + deviceId);
      if (deviceRecord) source = 'pending';
    } catch (e) {}
  }

  if (!deviceRecord) {
    console.error('Device not found in approved or pending lists:', deviceId);
    process.exit(1);
  }

  const now = new Date().toISOString();
  const approvedRecord = {
    ...deviceRecord,
    id: deviceId,
    isAdmin: true,
    status: 'approved',
    approvedAt: deviceRecord.approvedAt || now,
    approvedBy: 'MANUAL ADMIN RECOVERY',
    lastSeen: now
  };

  dbSet(projectId, '/jmart-safety/devices/approved/' + deviceId, approvedRecord);
  if (source === 'pending') {
    dbSet(projectId, '/jmart-safety/devices/pending/' + deviceId, null);
  }

  if (approvedRecord.authUid) {
    dbSet(projectId, '/jmart-safety/adminAuthUids/' + approvedRecord.authUid, true);
    dbSet(projectId, '/jmart-safety/authDevices/' + approvedRecord.authUid, {
      deviceId: deviceId,
      isAdmin: true,
      approvedAt: now,
      lastSeen: now,
      deviceType: approvedRecord.type || 'Unknown Device',
      deviceName: approvedRecord.name || null
    });
  }

  console.log('Admin recovery complete for device:', deviceId);
  console.log('Source:', source);
}

main();
