/**
 * loadHubScript - Extracts and evaluates JavaScript from artsteel-hub.html
 *
 * The hub is a single HTML file with inline <script> blocks. This helper
 * extracts all JS from inside <script> tags and evals it into the Jest
 * global scope so functions/variables become testable.
 *
 * Options:
 *   extractOnly: array of function/variable names to extract individually
 *   skipInit: boolean - if true, strips DOMContentLoaded and auto-init code
 *   quiet: boolean - suppress console during eval
 */
const fs = require('fs');
const path = require('path');

const HUB_PATH = path.resolve(__dirname, '..', '..', 'artsteel-hub.html');

/**
 * Extract all inline <script> content from the hub HTML file.
 * Skips <script src="..."> external references.
 */
function extractScriptBlocks() {
  const html = fs.readFileSync(HUB_PATH, 'utf-8');
  const blocks = [];
  const regex = /<script>[\s\S]*?<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const content = match[0]
      .replace(/^<script>/i, '')
      .replace(/<\/script>$/i, '');
    blocks.push(content);
  }
  return blocks;
}

/**
 * Extract a specific function from the hub source.
 * Returns the function source code as a string.
 */
function extractFunction(name) {
  const blocks = extractScriptBlocks();
  const allCode = blocks.join('\n');

  // Try arrow/const pattern first: const name = (...) => {
  const constArrow = new RegExp(`(const|let|var)\\s+${name}\\s*=\\s*(?:async\\s+)?(?:\\([^)]*\\)|\\w+)\\s*=>`, 'm');
  // Then try regular function: function name(...)
  const funcDecl = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`, 'm');

  let startIdx = -1;
  let match;

  match = allCode.match(constArrow);
  if (match) startIdx = match.index;

  if (startIdx === -1) {
    match = allCode.match(funcDecl);
    if (match) startIdx = match.index;
  }

  if (startIdx === -1) {
    // Try object pattern: name: function(...) or name(...) {
    const objMethod = new RegExp(`${name}\\s*(?::\\s*(?:async\\s+)?function)?\\s*\\(`, 'm');
    match = allCode.match(objMethod);
    if (match) startIdx = match.index;
  }

  if (startIdx === -1) return null;

  // Find the function body's opening brace (skip parameter default values like `= {}`)
  // We need to find the `{` that starts the function body, which comes after the `)` closing params
  let bodyStart = startIdx;
  let parenCount = 0;
  let foundParens = false;

  for (let i = startIdx; i < allCode.length; i++) {
    if (allCode[i] === '(') { parenCount++; foundParens = true; }
    if (allCode[i] === ')') parenCount--;
    if (foundParens && parenCount === 0) {
      // Found end of params - now find the opening brace of the body
      for (let j = i + 1; j < allCode.length; j++) {
        if (allCode[j] === '{') { bodyStart = j; break; }
        // Skip whitespace, `=>`, and other chars between `)` and `{`
      }
      break;
    }
  }

  // Find the matching closing brace from the body start
  let braceCount = 0;
  let started = false;
  let endIdx = bodyStart;

  for (let i = bodyStart; i < allCode.length; i++) {
    if (allCode[i] === '{') { braceCount++; started = true; }
    if (allCode[i] === '}') braceCount--;
    if (started && braceCount === 0) { endIdx = i + 1; break; }
  }

  return allCode.substring(startIdx, endIdx);
}

/**
 * Extract a named constant/object declaration from hub source.
 */
function extractConstant(name) {
  const blocks = extractScriptBlocks();
  const allCode = blocks.join('\n');

  const pattern = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*`, 'm');
  const match = allCode.match(pattern);
  if (!match) return null;

  const startIdx = match.index;

  // Detect if it starts with { or [
  const afterEquals = allCode.substring(match.index + match[0].length).trimStart();
  if (afterEquals[0] === '{' || afterEquals[0] === '[') {
    // Find matching close
    const open = afterEquals[0];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let started = false;
    for (let i = startIdx; i < allCode.length; i++) {
      if (allCode[i] === open) { depth++; started = true; }
      if (allCode[i] === close) depth--;
      if (started && depth === 0) {
        return allCode.substring(startIdx, i + 2); // include semicolon
      }
    }
  }

  // Simple value - find semicolon or newline
  const endMatch = allCode.substring(startIdx).match(/;|\n/);
  if (endMatch) return allCode.substring(startIdx, startIdx + endMatch.index + 1);
  return null;
}

/**
 * Load specific functions and data into the global scope for testing.
 * This is the primary method for hub tests.
 *
 * @param {string[]} names - Function/constant names to extract and evaluate
 * @param {object} options - { quiet: boolean, globals: object }
 */
function loadHubFunctions(names, options = {}) {
  // Set up any pre-requisite globals
  if (options.globals) {
    Object.assign(global, options.globals);
  }

  const blocks = extractScriptBlocks();
  const allCode = blocks.join('\n');

  const savedLog = console.log;
  const savedWarn = console.warn;
  if (options.quiet) {
    console.log = () => {};
    console.warn = () => {};
  }

  try {
    for (const name of names) {
      const funcSrc = extractFunction(name);
      if (funcSrc) {
        // Convert to global assignment
        const globalSrc = funcSrc
          .replace(/^(const|let|var)\s+/, 'global.')
          .replace(/^(async\s+)?function\s+/, 'global.$1');

        // Fix: async function → global.name = async function
        const fixedSrc = funcSrc.startsWith('async function') || funcSrc.startsWith('function')
          ? funcSrc.replace(/^(async\s+)?function\s+(\w+)/, 'global.$2 = $1function')
          : funcSrc.replace(/^(const|let|var)\s+(\w+)/, 'global.$2');

        try {
          eval(fixedSrc);
        } catch (e) {
          // If eval fails, wrap in a function context
          try {
            const fn = new Function(fixedSrc);
            fn.call(global);
          } catch (e2) {
            if (!options.quiet) console.warn(`Failed to load function ${name}:`, e2.message);
          }
        }
        continue;
      }

      // Try as constant
      const constSrc = extractConstant(name);
      if (constSrc) {
        const globalConst = constSrc.replace(/^(const|let|var)\s+(\w+)/, 'global.$2');
        try {
          eval(globalConst);
        } catch (e) {
          if (!options.quiet) console.warn(`Failed to load constant ${name}:`, e.message);
        }
      }
    }
  } finally {
    if (options.quiet) {
      console.log = savedLog;
      console.warn = savedWarn;
    }
  }
}

module.exports = { extractScriptBlocks, extractFunction, extractConstant, loadHubFunctions };
