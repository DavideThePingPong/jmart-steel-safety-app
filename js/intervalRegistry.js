// Interval Registry
// Extracted from index.html for maintainability
// ========================================
// INTERVAL REGISTRY (Memory Leak Prevention)
// ========================================
// Tracks all setInterval/setTimeout calls for proper cleanup
const IntervalRegistry = {
  intervals: [],
  timeouts: [],

  setInterval: function(fn, ms, label) {
    const id = window.setInterval(fn, ms);
    this.intervals.push({ id, label: label || 'unnamed', ms });
    console.log('Registered interval:', label || 'unnamed', '(' + ms + 'ms)');
    return id;
  },

  setTimeout: function(fn, ms, label) {
    const self = this;
    const id = window.setTimeout(function() {
      fn();
      self.timeouts = self.timeouts.filter(function(t) { return t.id !== id; });
    }, ms);
    this.timeouts.push({ id, label: label || 'unnamed' });
    return id;
  },

  clearInterval: function(id) {
    window.clearInterval(id);
    this.intervals = this.intervals.filter(function(i) { return i.id !== id; });
  },

  clearAll: function() {
    this.intervals.forEach(function(i) { window.clearInterval(i.id); });
    this.timeouts.forEach(function(t) { window.clearTimeout(t.id); });
    console.log('Cleaned up ' + this.intervals.length + ' intervals and ' + this.timeouts.length + ' timeouts');
    this.intervals = [];
    this.timeouts = [];
  }
};

// Clean up all intervals/timeouts on page unload to prevent memory leaks
window.addEventListener('beforeunload', function() { IntervalRegistry.clearAll(); });
