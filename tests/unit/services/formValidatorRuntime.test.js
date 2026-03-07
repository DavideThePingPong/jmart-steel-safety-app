/**
 * Tests for js/formValidator.js — window.formValidator (IIFE)
 *
 * Covers: sanitize, sanitizeForm, escapeHtml, isPresent,
 *         and the REGRESSION fix for <style> and <form> tag stripping.
 */
const loadScript = require('../../helpers/loadScript');

// Load the IIFE — it assigns to window.formValidator
loadScript('js/formValidator.js');

// Alias for convenience
const fv = window.formValidator;

describe('formValidator', () => {
  // -------------------------------------------------------
  // sanitize — XSS protection
  // -------------------------------------------------------
  describe('sanitize', () => {
    it('should strip <script> tags and their content', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      expect(fv.sanitize(input)).toBe('Hello  World');
    });

    it('should strip inline event handlers (onXxx=)', () => {
      const input = '<div onclick="alert(1)">Click</div>';
      const result = fv.sanitize(input);
      expect(result).not.toContain('onclick');
    });

    it('should strip javascript: URIs', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const result = fv.sanitize(input);
      expect(result).not.toMatch(/javascript\s*:/i);
    });

    it('should strip <iframe> tags', () => {
      const input = 'Before<iframe src="evil.com"></iframe>After';
      expect(fv.sanitize(input)).toBe('BeforeAfter');
    });

    it('should strip <object> tags', () => {
      const input = 'A<object data="x">payload</object>B';
      expect(fv.sanitize(input)).toBe('AB');
    });

    it('should strip <embed> tags', () => {
      const input = 'X<embed src="bad.swf">Y';
      expect(fv.sanitize(input)).toBe('XY');
    });

    it('should strip <link> tags', () => {
      const input = 'A<link rel="stylesheet" href="evil.css">B';
      expect(fv.sanitize(input)).toBe('AB');
    });

    it('should strip <style> tags and their content [REGRESSION]', () => {
      const input = 'Hello<style>body{display:none}</style>World';
      expect(fv.sanitize(input)).toBe('HelloWorld');
    });

    it('should strip <form> tags and their content [REGRESSION]', () => {
      const input = 'Before<form action="evil.com"><input></form>After';
      expect(fv.sanitize(input)).toBe('BeforeAfter');
    });

    it('should strip data:text/html patterns', () => {
      const input = 'data:text/html,<h1>evil</h1>';
      const result = fv.sanitize(input);
      expect(result).not.toMatch(/data\s*:\s*text\/html/i);
    });

    it('should return non-string values unchanged', () => {
      expect(fv.sanitize(42)).toBe(42);
      expect(fv.sanitize(true)).toBe(true);
      expect(fv.sanitize(null)).toBeNull();
      expect(fv.sanitize(undefined)).toBeUndefined();
    });

    it('should trim whitespace from sanitized output', () => {
      expect(fv.sanitize('  hello  ')).toBe('hello');
    });
  });

  // -------------------------------------------------------
  // sanitizeForm — recursive object sanitization
  // -------------------------------------------------------
  describe('sanitizeForm', () => {
    it('should sanitize all string fields in a flat object', () => {
      const form = {
        name: 'David',
        note: 'Check <script>alert(1)</script> this'
      };
      const clean = fv.sanitizeForm(form);
      expect(clean.name).toBe('David');
      expect(clean.note).not.toContain('<script>');
    });

    it('should recursively sanitize nested objects', () => {
      const form = {
        meta: {
          comment: '<iframe src="x"></iframe>Safe text'
        }
      };
      const clean = fv.sanitizeForm(form);
      expect(clean.meta.comment).toBe('Safe text');
    });

    it('should handle arrays', () => {
      const form = ['<script>x</script>', 'clean'];
      const clean = fv.sanitizeForm(form);
      expect(Array.isArray(clean)).toBe(true);
      expect(clean[0]).toBe('');
      expect(clean[1]).toBe('clean');
    });

    it('should return non-object values unchanged', () => {
      expect(fv.sanitizeForm(null)).toBeNull();
      expect(fv.sanitizeForm(undefined)).toBeUndefined();
      expect(fv.sanitizeForm('string')).toBe('string');
    });

    it('should preserve non-string values (numbers, booleans)', () => {
      const form = { count: 5, active: true, name: 'Test' };
      const clean = fv.sanitizeForm(form);
      expect(clean.count).toBe(5);
      expect(clean.active).toBe(true);
    });
  });

  // -------------------------------------------------------
  // escapeHtml
  // -------------------------------------------------------
  describe('escapeHtml', () => {
    it('should escape &, <, >, ", and \'', () => {
      const input = '<div class="a" data-x=\'b\'>&</div>';
      const result = fv.escapeHtml(input);
      expect(result).toBe('&lt;div class=&quot;a&quot; data-x=&#39;b&#39;&gt;&amp;&lt;/div&gt;');
    });

    it('should return empty string for null and undefined', () => {
      expect(fv.escapeHtml(null)).toBe('');
      expect(fv.escapeHtml(undefined)).toBe('');
    });

    it('should convert non-string values to string first', () => {
      expect(fv.escapeHtml(123)).toBe('123');
    });
  });

  // -------------------------------------------------------
  // isPresent
  // -------------------------------------------------------
  describe('isPresent', () => {
    it('should return false for undefined, null, empty string', () => {
      expect(fv.isPresent(undefined)).toBe(false);
      expect(fv.isPresent(null)).toBe(false);
      expect(fv.isPresent('')).toBe(false);
    });

    it('should return false for whitespace-only strings', () => {
      expect(fv.isPresent('   ')).toBe(false);
    });

    it('should return false for empty arrays', () => {
      expect(fv.isPresent([])).toBe(false);
    });

    it('should return true for non-empty values', () => {
      expect(fv.isPresent('hello')).toBe(true);
      expect(fv.isPresent(0)).toBe(true);
      expect(fv.isPresent([1])).toBe(true);
    });
  });
});
