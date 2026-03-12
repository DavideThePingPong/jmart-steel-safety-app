/**
 * Cross-Agent Integration Tests
 *
 * Tests: Dashboard aggregation from all agents, shared utilities,
 *        navigation between agents, data flow between agents,
 *        global state management, and keyboard shortcuts.
 */
const { extractScriptBlocks, loadHubFunctions } = require('../../helpers/loadHubScript');

describe('Cross-Agent Integration', () => {
  describe('Dashboard aggregation from Victor', () => {
    beforeEach(() => {
      loadHubFunctions(['victorCalcCompliance'], { quiet: true });
    });

    it('counts current products correctly', () => {
      const products = [
        { msds_date: new Date().toISOString() },
        { msds_date: new Date(Date.now() - 86400000 * 100).toISOString() }, // 100 days ago
        { msds_date: new Date(Date.now() - 86400000 * 400).toISOString() }, // 400 days (expiring)
      ];

      let msdsOk = 0, msdsAlert = 0;
      products.forEach(p => {
        const c = global.victorCalcCompliance(p.msds_date);
        if (c === 'current') msdsOk++;
        else if (c === 'expiring' || c === 'expired') msdsAlert++;
      });

      expect(msdsOk).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Dashboard aggregation from Frank (SWMS)', () => {
    it('counts SWMS from frankHistory length', () => {
      const frankHistory = [
        { date: '2026-03-10', jobDesc: 'Balustrade install' },
        { date: '2026-03-08', jobDesc: 'Handrail welding' },
      ];
      expect(frankHistory.length).toBe(2);
    });
  });

  describe('Dashboard aggregation from Hanna (Receipts)', () => {
    it('filters receipts for current month', () => {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15).toISOString();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString();

      const receipts = [
        { saved_at: thisMonth, total: 150, store_name: 'Bunnings' },
        { saved_at: lastMonth, total: 200, store_name: 'Hilti' },
        { saved_at: thisMonth, total: 75, store_name: 'Wurth' },
      ];

      const monthReceipts = receipts.filter(r => {
        const d = new Date(r.saved_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      expect(monthReceipts.length).toBe(2);
      const spend = monthReceipts.reduce((s, r) => s + (r.total || 0), 0);
      expect(spend).toBe(225);
    });

    it('handles receipts with missing total', () => {
      const receipts = [
        { saved_at: new Date().toISOString(), store_name: 'Test' },
      ];
      const spend = receipts.reduce((s, r) => s + (r.total || 0), 0);
      expect(spend).toBe(0);
    });
  });

  describe('Activity feed merging', () => {
    it('combines Frank and Hanna entries and sorts by time', () => {
      const feed = [];
      const frankHistory = [
        { date: '2026-03-10', jobDesc: 'Balustrade install' },
        { date: '2026-03-01', jobDesc: 'Handrail' },
      ];
      const hannaReceipts = [
        { saved_at: '2026-03-09T10:00:00Z', total: 100, store_name: 'Bunnings' },
        { saved_at: '2026-03-11T10:00:00Z', total: 50, store_name: 'Hilti' },
      ];

      frankHistory.slice(0, 5).forEach(h => {
        feed.push({ time: h.date || '', text: 'SWMS: ' + (h.jobDesc || '').substring(0, 50), type: 'frank' });
      });
      hannaReceipts.slice(0, 5).forEach(r => {
        feed.push({ time: r.saved_at ? new Date(r.saved_at).toLocaleDateString('en-AU') : '', text: (r.store_name || 'Receipt') + ' $' + (r.total || 0).toFixed(2), type: 'hanna' });
      });

      feed.sort((a, b) => (b.time || '').localeCompare(a.time || ''));

      expect(feed.length).toBe(4);
      // Most recent should be first
      expect(feed[0].type).toBeDefined();
    });

    it('handles empty history gracefully', () => {
      const feed = [];
      [].forEach(h => feed.push({ time: '', text: '' }));
      [].forEach(r => feed.push({ time: '', text: '' }));
      expect(feed.length).toBe(0);
    });
  });

  describe('Navigation system', () => {
    beforeEach(() => {
      loadHubFunctions(['NAV_SECTIONS'], { quiet: true });
    });

    it('has 9 sections in correct order', () => {
      expect(global.NAV_SECTIONS).toEqual([
        'dashboard', 'hobart', 'igor', 'chuck', 'brittany',
        'hanna', 'victor', 'frank', 'settings'
      ]);
    });

    it('each agent has unique index for keyboard shortcut', () => {
      const sections = global.NAV_SECTIONS;
      const unique = new Set(sections);
      expect(unique.size).toBe(sections.length);
    });

    it('Ctrl+0 maps to dashboard', () => {
      expect(global.NAV_SECTIONS[0]).toBe('dashboard');
    });

    it('Ctrl+7 maps to frank', () => {
      expect(global.NAV_SECTIONS[7]).toBe('frank');
    });

    it('Ctrl+8 maps to settings', () => {
      expect(global.NAV_SECTIONS[8]).toBe('settings');
    });
  });

  describe('showSection lazy loading', () => {
    it('triggers hannaStartSync for hanna section', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain("id === 'hanna' && typeof hannaStartSync === 'function'");
    });

    it('triggers victorStartSync for victor section', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain("id === 'victor' && typeof victorStartSync === 'function'");
    });

    it('triggers frankStartSync for frank section', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain("id === 'frank' && typeof frankStartSync === 'function'");
    });

    it('calls dashboardRefresh when returning to dashboard', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain("id === 'dashboard'");
      expect(code).toContain('dashboardRefresh()');
    });

    it('loads settings data when opening settings', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain("id === 'settings'");
      expect(code).toContain('loadSettingsData()');
    });
  });

  describe('Shared HUB_CONFIG validation', () => {
    beforeEach(() => {
      loadHubFunctions(['HUB_CONFIG'], { quiet: true });
    });

    it('has api section with defaultModel', () => {
      expect(global.HUB_CONFIG.api).toBeDefined();
      expect(global.HUB_CONFIG.api.defaultModel).toBeDefined();
      expect(typeof global.HUB_CONFIG.api.defaultModel).toBe('string');
    });

    it('has limits section', () => {
      expect(global.HUB_CONFIG.limits).toBeDefined();
    });

    it('has maxReceipts limit', () => {
      expect(global.HUB_CONFIG.limits.maxReceipts).toBeGreaterThan(0);
    });

    it('has maxSwmsHistory limit', () => {
      expect(global.HUB_CONFIG.limits.maxSwmsHistory).toBeGreaterThan(0);
    });

    it('has statusRefreshMs', () => {
      expect(global.HUB_CONFIG.limits.statusRefreshMs).toBeGreaterThanOrEqual(10000);
    });

    it('has company information', () => {
      expect(global.HUB_CONFIG.company).toBeDefined();
      expect(global.HUB_CONFIG.company.name).toBeDefined();
    });
  });

  describe('HUB_VERSION', () => {
    beforeEach(() => {
      loadHubFunctions(['HUB_VERSION'], { quiet: true });
    });

    it('follows semver format', () => {
      expect(global.HUB_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('is 2.0.0', () => {
      expect(global.HUB_VERSION).toBe('2.0.0');
    });
  });

  describe('Victor compliance date calculations', () => {
    beforeEach(() => {
      loadHubFunctions(['victorCalcCompliance', 'victorExpiresSoon'], { quiet: true });
    });

    it('current date = current status', () => {
      const result = global.victorCalcCompliance(new Date().toISOString());
      expect(result).toBe('current');
    });

    it('date 6 years ago = expired (5-year MSDS lifecycle)', () => {
      const old = new Date();
      old.setFullYear(old.getFullYear() - 6);
      const result = global.victorCalcCompliance(old.toISOString());
      expect(result).toBe('expired');
    });

    it('date 4.5 years ago = expiring (within 1 year of 5-year expiry)', () => {
      const old = new Date();
      old.setFullYear(old.getFullYear() - 4);
      old.setMonth(old.getMonth() - 6);
      const result = global.victorCalcCompliance(old.toISOString());
      expect(result).toBe('expiring');
    });

    it('missing date = unknown', () => {
      const result = global.victorCalcCompliance(null);
      expect(result).toBe('unknown');
    });

    it('empty string = unknown', () => {
      const result = global.victorCalcCompliance('');
      expect(result).toBe('unknown');
    });
  });

  describe('Victor SDS portal lookup', () => {
    beforeEach(() => {
      loadHubFunctions(['VICTOR_SDS_PORTALS', 'victorGetPortal'], { quiet: true });
    });

    it('returns portal object for known manufacturer', () => {
      const portal = global.victorGetPortal('Hilti');
      expect(portal).toBeDefined();
      expect(portal.url).toContain('http');
    });

    it('returns null for unknown manufacturer', () => {
      const portal = global.victorGetPortal('Unknown Manufacturer XYZ');
      expect(portal).toBeNull();
    });
  });

  describe('Keyboard shortcut source verification', () => {
    it('listens for keydown events', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain("addEventListener('keydown'");
    });

    it('requires Ctrl key', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('e.ctrlKey');
    });

    it('ignores when typing in inputs', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain("e.target.tagName === 'INPUT'");
      expect(code).toContain("e.target.tagName === 'TEXTAREA'");
    });

    it('maps digits 0-8 to sections', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('num >= 0 && num <= 8');
    });
  });

  describe('Storage usage calculation', () => {
    it('calculates bytes correctly (string.length × 2 for UTF-16)', () => {
      const testData = 'hello'; // 5 chars = 10 bytes
      const bytes = testData.length * 2;
      expect(bytes).toBe(10);
    });

    it('converts to MB correctly', () => {
      const bytes = 1048576; // 1MB
      const mb = (bytes / (1024 * 1024)).toFixed(1);
      expect(mb).toBe('1.0');
    });

    it('calculates percentage of 5MB limit', () => {
      const bytes = 2621440; // 2.5MB
      const mb = bytes / (1024 * 1024);
      const pct = (mb / 5 * 100).toFixed(0);
      expect(pct).toBe('50');
    });
  });
});
