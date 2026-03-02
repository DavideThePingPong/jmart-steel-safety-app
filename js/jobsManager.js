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

  // Initialize and load jobs from Firebase
  init: async function() {
    if (!firebaseDb || !isFirebaseConfigured) {
      console.log('JobsManager: Firebase not configured');
      return;
    }

    // Listen for real-time job updates
    firebaseDb.ref('jmart-safety/jobs').on('value', (snapshot) => {
      const data = snapshot.val();
      this.jobs = data ? Object.entries(data).map(([id, job]) => ({ id, ...job })) : [];
      this.notifyListeners();
      console.log('JobsManager: Loaded', this.jobs.length, 'jobs');
    });

    // Migrate old sites to new jobs structure if needed
    this.migrateFromSites();
  },

  // Migrate from old 'sites' structure to new 'jobs' structure
  // Uses a migration-complete flag to prevent re-running on every app load
  migrateFromSites: async function() {
    if (!firebaseDb) return;

    try {
      // Check if migration was already completed
      const migrationSnap = await firebaseDb.ref('jmart-safety/config/jobsMigrationComplete').once('value');
      if (migrationSnap.val()) {
        console.log('JobsManager: Migration already completed, skipping');
        return;
      }

      const sitesSnap = await firebaseDb.ref('jmart-safety/sites').once('value');
      const sites = sitesSnap.val();

      if (sites && Array.isArray(sites)) {
        const jobsSnap = await firebaseDb.ref('jmart-safety/jobs').once('value');
        const existingJobs = jobsSnap.val();

        // Build a Set of existing job names to prevent duplicates
        const existingNames = new Set();
        if (existingJobs) {
          Object.values(existingJobs).forEach(j => {
            if (j && j.name) existingNames.add(j.name.toLowerCase());
          });
        }

        let migratedCount = 0;
        for (const site of sites) {
          if (site && site.name && !existingNames.has(site.name.toLowerCase())) {
            await this.addJob({
              name: site.name,
              client: site.builder || '',
              address: site.address || '',
              status: 'active',
              createdAt: new Date().toISOString(),
              source: 'migrated-from-sites'
            });
            existingNames.add(site.name.toLowerCase());
            migratedCount++;
          }
        }

        if (migratedCount > 0) {
          console.log('JobsManager: Migrated', migratedCount, 'new sites to jobs');
        }
      }

      // Mark migration as complete so it never runs again
      await firebaseDb.ref('jmart-safety/config/jobsMigrationComplete').set(true);
      console.log('JobsManager: Migration flagged as complete');
    } catch (error) {
      console.error('JobsManager: Migration error:', error);
    }
  },

  // Add a new job
  addJob: async function(jobData) {
    if (!firebaseDb) return null;

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
      const ref = await firebaseDb.ref('jmart-safety/jobs').push(job);
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

    try {
      updates.updatedAt = new Date().toISOString();
      await firebaseDb.ref(`jmart-safety/jobs/${jobId}`).update(updates);
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
    return this.jobs.find(j => j.name.toLowerCase() === name.toLowerCase());
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
        await firebaseDb.ref('jmart-safety/jobs').update(updates);
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
// Run dedup once on load to clean up any existing duplicates
setTimeout(() => JobsManager.deduplicateJobs(), 3000);
