/**
 * Tests for js/jobsManager.js — JobsManager
 *
 * Covers: addJob, updateJob, findByName, getActiveJobs, getJobNames,
 *         deduplicateJobs, subscribe, and regression fixes.
 */
const fs = require('fs');
const path = require('path');

// --- Firebase mock wired up BEFORE loading the script ---
const pushMock = jest.fn(() => Promise.resolve({ key: '-NewKey123' }));
const updateMock = jest.fn(() => Promise.resolve());
const onceMock = jest.fn(() => Promise.resolve({ val: () => null }));
const onMock = jest.fn();
const setMock = jest.fn(() => Promise.resolve());

const refMock = jest.fn(() => ({
  push: pushMock,
  update: updateMock,
  once: onceMock,
  on: onMock,
  set: setMock
}));

global.firebaseDb = { ref: refMock };
global.isFirebaseConfigured = true;

// Load the source and strip auto-init calls, then eval so `const` lands in this scope
const ROOT = path.resolve(__dirname, '..', '..', '..');
let code = fs.readFileSync(path.resolve(ROOT, 'js/jobsManager.js'), 'utf-8');

// Strip auto-init lines
const stripPatterns = ['JobsManager.init()', 'setTimeout('];
for (const pattern of stripPatterns) {
  code = code.split('\n').map(line => {
    const trimmed = line.trim();
    if (trimmed.includes(pattern) && !line.startsWith(' ') && !line.startsWith('\t')) {
      return '// [STRIPPED] ' + line;
    }
    if (trimmed.startsWith(pattern)) {
      return '// [STRIPPED] ' + line;
    }
    return line;
  }).join('\n');
}

// Replace `const JobsManager` with `global.JobsManager` so it's accessible
code = code.replace(/^const JobsManager\s*=/m, 'global.JobsManager =');
eval(code);

const JobsManager = global.JobsManager;

// ---------------------------------------------------------
describe('JobsManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset internal state
    JobsManager.jobs = [];
    JobsManager.listeners = [];
    // Re-wire firebase mock (in case a test nullified it)
    global.firebaseDb = { ref: refMock };
  });

  // -------------------------------------------------------
  // addJob
  // -------------------------------------------------------
  describe('addJob', () => {
    it('should push a job to Firebase and return the created object', async () => {
      const result = await JobsManager.addJob({ name: 'Sydney Opera House', client: 'Lendlease' });

      expect(refMock).toHaveBeenCalledWith('jmart-safety/jobs');
      expect(pushMock).toHaveBeenCalledTimes(1);

      const pushed = pushMock.mock.calls[0][0];
      expect(pushed.name).toBe('Sydney Opera House');
      expect(pushed.client).toBe('Lendlease');
      expect(pushed.status).toBe('active');
      expect(pushed.source).toBe('safety-app');
      expect(result.id).toBe('-NewKey123');
    });

    it('should return null when firebaseDb is not available', async () => {
      global.firebaseDb = null;
      const result = await JobsManager.addJob({ name: 'Test' });
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------
  // updateJob
  // -------------------------------------------------------
  describe('updateJob', () => {
    it('should update a job in Firebase and return true', async () => {
      const result = await JobsManager.updateJob('abc123', { status: 'completed' });

      expect(refMock).toHaveBeenCalledWith('jmart-safety/jobs/abc123');
      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('should NOT mutate the input updates object [REGRESSION]', async () => {
      const updates = { status: 'completed' };
      const original = { ...updates };

      await JobsManager.updateJob('abc123', updates);

      // The original object must remain unchanged (no updatedAt added)
      expect(updates).toEqual(original);
    });

    it('should return false when jobId is falsy', async () => {
      const result = await JobsManager.updateJob(null, { status: 'active' });
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------
  // findByName
  // -------------------------------------------------------
  describe('findByName', () => {
    beforeEach(() => {
      JobsManager.jobs = [
        { id: '1', name: 'Martin Place', status: 'active' },
        { id: '2', name: 'Sydney Airport', status: 'active' },
        { id: '3', name: 'Chatswood', status: 'completed' }
      ];
    });

    it('should find a job case-insensitively', () => {
      const job = JobsManager.findByName('martin place');
      expect(job).toBeDefined();
      expect(job.id).toBe('1');
    });

    it('should return undefined when no match found', () => {
      const job = JobsManager.findByName('Nonexistent Job');
      expect(job).toBeUndefined();
    });

    it('should return undefined for null input instead of crashing [REGRESSION]', () => {
      expect(() => JobsManager.findByName(null)).not.toThrow();
      expect(JobsManager.findByName(null)).toBeUndefined();
    });

    it('should return undefined for undefined input', () => {
      expect(JobsManager.findByName(undefined)).toBeUndefined();
    });
  });

  // -------------------------------------------------------
  // getActiveJobs / getJobNames
  // -------------------------------------------------------
  describe('getActiveJobs', () => {
    it('should return only jobs with status "active"', () => {
      JobsManager.jobs = [
        { id: '1', name: 'Job A', status: 'active' },
        { id: '2', name: 'Job B', status: 'completed' },
        { id: '3', name: 'Job C', status: 'active' }
      ];

      const active = JobsManager.getActiveJobs();
      expect(active).toHaveLength(2);
      expect(active.map(j => j.name)).toEqual(['Job A', 'Job C']);
    });
  });

  describe('getJobNames', () => {
    it('should return an array of active job names only', () => {
      JobsManager.jobs = [
        { id: '1', name: 'Site Alpha', status: 'active' },
        { id: '2', name: 'Site Beta', status: 'completed' },
        { id: '3', name: 'Site Gamma', status: 'active' }
      ];

      const names = JobsManager.getJobNames();
      expect(names).toEqual(['Site Alpha', 'Site Gamma']);
    });
  });

  // -------------------------------------------------------
  // subscribe
  // -------------------------------------------------------
  describe('subscribe', () => {
    it('should call the callback immediately with current jobs', () => {
      JobsManager.jobs = [{ id: '1', name: 'Test' }];
      const cb = jest.fn();

      JobsManager.subscribe(cb);

      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(JobsManager.jobs);
    });

    it('should return an unsubscribe function that removes the listener', () => {
      const cb = jest.fn();
      const unsub = JobsManager.subscribe(cb);
      expect(JobsManager.listeners).toContain(cb);

      unsub();
      expect(JobsManager.listeners).not.toContain(cb);
    });
  });
});
