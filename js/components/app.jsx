// Main App: JMartSteelSafetyApp
// Uses custom hooks from hooks.jsx and modal components from modals.jsx

function JMartSteelSafetyApp({ isAdmin = false }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [forms, setForms] = useState([]);
  const [sites, setSites] = useState([]);
  const [editingForm, setEditingForm] = useState(null);
  const [templateToLoad, setTemplateToLoad] = useState(null);

  // Device Authorization
  const {
    deviceAuthStatus,
    isDeviceAdmin,
    canViewDevices,
    canRevokeDevices,
    pendingDevices,
    approvedDevices,
    newDeviceNotification, setNewDeviceNotification
  } = useDeviceAuth();

  // Form CRUD operations
  const formManager = useFormManager({ forms, setForms, editingForm, setEditingForm, setCurrentView });
  const {
    successModal,
    viewFormModal, setViewFormModal,
    deleteConfirmModal, setDeleteConfirmModal,
    updateConfirmModal,
    isUpdating,
    savedSignatures,
    deletingFormRef,
    deletedFormIdsRef,
    suppressNextFormsSyncRef,
    addForm,
    updateForm,
    confirmUpdate,
    continueEditing,
    cancelUpdate,
    deleteForm,
    handleDownloadPDF,
    closeSuccessModal,
    markAsBackedUp,
    isFormBackedUp,
    updateSignatures
  } = formManager;

  // Data sync (Firebase + localStorage)
  const {
    isOnline,
    syncStatus, setSyncStatus,
    pendingSyncCount,
    pendingPhotoCount,
    syncError,
    showSyncBanner, setShowSyncBanner,
    syncFormsEffect,
    syncSitesEffect
  } = useDataSync({ setForms, setSites, deletingFormRef, deletedFormIdsRef, suppressNextFormsSyncRef });

  // Prestart Templates (shared across dashboard, prestart form, camera)
  const { templates: prestartTemplates, templateJobNames, upsertTemplate, deleteTemplate } = usePrestartTemplates();

  // PWA Install
  const { showInstallPrompt, handleInstall, dismissInstall } = usePWAInstall();

  // Sync forms when they change
  useEffect(() => { syncFormsEffect(forms); }, [forms, isOnline, syncFormsEffect]);

  // Sync sites when they change
  useEffect(() => { syncSitesEffect(sites); }, [sites, isOnline, syncSitesEffect]);

  const previousPrestarts = forms.filter(f => f.type === 'prestart');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', emoji: '🏠' },
    { id: 'training', label: 'Training', emoji: '🎓' },
    { id: 'recordings', label: 'Recordings', emoji: '📸' },
    { id: 'prestart', label: 'Pre-Start Checks', emoji: '📋' },
    { id: 'steel-itp', label: 'Steel ITP', emoji: '🔩' },
    { id: 'inspection', label: 'Site Inspection', emoji: '🔍' },
    { id: 'itp', label: 'ITP Form', emoji: '📝' },
    { id: 'incidents', label: 'Incident Reports', emoji: '⚠️' },
    { id: 'toolbox', label: 'Toolbox Talks', emoji: '👥' },
    { id: 'emergency', label: 'Emergency Info', emoji: '📞' },
    { id: 'settings', label: 'Settings', emoji: '⚙️' },
  ];

  const openResetTool = () => {
    const url = new URL('./reset.html', window.location.href);
    url.searchParams.set('from', 'safety-app');
    window.location.assign(url.toString());
  };

  // Show loading while checking device authorization
  if (deviceAuthStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🛡️</div>
          <h2 className="text-xl font-bold text-gray-800">J&M Artsteel Safety</h2>
          <p className="text-gray-600 mt-2">Verifying device authorization...</p>
          <div className="mt-4">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show pending approval screen if device is not approved
  if (deviceAuthStatus === 'pending' || deviceAuthStatus === 'denied') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
          <div className={`p-6 text-center ${deviceAuthStatus === 'denied' ? 'bg-red-500' : 'bg-orange-500'} text-white`}>
            <div className="text-6xl mb-4">{deviceAuthStatus === 'denied' ? '🚫' : '🔐'}</div>
            <h2 className="text-2xl font-bold">
              {deviceAuthStatus === 'denied' ? 'Access Denied' : 'Authorization Required'}
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {deviceAuthStatus === 'pending' ? (
              <>
                <p className="text-gray-600 text-center">
                  This device is not yet authorized to access J&M Artsteel Safety.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 font-medium text-center">Waiting for Admin Approval</p>
                  <p className="text-yellow-700 text-sm text-center mt-1">
                    Your request has been sent. An administrator will review it shortly.
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-gray-500">Your Device:</p>
                  <p className="font-medium text-gray-800">{DeviceAuth.deviceInfo?.type} ({DeviceAuth.deviceInfo?.browser})</p>
                  <p className="text-xs text-gray-400">ID: {DeviceAuth.deviceId}</p>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <div className="animate-pulse w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Checking for approval...</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 text-center">
                  Your device access has been denied or revoked by an administrator.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-center">
                    Please contact your administrator if you believe this is an error.
                  </p>
                </div>
              </>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col safe-top">
      {/* Admin Device Notifications */}
      <NewDeviceNotification
        notification={newDeviceNotification}
        isDeviceAdmin={isDeviceAdmin}
        onApprove={async (id) => { await DeviceAuth.approveDevice(id); setNewDeviceNotification(null); }}
        onDeny={async (id) => { await DeviceAuth.denyDevice(id); setNewDeviceNotification(null); }}
        onDismiss={() => setNewDeviceNotification(null)}
      />
      <PendingDevicesBanner
        pendingDevices={pendingDevices}
        isDeviceAdmin={isDeviceAdmin}
        hasNotification={!!newDeviceNotification}
        onNavigateSettings={() => setCurrentView('settings')}
      />

      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          ⚠️ You're offline - Data will sync when connected
        </div>
      )}

      {/* Modals */}
      <SuccessModal
        successModal={successModal}
        onDownloadPDF={handleDownloadPDF}
        onClose={closeSuccessModal}
      />
      <ViewFormModal
        viewFormModal={viewFormModal}
        onClose={() => setViewFormModal(null)}
        onEdit={(form) => { setEditingForm(form); setViewFormModal(null); setCurrentView(form.type); }}
        onDownloadPDF={(form) => { PDFGenerator.download(form); markAsBackedUp(form.id); }}
        onDelete={(form) => setDeleteConfirmModal(form)}
      />
      <DeleteConfirmModal
        deleteConfirmModal={deleteConfirmModal}
        isFormBackedUp={isFormBackedUp}
        onDownloadPDF={(form) => { PDFGenerator.download(form); markAsBackedUp(form.id); }}
        onDelete={(formId) => deleteForm(formId)}
        onCancel={() => setDeleteConfirmModal(null)}
      />
      <UpdateConfirmModal
        updateConfirmModal={updateConfirmModal}
        isUpdating={isUpdating}
        onConfirm={confirmUpdate}
        onContinueEditing={continueEditing}
        onCancel={cancelUpdate}
      />

      {/* Status Banners */}
      <SyncStatusBanner
        syncStatus={syncStatus}
        pendingSyncCount={pendingSyncCount}
        syncError={syncError}
        onRetry={() => { FirebaseSync.retryAll(); setSyncStatus('syncing'); }}
      />
      <FirebaseSetupBanner
        showSyncBanner={showSyncBanner}
        onDismiss={() => setShowSyncBanner(false)}
        onSetup={() => { setCurrentView('settings'); setShowSyncBanner(false); }}
      />
      <InstallPromptBanner
        showInstallPrompt={showInstallPrompt}
        onDismiss={dismissInstall}
        onInstall={handleInstall}
      />

      <header className="bg-orange-600 text-white p-4 flex items-center justify-between shadow-lg sticky top-0 z-50 safe-top">
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-orange-700 rounded-lg text-xl" aria-label="Menu">☰</button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <div>
            <h1 className="font-bold text-lg leading-tight">J&M Artsteel</h1>
            <p className="text-xs text-orange-200">
              {!isOnline ? '📴 Offline Mode' :
               syncStatus === 'error' ? '⚠️ Sync Error' :
               pendingPhotoCount > 0 ? ('📷 ' + pendingPhotoCount + ' photo' + (pendingPhotoCount > 1 ? 's' : '') + ' queued') :
               syncStatus === 'pending' ? ('🔄 ' + pendingSyncCount + ' pending') :
               syncStatus === 'synced' ? '☁️ Synced' :
               syncStatus === 'syncing' ? '🔄 Syncing...' :
               syncStatus === 'local' ? '💾 Local Only' : 'Safety Management'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={openResetTool}
            className="p-2 hover:bg-orange-700 rounded-lg text-lg leading-none"
            aria-label="Open reset tool"
            title="Open reset tool"
          >
            🔄
          </button>
          {pendingPhotoCount > 0 && <span className="text-blue-300 text-sm animate-pulse">●</span>}
          {syncStatus === 'synced' && pendingPhotoCount === 0 && <span className="text-green-300 text-sm">●</span>}
          {syncStatus === 'syncing' && <span className="text-yellow-300 text-sm animate-pulse">●</span>}
          {syncStatus === 'pending' && <span className="text-yellow-300 text-sm animate-pulse">●</span>}
          {syncStatus === 'error' && <span className="text-red-400 text-sm">●</span>}
          {!isOnline && <span className="text-yellow-300 text-sm">●</span>}
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMenuOpen(false)}></div>
          <div className="relative w-72 bg-white shadow-xl">
            <div className="p-4 bg-orange-600 text-white">
              <p className="font-semibold">J&M Artsteel</p>
              <p className="text-sm text-orange-200">NSW Operations</p>
            </div>
            <nav className="p-2">
              {navItems.map((item) => (
                <button key={item.id} onClick={() => { setCurrentView(item.id); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${currentView === item.id ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <span>{item.emoji}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 pb-20">
        {currentView === 'dashboard' && <Dashboard setCurrentView={setCurrentView} forms={forms} onViewForm={setViewFormModal} isFormBackedUp={isFormBackedUp} sites={sites} prestartTemplates={prestartTemplates} templateJobNames={templateJobNames} onDeleteTemplate={deleteTemplate} onSelectTemplate={(template) => { setTemplateToLoad(template); setCurrentView('prestart'); }} />}
        {currentView === 'training' && <TrainingView />}
        {currentView === 'prestart' && <PrestartView onSubmit={(data, options) => addForm('prestart', data, options)} onUpdate={updateForm} editingForm={editingForm?.type === 'prestart' ? editingForm : null} previousPrestarts={previousPrestarts} sites={sites} savedTemplates={prestartTemplates} onUpsertTemplate={upsertTemplate} templateToLoad={templateToLoad} onTemplateLoaded={() => setTemplateToLoad(null)} />}
        {currentView === 'steel-itp' && <SteelITPView onSubmit={(data) => addForm('steel-itp', data)} onUpdate={updateForm} editingForm={editingForm?.type === 'steel-itp' ? editingForm : null} sites={sites} />}
        {currentView === 'inspection' && <SubcontractorInspectionView onSubmit={(data) => addForm('inspection', data)} onUpdate={updateForm} editingForm={editingForm?.type === 'inspection' ? editingForm : null} sites={sites} />}
        {currentView === 'itp' && <ITPFormView onSubmit={(data) => addForm('itp', data)} onUpdate={updateForm} editingForm={editingForm?.type === 'itp' ? editingForm : null} sites={sites} />}
        {currentView === 'incidents' && <IncidentView onSubmit={(data) => addForm('incident', data)} onUpdate={updateForm} editingForm={editingForm?.type === 'incident' ? editingForm : null} />}
        {currentView === 'toolbox' && <ToolboxView onSubmit={(data) => addForm('toolbox', data)} onUpdate={updateForm} editingForm={editingForm?.type === 'toolbox' ? editingForm : null} sites={sites} />}
        {currentView === 'emergency' && <EmergencyView />}
        {currentView === 'settings' && <SettingsView sites={sites} onUpdateSites={setSites} signatures={savedSignatures} onUpdateSignatures={updateSignatures} isAdmin={isAdmin} isDeviceAdmin={isDeviceAdmin} canViewDevices={canViewDevices} canRevokeDevices={canRevokeDevices} pendingDevices={pendingDevices} approvedDevices={approvedDevices} />}
        {currentView === 'recordings' && <RecordingsView forms={forms} sites={sites} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 px-1 z-30">
        {[
          { id: 'dashboard', emoji: '🏠', label: 'Home' },
          { id: 'training', emoji: '🎓', label: 'Training' },
          { id: 'prestart', emoji: '📋', label: 'Pre-Start' },
          { id: 'incidents', emoji: '⚠️', label: 'Incidents' },
          { id: 'emergency', emoji: '📞', label: 'Emergency' },
        ].map((item) => (
          <button key={item.id} onClick={() => setCurrentView(item.id)}
            className={`flex flex-col items-center p-2 rounded-lg ${currentView === item.id ? 'text-orange-600' : 'text-gray-500'}`}>
            <span className="text-xl">{item.emoji}</span>
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// Export to window for cross-file access
window.JMartSteelSafetyApp = JMartSteelSafetyApp;
