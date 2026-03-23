/**
 * view-settings.test.js — Regression tests for SettingsView (view-settings.jsx)
 *
 * REGRESSION: addSite allowed case-insensitive duplicates. A user could add
 * "Sydney CBD" and "sydney cbd" as separate sites. Fix: added case-insensitive
 * comparison using toLowerCase().
 */

const fs = require('fs');
const path = require('path');

const settingsPath = path.resolve(__dirname, '../../../js/components/view-settings.jsx');
let settingsCode;
let addSiteBlock;

beforeAll(() => {
  settingsCode = fs.readFileSync(settingsPath, 'utf-8');

  // Extract the addSite function block
  const startIdx = settingsCode.indexOf('const addSite');
  if (startIdx !== -1) {
    let braceCount = 0;
    let endIdx = startIdx;
    let started = false;
    for (let i = startIdx; i < settingsCode.length; i++) {
      if (settingsCode[i] === '{') {
        braceCount++;
        started = true;
      } else if (settingsCode[i] === '}') {
        braceCount--;
      }
      if (started && braceCount === 0) {
        endIdx = i + 1;
        break;
      }
    }
    addSiteBlock = settingsCode.slice(startIdx, endIdx);
  } else {
    addSiteBlock = '';
  }
});

describe('SettingsView — addSite duplicate prevention [REGRESSION]', () => {

  it('should define an addSite function', () => {
    expect(addSiteBlock.length).toBeGreaterThan(0);
    expect(addSiteBlock).toMatch(/addSite/);
  });

  it('should use toLowerCase() for case-insensitive duplicate check [REGRESSION]', () => {
    // The regression fix requires toLowerCase() comparison
    expect(addSiteBlock).toMatch(/toLowerCase\(\)/);
  });

  it('should compare both the new site and existing sites in lowercase', () => {
    // Both sides of the comparison must be lowercased
    // Pattern: s.toLowerCase() === trimmed.toLowerCase()
    expect(addSiteBlock).toMatch(/\.toLowerCase\(\)\s*===\s*\w+\.toLowerCase\(\)/);
  });

  it('should trim the input before comparing', () => {
    expect(addSiteBlock).toMatch(/trim\(\)/);
  });

  it('should alert or return early when duplicate is found', () => {
    // Must show feedback to user about duplicate
    expect(addSiteBlock).toMatch(/isDuplicate|already exists/);
  });

  it('should only add site when not a duplicate', () => {
    // After duplicate check, should call onUpdateSites with new array
    expect(addSiteBlock).toMatch(/onUpdateSites/);
  });
});

describe('SettingsView admin-only shared settings controls', () => {
  it('should derive shared-settings permissions from admin flags', () => {
    expect(settingsCode).toMatch(/const canManageSharedSettings = isAdmin \|\| isDeviceAdmin;/);
  });

  it('should guard site mutations behind shared-settings permissions', () => {
    expect(addSiteBlock).toMatch(/if \(!canManageSharedSettings\) return;/);
    expect(settingsCode).toMatch(/\{canManageSharedSettings && \(/);
  });

  it('should guard signature mutations behind shared-settings permissions', () => {
    expect(settingsCode).toMatch(/const saveSignature = \(name, signatureData\) => \{\s*if \(!canManageSharedSettings\) return;/s);
    expect(settingsCode).toMatch(/const deleteSignature = \(name\) => \{\s*if \(!canManageSharedSettings\) return;/s);
    expect(settingsCode).toMatch(/const addNewMember = \(\) => \{\s*if \(!canManageSharedSettings\) return;/s);
  });
});
