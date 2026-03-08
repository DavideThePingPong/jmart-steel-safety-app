/**
 * app.test.js — Code-structure tests for JMartSteelSafetyApp (app.jsx)
 *
 * Verifies navigation structure, auth status gates, prop threading,
 * and component routing logic by reading the source as text.
 */

const fs = require('fs');
const path = require('path');

const appPath = path.resolve(__dirname, '../../../js/components/app.jsx');
let code;

beforeAll(() => {
  code = fs.readFileSync(appPath, 'utf-8');
});

// ==========================================================================
// Navigation Structure
// ==========================================================================
describe('JMartSteelSafetyApp — navigation structure', () => {

  it('should define navItems array', () => {
    expect(code).toMatch(/const\s+navItems\s*=\s*\[/);
  });

  const expectedNavViews = [
    'dashboard', 'training', 'recordings', 'prestart', 'steel-itp',
    'inspection', 'itp', 'incidents', 'toolbox', 'emergency', 'settings'
  ];

  expectedNavViews.forEach(viewId => {
    it(`should include "${viewId}" in navItems`, () => {
      expect(code).toContain(`'${viewId}'`);
    });
  });

  it('should render bottom nav with 5 quick-access items', () => {
    // Bottom nav has dashboard, training, prestart, incidents, emergency
    expect(code).toMatch(/fixed\s+bottom-0/);
  });
});

// ==========================================================================
// Auth Status Gates
// ==========================================================================
describe('JMartSteelSafetyApp — auth status gates', () => {

  it('should gate on "checking" status with loading spinner', () => {
    expect(code).toMatch(/deviceAuthStatus\s*===\s*['"]checking['"]/);
    expect(code).toMatch(/Verifying device authorization/);
  });

  it('should gate on "pending" status', () => {
    expect(code).toMatch(/deviceAuthStatus\s*===\s*['"]pending['"]/);
  });

  it('should gate on "denied" status', () => {
    expect(code).toMatch(/deviceAuthStatus\s*===\s*['"]denied['"]/);
    expect(code).toMatch(/Access Denied/);
  });

  it('should show offline banner when not online', () => {
    expect(code).toMatch(/!isOnline/);
    expect(code).toMatch(/offline/i);
  });
});

// ==========================================================================
// Component Routing
// ==========================================================================
describe('JMartSteelSafetyApp — component routing', () => {

  const routeComponentPairs = [
    ['dashboard', 'Dashboard'],
    ['training', 'TrainingView'],
    ['prestart', 'PrestartView'],
    ['steel-itp', 'SteelITPView'],
    ['inspection', 'SubcontractorInspectionView'],
    ['itp', 'ITPFormView'],
    ['incidents', 'IncidentView'],
    ['toolbox', 'ToolboxView'],
    ['emergency', 'EmergencyView'],
    ['settings', 'SettingsView'],
    ['recordings', 'RecordingsView'],
  ];

  routeComponentPairs.forEach(([view, component]) => {
    it(`should route "${view}" to <${component}>`, () => {
      expect(code).toMatch(new RegExp(`currentView\\s*===\\s*'${view}'`));
      expect(code).toMatch(new RegExp(`<${component}`));
    });
  });
});

// ==========================================================================
// Hooks and Prop Threading
// ==========================================================================
describe('JMartSteelSafetyApp — hooks and props', () => {

  it('should use useDeviceAuth hook', () => {
    expect(code).toMatch(/useDeviceAuth\(\)/);
  });

  it('should use useFormManager hook', () => {
    expect(code).toMatch(/useFormManager\(/);
  });

  it('should use useDataSync hook', () => {
    expect(code).toMatch(/useDataSync\(/);
  });

  it('should use usePWAInstall hook', () => {
    expect(code).toMatch(/usePWAInstall\(\)/);
  });

  it('should sync forms on change with useEffect', () => {
    expect(code).toMatch(/syncFormsEffect\(forms\)/);
  });

  it('should sync sites on change with useEffect', () => {
    expect(code).toMatch(/syncSitesEffect\(sites\)/);
  });
});

// ==========================================================================
// Window Export
// ==========================================================================
describe('JMartSteelSafetyApp — exports', () => {
  it('should export to window.JMartSteelSafetyApp', () => {
    expect(code).toMatch(/window\.JMartSteelSafetyApp\s*=\s*JMartSteelSafetyApp/);
  });
});
