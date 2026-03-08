/**
 * bootstrap.test.js — Code-structure tests for bootstrap.jsx
 *
 * Verifies the React app bootstrap: ErrorBoundary wrapper,
 * root element targeting, and error fallback.
 */

const fs = require('fs');
const path = require('path');

const bootstrapPath = path.resolve(__dirname, '../../../js/components/bootstrap.jsx');
let code;

beforeAll(() => {
  code = fs.readFileSync(bootstrapPath, 'utf-8');
});

describe('bootstrap.jsx — React app bootstrap', () => {

  it('should use ReactDOM.createRoot', () => {
    expect(code).toMatch(/ReactDOM\.createRoot/);
  });

  it('should render to #root element', () => {
    expect(code).toMatch(/getElementById\(['"]root['"]\)/);
  });

  it('should wrap app in ErrorBoundary', () => {
    expect(code).toMatch(/<ErrorBoundary>/);
    expect(code).toMatch(/<\/ErrorBoundary>/);
  });

  it('should render AppWithAuth component', () => {
    expect(code).toMatch(/<AppWithAuth/);
  });

  it('should have catch block for render errors', () => {
    expect(code).toMatch(/catch\s*\(\s*err\s*\)/);
  });

  it('should display error message in fallback HTML', () => {
    expect(code).toMatch(/App Error/);
    expect(code).toMatch(/err\.message/);
  });

  it('should log bootstrap start', () => {
    expect(code).toMatch(/\[BOOTSTRAP\]\s*Starting/);
  });
});
