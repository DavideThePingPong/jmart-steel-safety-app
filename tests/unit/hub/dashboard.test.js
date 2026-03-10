/**
 * Dashboard Tests - Stats display and status indicators
 */
const { extractScriptBlocks, loadHubFunctions } = require('../../helpers/loadHubScript');

describe('Dashboard', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span id="dashMsdsOk">0</span>
      <span id="dashMsdsAlert">0</span>
      <span id="dashSwmsCount">0</span>
      <span id="dashReceiptMonth">0</span>
      <span id="dashSpendMonth">$0</span>
      <div id="dashActivityFeed"></div>
      <span id="hubFirebaseStatus"></span>
      <span id="hubApiStatus"></span>
      <span id="hubNetStatus"></span>
      <span id="hubStorageStatus"></span>
    `;

    // Set up globals that dashboard depends on
    global.victorProducts = [];
    global.victorCalcCompliance = jest.fn(() => 'current');
    global.frankHistory = [];
    global.hannaReceipts = [];
    global.firebaseDb = null;
    global.firebaseAuthUid = null;
    global.getApiKey = jest.fn(() => null);
    global.escapeHtml = (s) => String(s || '');

    loadHubFunctions(['dashboardRefresh', 'dashboardUpdateStatus'], { quiet: true });
  });

  describe('dashboardRefresh()', () => {
    it('displays MSDS stats from victorProducts', () => {
      global.victorProducts = [
        { msds_date: '2024-01-01' },
        { msds_date: '2024-01-01' },
        { msds_date: '2020-01-01' }
      ];
      global.victorCalcCompliance
        .mockReturnValueOnce('current')
        .mockReturnValueOnce('current')
        .mockReturnValueOnce('expired');

      global.dashboardRefresh();

      expect(document.getElementById('dashMsdsOk').textContent).toBe('2');
      expect(document.getElementById('dashMsdsAlert').textContent).toBe('1');
    });

    it('displays SWMS count', () => {
      global.frankHistory = [{ date: '2026-01-01' }, { date: '2026-02-01' }];
      global.dashboardRefresh();
      expect(document.getElementById('dashSwmsCount').textContent).toBe('2');
    });

    it('displays receipts this month', () => {
      const now = new Date();
      global.hannaReceipts = [
        { saved_at: now.toISOString(), total: 100 },
        { saved_at: now.toISOString(), total: 50 },
        { saved_at: '2020-01-01T00:00:00Z', total: 200 } // old receipt
      ];
      global.dashboardRefresh();
      expect(document.getElementById('dashReceiptMonth').textContent).toBe('2');
      expect(document.getElementById('dashSpendMonth').textContent).toBe('$150');
    });

    it('handles empty data gracefully', () => {
      global.victorProducts = [];
      global.frankHistory = [];
      global.hannaReceipts = [];
      expect(() => global.dashboardRefresh()).not.toThrow();
    });

    it('shows empty activity message when no history', () => {
      global.dashboardRefresh();
      expect(document.getElementById('dashActivityFeed').innerHTML).toContain('No recent activity');
    });
  });

  describe('dashboardUpdateStatus()', () => {
    it('shows connected when Firebase and auth available', () => {
      global.firebaseDb = {};
      global.firebaseAuthUid = 'test-uid';
      global.dashboardUpdateStatus();
      const el = document.getElementById('hubFirebaseStatus');
      expect(el.textContent).toContain('Connected');
      expect(el.style.color).toBe('rgb(76, 175, 80)');
    });

    it('shows No Auth when Firebase but no auth', () => {
      global.firebaseDb = {};
      global.firebaseAuthUid = null;
      global.dashboardUpdateStatus();
      expect(document.getElementById('hubFirebaseStatus').textContent).toContain('No Auth');
    });

    it('shows Offline when no Firebase', () => {
      global.firebaseDb = null;
      global.dashboardUpdateStatus();
      expect(document.getElementById('hubFirebaseStatus').textContent).toContain('Offline');
    });

    it('shows API key status', () => {
      global.getApiKey = jest.fn(() => 'sk-test');
      global.dashboardUpdateStatus();
      const el = document.getElementById('hubApiStatus');
      expect(el.textContent).toContain('Ready');
      expect(el.style.color).toBe('rgb(76, 175, 80)');
    });

    it('shows No Key when API key missing', () => {
      global.getApiKey = jest.fn(() => null);
      global.dashboardUpdateStatus();
      expect(document.getElementById('hubApiStatus').textContent).toContain('No Key');
    });

    it('shows online network status', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      global.dashboardUpdateStatus();
      expect(document.getElementById('hubNetStatus').textContent).toContain('Online');
    });
  });
});
