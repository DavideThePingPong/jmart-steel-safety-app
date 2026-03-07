/**
 * form-geolocation.test.js — Regression tests for getLocation() handling
 *
 * REGRESSION: getLocation() was missing the else clause for isLocating state
 * in 4 forms. When navigator.geolocation is unavailable, setIsLocating(false)
 * was never called, leaving the UI stuck in "locating..." state.
 * Fix: added `else { setIsLocating(false); }` in all forms.
 *
 * The 4 forms with getLocation:
 *   - form-inspection.jsx  (SubcontractorInspectionView)
 *   - form-itp.jsx         (ITPFormView)
 *   - form-steel-itp.jsx   (SteelITPView)  — Note: steel-itp doesn't use getLocation
 *   - form-toolbox.jsx     (ToolboxView)
 *
 * Approach: Read each JSX file as a string and verify the getLocation function
 * has an else clause that resets isLocating to false.
 */

const fs = require('fs');
const path = require('path');

const formsDir = path.resolve(__dirname, '../../../js/components');

const formFilesWithGeolocation = [
  { file: 'form-inspection.jsx', component: 'SubcontractorInspectionView' },
  { file: 'form-itp.jsx', component: 'ITPFormView' },
  { file: 'form-toolbox.jsx', component: 'ToolboxView' },
];

formFilesWithGeolocation.forEach(({ file, component }) => {
  describe(`${component} (${file}) — getLocation geolocation handling [REGRESSION]`, () => {
    let code;
    let getLocationBlock;

    beforeAll(() => {
      code = fs.readFileSync(path.join(formsDir, file), 'utf-8');
      // Extract the getLocation function block
      const startIdx = code.indexOf('const getLocation');
      if (startIdx === -1) {
        getLocationBlock = '';
        return;
      }
      // Find the matching closing brace by counting braces
      let braceCount = 0;
      let endIdx = startIdx;
      let started = false;
      for (let i = startIdx; i < code.length; i++) {
        if (code[i] === '{') {
          braceCount++;
          started = true;
        } else if (code[i] === '}') {
          braceCount--;
        }
        if (started && braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
      getLocationBlock = code.slice(startIdx, endIdx);
    });

    it('should define a getLocation function', () => {
      expect(getLocationBlock.length).toBeGreaterThan(0);
      expect(getLocationBlock).toMatch(/getLocation/);
    });

    it('should have else clause that sets isLocating to false when geolocation unavailable [REGRESSION]', () => {
      // After the `if (navigator.geolocation) { ... }` block, there must be an
      // `else { setIsLocating(false); }` clause
      expect(getLocationBlock).toMatch(/}\s*else\s*\{\s*setIsLocating\(false\)/);
    });
  });
});

// Also verify form-incident.jsx does NOT have getLocation (it uses a different approach)
describe('IncidentView (form-incident.jsx) — no getLocation function', () => {
  let code;

  beforeAll(() => {
    code = fs.readFileSync(path.join(formsDir, 'form-incident.jsx'), 'utf-8');
  });

  it('should not define a getLocation function (incident form uses text input for location)', () => {
    expect(code).not.toMatch(/const getLocation/);
  });

  it('should still have isLocating = false or not use isLocating at all', () => {
    // Incident form should not have a stuck isLocating state
    // Either isLocating is not used, or it is properly managed
    const usesIsLocating = code.includes('isLocating');
    if (usesIsLocating) {
      // If used, ensure setIsLocating(false) is called somewhere
      expect(code).toMatch(/setIsLocating\(false\)/);
    } else {
      expect(usesIsLocating).toBe(false);
    }
  });
});
