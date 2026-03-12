/**
 * Error Path & Edge Case Tests
 *
 * Tests: hubLogError ring buffer, firebaseSaveWithRetry failure paths,
 *        corrupt data handling, missing DOM elements, API error responses,
 *        script load failures, and boundary conditions.
 */
const { extractScriptBlocks, loadHubFunctions } = require('../../helpers/loadHubScript');

describe('Error Paths & Edge Cases', () => {
  describe('hubLogError ring buffer', () => {
    beforeEach(() => {
      global.HubErrors = [];
      loadHubFunctions(['hubLogError'], { quiet: true });
    });

    it('pushes entries to HubErrors array', () => {
      global.hubLogError('test', 'something broke');
      expect(global.HubErrors.length).toBe(1);
    });

    it('entry has context, message, severity, time', () => {
      global.hubLogError('firebase/save', new Error('network down'), 'error');
      const entry = global.HubErrors[0];
      expect(entry.context).toBe('firebase/save');
      expect(entry.message).toBe('network down');
      expect(entry.severity).toBe('error');
      expect(entry.time).toBeDefined();
    });

    it('handles Error objects (extracts message)', () => {
      global.hubLogError('test', new Error('fail'));
      expect(global.HubErrors[0].message).toBe('fail');
    });

    it('handles string errors', () => {
      global.hubLogError('test', 'string error');
      expect(global.HubErrors[0].message).toBe('string error');
    });

    it('defaults severity to warn', () => {
      global.hubLogError('test', 'oops');
      expect(global.HubErrors[0].severity).toBe('warn');
    });

    it('ring buffer caps at 50 entries', () => {
      for (let i = 0; i < 60; i++) {
        global.hubLogError('test', `error ${i}`);
      }
      expect(global.HubErrors.length).toBe(50);
      // First entry should be error #10 (0-9 shifted out)
      expect(global.HubErrors[0].message).toBe('error 10');
    });

    it('oldest entry removed when buffer overflows', () => {
      for (let i = 0; i < 51; i++) {
        global.hubLogError('test', `msg ${i}`);
      }
      expect(global.HubErrors[0].message).toBe('msg 1');
      expect(global.HubErrors[49].message).toBe('msg 50');
    });

    it('time is valid ISO string', () => {
      global.hubLogError('test', 'err');
      const time = global.HubErrors[0].time;
      expect(new Date(time).toISOString()).toBe(time);
    });
  });

  describe('hubToast edge cases', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      loadHubFunctions(['hubToast'], { quiet: true });
    });

    it('creates container only once', () => {
      global.hubToast('one', 'info');
      global.hubToast('two', 'info');
      const containers = document.querySelectorAll('#hubToastContainer');
      expect(containers.length).toBe(1);
    });

    it('supports all 4 toast types', () => {
      ['info', 'success', 'warning', 'error'].forEach(type => {
        global.hubToast(`msg-${type}`, type);
      });
      const container = document.getElementById('hubToastContainer');
      expect(container.children.length).toBe(4);
    });

    it('defaults to info type when not specified', () => {
      global.hubToast('test');
      const container = document.getElementById('hubToastContainer');
      expect(container.children.length).toBe(1);
    });

    it('handles special characters in message (XSS safe)', () => {
      global.hubToast('<script>alert(1)</script>', 'info');
      const container = document.getElementById('hubToastContainer');
      expect(container.innerHTML).not.toContain('<script>');
    });

    it('handles empty message', () => {
      global.hubToast('', 'info');
      const container = document.getElementById('hubToastContainer');
      expect(container.children.length).toBe(1);
    });
  });

  describe('firebaseSaveWithRetry source verification', () => {
    it('function signature includes retries parameter', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('async function firebaseSaveWithRetry(path, data, retries)');
    });

    it('defaults retries to 2', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('retries = retries || 2');
    });

    it('returns false when no firebaseDb', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('if (!firebaseDb) return false');
    });

    it('returns true on successful save', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('return true');
    });

    it('uses exponential backoff between retries', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('1000 * (attempt + 1)');
    });

    it('logs errors via hubLogError', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain("hubLogError('firebase/save'");
    });
  });

  describe('loadSecureScript source verification', () => {
    it('creates script element', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain("document.createElement('script')");
    });

    it('sets crossOrigin to anonymous', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain("crossOrigin = 'anonymous'");
    });

    it('returns a Promise', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('return new Promise');
    });

    it('has error handling for failed loads', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('onerror');
      expect(code).toContain('Failed to load script');
    });
  });

  describe('API error handling paths', () => {
    it('callClaudeAPI checks for API key first', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('No API key configured');
    });

    it('handles 401 (invalid key) with user message', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('Invalid API key');
    });

    it('handles 429 (rate limited) with user message', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('Rate limited');
    });

    it('handles generic API errors with status code', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain("'API error: ' + response.status");
    });
  });

  describe('escapeHtml security', () => {
    beforeEach(() => {
      loadHubFunctions(['escapeHtml'], { quiet: true });
    });

    it('escapes < and >', () => {
      expect(global.escapeHtml('<script>')).not.toContain('<script>');
    });

    it('escapes & character', () => {
      expect(global.escapeHtml('a&b')).toContain('&amp;');
    });

    it('escapes double quotes', () => {
      expect(global.escapeHtml('"hello"')).toContain('&quot;');
    });

    it('escapes single quotes', () => {
      const result = global.escapeHtml("it's");
      // Implementation uses &#39; (HTML entity for single quote)
      expect(result).toContain('&#39;');
    });

    it('handles empty string', () => {
      expect(global.escapeHtml('')).toBe('');
    });

    it('handles numbers by converting to string', () => {
      const result = global.escapeHtml(42);
      expect(result).toBe('42');
    });

    it('neutralises XSS by escaping angle brackets', () => {
      const input = '"><img src=x onerror=alert(1)>';
      const output = global.escapeHtml(input);
      // Tags are escaped so they can't be parsed as HTML
      expect(output).not.toContain('<img');
      expect(output).toContain('&lt;img');
    });
  });

  describe('Data validation on Firebase reads', () => {
    it('receipt filtering requires saved_at field', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('r.saved_at');
    });

    it('Array.isArray used for Firebase data validation', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('Array.isArray');
    });
  });

  describe('Missing DOM element safety', () => {
    it('dashboardRefresh checks element existence before setting', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('if (elOk)');
      expect(code).toContain('if (elAlert)');
      expect(code).toContain('if (elSwms)');
      expect(code).toContain('if (elRec)');
    });

    it('dashboardUpdateStatus checks each element', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('if (fbEl)');
      expect(code).toContain('if (apiEl)');
      expect(code).toContain('if (netEl)');
      expect(code).toContain('if (stEl)');
    });
  });
});
