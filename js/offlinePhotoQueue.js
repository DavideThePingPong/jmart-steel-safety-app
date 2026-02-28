// Offline Photo Queue
// Extracted from index.html for maintainability
// ========================================
// OFFLINE PHOTO QUEUE MANAGER
// Queues photos when offline, uploads when back online
// ========================================
const OfflinePhotoQueue = {
  queue: [],
  isProcessing: false,
  listeners: [],

  // Initialize - load queue from localStorage
  init: function() {
    try {
      const saved = localStorage.getItem('jmart-photo-queue');
      this.queue = saved ? JSON.parse(saved) : [];
      if (this.queue.length > 0) {
        console.log(`OfflinePhotoQueue: ${this.queue.length} photos pending`);
        if (navigator.onLine && GoogleDriveSync.isConnected()) {
          this.processQueue();
        }
      }
    } catch (e) {
      console.error('Error loading photo queue:', e);
      this.queue = [];
    }

    // Listen for online events
    window.addEventListener('online', () => {
      console.log('Back online - processing photo queue');
      setTimeout(() => this.processQueue(), 2000); // Wait for Drive reconnection
    });
  },

  // Save queue to localStorage
  saveQueue: function() {
    try {
      localStorage.setItem('jmart-photo-queue', JSON.stringify(this.queue));
    } catch (e) {
      console.error('Error saving photo queue:', e);
    }
  },

  // Add photo to queue (stores as base64)
  addToQueue: async function(file, jobName) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const item = {
          id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          jobName,
          filename: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result, // base64
          queuedAt: new Date().toISOString()
        };
        this.queue.push(item);
        this.saveQueue();
        this.notifyListeners();
        console.log(`Photo queued for offline upload: ${file.name}`);
        resolve(item.id);
      };
      reader.onerror = (e) => {
        console.error(`FileReader error for ${file.name}:`, reader.error);
        reject(reader.error || new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  },

  // Process the queue
  processQueue: async function() {
    if (this.isProcessing || this.queue.length === 0) return;
    if (!navigator.onLine || !GoogleDriveSync.isConnected()) {
      console.log('Cannot process photo queue - offline or not connected');
      return;
    }

    this.isProcessing = true;
    this.notifyListeners();

    const itemsToProcess = [...this.queue];
    let processed = 0;

    for (const item of itemsToProcess) {
      try {
        // Convert base64 back to blob
        const response = await fetch(item.data);
        const blob = await response.blob();
        const file = new File([blob], item.filename, { type: item.type });

        // Upload to Drive
        const result = await PhotoUploadManager.uploadToDrive(file, item.jobName);

        if (result) {
          // Success - remove from queue
          this.queue = this.queue.filter(q => q.id !== item.id);
          this.saveQueue();
          processed++;
          console.log(`Uploaded queued photo: ${item.filename}`);
        }
      } catch (error) {
        console.error(`Error uploading queued photo ${item.filename}:`, error);
      }
    }

    this.isProcessing = false;
    this.notifyListeners();
    console.log(`Processed ${processed}/${itemsToProcess.length} queued photos`);
  },

  // Get queue count
  getCount: function() {
    return this.queue.length;
  },

  // Subscribe to queue changes
  subscribe: function(callback) {
    this.listeners.push(callback);
    callback(this.queue.length, this.isProcessing);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  // Notify listeners
  notifyListeners: function() {
    this.listeners.forEach(cb => cb(this.queue.length, this.isProcessing));
  }
};

// Initialize Offline Photo Queue
OfflinePhotoQueue.init();
