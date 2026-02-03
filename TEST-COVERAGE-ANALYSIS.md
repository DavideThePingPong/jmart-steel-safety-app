# Test Coverage Analysis: JMart Steel Safety App

**Analysis Date:** February 3, 2026
**Analyzed By:** Claude Code
**App Version:** v2.0 - PWA Edition

---

## Executive Summary

The JMart Steel Safety App currently has **zero test coverage**. There are no unit tests, integration tests, or end-to-end tests. No testing framework or infrastructure exists. Given that this is a safety-critical application used for workplace safety compliance in the construction/steel industry, this represents a significant risk.

### Current State

| Metric | Value |
|--------|-------|
| Test Files | 0 |
| Test Coverage | 0% |
| Testing Framework | None |
| CI/CD Pipeline | None |
| Test Configuration | None |

---

## Codebase Overview

### Technology Stack
- **Frontend:** React 18 (via CDN, runtime Babel compilation)
- **Backend:** Firebase Realtime Database
- **Storage:** Google Drive API, localStorage
- **PDF Generation:** jsPDF
- **Styling:** Tailwind CSS
- **Architecture:** Single-file PWA (~7,600 lines in index.html)

### Key Components Requiring Tests

| Component | Lines (approx) | Criticality | Risk if Untested |
|-----------|----------------|-------------|------------------|
| `JMartSteelSafetyApp` | 826 | HIGH | App state management failures |
| `Dashboard` | 1353 | HIGH | Navigation/form access issues |
| `PrestartView` | 592 | CRITICAL | Safety checklist failures |
| `IncidentView` | 158 | CRITICAL | Incident report data loss |
| `ToolboxView` | 242 | HIGH | Training documentation gaps |
| `SubcontractorInspectionView` | 214 | HIGH | Inspection compliance issues |
| `ITPFormView` | 341 | HIGH | Quality control failures |
| `SteelITPView` | 350 | HIGH | Steel-specific compliance gaps |
| `SignaturePad` | 100+ | CRITICAL | Signature capture/validation |
| `GoogleDriveSync` | 350+ | HIGH | Backup/sync failures |
| `FirebaseSync` | 200+ | CRITICAL | Data persistence failures |
| `PDFGenerator` | 400+ | HIGH | Audit documentation issues |

---

## Priority Test Areas

### Priority 1: CRITICAL (Implement First)

These areas directly impact safety compliance and data integrity.

#### 1.1 Form Validation Tests

**Why:** Forms can currently be submitted without critical safety data. Workers could start jobs without proper hazard assessment, violating WHS Act requirements.

**What to Test:**
```
- Pre-Start Checklist requires: site hazards, permits, SWMS coverage, high-risk work ID
- Incident Reports require: signature, date/time, witness info, immediate actions
- ITP Forms require: all checkpoint completions, manager signatures
- Toolbox Talks require: corrective actions when applicable
```

**Recommended Test Cases:**
1. Reject pre-start form without hazard identification
2. Reject pre-start form without SWMS confirmation
3. Reject incident report without signature
4. Reject incident report with future dates
5. Reject ITP without all checkpoints completed
6. Validate all required fields show error states when empty

#### 1.2 Data Persistence Tests

**Why:** Data sync can silently fail. Forms completed in the field may never reach the cloud, causing compliance gaps.

**What to Test:**
```
- localStorage saves form data correctly
- Firebase sync succeeds and data matches local
- Offline forms queue for sync when online
- Sync failures trigger retry mechanism
- Data survives page refresh
```

**Recommended Test Cases:**
1. Save form locally, verify retrieval
2. Submit form, verify Firebase receives correct data
3. Submit form offline, go online, verify sync completes
4. Simulate network failure, verify retry queue
5. Verify no data loss on rapid form submissions

#### 1.3 Signature Capture Tests

**Why:** Signatures can be reused by anyone without verification, enabling fraudulent sign-offs.

**What to Test:**
```
- Signature pad captures and stores signature data
- Saved signatures are associated with correct users
- Signature verification prevents unauthorized reuse
- Signature data is properly embedded in forms
```

**Recommended Test Cases:**
1. Draw signature, verify base64 data generated
2. Save signature, verify correct user association
3. Apply saved signature, verify it appears in form
4. Verify signature persists through form submission

### Priority 2: HIGH (Implement Second)

#### 2.1 PDF Generation Tests

**Why:** PDFs currently omit 70-80% of form data. Auditors receive incomplete documentation.

**What to Test:**
```
- All form fields appear in generated PDF
- Photos are embedded in PDF
- All signatures appear in PDF
- PDF formatting is correct and readable
- PDF generation doesn't throw errors
```

**Recommended Test Cases:**
1. Generate PDF from pre-start form, verify all fields present
2. Generate PDF with photos, verify images embedded
3. Generate PDF with multiple signatures, verify all appear
4. Generate PDF with maximum data, verify no truncation
5. Generate PDF with special characters, verify rendering

