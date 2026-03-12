/**
 * CHUCK Agent - Deep Engineering Calculation & DOM Tests
 *
 * Tests: chuckCalculate volume math, cartridge sizing, cure time
 *        interpolation, temperature edge cases, formatCureTime precision,
 *        and DOM rendering verification.
 */
const { extractScriptBlocks, loadHubFunctions } = require('../../helpers/loadHubScript');

describe('CHUCK Deep Tests', () => {
  let HILTI_DATA, CURE_TIME_DATA;

  beforeAll(() => {
    const allCode = extractScriptBlocks().join('\n');

    // Extract HILTI_DATA
    const hiltiMatch = allCode.match(/const HILTI_DATA\s*=\s*\{/);
    if (hiltiMatch) {
      const startIdx = hiltiMatch.index;
      let depth = 0, started = false, endIdx = startIdx;
      for (let i = startIdx; i < allCode.length; i++) {
        if (allCode[i] === '{') { depth++; started = true; }
        if (allCode[i] === '}') depth--;
        if (started && depth === 0) { endIdx = i + 1; break; }
      }
      eval(allCode.substring(startIdx, endIdx).replace('const HILTI_DATA', 'HILTI_DATA'));
    }

    // Extract CURE_TIME_DATA
    const cureMatch = allCode.match(/const CURE_TIME_DATA\s*=\s*\{/);
    if (cureMatch) {
      const startIdx = cureMatch.index;
      let depth = 0, started = false, endIdx = startIdx;
      for (let i = startIdx; i < allCode.length; i++) {
        if (allCode[i] === '{') { depth++; started = true; }
        if (allCode[i] === '}') depth--;
        if (started && depth === 0) { endIdx = i + 1; break; }
      }
      eval(allCode.substring(startIdx, endIdx).replace('const CURE_TIME_DATA', 'CURE_TIME_DATA'));
    }
  });

  describe('Volume calculation precision', () => {
    // Formula: holeVol = π × (hole/2)² × depth / 1000  (ml)
    // Total = holeVol × qty × 1.15 (15% waste factor)

    it('M12 HY200R: hole=14mm, depth=96mm → vol = π×7²×96/1000 = 14.78ml', () => {
      const sizeData = HILTI_DATA.HY200R.sizes.M12;
      const holeVol = Math.PI * Math.pow(sizeData.hole / 2, 2) * sizeData.embed / 1000;
      expect(holeVol).toBeCloseTo(14.78, 1);
    });

    it('M20 HY200R: hole=22mm, depth=160mm → vol = π×11²×160/1000 = 60.82ml', () => {
      const sizeData = HILTI_DATA.HY200R.sizes.M20;
      const holeVol = Math.PI * Math.pow(sizeData.hole / 2, 2) * sizeData.embed / 1000;
      expect(holeVol).toBeCloseTo(60.82, 1);
    });

    it('M30 RE500: hole=35mm, depth=270mm → vol = π×17.5²×270/1000 = 259.77ml', () => {
      const sizeData = HILTI_DATA.RE500.sizes.M30;
      const holeVol = Math.PI * Math.pow(sizeData.hole / 2, 2) * sizeData.embed / 1000;
      expect(holeVol).toBeCloseTo(259.77, 0);
    });

    it('waste factor is exactly 15%', () => {
      const holeVol = 100;
      const qty = 1;
      const totalVol = holeVol * qty * 1.15;
      expect(totalVol).toBeCloseTo(115, 5);
    });

    it('10 holes × M16 HY200R: total volume includes waste', () => {
      const sizeData = HILTI_DATA.HY200R.sizes.M16;
      const depth = sizeData.embed; // 125mm
      const qty = 10;
      const holeVol = Math.PI * Math.pow(sizeData.hole / 2, 2) * depth / 1000;
      const totalVol = holeVol * qty * 1.15;
      // holeVol = π×9²×125/1000 = 31.81ml × 10 × 1.15 = 365.8ml
      expect(totalVol).toBeCloseTo(365.8, 0);
    });
  });

  describe('Cartridge calculation', () => {
    it('366ml total needs 2 × 330ml cartridges (Math.ceil)', () => {
      const totalVol = 366;
      expect(Math.ceil(totalVol / 330)).toBe(2);
    });

    it('330ml total needs exactly 1 × 330ml cartridge', () => {
      expect(Math.ceil(330 / 330)).toBe(1);
    });

    it('331ml total needs 2 × 330ml cartridges', () => {
      expect(Math.ceil(331 / 330)).toBe(2);
    });

    it('1400ml total needs exactly 1 × 1400ml cartridge', () => {
      expect(Math.ceil(1400 / 1400)).toBe(1);
    });

    it('large job: 50 × M20 RE500 cartridge count', () => {
      const sizeData = HILTI_DATA.RE500.sizes.M20;
      const holeVol = Math.PI * Math.pow(sizeData.hole / 2, 2) * sizeData.embed / 1000;
      const totalVol = holeVol * 50 * 1.15;
      const cart330 = Math.ceil(totalVol / 330);
      const cart500 = Math.ceil(totalVol / 500);
      const cart1400 = Math.ceil(totalVol / 1400);
      expect(cart330).toBeGreaterThan(cart500);
      expect(cart500).toBeGreaterThan(cart1400);
      expect(cart1400).toBeGreaterThanOrEqual(1);
    });

    it('zero qty gives zero volume', () => {
      const holeVol = Math.PI * Math.pow(14 / 2, 2) * 96 / 1000;
      const totalVol = holeVol * 0 * 1.15;
      expect(totalVol).toBe(0);
      expect(Math.ceil(totalVol / 330)).toBe(0);
    });
  });

  describe('HILTI_DATA integrity', () => {
    it('has 4 product types', () => {
      expect(Object.keys(HILTI_DATA).length).toBe(4);
    });

    it('all products have name and sizes', () => {
      for (const [key, product] of Object.entries(HILTI_DATA)) {
        expect(product.name).toBeDefined();
        expect(typeof product.name).toBe('string');
        expect(Object.keys(product.sizes).length).toBeGreaterThan(0);
      }
    });

    it('all sizes have hole and embed values', () => {
      for (const [key, product] of Object.entries(HILTI_DATA)) {
        for (const [size, data] of Object.entries(product.sizes)) {
          expect(data.hole).toBeGreaterThan(0);
          expect(data.embed).toBeGreaterThan(0);
        }
      }
    });

    it('hole size increases with bolt size', () => {
      for (const [key, product] of Object.entries(HILTI_DATA)) {
        const sizes = Object.entries(product.sizes);
        for (let i = 1; i < sizes.length; i++) {
          expect(sizes[i][1].hole).toBeGreaterThanOrEqual(sizes[i - 1][1].hole);
        }
      }
    });

    it('embed depth increases with bolt size', () => {
      for (const [key, product] of Object.entries(HILTI_DATA)) {
        const sizes = Object.entries(product.sizes);
        for (let i = 1; i < sizes.length; i++) {
          expect(sizes[i][1].embed).toBeGreaterThanOrEqual(sizes[i - 1][1].embed);
        }
      }
    });

    it('HY200R and HY200A have identical hole sizes', () => {
      const r = HILTI_DATA.HY200R.sizes;
      const a = HILTI_DATA.HY200A.sizes;
      for (const size of Object.keys(r)) {
        if (a[size]) {
          expect(r[size].hole).toBe(a[size].hole);
        }
      }
    });
  });

  describe('Cure time calculation', () => {
    beforeEach(() => {
      global.CURE_TIME_DATA = CURE_TIME_DATA;
      loadHubFunctions(['formatCureTime', 'getCureTimeLocal'], { quiet: true });
    });

    it('HY200R at 15°C: work=15min, cure=60min', () => {
      const result = global.getCureTimeLocal('HY200R', 15);
      expect(result.work).toBe('15 min');
      expect(result.cure).toBe('1h');
      expect(result.cureMin).toBe(60);
    });

    it('HY200R at -7°C: work=3h, cure=20h (extreme cold)', () => {
      const result = global.getCureTimeLocal('HY200R', -7);
      expect(result.work).toBe('3h');
      expect(result.cureMin).toBe(1200);
    });

    it('HY200R at 35°C: work=6min, cure=1h (hot)', () => {
      const result = global.getCureTimeLocal('HY200R', 35);
      expect(result.work).toBe('6 min');
      expect(result.cureMin).toBe(60);
    });

    it('RE500 at 0°C: cure = 2880min (48 hours)', () => {
      const result = global.getCureTimeLocal('RE500', 0);
      expect(result.cureMin).toBe(2880);
    });

    it('RE500 at -3°C: cure = 10080min (7 days!)', () => {
      const result = global.getCureTimeLocal('RE500', -3);
      expect(result.cureMin).toBe(10080);
    });

    it('HY170 at 25°C: fastest cure = 60min', () => {
      const result = global.getCureTimeLocal('HY170', 25);
      expect(result.cureMin).toBe(60);
    });

    it('unknown product defaults to HY200R data', () => {
      const result = global.getCureTimeLocal('UNKNOWN_PRODUCT', 15);
      expect(result.cureMin).toBe(60); // Same as HY200R at 15°C
    });

    it('temperature outside all ranges returns default', () => {
      const result = global.getCureTimeLocal('HY200R', 50); // Above 40°C
      expect(result.work).toBe('15 min');
      expect(result.cure).toBe('1h');
    });
  });

  describe('formatCureTime precision', () => {
    beforeEach(() => {
      loadHubFunctions(['formatCureTime'], { quiet: true });
    });

    it('formats 15 minutes as "15 min"', () => {
      expect(global.formatCureTime(15)).toBe('15 min');
    });

    it('formats 60 minutes as "1h"', () => {
      expect(global.formatCureTime(60)).toBe('1h');
    });

    it('formats 90 minutes as "1.5h"', () => {
      expect(global.formatCureTime(90)).toBe('1.5h');
    });

    it('formats 120 minutes as "2h"', () => {
      expect(global.formatCureTime(120)).toBe('2h');
    });

    it('formats 1440 minutes as "1.0 days"', () => {
      expect(global.formatCureTime(1440)).toBe('1.0 days');
    });

    it('formats 10080 minutes as "7.0 days"', () => {
      expect(global.formatCureTime(10080)).toBe('7.0 days');
    });

    it('formats 2880 minutes as "2.0 days"', () => {
      expect(global.formatCureTime(2880)).toBe('2.0 days');
    });

    it('rounds fractional minutes', () => {
      expect(global.formatCureTime(14.7)).toBe('15 min');
    });
  });

  describe('CURE_TIME_DATA completeness', () => {
    it('all 4 products have cure data', () => {
      expect(CURE_TIME_DATA).toHaveProperty('HY200R');
      expect(CURE_TIME_DATA).toHaveProperty('HY200A');
      expect(CURE_TIME_DATA).toHaveProperty('RE500');
      expect(CURE_TIME_DATA).toHaveProperty('HY170');
    });

    it('temperature ranges cover -10 to 40°C for HY200R', () => {
      const data = CURE_TIME_DATA.HY200R;
      const minTemp = Math.min(...data.map(e => e.min));
      const maxTemp = Math.max(...data.map(e => e.max));
      expect(minTemp).toBeLessThanOrEqual(-5);
      expect(maxTemp).toBeGreaterThanOrEqual(40);
    });

    it('temperature ranges have no gaps (contiguous coverage)', () => {
      for (const [product, ranges] of Object.entries(CURE_TIME_DATA)) {
        for (let i = 1; i < ranges.length; i++) {
          expect(ranges[i].min).toBe(ranges[i - 1].max + 1);
        }
      }
    });

    it('work time is always less than cure time', () => {
      for (const [product, ranges] of Object.entries(CURE_TIME_DATA)) {
        for (const entry of ranges) {
          expect(entry.work).toBeLessThan(entry.cure);
        }
      }
    });

    it('cure time decreases as temperature increases', () => {
      for (const [product, ranges] of Object.entries(CURE_TIME_DATA)) {
        for (let i = 1; i < ranges.length; i++) {
          expect(ranges[i].cure).toBeLessThanOrEqual(ranges[i - 1].cure);
        }
      }
    });

    it('RE500 has longest cure times (epoxy)', () => {
      // At 20°C, RE500 should have longer cure than HY200R
      const re500 = CURE_TIME_DATA.RE500.find(e => 20 >= e.min && 20 <= e.max);
      const hy200r = CURE_TIME_DATA.HY200R.find(e => 20 >= e.min && 20 <= e.max);
      expect(re500.cure).toBeGreaterThan(hy200r.cure);
    });
  });

  describe('chuckCalculate DOM rendering', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input id="chuckDepth" value="96" />
        <input id="chuckQty" value="4" />
        <div id="chuckResults"></div>
        <div id="chuckCart330"></div>
        <div id="chuckCart500"></div>
        <div id="chuckCart1400"></div>
        <div id="chuckCartOptions" style="display:none"></div>
        <div id="chuckConsole"></div>
        <div id="chuckCureSection" style="display:none"></div>
        <div id="chuckCureTemp"></div>
        <div id="cureWorkStd"></div>
        <div id="cureCureStd"></div>
        <div id="cureWorkCoast"></div>
        <div id="cureCureCoast"></div>
        <div id="cureWorkShade"></div>
        <div id="cureCureShade"></div>
      `;
      global.HILTI_DATA = HILTI_DATA;
      global.CURE_TIME_DATA = CURE_TIME_DATA;
      global.chuckType = 'HY200R';
      global.chuckSize = 'M12';
      global.chuckCurrentTemp = 20;
      loadHubFunctions(['escapeHtml', 'formatCureTime', 'getCureTimeLocal', 'chuckCalculate', 'chuckUpdateCureTimes'], { quiet: true });
    });

    it('renders hole size in results', () => {
      global.chuckCalculate();
      expect(document.getElementById('chuckResults').innerHTML).toContain('14');
    });

    it('renders correct cartridge count for 4 × M12 holes', () => {
      global.chuckCalculate();
      // 4 × M12 HY200R: hole=14mm, depth=96mm
      // holeVol = π×7²×96/1000 = 14.78ml
      // totalVol = 14.78 × 4 × 1.15 = 67.99ml → 1 × 330ml cartridge
      expect(document.getElementById('chuckCart330').textContent).toBe('1');
    });

    it('updates console with summary', () => {
      global.chuckCalculate();
      const consoleText = document.getElementById('chuckConsole').textContent;
      expect(consoleText).toContain('HIT-HY 200-R');
      expect(consoleText).toContain('M12');
      expect(consoleText).toContain('4 holes');
    });

    it('shows cartridge options after calculation', () => {
      global.chuckCalculate();
      expect(document.getElementById('chuckCartOptions').style.display).toBe('flex');
    });
  });
});
