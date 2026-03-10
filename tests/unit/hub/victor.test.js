/**
 * Victor Agent Tests - MSDS Compliance Calculator
 *
 * Tests the pure functions: victorCalcCompliance, victorExpiresSoon,
 * victorIsSecondSundayWindow, victorNeedsUpdate, victorGetPortal
 */
const { loadHubFunctions } = require('../../helpers/loadHubScript');

describe('Victor Agent', () => {
  beforeEach(() => {
    loadHubFunctions([
      'victorCalcCompliance',
      'victorExpiresSoon',
      'victorNeedsUpdate',
      'victorIsSecondSundayWindow',
      'VICTOR_SDS_PORTALS',
      'victorGetPortal'
    ], { quiet: true });
  });

  describe('victorCalcCompliance()', () => {
    it('returns "current" for recent SDS (< 4 years old)', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      expect(global.victorCalcCompliance(twoYearsAgo.toISOString().split('T')[0])).toBe('current');
    });

    it('returns "expiring" for SDS between 4 and 5 years old', () => {
      const fourAndHalfYearsAgo = new Date();
      fourAndHalfYearsAgo.setFullYear(fourAndHalfYearsAgo.getFullYear() - 4);
      fourAndHalfYearsAgo.setMonth(fourAndHalfYearsAgo.getMonth() - 6);
      expect(global.victorCalcCompliance(fourAndHalfYearsAgo.toISOString().split('T')[0])).toBe('expiring');
    });

    it('returns "expired" for SDS over 5 years old', () => {
      const sixYearsAgo = new Date();
      sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);
      expect(global.victorCalcCompliance(sixYearsAgo.toISOString().split('T')[0])).toBe('expired');
    });

    it('returns "unknown" for null input', () => {
      expect(global.victorCalcCompliance(null)).toBe('unknown');
    });

    it('returns "unknown" for "unknown" string', () => {
      expect(global.victorCalcCompliance('unknown')).toBe('unknown');
    });

    it('returns "unknown" for invalid date', () => {
      expect(global.victorCalcCompliance('not-a-date')).toBe('unknown');
    });

    it('returns "unknown" for empty string', () => {
      expect(global.victorCalcCompliance('')).toBe('unknown');
    });

    it('returns "current" for brand new SDS issued today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(global.victorCalcCompliance(today)).toBe('current');
    });

    it('returns "expired" for SDS exactly 5 years old', () => {
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      expect(global.victorCalcCompliance(fiveYearsAgo.toISOString().split('T')[0])).toBe('expired');
    });
  });

  describe('victorNeedsUpdate()', () => {
    it('returns true for expired SDS', () => {
      const sixYearsAgo = new Date();
      sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);
      expect(global.victorNeedsUpdate(sixYearsAgo.toISOString().split('T')[0])).toBe(true);
    });

    it('returns true for expiring SDS', () => {
      const fourAndHalfYearsAgo = new Date();
      fourAndHalfYearsAgo.setFullYear(fourAndHalfYearsAgo.getFullYear() - 4);
      fourAndHalfYearsAgo.setMonth(fourAndHalfYearsAgo.getMonth() - 6);
      expect(global.victorNeedsUpdate(fourAndHalfYearsAgo.toISOString().split('T')[0])).toBe(true);
    });

    it('returns false for current SDS', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      expect(global.victorNeedsUpdate(oneYearAgo.toISOString().split('T')[0])).toBe(false);
    });
  });

  describe('victorExpiresSoon()', () => {
    it('returns true when SDS expires within N months', () => {
      // Issue date ~4 years 8 months ago → expires in ~4 months → within 6 months
      const d = new Date();
      d.setFullYear(d.getFullYear() - 4);
      d.setMonth(d.getMonth() - 8);
      expect(global.victorExpiresSoon(d.toISOString().split('T')[0], 6)).toBe(true);
    });

    it('returns false when SDS has years remaining', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      expect(global.victorExpiresSoon(oneYearAgo.toISOString().split('T')[0], 6)).toBe(false);
    });

    it('returns true for already expired SDS', () => {
      const sixYearsAgo = new Date();
      sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);
      expect(global.victorExpiresSoon(sixYearsAgo.toISOString().split('T')[0], 6)).toBe(true);
    });

    it('returns false for null date', () => {
      expect(global.victorExpiresSoon(null, 6)).toBe(false);
    });

    it('returns false for "unknown" date', () => {
      expect(global.victorExpiresSoon('unknown', 6)).toBe(false);
    });

    it('returns false for invalid date', () => {
      expect(global.victorExpiresSoon('xyz', 6)).toBe(false);
    });
  });

  describe('victorIsSecondSundayWindow()', () => {
    it('returns a boolean', () => {
      const result = global.victorIsSecondSundayWindow();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('victorGetPortal()', () => {
    it('returns portal for exact match (Hilti)', () => {
      const result = global.victorGetPortal('Hilti');
      expect(result).not.toBeNull();
      expect(result.url).toContain('hilti');
    });

    it('returns portal for case-insensitive match', () => {
      const result = global.victorGetPortal('RAMSET');
      expect(result).not.toBeNull();
      expect(result.url).toContain('ramset');
    });

    it('returns portal for partial match', () => {
      const result = global.victorGetPortal('Parex Lanko');
      expect(result).not.toBeNull();
    });

    it('returns null for unknown manufacturer', () => {
      expect(global.victorGetPortal('Unknown Manufacturer XYZ')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(global.victorGetPortal(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(global.victorGetPortal('')).toBeNull();
    });

    it('portal objects have url and note fields', () => {
      const result = global.victorGetPortal('Hilti');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('note');
    });
  });
});