#### 2.2 Google Drive Sync Tests

**Why:** Backup failures are ignored. Backup may be incomplete without user awareness.

**What to Test:**
```
- Folder creation succeeds
- PDF upload completes
- Upload failures are reported to user
- Token refresh works on expiry
- Nested folder structure is created correctly
```

**Recommended Test Cases:**
1. Create JMart Steel folder, verify exists
2. Upload PDF, verify file in correct folder
3. Upload PDF to nested path, verify folder hierarchy
4. Simulate token expiry, verify refresh and retry
5. Simulate upload failure, verify error notification

#### 2.3 Offline Functionality Tests

**Why:** App completely fails offline because Babel isn't cached. Workers at remote sites cannot access safety information.

**What to Test:**
```
- Service worker caches required assets
- App loads offline with cached assets
- Forms can be created and saved offline
- Offline indicator is shown to users
- Photos queue for upload when offline
```

**Recommended Test Cases:**
1. Cache all CDN dependencies, verify offline access
2. Create form offline, verify local storage
3. Capture photo offline, verify queue for sync
4. Verify offline UI indicator displays correctly
5. Go offline mid-form, verify no data loss

### Priority 3: MEDIUM (Implement Third)

#### 3.1 UI Component Tests

**What to Test:**
```
- Navigation between views works correctly
- Form inputs accept and display data
- Error states display appropriately
- Loading states appear during async operations
- Responsive design works on mobile
```

#### 3.2 Authentication Tests (When Implemented)

**What to Test:**
```
- Login flow completes successfully
- Unauthorized users cannot access data
- Session expiry handled gracefully
- User identity associated with forms
```

#### 3.3 Audit Trail Tests (When Implemented)

**What to Test:**
```
- All CRUD operations are logged
- Logs include user identity and timestamp
- Logs cannot be modified or deleted
- Audit report generation works
```

---

## Recommended Testing Infrastructure

### Testing Framework Setup

Given the React-based architecture, I recommend:

```
Primary Framework: Jest + React Testing Library
E2E Testing: Playwright or Cypress
Coverage Tool: Jest built-in coverage
CI/CD: GitHub Actions
```

### Proposed Project Structure

```
jmart-steel-safety-app/
├── src/
│   ├── components/
│   │   ├── SignaturePad.jsx
│   │   ├── Dashboard.jsx
│   │   ├── forms/
│   │   │   ├── PrestartForm.jsx
│   │   │   ├── IncidentForm.jsx
│   │   │   └── ...
│   │   └── ...
│   ├── services/
│   │   ├── firebase.js
│   │   ├── googleDrive.js
│   │   ├── pdfGenerator.js
│   │   └── storage.js
│   ├── hooks/
│   │   ├── useOffline.js
│   │   └── useFormValidation.js
│   └── App.jsx
├── tests/
│   ├── unit/
│   │   ├── components/
│   │   ├── services/
│   │   └── hooks/
│   ├── integration/
│   │   ├── formSubmission.test.js
│   │   ├── dataSync.test.js
│   │   └── pdfGeneration.test.js
│   └── e2e/
│       ├── prestart-workflow.spec.js
│       ├── incident-report.spec.js
│       └── offline-mode.spec.js
├── package.json
├── jest.config.js
└── playwright.config.js
```

### Recommended package.json Test Configuration

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:ci": "jest --ci --coverage && playwright test"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "@playwright/test": "^1.40.0"
  }
}
```

---

## Specific Test Recommendations by Module

### 1. Form Validation Module

```javascript
// tests/unit/validation/prestartValidation.test.js

describe('Pre-Start Form Validation', () => {
  test('should reject form without site hazards identified', () => {
    const form = createPrestartForm({ siteHazards: null });
    expect(validatePrestartForm(form).isValid).toBe(false);
    expect(validatePrestartForm(form).errors).toContain('siteHazards');
  });

  test('should reject form without SWMS confirmation', () => {
    const form = createPrestartForm({ swmsConfirmed: false });
    expect(validatePrestartForm(form).isValid).toBe(false);
  });

  test('should reject form without supervisor signature', () => {
    const form = createPrestartForm({ supervisorSignature: null });
    expect(validatePrestartForm(form).isValid).toBe(false);
  });

  test('should accept complete valid form', () => {
    const form = createCompletePrestartForm();
    expect(validatePrestartForm(form).isValid).toBe(true);
  });
});
```

### 2. Firebase Sync Module

```javascript
// tests/integration/firebaseSync.test.js

