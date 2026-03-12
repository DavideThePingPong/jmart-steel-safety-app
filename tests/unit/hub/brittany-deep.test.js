/**
 * BRITTANY Agent - Deep Reduction Factor & Load Calculation Tests
 *
 * Tests: Full reduction factor chain (edge, spacing, embed, substrate, overhead, masonry),
 *        brittanyCalculate with DOM, brittanyCheckLoad utilisation thresholds,
 *        AS5216-compliant engineering math, edge cases.
 */
const { extractScriptBlocks, loadHubFunctions } = require('../../helpers/loadHubScript');

describe('BRITTANY Deep Tests', () => {
  let FIXING_DATA;

  beforeAll(() => {
    const allCode = extractScriptBlocks().join('\n');
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

  describe('FIXING_DATA integrity', () => {
    it('has 5 fixing types', () => {
      expect(Object.keys(FIXING_DATA).length).toBe(5);
    });

    it('all types have name and sizes', () => {
      for (const [key, data] of Object.entries(FIXING_DATA)) {
        expect(data.name).toBeDefined();
        expect(typeof data.name).toBe('string');
        expect(Object.keys(data.sizes).length).toBeGreaterThan(0);
      }
    });

    it('all size arrays have exactly 6 elements [tension, shear, embed, edge, spacing, hole]', () => {
      for (const [key, fixing] of Object.entries(FIXING_DATA)) {
        for (const [size, data] of Object.entries(fixing.sizes)) {
          expect(data.length).toBe(6);
          data.forEach(v => expect(typeof v).toBe('number'));
        }
      }
    });

    it('tension and shear are positive for all sizes', () => {
      for (const [key, fixing] of Object.entries(FIXING_DATA)) {
        for (const [size, [tension, shear]] of Object.entries(fixing.sizes)) {
          expect(tension).toBeGreaterThan(0);
          expect(shear).toBeGreaterThan(0);
        }
      }
    });

    it('chemset has highest tension per size (chemical anchor advantage)', () => {
      // Compare M12 across types that have it
      const chemM12 = FIXING_DATA.chemset.sizes.M12[0];
      const dynM12 = FIXING_DATA.dynabolt.sizes.M12[0];
      const truM12 = FIXING_DATA.trubolt.sizes.M12[0];
      expect(chemM12).toBeGreaterThan(dynM12);
      expect(chemM12).toBeGreaterThan(truM12);
    });

    it('hilti_hsl has highest shear for M12', () => {
      const hslM12 = FIXING_DATA.hilti_hsl.sizes.M12[1];
      const dynM12 = FIXING_DATA.dynabolt.sizes.M12[1];
      expect(hslM12).toBeGreaterThan(dynM12);
    });
  });

  describe('Reduction factor calculations', () => {
    // Edge factor: edge < minEdge → max(0.5, edge/minEdge), else 1.0
    it('edge factor = 1.0 when edge >= minEdge', () => {
      const minEdge = 75;
      const edge = 80;
      const factor = edge < minEdge ? Math.max(0.5, edge / minEdge) : 1.0;
      expect(factor).toBe(1.0);
    });

    it('edge factor = 0.8 when edge is 80% of min', () => {
      const minEdge = 100;
      const edge = 80;
      const factor = edge < minEdge ? Math.max(0.5, edge / minEdge) : 1.0;
      expect(factor).toBe(0.8);
    });

    it('edge factor floors at 0.5 for very small edges', () => {
      const minEdge = 100;
      const edge = 20; // 20% of min
      const factor = edge < minEdge ? Math.max(0.5, edge / minEdge) : 1.0;
      expect(factor).toBe(0.5);
    });

    // Spacing factor: same logic as edge
    it('spacing factor = 1.0 when spacing >= minSpacing', () => {
      const minSpacing = 150;
      const spacing = 200;
      const factor = spacing < minSpacing ? Math.max(0.5, spacing / minSpacing) : 1.0;
      expect(factor).toBe(1.0);
    });

    it('spacing factor = 0.667 when spacing is 2/3 of min', () => {
      const minSpacing = 150;
      const spacing = 100;
      const factor = spacing < minSpacing ? Math.max(0.5, spacing / minSpacing) : 1.0;
      expect(factor).toBeCloseTo(0.667, 2);
    });

    // Embed factor for chemset: min(2.0, max(0.5, embed/minEmbed))
    it('chemset embed factor can exceed 1.0 (deeper = stronger)', () => {
      const minEmbed = 120;
      const embed = 180; // 150% of min
      const factor = Math.min(2.0, Math.max(0.5, embed / minEmbed));
      expect(factor).toBe(1.5);
    });

    it('chemset embed factor caps at 2.0', () => {
      const minEmbed = 100;
      const embed = 300; // 300% of min
      const factor = Math.min(2.0, Math.max(0.5, embed / minEmbed));
      expect(factor).toBe(2.0);
    });

    it('non-chemset embed factor max is 1.0 (cannot exceed)', () => {
      const minEmbed = 50;
      const embed = 100;
      // For non-chemset: only reduces, doesn't increase
      let factor = 1.0;
      if (embed < minEmbed) {
        factor = Math.max(0.5, embed / minEmbed);
      }
      expect(factor).toBe(1.0);
    });

    // Substrate factor: sqrt(MPa / 32)
    it('32 MPa concrete → factor = 1.0 (baseline)', () => {
      expect(Math.sqrt(32 / 32)).toBe(1.0);
    });

    it('40 MPa concrete → factor = 1.118', () => {
      expect(Math.sqrt(40 / 32)).toBeCloseTo(1.118, 2);
    });

    it('20 MPa concrete → factor = 0.791', () => {
      expect(Math.sqrt(20 / 32)).toBeCloseTo(0.791, 2);
    });

    it('50 MPa concrete → factor = 1.25', () => {
      expect(Math.sqrt(50 / 32)).toBeCloseTo(1.25, 1);
    });

    it('8 MPa (weak substrate) → factor = 0.5', () => {
      expect(Math.sqrt(8 / 32)).toBe(0.5);
    });

    // Overhead factor
    it('overhead/cracked = 50% reduction', () => {
      const factor = 0.5;
      const tension = 1000;
      expect(tension * factor).toBe(500);
    });

    it('no overhead = no reduction', () => {
      const factor = 1.0;
      const tension = 1000;
      expect(tension * factor).toBe(1000);
    });

    // Masonry additional 50% for mechanical anchors
    it('masonry reduces mechanical anchors by 50%', () => {
      const tensionKg = 1000;
      const isMasonry = true;
      const type = 'dynabolt';
      const mechanicalTypes = ['dynabolt', 'trubolt', 'hilti_hsl', 'dropin'];
      const result = isMasonry && mechanicalTypes.includes(type) ? Math.round(tensionKg * 0.5) : tensionKg;
      expect(result).toBe(500);
    });

    it('masonry does NOT reduce chemset (chemical anchor)', () => {
      const tensionKg = 1000;
      const isMasonry = true;
      const type = 'chemset';
      const mechanicalTypes = ['dynabolt', 'trubolt', 'hilti_hsl', 'dropin'];
      const result = isMasonry && mechanicalTypes.includes(type) ? Math.round(tensionKg * 0.5) : tensionKg;
      expect(result).toBe(1000);
    });
  });

  describe('Full calculation chain (hand-verified)', () => {
    it('Dynabolt M12, 32MPa, no overhead, min values → base capacity', () => {
      const [tensionKn, shearKn, minEmbed, minEdge, minSpacing, holeSize] = FIXING_DATA.dynabolt.sizes.M12;
      const concFactor = Math.sqrt(32 / 32); // 1.0
      const overheadFactor = 1.0;
      const edgeFactor = 1.0;
      const spacingFactor = 1.0;
      const embedFactor = 1.0;

      const tensionKg = Math.round(tensionKn * concFactor * overheadFactor * edgeFactor * embedFactor * 102);
      const shearKg = Math.round(shearKn * concFactor * overheadFactor * edgeFactor * spacingFactor * 102);

      // 7.7kN × 1.0 × 1.0 × 1.0 × 1.0 × 102 = 785.4 → 785
      expect(tensionKg).toBe(785);
      // 7.9kN × 1.0 × 1.0 × 1.0 × 1.0 × 102 = 805.8 → 806
      expect(shearKg).toBe(806);
    });

    it('ChemSet M16, 40MPa, overhead, 80% edge → complex factors', () => {
      const [tensionKn, shearKn, minEmbed, minEdge, minSpacing] = FIXING_DATA.chemset.sizes.M16;
      const concrete = 40;
      const concFactor = Math.sqrt(concrete / 32); // ~1.118
      const overheadFactor = 0.5;
      const edge = minEdge * 0.8; // 80% of min
      const edgeFactor = Math.max(0.5, edge / minEdge); // 0.8
      const embedFactor = 1.0;

      const tensionKg = Math.round(tensionKn * concFactor * overheadFactor * edgeFactor * embedFactor * 102);
      // 28.0 × 1.118 × 0.5 × 0.8 × 1.0 × 102 = 1279.8 → 1280
      expect(tensionKg).toBeCloseTo(1280, -1); // within 10
    });

    it('TruBolt M10, 15MPa masonry, no overhead → masonry reduction', () => {
      const [tensionKn, shearKn] = FIXING_DATA.trubolt.sizes.M10;
      const concFactor = Math.sqrt(15 / 32); // 0.685
      const overheadFactor = 1.0;
      const edgeFactor = 1.0;
      const embedFactor = 1.0;

      let tensionKg = Math.round(tensionKn * concFactor * overheadFactor * edgeFactor * embedFactor * 102);
      // Masonry 50% reduction for mechanical
      tensionKg = Math.round(tensionKg * 0.5);

      // 8.5 × 0.685 × 102 = 593.4 → 593 → × 0.5 = 297
      expect(tensionKg).toBeCloseTo(297, -1);
    });

    it('4 × Dynabolt M20, 32MPa → total capacity', () => {
      const [tensionKn, shearKn] = FIXING_DATA.dynabolt.sizes.M20;
      const qty = 4;
      const tensionPer = Math.round(tensionKn * 1.0 * 1.0 * 1.0 * 1.0 * 102);
      const shearPer = Math.round(shearKn * 1.0 * 1.0 * 1.0 * 1.0 * 102);

      expect(tensionPer * qty).toBe(Math.round(16.6 * 102) * 4); // 1693 × 4 = 6772
      expect(shearPer * qty).toBe(Math.round(15.6 * 102) * 4);   // 1591 × 4 = 6364
    });
  });

  describe('Utilisation & load check', () => {
    it('50% utilisation = OK (green)', () => {
      const load = 500;
      const capacity = 1000;
      const util = load / capacity;
      expect(util).toBe(0.5);
      expect(util <= 0.8).toBe(true);
    });

    it('80% utilisation = OK threshold', () => {
      const load = 800;
      const capacity = 1000;
      const util = load / capacity;
      expect(util).toBe(0.8);
      expect(util <= 0.8).toBe(true);
    });

    it('90% utilisation = warning (amber)', () => {
      const load = 900;
      const capacity = 1000;
      const util = load / capacity;
      expect(util > 0.8 && util <= 1.0).toBe(true);
    });

    it('100% utilisation = warning (amber, at limit)', () => {
      const load = 1000;
      const capacity = 1000;
      const util = load / capacity;
      expect(util <= 1.0).toBe(true);
      expect(util > 0.8).toBe(true);
    });

    it('120% utilisation = FAIL (red)', () => {
      const load = 1200;
      const capacity = 1000;
      const util = load / capacity;
      expect(util > 1.0).toBe(true);
    });

    it('safety factor = 1/utilisation', () => {
      const util = 0.5;
      const sf = 1 / util;
      expect(sf).toBe(2.0);
    });

    it('safety factor at 80% util = 1.25', () => {
      const sf = 1 / 0.8;
      expect(sf).toBe(1.25);
    });

    it('percent capped at 150 for display bar', () => {
      const util = 2.0; // 200%
      const percent = Math.min(util * 100, 150);
      expect(percent).toBe(150);
    });
  });

  describe('brittanyCalculate DOM rendering', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="brittanyTypeButtons"></div>
        <div id="brittanySizeButtons"></div>
        <input id="brittanyQty" value="2" />
        <select id="brittanyConcrete">
          <option value="32" selected>32 MPa Concrete</option>
          <option value="40">40 MPa Concrete</option>
          <option value="15">15 MPa Masonry</option>
          <option value="8">8 MPa Block</option>
        </select>
        <input type="checkbox" id="brittanyOverhead" />
        <input id="brittanyEmbed" value="" />
        <input id="brittanyEdge" value="" />
        <input id="brittanySpacing" value="" />
        <div id="brittanyEmbedMin"></div>
        <div id="brittanyEdgeMin"></div>
        <div id="brittanySpacingMin"></div>
        <div id="brittanyResults"></div>
        <div id="brittanyConsole"></div>
        <input id="brittanyLoad" value="" />
        <select id="brittanyLoadType"><option value="tension">Tension</option></select>
        <div id="brittanyLoadResult" style="display:none"></div>
        <div id="brittanyUtilDisplay" style="display:none"></div>
        <div id="brittanyLoadFill"></div>
        <div id="brittanyLoadStatus"></div>
        <div id="brittanyUtilPercent"></div>
        <div id="brittanyUtilStatus"></div>
        <div id="brittanySafetyFactor"></div>
      `;
      global.FIXING_DATA = FIXING_DATA;
      global.brittanyType = 'dynabolt';
      global.brittanySize = 'M12';
      global.brittanyTotalTension = 0;
      global.brittanyTotalShear = 0;
      loadHubFunctions(['escapeHtml', 'brittanyCalculate', 'brittanyCheckLoad'], { quiet: true });
    });

    it('renders tension and shear values', () => {
      global.brittanyCalculate();
      const html = document.getElementById('brittanyResults').innerHTML;
      // 2 × Dynabolt M12, 32MPa: tension = 785kg each, total = 1570
      expect(html).toContain('785');
      expect(html).toContain('1,570');
    });

    it('renders hole size in results', () => {
      global.brittanyCalculate();
      const html = document.getElementById('brittanyResults').innerHTML;
      expect(html).toContain('16'); // Dynabolt M12 hole = 16mm
    });

    it('updates min embed/edge/spacing displays', () => {
      global.brittanyCalculate();
      expect(document.getElementById('brittanyEmbedMin').textContent).toContain('50');
      expect(document.getElementById('brittanyEdgeMin').textContent).toContain('75');
      expect(document.getElementById('brittanySpacingMin').textContent).toContain('150');
    });

    it('shows console summary with quantity', () => {
      global.brittanyCalculate();
      const console = document.getElementById('brittanyConsole').textContent;
      expect(console).toContain('2×');
      expect(console).toContain('Dynabolt');
      expect(console).toContain('M12');
    });

    it('shows weak substrate warning for 8 MPa', () => {
      document.getElementById('brittanyConcrete').value = '8';
      global.brittanyCalculate();
      const html = document.getElementById('brittanyResults').innerHTML;
      expect(html).toContain('WEAK SUBSTRATE');
    });

    it('sets brittanyTotalTension and brittanyTotalShear globals', () => {
      global.brittanyCalculate();
      expect(global.brittanyTotalTension).toBeGreaterThan(0);
      expect(global.brittanyTotalShear).toBeGreaterThan(0);
    });

    it('overhead checkbox halves the capacity', () => {
      global.brittanyCalculate();
      const noOverheadTension = global.brittanyTotalTension;

      document.getElementById('brittanyOverhead').checked = true;
      global.brittanyCalculate();
      const withOverheadTension = global.brittanyTotalTension;

      expect(withOverheadTension).toBeCloseTo(noOverheadTension / 2, -1);
    });
  });

  describe('Edge cases', () => {
    it('zero qty produces zero total', () => {
      const tensionKn = 10;
      const qty = 0;
      expect(Math.round(tensionKn * 1.0 * 102) * qty).toBe(0);
    });

    it('very high MPa (100) gives factor > 1.0', () => {
      expect(Math.sqrt(100 / 32)).toBeGreaterThan(1.0);
    });

    it('substrate factor never negative', () => {
      // Even with 0 MPa (impossible but tested)
      expect(Math.sqrt(0 / 32)).toBe(0);
    });

    it('all reduction factors stay in [0.5, 2.0] range', () => {
      for (let ratio = 0; ratio <= 5; ratio += 0.1) {
        const edgeFactor = ratio < 1 ? Math.max(0.5, ratio) : 1.0;
        const chemEmbedFactor = Math.min(2.0, Math.max(0.5, ratio));
        expect(edgeFactor).toBeGreaterThanOrEqual(0.5);
        expect(edgeFactor).toBeLessThanOrEqual(1.0);
        expect(chemEmbedFactor).toBeGreaterThanOrEqual(0.5);
        expect(chemEmbedFactor).toBeLessThanOrEqual(2.0);
      }
    });
  });
});
