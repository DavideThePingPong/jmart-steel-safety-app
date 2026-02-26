// Modal & Banner Components
// Extracted from app.jsx for maintainability

// =============================================
// Success Modal - shown after form submission
// =============================================
function SuccessModal({ successModal, onDownloadPDF, onClose }) {
  if (!successModal) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">
        <div className="bg-green-500 text-white p-6 text-center">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-xl font-bold">Form Submitted!</h2>
          <p className="text-green-100 text-sm mt-1">
            {PDFGenerator.folderMap[successModal.type] || successModal.type}
          </p>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-center text-sm">
            Your form has been saved{FirebaseSync.isConnected() ? ' and synced to the cloud' : ''}.
          </p>
          <button
            onClick={onDownloadPDF}
            className="w-full bg-orange-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-orange-700 transition"
          >
            <span className="text-xl">📥</span>
            Download PDF
          </button>
          <p className="text-xs text-gray-400 text-center">
            Save to Google Drive / JMart Steel / Safety Forms
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// View Form Modal - shows form details
// =============================================
function ViewFormModal({ viewFormModal, onClose, onEdit, onDownloadPDF, onDelete }) {
  if (!viewFormModal) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="bg-orange-600 text-white p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {PDFGenerator.folderMap[viewFormModal.type] || viewFormModal.type}
          </h2>
          <button onClick={onClose} className="text-white text-2xl">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-sm text-gray-500">
            {new Date(viewFormModal.createdAt).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' at '}
            {new Date(viewFormModal.createdAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
          </div>
          {viewFormModal.data && Object.entries(viewFormModal.data).map(([key, value]) => {
            if (!value || typeof value === 'object') return null;
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            return (
              <div key={key} className="border-b border-gray-100 pb-2">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm text-gray-800">{String(value)}</p>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={() => onEdit(viewFormModal)}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <span>✏️</span> Modify Form
          </button>
          <button
            onClick={() => onDownloadPDF(viewFormModal)}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <span>📥</span> Download PDF
          </button>
          <button
            onClick={() => onDelete(viewFormModal)}
            className="w-full bg-red-100 text-red-600 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <span>🗑️</span> Delete Form
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// Delete Confirmation Modal
// =============================================
function DeleteConfirmModal({ deleteConfirmModal, isFormBackedUp, onDownloadPDF, onDelete, onCancel }) {
  if (!deleteConfirmModal) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">
        <div className="bg-red-500 text-white p-4 text-center">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-lg font-bold mt-2">Delete Form?</h2>
        </div>
        <div className="p-4 space-y-4">
          {!isFormBackedUp(deleteConfirmModal.id) ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm font-medium">This form has NOT been backed up!</p>
              <p className="text-yellow-700 text-xs mt-1">Download the PDF first to save a copy.</p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 text-sm">✓ This form has been backed up</p>
            </div>
          )}
          <div className="space-y-2">
            {!isFormBackedUp(deleteConfirmModal.id) && (
              <button
                onClick={() => onDownloadPDF(deleteConfirmModal)}
                className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold"
              >
                📥 Download PDF First
              </button>
            )}
            <button
              onClick={() => onDelete(deleteConfirmModal.id)}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold"
            >
              🗑️ Delete Permanently
            </button>
            <button
              onClick={onCancel}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// Update Confirmation Modal
// =============================================
function UpdateConfirmModal({ updateConfirmModal, isUpdating, onConfirm, onContinueEditing, onCancel }) {
  if (!updateConfirmModal) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120] p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">
        <div className="bg-blue-600 text-white p-4 text-center">
          <span className="text-4xl">🔄</span>
          <h2 className="text-lg font-bold mt-2">Update Form?</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800 text-sm font-medium">You've made changes to this form.</p>
            <p className="text-blue-700 text-xs mt-1">
              {GoogleDriveSync.isConnected()
                ? 'This will update Firebase and replace the old PDF on Google Drive.'
                : 'This will update the form in Firebase.'}
            </p>
          </div>

          {updateConfirmModal.formData?.siteConducted && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-gray-600 text-xs">Site</p>
              <p className="text-gray-800 font-medium">{updateConfirmModal.formData.siteConducted}</p>
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={onConfirm}
              disabled={isUpdating}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              {isUpdating ? (
                <>
                  <span className="animate-spin">⏳</span> Updating...
                </>
              ) : (
                <>
                  <span>✓</span> Yes, Replace Old Version
                </>
              )}
            </button>
            <button
              onClick={onContinueEditing}
              disabled={isUpdating}
              className="w-full bg-blue-100 text-blue-700 py-3 rounded-xl font-semibold disabled:bg-gray-200"
            >
              ✏️ Keep Editing
            </button>
            <button
              onClick={onCancel}
              disabled={isUpdating}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium disabled:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// Admin Device Notification Banner
// =============================================
function NewDeviceNotification({ notification, isDeviceAdmin, onApprove, onDeny, onDismiss }) {
  if (!notification || !isDeviceAdmin) return null;
  return (
    <div className="fixed top-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-xl shadow-lg z-[200] animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <p className="font-semibold">New Device Request!</p>
            <p className="text-sm text-blue-100">
              {notification.type} ({notification.browser}) wants access
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(notification.id)}
            className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-600"
          >
            Approve
          </button>
          <button
            onClick={() => onDeny(notification.id)}
            className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-red-600"
          >
            Deny
          </button>
          <button
            onClick={onDismiss}
            className="text-white opacity-70 px-2"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// Pending Devices Banner (admin only)
// =============================================
function PendingDevicesBanner({ pendingDevices, isDeviceAdmin, hasNotification, onNavigateSettings }) {
  if (pendingDevices.length === 0 || !isDeviceAdmin || hasNotification) return null;
  return (
    <div
      onClick={onNavigateSettings}
      className="bg-blue-500 text-white p-2 text-center cursor-pointer hover:bg-blue-600 transition"
    >
      <span className="text-sm font-medium">
        📱 {pendingDevices.length} device(s) waiting for approval - Tap to review
      </span>
    </div>
  );
}

// =============================================
// Sync Error/Pending Banner
// =============================================
function SyncStatusBanner({ syncStatus, pendingSyncCount, syncError, onRetry }) {
  if (syncStatus !== 'error' && !(syncStatus === 'pending' && pendingSyncCount > 0)) return null;
  return (
    <div className={`fixed bottom-20 left-3 right-3 ${syncStatus === 'error' ? 'bg-red-600' : 'bg-yellow-600'} text-white p-3 rounded-xl shadow-lg z-50`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{syncStatus === 'error' ? '⚠️' : '🔄'}</span>
          <div>
            <p className="font-semibold text-sm">
              {syncStatus === 'error' ? 'Sync Failed' : `${pendingSyncCount} form(s) waiting to sync`}
            </p>
            <p className="text-xs opacity-80">
              {syncStatus === 'error' ? (syncError || 'Will retry automatically when online') : 'Will sync when connection is restored'}
            </p>
          </div>
        </div>
        <button
          onClick={onRetry}
          className="bg-white text-gray-800 px-3 py-1 rounded-lg text-sm font-semibold"
        >
          Retry Now
        </button>
      </div>
    </div>
  );
}

// =============================================
// Firebase Setup Banner
// =============================================
function FirebaseSetupBanner({ showSyncBanner, onDismiss, onSetup }) {
  if (!showSyncBanner || FirebaseSync.isConnected()) return null;
  return (
    <div className="fixed bottom-20 left-3 right-3 bg-blue-600 text-white p-3 rounded-xl shadow-lg z-50 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xl">☁️</span>
        <div>
          <p className="font-semibold text-sm">Enable Cloud Sync</p>
          <p className="text-xs opacity-80">Sync data across all devices</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onDismiss} className="text-white opacity-70 px-2 py-1 text-sm">Later</button>
        <button onClick={onSetup} className="bg-white text-blue-600 px-3 py-1 rounded-lg text-sm font-semibold">Setup</button>
      </div>
    </div>
  );
}

// =============================================
// Install Prompt Banner
// =============================================
function InstallPromptBanner({ showInstallPrompt, onDismiss, onInstall }) {
  if (!showInstallPrompt) return null;
  return (
    <div className="install-banner">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📲</span>
        <div>
          <p className="font-semibold text-sm">Install J&M Artsteel Safety</p>
          <p className="text-xs opacity-80">Quick access from home screen</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onDismiss} className="text-white opacity-70 px-2 py-1 text-sm">Later</button>
        <button onClick={onInstall} className="bg-white text-orange-600 px-3 py-1 rounded-lg text-sm font-semibold">Install</button>
      </div>
    </div>
  );
}

// Export to window for cross-file access
window.SuccessModal = SuccessModal;
window.ViewFormModal = ViewFormModal;
window.DeleteConfirmModal = DeleteConfirmModal;
window.UpdateConfirmModal = UpdateConfirmModal;
window.NewDeviceNotification = NewDeviceNotification;
window.PendingDevicesBanner = PendingDevicesBanner;
window.SyncStatusBanner = SyncStatusBanner;
window.FirebaseSetupBanner = FirebaseSetupBanner;
window.InstallPromptBanner = InstallPromptBanner;
