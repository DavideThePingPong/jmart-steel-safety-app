/**
 * IntervalRegistry Tests (js/intervalRegistry.js)
 *
 * Tests the timer-tracking registry that prevents memory leaks by
 * keeping a record of all setInterval / setTimeout calls.
 *
 * REGRESSION: clearTimeout method was missing in an earlier version.
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.resolve(__dirname, '..', '..', '..', 'js', 'intervalRegistry.js');

/**
 * Load intervalRegistry.js into global scope.
 * The file declares `const IntervalRegistry = { ... }` at top level.
 * `new Function(code)` scopes `const`, so we replace the declaration
 * with a `global.IntervalRegistry =` assignment before eval.
 */
function loadIntervalRegistry() {
  let code = fs.readFileSync(SCRIPT_PATH, 'utf-8');

  // Make the const a global assignment so it's accessible in tests
  code = code.replace(/^const IntervalRegistry\s*=/m, 'global.IntervalRegistry =');

  // Strip the beforeunload listener (fires during eval, clutters test state)
  code = code.replace(/window\.addEventListener\(['"]beforeunload['"][\s\S]*?\);/g, '// [stripped]');

  // Suppress console noise during eval
  const origLog = console.log;
  console.log = () => {};
  try {
    eval(code);
  } finally {
    console.log = origLog;
  }
}

describe('IntervalRegistry', () => {
  let origSetInterval, origClearInterval, origSetTimeout, origClearTimeout;
  let nextId;

  beforeEach(() => {
    // Save originals
    origSetInterval = window.setInterval;
    origClearInterval = window.clearInterval;
    origSetTimeout = window.setTimeout;
    origClearTimeout = window.clearTimeout;

    // Deterministic mock timer IDs
    nextId = 100;
    window.setInterval = jest.fn(() => nextId++);
    window.clearInterval = jest.fn();
    window.setTimeout = jest.fn(() => nextId++);
    window.clearTimeout = jest.fn();

    // Load the script into global scope
    loadIntervalRegistry();
  });

  afterEach(() => {
    // Restore real timers
    window.setInterval = origSetInterval;
    window.clearInterval = origClearInterval;
    window.setTimeout = origSetTimeout;
    window.clearTimeout = origClearTimeout;

    // Clean up global
    delete global.IntervalRegistry;
  });

  // -----------------------------------------------------------------------
  // Existence
  // -----------------------------------------------------------------------
  it('should exist as a global object after loading', () => {
    expect(global.IntervalRegistry).toBeDefined();
    expect(typeof global.IntervalRegistry).toBe('object');
  });

  // -----------------------------------------------------------------------
  // setInterval
  // -----------------------------------------------------------------------
  describe('setInterval', () => {
    it('should register and return an interval id', () => {
      const fn = jest.fn();
      const id = global.IntervalRegistry.setInterval(fn, 1000, 'test-interval');

      expect(id).toBeDefined();
      expect(window.setInterval).toHaveBeenCalledWith(fn, 1000);
      expect(global.IntervalRegistry.intervals.length).toBe(1);
    });

    it('should track interval with the provided label', () => {
      global.IntervalRegistry.setInterval(jest.fn(), 5000, 'heartbeat');

      expect(global.IntervalRegistry.intervals[0].label).toBe('heartbeat');
      expect(global.IntervalRegistry.intervals[0].ms).toBe(5000);
    });

    it('should default to "unnamed" when no label is provided', () => {
      global.IntervalRegistry.setInterval(jest.fn(), 1000);

      expect(global.IntervalRegistry.intervals[0].label).toBe('unnamed');
    });

    it('should track multiple intervals independently', () => {
      global.IntervalRegistry.setInterval(jest.fn(), 1000, 'a');
      global.IntervalRegistry.setInterval(jest.fn(), 2000, 'b');
      global.IntervalRegistry.setInterval(jest.fn(), 3000, 'c');

      expect(global.IntervalRegistry.intervals.length).toBe(3);
      expect(global.IntervalRegistry.intervals.map((i) => i.label)).toEqual(['a', 'b', 'c']);
    });
  });

  // -----------------------------------------------------------------------
  // setTimeout
  // -----------------------------------------------------------------------
  describe('setTimeout', () => {
    it('should register and return a timeout id', () => {
      const fn = jest.fn();
      const id = global.IntervalRegistry.setTimeout(fn, 500, 'test-timeout');

      expect(id).toBeDefined();
      expect(window.setTimeout).toHaveBeenCalled();
      expect(global.IntervalRegistry.timeouts.length).toBe(1);
    });

    it('should track timeout with label', () => {
      global.IntervalRegistry.setTimeout(jest.fn(), 200, 'debounce');

      expect(global.IntervalRegistry.timeouts[0].label).toBe('debounce');
    });
  });

  // -----------------------------------------------------------------------
  // clearInterval
  // -----------------------------------------------------------------------
  describe('clearInterval', () => {
    it('should call window.clearInterval and remove from registry', () => {
      const id = global.IntervalRegistry.setInterval(jest.fn(), 1000, 'to-clear');
      expect(global.IntervalRegistry.intervals.length).toBe(1);

      global.IntervalRegistry.clearInterval(id);

      expect(window.clearInterval).toHaveBeenCalledWith(id);
      expect(global.IntervalRegistry.intervals.length).toBe(0);
    });

    it('should only remove the specified interval, not others', () => {
      const id1 = global.IntervalRegistry.setInterval(jest.fn(), 1000, 'keep');
      const id2 = global.IntervalRegistry.setInterval(jest.fn(), 2000, 'remove');

      global.IntervalRegistry.clearInterval(id2);

      expect(global.IntervalRegistry.intervals.length).toBe(1);
      expect(global.IntervalRegistry.intervals[0].id).toBe(id1);
    });
  });

  // -----------------------------------------------------------------------
  // clearTimeout   [REGRESSION - method was previously missing]
  // -----------------------------------------------------------------------
  describe('clearTimeout', () => {
    it('should exist as a method [REGRESSION]', () => {
      expect(typeof global.IntervalRegistry.clearTimeout).toBe('function');
    });

    it('should call window.clearTimeout and remove from registry [REGRESSION]', () => {
      const id = global.IntervalRegistry.setTimeout(jest.fn(), 500, 'to-clear');
      expect(global.IntervalRegistry.timeouts.length).toBe(1);

      global.IntervalRegistry.clearTimeout(id);

      expect(window.clearTimeout).toHaveBeenCalledWith(id);
      expect(global.IntervalRegistry.timeouts.length).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // clearAll
  // -----------------------------------------------------------------------
  describe('clearAll', () => {
    it('should clear all registered intervals and timeouts', () => {
      global.IntervalRegistry.setInterval(jest.fn(), 1000, 'int1');
      global.IntervalRegistry.setInterval(jest.fn(), 2000, 'int2');
      global.IntervalRegistry.setTimeout(jest.fn(), 500, 'to1');

      expect(global.IntervalRegistry.intervals.length).toBe(2);
      expect(global.IntervalRegistry.timeouts.length).toBe(1);

      global.IntervalRegistry.clearAll();

      expect(global.IntervalRegistry.intervals.length).toBe(0);
      expect(global.IntervalRegistry.timeouts.length).toBe(0);
      expect(window.clearInterval).toHaveBeenCalledTimes(2);
      expect(window.clearTimeout).toHaveBeenCalledTimes(1);
    });

    it('should handle clearAll when nothing is registered', () => {
      expect(global.IntervalRegistry.intervals.length).toBe(0);
      expect(global.IntervalRegistry.timeouts.length).toBe(0);

      // Must not throw
      global.IntervalRegistry.clearAll();

      expect(global.IntervalRegistry.intervals.length).toBe(0);
      expect(global.IntervalRegistry.timeouts.length).toBe(0);
    });
  });
});
