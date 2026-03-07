/**
 * form-editing.test.js — Code-structure regression tests for form editing support
 *
 * REGRESSION: All 5 form components previously had no editing support — they
 * ignored onUpdate/editingForm props. Fix: each now branches on isEditing
 * to call onUpdate instead of onSubmit.
 *
 * Approach: Read each JSX file as a string and verify the required code patterns
 * exist. This is a "code structure" test — simpler and more reliable than trying
 * to render JSX components that depend on global React hooks and SignaturePad.
 */

const fs = require('fs');
const path = require('path');

const formsDir = path.resolve(__dirname, '../../../js/components');

const formFiles = [
  { file: 'form-incident.jsx', component: 'IncidentView' },
  { file: 'form-inspection.jsx', component: 'SubcontractorInspectionView' },
  { file: 'form-itp.jsx', component: 'ITPFormView' },
  { file: 'form-steel-itp.jsx', component: 'SteelITPView' },
  { file: 'form-toolbox.jsx', component: 'ToolboxView' },
];

formFiles.forEach(({ file, component }) => {
  describe(`${component} (${file}) — editing support [REGRESSION]`, () => {
    let code;

    beforeAll(() => {
      code = fs.readFileSync(path.join(formsDir, file), 'utf-8');
    });

    it('should accept onUpdate in function signature', () => {
      // The function declaration must destructure onUpdate from props
      expect(code).toMatch(/function\s+\w+\s*\(\s*\{[^}]*onUpdate[^}]*\}/s);
    });

    it('should accept editingForm in function signature', () => {
      // The function declaration must destructure editingForm from props
      expect(code).toMatch(/function\s+\w+\s*\(\s*\{[^}]*editingForm[^}]*\}/s);
    });

    it('should check isEditing && onUpdate before calling onUpdate [REGRESSION]', () => {
      // The submit handler must branch: if editing, call onUpdate instead of onSubmit
      expect(code).toMatch(/isEditing\s*&&\s*onUpdate/);
    });
  });
});
