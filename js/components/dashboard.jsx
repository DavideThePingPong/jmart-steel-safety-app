// Dashboard
// Extracted from index.html

function Dashboard({
  setCurrentView,
  forms,
  prestartTemplates = [],
  recentPrestartForms = [],
  templateJobNames = [],
  onDeleteTemplate,
  onDeleteRecentPrestart,
  onArchivePrestart,
  onEditRecentPrestart,
  onModifyRecentPrestart,
  onSelectTemplate
}) {
  const todayDate = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [menuStep, setMenuStep] = useState('jobs');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [archivingIds, setArchivingIds] = useState([]);
  const [deletingRecentIds, setDeletingRecentIds] = useState([]);
  const [editDateTimeModal, setEditDateTimeModal] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const formTypeLabels = {
    prestart: { label: 'Pre-Start', emoji: '📋', color: 'bg-green-500' },
    inspection: { label: 'Site Inspection', emoji: '🔍', color: 'bg-blue-500' },
    itp: { label: 'ITP Form', emoji: '📝', color: 'bg-indigo-500' },
    incident: { label: 'Incident', emoji: '⚠️', color: 'bg-red-500' },
    toolbox: { label: 'Toolbox Talk', emoji: '👥', color: 'bg-purple-500' },
    'steel-itp': { label: 'Steel ITP', emoji: '🔩', color: 'bg-slate-600' }
  };

  const templateTypeLabels = {
    site: 'Site Pre-Start',
    crane: 'Crane',
    forklift: 'Forklift',
    vehicle: 'Vehicle',
    welding: 'Welding',
    scaffold: 'Scaffold'
  };

  const templateTypeColors = {
    site: 'bg-green-100 text-green-700',
    crane: 'bg-yellow-100 text-yellow-700',
    forklift: 'bg-blue-100 text-blue-700',
    vehicle: 'bg-purple-100 text-purple-700',
    welding: 'bg-orange-100 text-orange-700',
    scaffold: 'bg-red-100 text-red-700'
  };

  const sortedTemplates = prestartTemplates
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  const sortedRecentPrestartForms = recentPrestartForms
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || b.data?.date || 0) - new Date(a.updatedAt || a.createdAt || a.data?.date || 0));

  const allJobs = templateJobNames;
  const activePrestartCount = forms.filter((form) => form.type === 'prestart' && form.status !== 'archived').length;

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

  const handleArchivePrestart = async (form, siteName) => {
    if (!onArchivePrestart || !form?.id) return;
    const confirmed = await ConfirmDialog.show(`Archive "${siteName}"? Requires Google Drive to be connected — the PDF is backed up to Drive before the form is hidden from the live list.`, { title: 'Archive Pre-Start', confirmLabel: 'Archive' });
    if (!confirmed) return;

    setArchivingIds((prev) => [...prev, form.id]);
    try {
      await onArchivePrestart(form.id);
    } finally {
      setArchivingIds((prev) => prev.filter((id) => id !== form.id));
    }
  };

  const handleDeleteRecentPrestart = async (form, siteName) => {
    if (!onDeleteRecentPrestart || !form?.id) return;
    const confirmed = await ConfirmDialog.show(`Delete "${siteName}" from Recent Pre-Starts?`, { title: 'Delete Pre-Start', confirmLabel: 'Delete', destructive: true });
    if (!confirmed) return;

    setDeletingRecentIds((prev) => [...prev, form.id]);
    try {
      await onDeleteRecentPrestart(form);
    } finally {
      setDeletingRecentIds((prev) => prev.filter((id) => id !== form.id));
    }
  };

  const handleModifyPrestart = (form, siteName) => {
    if (onModifyRecentPrestart) {
      onModifyRecentPrestart(form);
      return;
    }
    const formDate = form.data?.date ? new Date(form.data.date) : new Date(form.updatedAt || form.createdAt);
    const dateStr = localDateStr(formDate);
    const timeStr = formDate.toTimeString().slice(0, 5);
    setEditDateTimeModal({ form, siteName, date: dateStr, time: timeStr });
  };

  const handleSaveDateTime = () => {
    if (!editDateTimeModal || !onEditRecentPrestart) return;
    const { form, date, time } = editDateTimeModal;
    onEditRecentPrestart(form.id, date, time);
    setEditDateTimeModal(null);
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
    const errorMessages = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      try {
        setUploadProgress(`Uploading ${i + 1}/${files.length}: ${file.name}`);

        const result = await PhotoUploadManager.uploadPhoto(
          file,
          selectedJob,
          (message) => setUploadProgress(`${i + 1}/${files.length}: ${message}`)
        );

        if (result.success) {
          successCount += 1;
        } else {
          failCount += 1;
          errorMessages.push(`${file.name}: Upload failed`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        failCount += 1;
        errorMessages.push(`${file.name}: ${error.message}`);
      }
    }

    if (successCount > 0 && failCount === 0) {
      setUploadStatus({ type: 'success', message: `Uploaded ${successCount} photo(s) to ${selectedJob}` });
    } else if (successCount > 0 && failCount > 0) {
      setUploadStatus({ type: 'warning', message: `${successCount} uploaded, ${failCount} failed` });
    } else {
      setUploadStatus({ type: 'error', message: `Upload failed. ${errorMessages[0] || 'Check console for details'}` });
    }

    setUploadProgress(null);
    setSelectedJob(null);
    setMenuStep('jobs');
    e.target.value = '';

    setTimeout(() => setUploadStatus(null), 8000);
  };

  return (
    <div className="space-y-6">
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

      {uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-blue-700 text-sm">{uploadProgress}</span>
        </div>
      )}

      {uploadStatus && (
        <div
          className={`rounded-xl p-3 ${
            uploadStatus.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : uploadStatus.type === 'warning'
                ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          <span className="text-sm">{uploadStatus.message}</span>
        </div>
      )}

      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white relative">
        <div className="absolute top-3 right-3">
          <button
            onClick={() => {
              setShowPhotoMenu(!showPhotoMenu);
              setMenuStep('jobs');
            }}
            className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-xl backdrop-blur-sm"
            aria-label="Upload site photos"
          >
            📷
          </button>

          {showPhotoMenu && (
            <div className="absolute top-12 right-0 bg-white rounded-xl shadow-lg border border-gray-200 w-72 max-h-96 overflow-y-auto z-50">
              {menuStep === 'jobs' ? (
                <>
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">Upload Site Photos</p>
                    <p className="text-xs text-gray-500">Select which job these photos belong to</p>
                  </div>
                  <div className="p-2 max-h-60 overflow-y-auto">
                    {allJobs.length > 0 ? (
                      allJobs.map((job) => (
                        <button
                          key={job}
                          onClick={() => handleJobSelect(job)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 rounded-lg flex items-center gap-2"
                        >
                          <span className="text-lg">🏗️</span>
                          <span className="truncate">{job}</span>
                          <span className="ml-auto text-gray-400">→</span>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4 px-3">
                        No pre-start templates yet. Complete a Pre-Start first.
                      </p>
                    )}
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
                    <p className="text-xs text-gray-500 text-center mt-2">Gallery allows multiple photos</p>
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
            <span className="text-white font-bold text-xs">{activePrestartCount}</span>
          </div>
          <p className="text-gray-600 text-xs">Pre-Start</p>
        </div>
        <div className="bg-white rounded-xl p-2 shadow-sm">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mb-1">
            <span className="text-white font-bold text-xs">{forms.filter((form) => form.type === 'inspection' && form.status !== 'archived').length}</span>
          </div>
          <p className="text-gray-600 text-xs">Inspect</p>
        </div>
        <div className="bg-white rounded-xl p-2 shadow-sm">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mb-1">
            <span className="text-white font-bold text-xs">{forms.filter((form) => form.type === 'itp' && form.status !== 'archived').length}</span>
          </div>
          <p className="text-gray-600 text-xs">ITP</p>
        </div>
        <div className="bg-white rounded-xl p-2 shadow-sm">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mb-1">
            <span className="text-white font-bold text-xs">{forms.filter((form) => form.type === 'incident' && form.status !== 'archived').length}</span>
          </div>
          <p className="text-gray-600 text-xs">Incident</p>
        </div>
        <div className="bg-white rounded-xl p-2 shadow-sm">
          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mb-1">
            <span className="text-white font-bold text-xs">{forms.filter((form) => form.type === 'toolbox' && form.status !== 'archived').length}</span>
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
          <button onClick={() => setCurrentView('archive-map')} className="bg-white rounded-xl p-2 shadow-sm flex flex-col items-center gap-1 hover:shadow-md">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-lg">🗂️</div>
            <span className="text-xs font-medium text-gray-700 text-center">Archive</span>
          </button>
        </div>
      </div>

      {sortedTemplates.length > 0 && (
        <div>
          <div className="mb-3">
            <h3 className="font-semibold text-gray-800">Job Templates</h3>
            <p className="text-xs text-gray-500 mt-1">Latest reusable pre-start for each job</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
            {sortedTemplates.map((template) => {
              const siteName = template.data?.siteConducted || template.data?.builder || template.data?.address || 'Unknown';
              const checkType = template.data?.type || 'site';
              const updatedDate = template.updatedAt
                ? new Date(template.updatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
                : '';

              return (
                <div
                  key={template.templateKey}
                  className="flex-shrink-0 w-44 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer"
                >
                  <div className="p-3" onClick={() => onSelectTemplate && onSelectTemplate(template)}>
                    <p className="font-medium text-gray-800 text-sm truncate" title={siteName}>{siteName}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${templateTypeColors[checkType] || 'bg-gray-100 text-gray-700'}`}>
                        {templateTypeLabels[checkType] || checkType}
                      </span>
                    </div>
                    {updatedDate && <p className="text-xs text-gray-400 mt-2">{updatedDate}</p>}
                  </div>
                  <div className="border-t border-gray-100 px-3 py-1.5 flex justify-end">
                    {deleteConfirm === template.templateKey ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Delete?</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTemplate && onDeleteTemplate(template);
                            setDeleteConfirm(null);
                          }}
                          className="text-xs text-red-600 font-medium hover:text-red-800"
                        >
                          Yes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(null);
                          }}
                          className="text-xs text-gray-500 font-medium hover:text-gray-700"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(template.templateKey);
                        }}
                        className="text-gray-400 hover:text-red-500 text-sm"
                        title="Delete template"
                      >
                        Del
                      </button>
                    )}
                    
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sortedRecentPrestartForms.length > 0 && (
        <div>
          <div className="mb-3">
            <h3 className="font-semibold text-gray-800">Recent Pre-Starts</h3>
            <p className="text-xs text-gray-500 mt-1">Showing up to 5 latest pre-starts per job</p>
          </div>
          <div className="space-y-2">
            {sortedRecentPrestartForms.map((form) => {
              const siteName = form.data?.siteConducted || form.data?.builder || form.data?.address || 'Unknown';
              const checkType = form.data?.type || 'site';
              const sortDate = new Date(form.updatedAt || form.createdAt || form.data?.date || 0);
              const isArchiving = archivingIds.includes(form.id);
              const isDeleting = deletingRecentIds.includes(form.id);
              const isBusy = isArchiving || isDeleting;

              return (
                <div
                  key={form.id}
                  className="w-full bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 hover:shadow-md transition text-left"
                >
                  <div
                    className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-lg cursor-pointer"
                    onClick={() => onSelectTemplate && onSelectTemplate(form)}
                  >
                    {formTypeLabels.prestart.emoji}
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onSelectTemplate && onSelectTemplate(form)}
                  >
                    <p className="font-medium text-gray-800 text-sm truncate">{siteName}</p>
                    <p className="text-xs text-gray-500">
                      {templateTypeLabels[checkType] || checkType} • {sortDate.toLocaleDateString('en-AU')}
                    </p>
                    <p className="text-[11px] text-blue-600 mt-1 font-medium">Recent Form</p>
                  </div>
                  <div className="flex items-center gap-2">
                    
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleModifyPrestart(form, siteName);
                        }}
                        className="text-gray-400 hover:text-blue-600 text-sm disabled:opacity-50"
                        title="Modify pre-start"
                        aria-label={`Modify ${siteName}`}
                        disabled={isBusy}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchivePrestart(form, siteName);
                        }}
                        className="text-gray-400 hover:text-orange-600 text-sm disabled:opacity-50"
                        title="Archive to Firebase and Google Drive"
                        aria-label={`Archive ${siteName}`}
                        disabled={isBusy}
                      >
                        {isArchiving ? '…' : '🗄️'}
                      </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRecentPrestart(form, siteName);
                      }}
                      className="text-gray-400 hover:text-red-600 text-sm disabled:opacity-50"
                      title="Delete recent pre-start"
                      aria-label={`Delete ${siteName}`}
                      disabled={isBusy}
                    >
                      {isDeleting ? '…' : '🗑️'}
                    </button>
                    <span className="text-gray-400">›</span>
                  </div>
                </div>
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
            <p className="text-sm text-yellow-700 mt-1">
              Always wear appropriate PPE including safety glasses, steel-capped boots, and high-vis clothing when on site.
            </p>
          </div>
        </div>
      </div>

      {editDateTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-800 text-lg mb-1">Modify Pre-Start</h3>
            <p className="text-sm text-gray-500 mb-4 truncate">{editDateTimeModal.siteName}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editDateTimeModal.date}
                  onChange={(e) => setEditDateTimeModal((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={editDateTimeModal.time}
                  onChange={(e) => setEditDateTimeModal((prev) => ({ ...prev, time: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditDateTimeModal(null)}
                className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDateTime}
                className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-medium text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Training View Component

// Export to window for cross-file access
window.Dashboard = Dashboard;
