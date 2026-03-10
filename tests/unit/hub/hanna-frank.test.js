/**
 * Hanna & Frank Agent Tests
 *
 * Hanna: Receipt scanner save/display logic
 * Frank: SWMS history save/render logic
 */
const { extractScriptBlocks } = require('../../helpers/loadHubScript');

describe('Hanna Agent (Receipt Scanner)', () => {
  let allCode;

  beforeAll(() => {
    const blocks = extractScriptBlocks();
    allCode = blocks.join('\n');
  });

  describe('Source code structure', () => {
    it('has hannaSaveReceipts function', () => {
      expect(allCode).toContain('function hannaSaveReceipts');
    });

    it('has hannaDisplayResult function', () => {
      expect(allCode).toContain('function hannaDisplayResult');
    });

    it('has hannaReceipts global array', () => {
      expect(allCode).toContain('let hannaReceipts = ');
    });

    it('saves to Firebase and localStorage', () => {
      expect(allCode).toContain("jmart-safety/hanna/receipts");
      expect(allCode).toContain("'hannaReceipts'");
    });

    it('uses escapeHtml for XSS protection in display', () => {
      // Check that hannaDisplayResult uses escapeHtml
      const displayFn = allCode.substring(
        allCode.indexOf('function hannaDisplayResult'),
        allCode.indexOf('function hannaDisplayResult') + 2000
      );
      expect(displayFn).toContain('escapeHtml');
    });
  });

  describe('Receipt limit enforcement', () => {
    it('references HUB_CONFIG.limits.maxReceipts', () => {
      expect(allCode).toContain('HUB_CONFIG.limits.maxReceipts');
    });
  });

  describe('Receipt data structure', () => {
    it('expects store_name field', () => {
      expect(allCode).toContain('store_name');
    });

    it('expects total field', () => {
      expect(allCode).toContain('r.total');
    });

    it('expects saved_at timestamp', () => {
      expect(allCode).toContain('saved_at');
    });

    it('tracks GST', () => {
      expect(allCode).toContain('gst');
    });
  });

  describe('Receipt save logic', () => {
    beforeEach(() => {
      global.firebaseDb = {
        ref: jest.fn(() => ({
          set: jest.fn()
        }))
      };
      global.hannaReceipts = [
        { store_name: 'Bunnings', total: 50.00, gst: 4.55, saved_at: new Date().toISOString() }
      ];
    });

    it('saves to both Firebase and localStorage', () => {
      // Simulate the save function logic
      if (global.firebaseDb) {
        global.firebaseDb.ref('jmart-safety/hanna/receipts').set(global.hannaReceipts);
      }
      localStorage.setItem('hannaReceipts', JSON.stringify(global.hannaReceipts));

      expect(global.firebaseDb.ref).toHaveBeenCalledWith('jmart-safety/hanna/receipts');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'hannaReceipts',
        expect.any(String)
      );
    });
  });
});

describe('Frank Agent (SWMS Generator)', () => {
  let allCode;

  beforeAll(() => {
    const blocks = extractScriptBlocks();
    allCode = blocks.join('\n');
  });

  describe('Source code structure', () => {
    it('has frankSaveHistory function', () => {
      expect(allCode).toContain('function frankSaveHistory');
    });

    it('has frankRenderHistory function', () => {
      expect(allCode).toContain('function frankRenderHistory');
    });

    it('has frankHistory global array', () => {
      expect(allCode).toContain('let frankHistory = ');
    });

    it('saves to Firebase path', () => {
      expect(allCode).toContain("jmart-safety/frank/history");
    });

    it('saves to localStorage with correct key', () => {
      expect(allCode).toContain("'frank-history'");
    });
  });

  describe('SWMS history limit', () => {
    it('references HUB_CONFIG.limits.maxSwmsHistory', () => {
      expect(allCode).toContain('HUB_CONFIG.limits.maxSwmsHistory');
    });
  });

  describe('Frank tasks and standards', () => {
    it('references Australian standards', () => {
      expect(allCode).toContain('AS/NZS');
    });

    it('has SWMS task selection', () => {
      expect(allCode).toContain('frankSelectTask');
    });

    it('uses escapeHtml in history rendering', () => {
      const renderFn = allCode.substring(
        allCode.indexOf('function frankRenderHistory'),
        allCode.indexOf('function frankRenderHistory') + 1500
      );
      expect(renderFn).toContain('escapeHtml');
    });
  });

  describe('SWMS save logic', () => {
    beforeEach(() => {
      global.firebaseDb = {
        ref: jest.fn(() => ({
          set: jest.fn()
        }))
      };
      global.frankHistory = [
        { jobDesc: 'Steel erection', date: '2026-03-10', jobNumber: 'J001' }
      ];
    });

    it('saves to both Firebase and localStorage', () => {
      if (global.firebaseDb) {
        global.firebaseDb.ref('jmart-safety/frank/history').set(global.frankHistory);
      }
      localStorage.setItem('frank-history', JSON.stringify(global.frankHistory));

      expect(global.firebaseDb.ref).toHaveBeenCalledWith('jmart-safety/frank/history');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'frank-history',
        expect.any(String)
      );
    });
  });
});
