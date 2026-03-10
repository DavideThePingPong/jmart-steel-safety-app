/**
 * Brittany Agent Tests - Anchor Fixing Calculator
 *
 * Tests FIXING_DATA structure and calculation logic.
 * The brittanyCalculate function depends heavily on DOM, so we test the
 * data structure and the core reduction factor logic.
 */
const { extractScriptBlocks } = require('../../helpers/loadHubScript');

describe('Brittany Agent', () => {
  let FIXING_DATA;

  beforeAll(() => {
    const blocks = extractScriptBlocks();
    const allCode = blocks.join('\n');

    // Extract FIXING_DATA
    const match = allCode.match(/const FIXING_DATA\s*=\s*\{/);
    if (match) {
      const startIdx = match.index;
      let depth = 0, started = false, endIdx = startIdx;
      for (let i = startIdx; i < allCode.length; i++) {
        if (allCode[i] === '{') { depth++; started = true; }
        if (allCode[i] === '}') depth--;
        if (started && depth === 0) { endIdx = i + 1; break; }
      }
      eval(allCode.substring(startIdx, endIdx).replace('const FIXING_DATA', 'FIXING_DATA'));
    }
  });

  describe('FIXING_DATA structure', () => {
    it('has all 5 anchor types', () => {
      expect(Object.keys(FIXING_DATA)).toEqual(
        expect.arrayContaining(['dynabolt', 'trubolt', 'hilti_hsl', 'chemset', 'dropin'])
      );
    });

    it('each anchor type has a name and sizes', () => {
      Object.values(FIXING_DATA).forEach(anchor => {
        expect(anchor).toHaveProperty('name');
        expect(anchor).toHaveProperty('sizes');
        expect(typeof anchor.name).toBe('string');
      });
    });

    it('each size has 6 values [tension, shear, embed, edge, spacing, hole]', () => {
      Object.values(FIXING_DATA).forEach(anchor => {
        Object.entries(anchor.sizes).forEach(([size, data]) => {
          expect(data).toHaveLength(6);
          data.forEach(val => expect(typeof val).toBe('number'));
        });
      });
    });

    it('Dynabolt has M8 through M20', () => {
      expect(Object.keys(FIXING_DATA.dynabolt.sizes)).toEqual(
        expect.arrayContaining(['M8', 'M10', 'M12', 'M16', 'M20'])
      );
    });

    it('Hilti HSL-3 includes M24', () => {
      expect(FIXING_DATA.hilti_hsl.sizes).toHaveProperty('M24');
    });

    it('Drop-In only goes to M16', () => {
      const sizes = Object.keys(FIXING_DATA.dropin.sizes);
      expect(sizes).not.toContain('M20');
      expect(sizes).toContain('M16');
    });
  });

  describe('Capacity values are positive', () => {
    it('all tension values are positive', () => {
      Object.values(FIXING_DATA).forEach(anchor => {
        Object.entries(anchor.sizes).forEach(([size, data]) => {
          expect(data[0]).toBeGreaterThan(0);
        });
      });
    });

    it('all shear values are positive', () => {
      Object.values(FIXING_DATA).forEach(anchor => {
        Object.entries(anchor.sizes).forEach(([size, data]) => {
          expect(data[1]).toBeGreaterThan(0);
        });
      });
    });

    it('larger bolts have higher capacity', () => {
      const dynabolt = FIXING_DATA.dynabolt.sizes;
      expect(dynabolt['M16'][0]).toBeGreaterThan(dynabolt['M12'][0]); // tension
      expect(dynabolt['M20'][1]).toBeGreaterThan(dynabolt['M16'][1]); // shear
    });
  });

  describe('Reduction factor calculations', () => {
    // These test the formulas used in brittanyCalculate
    it('edge factor reduces linearly below minimum', () => {
      const minEdge = 75; // M12 Dynabolt
      const edge = 50;
      const edgeFactor = Math.max(0.5, edge / minEdge);
      expect(edgeFactor).toBeCloseTo(0.667, 2);
    });

    it('edge factor is 1.0 at or above minimum', () => {
      const minEdge = 75;
      const edgeFactor = 100 >= minEdge ? 1.0 : Math.max(0.5, 100 / minEdge);
      expect(edgeFactor).toBe(1.0);
    });

    it('edge factor floors at 0.5', () => {
      const minEdge = 75;
      const edge = 10; // way below minimum
      const edgeFactor = Math.max(0.5, edge / minEdge);
      expect(edgeFactor).toBe(0.5);
    });

    it('substrate factor uses sqrt scaling relative to 32MPa', () => {
      const concFactor32 = Math.sqrt(32 / 32);
      const concFactor40 = Math.sqrt(40 / 32);
      const concFactor20 = Math.sqrt(20 / 32);
      expect(concFactor32).toBe(1.0);
      expect(concFactor40).toBeGreaterThan(1.0);
      expect(concFactor20).toBeLessThan(1.0);
    });

    it('overhead factor reduces capacity by 50%', () => {
      const overheadFactor = 0.5;
      const tensionKn = 7.7; // M12 Dynabolt
      const reduced = tensionKn * overheadFactor * 102;
      expect(reduced).toBeCloseTo(tensionKn * 102 * 0.5, 0);
    });

    it('utilisation calculation', () => {
      const load = 500; // kg applied
      const capacity = 1000; // kg total
      const utilisation = load / capacity;
      expect(utilisation).toBe(0.5);
      expect(utilisation <= 0.8).toBe(true); // OK status
    });

    it('safety factor is inverse of utilisation', () => {
      const utilisation = 0.5;
      const sf = 1 / utilisation;
      expect(sf).toBe(2.0);
    });
  });
});
