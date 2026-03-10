# J&M Artsteel Hub - Comprehensive Audit Report

**Date:** 2026-03-10
**File Audited:** `artsteel-hub.html` (7,597 lines)
**Auditor:** Claude Code

---

## Overall Rating: 3.5 / 5 Stars

The hub is a genuinely impressive single-file application with 7 specialized "agents" for steel operations. It packs enormous domain-specific value. But there are architectural, security, and code quality issues that hold it back.

---

## Category Breakdown

### 1. FUNCTIONALITY & FEATURES - 4.5/5

**Excellent:**
- 7 specialized agents (HOBART, IGOR, CHUCK, BRITTANY, HANNA, VICTOR, FRANK) each solving real problems
- HOBART: Complete Hollo-Bolt reference with visual grip range diagram, tube finder reverse-lookup
- IGOR: 543 steel sections across 14 types, full Excel export with ExcelJS (multi-sheet, dropdowns, VLOOKUP), pricing module with CSV/Excel/PDF import + column mapping
- CHUCK: Hilti anchor calculator with live weather/temperature (Open-Meteo API), cure timer with notifications and audio
- BRITTANY: Full anchor design calculator with professional AS5216-compliant engineering report (downloadable HTML)
- HANNA: AI receipt scanner with Claude Vision API, Firebase sync, GST tracking
- VICTOR: MSDS register with AI auto-update engine, 2nd-Sunday retry logic, SDS portal lookup
- FRANK: AI SWMS generator with worker sign-off, Australian standards references
- Dashboard with live stats, activity feed, storage usage, connection status
- Keyboard shortcuts (Ctrl+0-8)

**Minor issues:**
- MSDS Smart Search uses `indexOf` instead of fuzzy matching
- Frank's `frankSelectTask` has fragile matching logic

---

### 2. SECURITY - 3/5

**Good:**
- `escapeHtml()` used consistently throughout (XSS protection solid)
- API key validation for `sk-` prefix
- Device auth system checks Firebase before rendering app
- `el()` helper uses `textContent` for safe DOM in settings

**Concerns:**
- API key exposed via `anthropic-dangerous-direct-browser-access` header (visible in DevTools)
- Auth bypass on error: Firebase error = full access + admin (lines 99-102, 143-145)
- Dynamic CDN script loading without SRI hashes (ExcelJS, SheetJS, PDF.js)
- No CSP headers in the HTML

---

### 3. CODE ARCHITECTURE - 2.5/5

**Issues:**
- 7,597 lines in a single HTML file (intentional for PWA/offline but hurts maintainability)
- No module system - all functions in global scope
- Duplicated bolt type/size selection UI pattern across HOBART, CHUCK, BRITTANY
- Mixed coding styles (var/let/const, arrow/function, getElementById/querySelector)
- Dead CSS: `.grip-range` (line 1684), empty `.igor-totals` (line 974)
- `console` variable shadows global console object (line 4299) - **BUG**

**Mitigating:**
- Well-organized with clear section separators
- Each agent's functions grouped logically
- Single-file is intentional per CLAUDE.md

---

### 4. DATA INTEGRITY & SYNC - 3.5/5

**Good:**
- Firebase real-time listeners for cross-device sync (Victor, Frank, Hanna)
- localStorage fallback for offline
- Seed data for Victor (17 SDS products)
- Receipt limit (100) and SWMS history limit (20)

**Concerns:**
- `set()` used for receipts - simultaneous saves from two devices causes overwrites
- No conflict resolution on Firebase data
- Array-based storage in Firebase (indices shift on delete)
- No validation on Firebase reads

---

### 5. UI/UX - 4/5

**Excellent:**
- Beautiful dark theme with gradients
- Responsive design with mobile breakpoints
- Color-coded status indicators
- Interactive grip range visualization
- Progress bars, loading animations, status badges
- Smart search dropdown for MSDS

**Issues:**
- `alert()` used instead of inline UI notifications in many places
- No undo for destructive actions
- Print opens new window instead of using `@media print`

---

### 6. ERROR HANDLING - 3/5

**Good:**
- Try/catch around Firebase operations
- Fallback to demo data when API unavailable
- Weather API fallback to Sydney defaults
- Rate limit handling for Claude API
- Auto-update cooldown logic

**Issues:**
- Silent error swallowing in dashboard (empty catch blocks, lines 3140-3199)
- No retry logic for failed Firebase writes
- `console` shadowing bug at line 4299

---

### 7. PERFORMANCE - 3.5/5

**Good:**
- Vanilla JS (no framework overhead)
- Lazy-loading of ExcelJS, SheetJS, PDF.js
- 30-second status refresh (reasonable)
- Firebase `.on('value')` for real-time without polling

**Concerns:**
- 364KB HTML file (caches well but large initial download)
- Embedded data blocks are large
- No virtual scrolling for long lists
- Full innerHTML rebuilds on every filter change
- All Firebase listeners active even when sections hidden

---

### 8. TESTING & MAINTAINABILITY - 2/5

- No tests for the hub
- No TypeScript or JSDoc
- Hardcoded company details (address, phone, ABN)
- Hardcoded Claude model names will go stale (`claude-3-5-haiku-20241022`, `claude-sonnet-4-5-20250929`)
- No versioning for the hub file

---

## Critical Findings

| Priority | Issue | Location |
|----------|-------|----------|
| HIGH | `console` variable shadows global console | Line 4299 |
| HIGH | Auth bypass on error gives full admin access | Lines 99-102, 143-145 |
| HIGH | No SRI hashes on CDN scripts | Lines 3636, 4362, 4413 |
| MEDIUM | Firebase array storage prone to race conditions | Lines 5919, 7197 |
| MEDIUM | Silent error swallowing in dashboard | Lines 3140-3199 |
| MEDIUM | Hardcoded Claude model versions will go stale | Lines 6020, 7377 |
| LOW | Dead CSS rules | Lines 974, 1684-1686 |
| LOW | Mixed var/let/const usage | Throughout |
| LOW | `alert()` instead of inline notifications | Multiple |

---

## Recommendations (Priority Order)

1. Fix the `console` shadowing bug at line 4299
2. Add SRI hashes to CDN script loads
3. Replace Firebase `set()` with transaction-safe operations for shared data
4. Update Claude model names to latest versions
5. Add basic error logging instead of silent catches
6. Remove dead CSS
7. Consider splitting embedded data into separate cached JS files
