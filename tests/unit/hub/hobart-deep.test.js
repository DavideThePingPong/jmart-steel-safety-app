/**
 * HOBART Agent - Deep DOM Interaction & Engineering Precision Tests
 *
 * Tests: hobartSetType, hobartSetSize, hobartUpdateSizes, hobartUpdate,
 *        hobartFindFits, SWL conversions, grip range calculations,
 *        edge cases, and cross-type data integrity.
 */
const { extractScriptBlocks, loadHubFunctions } = require('../../helpers/loadHubScript');

describe('HOBART Deep Tests', () => {
  let HOLLO_BOLT_DATA;

  beforeAll(() => {
    const allCode = extractScriptBlocks().join('\n');
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

  describe('SWL kN-to-kg conversion precision', () => {
    it('converts M12 HB tension: 10.5kN × 102 = 1071kg', () => {
      const data = HOLLO_BOLT_DATA.HEXAGONAL_HEAD.M12;
      expect(Math.round(data.tensile_swl_kn * 102)).toBe(1071);
    });

    it('converts M12 HB shear: 15.0kN × 102 = 1530kg', () => {
      const data = HOLLO_BOLT_DATA.HEXAGONAL_HEAD.M12;
      expect(Math.round(data.shear_swl_kn * 102)).toBe(1530);
    });

    it('converts M20 HB tension: 35.0kN × 102 = 3570kg', () => {
      const data = HOLLO_BOLT_DATA.HEXAGONAL_HEAD.M20;
      expect(Math.round(data.tensile_swl_kn * 102)).toBe(3570);
    });

    it('converts M20 HB shear: 40.0kN × 102 = 4080kg', () => {
      const data = HOLLO_BOLT_DATA.HEXAGONAL_HEAD.M20;
      expect(Math.round(data.shear_swl_kn * 102)).toBe(4080);
    });

    it('converts LB M24 tension: 20.0kN × 102 = 2040kg', () => {
      const data = HOLLO_BOLT_DATA.LINDIBOLT.M24;
      expect(Math.round(data.tensile_swl_kn * 102)).toBe(2040);
    });

    it('converts LB M10 shear: 3.4kN × 102 = 347kg', () => {
      const data = HOLLO_BOLT_DATA.LINDIBOLT.M10;
      expect(Math.round(data.shear_swl_kn * 102)).toBe(347);
    });

    it('all SWL values are positive across every bolt type and size', () => {
      const heads = ['HEXAGONAL_HEAD', 'COUNTERSUNK_HEAD', 'FLUSH_FIT_HEAD', 'LINDIBOLT'];
      for (const head of heads) {
        const headData = HOLLO_BOLT_DATA[head];
        for (const [size, data] of Object.entries(headData)) {
          expect(data.tensile_swl_kn).toBeGreaterThan(0);
          expect(data.shear_swl_kn).toBeGreaterThan(0);
        }
      }
    });

    it('tension increases with bolt size for HB (M8 < M12 < M20)', () => {
      const hb = HOLLO_BOLT_DATA.HEXAGONAL_HEAD;
      expect(hb.M8.tensile_swl_kn).toBeLessThan(hb.M12.tensile_swl_kn);
      expect(hb.M12.tensile_swl_kn).toBeLessThan(hb.M20.tensile_swl_kn);
    });

    it('shear increases with bolt size for HB (M8 < M12 < M20)', () => {
      const hb = HOLLO_BOLT_DATA.HEXAGONAL_HEAD;
      expect(hb.M8.shear_swl_kn).toBeLessThan(hb.M12.shear_swl_kn);
      expect(hb.M12.shear_swl_kn).toBeLessThan(hb.M20.shear_swl_kn);
    });
  });

  describe('Drilling data integrity', () => {
    it('all M sizes have drilling data', () => {
      const sizes = ['M8', 'M10', 'M12', 'M16', 'M20'];
      for (const size of sizes) {
        expect(HOLLO_BOLT_DATA.DRILLING_DATA[size]).toBeDefined();
      }
    });

    it('clearance hole increases with bolt size', () => {
      const drill = HOLLO_BOLT_DATA.DRILLING_DATA;
      expect(drill.M8.clearance_hole).toBeLessThan(drill.M12.clearance_hole);
      expect(drill.M12.clearance_hole).toBeLessThan(drill.M20.clearance_hole);
    });

    it('M8 clearance hole is 14mm', () => {
      expect(HOLLO_BOLT_DATA.DRILLING_DATA.M8.clearance_hole).toBe(14);
    });

    it('M20 clearance hole is 33mm', () => {
      expect(HOLLO_BOLT_DATA.DRILLING_DATA.M20.clearance_hole).toBe(33);
    });

    it('min edge distance increases with bolt size', () => {
      const drill = HOLLO_BOLT_DATA.DRILLING_DATA;
      expect(drill.M8.min_edge_distance).toBeLessThan(drill.M12.min_edge_distance);
      expect(drill.M12.min_edge_distance).toBeLessThan(drill.M20.min_edge_distance);
    });

    it('tolerance strings are properly formatted', () => {
      for (const [size, data] of Object.entries(HOLLO_BOLT_DATA.DRILLING_DATA)) {
        expect(data.tolerance).toMatch(/^\+[\d.]+\/-[\d.]+$/);
      }
    });
  });

  describe('Type-specific size availability', () => {
    it('HB has sizes M8, M10, M12, M16, M20 (5 sizes)', () => {
      const sizes = Object.keys(HOLLO_BOLT_DATA.HEXAGONAL_HEAD);
      expect(sizes).toEqual(['M8', 'M10', 'M12', 'M16', 'M20']);
    });

    it('HBFF has only M8, M10, M12 (3 sizes)', () => {
      const sizes = Object.keys(HOLLO_BOLT_DATA.FLUSH_FIT_HEAD);
      expect(sizes).toEqual(['M8', 'M10', 'M12']);
    });

    it('HBCSK has M8, M10, M12, M16 (4 sizes, no M20)', () => {
      const sizes = Object.keys(HOLLO_BOLT_DATA.COUNTERSUNK_HEAD);
      expect(sizes).toEqual(['M8', 'M10', 'M12', 'M16']);
      expect(HOLLO_BOLT_DATA.COUNTERSUNK_HEAD.M20).toBeUndefined();
    });

    it('LB has M10, M12, M16, M20, M24 (5 sizes, no M8)', () => {
      const sizes = Object.keys(HOLLO_BOLT_DATA.LINDIBOLT);
      expect(sizes).toEqual(['M10', 'M12', 'M16', 'M20', 'M24']);
      expect(HOLLO_BOLT_DATA.LINDIBOLT.M8).toBeUndefined();
    });
  });

  describe('Product codes and clamping ranges', () => {
    it('each size has matching product_codes and clamping_ranges arrays', () => {
      const heads = ['HEXAGONAL_HEAD', 'COUNTERSUNK_HEAD', 'FLUSH_FIT_HEAD', 'LINDIBOLT'];
      for (const head of heads) {
        for (const [size, data] of Object.entries(HOLLO_BOLT_DATA[head])) {
          expect(data.product_codes_with_sizes.length).toBe(data.clamping_ranges.length);
        }
      }
    });

    it('clamping ranges are contiguous (end of one = start of next)', () => {
      const hb12 = HOLLO_BOLT_DATA.HEXAGONAL_HEAD.M12;
      // Ranges: 3-25, 25-47, 47-69
      const ranges = hb12.clamping_ranges.map(r => r.split('-').map(Number));
      for (let i = 0; i < ranges.length - 1; i++) {
        expect(ranges[i][1]).toBe(ranges[i + 1][0]);
      }
    });

    it('LB has single product code per size (no length variants)', () => {
      for (const [size, data] of Object.entries(HOLLO_BOLT_DATA.LINDIBOLT)) {
        expect(data.product_codes_with_sizes.length).toBe(1);
        expect(data.clamping_ranges.length).toBe(1);
      }
    });

    it('HB M12 has 3 clamping range variants', () => {
      expect(HOLLO_BOLT_DATA.HEXAGONAL_HEAD.M12.product_codes_with_sizes.length).toBe(3);
    });
  });

  describe('Torque and spanner data', () => {
    it('torque increases with bolt size for HB', () => {
      const hb = HOLLO_BOLT_DATA.HEXAGONAL_HEAD;
      expect(hb.M8.torque_nm).toBeLessThan(hb.M12.torque_nm);
      expect(hb.M12.torque_nm).toBeLessThan(hb.M20.torque_nm);
    });

    it('spanner size increases with bolt size for HB', () => {
      const hb = HOLLO_BOLT_DATA.HEXAGONAL_HEAD;
      expect(hb.M8.spanner_mm).toBeLessThan(hb.M12.spanner_mm);
      expect(hb.M12.spanner_mm).toBeLessThan(hb.M20.spanner_mm);
    });

    it('HB and HBCSK share same torque for same sizes', () => {
      const hb = HOLLO_BOLT_DATA.HEXAGONAL_HEAD;
      const csk = HOLLO_BOLT_DATA.COUNTERSUNK_HEAD;
      for (const size of ['M8', 'M10', 'M12', 'M16']) {
        expect(hb[size].torque_nm).toBe(csk[size].torque_nm);
      }
    });

    it('LB torque values are lower than HB for same sizes', () => {
      const hb = HOLLO_BOLT_DATA.HEXAGONAL_HEAD;
      const lb = HOLLO_BOLT_DATA.LINDIBOLT;
      for (const size of ['M10', 'M12', 'M16', 'M20']) {
        expect(lb[size].torque_nm).toBeLessThan(hb[size].torque_nm);
      }
    });
  });

  describe('hobartUpdateSizes DOM rendering', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="hobartTypeButtons"></div>
        <div id="hobartSizeButtons"></div>
        <div id="hobartResults"></div>
        <div id="hobartConsole"></div>
        <table><tbody id="hobartGripBody"></tbody></table>
      `;

      // Set globals needed by the functions
      global.hobartType = 'HB';
      global.hobartSize = 'M12';
      global.HOLLO_BOLT_DATA = HOLLO_BOLT_DATA;
      loadHubFunctions(['escapeHtml', 'hobartUpdateSizes'], { quiet: true });
    });

    it('renders 5 size buttons for HB type', () => {
      global.hobartType = 'HB';
      global.hobartUpdateSizes();
      const buttons = document.querySelectorAll('#hobartSizeButtons .btn');
      expect(buttons.length).toBe(5);
    });

    it('renders 3 size buttons for HBFF type', () => {
      global.hobartType = 'HBFF';
      global.hobartUpdateSizes();
      const buttons = document.querySelectorAll('#hobartSizeButtons .btn');
      expect(buttons.length).toBe(3);
    });

    it('renders 4 size buttons for HBCSK type', () => {
      global.hobartType = 'HBCSK';
      global.hobartUpdateSizes();
      const buttons = document.querySelectorAll('#hobartSizeButtons .btn');
      expect(buttons.length).toBe(4);
    });

    it('renders 5 size buttons for LB type', () => {
      global.hobartType = 'LB';
      global.hobartUpdateSizes();
      const buttons = document.querySelectorAll('#hobartSizeButtons .btn');
      expect(buttons.length).toBe(5);
    });

    it('resets to first available size when current size unavailable', () => {
      global.hobartType = 'HBFF';
      global.hobartSize = 'M20'; // Not available for HBFF
      global.hobartUpdateSizes();
      expect(global.hobartSize).toBe('M8');
    });

    it('keeps current size when available for new type', () => {
      global.hobartType = 'HB';
      global.hobartSize = 'M12';
      global.hobartUpdateSizes();
      expect(global.hobartSize).toBe('M12');
      const activeBtn = document.querySelector('#hobartSizeButtons .btn.active');
      expect(activeBtn.textContent).toBe('M12');
    });
  });

  describe('hobartUpdate DOM rendering', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="hobartResults"></div>
        <div id="hobartConsole"></div>
        <table><tbody id="hobartGripBody"></tbody></table>
        <div id="hobartGripVisual"></div>
      `;
      global.HOLLO_BOLT_DATA = HOLLO_BOLT_DATA;
      global.hobartType = 'HB';
      global.hobartSize = 'M12';
      global.hobartUpdateGripVisual = jest.fn();
      loadHubFunctions(['escapeHtml', 'hobartUpdate'], { quiet: true });
    });

    it('renders result cards with correct tension value', () => {
      global.hobartUpdate();
      const html = document.getElementById('hobartResults').innerHTML;
      // M12 HB: 10.5kN × 102 = 1071kg
      expect(html).toContain('1071');
    });

    it('renders result cards with correct shear value', () => {
      global.hobartUpdate();
      const html = document.getElementById('hobartResults').innerHTML;
      // M12 HB: 15.0kN × 102 = 1530kg
      expect(html).toContain('1530');
    });

    it('renders grip table with product codes', () => {
      global.hobartUpdate();
      const rows = document.querySelectorAll('#hobartGripBody tr');
      expect(rows.length).toBe(3); // M12 HB has 3 variants
    });

    it('renders clearance hole in results', () => {
      global.hobartUpdate();
      const html = document.getElementById('hobartResults').innerHTML;
      expect(html).toContain('20'); // M12 clearance hole = 20mm
    });

    it('renders torque in results', () => {
      global.hobartUpdate();
      const html = document.getElementById('hobartResults').innerHTML;
      expect(html).toContain('80'); // M12 torque = 80Nm
    });

    it('shows "Not Available" for invalid type/size combo', () => {
      global.hobartType = 'HBCSK';
      global.hobartSize = 'M20'; // HBCSK doesn't have M20
      global.hobartUpdate();
      const html = document.getElementById('hobartResults').innerHTML;
      expect(html).toContain('Not Available');
    });

    it('updates console with summary message', () => {
      global.hobartUpdate();
      const console = document.getElementById('hobartConsole').textContent;
      expect(console).toContain('HB');
      expect(console).toContain('M12');
      expect(console).toContain('80Nm');
    });

    it('calls hobartUpdateGripVisual', () => {
      global.hobartUpdate();
      expect(global.hobartUpdateGripVisual).toHaveBeenCalled();
    });
  });

  describe('Cross-type SWL comparison (engineering validation)', () => {
    it('HBCSK and HB share same SWL for overlapping sizes', () => {
      const hb = HOLLO_BOLT_DATA.HEXAGONAL_HEAD;
      const csk = HOLLO_BOLT_DATA.COUNTERSUNK_HEAD;
      for (const size of ['M8', 'M10', 'M12', 'M16']) {
        expect(hb[size].tensile_swl_kn).toBe(csk[size].tensile_swl_kn);
        expect(hb[size].shear_swl_kn).toBe(csk[size].shear_swl_kn);
      }
    });

    it('HBFF and HB share same SWL for overlapping sizes', () => {
      const hb = HOLLO_BOLT_DATA.HEXAGONAL_HEAD;
      const ff = HOLLO_BOLT_DATA.FLUSH_FIT_HEAD;
      for (const size of ['M8', 'M10', 'M12']) {
        expect(hb[size].tensile_swl_kn).toBe(ff[size].tensile_swl_kn);
        expect(hb[size].shear_swl_kn).toBe(ff[size].shear_swl_kn);
      }
    });

    it('LB SWL is lower than HB for same sizes', () => {
      const hb = HOLLO_BOLT_DATA.HEXAGONAL_HEAD;
      const lb = HOLLO_BOLT_DATA.LINDIBOLT;
      for (const size of ['M10', 'M12', 'M16', 'M20']) {
        expect(lb[size].tensile_swl_kn).toBeLessThan(hb[size].tensile_swl_kn);
      }
    });
  });
});
