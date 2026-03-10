/**
 * Chuck Agent Tests - Chemical Anchor Calculator
 *
 * Tests: formatCureTime, getCureTimeLocal pure functions
 */
const { loadHubFunctions, extractScriptBlocks } = require('../../helpers/loadHubScript');

describe('Chuck Agent', () => {
  beforeAll(() => {
    // Load the CURE_TIME_DATA constant and pure functions
    const blocks = extractScriptBlocks();
    const allCode = blocks.join('\n');

    // Extract and eval CURE_TIME_DATA
    const cureMatch = allCode.match(/const CURE_TIME_DATA\s*=\s*\{/);
    if (cureMatch) {
      const startIdx = cureMatch.index;
      let depth = 0, started = false;
      let endIdx = startIdx;
      for (let i = startIdx; i < allCode.length; i++) {
        if (allCode[i] === '{') { depth++; started = true; }
        if (allCode[i] === '}') depth--;
        if (started && depth === 0) { endIdx = i + 1; break; }
      }
      const src = allCode.substring(startIdx, endIdx).replace('const CURE_TIME_DATA', 'global.CURE_TIME_DATA');
      eval(src);
    }

    loadHubFunctions(['formatCureTime', 'getCureTimeLocal'], { quiet: true });
  });

  describe('formatCureTime()', () => {
    it('formats minutes under 60 as "X min"', () => {
      expect(global.formatCureTime(15)).toBe('15 min');
      expect(global.formatCureTime(45)).toBe('45 min');
    });

    it('formats exact hours', () => {
      expect(global.formatCureTime(60)).toBe('1h');
      expect(global.formatCureTime(120)).toBe('2h');
    });

    it('formats fractional hours', () => {
      expect(global.formatCureTime(90)).toBe('1.5h');
      expect(global.formatCureTime(150)).toBe('2.5h');
    });

    it('formats days for 1440+ minutes', () => {
      expect(global.formatCureTime(1440)).toBe('1.0 days');
      expect(global.formatCureTime(2880)).toBe('2.0 days');
    });

    it('rounds minutes', () => {
      expect(global.formatCureTime(14.7)).toBe('15 min');
    });

    it('handles 0 minutes', () => {
      expect(global.formatCureTime(0)).toBe('0 min');
    });
  });

  describe('getCureTimeLocal()', () => {
    it('returns cure time for HY200R at 20°C', () => {
      const result = global.getCureTimeLocal('HY200R', 20);
      expect(result).toHaveProperty('work');
      expect(result).toHaveProperty('cure');
      expect(result).toHaveProperty('cureMin');
      expect(typeof result.cureMin).toBe('number');
    });

    it('returns cure time for HY170 at 25°C', () => {
      const result = global.getCureTimeLocal('HY170', 25);
      expect(result).toHaveProperty('work');
      expect(result.cureMin).toBeLessThan(120); // HY170 is fast
    });

    it('falls back to HY200R for unknown product', () => {
      const result = global.getCureTimeLocal('NONEXISTENT', 20);
      const hy200r = global.getCureTimeLocal('HY200R', 20);
      expect(result.cureMin).toBe(hy200r.cureMin);
    });

    it('returns default for out-of-range temperature', () => {
      const result = global.getCureTimeLocal('HY200R', -50);
      expect(result.work).toBe('15 min');
      expect(result.cure).toBe('1h');
      expect(result.cureMin).toBe(60);
    });

    it('longer cure time at cold temperatures', () => {
      const cold = global.getCureTimeLocal('HY200R', 5);
      const warm = global.getCureTimeLocal('HY200R', 25);
      expect(cold.cureMin).toBeGreaterThan(warm.cureMin);
    });

    it('shorter cure time at hot temperatures', () => {
      const hot = global.getCureTimeLocal('HY200R', 35);
      const room = global.getCureTimeLocal('HY200R', 20);
      expect(hot.cureMin).toBeLessThanOrEqual(room.cureMin);
    });
  });

  describe('CURE_TIME_DATA structure', () => {
    it('has HY200R product', () => {
      expect(global.CURE_TIME_DATA).toHaveProperty('HY200R');
    });

    it('has HY170 product', () => {
      expect(global.CURE_TIME_DATA).toHaveProperty('HY170');
    });

    it('each entry has min, max, work, cure fields', () => {
      const entries = global.CURE_TIME_DATA['HY200R'];
      entries.forEach(entry => {
        expect(entry).toHaveProperty('min');
        expect(entry).toHaveProperty('max');
        expect(entry).toHaveProperty('work');
        expect(entry).toHaveProperty('cure');
        expect(typeof entry.min).toBe('number');
        expect(typeof entry.max).toBe('number');
      });
    });

    it('temperature ranges cover -5 to 40°C', () => {
      const entries = global.CURE_TIME_DATA['HY200R'];
      const mins = entries.map(e => e.min);
      const maxes = entries.map(e => e.max);
      expect(Math.min(...mins)).toBeLessThanOrEqual(-5);
      expect(Math.max(...maxes)).toBeGreaterThanOrEqual(40);
    });
  });
});
