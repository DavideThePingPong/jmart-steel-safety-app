// Dashboard
// Extracted from index.html

function Dashboard({ setCurrentView, forms, onViewForm, isFormBackedUp, sites = [] }) {
  const todayDate = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [menuStep, setMenuStep] = useState('jobs'); // 'jobs' or 'capture'
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const formTypeLabels = {
    'prestart': { label: 'Pre-Start', emoji: '📋', color: 'bg-green-500' },
    'inspection': { label: 'Site Inspection', emoji: '🔍', color: 'bg-blue-500' },
    'itp': { label: 'ITP Form', emoji: '📝', color: 'bg-indigo-500' },
    'incident': { label: 'Incident', emoji: '⚠️', color: 'bg-red-500' },
    'toolbox': { label: 'Toolbox Talk', emoji: '👥', color: 'bg-purple-500' },
    'steel-itp': { label: 'Steel ITP', emoji: '🔩', color: 'bg-slate-600' }
  };

  const defaultSites = ['Site 1 - Sydney CBD', 'Site 2 - Parramatta', 'Site 3 - North Sydney'];
  const allJobs = sites.length > 0 ? sites : defaultSites;

  const recentForms = forms.slice(0, 10); // Show last 10 forms

  const handleJobSelect = (job) => {
    setSelectedJob(job);
    setMenuStep('capture');
  };

  const handleCameraClick = () => {
    setShowPhotoMenu(false);
    setTimeout(() => cameraInputRef.current?.click(), 100);
  };

  const handleGalleryClick = () => {
    setShowPhotoMenu(false);
    setTimeout(() => galleryInputRef.current?.click(), 100);
  };

  const handleBackToJobs = () => {
    setMenuStep('jobs');
    setSelectedJob(null);
  };

  const handlePhotoCapture = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedJob) {
      console.log('No files or job selected', { files: files?.length, selectedJob });
      return;
    }

    setUploadProgress(`Uploading ${files.length} photo(s)...`);
    setUploadStatus(null);

    let successCount = 0;
    let failCount = 0;
    let errorMessages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setUploadProgress(`Uploading ${i + 1}/${files.length}: ${file.name}`);

        const result = await PhotoUploadManager.uploadPhoto(
          file,
          selectedJob,
          (message, percent) => setUploadProgress(`${i + 1}/${files.length}: ${message}`)
        );

        console.log('Upload result:', result);

        if (result.success) {
          successCount++;
        } else {
          failCount++;
          errorMessages.push(`${file.name}: Upload failed`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        failCount++;
        errorMessages.push(`${file.name}: ${error.message}`);
      }
    }

    // Show result
    if (successCount > 0 && failCount === 0) {
      setUploadStatus({ type: 'success', message: `✅ ${successCount} photo(s) uploaded to ${selectedJob}` });
    } else if (successCount > 0 && failCount > 0) {
      setUploadStatus({ type: 'warning', message: `⚠️ ${successCount} uploaded, ${failCount} failed` });
    } else {
      setUploadStatus({ type: 'error', message: `❌ Upload failed. ${errorMessages[0] || 'Check console for details'}` });
    }

    setUploadProgress(null);
    setSelectedJob(null);
    setMenuStep('jobs');

    // Clear file input
    e.target.value = '';

    // Auto-hide status after 8 seconds
    setTimeout(() => setUploadStatus(null), 8000);
  };

  return (
    <div className="space-y-6">
      {/* Photo Upload Inputs (hidden) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Upload Status Banner */}
      {uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-blue-700 text-sm">{uploadProgress}</span>
        </div>
      )}

      {uploadStatus && (
        <div className={`rounded-xl p-3 ${
          uploadStatus.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
          uploadStatus.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
          'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <span className="text-sm">{uploadStatus.message}</span>
        </div>
      )}

      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white relative">
        {/* Photo Upload Button */}
        <div className="absolute top-3 right-3">
          <button
            onClick={() => { setShowPhotoMenu(!showPhotoMenu); setMenuStep('jobs'); }}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-xl backdrop-blur-sm"
          >
            📷
          </button>

          {/* Photo Menu */}
          {showPhotoMenu && (
            <div className="absolute top-12 right-0 bg-white rounded-xl shadow-lg border border-gray-200 w-72 max-h-96 overflow-y-auto z-50">
              {menuStep === 'jobs' ? (
                <>
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">📷 Upload Site Photos</p>
                    <p className="text-xs text-gray-500">Select which job these photos belong to</p>
                  </div>
                  <div className="p-2 max-h-60 overflow-y-auto">
                    {allJobs.map((job, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleJobSelect(job)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 rounded-lg flex items-center gap-2"
                      >
                        <span className="text-lg">🏗️</span>
                        <span className="truncate">{job}</span>
                        <span className="ml-auto text-gray-400">→</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 border-b border-gray-100">
                    <button onClick={handleBackToJobs} className="text-orange-600 text-sm flex items-center gap-1 mb-2">
                      ← Back
                    </button>
                    <p className="text-sm font-semibold text-gray-800">Upload to: {selectedJob}</p>
                  </div>
                  <div className="p-3 space-y-2">
                    <button
                      onClick={handleCameraClick}
                      className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-purple-700"
                    >
                      <span className="text-xl">📸</span>
                      Take Photo
                    </button>
                    <button
                      onClick={handleGalleryClick}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700"
                    >
                      <span className="text-xl">🖼️</span>
                      Choose from Gallery
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Gallery allows multiple photos
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <h2 className="text-xl font-bold">Welcome Back!</h2>
        <p className="text-orange-100 text-sm mt-1">Stay safe on site today</p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span>📅</span>
          <span>{todayDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        <div className="bg-white rounded-xl p-2 shadow-sm">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mb-1">
            <span className="text-white font-bold text-xs">{forms.filter(f => f.type === 'prestart').length}</span>
          </div>
          <p className="text-gray-600 text-xs">Pre-Start</p>
        </div>
        <div className="bg-white rounded-xl p-2 shadow-sm">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mb-1">
            <span className="text-white font-bold text-xs">{forms.filter(f => f.type === 'inspection').length}</span>
          </div>
          <p className="text-gray-600 text-xs">Inspect</p>
        </div>
        <div className="bg-white rounded-xl p-2 shadow-sm">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mb-1">
            <span className="text-white font-bold text-xs">{forms.filter(f => f.type === 'itp').length}</span>
          </div>
          <p className="text-gray-600 text-xs">ITP</p>
        </div>
        <div className="bg-white rounded-xl p-2 shadow-sm">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mb-1">
            <span className="text-white font-bold text-xs">{forms.filter(f => f.type === 'incident').length}</span>
          </div>
          <p className="text-gray-600 text-xs">Incident</p>
        </div>
        <div className="bg-white rounded-xl p-2 shadow-sm">
          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mb-1">
            <span className="text-white font-bold text-xs">{forms.filter(f => f.type === 'toolbox').length}</span>
          </div>
          <p className="text-gray-600 text-xs">Toolbox</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => setCurrentView('prestart')} className="bg-white rounded-xl p-2 shadow-sm flex flex-col items-center gap-1 hover:shadow-md">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-lg">📋</div>
            <span className="text-xs font-medium text-gray-700 text-center">Pre-Start</span>
          </button>
          <button onClick={() => setCurrentView('recordings')} className="bg-white rounded-xl p-2 shadow-sm flex flex-col items-center gap-1 hover:shadow-md border-2 border-teal-200">
            <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-lg">📸</div>
            <span className="text-xs font-medium text-gray-700 text-center">Recordings</span>
          </button>
          <button onClick={() => setCurrentView('steel-itp')} className="bg-white rounded-xl p-2 shadow-sm flex flex-col items-center gap-1 hover:shadow-md">
            <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-lg">🔩</div>
            <span className="text-xs font-medium text-gray-700 text-center">Steel ITP</span>
          </button>
          <button onClick={() => setCurrentView('inspection')} className="bg-white rounded-xl p-2 shadow-sm flex flex-col items-center gap-1 hover:shadow-md">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-lg">🔍</div>
            <span className="text-xs font-medium text-gray-700 text-center">Inspect</span>
          </button>
          <button onClick={() => setCurrentView('itp')} className="bg-white rounded-xl p-2 shadow-sm flex flex-col items-center gap-1 hover:shadow-md">
            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-lg">📝</div>
            <span className="text-xs font-medium text-gray-700 text-center">ITP</span>
          </button>
          <button onClick={() => setCurrentView('incidents')} className="bg-white rounded-xl p-2 shadow-sm flex flex-col items-center gap-1 hover:shadow-md">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-lg">⚠️</div>
            <span className="text-xs font-medium text-gray-700 text-center">Incident</span>
          </button>
        </div>
      </div>

      {/* Recent Forms */}
      {recentForms.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Recent Forms</h3>
          <div className="space-y-2">
            {recentForms.map(form => {
              const typeInfo = formTypeLabels[form.type] || { label: form.type, emoji: '📄', color: 'bg-gray-500' };
              const formDate = new Date(form.createdAt);
              const isBackedUp = isFormBackedUp(form.id);
              return (
                <button
                  key={form.id}
                  onClick={() => onViewForm(form)}
                  className="w-full bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 hover:shadow-md transition text-left"
                >
                  <div className={`w-10 h-10 ${typeInfo.color} rounded-lg flex items-center justify-center text-lg`}>
                    {typeInfo.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {form.data?.siteConducted || form.data?.site || form.data?.siteLocation || typeInfo.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formDate.toLocaleDateString('en-AU')} {formDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isBackedUp && <span className="text-green-500 text-xs">✓ Saved</span>}
                    <span className="text-gray-400">›</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-semibold text-yellow-800">Daily Safety Reminder</h4>
            <p className="text-sm text-yellow-700 mt-1">Always wear appropriate PPE including safety glasses, steel-capped boots, and high-vis clothing when on site.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Training View Component

// Export to window for cross-file access
window.Dashboard = Dashboard;