describe('Firebase Sync', () => {
  test('should save form to Firebase successfully', async () => {
    const form = createValidForm();
    const result = await FirebaseSync.saveForm(form);
    expect(result.success).toBe(true);

    const retrieved = await FirebaseSync.getForm(form.id);
    expect(retrieved).toEqual(form);
  });

  test('should queue form when offline', async () => {
    mockOfflineStatus();
    const form = createValidForm();
    await FirebaseSync.saveForm(form);

    expect(FirebaseSync.getPendingQueue()).toContain(form.id);
  });

  test('should retry on sync failure', async () => {
    mockNetworkFailure();
    const form = createValidForm();
    await FirebaseSync.saveForm(form);

    expect(FirebaseSync.getRetryCount(form.id)).toBeGreaterThan(0);
  });
});
```

### 3. PDF Generator Module

```javascript
// tests/integration/pdfGenerator.test.js

describe('PDF Generator', () => {
  test('should include all form fields in PDF', async () => {
    const form = createCompletePrestartForm();
    const { doc, filename } = PDFGenerator.generate(form);
    const pdfText = await extractPDFText(doc);

    expect(pdfText).toContain(form.siteName);
    expect(pdfText).toContain(form.supervisorName);
    expect(pdfText).toContain(form.siteHazards);
  });

  test('should embed photos in PDF', async () => {
    const form = createFormWithPhotos();
    const { doc } = PDFGenerator.generate(form);

    expect(doc.internal.pages.length).toBeGreaterThan(1);
    // Verify images are embedded
  });

  test('should not throw on generation', () => {
    const form = createCompletePrestartForm();
    expect(() => PDFGenerator.generate(form)).not.toThrow();
  });
});
```

### 4. E2E Workflow Tests

```javascript
// tests/e2e/prestart-workflow.spec.js

import { test, expect } from '@playwright/test';

test.describe('Pre-Start Checklist Workflow', () => {
  test('complete pre-start form submission', async ({ page }) => {
    await page.goto('/');

    // Navigate to pre-start form
    await page.click('[data-testid="new-prestart"]');

    // Fill required fields
    await page.fill('[data-testid="site-name"]', 'Test Site');
    await page.fill('[data-testid="supervisor"]', 'John Smith');
    await page.click('[data-testid="hazards-identified"]');
    await page.click('[data-testid="swms-confirmed"]');

    // Add signature
    await page.locator('[data-testid="signature-pad"]').click();
    // Draw signature...

    // Submit
    await page.click('[data-testid="submit-form"]');

    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // Verify form appears in list
    await expect(page.locator('[data-testid="form-list"]')).toContainText('Test Site');
  });

  test('reject incomplete form submission', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="new-prestart"]');

    // Try to submit without required fields
    await page.click('[data-testid="submit-form"]');

    // Verify error states
    await expect(page.locator('[data-testid="error-site-name"]')).toBeVisible();
  });
});
```

---

## Coverage Targets

### Phase 1 (Critical - 2 weeks)
- **Target:** 40% overall coverage
- **Focus:** Form validation, data persistence core functions
- **Metric:** All CRITICAL paths have tests

### Phase 2 (High - 4 weeks)
- **Target:** 60% overall coverage
- **Focus:** PDF generation, Google Drive sync, offline functionality
- **Metric:** All HIGH severity paths have tests

### Phase 3 (Complete - 8 weeks)
- **Target:** 80% overall coverage
- **Focus:** UI components, edge cases, error handling
- **Metric:** All user workflows have E2E tests

---

## Risk Assessment Summary

| Risk | Likelihood | Impact | Mitigation via Testing |
|------|------------|--------|------------------------|
| Data loss on sync failure | HIGH | CRITICAL | Integration tests for sync retry |
| Invalid safety forms submitted | HIGH | CRITICAL | Unit tests for validation rules |
| PDF missing critical data | HIGH | HIGH | Integration tests for PDF content |
| Offline mode failure | MEDIUM | CRITICAL | E2E tests for offline workflows |
| Signature fraud | MEDIUM | HIGH | Unit tests for signature validation |
| Race conditions | MEDIUM | HIGH | Concurrency tests |

---

## Compliance Considerations

Testing is essential for demonstrating compliance with:

1. **NSW WHS Act 2011** - Tests prove forms capture required safety data
2. **Privacy Act 1988** - Tests verify signature data handling
3. **Evidence Act** - Tests demonstrate audit trail integrity
4. **WorkCover NSW** - Tests verify incident report completeness
5. **ISO 9001** - Tests provide evidence of quality control

---

## Conclusion

The lack of test coverage in this safety-critical application represents a significant risk. I recommend:

1. **Immediate:** Set up testing infrastructure (Jest + React Testing Library)
2. **Week 1-2:** Implement CRITICAL priority tests (validation, data persistence)
3. **Week 3-4:** Implement HIGH priority tests (PDF, Drive sync, offline)
4. **Month 2:** Achieve 60%+ coverage with E2E tests
5. **Ongoing:** Maintain 80%+ coverage for all new code

The investment in testing will significantly reduce the risk of safety compliance failures, data loss, and legal liability.

---

*This analysis was generated to help prioritize test development efforts. Implementation should be adapted based on available resources and specific organizational requirements.*
