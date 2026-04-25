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
  const suppressNextFormsSyncRef = useRef(false);
  const savedSignaturesRef = useRef(savedSignatures);

  useEffect(() => {
    savedSignaturesRef.current = savedSignatures;
  }, [savedSignatures]);

  const persistSignaturesLocally = (nextSignatures) => {
    if (typeof StorageQuotaManager !== 'undefined' && StorageQuotaManager.safeSignaturesWrite) {
      StorageQuotaManager.safeSignaturesWrite(nextSignatures);
    } else {
      try { localStorage.setItem('jmart-team-signatures', JSON.stringify(nextSignatures || {})); } catch (e) {}
    }
  };

  const hasQueuedSignatureSync = () => Array.isArray(FirebaseSync.pendingQueue) && FirebaseSync.pendingQueue.some((item) => item && item.type === 'signatures');

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
    persistSignaturesLocally(newSignatures);
    if (FirebaseSync.isConnected()) {
      FirebaseSync.syncSignatures(newSignatures)
        .catch(err => console.error('Signature sync error:', err));
    }
    return true;
  };

  // Signature reuse warning flag — components should show amber banner when using saved signatures
  const signatureReuseWarning = null;

  useEffect(() => {
    if (!FirebaseSync.isConnected()) return;

    let active = true;
    const applyRemoteSignatures = (remoteSignatures) => {
      if (!active) return;
      const remoteMap = remoteSignatures && typeof remoteSignatures === 'object' ? remoteSignatures : {};
      const localMap = savedSignaturesRef.current || {};

      if (Object.keys(remoteMap).length > 0) {
        setSavedSignatures(remoteMap);
        persistSignaturesLocally(remoteMap);
        return;
      }

      if (Object.keys(localMap).length > 0) {
        if (!hasQueuedSignatureSync()) {
          FirebaseSync.syncSignatures(localMap).catch(err => console.warn('Signature backfill skipped:', err.message));
        }
        return;
      }

      setSavedSignatures({});
      persistSignaturesLocally({});
    };

    if (typeof firebaseRead === 'function') {
      firebaseRead('signatures', 2000)
        .then((result) => applyRemoteSignatures(result && result.val ? result.val : {}))
        .catch((err) => console.warn('Could not load signatures from Firebase:', err.message));
    }

    const unsubscribe = typeof FirebaseSync.onSignaturesChange === 'function'
      ? FirebaseSync.onSignaturesChange((remoteSignatures) => applyRemoteSignatures(remoteSignatures))
      : null;

    return () => {
      active = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Add a new form
  const addForm = (formType, formData, options = {}) => {
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

        // Firebase sync is handled centrally by useDataSync.
        return updatedForms;
      });

      if (FirebaseSync.isConnected()) {
        FirebaseSync.syncForms([newForm]).catch((err) => {
          console.warn('Immediate form sync queued:', err && err.message ? err.message : err);
        });
      }

      // Auto-download PDF + upload to Drive
      setTimeout(() => {
        if (window.__JMART_E2E__) {
          markAsBackedUp(newForm.id);
          return;
        }
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

      // Tidy rotation: keep at most 3 active forms per site (any type).
      // When a save brings the site over 3, archive the oldest — backup-then-hide.
      // Defer so the new form is in state and Firebase before we touch others.
      const siteForRotation = formData.siteConducted || formData.site;
      if (siteForRotation) {
        setTimeout(() => { _rotateOldFormsForSite(siteForRotation); }, 1500);
      }

      setSuccessModal({ form: newForm, type: formType, ...(options.successModalProps || {}) });
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

        return updatedForms;
      });

      try {
        if (window.__JMART_E2E__) {
          markAsBackedUp(form.id);
          return;
        }
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

  // Tidy rotation: keep at most 3 active forms per siteConducted across all
  // form types. When a save brings the site over 3, the oldest gets archived
  // — Drive upload FIRST, then archive flag, only on success. Drive failure
  // leaves the form active so nothing disappears without a confirmed backup.
  const MAX_ACTIVE_FORMS_PER_SITE = 3;
  const formsRef = useRef(forms);
  useEffect(() => { formsRef.current = forms; }, [forms]);
  // Lock to prevent concurrent rotations from archiving the same form twice.
  // Tracks form IDs currently being archived; cleared on success or failure.
  const archivingInFlightRef = useRef(new Set());

  const _autoArchiveForm = async (formToArchive) => {
    if (!formToArchive || !formToArchive.id) return false;
    if (archivingInFlightRef.current.has(formToArchive.id)) {
      console.log('[auto-archive] Already archiving', formToArchive.id, '— skipping duplicate');
      return false;
    }
    if (typeof PDFGenerator === 'undefined' || typeof GoogleDriveSync === 'undefined') return false;
    if (!GoogleDriveSync.isConnected()) {
      // Drive offline — bail. The form stays active. Next save will retry.
      console.log('[auto-archive] Drive not connected, skipping rotation for form', formToArchive.id);
      return false;
    }
    archivingInFlightRef.current.add(formToArchive.id);
    try {
      const generated = PDFGenerator.generate(formToArchive);
      if (!generated || !generated.doc) {
        console.warn('[auto-archive] PDF generation failed for type', formToArchive.type, '— leaving form active');
        return false;
      }
      const pdfBlob = generated.doc.output('blob');
      const date = new Date(formToArchive.createdAt || Date.now());
      const stamp = date.toISOString().slice(0, 16).replace(/[:T]/g, '-');
      const typeLabel = (formToArchive.type || 'form').replace(/[^a-z0-9-]/gi, '');
      const archiveFilename = stamp + '_' + typeLabel + '_' + formToArchive.id + '.pdf';
      const site = (formToArchive.data && (formToArchive.data.siteConducted || formToArchive.data.site)) || 'Unsorted';
      // Re-check connection right before upload — token may have expired.
      if (!GoogleDriveSync.isConnected()) {
        console.warn('[auto-archive] Drive disconnected between PDF generation and upload — leaving form active');
        return false;
      }
      const upload = await GoogleDriveSync.uploadArchivedPDF(pdfBlob, archiveFilename, site);
      if (!upload || !upload.id) {
        console.warn('[auto-archive] Drive upload failed — leaving form active');
        return false;
      }
      // Drive succeeded — NOW mark archived locally and in Firebase.
      const now = new Date().toISOString();
      const updates = {
        status: 'archived',
        archivedAt: now,
        archivedBy: DeviceAuthManager.deviceId || 'unknown',
        archivedByName: localStorage.getItem('jmart-user-name') || 'Auto-rotation',
        archiveDriveFileId: upload.id,
        updatedAt: now,
        version: (formToArchive.version || 1) + 1,
      };
      setForms((prev) => {
        const updated = prev.map(f => (f && f.id === formToArchive.id) ? { ...f, ...updates } : f);
        StorageQuotaManager.safeFormsWrite(updated);
        return updated;
      });
      if (FirebaseSync.isConnected()) {
        FirebaseSync.syncForms([{ ...formToArchive, ...updates }]).catch((err) => {
          console.warn('[auto-archive] Firebase sync warning (will retry from queue):', err && err.message);
        });
      }
      AuditLogManager.log('archive', { formId: formToArchive.id, formType: formToArchive.type, site, action: 'Auto-archived (rotation)', driveFileId: upload.id });
      const typeLabelPretty = ({ prestart: 'Pre-Start', toolbox: 'Toolbox Talk', incident: 'Incident', itp: 'ITP', 'steel-itp': 'Steel ITP', inspection: 'Inspection' }[formToArchive.type] || 'Form');
      if (typeof ToastNotifier !== 'undefined') ToastNotifier.success(typeLabelPretty + ' for "' + site + '" archived to Drive');
      return true;
    } catch (e) {
      console.error('[auto-archive] error:', e);
      return false;
    } finally {
      archivingInFlightRef.current.delete(formToArchive.id);
    }
  };

  const _rotateOldFormsForSite = async (site) => {
    if (!site) return;
    // Read latest forms via ref — closure captured at addForm time would be stale.
    const current = formsRef.current || [];
    const forSite = current.filter(f => f && f.status !== 'archived' && f.data && (f.data.siteConducted === site || f.data.site === site));
    if (forSite.length <= MAX_ACTIVE_FORMS_PER_SITE) return;
    const sorted = forSite.slice().sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    const toArchive = sorted.slice(0, forSite.length - MAX_ACTIVE_FORMS_PER_SITE);
    // Sequential await so each archive's setForms applies before we try the next —
    // prevents the same form being targeted twice when archiving multiple at once.
    for (const f of toArchive) {
      await _autoArchiveForm(f);
    }
  };

  // Manual archive — same Drive-first guarantee as auto-rotation. If Drive
  // upload fails, the form stays active and the user gets a clear toast,
  // instead of being silently hidden without a backup.
  const archiveForm = async (formId) => {
    const existingForm = (forms || []).find((form) => form && form.id === formId);
    if (!existingForm) return false;
    if (typeof GoogleDriveSync === 'undefined' || !GoogleDriveSync.isConnected()) {
      if (typeof ToastNotifier !== 'undefined') {
        ToastNotifier.warning('Connect Google Drive first — archive needs a confirmed backup before hiding the form.');
      }
      return false;
    }
    const ok = await _autoArchiveForm(existingForm);
    if (!ok && typeof ToastNotifier !== 'undefined') {
      ToastNotifier.error('Archive failed — Drive upload did not succeed. Form stays active.');
    }
    return ok;
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
      suppressNextFormsSyncRef.current = true;

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

      deletingFormRef.current = true;

        if (FirebaseSync.isConnected()) {
          FirebaseSync.deleteForm(formId).then((result) => {
            deletingFormRef.current = false;
            if (result && result.success) {
              console.log('Deletion synced to Firebase');
              // Clean up the persisted deleted ID since Firebase is now in sync
              deletedFormIdsRef.current.delete(formId);
              try { localStorage.setItem('jmart-deleted-form-ids', JSON.stringify([...deletedFormIdsRef.current])); } catch (e) {}
            } else if (result && result.queued) {
              console.warn('Deletion queued for Firebase retry:', result.error || 'queued');
            } else {
              console.error('Failed to sync deletion to Firebase:', result && result.error ? result.error : result);
            }
          }).catch(err => {
            console.error('Failed to sync deletion to Firebase:', err);
            deletingFormRef.current = false;
        });
      } else {
        deletingFormRef.current = false;
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
    suppressNextFormsSyncRef,
    // Functions
    addForm,
    updateForm,
    unlockForm,
    confirmUpdate,
    continueEditing,
    cancelUpdate,
    deleteForm,
    archiveForm,
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
function useDataSync({ setForms, setSites, deletingFormRef, deletedFormIdsRef, suppressNextFormsSyncRef }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isOnlineRef = useRef(isOnline);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncStatus, setSyncStatus] = useState(FirebaseSync.isConnected() ? 'synced' : 'local');
  const [pendingSyncCount, setPendingSyncCount] = useState(FirebaseSync.getPendingCount());
  const [pendingPhotoCount, setPendingPhotoCount] = useState(OfflinePhotoQueue.getCount());
  const [syncError, setSyncError] = useState(null);
  const [showSyncBanner, setShowSyncBanner] = useState(() => {
    return !(typeof isFirebaseConfigured !== 'undefined' && isFirebaseConfigured);
  });

  const isInitialLoad = useRef(true);
  const formsFromFirebaseRef = useRef(false);  // Anti-loop: skip syncing back to Firebase when data came FROM Firebase
  const formsFromStorageRef = useRef(false);
  const sitesFromFirebaseRef = useRef(false);
  const lastFormsWriteRef = useRef(0); // throttle forms listener writes
  const latestRemoteFormsRef = useRef([]);
  const formAssetsRef = useRef({});
  const buildFormSignature = (forms) => JSON.stringify(
    (Array.isArray(forms) ? forms : Object.values(forms || {}))
      .map((form) => ({
        id: form?.id || null,
        version: form?.version || null,
        modified: form?._lastModified || form?.updatedAt || form?.createdAt || null
      }))
      .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')))
  );
  const buildQueueComparableSignature = (forms) => JSON.stringify(
    (Array.isArray(forms) ? forms : Object.values(forms || {}))
      .map((form) => ({
        id: form?.id || null,
        type: form?.type || null,
        version: form?.version || 1,
        createdAt: form?.createdAt || null,
        updatedAt: form?.updatedAt || null,
        site: form?.data?.siteConducted || form?.data?.site || null
      }))
      .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')))
  );
  const hasQueuedFormSync = () => Array.isArray(FirebaseSync.pendingQueue) && FirebaseSync.pendingQueue.some((item) => {
    if (!item) return false;
    if (item.type === 'forms') return true;
    if (typeof item.path === 'string' && item.path.indexOf('jmart-safety/forms') === 0) return true;
    return false;
  });

  useEffect(() => {
    if (FirebaseSync.isConnected() || syncStatus === 'synced' || syncStatus === 'syncing' || syncStatus === 'pending') {
      setShowSyncBanner(false);
    }
  }, [syncStatus, pendingSyncCount, isOnline]);

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
      const applyRemoteForms = (firebaseForms, options) => {
        const formsArray = Array.isArray(firebaseForms) ? firebaseForms : Object.values(firebaseForms || {});
        const mergedAssetForms = (typeof FormAssetStore !== 'undefined' && FormAssetStore.mergeAssetMapIntoForms)
          ? FormAssetStore.mergeAssetMapIntoForms(formsArray, formAssetsRef.current)
          : formsArray;
          const previousRemoteForms = latestRemoteFormsRef.current || [];
          const previousRemoteIds = new Set(previousRemoteForms.map((form) => form?.id).filter(Boolean));
          const hasRemoteMutation = buildFormSignature(previousRemoteForms) !== buildFormSignature(formsArray);
          const hasRemoteDeletion = previousRemoteIds.size > 0 && [...previousRemoteIds].some((formId) => !formsArray.some((form) => form?.id === formId));

          latestRemoteFormsRef.current = formsArray;
          options = options || {};

          // Once Firebase no longer contains a deleted form, drop the local suppression ID.
          if (deletedFormIdsRef && deletedFormIdsRef.current && deletedFormIdsRef.current.size > 0) {
            const remoteIds = new Set(formsArray.map((form) => form?.id).filter(Boolean));
            var prunedDeletedIds = false;
            [...deletedFormIdsRef.current].forEach((formId) => {
              if (!remoteIds.has(formId)) {
                deletedFormIdsRef.current.delete(formId);
                prunedDeletedIds = true;
              }
            });
            if (prunedDeletedIds) {
              try { localStorage.setItem('jmart-deleted-form-ids', JSON.stringify([...deletedFormIdsRef.current])); } catch (e) {}
            }
          }

          // Throttle duplicate listener churn, but never suppress real remote mutations.
          var now = Date.now();
        if (!options.skipThrottle && !hasRemoteMutation && !hasRemoteDeletion && (now - lastFormsWriteRef.current < 5000)) return;
        lastFormsWriteRef.current = now;

        console.log('Firebase forms received:', mergedAssetForms.length, 'forms');

        if (deletingFormRef.current) {
          deletingFormRef.current = false;
        }

        if (mergedAssetForms.length > 0) {
          const formMap = new Map();

          // Filter out forms that were deleted offline but haven't been purged from Firebase yet
          const deletedIds = deletedFormIdsRef ? deletedFormIdsRef.current : new Set();

          mergedAssetForms.forEach(form => {
            if (deletedIds.has(form.id)) return; // Skip forms deleted offline
            formMap.set(form.id, { ...form, source: 'firebase' });
          });

          // Merge with local-only forms (forms not yet in Firebase)
          let currentLocalForms = [];
          try {
            const freshLocal = localStorage.getItem('jmart-safety-forms');
            if (freshLocal) currentLocalForms = JSON.parse(freshLocal);
          } catch (e) { /* ignore */ }

          const preserveLocalOnlyForms = hasQueuedFormSync();
          currentLocalForms.forEach(localForm => {
            if (!localForm || deletedIds.has(localForm.id)) return;
            if (!formMap.has(localForm.id)) {
              if (!preserveLocalOnlyForms) return;
              formMap.set(localForm.id, { ...localForm, source: 'local' });
            }
          });

          const mergedForms = [];
          formMap.forEach(form => mergedForms.push(form));
          mergedForms.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

          const queuedFormsItem = Array.isArray(FirebaseSync.pendingQueue)
            ? FirebaseSync.pendingQueue.find((item) => item && item.type === 'forms')
            : null;
          if (queuedFormsItem) {
            const queuedSignature = buildQueueComparableSignature(queuedFormsItem.data);
            const remoteSignature = buildQueueComparableSignature(mergedForms);
            if (queuedSignature === remoteSignature) {
              FirebaseSync.pendingQueue = FirebaseSync.pendingQueue.filter((item) => item !== queuedFormsItem);
              FirebaseSync.saveQueue();
            }
          }

          // Update React state with full data (including photos for viewing)
          formsFromFirebaseRef.current = true;  // Prevent syncFormsEffect from sending back to Firebase
          setForms(mergedForms);

          // Write to localStorage using safe writer (strips large data, trims to fit)
          StorageQuotaManager.safeFormsWrite(mergedForms);
          console.log('Forms synced:', mergedForms.length, 'total');
        } else {
          // Firebase returned empty. Only republish local forms if there is an actual
          // queued local form write waiting to sync; otherwise treat Firebase as the
          // source of truth so remote deletes clear stale local cache instead of
          // resurrecting forms on other devices.
          let freshLocalForms = [];
          try {
            const freshLocal = localStorage.getItem('jmart-safety-forms');
            if (freshLocal) freshLocalForms = JSON.parse(freshLocal);
          } catch (e) { /* ignore */ }

          if (freshLocalForms.length > 0 && hasQueuedFormSync()) {
            console.log('Firebase empty, pushing local forms to Firebase');
            FirebaseSync.syncForms(freshLocalForms);
          } else {
            formsFromFirebaseRef.current = true;
            setForms([]);
            StorageQuotaManager.safeFormsWrite([]);
            console.log('Firebase empty, clearing local forms cache');
          }
        }

        var pendingAfterMerge = typeof FirebaseSync.getPendingCount === 'function' ? FirebaseSync.getPendingCount() : 0;
        setSyncStatus(pendingAfterMerge > 0 ? 'pending' : 'synced');
        setLastSynced(new Date().toISOString());
        setSyncError(null);
      };

      const unsubForms = FirebaseSync.onFormsChange((firebaseForms) => {
        applyRemoteForms(firebaseForms);
      });

      const unsubFormAssets = FirebaseSync.onFormAssetsChange((firebaseAssets) => {
        formAssetsRef.current = firebaseAssets || {};
        if (latestRemoteFormsRef.current.length > 0) {
          applyRemoteForms(latestRemoteFormsRef.current, { skipThrottle: true });
        }
      });

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
        unsubFormAssets();
        unsubSites();
      };
    } else {
      isInitialLoad.current = false;
    }
  }, [deletedFormIdsRef, deletingFormRef, setForms, setSites]);

  // Save forms to localStorage and sync to Firebase
  const syncFormsEffect = useCallback((forms) => {
    if (!isInitialLoad.current) {
      try {
        // FIXED: Use safeFormsWrite instead of raw setItem.
        // Raw setItem wrote unstripped base64 photos from React state → storage bomb.
        // safeFormsWrite strips large data and enforces 2MB cap.
        StorageQuotaManager.safeFormsWrite(forms);
        localStorage.setItem('jmart-last-sync', new Date().toISOString());
      } catch (storageErr) {
        console.error('[syncFormsEffect] localStorage write failed:', storageErr.message, '— forms NOT lost, still in React state');
        // Don't crash — forms are still in React state and can be synced to Firebase
      }
      setLastSynced(new Date().toISOString());
      console.log('Forms saved to localStorage:', forms.length, 'forms');

      // FIXED: Anti-loop — don't send forms back to Firebase when they just came FROM Firebase.
      // Without this, the Firebase listener → setForms → syncFormsEffect → syncForms loop
      // sent full photo data back on every update, and if the write failed, the ENTIRE
      // forms array (with photos) was stored in the sync queue → 5MB+ in localStorage.
      // syncSitesEffect already had this protection (sitesFromFirebaseRef). Forms didn't.
      if (suppressNextFormsSyncRef && suppressNextFormsSyncRef.current) {
        suppressNextFormsSyncRef.current = false;
        setSyncStatus(FirebaseSync.getPendingCount() > 0 ? 'pending' : 'synced');
        setSyncError(null);
        return;
      }

      if (formsFromStorageRef.current) {
        formsFromStorageRef.current = false;
        setSyncStatus(FirebaseSync.getPendingCount() > 0 ? 'pending' : 'synced');
        setSyncError(null);
        return;
      }

      if (formsFromFirebaseRef.current) {
        const remoteSignature = buildFormSignature(latestRemoteFormsRef.current || []);
        const currentSignature = buildFormSignature(forms);
        formsFromFirebaseRef.current = false;
        if (currentSignature === remoteSignature) {
          setSyncStatus(FirebaseSync.getPendingCount() > 0 ? 'pending' : 'synced');
          setSyncError(null);
          return;
        }
      }

      if (FirebaseSync.isConnected() && forms.length > 0) {
        if (!isOnlineRef.current) {
          if (typeof FirebaseSync.queueFormsSnapshot === 'function') {
            FirebaseSync.queueFormsSnapshot(forms);
          } else {
            FirebaseSync.addToQueue('forms', forms);
          }
          setSyncStatus('pending');
          setSyncError(null);
          return;
        }

        setSyncStatus('syncing');
        FirebaseSync.syncForms(forms).then((result) => {
          if (result && result.success) {
            setSyncStatus(FirebaseSync.getPendingCount() > 0 ? 'pending' : 'synced');
            setSyncError(null);
            console.log('Forms synced to Firebase:', forms.length, 'forms');
          } else if (result && result.queued) {
            setSyncStatus('pending');
            setSyncError(null);
            console.warn('Forms queued for Firebase retry:', result.error || 'queued');
          } else {
            setSyncStatus('error');
            setSyncError(result && result.error ? result.error : 'Sync failed');
            console.error('Firebase sync failed:', result);
          }
        }).catch((err) => {
          setSyncStatus('error');
          setSyncError(err && err.message ? err.message : 'Sync failed');
          console.error('Firebase sync failed:', err);
        });
      }
    }
  }, [suppressNextFormsSyncRef]);

  // Save sites to localStorage and sync to Firebase
  const syncSitesEffect = useCallback((sites) => {
    if (sites.length > 0 && !isInitialLoad.current) {
      localStorage.setItem('jmart-safety-sites', JSON.stringify(sites));

      if (sitesFromFirebaseRef.current) {
        sitesFromFirebaseRef.current = false;
        return;
      }

      if (FirebaseSync.isConnected() && isOnlineRef.current) {
        if (typeof DeviceAuthManager !== 'undefined' && !DeviceAuthManager.isAdmin) {
          console.warn('Ignoring shared site sync from non-admin device');
          return;
        }
        FirebaseSync.syncSites(sites);
      }
    }
  }, []);

  // Cross-tab fallback: keep same-browser tabs in sync from shared localStorage
  // even if the realtime listener arrives late.
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.storageArea !== localStorage) return;

      if (event.key === 'jmart-safety-forms') {
        try {
          const parsedForms = JSON.parse(event.newValue || '[]');
          const deletedIds = deletedFormIdsRef ? deletedFormIdsRef.current : new Set();
          const nextForms = (Array.isArray(parsedForms) ? parsedForms : Object.values(parsedForms || {}))
            .filter((form) => !deletedIds.has(form?.id));
          formsFromStorageRef.current = true;
          setForms(nextForms);
          if ((Array.isArray(parsedForms) ? parsedForms.length : Object.values(parsedForms || {}).length) !== nextForms.length) {
            StorageQuotaManager.safeFormsWrite(nextForms);
          }
          setSyncStatus(FirebaseSync.getPendingCount() > 0 ? 'pending' : 'synced');
          setSyncError(null);
        } catch (e) {
          console.warn('Storage form sync skipped:', e.message);
        }
      }

      if (event.key === 'jmart-deleted-form-ids') {
        try {
          const nextDeletedIds = new Set(JSON.parse(event.newValue || '[]').filter(Boolean));
          if (deletedFormIdsRef) {
            deletedFormIdsRef.current = nextDeletedIds;
          }

          const parsedForms = JSON.parse(localStorage.getItem('jmart-safety-forms') || '[]');
          const nextForms = (Array.isArray(parsedForms) ? parsedForms : Object.values(parsedForms || {}))
            .filter((form) => !nextDeletedIds.has(form?.id));

          formsFromStorageRef.current = true;
          setForms(nextForms);
          StorageQuotaManager.safeFormsWrite(nextForms);
        } catch (e) {
          console.warn('Storage deleted-id sync skipped:', e.message);
        }
      }

      if (event.key === 'jmart-safety-sites') {
        try {
          const parsedSites = JSON.parse(event.newValue || '[]');
          const rawSites = Array.isArray(parsedSites) ? parsedSites : Object.values(parsedSites || {});
          const seenStorageSites = new Set();
          const nextSites = rawSites
            .map((site) => typeof site === 'string' ? site : String(site))
            .filter((site) => site && site !== 'undefined' && site !== 'null')
            .filter((site) => {
              const key = site.toLowerCase().trim();
              if (seenStorageSites.has(key)) return false;
              seenStorageSites.add(key);
              return true;
            });
          sitesFromFirebaseRef.current = true;
          setSites(nextSites);
        } catch (e) {
          console.warn('Storage site sync skipped:', e.message);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [deletedFormIdsRef, setForms, setSites]);

  // Online/Offline detection
  useEffect(() => {
    const processPendingQueue = () => {
      if (navigator.onLine && FirebaseSync.getPendingCount() > 0) {
        FirebaseSync.processQueue();
      }
    };
    const handleOnline = () => {
      setIsOnline(true);
      isOnlineRef.current = true;
      processPendingQueue();
    };
    const handleOffline = () => { setIsOnline(false); isOnlineRef.current = false; };
    const handleFocus = () => processPendingQueue();
    const handleVisibilityChange = () => {
      if (!document.hidden) processPendingQueue();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Sync status listener — only show errors for real Firebase failures, not localStorage issues
  useEffect(() => {
    const unsubscribe = FirebaseSync.onSyncStatusChange((status, details) => {
      setPendingSyncCount(details?.pending || 0);
      if (FirebaseSync.isConnected()) {
        setShowSyncBanner(false);
      }
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
              setIsDeviceAdmin(!!data.isAdmin || data.role === 'admin');
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
  }, [draftKey, formDataStr, formKey, saveInterval]);

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

// =============================================
// Prestart Template Utilities (shared across components)
// =============================================
const PRESTART_TEMPLATE_STORAGE_KEY = 'jmart-prestart-templates';
const PRESTART_TEMPLATE_PENDING_KEY = 'jmart-prestart-template-pending';

function normalizePrestartTemplateValue(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getPrestartTemplateKey(data) {
  const typeKey = normalizePrestartTemplateValue(data?.type || 'prestart');
  const siteKey = normalizePrestartTemplateValue(data?.siteConducted);
  const builderKey = normalizePrestartTemplateValue(data?.builder);
  const addressKey = normalizePrestartTemplateValue(data?.address);
  const jobKey = siteKey || builderKey || addressKey;
  return jobKey ? `${typeKey}::${jobKey}` : '';
}

const FIREBASE_TEMPLATES_PATH = 'jmart-safety/prestartTemplates';

function readSavedPrestartTemplates() {
  try {
    const saved = JSON.parse(localStorage.getItem(PRESTART_TEMPLATE_STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn('Failed to load saved prestart templates:', error);
    return [];
  }
}

function writeSavedTemplates(nextTemplates) {
  try {
    localStorage.setItem(PRESTART_TEMPLATE_STORAGE_KEY, JSON.stringify(nextTemplates));
  } catch (error) {
    console.warn('Failed to save prestart templates:', error);
  }
}

function readPendingPrestartTemplateOps() {
  try {
    const saved = JSON.parse(localStorage.getItem(PRESTART_TEMPLATE_PENDING_KEY) || '[]');
    return Array.isArray(saved)
      ? saved.filter((op) => op && op.templateKey && (op.type === 'upsert' || op.type === 'delete'))
      : [];
  } catch (error) {
    console.warn('Failed to load pending prestart template operations:', error);
    return [];
  }
}

function writePendingPrestartTemplateOps(nextOps) {
  try {
    if (!Array.isArray(nextOps) || nextOps.length === 0) {
      localStorage.removeItem(PRESTART_TEMPLATE_PENDING_KEY);
      return;
    }
    localStorage.setItem(PRESTART_TEMPLATE_PENDING_KEY, JSON.stringify(nextOps));
  } catch (error) {
    console.warn('Failed to save pending prestart template operations:', error);
  }
}

function sortPrestartTemplates(nextTemplates) {
  return nextTemplates
    .filter((template) => template && template.templateKey)
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

function mergePrestartTemplatesByKey(nextTemplates) {
  const templateMap = new Map();
  nextTemplates.forEach((template) => {
    if (template && template.templateKey) {
      templateMap.set(template.templateKey, template);
    }
  });
  return sortPrestartTemplates(Array.from(templateMap.values()));
}

function applyPendingPrestartTemplateOps(remoteTemplates, pendingOps) {
  const templateMap = new Map();
  remoteTemplates.forEach((template) => {
    if (template && template.templateKey) {
      templateMap.set(template.templateKey, template);
    }
  });

  pendingOps.forEach((op) => {
    if (!op || !op.templateKey) return;
    if (op.type === 'delete') {
      templateMap.delete(op.templateKey);
      return;
    }
    if (op.type === 'upsert' && op.template) {
      templateMap.set(op.templateKey, op.template);
    }
  });

  return sortPrestartTemplates(Array.from(templateMap.values()));
}

function firebaseTemplateId(templateKey) {
  // Firebase keys can't contain . # $ [ ] /
  return templateKey.replace(/[.#$\[\]/]/g, '_');
}

function queuePrestartTemplateOp(nextOp) {
  const currentOps = readPendingPrestartTemplateOps();
  const dedupedOps = currentOps.filter((op) => op.templateKey !== nextOp.templateKey);
  const queuedOp = {
    ...nextOp,
    queuedAt: nextOp.queuedAt || new Date().toISOString()
  };
  dedupedOps.push(queuedOp);
  writePendingPrestartTemplateOps(dedupedOps);
  return dedupedOps;
}

// =============================================
// usePrestartTemplates - Shared template state (Firebase + localStorage)
// =============================================
function usePrestartTemplates() {
  const [templates, setTemplates] = useState(() => readSavedPrestartTemplates());
  const templatesRef = useRef(templates);
  const templateFlushInFlightRef = useRef(false);

  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

  const flushPendingPrestartTemplateOps = useCallback(async () => {
    if (typeof firebaseDb === 'undefined' || !firebaseDb || templateFlushInFlightRef.current) return;

    templateFlushInFlightRef.current = true;
    try {
      let pendingOps = readPendingPrestartTemplateOps();
      while (pendingOps.length > 0) {
        const [nextOp, ...remainingOps] = pendingOps;
        const templateRef = firebaseDb.ref(`${FIREBASE_TEMPLATES_PATH}/${firebaseTemplateId(nextOp.templateKey)}`);

        if (nextOp.type === 'delete') {
          await templateRef.remove();
        } else if (nextOp.type === 'upsert' && nextOp.template) {
          await templateRef.set(nextOp.template);
        }

        writePendingPrestartTemplateOps(remainingOps);
        pendingOps = readPendingPrestartTemplateOps();
      }
    } catch (error) {
      console.warn('Failed to flush prestart template operations to Firebase:', error);
    } finally {
      templateFlushInFlightRef.current = false;
    }
  }, []);

  // On mount, reconcile local templates + pending ops against Firebase.
  useEffect(() => {
    if (typeof firebaseDb === 'undefined' || !firebaseDb) return;
    let cancelled = false;
    const templatesRefPath = firebaseDb.ref(FIREBASE_TEMPLATES_PATH);

    const applyRemoteSnapshot = (value) => {
      const remoteTemplates = value
        ? sortPrestartTemplates(Object.values(value).filter((template) => template && template.templateKey))
        : [];
      const pendingOps = readPendingPrestartTemplateOps();
      const mergedTemplates = applyPendingPrestartTemplateOps(remoteTemplates, pendingOps);
      if (cancelled) return;
      templatesRef.current = mergedTemplates;
      setTemplates(mergedTemplates);
      writeSavedTemplates(mergedTemplates);
    };

    const handler = (snap) => {
      if (cancelled) return;
      applyRemoteSnapshot(snap.val());
    };

    templatesRefPath.on('value', handler);
    templatesRefPath.once('value')
      .then((snap) => {
        if (cancelled) return;
        applyRemoteSnapshot(snap.val());
        return flushPendingPrestartTemplateOps();
      })
      .catch((error) => {
        console.warn('Failed to load templates from Firebase:', error);
      });

    return () => {
      cancelled = true;
      templatesRefPath.off('value', handler);
    };
  }, [flushPendingPrestartTemplateOps]);

  // Derive unique job/site names from templates for camera and dashboard
  const templateJobNames = useMemo(() => {
    const names = templates
      .map(t => t.data?.siteConducted || t.data?.builder || t.data?.address || '')
      .filter(Boolean);
    return [...new Set(names)];
  }, [templates]);

  // Upsert (create or update) a template
  const upsertTemplate = useCallback((templateData) => {
    const templateKey = getPrestartTemplateKey(templateData);
    if (!templateKey) return null;

    const now = new Date().toISOString();
    const currentTemplates = templatesRef.current || [];
    const existingTemplate = currentTemplates.find((template) => template.templateKey === templateKey);
    const nextTemplate = {
      id: `prestart-template-${templateKey}`,
      templateKey,
      createdAt: existingTemplate?.createdAt || now,
      updatedAt: now,
      data: { ...templateData }
    };
    const nextTemplates = mergePrestartTemplatesByKey([
      nextTemplate,
      ...currentTemplates.filter((template) => template.templateKey !== templateKey)
    ]);

    templatesRef.current = nextTemplates;
    setTemplates(nextTemplates);
    writeSavedTemplates(nextTemplates);
    queuePrestartTemplateOp({ type: 'upsert', templateKey, template: nextTemplate });
    flushPendingPrestartTemplateOps();

    return templateKey;
  }, [flushPendingPrestartTemplateOps]);

  // Delete a template by key
  const deleteTemplate = useCallback((templateKey) => {
    const nextTemplates = sortPrestartTemplates(
      (templatesRef.current || []).filter((template) => template.templateKey !== templateKey)
    );

    templatesRef.current = nextTemplates;
    setTemplates(nextTemplates);
    writeSavedTemplates(nextTemplates);
    queuePrestartTemplateOp({ type: 'delete', templateKey });
    flushPendingPrestartTemplateOps();
  }, [flushPendingPrestartTemplateOps]);

  // Cross-tab sync via storage event
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.storageArea !== localStorage) return;
      if (event.key !== PRESTART_TEMPLATE_STORAGE_KEY && event.key !== PRESTART_TEMPLATE_PENDING_KEY) return;
      const nextTemplates = readSavedPrestartTemplates();
      templatesRef.current = nextTemplates;
      setTemplates(nextTemplates);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { templates, templateJobNames, upsertTemplate, deleteTemplate };
}

// Export to window for cross-file access
window.useFormManager = useFormManager;
window.useDataSync = useDataSync;
window.useDeviceAuth = useDeviceAuth;
window.usePWAInstall = usePWAInstall;
window.useAutoSave = useAutoSave;
window.useBeforeUnload = useBeforeUnload;
window.usePrestartTemplates = usePrestartTemplates;
window.getPrestartTemplateKey = getPrestartTemplateKey;
window.readSavedPrestartTemplates = readSavedPrestartTemplates;
