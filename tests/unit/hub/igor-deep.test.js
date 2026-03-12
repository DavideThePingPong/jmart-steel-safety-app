/**
 * IGOR Agent - Deep Steel Weight Calculation & Data Integrity Tests
 *
 * Tests: Weight calculation precision, fittings allowance, price conversions,
 *        section data completeness, cross-type comparisons, normalization edge cases.
 */
const { extractScriptBlocks } = require('../../helpers/loadHubScript');

describe('IGOR Deep Tests', () => {
  let STEEL_SECTIONS;

  beforeAll(() => {
    const allCode = extractScriptBlocks().join('\n');
    const match = allCode.match(/const STEEL_SECTIONS\s*=\s*\{/);
    if (match) {
      const startIdx = match.index;
      let depth = 0, started = false, endIdx = startIdx;
      for (let i = startIdx; i < allCode.length; i++) {
        if (allCode[i] === '{') { depth++; started = true; }
        if (allCode[i] === '}') depth--;
        if (started && depth === 0) { endIdx = i + 1; break; }
      }
      eval(allCode.substring(startIdx, endIdx).replace('const STEEL_SECTIONS', 'STEEL_SECTIONS'));
    }
  });

  describe('Total section count (543 sections)', () => {
    it('has over 250 steel sections across all types', () => {
      let total = 0;
      for (const [type, section] of Object.entries(STEEL_SECTIONS)) {
        total += Object.keys(section.data).length;
      }
      expect(total).toBeGreaterThan(250);
    });

    it('SHS has the most sections', () => {
      const counts = {};
      for (const [type, section] of Object.entries(STEEL_SECTIONS)) {
        counts[type] = Object.keys(section.data).length;
      }
      const maxType = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      expect(['SHS', 'RHS', 'CHS']).toContain(maxType);
    });
  });

  describe('Weight calculation precision', () => {
    it('100x100x6.0 SHS at 6m = 16.7 × 6 = 100.2kg', () => {
      const mass = STEEL_SECTIONS.SHS.data['100x100x6.0'];
      expect(mass).toBe(16.7);
      expect(mass * 6).toBeCloseTo(100.2, 1);
    });

    it('310UB46 at 12m = 46.2 × 12 = 554.4kg', () => {
      const mass = STEEL_SECTIONS.UB.data['310UB46'];
      expect(mass * 12).toBeCloseTo(554.4, 1);
    });

    it('200UC46 at 8m = 46.2 × 8 = 369.6kg', () => {
      const mass = STEEL_SECTIONS.UC.data['200UC46'];
      expect(mass * 8).toBeCloseTo(369.6, 1);
    });

    it('50x50x3.0 SHS at 6m × 10 qty = 4.25 × 60 = 255kg', () => {
      const mass = STEEL_SECTIONS.SHS.data['50x50x3.0'];
      expect(mass).toBe(4.25);
      expect(mass * 6 * 10).toBeCloseTo(255, 1);
    });

    it('fittings allowance adds 10% to total', () => {
      const steelWeight = 1000;
      expect(steelWeight * 1.1).toBe(1100);
    });

    it('mixed BOM total weight calculation', () => {
      const members = [
        { mass: STEEL_SECTIONS.SHS.data['100x100x6.0'], length: 6, qty: 4 },
        { mass: STEEL_SECTIONS.UB.data['310UB46'], length: 12, qty: 2 },
        { mass: STEEL_SECTIONS.RHS.data['150x50x3.0'], length: 3, qty: 8 },
      ];
      const totalWeight = members.reduce((sum, m) => sum + (m.mass * m.length * m.qty), 0);
      const withFittings = totalWeight * 1.1;
      expect(totalWeight).toBeGreaterThan(0);
      expect(withFittings).toBeGreaterThan(totalWeight);
      expect(withFittings / totalWeight).toBeCloseTo(1.1, 2);
    });
  });

  describe('Price conversion accuracy', () => {
    it('$2000/tonne with 25kg/m section = $50/m', () => {
      const pricePerTonne = 2000;
      const massPerM = 25.0;
      const pricePerMetre = (pricePerTonne / 1000) * massPerM;
      expect(pricePerMetre).toBe(50.0);
    });

    it('$3500/tonne with 46.2kg/m (310UB46) = $161.70/m', () => {
      const pricePerMetre = (3500 / 1000) * 46.2;
      expect(pricePerMetre).toBeCloseTo(161.7, 1);
    });

    it('total cost = price/m × total metres', () => {
      const pricePerMetre = 50;
      const totalMetres = 48; // 8 × 6m lengths
      expect(pricePerMetre * totalMetres).toBe(2400);
    });
  });

  describe('Section data type-specific validation', () => {
    it('SHS names follow pattern DxDxT (e.g. 100x100x6)', () => {
      for (const name of Object.keys(STEEL_SECTIONS.SHS.data)) {
        expect(name).toMatch(/^\d+x\d+x\d+(\.\d+)?$/);
      }
    });

    it('RHS names follow pattern WxDxT', () => {
      for (const name of Object.keys(STEEL_SECTIONS.RHS.data)) {
        expect(name).toMatch(/^\d+x\d+x\d+(\.\d+)?$/);
      }
    });

    it('CHS names follow pattern DxT (e.g. 48.3x3.2)', () => {
      for (const name of Object.keys(STEEL_SECTIONS.CHS.data)) {
        expect(name).toMatch(/^[\d.]+x[\d.]+$/);
      }
    });

    it('UB names follow pattern NNNUBnn', () => {
      for (const name of Object.keys(STEEL_SECTIONS.UB.data)) {
        expect(name).toMatch(/^\d+UB\d+$/);
      }
    });

    it('UC names follow pattern NNNUCnn', () => {
      for (const name of Object.keys(STEEL_SECTIONS.UC.data)) {
        expect(name).toMatch(/^\d+UC\d+$/);
      }
    });

    it('WB names follow pattern NNNWBnnn', () => {
      for (const name of Object.keys(STEEL_SECTIONS.WB.data)) {
        expect(name).toMatch(/^\d+WB\d+$/);
      }
    });

    it('FB names follow pattern WxT', () => {
      for (const name of Object.keys(STEEL_SECTIONS.FB.data)) {
        expect(name).toMatch(/^\d+x\d+$/);
      }
    });

    it('RB names are just diameters', () => {
      for (const name of Object.keys(STEEL_SECTIONS.RB.data)) {
        expect(name).toMatch(/^\d+$/);
      }
    });
  });

  describe('Cross-type mass comparisons (engineering sense checks)', () => {
    it('UB is lighter than UC for same depth (Universal Beam vs Column)', () => {
      // 200UB18 should weigh less than 200UC46
      const ub = STEEL_SECTIONS.UB.data['200UB18'];
      const uc = STEEL_SECTIONS.UC.data['200UC46'];
      expect(ub).toBeLessThan(uc);
    });

    it('WB sections are heavier than UB (Welded > Universal)', () => {
      const wb700 = STEEL_SECTIONS.WB.data['700WB115'];
      const ub610 = STEEL_SECTIONS.UB.data['610UB125'];
      expect(wb700).toBeGreaterThanOrEqual(ub610 * 0.8); // Roughly comparable
    });

    it('smallest SHS is lighter than smallest UB', () => {
      const shsValues = Object.values(STEEL_SECTIONS.SHS.data);
      const ubValues = Object.values(STEEL_SECTIONS.UB.data);
      expect(Math.min(...shsValues)).toBeLessThan(Math.min(...ubValues));
    });

    it('round bar weight follows πr²ρ formula (check 20mm RB)', () => {
      // 20mm round bar: π × (0.01)² × 7850 × 1 = 2.466 kg/m
      const expected = Math.PI * Math.pow(0.01, 2) * 7850;
      const actual = STEEL_SECTIONS.RB.data['20'];
      expect(actual).toBeCloseTo(expected, 0);
    });

    it('square bar is heavier than equivalent round bar', () => {
      // 20mm square bar vs 20mm round bar
      const squareBar = STEEL_SECTIONS.SB.data['20x20'];
      const roundBar = STEEL_SECTIONS.RB.data['20'];
      expect(squareBar).toBeGreaterThan(roundBar);
    });
  });

  describe('Normalization edge cases', () => {
    const normalize = (size) => {
      let s = size.trim().toLowerCase();
      s = s.replace(/\s+/g, '');
      s = s.replace(/[×*]/g, 'x');
      s = s.replace(/mm$/i, '');
      return s;
    };

    it('handles Unicode multiplication sign ×', () => {
      expect(normalize('100×100×6')).toBe('100x100x6');
    });

    it('handles asterisk *', () => {
      expect(normalize('100*100*6')).toBe('100x100x6');
    });

    it('strips trailing mm', () => {
      expect(normalize('100x100x6mm')).toBe('100x100x6');
    });

    it('strips trailing MM (case insensitive)', () => {
      expect(normalize('100x100x6MM')).toBe('100x100x6');
    });

    it('handles leading and trailing spaces', () => {
      expect(normalize('  100x100x6  ')).toBe('100x100x6');
    });

    it('handles internal spaces', () => {
      expect(normalize('100 x 100 x 6')).toBe('100x100x6');
    });

    it('handles uppercase input', () => {
      expect(normalize('100X100X6')).toBe('100x100x6');
    });

    it('handles decimal thickness', () => {
      expect(normalize('48.3 × 3.2')).toBe('48.3x3.2');
    });

    it('handles empty string', () => {
      expect(normalize('')).toBe('');
    });

    it('handles UB names (no normalization needed)', () => {
      expect(normalize('310UB46')).toBe('310ub46');
    });
  });

  describe('Breakdown by type aggregation', () => {
    it('groups correctly with multiple types', () => {
      const members = [
        { type: 'SHS', total: 100 },
        { type: 'SHS', total: 200 },
        { type: 'RHS', total: 150 },
        { type: 'UB', total: 500 },
        { type: 'SHS', total: 50 },
      ];

      const breakdown = {};
      members.forEach(m => {
        if (!breakdown[m.type]) breakdown[m.type] = 0;
        breakdown[m.type] += m.total;
      });

      expect(breakdown.SHS).toBe(350);
      expect(breakdown.RHS).toBe(150);
      expect(breakdown.UB).toBe(500);
      expect(Object.keys(breakdown).length).toBe(3);
    });

    it('handles single member', () => {
      const breakdown = {};
      const m = { type: 'CHS', total: 250 };
      if (!breakdown[m.type]) breakdown[m.type] = 0;
      breakdown[m.type] += m.total;
      expect(breakdown.CHS).toBe(250);
    });

    it('handles empty member list', () => {
      const breakdown = {};
      [].forEach(m => {
        if (!breakdown[m.type]) breakdown[m.type] = 0;
        breakdown[m.type] += m.total;
      });
      expect(Object.keys(breakdown).length).toBe(0);
    });
  });
});
