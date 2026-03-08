/**
 * view-emergency.test.js — Code-structure tests for EmergencyView (view-emergency.jsx)
 *
 * Verifies all emergency contacts are present with correct numbers,
 * tel: links are properly sanitized, and component exports.
 */

const fs = require('fs');
const path = require('path');

const emergencyPath = path.resolve(__dirname, '../../../js/components/view-emergency.jsx');
let code;

beforeAll(() => {
  code = fs.readFileSync(emergencyPath, 'utf-8');
});

describe('EmergencyView — emergency contacts', () => {

  it('should include Emergency Services with number 000', () => {
    expect(code).toMatch(/Emergency Services/);
    expect(code).toMatch(/['"]000['"]/);
  });

  it('should include SafeWork NSW with number 13 10 50', () => {
    expect(code).toMatch(/SafeWork NSW/);
    expect(code).toMatch(/13 10 50/);
  });

  it('should include Poisons Information with number 13 11 26', () => {
    expect(code).toMatch(/Poisons Information/);
    expect(code).toMatch(/13 11 26/);
  });

  it('should provide 24/7 advice description for Poisons', () => {
    expect(code).toMatch(/24\/7 advice/);
  });

  it('should describe SafeWork NSW for reporting serious incidents', () => {
    expect(code).toMatch(/Report serious incidents/);
  });

  it('should use tel: links with sanitized numbers (spaces stripped)', () => {
    // tel:${contact.number.replace(/\s/g, '')}
    expect(code).toMatch(/tel:/);
    expect(code).toMatch(/replace\(\/\\s\/g,\s*['"]['"]?\)/);
  });

  it('should have 3 emergency contacts', () => {
    const contactMatches = code.match(/\{\s*name:/g);
    expect(contactMatches).toBeTruthy();
    expect(contactMatches.length).toBe(3);
  });
});

describe('EmergencyView — structure', () => {
  it('should have Emergency Information header', () => {
    expect(code).toMatch(/Emergency Information/);
  });

  it('should display contact descriptions', () => {
    expect(code).toMatch(/contact\.desc/);
  });
});

describe('EmergencyView — exports', () => {
  it('should export to window.EmergencyView', () => {
    expect(code).toMatch(/window\.EmergencyView\s*=\s*EmergencyView/);
  });
});
