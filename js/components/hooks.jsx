// Custom React Hooks for JMart Steel Safety App
// Extracted from app.jsx for maintainability

// =============================================
// useFormManager - CRUD operations for forms
// =============================================
function useFormManager({ forms, setForms, editingForm, setEditingForm, setCurrentView }) {
  const [successModal, setSuccessModal] = useState(null);
  const [viewFormModal, setViewFormModal] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [updateConfirmModal, setUpdateConfirmModal] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [backedUpForms, setBackedUpForms] = useState(() => {
    try {
      const saved = localStorage.getItem('jmart-backed-up-forms');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : Object.values(parsed || {});
      }
    } catch (e) { console.warn('Could not parse backed-up forms:', e); }
    return [];
  });
  const [savedSignatures, setSavedSignatures] = useState(() => {
    try {
      const saved = localStorage.getItem('jmart-team-signatures');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Could not parse team signatures:', e);
      return {};
    }
  });

  const deletingFormRef = useRef(false);
  const deletedFormIdsRef = useRef(new Set(function() { try { return JSON.parse(localStorage.getItem('jmart-deleted-form-ids') || '[]'); } catch(e) { return []; } }()));

  // Mark form as backed up (after PDF download)
  const markAsBackedUp = (formId) => {
    const newBackedUp = [...backedUpForms, formId];
    setBackedUpForms(newBackedUp);
    localStorage.setItem('jmart-backed-up-forms', JSON.stringify(newBackedUp));
  };

  // Check if form is backed up
  const isFormBackedUp = (formId) => backedUpForms.includes(formId);

  // Update team signatures
  const updateSignatures = (newSignatures) => {
    setSavedSignatures(newSignatures);
    if (typeof StorageQuotaManager !== 'undefined' && StorageQuotaManager.safeSignaturesWrite) { StorageQuotaManager.safeSignaturesWrite(newSignatures); } else { localStorage.setItem('jmart-team-signatures', JSON.stringify(newSignatures)); }
    if (FirebaseSync.isConnected()) {
      firebaseDb.ref('signatures').set(typeof sanitizeForFirebase === 'function' ? sanitizeForFirebase(newSignatures) : newSignatures)
        .catch(err => console.error('Signature sync error:', err));
    }
  };

  // Signature reuse warning flag — components should show amber banner when using saved signatures
  const signatureReuseWarning = Object.keys(savedSignatures).length > 0
    ? 'Saved signatures are being reused. Ensure each signer is physically present and consents to signing.'
    : null;

  // Add a new form
  const addForm = (formType, formData) => {
    try {
      const uniqueId = Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
      const newForm = {
        id: uniqueId,
        type: formType,
        data: formData,
        createdAt: new Date().toISOString(),
        createdBy: DeviceAuthManager.deviceId || 'unknown',
        createdByName: localStorage.getItem('jmart-user-name') || 'Unknown User',
        version: 1,
        status: 'completed',
        locked: true  // Forms are locked after submission — only admins can edit
      };
      console.log('addForm called, current forms:', forms.length);

      setForms(prevForms => {
        const updatedForms = [newForm, ...prevForms];
        console.log('setForms update, new length:', updatedForms.length);

        // Safe write to localStorage (strips large data, trims to fit)
        StorageQuotaManager.safeFormsWrite(updatedForms);

        // NOTE: Do NOT call FirebaseSync.syncForms() here.
        // setForms triggers the useEffect in app.jsx → syncFormsEffect → debounced syncForms.
        // Calling syncForms directly here PLUS via syncFormsEffect causes double-sync:
        // first sync might succeed, second (2s later) fails → error banner shows.

        return updatedForms;
      });

      // Auto-download PDF + upload to Drive
      setTimeout(() => {
        try {
          const filename = PDFGenerator.download(newForm);
          markAsBackedUp(newForm.id);
          console.log('Auto-saved PDF:', filename);

          // Upload PDF to Google Drive (non-blocking — form is already saved)
          if (typeof GoogleDriveSync !== 'undefined' && GoogleDriveSync.isConnected()) {
            try {
              const { doc } = PDFGenerator.generate(newForm);
              const pdfBlob = doc.output('blob');
              GoogleDriveSync.uploadPDF(pdfBlob, filename, formType)
                .then(function(r) { if (r) console.log('PDF uploaded to Drive:', filename); })
                .catch(function(e) { console.error('Drive PDF upload error:', e); if (typeof ToastNotifier !== 'undefined') ToastNotifier.warning('PDF saved locally but Drive upload failed'); });
            } catch (driveErr) {
              console.error('Drive PDF generation error:', driveErr);
              if (typeof ToastNotifier !== 'undefined') ToastNotifier.warning('Could not generate PDF for Drive backup');
            }
          }
        } catch (pdfErr) {
          console.error('PDF generation error:', pdfErr);
        }
      }, 500);

      // AUDIT LOG
      AuditLogManager.log('create', {
        formId: newForm.id,
        formType: formType,
        site: formData.siteConducted || formData.site || 'Unknown',
        action: 'Form created'
      });

      setSuccessModal({ form: newForm, type: formType });
    } catch (err) {
      console.error('Error saving form:', err);
      ToastNotifier.error('Error saving form: ' + err.message + '. Please try again.');
    }
  };

  // Unlock a locked form (admin only)
  const unlockForm = (formId) => {
    if (!DeviceAuthManager.isAdmin) {
      ToastNotifier.warning('Only admins can unlock submitted forms for editing.');
      return false;
    }
    setForms(prevForms => {
      const updated = prevForms.map(f => f.id === formId ? { ...f, locked: false } : f);
      StorageQuotaManager.safeFormsWrite(updated);
      return updated;
    });
    AuditLogManager.log('unlock', { formId, action: 'Form unlocked for editing by admin' });
    return true;
  };

  // Show confirmation modal before updating
  const updateForm = (formId, formType, formData) => {
    // Check if form is locked — only admins can edit locked forms
    if (editingForm?.locked) {
      if (!DeviceAuthManager.isAdmin) {
        ToastNotifier.warning('This form has been submitted and locked. Only an admin can edit it.');
        return;
      }
      // Admin can proceed — form will be unlocked during update
      console.log('Admin editing locked form:', formId);
    }
    console.log('updateForm called - showing confirmation for id:', formId);
    const updatedForm = {
      id: formId,
      type: formType,
      data: formData,
      createdAt: editingForm?.createdAt,
      createdBy: editingForm?.createdBy,
      createdByName: editingForm?.createdByName,
      updatedAt: new Date().toISOString(),
      modifiedBy: DeviceAuthManager.deviceId || 'unknown',
      modifiedByName: localStorage.getItem('jmart-user-name') || 'Unknown User',
      version: (editingForm?.version || 1) + 1,
      previousVersion: editingForm ? {
        data: editingForm.data,
        modifiedAt: editingForm.updatedAt || editingForm.createdAt,
        modifiedBy: editingForm.modifiedBy || editingForm.createdBy
      } : null,
      status: 'completed'
    };
    setUpdateConfirmModal({ form: updatedForm, formType, formData, originalForm: editingForm });
  };

  // Go back to editing mode
  const continueEditing = () => {
    setUpdateConfirmModal(null);
  };

  // Confirm and sync the update — checks remote version before overwriting
  const confirmUpdate = async () => {
    if (!updateConfirmModal) return;

    setIsUpdating(true);
    const { form, formType, formData, originalForm } = updateConfirmModal;
    const siteName = formData.siteConducted || formData.site || '';

    try {
      // Version check: read remote version from Firebase before writing
      if (FirebaseSync.isConnected() && form.id) {
        try {
          const remoteSnap = await firebaseDb.ref('jmart-safety/forms/' + form.id).once('value');
          const remoteForm = remoteSnap.val();
          if (remoteForm && remoteForm.version && originalForm && originalForm.version) {
            if (remoteForm.version > originalForm.version) {
              const overwrite = await ConfirmDialog.show(
                'This form was updated by another device (v' + remoteForm.version + ' vs your v' + originalForm.version + '). Overwrite with your changes?',
                { title: 'Version Conflict', confirmLabel: 'Overwrite', destructive: true }
              );
              if (!overwrite) {
                setIsUpdating(false);
                return;
              }
            }
          }
        } catch (versionErr) {
          console.warn('Version check skipped (non-fatal):', versionErr.message);
        }
      }

      if (GoogleDriveSync.isConnected() && siteName) {
        console.log('Searching for old PDFs to delete...');
        await GoogleDriveSync.deleteOldFormPDFs(form.id, siteName);
      }

      setForms(prevForms => {
        const updatedForms = prevForms.map(f => {
          if (f.id === form.id) {
            return { ...f, data: formData, updatedAt: new Date().toISOString(), version: form.version, modifiedBy: form.modifiedBy, modifiedByName: form.modifiedByName, previousVersion: form.previousVersion, status: form.status || 'completed' };
          }
          return f;
        });

        StorageQuotaManager.safeFormsWrite(updatedForms);
        console.log('Updated form saved to localStorage');

        // NOTE: Firebase sync handled by syncFormsEffect via setForms trigger.
        // Do NOT call syncForms directly here — causes double-sync.

        return updatedForms;
      });

      try {
        const filename = PDFGenerator.download(form);
        if (filename) {
          markAsBackedUp(form.id);
          console.log('Downloaded updated PDF:', filename);

          if (GoogleDriveSync.isConnected()) {
            const result = PDFGenerator.generate(form);
            if (result && result.doc) {
              const pdfBlob = result.doc.output('blob');
              await GoogleDriveSync.uploadPDF(pdfBlob, filename, form.type);
              console.log('Uploaded new PDF to Drive:', form.type);
            }
          }
        }
      } catch (pdfErr) {
        console.error('PDF generation failed during update:', pdfErr);
        // Non-fatal — form data is already saved
      }

      AuditLogManager.log('update', {
        formId: form.id,
        formType: formType,
        site: formData.siteConducted || formData.site || 'Unknown',
        version: form.version || 2,
        action: 'Form updated'
      });

      setUpdateConfirmModal(null);
      setEditingForm(null);
      setIsUpdating(false);
      setSuccessModal({ form, type: formType, wasUpdated: true });

    } catch (error) {
      console.error('Error during update:', error);
      setIsUpdating(false);
      ToastNotifier.error('Error updating form. Please try again.');
    }
  };

  // Cancel update and go back to dashboard
  const cancelUpdate = () => {
    setUpdateConfirmModal(null);
    setEditingForm(null);
    setCurrentView('dashboard');
  };

  const handleDownloadPDF = () => {
    if (successModal?.form) {
      try {
        const filename = PDFGenerator.download(successModal.form);
        if (filename) {
          markAsBackedUp(successModal.form.id);
          console.log('Downloaded and backed up:', filename);
        }
      } catch (e) {
        console.error('PDF download failed:', e);
        if (typeof ToastNotifier !== 'undefined') ToastNotifier.error('Could not generate PDF');
      }
    }
  };

  const closeSuccessModal = () => {
    setSuccessModal(null);
    setEditingForm(null);
    setCurrentView('dashboard');
  };

  // Delete form (with backup check) — uses setForms callback to avoid stale closure
  const deleteForm = (formId) => {
    setDeleteConfirmModal(null);
    setViewFormModal(null);

    // Persist deleted form ID so Firebase listener won't merge it back when reconnecting
    deletedFormIdsRef.current.add(formId);
    try {
      localStorage.setItem('jmart-deleted-form-ids', JSON.stringify([...deletedFormIdsRef.current]));
    } catch (e) { console.warn('Could not persist deleted form IDs:', e.message); }

    setForms(prevForms => {
      const deletedForm = prevForms.find(f => f.id === formId);
      const updatedForms = prevForms.filter(f => f.id !== formId);

      AuditLogManager.log('delete', {
        formId: formId,
        formType: deletedForm?.type || 'unknown',
        site: deletedForm?.data?.siteConducted || deletedForm?.data?.site || 'Unknown',
        originalCreatedBy: deletedForm?.createdBy || deletedForm?._modifiedBy || 'unknown',
        originalCreatedAt: deletedForm?.createdAt || 'unknown',
        action: 'Form deleted'
      });

      StorageQuotaManager.safeFormsWrite(updatedForms);
      console.log('Form deleted, saved to localStorage:', updatedForms.length, 'forms remaining');

      // NOTE: Firebase sync handled by syncFormsEffect via setForms trigger.
      // For deletions, we also need to remove the form from Firebase directly,
      // since update() only adds/modifies keys — it can't delete them.
      if (FirebaseSync.isConnected()) {
        FirebaseSync._ensureAuth().then(function(ok) {
          if (ok && firebaseDb) {
            firebaseDb.ref('jmart-safety/forms/' + formId).remove().then(function() {
              console.log('Form deleted from Firebase:', formId);
              deletedFormIdsRef.current.delete(formId);
              try { localStorage.setItem('jmart-deleted-form-ids', JSON.stringify([...deletedFormIdsRef.current])); } catch (e) {}
            }).catch(function(err) { console.error('Failed to delete form from Firebase:', err); });
          }
        });
      }

      return updatedForms;
    });
  };

  return {
    // State
    successModal,
    viewFormModal, setViewFormModal,
    deleteConfirmModal, setDeleteConfirmModal,
    updateConfirmModal,
    isUpdating,
    backedUpForms,
    savedSignatures,
    deletingFormRef,
    deletedFormIdsRef,
    // Functions
    addForm,
    updateForm,
    unlockForm,
    confirmUpdate,
    continueEditing,
    cancelUpdate,
    deleteForm,
    handleDownloadPDF,
    closeSuccessModal,
    markAsBackedUp,
    isFormBackedUp,
    updateSignatures,
    signatureReuseWarning
  };
}

