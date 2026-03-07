/**
 * loadScript - Evaluates a JS file into the Jest/jsdom global scope.
 *
 * This bridges the gap between the app's global-assignment pattern
 * (e.g., `const JobsManager = { ... }`) and Jest's module system.
 *
 * Usage:
 *   loadScript('js/intervalRegistry.js');
 *   // Now `IntervalRegistry` is available as a global (or on `window`)
 *
 * Options:
 *   stripAutoInit: array of patterns to comment out before eval
 *     e.g., ['JobsManager.init()', 'setTimeout(']
 *   globalizeConst: array of variable names to promote from const to global
 *     e.g., ['NetworkStatus', 'ToastNotifier']
 *     Replaces `const X =` with `global.X =` so tests can access them
 *   quiet: boolean - suppress console.log/warn during eval (default: false)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function loadScript(relPath, options = {}) {
  const absPath = path.resolve(ROOT, relPath);
  let code = fs.readFileSync(absPath, 'utf-8');

  // Strip auto-init lines that would fire during eval
  if (options.stripAutoInit) {
    for (const pattern of options.stripAutoInit) {
      // Comment out lines containing the pattern (outside of function bodies)
      code = code.split('\n').map(line => {
        const trimmed = line.trim();
        // Only strip top-level calls (not indented ones inside functions)
        if (trimmed.includes(pattern) && !line.startsWith(' ') && !line.startsWith('\t')) {
          return '// [STRIPPED BY TEST] ' + line;
        }
        // Also strip lines that start with the pattern directly
        if (trimmed.startsWith(pattern)) {
          return '// [STRIPPED BY TEST] ' + line;
        }
        return line;
      }).join('\n');
    }
  }

  // Promote const declarations to global assignments
  if (options.globalizeConst) {
    for (const name of options.globalizeConst) {
      code = code.replace(new RegExp(`^const ${name}\\s*=`, 'm'), `global.${name} =`);
    }
  }

  // Strip import/export statements (these files don't use them, but just in case)
  code = code.replace(/^export\s+/gm, '');

  // Optionally suppress console during eval
  const savedLog = console.log;
  const savedWarn = console.warn;
  if (options.quiet) {
    console.log = () => {};
    console.warn = () => {};
  }

  // Eval into global scope
  try {
    // Use Function constructor to avoid strict-mode issues with `const` redeclaration
    // Wrap in a function that executes with the global `this`
    const fn = new Function(code);
    fn.call(global);
  } catch (err) {
    // Fallback: try direct eval (handles `const` at top level)
    try {
      eval(code);
    } catch (evalErr) {
      throw new Error(`loadScript(${relPath}) failed:\n${evalErr.message}\nFirst error: ${err.message}`);
    }
  } finally {
    if (options.quiet) {
      console.log = savedLog;
      console.warn = savedWarn;
    }
  }
}

module.exports = loadScript;
