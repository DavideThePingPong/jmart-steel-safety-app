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
    const saved = localStorage.getItem('jmart-backed-up-forms');
    return saved ? JSON.parse(saved) : [];
  });
  const [savedSignatures, setSavedSignatures] = useState(() => {
    const saved = localStorage.getItem('jmart-team-signatures');
    return saved ? JSON.parse(saved) : {};
  });

  const deletingFormRef = useRef(false);

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
    localStorage.setItem('jmart-team-signatures', JSON.stringify(newSignatures));
    if (FirebaseSync.isConnected()) {
      FirebaseSync.db.ref('signatures').set(newSignatures);
    }
  };

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
        status: 'completed'
      };
      console.log('addForm called, current forms:', forms.length);

      setForms(prevForms => {
        const updatedForms = [newForm, ...prevForms];
        console.log('setForms update, new length:', updatedForms.length);

        try {
          const dataToSave = JSON.stringify(updatedForms);
          console.log('Data size:', Math.round(dataToSave.length / 1024), 'KB');
          localStorage.setItem('jmart-safety-forms', dataToSave);
          console.log('Immediately saved to localStorage');
        } catch (storageErr) {
          console.error('localStorage save error:', storageErr);
          if (storageErr.name === 'QuotaExceededError') {
            try {
              const keysToRemove = [];
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.includes('backup') || key.includes('temp'))) {
                  keysToRemove.push(key);
                }
              }
              keysToRemove.forEach(key => localStorage.removeItem(key));
              localStorage.setItem('jmart-safety-forms', JSON.stringify(updatedForms));
              console.log('Saved after cleanup');
            } catch (retryErr) {
              console.error('Failed to save even after cleanup:', retryErr);
              alert('Storage full! Please delete some old forms to save new ones.');
            }
          }
        }

        if (FirebaseSync.isConnected()) {
          FirebaseSync.syncForms(updatedForms).then(() => {
            console.log('Immediately synced to Firebase');
          }).catch(err => console.error('Firebase sync error:', err));
        }

        return updatedForms;
      });

      // Auto-download PDF
      setTimeout(() => {
        try {
          const filename = PDFGenerator.download(newForm);
          markAsBackedUp(newForm.id);
          console.log('Auto-saved PDF:', filename);
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
      alert('Error saving form: ' + err.message + '. Please try again.');
    }
  };

  // Show confirmation modal before updating
  const updateForm = (formId, formType, formData) => {
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

  // Confirm and sync the update
  const confirmUpdate = async () => {
    if (!updateConfirmModal) return;

    setIsUpdating(true);
    const { form, formType, formData, originalForm } = updateConfirmModal;
    const siteName = formData.siteConducted || formData.site || '';

    try {
      if (GoogleDriveSync.isConnected() && siteName) {
        console.log('Searching for old PDFs to delete...');
        await GoogleDriveSync.deleteOldFormPDFs(form.id, siteName);
      }

      setForms(prevForms => {
        const updatedForms = prevForms.map(f => {
          if (f.id === form.id) {
            return { ...f, data: formData, updatedAt: new Date().toISOString() };
          }
          return f;
        });

        localStorage.setItem('jmart-safety-forms', JSON.stringify(updatedForms));
        console.log('Updated form saved to localStorage');

        if (FirebaseSync.isConnected()) {
          FirebaseSync.syncForms(updatedForms).then(() => {
            console.log('Updated form synced to Firebase');
          }).catch(err => console.error('Firebase sync error:', err));
        }

        return updatedForms;
      });

      const filename = PDFGenerator.download(form);
      markAsBackedUp(form.id);
      console.log('Downloaded updated PDF:', filename);

      if (GoogleDriveSync.isConnected()) {
        const { doc } = PDFGenerator.generate(form);
        const pdfBlob = doc.output('blob');
        await GoogleDriveSync.uploadPDF(pdfBlob, filename, form.type);
        console.log('Uploaded new PDF to Drive:', form.type);
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
      alert('Error updating form. Please try again.');
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
      const filename = PDFGenerator.download(successModal.form);
      markAsBackedUp(successModal.form.id);
      console.log('Downloaded and backed up:', filename);
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

    setForms(prevForms => {
      const deletedForm = prevForms.find(f => f.id === formId);
      const updatedForms = prevForms.filter(f => f.id !== formId);

      AuditLogManager.log('delete', {
        formId: formId,
        formType: deletedForm?.type || 'unknown',
        site: deletedForm?.data?.siteConducted || deletedForm?.data?.site || 'Unknown',
        originalCreatedBy: deletedForm?.createdBy,
        originalCreatedAt: deletedForm?.createdAt,
        action: 'Form deleted'
      });

      localStorage.setItem('jmart-safety-forms', JSON.stringify(updatedForms));
      console.log('Form deleted, saved to localStorage:', updatedForms.length, 'forms remaining');

      deletingFormRef.current = true;

      if (FirebaseSync.isConnected()) {
        FirebaseSync.syncForms(updatedForms).then(() => {
          console.log('Deletion synced to Firebase');
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
    // Functions
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
  };
}

// =============================================
// useDataSync - Firebase/localStorage sync
// =============================================
function useDataSync({ setForms, setSites, deletingFormRef }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncStatus, setSyncStatus] = useState(FirebaseSync.isConnected() ? 'synced' : 'local');
  const [pendingSyncCount, setPendingSyncCount] = useState(FirebaseSync.getPendingCount());
  const [pendingPhotoCount, setPendingPhotoCount] = useState(OfflinePhotoQueue.getCount());
  const [syncError, setSyncError] = useState(null);
  const [showSyncBanner, setShowSyncBanner] = useState(!FirebaseSync.isConnected());

  const isInitialLoad = useRef(true);
  const sitesFromFirebaseRef = useRef(false);

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
      }
    }

    const savedSites = localStorage.getItem('jmart-safety-sites');
    if (savedSites) {
      try {
        const parsed = JSON.parse(savedSites);
        const sanitized = [...new Set((Array.isArray(parsed) ? parsed : Object.values(parsed || {})).map(s => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') {
            const chars = Object.keys(s).filter(k => k !== '_lastModified' && !isNaN(k)).sort((a,b) => Number(a) - Number(b));
            return chars.map(k => s[k]).join('');
          }
          return String(s);
        }).filter(s => s && s.length > 1 && s !== 'undefined' && s !== 'null'))];
        setSites(sanitized);
        localStorage.setItem('jmart-safety-sites', JSON.stringify(sanitized));
      } catch (e) {
        console.error('Error parsing localStorage sites:', e);
      }
    }

    const lastSync = localStorage.getItem('jmart-last-sync');
    if (lastSync) setLastSynced(lastSync);

    if (FirebaseSync.isConnected()) {
      const unsubForms = FirebaseSync.onFormsChange((firebaseForms) => {
        const formsArray = Array.isArray(firebaseForms) ? firebaseForms : Object.values(firebaseForms || {});
        console.log('Firebase forms received:', formsArray.length, 'forms');

        if (deletingFormRef.current) {
          console.log('Delete operation in progress - using Firebase as source of truth');
          deletingFormRef.current = false;
          setForms(formsArray);
          localStorage.setItem('jmart-safety-forms', JSON.stringify(formsArray));
          setSyncStatus('synced');
          setLastSynced(new Date().toISOString());
          return;
        }

        if (formsArray.length > 0) {
          const mergedForms = [];
          const formMap = new Map();

          formsArray.forEach(form => {
            formMap.set(form.id, { ...form, source: 'firebase' });
          });

          // Re-read localStorage to avoid stale closure over initial localForms
          let currentLocalForms = localForms;
          try {
            const freshLocal = localStorage.getItem('jmart-safety-forms');
            if (freshLocal) currentLocalForms = JSON.parse(freshLocal);
          } catch (e) { /* use original localForms */ }

          currentLocalForms.forEach(localForm => {
            const existingForm = formMap.get(localForm.id);
            if (!existingForm) {
              formMap.set(localForm.id, { ...localForm, source: 'local' });
            } else {
              const localTime = new Date(localForm.updatedAt || localForm.createdAt).getTime();
              const remoteTime = new Date(existingForm.updatedAt || existingForm.createdAt).getTime();

              if (localTime > remoteTime) {
                console.log('Conflict resolved for ' + localForm.id + ': local wins');
                formMap.set(localForm.id, { ...localForm, source: 'local-wins' });
              } else if (localTime < remoteTime) {
                console.log('Conflict resolved for ' + localForm.id + ': firebase wins');
              } else {
                const localVersion = localForm.version || 1;
                const remoteVersion = existingForm.version || 1;
                if (localVersion > remoteVersion) {
                  formMap.set(localForm.id, { ...localForm, source: 'local-version' });
                }
              }
            }
          });

          formMap.forEach(form => mergedForms.push(form));
          mergedForms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setForms(mergedForms);
          localStorage.setItem('jmart-safety-forms', JSON.stringify(mergedForms));
          console.log('Merged forms with conflict resolution:', mergedForms.length, 'total');
        } else if (localForms.length > 0) {
          console.log('Firebase empty, pushing local forms to Firebase');
          FirebaseSync.syncForms(localForms);
        }

        setSyncStatus('synced');
        setLastSynced(new Date().toISOString());
      });

      const unsubSites = FirebaseSync.onSitesChange((firebaseSites) => {
        const rawArray = Array.isArray(firebaseSites) ? firebaseSites : Object.values(firebaseSites || {});
        const sitesArray = [...new Set(rawArray.map(s => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') {
            const chars = Object.keys(s).filter(k => k !== '_lastModified' && !isNaN(k)).sort((a,b) => Number(a) - Number(b));
            return chars.map(k => s[k]).join('');
          }
          return String(s);
        }).filter(s => s && s.length > 0 && s !== 'undefined' && s !== 'null'))];
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

  // Save forms to localStorage and sync to Firebase
  const syncFormsEffect = (forms) => {
    if (!isInitialLoad.current) {
      localStorage.setItem('jmart-safety-forms', JSON.stringify(forms));
      localStorage.setItem('jmart-last-sync', new Date().toISOString());
      setLastSynced(new Date().toISOString());
      console.log('Forms saved to localStorage:', forms.length, 'forms');

      if (FirebaseSync.isConnected() && isOnline && forms.length > 0) {
        setSyncStatus('syncing');
        FirebaseSync.syncForms(forms).then(() => {
          setSyncStatus('synced');
          console.log('Forms synced to Firebase:', forms.length, 'forms');
        }).catch((err) => {
          setSyncStatus('offline');
          console.error('Firebase sync failed:', err);
        });
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

      if (FirebaseSync.isConnected() && isOnline) {
        FirebaseSync.syncSites(sites);
      }
    }
  };

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync status listener
  useEffect(() => {
    const unsubscribe = FirebaseSync.onSyncStatusChange((status, details) => {
      setPendingSyncCount(details?.pending || 0);
      if (status === 'synced' && details?.pending === 0) {
        setSyncStatus('synced');
        setSyncError(null);
      } else if (status === 'queued' || (details?.pending > 0)) {
        setSyncStatus('pending');
      } else if (status === 'error' || status === 'failed') {
        setSyncStatus('error');
        setSyncError(details?.message || details?.error || 'Sync failed');
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
    const initDeviceAuth = async () => {
      const result = await DeviceAuth.init();

      if (result.approved) {
        setDeviceAuthStatus('approved');
        setIsDeviceAdmin(result.admin);
        setCanViewDevices(result.canViewDevices || result.admin);
        setCanRevokeDevices(result.canRevokeDevices || result.admin);

        if (result.admin) {
          DeviceAuth.requestNotificationPermission();

          DeviceAuth.onNotification((type, data) => {
            if (type === 'new_device') {
              setNewDeviceNotification(data);
              DeviceAuth.showBrowserNotification(
                'New Device Request',
                data.type + ' (' + data.browser + ') wants to access J&M Artsteel Safety'
              );
              setTimeout(() => setNewDeviceNotification(null), 10000);
            }
          });
        }

        if (result.admin || result.canViewDevices || result.canRevokeDevices) {
          DeviceAuth.listenForPendingDevices((devices) => {
            setPendingDevices(devices);
          });

          DeviceAuth.listenForApprovedDevices((devices) => {
            setApprovedDevices(devices);
          });
        }

        DeviceAuth.listenForOwnDeviceStatus((status) => {
          if (status.revoked) {
            setDeviceAuthStatus('denied');
            alert('Your device access has been revoked by an administrator.');
          }
        });
      } else {
        setDeviceAuthStatus('pending');

        const pollInterval = IntervalRegistry.setInterval(async () => {
          const checkResult = await DeviceAuth.checkDeviceStatus();
          if (checkResult.approved) {
            setDeviceAuthStatus('approved');
            setIsDeviceAdmin(checkResult.admin);
            IntervalRegistry.clearInterval(pollInterval);
            window.location.reload();
          }
        }, 5000, 'DeviceApprovalPoll');

        return () => IntervalRegistry.clearInterval(pollInterval);
      }
    };

    initDeviceAuth();
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

// Export to window for cross-file access
window.useFormManager = useFormManager;
window.useDataSync = useDataSync;
window.useDeviceAuth = useDeviceAuth;
window.usePWAInstall = usePWAInstall;
