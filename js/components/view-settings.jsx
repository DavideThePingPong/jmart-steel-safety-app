// SettingsView Component
// Extracted from views.jsx

// ========================================
// SYSTEM HEALTH CARD
// Shows error telemetry status in Settings
// ========================================
function SystemHealthCard() {
  const [health, setHealth] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    function refresh() {
      if (typeof ErrorTelemetry !== 'undefined') {
        setHealth(ErrorTelemetry.getHealth());
        if (showLog) {
          setErrors(ErrorTelemetry.getRecentErrors(20));
        }
      }
    }
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [showLog]);

  if (typeof ErrorTelemetry === 'undefined') return null;
  if (!health) return null;

  const statusColors = {
    healthy: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500', label: 'Healthy' },
    degraded: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Degraded' },
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500', label: 'Critical' }
  };
  const s = statusColors[health.status] || statusColors.healthy;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-gray-800">System Health</h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.border} border ${s.text}`}>
          <span className={`w-2 h-2 rounded-full ${s.dot} mr-1.5`}></span>
          {s.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">Errors (last hr)</p>
          <p className="text-lg font-bold text-gray-800">{health.errorsLastHour}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">Total captured</p>
          <p className="text-lg font-bold text-gray-800">{health.totalErrors}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">Sync queue</p>
          <p className="text-lg font-bold text-gray-800">{health.syncQueueSize}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500">Circuit breaker</p>
          <p className="text-lg font-bold text-gray-800 capitalize">{health.circuitBreakerState || 'closed'}</p>
        </div>
      </div>

      {health.lastSyncTime && (
        <p className="text-xs text-gray-400 mb-2">Last sync: {new Date(health.lastSyncTime).toLocaleTimeString()}</p>
      )}

      <button
        onClick={() => { setShowLog(!showLog); if (!showLog) setErrors(ErrorTelemetry.getRecentErrors(20)); }}
        className="w-full py-2 text-sm text-orange-600 font-medium rounded-lg bg-orange-50 active:bg-orange-100"
      >
        {showLog ? 'Hide Error Log' : 'View Error Log'}
      </button>

      {showLog && (
        <div className="mt-3 max-h-64 overflow-y-auto">
          {errors.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No errors recorded</p>
          ) : (
            errors.map((err, i) => (
              <div key={i} className="border-b border-gray-100 py-2 last:border-0">
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium text-red-600 flex-1">{err.message || err.msg || 'Unknown error'}</p>
                  <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                    {err.timestamp ? new Date(err.timestamp).toLocaleTimeString() : ''}
                  </span>
                </div>
                {err.context && <p className="text-xs text-gray-400 mt-0.5">{err.context}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SettingsView({ sites = [], onUpdateSites, signatures = {}, onUpdateSignatures, isAdmin = false, isDeviceAdmin = false, canViewDevices = false, canRevokeDevices = false, pendingDevices = [], approvedDevices = [] }) {
  const [newSite, setNewSite] = useState('');
  const [showAddSite, setShowAddSite] = useState(false);
  const [driveConnected, setDriveConnected] = useState(GoogleDriveSync.isConnected());
  const [driveError, setDriveError] = useState('');
  const [backupStatus, setBackupStatus] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(null); // Name of person to sign
  const [newMemberName, setNewMemberName] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [devices, setDevices] = useState({ pending: [], approved: [], denied: [] });
  const [pendingCount, setPendingCount] = useState(0);
  const [deviceActionLoading, setDeviceActionLoading] = useState(null);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [editingDeviceName, setEditingDeviceName] = useState('');
  const [myDeviceName, setMyDeviceName] = useState('');
  const [storageInfo, setStorageInfo] = useState(null);
  const [fixStatus, setFixStatus] = useState('');
  const [isFixing, setIsFixing] = useState(false);
  const [fixDone, setFixDone] = useState(false);
  const currentSites = [...new Set(sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites)];
  const canManageSharedSettings = isAdmin || isDeviceAdmin;
  const canManageSignatures = true;

  // Listen to device changes if admin, viewer, or has revoke permission
  useEffect(() => {
    if ((isAdmin || canViewDevices || canRevokeDevices) && isFirebaseConfigured) {
      const unsubscribe = DeviceAuthManager.listenToDevices((deviceData) => {
        setDevices(deviceData);
        setPendingCount(deviceData.pending.length);
      });
      return () => unsubscribe();
    }
  }, [isAdmin, canViewDevices, canRevokeDevices]);

  // Listen to this device's own name (works for ALL users, including non-admins).
  // Renames sync across devices because they all read the same Firebase node.
  // Polls for firebaseDb readiness — at component mount it may not be ready yet,
  // so a single early-return useEffect would silently never attach the listener.
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let unsubscribe = null;
    let cancelled = false;
    const attach = () => {
      if (cancelled) return;
      if (!window.firebaseDb || !DeviceAuthManager.deviceId) {
        setTimeout(attach, 200);
        return;
      }
      const ref = window.firebaseDb.ref('jmart-safety/devices/approved/' + DeviceAuthManager.deviceId + '/name');
      const handler = (snap) => setMyDeviceName(snap.val() || '');
      ref.on('value', handler);
      unsubscribe = () => ref.off('value', handler);
    };
    attach();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Also derive from devices.approved when it's populated (admin/viewer users).
  // Belt-and-suspenders for the case where the dedicated listener is slow to attach.
  useEffect(() => {
    const me = devices.approved.find(d => d.id === DeviceAuthManager.deviceId);
    if (me && me.name !== undefined) setMyDeviceName(me.name || '');
  }, [devices.approved]);

  // Listen for Google Drive connection status changes (real-time, no timeout)
  useEffect(() => {
    if (typeof GoogleDriveSync === 'undefined') return;
    let active = true;
    var unsubscribe = GoogleDriveSync.onConnectionChange((connected, error) => {
      if (!active) return;
      setDriveConnected(connected);
      if (error) {
        setDriveError(error);
      } else {
        setDriveError('');
      }
    });
    return () => { active = false; if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  const handleApproveDevice = async (deviceId) => {
    setDeviceActionLoading(deviceId);
    const success = await DeviceAuthManager.approveDevice(deviceId);
    setDeviceActionLoading(null);
    if (!success) {
      ToastNotifier.error('Failed to approve device');
    }
  };

  const handleDenyDevice = async (deviceId) => {
    setDeviceActionLoading(deviceId);
    const success = await DeviceAuthManager.denyDevice(deviceId);
    setDeviceActionLoading(null);
    if (!success) {
      ToastNotifier.error('Failed to deny device');
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    if (await ConfirmDialog.show('Are you sure you want to revoke access for this device?', { title: 'Revoke Device', confirmLabel: 'Revoke', destructive: true })) {
      setDeviceActionLoading(deviceId);
      const success = await DeviceAuth.revokeDevice(deviceId);
      setDeviceActionLoading(null);
      if (!success) {
        ToastNotifier.error('Failed to revoke device');
      }
    }
  };

  const handleRemoveDevice = async (deviceId) => {
    if (await ConfirmDialog.show('Are you sure you want to remove this device?', { title: 'Remove Device', confirmLabel: 'Remove', destructive: true })) {
      setDeviceActionLoading(deviceId);
      const success = await DeviceAuthManager.removeDevice(deviceId);
      setDeviceActionLoading(null);
      if (!success) {
        ToastNotifier.error('Failed to remove device');
      }
    }
  };

  const handleStartRename = (device) => {
    setEditingDeviceId(device.id);
    setEditingDeviceName(device.name || '');
  };

  const handleSaveRename = async (deviceId) => {
    if (!editingDeviceName.trim()) {
      ToastNotifier.warning('Device name cannot be empty');
      return;
    }
    setDeviceActionLoading(deviceId);
    const success = await DeviceAuthManager.renameDevice(deviceId, editingDeviceName);
    setDeviceActionLoading(null);
    setEditingDeviceId(null);
    setEditingDeviceName('');
    if (!success) {
      ToastNotifier.error('Failed to rename device');
    }
  };

  const handleCancelRename = () => {
    setEditingDeviceId(null);
    setEditingDeviceName('');
  };

  // Default team members from shared constants
  const defaultMembers = FORM_CONSTANTS.teamMembers;
  // Get all visible members — defaults minus hidden, plus customs.
  const allMembers = FORM_CONSTANTS.getActiveTeamMembers(signatures);

  const saveSignature = (name, signatureData) => {
    const newSignatures = { ...signatures, [name]: signatureData };
    onUpdateSignatures(newSignatures);
    setShowSignaturePad(null);
  };

  const deleteSignature = (name) => {
    const newSignatures = { ...signatures };
    delete newSignatures[name];
    onUpdateSignatures(newSignatures);
  };

  const deleteMember = (name) => {
    if (!window.confirm('Remove "' + name + '" from the worker list? Their saved signature will also be deleted.')) return;
    const newSignatures = { ...signatures };
    delete newSignatures[name];
    if (defaultMembers.includes(name)) {
      // Default members are hardcoded in FORM_CONSTANTS — flag them as hidden so
      // they don't reappear from teamMembers on next render.
      newSignatures['__hidden:' + name] = true;
    }
    onUpdateSignatures(newSignatures);
  };

  const addNewMember = () => {
    if (newMemberName.trim() && !allMembers.includes(newMemberName.trim())) {
      const newSignatures = { ...signatures, [newMemberName.trim()]: null };
      // If they're re-adding a previously hidden default, clear the hidden flag.
      if (defaultMembers.includes(newMemberName.trim())) {
        delete newSignatures['__hidden:' + newMemberName.trim()];
      }
      onUpdateSignatures(newSignatures);
      setNewMemberName('');
      setShowAddMember(false);
    }
  };

  const addSite = () => {
    if (!canManageSharedSettings) return;
    const trimmed = newSite.trim();
    if (trimmed) {
      const isDuplicate = currentSites.some(s => s.toLowerCase() === trimmed.toLowerCase());
      if (isDuplicate) {
        ToastNotifier.warning('This site already exists');
        return;
      }
      onUpdateSites([...currentSites, trimmed]);
      setNewSite('');
      setShowAddSite(false);
    }
  };

  const connectDrive = () => {
    setDriveError('');
    GoogleDriveSync.authorize();
    // Status updates come via onConnectionChange callback — no timeout needed
  };

  const disconnectDrive = () => {
    GoogleDriveSync.disconnect();
    setDriveConnected(false);
  };

  const backupNow = async () => {
    setIsBackingUp(true);
    setBackupStatus('Backing up...');
    try {
      const formsJson = localStorage.getItem('jmart-safety-forms');
      if (!formsJson) {
        setBackupStatus('No forms to backup');
        setIsBackingUp(false);
        return;
      }
      const forms = JSON.parse(formsJson);
      const result = await GoogleDriveSync.uploadDailyForms(forms);
      if (result.success) {
        setBackupStatus(`✅ Backed up ${result.uploaded} forms to Google Drive!`);
      } else {
        setBackupStatus('❌ Backup failed: ' + result.error);
      }
    } catch (error) {
      setBackupStatus('❌ Backup error: ' + error.message);
    }
    setIsBackingUp(false);
  };

  // --- Storage & Fix Everything ---
  const getStorageInfo = () => {
    var total = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key) continue;
      var val = localStorage.getItem(key);
      total += val ? val.length * 2 : 0;
    }
    var totalMB = (total / 1024 / 1024).toFixed(2);
    var pct = Math.min(Math.round((total / (5 * 1024 * 1024)) * 100), 100);
    return { totalBytes: total, totalMB: totalMB, pct: pct };
  };

  useEffect(() => {
    setStorageInfo(getStorageInfo());
  }, []);

  const doFixEverything = async () => {
    if (!await ConfirmDialog.show('This will strip photos from local cache and clear temp data.\n\nYour forms, credentials, and saved signatures are preserved.\nPhotos are safe in Firebase & Drive.\n\nContinue?', { title: 'Clear Cache', confirmLabel: 'Continue' })) return;
    setIsFixing(true);
    setFixDone(false);
    setFixStatus('Starting...');
    var steps = [];
    var beforeInfo = getStorageInfo();

    try {
      // 1. Delete ALL browser caches
      setFixStatus('Step 1/6: Clearing caches...');
      var cacheNames = await caches.keys();
      for (var i = 0; i < cacheNames.length; i++) { await caches.delete(cacheNames[i]); }
      steps.push('Deleted ' + cacheNames.length + ' cache(s)');

      // 2. Strip base64 photos from forms (the #1 storage bomb)
      setFixStatus('Step 2/6: Stripping photos from forms...');
      var strippedCount = 0;
      try {
        var formsRaw = localStorage.getItem('jmart-safety-forms');
        if (formsRaw && formsRaw.length > 10000) {
          var forms = JSON.parse(formsRaw);
          var stripped = JSON.parse(JSON.stringify(forms, function(key, value) {
            if (typeof value !== 'string') return value;
            if (value.length > 500 &&
                (value.indexOf('data:') === 0 || value.indexOf('/9j/') === 0 ||
                 value.indexOf('iVBOR') === 0 || value.indexOf('JVBER') === 0)) {
              strippedCount++;
              return '[in-firebase]';
            }
            if (value.length > 5000) return value.substring(0, 200) + '...[truncated]';
            return value;
          }));
          stripped.sort(function(a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
          if (stripped.length > 50) stripped = stripped.slice(0, 50);
          localStorage.setItem('jmart-safety-forms', JSON.stringify(stripped));
          steps.push('Stripped ' + strippedCount + ' photos, kept ' + stripped.length + ' forms');
        } else {
          steps.push('Forms already small');
        }
      } catch (e) {
        steps.push('Forms error: ' + e.message);
      }

      // 3. Clear sync queue, audit log, photo queue, recordings
      setFixStatus('Step 3/6: Clearing sync queue & temp data...');
      var nuked = 0;
      ['jmart-sync-queue', 'jmart-audit-log', 'jmart-photo-queue', 'jmart-job-recordings',
       'jmart-backed-up-forms'].forEach(function(k) {
        try { if (localStorage.getItem(k)) { localStorage.removeItem(k); nuked++; } } catch(e) {}
      });
      steps.push('Cleared ' + nuked + ' data store(s)');

      // 4. Clear temp/cache/draft/backup keys
      setFixStatus('Step 4/6: Removing temp keys...');
      var tempKeys = [];
      for (var j = localStorage.length - 1; j >= 0; j--) {
        var lsKey = localStorage.key(j);
        if (lsKey && (lsKey.includes('temp') || lsKey.includes('cache') || lsKey.includes('draft') ||
                      lsKey.includes('cdn-retry') || lsKey.includes('backup'))) {
          tempKeys.push(lsKey);
        }
      }
      tempKeys.forEach(function(k) { try { localStorage.removeItem(k); } catch(e) {} });
      steps.push('Removed ' + tempKeys.length + ' temp key(s)');

      // 5. Clear session storage
      setFixStatus('Step 5/6: Clearing session data...');
      sessionStorage.clear();
      steps.push('Session cleared');

      // 6. Reset Firebase connection state
      setFixStatus('Step 6/6: Resetting Firebase connection...');
      try { localStorage.removeItem('firebase:previous_websocket_failure'); } catch(e) {}
      steps.push('Firebase connection reset');

      // Done
      var afterInfo = getStorageInfo();
      var freedMB = (parseFloat(beforeInfo.totalMB) - parseFloat(afterInfo.totalMB)).toFixed(2);
      setStorageInfo(afterInfo);
      setFixStatus('Freed ' + freedMB + ' MB (' + beforeInfo.totalMB + ' MB \u2192 ' + afterInfo.totalMB + ' MB). ' + steps.join('. '));
      setFixDone(true);
    } catch (e) {
      setFixStatus('Error: ' + e.message + '. Steps done: ' + steps.join(', '));
    }
    setIsFixing(false);
  };

  const lastBackup = localStorage.getItem('last-drive-backup-date');
  const openResetTool = () => {
    const url = new URL('./reset.html', window.location.href);
    url.searchParams.set('from', 'safety-settings');
    window.location.assign(url.toString());
  };


  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">Settings</h2>
            {isDeviceAdmin && (
              <p className="text-xs text-green-600 mt-1">Admin Mode - You can manage device access</p>
            )}
          </div>
          <button
            onClick={openResetTool}
            className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 text-orange-700 active:bg-orange-100 font-semibold text-sm"
            aria-label="Open reset tool"
            title="Open reset tool"
          >
            <span aria-hidden="true">{"\u21BB"}</span>
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Current Device Info (for all users) */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">🔐</span> This Device
        </h3>
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          {/* Device name with inline rename — available to all users */}
          {editingDeviceId === DeviceAuthManager.deviceId ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingDeviceName}
                onChange={(e) => setEditingDeviceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename(DeviceAuthManager.deviceId);
                  if (e.key === 'Escape') handleCancelRename();
                }}
                placeholder="Device name (e.g. Davide's iPhone)"
                className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-0"
                autoFocus
                maxLength={30}
              />
              <button
                onClick={() => handleSaveRename(DeviceAuthManager.deviceId)}
                className="text-white bg-green-600 hover:bg-green-700 text-sm font-medium px-3 py-1 rounded"
                disabled={deviceActionLoading === DeviceAuthManager.deviceId}
              >
                {deviceActionLoading === DeviceAuthManager.deviceId ? '…' : 'Save'}
              </button>
              <button
                onClick={handleCancelRename}
                className="text-gray-600 text-sm font-medium px-2 py-1 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm">
                <span className="text-gray-500">Name:</span>{' '}
                <span className="font-medium">{myDeviceName || 'Unnamed device'}</span>
              </p>
              <button
                onClick={() => handleStartRename({ id: DeviceAuthManager.deviceId, name: myDeviceName })}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 border border-blue-300 rounded hover:bg-blue-50"
              >
                Rename
              </button>
            </div>
          )}
          <p className="text-sm"><span className="text-gray-500">Type:</span> <span className="font-medium">{DeviceAuth.deviceInfo?.type}</span></p>
          <p className="text-sm"><span className="text-gray-500">Browser:</span> <span className="font-medium">{DeviceAuth.deviceInfo?.browser}</span></p>
          <p className="text-sm"><span className="text-gray-500">Screen:</span> <span className="font-medium">{DeviceAuth.deviceInfo?.screen}</span></p>
          <p className="text-xs text-gray-400 mt-2">Device ID: {DeviceAuth.deviceId}</p>
        </div>
      </div>

      {/* Device Management Section - Admin, Viewer, or has Revoke permission */}
      {(isAdmin || canViewDevices || canRevokeDevices) && isFirebaseConfigured && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-2xl">📱</span> Connected Devices
            {isAdmin && pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount} pending</span>
            )}
            {!isAdmin && !canRevokeDevices && <span className="text-xs text-gray-400">(View only)</span>}
          </h3>

          {/* Pending Devices - Admin can approve/deny, Viewers can only see */}
          {devices.pending.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-yellow-700 mb-2">⏳ Pending Approval ({devices.pending.length})</p>
              <div className="space-y-2">
                {devices.pending.map(device => (
                  <div key={device.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {editingDeviceId === device.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingDeviceName}
                              onChange={(e) => setEditingDeviceName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(device.id);
                                if (e.key === 'Escape') handleCancelRename();
                              }}
                              className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-0"
                              autoFocus
                              maxLength={30}
                            />
                            <button
                              onClick={() => handleSaveRename(device.id)}
                              className="text-green-600 text-sm font-medium px-2"
                              disabled={deviceActionLoading === device.id}
                            >
                              {deviceActionLoading === device.id ? '...' : '✓'}
                            </button>
                            <button
                              onClick={handleCancelRename}
                              className="text-gray-400 text-sm font-medium px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <p className="font-medium text-gray-800 flex items-center gap-2">
                            {device.name || 'Unknown Device'}
                            {isAdmin && (
                              <button
                                onClick={() => handleStartRename(device)}
                                className="text-gray-400 hover:text-gray-600 text-xs ml-1"
                                title="Rename device"
                              >
                                ✏️
                              </button>
                            )}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Requested: {new Date(device.registeredAt).toLocaleDateString('en-AU')}
                        </p>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveDevice(device.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleDenyDevice(device.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium"
                          >
                            ✕ Deny
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved Devices */}
          <div>
            <p className="text-sm font-medium text-green-700 mb-2">✓ Approved Devices ({devices.approved.length})</p>
            {devices.approved.length === 0 ? (
              <p className="text-sm text-gray-500">No approved devices yet</p>
            ) : (
              <div className="space-y-2">
                {devices.approved.map(device => (
                  <div key={device.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        {editingDeviceId === device.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingDeviceName}
                              onChange={(e) => setEditingDeviceName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(device.id);
                                if (e.key === 'Escape') handleCancelRename();
                              }}
                              className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-0"
                              autoFocus
                              maxLength={30}
                            />
                            <button
                              onClick={() => handleSaveRename(device.id)}
                              className="text-green-600 text-sm font-medium px-2"
                              disabled={deviceActionLoading === device.id}
                            >
                              {deviceActionLoading === device.id ? '...' : '✓'}
                            </button>
                            <button
                              onClick={handleCancelRename}
                              className="text-gray-400 text-sm font-medium px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <p className="font-medium text-gray-800 flex items-center gap-2">
                            {device.name || 'Unknown Device'}
                            {device.isAdmin && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded">Admin</span>}
                            {device.canViewDevices && !device.isAdmin && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Viewer</span>}
                            {isAdmin && (
                              <button
                                onClick={() => handleStartRename(device)}
                                className="text-gray-400 hover:text-gray-600 text-xs ml-1"
                                title="Rename device"
                              >
                                ✏️
                              </button>
                            )}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          Last seen: {device.lastSeen ? new Date(device.lastSeen).toLocaleString('en-AU') : 'Never'}
                        </p>
                      </div>
                      {isAdmin && !device.isAdmin && (
                        <button
                          onClick={() => handleRemoveDevice(device.id)}
                          className="text-red-500 text-sm ml-2"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Device Info */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">Your Device ID: <span className="font-mono">{DeviceAuthManager.deviceId}</span></p>
          </div>
        </div>
      )}

      {/* Google Drive Backup Section */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">📁</span> Google Drive Backup
        </h3>

        {!isGoogleDriveConfigured ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
            <p className="text-sm text-yellow-800 font-medium">⚠️ Google Drive not configured</p>
            <p className="text-xs text-yellow-700 mt-1">Contact your admin to set up Google Drive integration</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${driveConnected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-sm text-gray-600">{driveConnected ? 'Connected' : 'Not connected'}</span>
              </div>
              {driveConnected ? (
                <button onClick={disconnectDrive} className="text-red-600 text-sm underline">Disconnect</button>
              ) : (
                <button onClick={connectDrive} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  Connect Google Drive
                </button>
              )}
            </div>

            {driveError && !driveConnected && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                <p className="text-sm text-red-700">❌ {driveError}</p>
              </div>
            )}

            {driveConnected && (
              <>
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Auto-backup:</span> Every day at 7:00 PM
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Folder:</span> {DRIVE_FOLDER_NAME}
                  </p>
                  {lastBackup && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Last backup:</span> {lastBackup}
                    </p>
                  )}
                </div>

                <button
                  onClick={backupNow}
                  disabled={isBackingUp}
                  className={`w-full py-3 rounded-lg text-white font-medium ${isBackingUp ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {isBackingUp ? '⏳ Backing up...' : '☁️ Backup Now'}
                </button>

                {backupStatus && (
                  <p className={`text-sm mt-2 text-center ${backupStatus.includes('✅') ? 'text-green-600' : backupStatus.includes('❌') ? 'text-red-600' : 'text-gray-600'}`}>
                    {backupStatus}
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">🏗️ Sites</h3>
          {canManageSharedSettings ? (
            <button onClick={() => setShowAddSite(!showAddSite)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm">+ Add Site</button>
          ) : (
            <span className="text-xs text-gray-400">Admin only</span>
          )}
        </div>
        {canManageSharedSettings && showAddSite && (
          <div className="mb-4 flex gap-2">
            <input type="text" value={newSite} onChange={(e) => setNewSite(e.target.value)} className="flex-1 border rounded-lg p-2 text-sm" placeholder="Enter site name" />
            <button onClick={addSite} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Add</button>
          </div>
        )}
        <div className="space-y-2">
          {currentSites.map((site) => (
            <div key={site} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">{site}</span>
              {canManageSharedSettings && (
                <button onClick={() => onUpdateSites(currentSites.filter(s => s !== site))} className="text-red-500">🗑️</button>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Team Signatures Section */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">✍️ Team Signatures</h3>
          {canManageSignatures ? (
            <button onClick={() => setShowAddMember(!showAddMember)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm">+ Add Member</button>
          ) : null}
        </div>
        <p className="text-xs text-gray-500 mb-3">Save signatures once and use them automatically in all forms</p>

        {canManageSignatures && showAddMember && (
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="flex-1 border rounded-lg p-2 text-sm"
              placeholder="Enter team member name"
            />
            <button onClick={addNewMember} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Add</button>
          </div>
        )}

        <div className="space-y-2">
          {allMembers.map((name) => (
            <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-medium text-gray-700">{name}</span>
                {signatures[name] ? (
                  <img src={signatures[name]} alt={`${name}'s signature`} className="h-8 border rounded bg-white px-2" />
                ) : (
                  <span className="text-xs text-gray-400 italic">No signature saved</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canManageSignatures && (
                  <>
                    <button
                      onClick={() => setShowSignaturePad(name)}
                      className={`px-3 py-1 rounded-lg text-sm ${signatures[name] ? 'bg-orange-100 text-orange-600' : 'bg-green-600 text-white'}`}
                    >
                      {signatures[name] ? '✏️ Update' : '➕ Add'}
                    </button>
                    {signatures[name] && (
                      <button onClick={() => deleteSignature(name)} className="text-red-500 text-lg" title="Delete signature only">🗑️</button>
                    )}
                    <button onClick={() => deleteMember(name)} className="text-red-600 text-xs font-medium px-2 py-1 border border-red-300 rounded hover:bg-red-50 ml-1" title="Remove worker from list">Remove</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <SignaturePad
          name={showSignaturePad}
          onSave={(sig) => saveSignature(showSignaturePad, sig)}
          onCancel={() => setShowSignaturePad(null)}
        />
      )}
      {/* Storage & Fix Everything */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">🔧</span> Storage & Maintenance
        </h3>

        {storageInfo && (
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Local Storage</span>
              <span className="font-medium">{storageInfo.totalMB} MB / 5 MB</span>
            </div>
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${storageInfo.pct > 90 ? 'bg-red-500' : storageInfo.pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: Math.max(storageInfo.pct, 2) + '%' }}
              ></div>
            </div>
            <p className="text-xs text-gray-400 mt-1">{storageInfo.pct}% used</p>
          </div>
        )}

        <button
          onClick={doFixEverything}
          disabled={isFixing}
          className={`w-full py-3 rounded-lg text-white font-bold text-base ${isFixing ? 'bg-gray-400' : 'bg-red-600 active:bg-red-700'}`}
        >
          {isFixing ? 'Working...' : 'Fix Everything'}
        </button>

        <p className="text-xs text-gray-500 mt-2 text-center">
          Strips photos from cache, clears temp data & caches. Forms, credentials, and saved signatures are preserved.
        </p>

        {fixStatus && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${fixDone ? 'bg-green-50 border border-green-200 text-green-700' : isFixing ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {fixStatus}
          </div>
        )}

        {fixDone && (
          <button
            onClick={() => window.location.reload()}
            className="w-full mt-2 py-3 rounded-lg bg-orange-600 active:bg-orange-700 text-white font-bold text-base"
          >
            Reload App
          </button>
        )}
      </div>

      {/* System Health Section */}
      <SystemHealthCard />

      <div className="bg-white rounded-xl shadow-sm p-4">
        <p className="text-sm text-gray-600">J&M Artsteel Safety App v1.0</p>
        <p className="text-sm text-gray-600">NSW WHS Act 2011 Compliant</p>
      </div>
    </div>
  );
}
window.SettingsView = SettingsView;
