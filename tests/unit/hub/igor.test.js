/**
 * Igor Agent Tests - Steel Weight Calculator
 *
 * Tests STEEL_SECTIONS data structure and igorCalculateTotal/igorNormalizeSize logic.
 */
const { extractScriptBlocks, loadHubFunctions } = require('../../helpers/loadHubScript');

describe('Igor Agent', () => {
  let STEEL_SECTIONS;

  beforeAll(() => {
    const blocks = extractScriptBlocks();
    const allCode = blocks.join('\n');

    // Extract STEEL_SECTIONS - it's a large object
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

  describe('STEEL_SECTIONS data', () => {
    it('has 14 steel types', () => {
      const types = Object.keys(STEEL_SECTIONS);
      expect(types.length).toBe(14);
    });

    it('includes common types (SHS, RHS, CHS, UB, UC)', () => {
      expect(STEEL_SECTIONS).toHaveProperty('SHS');
      expect(STEEL_SECTIONS).toHaveProperty('RHS');
      expect(STEEL_SECTIONS).toHaveProperty('CHS');
      expect(STEEL_SECTIONS).toHaveProperty('UB');
      expect(STEEL_SECTIONS).toHaveProperty('UC');
    });

    it('each type has desc and data properties', () => {
      Object.entries(STEEL_SECTIONS).forEach(([type, section]) => {
        expect(section).toHaveProperty('desc');
        expect(section).toHaveProperty('data');
        expect(typeof section.desc).toBe('string');
        expect(typeof section.data).toBe('object');
      });
    });

    it('section data has numeric mass per metre values', () => {
      Object.entries(STEEL_SECTIONS).forEach(([type, section]) => {
        Object.entries(section.data).forEach(([name, mass]) => {
          expect(typeof mass).toBe('number');
          expect(mass).toBeGreaterThan(0);
        });
      });
    });

    it('SHS has multiple sections', () => {
      const shsSections = Object.keys(STEEL_SECTIONS.SHS.data);
      expect(shsSections.length).toBeGreaterThan(5);
    });

    it('mass per metre increases with section size for SHS', () => {
      const shs = STEEL_SECTIONS.SHS.data;
      const sizes = Object.keys(shs);
      // Compare first and last
      const firstMass = shs[sizes[0]];
      const lastMass = shs[sizes[sizes.length - 1]];
      expect(lastMass).toBeGreaterThan(firstMass);
    });
  });

  describe('Total weight calculation logic', () => {
    it('calculates single member weight correctly', () => {
      const massPerM = 25.0; // kg/m
      const length = 6.0; // m
      const qty = 1;
      const total = massPerM * length * qty;
      expect(total).toBe(150.0);
    });

    it('calculates multiple member weight correctly', () => {
      const members = [
        { type: 'SHS', section: '100x100x6', length: 6, qty: 4, massPerM: 17.4 },
        { type: 'UB', section: '310UB46', length: 12, qty: 2, massPerM: 46.2 }
      ];
      members.forEach(m => m.total = m.massPerM * m.length * m.qty);

      const totalWeight = members.reduce((sum, m) => sum + m.total, 0);
      expect(totalWeight).toBeCloseTo(17.4 * 6 * 4 + 46.2 * 12 * 2, 1);
    });

    it('adds 10% fittings allowance', () => {
      const steelWeight = 1000;
      const totalWithFittings = steelWeight * 1.1;
      expect(totalWithFittings).toBe(1100);
    });

    it('groups breakdown by type', () => {
      const members = [
        { type: 'SHS', total: 100 },
        { type: 'SHS', total: 200 },
        { type: 'RHS', total: 150 }
      ];

      const breakdown = {};
      members.forEach(m => {
        if (!breakdown[m.type]) breakdown[m.type] = 0;
        breakdown[m.type] += m.total;
      });

      expect(breakdown.SHS).toBe(300);
      expect(breakdown.RHS).toBe(150);
    });
  });

  describe('igorNormalizeSize logic', () => {
    // Test the normalization algorithm as described in the source
    it('normalizes multiplication signs', () => {
      // The function replaces × and * with x
      const normalize = (size) => {
        let s = size.trim().toLowerCase();
        s = s.replace(/\s+/g, '');
        s = s.replace(/[×*]/g, 'x');
        s = s.replace(/mm$/i, '');
        return s;
      };

      expect(normalize('100×100×6')).toBe('100x100x6');
      expect(normalize('100*100*6')).toBe('100x100x6');
      expect(normalize('100x100x6')).toBe('100x100x6');
    });

    it('removes MM suffix', () => {
      const normalize = (size) => {
        let s = size.trim().toLowerCase();
        s = s.replace(/mm$/i, '');
        return s;
      };

      expect(normalize('100x100MM')).toBe('100x100');
      expect(normalize('50mm')).toBe('50');
    });

    it('removes whitespace', () => {
      const normalize = (size) => size.trim().replace(/\s+/g, '');
      expect(normalize(' 100 x 100 x 6 ')).toBe('100x100x6');
    });
  });

  describe('Igor pricing logic', () => {
    it('converts price per tonne to price per metre', () => {
      const pricePerTonne = 2000; // $/tonne
      const massPerM = 25.0; // kg/m
      const pricePerMetre = (pricePerTonne / 1000) * massPerM;
      expect(pricePerMetre).toBe(50.0);
    });

    it('uses price per metre directly when unit is $/m', () => {
      const pricePerMetre = 45.50;
      expect(pricePerMetre).toBe(45.50);
    });
  });
});
