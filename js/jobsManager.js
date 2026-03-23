// Shared Jobs Manager
// Extracted from index.html for maintainability
// ========================================
// SHARED JOBS MANAGER
// Unified job system for Safety App + Steel agents
// Jobs stored in Firebase: jmart-safety/jobs/
// ========================================
const JobsManager = {
  jobs: [],
  listeners: [],
  listenerAttached: false,
  initStarted: false,
  dedupeTimer: null,

  sanitizeValue: function(value) {
    return typeof sanitizeForFirebase === 'function' ? sanitizeForFirebase(value) : value;
  },

  hasAdminAccess: function() {
    return typeof DeviceAuthManager === 'undefined' ? true : !!DeviceAuthManager.isAdmin;
  },

  normalizeSites: function(rawSites) {
    if (!rawSites) return [];

    const siteEntries = Array.isArray(rawSites) ? rawSites : Object.values(rawSites);
    return siteEntries
      .map((site) => {
        if (typeof site === 'string') {
          const name = site.trim();
          return {
            name,
            client: '',
            address: name
          };
        }

        if (!site || typeof site !== 'object') return null;

        const name = typeof site.name === 'string' ? site.name.trim() : '';
        if (!name) return null;

        return {
          name,
          client: typeof site.builder === 'string' ? site.builder : (typeof site.client === 'string' ? site.client : ''),
          address: typeof site.address === 'string' && site.address.trim() ? site.address : name
        };
      })
      .filter((site) => site && site.name);
  },

  // Initialize and load jobs from Firebase
  init: async function() {
    if (!firebaseDb || !isFirebaseConfigured) {
      console.log('JobsManager: Firebase not configured');
      return;
    }

    if (this.initStarted) {
      return;
    }
    this.initStarted = true;

    try {
      await firebaseAuthReady;
    } catch (e) {
      console.warn('JobsManager: Firebase auth not ready:', e.message);
      return;
    }

    if (!firebaseAuthUid) {
      console.warn('JobsManager: No Firebase auth UID available yet');
      return;
    }

    const approvalRef = firebaseDb.ref('jmart-safety/authDevices/' + firebaseAuthUid + '/approvedAt');
    const handleApproval = (snapshot) => {
      if (!snapshot.exists()) {
        console.log('JobsManager: Waiting for approved auth device before subscribing to jobs');
        return;
      }

      approvalRef.off('value', handleApproval);
      this.startAuthorizedSync();
    };

    approvalRef.on('value', handleApproval, (error) => {
      console.error('JobsManager: Auth approval listener error:', error);
      if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(error, 'jobs-auth-listener');
    });
  },

  startAuthorizedSync: function() {
    if (this.listenerAttached) {
      return;
    }
    this.listenerAttached = true;

    // Listen for real-time job updates
    firebaseDb.ref('jmart-safety/jobs').on('value', (snapshot) => {
      const data = snapshot.val();
      this.jobs = data ? Object.entries(data).map(([id, job]) => ({ id, ...(job || {}) })) : [];
      this.notifyListeners();
      console.log('JobsManager: Loaded', this.jobs.length, 'jobs');
    }, (error) => {
      console.error('JobsManager: Firebase listener error:', error);
      if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(error, 'jobs-listener');
    });

    if (this.hasAdminAccess()) {
      // Migrate old sites to new jobs structure if needed
      this.migrateFromSites();

      if (!this.dedupeTimer) {
        this.dedupeTimer = setTimeout(() => {
          this.dedupeTimer = null;
          this.deduplicateJobs();
        }, 3000);
      }
    } else {
      console.log('JobsManager: Skipping admin-only reconciliation on non-admin device');
    }
  },

  // Migrate from old 'sites' structure to new 'jobs' structure
  // Uses a migration-complete flag to prevent re-running on every app load
  migrateFromSites: async function() {
    if (!firebaseDb) return;
    if (!this.hasAdminAccess()) {
      console.log('JobsManager: Site migration skipped for non-admin device');
      return false;
    }

    try {
      const migrationRef = firebaseDb.ref('jmart-safety/config/jobsMigrationComplete');
      const migrationSnap = await migrationRef.once('value');
      const migrationAlreadyComplete = !!migrationSnap.val();

      const sitesSnap = await firebaseDb.ref('jmart-safety/sites').once('value');
      const sites = this.normalizeSites(sitesSnap.val());

      const jobsSnap = await firebaseDb.ref('jmart-safety/jobs').once('value');
      const existingJobs = jobsSnap.val();

      // Build a Set of existing job names to prevent duplicates and allow safe reconciliation
      const existingNames = new Set();
      if (existingJobs) {
        Object.values(existingJobs).forEach((job) => {
          if (job && job.name) existingNames.add(job.name.toLowerCase().trim());
        });
      }

      let migratedCount = 0;
      for (const site of sites) {
        const normalizedName = site.name.toLowerCase().trim();
        if (existingNames.has(normalizedName)) continue;

        await this.addJob({
          name: site.name,
          client: site.client,
          address: site.address,
          status: 'active',
          createdAt: new Date().toISOString(),
          source: 'migrated-from-sites'
        });
        existingNames.add(normalizedName);
        migratedCount++;
      }

      if (migratedCount > 0) {
        console.log('JobsManager: Reconciled', migratedCount, 'missing jobs from sites');
      } else if (migrationAlreadyComplete) {
        console.log('JobsManager: Migration already completed, no missing site jobs found');
      }

      if (!migrationAlreadyComplete || migratedCount > 0) {
        const migrationFlag = typeof sanitizeForFirebase === 'function' ? sanitizeForFirebase(true) : true;
        await migrationRef.set(migrationFlag);
        console.log('JobsManager: Migration flagged as complete');
      }
    } catch (error) {
      console.error('JobsManager: Migration error:', error);
    }
  },

  // Add a new job
  addJob: async function(jobData) {
    if (!firebaseDb) return null;
    if (!this.hasAdminAccess()) {
      console.warn('JobsManager: Refusing addJob on non-admin device');
      return null;
    }

    const job = {
      name: jobData.name,
      client: jobData.client || '',
      address: jobData.address || '',
      status: jobData.status || 'active',
      createdAt: jobData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: jobData.source || 'safety-app'
    };

    try {
      var safeJob = this.sanitizeValue(job);
      const ref = await firebaseDb.ref('jmart-safety/jobs').push(safeJob);
      console.log('JobsManager: Added job', job.name, ref.key);
      return { id: ref.key, ...job };
    } catch (error) {
      console.error('JobsManager: Error adding job:', error);
      return null;
    }
  },

  // Update a job
  updateJob: async function(jobId, updates) {
    if (!firebaseDb || !jobId) return false;
    if (!this.hasAdminAccess()) {
      console.warn('JobsManager: Refusing updateJob on non-admin device');
      return false;
    }

    try {
      var updateData = { ...updates, updatedAt: new Date().toISOString() };
      const safeUpdateData = typeof sanitizeForFirebase === 'function'
        ? sanitizeForFirebase(updateData)
        : updateData;
      await firebaseDb.ref(`jmart-safety/jobs/${jobId}`).update(safeUpdateData);
      console.log('JobsManager: Updated job', jobId);
      return true;
    } catch (error) {
      console.error('JobsManager: Error updating job:', error);
      return false;
    }
  },

  // Get all active jobs
  getActiveJobs: function() {
    return this.jobs.filter(j => j.status === 'active');
  },

  // Get all jobs
  getAllJobs: function() {
    return this.jobs;
  },

  // Find job by name (case-insensitive)
  findByName: function(name) {
    if (!name) return undefined;
    const lower = name.toLowerCase();
    return this.jobs.find(j => j.name && j.name.toLowerCase() === lower);
  },

  // Subscribe to job updates
  subscribe: function(callback) {
    this.listeners.push(callback);
    callback(this.jobs); // Initial call
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  // Notify all listeners
  notifyListeners: function() {
    this.listeners.forEach(callback => callback(this.jobs));
  },

  // Get jobs as simple name array (for dropdowns)
  getJobNames: function() {
    return this.getActiveJobs().map(j => j.name);
  },

  // Clean up duplicate jobs (keeps the oldest entry for each name)
  deduplicateJobs: async function() {
    if (!firebaseDb) return;
    if (!this.hasAdminAccess()) {
      console.log('JobsManager: Dedup skipped for non-admin device');
      return false;
    }

    try {
      const jobsSnap = await firebaseDb.ref('jmart-safety/jobs').once('value');
      const jobs = jobsSnap.val();
      if (!jobs) return;

      const seenNames = new Map(); // name → oldest job key
      const duplicateKeys = [];

      Object.entries(jobs).forEach(([key, job]) => {
        if (!job || !job.name) return;
        const nameKey = job.name.toLowerCase().trim();
        if (seenNames.has(nameKey)) {
          // Duplicate - keep the older one, remove the newer one
          const existingKey = seenNames.get(nameKey);
          const existingJob = jobs[existingKey];
          const existingDate = new Date(existingJob.createdAt || 0).getTime();
          const currentDate = new Date(job.createdAt || 0).getTime();

          if (currentDate < existingDate) {
            // Current is older, remove the existing one
            duplicateKeys.push(existingKey);
            seenNames.set(nameKey, key);
          } else {
            // Existing is older, remove current
            duplicateKeys.push(key);
          }
        } else {
          seenNames.set(nameKey, key);
        }
      });

      if (duplicateKeys.length > 0) {
        console.log('JobsManager: Removing', duplicateKeys.length, 'duplicate jobs');
        const updates = {};
        duplicateKeys.forEach(key => { updates[key] = null; });
        const safeUpdates = typeof sanitizeForFirebase === 'function'
          ? sanitizeForFirebase(updates)
          : updates;
        await firebaseDb.ref('jmart-safety/jobs').update(safeUpdates);
        console.log('JobsManager: Deduplication complete');
      } else {
        console.log('JobsManager: No duplicate jobs found');
      }
    } catch (error) {
      console.error('JobsManager: Dedup error:', error);
    }
  }
};

// Initialize Jobs Manager and clean up duplicates
JobsManager.init();
