// SettingsView Component
// Extracted from views.jsx

function SettingsView({ sites = [], onUpdateSites, signatures = {}, onUpdateSignatures, isAdmin = false, isDeviceAdmin = false, canViewDevices = false, canRevokeDevices = false, pendingDevices = [], approvedDevices = [] }) {
  const [newSite, setNewSite] = useState('');
  const [showAddSite, setShowAddSite] = useState(false);
  const [driveConnected, setDriveConnected] = useState(GoogleDriveSync.isConnected());
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
  const currentSites = sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites;

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

  const handleApproveDevice = async (deviceId) => {
    setDeviceActionLoading(deviceId);
    const success = await DeviceAuthManager.approveDevice(deviceId);
    setDeviceActionLoading(null);
    if (!success) {
      alert('Failed to approve device');
    }
  };

  const handleDenyDevice = async (deviceId) => {
    setDeviceActionLoading(deviceId);
    const success = await DeviceAuthManager.denyDevice(deviceId);
    setDeviceActionLoading(null);
    if (!success) {
      alert('Failed to deny device');
    }
  };

  const handleRevokeDevice = async (deviceId) => {
    if (confirm('Are you sure you want to revoke access for this device?')) {
      setDeviceActionLoading(deviceId);
      const success = await DeviceAuth.revokeDevice(deviceId);
      setDeviceActionLoading(null);
      if (!success) {
        alert('Failed to revoke device');
      }
    }
  };

  const handleRemoveDevice = async (deviceId) => {
    if (confirm('Are you sure you want to remove this device?')) {
      setDeviceActionLoading(deviceId);
      const success = await DeviceAuthManager.removeDevice(deviceId);
      setDeviceActionLoading(null);
      if (!success) {
        alert('Failed to remove device');
      }
    }
  };

  const handleStartRename = (device) => {
    setEditingDeviceId(device.id);
    setEditingDeviceName(device.name || '');
  };

  const handleSaveRename = async (deviceId) => {
    if (!editingDeviceName.trim()) {
      alert('Device name cannot be empty');
      return;
    }
    setDeviceActionLoading(deviceId);
    const success = await DeviceAuthManager.renameDevice(deviceId, editingDeviceName);
    setDeviceActionLoading(null);
    setEditingDeviceId(null);
    setEditingDeviceName('');
    if (!success) {
      alert('Failed to rename device');
    }
  };

  const handleCancelRename = () => {
    setEditingDeviceId(null);
    setEditingDeviceName('');
  };

  // Default team members from shared constants
  const defaultMembers = FORM_CONSTANTS.teamMembers;
  // Get all members (default + any custom added via signatures)
  const allMembers = [...new Set([...defaultMembers, ...Object.keys(signatures).filter(name => !defaultMembers.includes(name))])];

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

  const addNewMember = () => {
    if (newMemberName.trim() && !allMembers.includes(newMemberName.trim())) {
      // Add member with empty signature (will show "Add Signature" button)
      const newSignatures = { ...signatures, [newMemberName.trim()]: null };
      onUpdateSignatures(newSignatures);
      setNewMemberName('');
      setShowAddMember(false);
    }
  };

  const deleteMember = (name) => {
    // Only allow deleting custom members (not in defaultMembers)
    if (!defaultMembers.includes(name)) {
      const newSignatures = { ...signatures };
      delete newSignatures[name];
      onUpdateSignatures(newSignatures);
    }
  };

  const addSite = () => {
    if (newSite.trim()) {
      onUpdateSites([...currentSites, newSite.trim()]);
      setNewSite('');
      setShowAddSite(false);
    }
  };

  const connectDrive = () => {
    GoogleDriveSync.authorize();
    // Check connection status after a delay
    setTimeout(() => setDriveConnected(GoogleDriveSync.isConnected()), 3000);
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

  const lastBackup = localStorage.getItem('last-drive-backup-date');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">⚙️ Settings</h2>
        {isDeviceAdmin && (
          <p className="text-xs text-green-600 mt-1">🛡️ Admin Mode - You can manage device access</p>
        )}
      </div>

      {/* Current Device Info (for all users) */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span className="text-2xl">🔐</span> This Device
        </h3>
        <div className="bg-gray-50 rounded-lg p-3 space-y-1">
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
          <button onClick={() => setShowAddSite(!showAddSite)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm">+ Add Site</button>
        </div>
        {showAddSite && (
          <div className="mb-4 flex gap-2">
            <input type="text" value={newSite} onChange={(e) => setNewSite(e.target.value)} className="flex-1 border rounded-lg p-2 text-sm" placeholder="Enter site name" />
            <button onClick={addSite} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm">Add</button>
          </div>
        )}
        <div className="space-y-2">
          {currentSites.map((site, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">{site}</span>
              <button onClick={() => onUpdateSites(currentSites.filter(s => s !== site))} className="text-red-500">🗑️</button>
            </div>
          ))}
        </div>
      </div>
      {/* Team Signatures Section */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">✍️ Team Signatures</h3>
          <button onClick={() => setShowAddMember(!showAddMember)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm">+ Add Member</button>
        </div>
        <p className="text-xs text-gray-500 mb-3">Save signatures once and use them automatically in all forms</p>

        {showAddMember && (
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
          {allMembers.map((name, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-medium text-gray-700">{name}</span>
                {signatures[name] ? (
                  <img src={signatures[name]} alt={`${name}'s signature`} className="h-8 border rounded bg-white px-2" />
                ) : (
                  <span className="text-xs text-gray-400 italic">No signature saved</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSignaturePad(name)}
                  className={`px-3 py-1 rounded-lg text-sm ${signatures[name] ? 'bg-orange-100 text-orange-600' : 'bg-green-600 text-white'}`}
                >
                  {signatures[name] ? '✏️ Update' : '➕ Add'}
                </button>
                {signatures[name] && (
                  <button onClick={() => deleteSignature(name)} className="text-red-500 text-lg">🗑️</button>
                )}
                {!defaultMembers.includes(name) && (
                  <button onClick={() => deleteMember(name)} className="text-red-500 text-xs underline ml-1">Remove</button>
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
      <div className="bg-white rounded-xl shadow-sm p-4">
        <p className="text-sm text-gray-600">J&M Artsteel Safety App v1.0</p>
        <p className="text-sm text-gray-600">NSW WHS Act 2011 Compliant</p>
      </div>
    </div>
  );
}
window.SettingsView = SettingsView;
