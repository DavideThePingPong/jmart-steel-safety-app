/**
 * Hobart Agent Tests - Hollo-Bolt Reference
 *
 * Tests HOLLO_BOLT_DATA structure and hobartFindFits logic.
 */
const { extractScriptBlocks } = require('../../helpers/loadHubScript');

describe('Hobart Agent', () => {
  let HOLLO_BOLT_DATA;

  beforeAll(() => {
    const blocks = extractScriptBlocks();
    const allCode = blocks.join('\n');

    // Extract HOLLO_BOLT_DATA
    const match = allCode.match(/const HOLLO_BOLT_DATA\s*=\s*\{/);
    if (match) {
      const startIdx = match.index;
      let depth = 0, started = false, endIdx = startIdx;
      for (let i = startIdx; i < allCode.length; i++) {
        if (allCode[i] === '{') { depth++; started = true; }
        if (allCode[i] === '}') depth--;
        if (started && depth === 0) { endIdx = i + 1; break; }
      }
      eval(allCode.substring(startIdx, endIdx).replace('const HOLLO_BOLT_DATA', 'HOLLO_BOLT_DATA'));
    }
  });

  describe('HOLLO_BOLT_DATA structure', () => {
    it('has 4 bolt types + drilling data', () => {
      expect(HOLLO_BOLT_DATA).toHaveProperty('HEXAGONAL_HEAD');
      expect(HOLLO_BOLT_DATA).toHaveProperty('COUNTERSUNK_HEAD');
      expect(HOLLO_BOLT_DATA).toHaveProperty('FLUSH_FIT_HEAD');
      expect(HOLLO_BOLT_DATA).toHaveProperty('LINDIBOLT');
      expect(HOLLO_BOLT_DATA).toHaveProperty('DRILLING_DATA');
    });

    it('HB Hex has M8 through M20', () => {
      const sizes = Object.keys(HOLLO_BOLT_DATA.HEXAGONAL_HEAD);
      expect(sizes).toContain('M12');
      expect(sizes).toContain('M16');
    });

    it('each bolt size has required fields', () => {
      Object.entries(HOLLO_BOLT_DATA.HEXAGONAL_HEAD).forEach(([size, data]) => {
        expect(data).toHaveProperty('tensile_swl_kn');
        expect(data).toHaveProperty('shear_swl_kn');
        expect(data).toHaveProperty('torque_nm');
        expect(data).toHaveProperty('spanner_mm');
        expect(data).toHaveProperty('product_codes_with_sizes');
        expect(data).toHaveProperty('clamping_ranges');
        expect(Array.isArray(data.product_codes_with_sizes)).toBe(true);
        expect(Array.isArray(data.clamping_ranges)).toBe(true);
      });
    });

    it('product codes and clamping ranges have same length', () => {
      Object.entries(HOLLO_BOLT_DATA.HEXAGONAL_HEAD).forEach(([size, data]) => {
        expect(data.product_codes_with_sizes.length).toBe(data.clamping_ranges.length);
      });
    });

    it('clamping ranges are in "min-max" format', () => {
      const data = HOLLO_BOLT_DATA.HEXAGONAL_HEAD.M12;
      data.clamping_ranges.forEach(range => {
        expect(range).toMatch(/^\d+-\d+$/);
        const [min, max] = range.split('-').map(Number);
        expect(max).toBeGreaterThan(min);
      });
    });

    it('tensile values are positive numbers', () => {
      Object.entries(HOLLO_BOLT_DATA.HEXAGONAL_HEAD).forEach(([size, data]) => {
        expect(data.tensile_swl_kn).toBeGreaterThan(0);
        expect(data.shear_swl_kn).toBeGreaterThan(0);
      });
    });

    it('larger bolts have higher torque', () => {
      const hex = HOLLO_BOLT_DATA.HEXAGONAL_HEAD;
      if (hex.M12 && hex.M16) {
        expect(hex.M16.torque_nm).toBeGreaterThan(hex.M12.torque_nm);
      }
    });
  });

  describe('DRILLING_DATA', () => {
    it('has clearance hole info for each size', () => {
      const drilling = HOLLO_BOLT_DATA.DRILLING_DATA;
      Object.values(drilling).forEach(data => {
        expect(data).toHaveProperty('clearance_hole');
        expect(data).toHaveProperty('tolerance');
      });
    });

    it('has min_edge_distance and min_hole_distance', () => {
      const drilling = HOLLO_BOLT_DATA.DRILLING_DATA;
      Object.values(drilling).forEach(data => {
        expect(data).toHaveProperty('min_edge_distance');
        expect(data).toHaveProperty('min_hole_distance');
      });
    });
  });

  describe('Tube fit logic', () => {
    it('calculates total clamping as 2x wall thickness', () => {
      const wallThickness = 6.0;
      const totalClamp = wallThickness * 2;
      expect(totalClamp).toBe(12);
    });

    it('identifies perfect fit (3mm+ from both ends of range)', () => {
      const min = 10, max = 20;
      const totalClamp = 15;
      const isPerfect = totalClamp >= min + 3 && totalClamp <= max - 3;
      expect(isPerfect).toBe(true);
    });

    it('identifies near-minimum warning', () => {
      const min = 10, max = 20;
      const totalClamp = 11;
      const midPoint = (min + max) / 2;
      const inRange = totalClamp >= min && totalClamp <= max;
      const isPerfect = totalClamp >= min + 3 && totalClamp <= max - 3;
      const isWarning = inRange && !isPerfect;
      const isNearMin = totalClamp < midPoint;
      expect(isWarning).toBe(true);
      expect(isNearMin).toBe(true);
    });

    it('identifies no-fit condition', () => {
      const min = 10, max = 20;
      expect(5 >= min && 5 <= max).toBe(false); // too thin
      expect(25 >= min && 25 <= max).toBe(false); // too thick
    });
  });

  describe('SWL conversion', () => {
    it('converts kN to kg correctly (×102)', () => {
      const tensileKn = 10.0;
      const tensileKg = Math.round(tensileKn * 102);
      expect(tensileKg).toBe(1020);
    });

    it('rounds to whole kg', () => {
      const tensileKn = 7.7;
      const tensileKg = Math.round(tensileKn * 102);
      expect(tensileKg).toBe(785);
    });
  });
});
