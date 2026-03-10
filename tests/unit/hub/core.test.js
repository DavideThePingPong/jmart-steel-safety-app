/**
 * Hub Core Tests - escapeHtml, HUB_VERSION, HUB_CONFIG, navigation
 *
 * Tests the fundamental utilities and configuration that every agent depends on.
 */
const fs = require('fs');
const path = require('path');
const { extractScriptBlocks, loadHubFunctions } = require('../../helpers/loadHubScript');

describe('Hub Core', () => {
  describe('extractScriptBlocks helper', () => {
    it('extracts script blocks from the hub HTML', () => {
      const blocks = extractScriptBlocks();
      expect(blocks.length).toBeGreaterThan(0);
      expect(blocks[0]).toContain('escapeHtml');
    });
  });

  describe('escapeHtml()', () => {
    beforeEach(() => {
      loadHubFunctions(['escapeHtml'], { quiet: true });
    });

    it('escapes HTML special characters', () => {
      expect(global.escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('escapes ampersands', () => {
      expect(global.escapeHtml('A & B')).toBe('A &amp; B');
    });

    it('escapes single quotes', () => {
      expect(global.escapeHtml("it's")).toBe("it&#39;s");
    });

    it('returns empty string for null', () => {
      expect(global.escapeHtml(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(global.escapeHtml(undefined)).toBe('');
    });

    it('converts numbers to strings', () => {
      expect(global.escapeHtml(42)).toBe('42');
    });

    it('handles empty string', () => {
      expect(global.escapeHtml('')).toBe('');
    });

    it('passes through safe strings unchanged', () => {
      expect(global.escapeHtml('Hello World 123')).toBe('Hello World 123');
    });
  });

  describe('HUB_VERSION', () => {
    it('exists in the source', () => {
      const blocks = extractScriptBlocks();
      const code = blocks.join('\n');
      expect(code).toContain("const HUB_VERSION = '");
    });

    it('follows semver format', () => {
      const blocks = extractScriptBlocks();
      const code = blocks.join('\n');
      const match = code.match(/const HUB_VERSION = '(\d+\.\d+\.\d+)'/);
      expect(match).not.toBeNull();
      expect(match[1]).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('HUB_CONFIG', () => {
    beforeEach(() => {
      loadHubFunctions(['HUB_CONFIG'], { quiet: true });
    });

    it('contains company info', () => {
      expect(global.HUB_CONFIG.company).toBeDefined();
      expect(global.HUB_CONFIG.company.name).toContain('Art Steel');
      expect(global.HUB_CONFIG.company.abn).toBeTruthy();
    });

    it('contains API configuration', () => {
      expect(global.HUB_CONFIG.api).toBeDefined();
      expect(global.HUB_CONFIG.api.defaultModel).toContain('claude');
      expect(global.HUB_CONFIG.api.lightModel).toContain('claude');
      expect(global.HUB_CONFIG.api.anthropicVersion).toBe('2023-06-01');
    });

    it('contains limits', () => {
      expect(global.HUB_CONFIG.limits).toBeDefined();
      expect(global.HUB_CONFIG.limits.maxReceipts).toBe(100);
      expect(global.HUB_CONFIG.limits.maxSwmsHistory).toBe(20);
      expect(global.HUB_CONFIG.limits.statusRefreshMs).toBe(30000);
      expect(global.HUB_CONFIG.limits.autoUpdateCooldownDays).toBe(7);
    });

    it('contains defaults', () => {
      expect(global.HUB_CONFIG.defaults).toBeDefined();
      expect(global.HUB_CONFIG.defaults.weatherLat).toBeCloseTo(-33.87, 1);
      expect(global.HUB_CONFIG.defaults.weatherLon).toBeCloseTo(151.21, 1);
      expect(global.HUB_CONFIG.defaults.defaultTemp).toBe(20);
    });
  });

  describe('NAV_SECTIONS', () => {
    it('contains all 9 sections in correct order', () => {
      const blocks = extractScriptBlocks();
      const code = blocks.join('\n');
      const match = code.match(/const NAV_SECTIONS\s*=\s*\[([^\]]+)\]/);
      expect(match).not.toBeNull();
      const sections = match[1].replace(/'/g, '').split(',').map(s => s.trim());
      expect(sections).toEqual([
        'dashboard', 'hobart', 'igor', 'chuck',
        'brittany', 'hanna', 'victor', 'frank', 'settings'
      ]);
    });
  });

  describe('showSection()', () => {
    beforeEach(() => {
      // Set up minimal DOM
      document.body.innerHTML = `
        <div class="nav-tabs">
          <button class="nav-tab active">Dash</button>
          <button class="nav-tab">Hobart</button>
          <button class="nav-tab">Igor</button>
        </div>
        <div id="dashboard" class="agent-section active"></div>
        <div id="hobart" class="agent-section"></div>
        <div id="igor" class="agent-section"></div>
      `;

      // Mock dependent functions
      global.loadSettingsData = jest.fn();
      global.loadApiKeyStatus = jest.fn();
      global.dashboardRefresh = jest.fn();
      global.NAV_SECTIONS = ['dashboard', 'hobart', 'igor'];

      loadHubFunctions(['showSection'], { quiet: true });
    });

    it('activates the target section', () => {
      global.showSection('hobart');
      expect(document.getElementById('hobart').classList.contains('active')).toBe(true);
    });

    it('deactivates other sections', () => {
      global.showSection('hobart');
      expect(document.getElementById('dashboard').classList.contains('active')).toBe(false);
    });

    it('calls dashboardRefresh when switching to dashboard', () => {
      global.showSection('dashboard');
      expect(global.dashboardRefresh).toHaveBeenCalled();
    });

    it('calls loadSettingsData when switching to settings', () => {
      document.body.innerHTML += '<div id="settings" class="agent-section"></div>';
      global.NAV_SECTIONS.push('settings');
      global.showSection('settings');
      expect(global.loadSettingsData).toHaveBeenCalled();
      expect(global.loadApiKeyStatus).toHaveBeenCalled();
    });

    it('handles unknown section gracefully', () => {
      expect(() => global.showSection('nonexistent')).not.toThrow();
    });
  });
});