// =============================================
// useDataSync - Firebase/localStorage sync
// =============================================
function useDataSync({ setForms, setSites, deletingFormRef, deletedFormIdsRef }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isOnlineRef = useRef(isOnline);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncStatus, setSyncStatus] = useState(FirebaseSync.isConnected() ? 'synced' : 'local');
  const [pendingSyncCount, setPendingSyncCount] = useState(FirebaseSync.getPendingCount());
  const [pendingPhotoCount, setPendingPhotoCount] = useState(OfflinePhotoQueue.getCount());
  const [syncError, setSyncError] = useState(null);
  const [showSyncBanner, setShowSyncBanner] = useState(!FirebaseSync.isConnected());

  const isInitialLoad = useRef(true);
  const formsFromFirebaseRef = useRef(false);  // Anti-loop: skip syncing back to Firebase when data came FROM Firebase
  const sitesFromFirebaseRef = useRef(false);
  const lastFormsWriteRef = useRef(0); // throttle forms listener writes
  const formsListenerTimerRef = useRef(null); // debounce timer for Firebase forms listener

  // Load saved data from localStorage first, then listen to Firebase
  useEffect(() => {
    const savedForms = localStorage.getItem('jmart-safety-forms');
    let localForms = [];
    if (savedForms) {
      try {
        localForms = JSON.parse(savedForms);
        setForms(localForms);
        console.log('Loaded from localStorage:', localForms.length, 'forms');
      } catch (e) {
        console.error('Error parsing localStorage forms:', e);
        if (typeof ToastNotifier !== 'undefined') ToastNotifier.warning('Form data may be corrupted. Try Fix Everything in Settings.');
        if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(e, 'forms-parse');
      }
    }

    const savedSites = localStorage.getItem('jmart-safety-sites');
    if (savedSites) {
      try {
        const parsed = JSON.parse(savedSites);
        const mapped = (Array.isArray(parsed) ? parsed : Object.values(parsed || {})).map(s => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') {
            const chars = Object.keys(s).filter(k => k !== '_lastModified' && !isNaN(k)).sort((a,b) => Number(a) - Number(b));
            return chars.map(k => s[k]).join('');
          }
          return String(s);
        }).filter(s => s && s.length > 1 && s !== 'undefined' && s !== 'null');
        // Deduplicate case-insensitively, keeping first occurrence
        const seen = new Set();
        const sanitized = mapped.filter(s => {
          const key = s.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setSites(sanitized);
        localStorage.setItem('jmart-safety-sites', JSON.stringify(sanitized));
      } catch (e) {
        console.error('Error parsing localStorage sites:', e);
        if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(e, 'sites-parse');
      }
    }

    const lastSync = localStorage.getItem('jmart-last-sync');
    if (lastSync) setLastSynced(lastSync);

    if (FirebaseSync.isConnected()) {
      const unsubForms = FirebaseSync.onFormsChange((firebaseForms) => {
        const formsArray = Array.isArray(firebaseForms) ? firebaseForms : Object.values(firebaseForms || {});

        // Debounce: coalesce rapid Firebase listener fires into one update.
        // Old approach (hard skip if <5s) silently dropped updates.
        // New approach: always process the LATEST data after a 1s settle period.
        if (formsListenerTimerRef.current) clearTimeout(formsListenerTimerRef.current);
        formsListenerTimerRef.current = setTimeout(() => {
          formsListenerTimerRef.current = null;
          _processFormsFromFirebase(formsArray);
        }, 1000);
      });

      // Extracted handler so the debounce closure captures the latest formsArray
      const _processFormsFromFirebase = (formsArray) => {
        lastFormsWriteRef.current = Date.now();
        console.log('Firebase forms received:', formsArray.length, 'forms');

        if (formsArray.length > 0) {
          const formMap = new Map();

          // Filter out forms that were deleted offline but haven't been purged from Firebase yet
          const deletedIds = deletedFormIdsRef ? deletedFormIdsRef.current : new Set();

          formsArray.forEach(form => {
            if (deletedIds.has(form.id)) return; // Skip forms deleted offline
            formMap.set(form.id, { ...form, source: 'firebase' });
          });

          // Merge with local-only forms (forms not yet in Firebase)
          let currentLocalForms = [];
          try {
            const freshLocal = localStorage.getItem('jmart-safety-forms');
            if (freshLocal) currentLocalForms = JSON.parse(freshLocal);
          } catch (e) { /* ignore */ }

          currentLocalForms.forEach(localForm => {
            if (!formMap.has(localForm.id)) {
              formMap.set(localForm.id, { ...localForm, source: 'local' });
            }
          });

          const mergedForms = [];
          formMap.forEach(form => mergedForms.push(form));
          mergedForms.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

          // Update React state with full data (including photos for viewing)
          formsFromFirebaseRef.current = true;  // Prevent syncFormsEffect from sending back to Firebase
          setForms(mergedForms);

          // Write to localStorage using safe writer (strips large data, trims to fit)
          StorageQuotaManager.safeFormsWrite(mergedForms);
          console.log('Forms synced:', mergedForms.length, 'total');
        } else {
          // Firebase returned empty — check if we have local forms to push
          // Read fresh from localStorage to avoid stale closure over initial localForms
          let freshLocalForms = [];
          try {
            const freshLocal = localStorage.getItem('jmart-safety-forms');
            if (freshLocal) freshLocalForms = JSON.parse(freshLocal);
          } catch (e) { /* ignore */ }
          if (freshLocalForms.length > 0) {
            console.log('Firebase empty, pushing local forms to Firebase');
            FirebaseSync.syncForms(freshLocalForms);
          }
        }

        // Firebase listener confirmed data — clear ALL error states.
        // This must override any pending error from concurrent sync operations,
        // queue processing, or previous session failures.
        setSyncStatus('synced');
        setLastSynced(new Date().toISOString());
        setSyncError(null);
        // Also notify through FirebaseSync so the sync status listener
        // doesn't override us with a stale 'error' from a concurrent sync
        FirebaseSync.notifyListeners('synced', { pending: FirebaseSync.getPendingCount() });
      };

      const unsubSites = FirebaseSync.onSitesChange((firebaseSites) => {
        const rawArray = Array.isArray(firebaseSites) ? firebaseSites : Object.values(firebaseSites || {});
        const mapped = rawArray.map(s => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') {
            const chars = Object.keys(s).filter(k => k !== '_lastModified' && !isNaN(k)).sort((a,b) => Number(a) - Number(b));
            return chars.map(k => s[k]).join('');
          }
          return String(s);
        }).filter(s => s && s.length > 0 && s !== 'undefined' && s !== 'null');
        // Deduplicate case-insensitively, keeping first occurrence
        const seenSites = new Set();
        const sitesArray = mapped.filter(s => {
          const key = s.toLowerCase().trim();
          if (seenSites.has(key)) return false;
          seenSites.add(key);
          return true;
        });
        if (sitesArray.length > 0) {
          sitesFromFirebaseRef.current = true;
          setSites(sitesArray);
          localStorage.setItem('jmart-safety-sites', JSON.stringify(sitesArray));
        }
      });

      // ONE-TIME CLEANUP: Fix corrupted Firebase sites data
      (async () => {
        try {
          const sitesSnap = await firebaseDb.ref('jmart-safety/sites').once('value');
          const rawData = sitesSnap.val();
          if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
            console.log('CLEANUP: Firebase sites is corrupted object, fixing...');
            const cleanSites = [...new Set(Object.values(rawData).map(s => {
              if (typeof s === 'string') return s;
              if (s && typeof s === 'object') {
                const chars = Object.keys(s).filter(k => k !== '_lastModified' && !isNaN(k)).sort((a,b) => Number(a) - Number(b));
                return chars.map(k => s[k]).join('');
              }
              return null;
            }).filter(s => s && s.length > 1 && s !== 'undefined' && s !== 'null'))];
            console.log('CLEANUP: Replacing with', cleanSites.length, 'clean sites:', cleanSites);
            sitesFromFirebaseRef.current = true;
            await firebaseDb.ref('jmart-safety/sites').set(cleanSites);
            setSites(cleanSites);
            localStorage.setItem('jmart-safety-sites', JSON.stringify(cleanSites));
            console.log('CLEANUP: Firebase sites fixed!');
          }
        } catch (err) {
          console.warn('Sites cleanup skipped:', err.message);
        }
      })();

      setTimeout(() => { isInitialLoad.current = false; }, 1000);

      return () => {
        unsubForms();
        unsubSites();
      };
    } else {
      isInitialLoad.current = false;
    }
  }, []);

  // Debounced Firebase sync — prevents rapid-fire writes when multiple form changes happen
  const formsSyncTimerRef = useRef(null);

  // Save forms to localStorage and sync to Firebase
  const syncFormsEffect = (forms) => {
    if (!isInitialLoad.current) {
      try {
        StorageQuotaManager.safeFormsWrite(forms);
        localStorage.setItem('jmart-last-sync', new Date().toISOString());
      } catch (storageErr) {
        console.error('[syncFormsEffect] localStorage write failed:', storageErr.message, '— forms NOT lost, still in React state');
      }
      setLastSynced(new Date().toISOString());

      // Anti-loop — don't send forms back to Firebase when they just came FROM Firebase.
      if (formsFromFirebaseRef.current) {
        formsFromFirebaseRef.current = false;
        setSyncStatus('synced');
        return;
      }

      // Check both navigator.onLine AND NetworkStatus lie-fi detection
      const actuallyOnline = isOnlineRef.current && (typeof NetworkStatus === 'undefined' || NetworkStatus.isActuallyOnline);
      if (FirebaseSync.isConnected() && actuallyOnline && forms.length > 0) {
        // Debounce Firebase writes — wait 2s for rapid changes to settle
        if (formsSyncTimerRef.current) clearTimeout(formsSyncTimerRef.current);
        setSyncStatus('syncing');
        formsSyncTimerRef.current = setTimeout(() => {
          formsSyncTimerRef.current = null;
          FirebaseSync.syncForms(forms).then(() => {
            setSyncStatus('synced');
            console.log('Forms synced to Firebase:', forms.length, 'forms');
          }).catch((err) => {
            setSyncStatus('error');
            setSyncError(err.message || 'Sync failed');
            console.error('Firebase sync failed:', err);
          });
        }, 2000);
      }
    }
  };

  // Save sites to localStorage and sync to Firebase
  const syncSitesEffect = (sites) => {
    if (sites.length > 0 && !isInitialLoad.current) {
      localStorage.setItem('jmart-safety-sites', JSON.stringify(sites));

      if (sitesFromFirebaseRef.current) {
        sitesFromFirebaseRef.current = false;
        return;
      }

      const sitesSyncOnline = isOnlineRef.current && (typeof NetworkStatus === 'undefined' || NetworkStatus.isActuallyOnline);
      if (FirebaseSync.isConnected() && sitesSyncOnline) {
        FirebaseSync.syncSites(sites);
      }
    }
  };

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); isOnlineRef.current = true; };
    const handleOffline = () => { setIsOnline(false); isOnlineRef.current = false; };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync status listener — only show errors for real Firebase failures, not localStorage issues
  useEffect(() => {
    const unsubscribe = FirebaseSync.onSyncStatusChange((status, details) => {
      setPendingSyncCount(details?.pending || 0);
      if (status === 'synced' && details?.pending === 0) {
        setSyncStatus('synced');
        setSyncError(null);
      } else if (status === 'queued' || (details?.pending > 0)) {
        setSyncStatus('pending');
      } else if (status === 'circuit_open' || status === 'circuit_reset') {
        // Circuit breaker is a storage issue, not a sync issue — don't alarm the user
        setSyncStatus(FirebaseSync.isConnected() ? 'synced' : 'pending');
      } else if (status === 'error' || status === 'failed') {
        // Only show sync error if Firebase is actually disconnected
        var msg = details?.message || details?.error || '';
        if (msg.indexOf('Storage') !== -1 || msg.indexOf('quota') !== -1 || msg.indexOf('storage') !== -1) {
          // Storage error — Firebase is fine, just localStorage is full
          setSyncStatus(FirebaseSync.isConnected() ? 'synced' : 'pending');
        } else {
          setSyncStatus('error');
          setSyncError(msg || 'Sync failed');
        }
      }
    });
    return unsubscribe;
  }, []);

  // Photo queue listener
  useEffect(() => {
    const unsubscribe = OfflinePhotoQueue.subscribe((count, isProcessing) => {
      setPendingPhotoCount(count);
    });
    return unsubscribe;
  }, []);

  return {
    isOnline,
    lastSynced,
    syncStatus, setSyncStatus,
    pendingSyncCount,
    pendingPhotoCount,
    syncError,
    showSyncBanner, setShowSyncBanner,
    isInitialLoad,
    sitesFromFirebaseRef,
    syncFormsEffect,
    syncSitesEffect
  };
}

