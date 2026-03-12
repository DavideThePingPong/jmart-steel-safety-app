/**
 * Hub Infrastructure Tests — new utilities added for 5-star improvements
 *
 * Tests: hubToast, hubLogError, loadSecureScript, firebaseSaveWithRetry, CSP
 */
const { extractScriptBlocks, loadHubFunctions } = require('../../helpers/loadHubScript');

describe('Hub Infrastructure', () => {
  describe('CSP Meta Tag', () => {
    it('has Content-Security-Policy meta tag', () => {
      const fs = require('fs');
      const html = fs.readFileSync(require('path').resolve(__dirname, '..', '..', '..', 'artsteel-hub.html'), 'utf-8');
      expect(html).toContain('Content-Security-Policy');
    });

    it('CSP allows Firebase domains', () => {
      const fs = require('fs');
      const html = fs.readFileSync(require('path').resolve(__dirname, '..', '..', '..', 'artsteel-hub.html'), 'utf-8');
      expect(html).toContain('*.firebaseio.com');
      expect(html).toContain('*.firebasedatabase.app');
    });

    it('CSP allows Anthropic API', () => {
      const fs = require('fs');
      const html = fs.readFileSync(require('path').resolve(__dirname, '..', '..', '..', 'artsteel-hub.html'), 'utf-8');
      expect(html).toContain('api.anthropic.com');
    });

    it('CSP allows CDN script sources', () => {
      const fs = require('fs');
      const html = fs.readFileSync(require('path').resolve(__dirname, '..', '..', '..', 'artsteel-hub.html'), 'utf-8');
      expect(html).toContain('cdn.jsdelivr.net');
      expect(html).toContain('cdnjs.cloudflare.com');
    });
  });

  describe('hubLogError()', () => {
    beforeEach(() => {
      global.HubErrors = [];
      loadHubFunctions(['hubLogError'], { quiet: true });
      // Re-init HubErrors since loadHubFunctions may overwrite
      if (!global.HubErrors) global.HubErrors = [];
    });

    it('is defined as a function', () => {
      expect(typeof global.hubLogError).toBe('function');
    });

    it('exists in the source code', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('function hubLogError(');
    });
  });

  describe('hubToast()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
      loadHubFunctions(['hubToast'], { quiet: true });
    });

    it('is defined as a function', () => {
      expect(typeof global.hubToast).toBe('function');
    });

    it('creates a toast container when first called', () => {
      global.hubToast('Test message', 'info');
      const container = document.getElementById('hubToastContainer');
      expect(container).not.toBeNull();
      expect(container.style.position).toBe('fixed');
    });

    it('adds a toast message to the container', () => {
      global.hubToast('Hello World', 'success');
      const container = document.getElementById('hubToastContainer');
      expect(container.children.length).toBe(1);
      expect(container.children[0].textContent).toContain('Hello World');
    });

    it('supports multiple toasts', () => {
      global.hubToast('First', 'info');
      global.hubToast('Second', 'warning');
      const container = document.getElementById('hubToastContainer');
      expect(container.children.length).toBe(2);
    });
  });

  describe('loadSecureScript()', () => {
    it('exists in the source code', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('function loadSecureScript(');
      expect(code).toContain('crossOrigin');
    });
  });

  describe('firebaseSaveWithRetry()', () => {
    it('exists in the source code', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('async function firebaseSaveWithRetry(');
    });

    it('retries on failure', () => {
      const code = extractScriptBlocks().join('\n');
      // Should have retry loop logic
      expect(code).toContain('attempt <= retries');
      expect(code).toContain('setTimeout');
    });
  });

  describe('Auth bypass fix', () => {
    it('catch block sets isAdmin to false (not true)', () => {
      const code = extractScriptBlocks().join('\n');
      // The auth error handler should NOT grant admin
      expect(code).toContain('this.isAdmin = false;');
      expect(code).toContain('admin: false, error:');
    });
  });

  describe('No remaining alert() calls', () => {
    it('no alert() in functional code (only in comments)', () => {
      const code = extractScriptBlocks().join('\n');
      const lines = code.split('\n');
      const alertLines = lines.filter(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return false;
        return /\balert\s*\(/.test(trimmed);
      });
      expect(alertLines.length).toBe(0);
    });
  });

  describe('No silent catch blocks', () => {
    it('no empty catch(e) {} blocks remain', () => {
      const code = extractScriptBlocks().join('\n');
      const emptyCatches = code.match(/catch\s*\(\w+\)\s*\{\s*\}/g) || [];
      expect(emptyCatches.length).toBe(0);
    });
  });

  describe('var usage eliminated', () => {
    it('no var declarations in script blocks', () => {
      const code = extractScriptBlocks().join('\n');
      // Count var declarations (not in comments or strings)
      const lines = code.split('\n');
      const varLines = lines.filter(line => {
        const trimmed = line.trim();
        // Skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return false;
        return /\bvar\s+\w/.test(trimmed);
      });
      expect(varLines.length).toBe(0);
    });
  });

  describe('Fuzzy search in Victor', () => {
    it('search uses token-based matching', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain('tokens');
      expect(code).toContain('.every(');
    });
  });

  describe('Lazy Firebase listeners', () => {
    it('showSection triggers sync functions on tab visit', () => {
      const code = extractScriptBlocks().join('\n');
      expect(code).toContain("id === 'hanna' && typeof hannaStartSync");
      expect(code).toContain("id === 'victor' && typeof victorStartSync");
      expect(code).toContain("id === 'frank' && typeof frankStartSync");
    });

    it('init no longer calls sync eagerly', () => {
      const code = extractScriptBlocks().join('\n');
      // The DOMContentLoaded block should not call sync directly anymore
      const initBlock = code.substring(code.lastIndexOf('DOMContentLoaded'));
      expect(initBlock).not.toContain('victorStartSync();\n        frankStartSync()');
    });
  });
});
