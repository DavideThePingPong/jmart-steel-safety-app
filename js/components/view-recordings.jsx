// RecordingsView Component
// Extracted from views.jsx

function RecordingsView({ forms, sites }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [savedRecordings, setSavedRecordings] = useState(() => {
    const saved = localStorage.getItem('jmart-job-recordings');
    return saved ? JSON.parse(saved) : [];
  });
  const [viewingRecording, setViewingRecording] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Smart job detection - find today's prestart
  useEffect(() => {
    if (!selectedJob) {
      const today = new Date().toDateString();
      const todaysPrestarts = forms.filter(f =>
        f.type === 'prestart' &&
        new Date(f.createdAt).toDateString() === today
      );

      if (todaysPrestarts.length > 0) {
        // Get the most recent prestart from today
        const latestPrestart = todaysPrestarts.sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        )[0];
        setSelectedJob({
          id: latestPrestart.id,
          name: latestPrestart.data?.siteConducted || 'Unknown Site',
          date: latestPrestart.createdAt,
          type: 'prestart'
        });
      }
    }
  }, [forms, selectedJob]);

  // Get available jobs from prestarts and sites
  const getAvailableJobs = () => {
    const jobs = [];

    // Add jobs from recent prestarts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    forms.filter(f =>
      f.type === 'prestart' &&
      new Date(f.createdAt) > sevenDaysAgo
    ).forEach(prestart => {
      const siteName = prestart.data?.siteConducted || 'Unknown Site';
      const dateStr = new Date(prestart.createdAt).toLocaleDateString('en-AU');
      jobs.push({
        id: prestart.id,
        name: siteName,
        date: prestart.createdAt,
        label: `${siteName} (${dateStr})`,
        type: 'prestart'
      });
    });

    // Add available sites (for manual selection)
    const defaultSites = sites.length > 0 ? sites : ['Site 1 - Sydney CBD', 'Site 2 - Parramatta', 'Site 3 - North Sydney'];
    defaultSites.forEach(site => {
      // Only add if not already in the list from prestarts
      if (!jobs.find(j => j.name === site)) {
        jobs.push({
          id: `site-${site}`,
          name: site,
          date: new Date().toISOString(),
          label: `${site} (No prestart today)`,
          type: 'site'
        });
      }
    });

    return jobs;
  };

  // Compress image
  const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedData = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedData);
        };
        img.onerror = () => resolve(event.target.result);
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  // Handle photo capture
  const handlePhotoCapture = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        const compressedData = await compressImage(file);
        if (compressedData) {
          const newPhoto = {
            id: Date.now() + Math.random(),
            name: file.name,
            data: compressedData,
            timestamp: new Date().toISOString()
          };
          setPhotos(prev => [...prev, newPhoto]);
        }
      }
    }
    e.target.value = '';
  };

  // Remove photo
  const removePhoto = (photoId) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // Save recording locally
  const saveRecordingLocally = () => {
    if (!selectedJob || photos.length === 0) return;

    const recording = {
      id: Date.now(),
      jobId: selectedJob.id,
      jobName: selectedJob.name,
      date: new Date().toISOString(),
      photos: photos,
      driveUploaded: false
    };

    const updatedRecordings = [recording, ...savedRecordings];
    setSavedRecordings(updatedRecordings);
    localStorage.setItem('jmart-job-recordings', JSON.stringify(updatedRecordings));
    setPhotos([]);
    setUploadStatus('Saved locally!');
    setTimeout(() => setUploadStatus(''), 3000);
  };

  // Upload to Google Drive
  const uploadToDrive = async () => {
    if (!selectedJob || photos.length === 0) return;
    if (!GoogleDriveSync.isConnected()) {
      setUploadStatus('Please connect Google Drive in Settings first');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading to Google Drive...');

    try {
      const result = await GoogleDriveSync.uploadJobPhotos(photos, selectedJob.name, new Date());

      if (result.success) {
        // Save recording with drive upload status
        const recording = {
          id: Date.now(),
          jobId: selectedJob.id,
          jobName: selectedJob.name,
          date: new Date().toISOString(),
          photos: photos,
          driveUploaded: true,
          driveResults: result.results
        };

        const updatedRecordings = [recording, ...savedRecordings];
        setSavedRecordings(updatedRecordings);
        localStorage.setItem('jmart-job-recordings', JSON.stringify(updatedRecordings));

        setPhotos([]);
        setUploadStatus(`Uploaded ${result.uploaded} photos to Google Drive!`);
      } else {
        setUploadStatus('Upload failed: ' + result.error);
      }
    } catch (error) {
      setUploadStatus('Upload error: ' + error.message);
    }

    setIsUploading(false);
    setTimeout(() => setUploadStatus(''), 5000);
  };

  // Download photos as ZIP (using individual downloads since we can't create ZIP in browser easily)
  const downloadPhotos = () => {
    photos.forEach((photo, idx) => {
      const link = document.createElement('a');
      link.href = photo.data;
      link.download = `${selectedJob?.name || 'job'}-photo-${idx + 1}.jpg`;
      link.click();
    });
    setUploadStatus(`Downloaded ${photos.length} photos!`);
    setTimeout(() => setUploadStatus(''), 3000);
  };

  // Delete saved recording
  const deleteRecording = (recordingId) => {
    const updatedRecordings = savedRecordings.filter(r => r.id !== recordingId);
    setSavedRecordings(updatedRecordings);
    localStorage.setItem('jmart-job-recordings', JSON.stringify(updatedRecordings));
    setViewingRecording(null);
  };

  const todayDate = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-4 text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span>📸</span> Job Recordings
        </h2>
        <p className="text-teal-100 text-sm mt-1">Capture and save photos for your job</p>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span>📅</span>
          <span>{todayDate}</span>
        </div>
      </div>

      {/* Job Selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800">Current Job</h3>
          <button
            onClick={() => setShowJobSelector(!showJobSelector)}
            className="text-teal-600 text-sm underline"
          >
            Change
          </button>
        </div>

        {selectedJob ? (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selectedJob.type === 'prestart' ? '📋' : '🏗️'}</span>
              <div>
                <p className="font-medium text-teal-800">{selectedJob.name}</p>
                <p className="text-xs text-teal-600">
                  {selectedJob.type === 'prestart' ? 'Prestart completed' : 'Manual selection'} - {new Date(selectedJob.date).toLocaleDateString('en-AU')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-800 text-sm">No job detected for today. Please select a job.</p>
          </div>
        )}

        {showJobSelector && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {getAvailableJobs().map((job, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedJob(job);
                  setShowJobSelector(false);
                }}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedJob?.id === job.id
                    ? 'bg-teal-100 border-teal-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{job.type === 'prestart' ? '📋' : '🏗️'}</span>
                  <span className="text-sm font-medium">{job.label}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Photo Capture */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">Take Photos</h3>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <span>📷</span> Camera
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <span>🖼️</span> Gallery
          </button>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} className="hidden" />
          <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handlePhotoCapture} className="hidden" />
        </div>

        {/* Photo Preview */}
        {photos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">{photos.length} photo(s) ready</p>
              <button
                onClick={() => setPhotos([])}
                className="text-red-500 text-sm underline"
              >
                Clear all
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative">
                  <img src={photo.data} alt="captured" className="w-full h-16 object-cover rounded-lg" />
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Options */}
      {photos.length > 0 && selectedJob && (
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-gray-800">Save Photos</h3>

          <button
            onClick={downloadPhotos}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <span>📥</span> Download to Phone
          </button>

          <button
            onClick={saveRecordingLocally}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <span>💾</span> Save in App
          </button>

          <button
            onClick={uploadToDrive}
            disabled={isUploading || !GoogleDriveSync.isConnected()}
            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              GoogleDriveSync.isConnected()
                ? 'bg-orange-600 text-white'
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            {isUploading ? (
              <>
                <span className="animate-spin">⏳</span> Uploading...
              </>
            ) : (
              <>
                <span>☁️</span> Upload to Google Drive
              </>
            )}
          </button>

          {!GoogleDriveSync.isConnected() && (
            <p className="text-xs text-gray-500 text-center">Connect Google Drive in Settings to enable cloud upload</p>
          )}
        </div>
      )}

      {/* Status Message */}
      {uploadStatus && (
        <div className={`p-3 rounded-lg text-center ${
          uploadStatus.includes('error') || uploadStatus.includes('failed')
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {uploadStatus}
        </div>
      )}

      {/* Saved Recordings */}
      {savedRecordings.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Saved Recordings</h3>
          <div className="space-y-2">
            {savedRecordings.slice(0, 10).map((recording) => (
              <button
                key={recording.id}
                onClick={() => setViewingRecording(recording)}
                className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📸</span>
                    <div>
                      <p className="font-medium text-gray-800">{recording.jobName}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(recording.date).toLocaleDateString('en-AU')} - {recording.photos.length} photos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {recording.driveUploaded && <span className="text-green-500 text-sm">☁️</span>}
                    <span className="text-gray-400">›</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View Recording Modal */}
      {viewingRecording && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="bg-teal-600 text-white p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{viewingRecording.jobName}</h2>
              <button onClick={() => setViewingRecording(null)} className="text-white text-2xl">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-sm text-gray-500">
                {new Date(viewingRecording.date).toLocaleDateString('en-AU', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
              {viewingRecording.driveUploaded && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                  <p className="text-green-700 text-sm">☁️ Uploaded to Google Drive</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2">
                {viewingRecording.photos.map((photo, idx) => (
                  <img
                    key={idx}
                    src={photo.data}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                    onClick={() => {
                      const win = window.open('', '_blank');
                      const img = win.document.createElement('img');
                      img.src = photo.data;
                      img.style.maxWidth = '100%';
                      img.style.height = 'auto';
                      win.document.body.appendChild(img);
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 space-y-2">
              <button
                onClick={() => {
                  viewingRecording.photos.forEach((photo, idx) => {
                    const link = document.createElement('a');
                    link.href = photo.data;
                    link.download = `${viewingRecording.jobName}-photo-${idx + 1}.jpg`;
                    link.click();
                  });
                }}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <span>📥</span> Download All Photos
              </button>
              <button
                onClick={() => deleteRecording(viewingRecording.id)}
                className="w-full bg-red-100 text-red-600 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <span>🗑️</span> Delete Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="font-semibold text-blue-800">Storage Info</h4>
            <p className="text-sm text-blue-700 mt-1">
              Photos are saved to your phone and can be uploaded to Google Drive.
              Firebase/Drive has plenty of space (~5GB free, affordable beyond that).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export to window for cross-file access
window.EmergencyView = EmergencyView;
window.SettingsView = SettingsView;
window.RecordingsView = RecordingsView;
window.RecordingsView = RecordingsView;