// =============================================
// useDeviceAuth - Device authorization state
// =============================================
function useDeviceAuth() {
  const [deviceAuthStatus, setDeviceAuthStatus] = useState('checking');
  const [isDeviceAdmin, setIsDeviceAdmin] = useState(false);
  const [canViewDevices, setCanViewDevices] = useState(false);
  const [canRevokeDevices, setCanRevokeDevices] = useState(false);
  const [pendingDevices, setPendingDevices] = useState([]);
  const [approvedDevices, setApprovedDevices] = useState([]);
  const [newDeviceNotification, setNewDeviceNotification] = useState(null);

  useEffect(() => {
    const cleanups = [];

    const initDeviceAuth = async () => {
      // Wait for Firebase DB WebSocket to connect before checking device auth.
      // DeviceAuth.init() may fail if called before DB is ready (returns approved:false
      // even though device IS approved). Retry once after a delay if initial check fails.
      let result = await DeviceAuth.init();

      if (!result.approved && typeof firebaseDb !== 'undefined' && firebaseDb) {
        // First attempt failed — Firebase DB may not have been connected yet.
        // Wait for connection and retry once.
        try {
          await new Promise(function(resolve) {
            var timeout = setTimeout(resolve, 6000);
            if (firebaseDb) {
              var ref = firebaseDb.ref('.info/connected');
              var handler = ref.on('value', function(snap) {
                if (snap.val() === true) {
                  clearTimeout(timeout);
                  ref.off('value', handler);
                  resolve();
                }
              });
            } else {
              resolve();
            }
          });
          result = await DeviceAuth.checkDeviceStatus();
        } catch (e) {
          console.warn('DeviceAuth retry failed:', e.message);
        }
      }

      if (result.approved) {
        setDeviceAuthStatus('approved');
        setIsDeviceAdmin(result.admin);
        setCanViewDevices(result.canViewDevices || result.admin);
        setCanRevokeDevices(result.canRevokeDevices || result.admin);

        if (result.admin) {
          DeviceAuth.requestNotificationPermission();

          const unsubNotify = DeviceAuth.onNotification((type, data) => {
            if (type === 'new_device') {
              setNewDeviceNotification(data);
              DeviceAuth.showBrowserNotification(
                'New Device Request',
                data.type + ' (' + data.browser + ') wants to access J&M Artsteel Safety'
              );
              setTimeout(() => setNewDeviceNotification(null), 10000);
            }
          });
          if (unsubNotify) cleanups.push(unsubNotify);
        }

        if (result.admin || result.canViewDevices || result.canRevokeDevices) {
          const unsubPending = DeviceAuth.listenForPendingDevices((devices) => {
            setPendingDevices(devices);
          });
          if (unsubPending) cleanups.push(unsubPending);

          const unsubApproved = DeviceAuth.listenForApprovedDevices((devices) => {
            setApprovedDevices(devices);
          });
          if (unsubApproved) cleanups.push(unsubApproved);
        }

        const unsubOwnStatus = DeviceAuth.listenForOwnDeviceStatus((status) => {
          if (status.revoked) {
            setDeviceAuthStatus('denied');
            ToastNotifier.error('Your device access has been revoked by an administrator.', { duration: 10000 });
          }
        });
        if (unsubOwnStatus) cleanups.push(unsubOwnStatus);
      } else {
        setDeviceAuthStatus('pending');

        // Real-time listener for device approval — replaces 5s polling
        if (firebaseDb && DeviceAuth.deviceId) {
          const approvalRef = firebaseDb.ref('jmart-safety/devices/approved/' + DeviceAuth.deviceId);
          approvalRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              setDeviceAuthStatus('approved');
              setIsDeviceAdmin(data.role === 'admin');
              approvalRef.off('value');
              window.location.reload();
            }
          }, function(err) { console.warn('[hooks] Approval listener error:', err.message); });
          cleanups.push(() => approvalRef.off('value'));
        }
      }
    };

    initDeviceAuth();

    return () => {
      cleanups.forEach(fn => { try { fn(); } catch(e) {} });
    };
  }, []);

  return {
    deviceAuthStatus,
    isDeviceAdmin,
    canViewDevices,
    canRevokeDevices,
    pendingDevices,
    approvedDevices,
    newDeviceNotification, setNewDeviceNotification
  };
}

