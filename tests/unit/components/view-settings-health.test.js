/**
 * view-settings-health.test.js — Tests for SystemHealthCard in view-settings.jsx
 *
 * Verifies the System Health UI component exists, shows status badges,
 * error stats, and an expandable error log.
 */

const fs = require('fs');
const path = require('path');

const settingsPath = path.resolve(__dirname, '../../../js/components/view-settings.jsx');
let code;
let healthCardCode;

beforeAll(() => {
  code = fs.readFileSync(settingsPath, 'utf-8');

  // Extract the SystemHealthCard function block
  const startIdx = code.indexOf('function SystemHealthCard');
  if (startIdx !== -1) {
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
    healthCardCode = code.slice(startIdx, endIdx);
  } else {
    healthCardCode = '';
  }
});

describe('SystemHealthCard — Component structure', () => {
  it('should define a SystemHealthCard function', () => {
    expect(healthCardCode.length).toBeGreaterThan(0);
    expect(healthCardCode).toMatch(/function SystemHealthCard/);
  });

  it('should use useState hooks for state management', () => {
    expect(healthCardCode).toMatch(/useState\(null\)/);     // health state
    expect(healthCardCode).toMatch(/useState\(false\)/);     // showLog
    expect(healthCardCode).toMatch(/useState\(\[\]\)/);      // errors
  });

  it('should use useEffect for polling', () => {
    expect(healthCardCode).toMatch(/useEffect\(/);
  });

  it('should set up a refresh interval', () => {
    expect(healthCardCode).toMatch(/setInterval\(refresh/);
  });

  it('should clean up interval on unmount', () => {
    expect(healthCardCode).toMatch(/clearInterval\(interval\)/);
  });
});

describe('SystemHealthCard — ErrorTelemetry integration', () => {
  it('should check for ErrorTelemetry availability', () => {
    expect(healthCardCode).toMatch(/typeof ErrorTelemetry/);
  });

  it('should call ErrorTelemetry.getHealth()', () => {
    expect(healthCardCode).toMatch(/ErrorTelemetry\.getHealth\(\)/);
  });

  it('should call ErrorTelemetry.getRecentErrors()', () => {
    expect(healthCardCode).toMatch(/ErrorTelemetry\.getRecentErrors\(20\)/);
  });

  it('should return null if ErrorTelemetry is undefined', () => {
    expect(healthCardCode).toMatch(/typeof ErrorTelemetry\s*===\s*['"]undefined['"]/);
    expect(healthCardCode).toMatch(/return null/);
  });
});

describe('SystemHealthCard — Status display', () => {
  it('should define all three health statuses', () => {
    expect(healthCardCode).toMatch(/healthy/);
    expect(healthCardCode).toMatch(/degraded/);
    expect(healthCardCode).toMatch(/critical/);
  });

  it('should use color coding for status (green/yellow/red)', () => {
    expect(healthCardCode).toMatch(/bg-green-/);
    expect(healthCardCode).toMatch(/bg-yellow-/);
    expect(healthCardCode).toMatch(/bg-red-/);
  });

  it('should render System Health heading', () => {
    expect(healthCardCode).toMatch(/System Health/);
  });

  it('should display status as a badge', () => {
    expect(healthCardCode).toMatch(/rounded-full/);
    expect(healthCardCode).toMatch(/s\.label/);
  });
});

describe('SystemHealthCard — Stats grid', () => {
  it('should show errors last hour', () => {
    expect(healthCardCode).toMatch(/Errors \(last hr\)/);
    expect(healthCardCode).toMatch(/health\.errorsLastHour/);
  });

  it('should show total captured errors', () => {
    expect(healthCardCode).toMatch(/Total captured/);
    expect(healthCardCode).toMatch(/health\.totalErrors/);
  });

  it('should show sync queue size', () => {
    expect(healthCardCode).toMatch(/Sync queue/);
    expect(healthCardCode).toMatch(/health\.syncQueueSize/);
  });

  it('should show circuit breaker state', () => {
    expect(healthCardCode).toMatch(/Circuit breaker/);
    expect(healthCardCode).toMatch(/health\.circuitBreakerState/);
  });

  it('should use a 2-column grid layout', () => {
    expect(healthCardCode).toMatch(/grid-cols-2/);
  });
});

describe('SystemHealthCard — Error log', () => {
  it('should have a toggle button for error log', () => {
    expect(healthCardCode).toMatch(/View Error Log/);
    expect(healthCardCode).toMatch(/Hide Error Log/);
  });

  it('should show "No errors recorded" when empty', () => {
    expect(healthCardCode).toMatch(/No errors recorded/);
  });

  it('should display error messages', () => {
    expect(healthCardCode).toMatch(/err\.message\s*\|\|\s*err\.msg/);
  });

  it('should display error timestamps', () => {
    expect(healthCardCode).toMatch(/err\.timestamp/);
    expect(healthCardCode).toMatch(/toLocaleTimeString/);
  });

  it('should display error context', () => {
    expect(healthCardCode).toMatch(/err\.context/);
  });

  it('should have a scrollable container for errors', () => {
    expect(healthCardCode).toMatch(/overflow-y-auto/);
    expect(healthCardCode).toMatch(/max-h-64/);
  });

  it('should toggle showLog state on button click', () => {
    expect(healthCardCode).toMatch(/setShowLog\(!showLog\)/);
  });
});

describe('SystemHealthCard — Last sync time', () => {
  it('should display last sync time when available', () => {
    expect(healthCardCode).toMatch(/health\.lastSyncTime/);
    expect(healthCardCode).toMatch(/Last sync:/);
  });

  it('should format the sync time', () => {
    expect(healthCardCode).toMatch(/new Date\(health\.lastSyncTime\)\.toLocaleTimeString\(\)/);
  });
});

describe('SettingsView — SystemHealthCard integration', () => {
  it('should render SystemHealthCard in SettingsView', () => {
    expect(code).toMatch(/<SystemHealthCard\s*\/>/);
  });

  it('should place SystemHealthCard before the version footer', () => {
    const healthIdx = code.indexOf('<SystemHealthCard');
    const versionIdx = code.indexOf('J&M Artsteel Safety App v1.0');
    expect(healthIdx).toBeGreaterThan(-1);
    expect(versionIdx).toBeGreaterThan(-1);
    expect(healthIdx).toBeLessThan(versionIdx);
  });
});