// =============================================
// usePWAInstall - PWA install prompt
// =============================================
function usePWAInstall() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('jmart-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowInstallPrompt(true), 30000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const dismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('jmart-install-dismissed', 'true');
  };

  return { showInstallPrompt, handleInstall, dismissInstall };
}

// =============================================
// useAutoSave - Auto-save form drafts to localStorage
// =============================================
function useAutoSave(formKey, formData, intervalMs) {
  const saveInterval = intervalMs || 30000; // default 30 seconds
  const draftKey = 'jmart-draft-' + formKey;

  // Keep a ref to the latest formData so the interval callback always reads current data
  const formDataRef = useRef(formData);
  useEffect(() => { formDataRef.current = formData; }, [formData]);

  // Stabilize dependency: only restart the interval when the serialized data actually changes
  const formDataStr = JSON.stringify(formData);

  // Save draft periodically
  useEffect(() => {
    if (!formDataRef.current || !formKey) return;
    const timer = IntervalRegistry.setInterval(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ data: formDataRef.current, savedAt: Date.now() }));
      } catch (e) {
        console.warn('[AutoSave] Could not save draft:', e.message);
      }
    }, saveInterval, 'useAutoSave-' + formKey);
    return () => IntervalRegistry.clearInterval(timer);
  }, [formDataStr, formKey]);

  // Load existing draft
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const ageMinutes = Math.round((Date.now() - parsed.savedAt) / 60000);
        if (ageMinutes < 1440) { // Discard drafts older than 24 hours
          return { data: parsed.data, ageMinutes };
        }
        localStorage.removeItem(draftKey); // Expired draft
      }
    } catch (e) {
      console.warn('[AutoSave] Could not load draft:', e.message);
    }
    return null;
  };

  // Clear draft (after successful submission)
  const clearDraft = () => {
    localStorage.removeItem(draftKey);
  };

  return { loadDraft, clearDraft };
}

// =============================================
// useBeforeUnload - Warn when form has unsaved data
// =============================================
function useBeforeUnload(hasUnsavedData) {
  useEffect(() => {
    if (!hasUnsavedData) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved form data. Are you sure you want to leave?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedData]);
}

// Export to window for cross-file access
window.useFormManager = useFormManager;
window.useDataSync = useDataSync;
window.useDeviceAuth = useDeviceAuth;
window.usePWAInstall = usePWAInstall;
window.useAutoSave = useAutoSave;
window.useBeforeUnload = useBeforeUnload;
