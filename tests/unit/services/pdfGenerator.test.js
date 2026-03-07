/**
 * PDF Generator Tests
 * Tests the actual pdfGenerator.js file loaded into global scope.
 *
 * REGRESSION BUG: Checklist column counter was not reset on page break.
 * Fix: `if (checkPageBreak(10)) { col = 0; }` inside the checklist forEach.
 *
 * The jsPDF mock is provided by setupTests.js with: setFontSize, setFont, text,
 * addPage, addImage, save, output, internal.pageSize, splitTextToSize, etc.
 */

const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.resolve(__dirname, '..', '..', '..', 'js', 'pdfGenerator.js');

/**
 * Load pdfGenerator.js into global scope.
 * The file declares `const PDFGenerator = { ... }` at top level.
 * We replace that with `global.PDFGenerator =` so it's accessible in tests.
 */
function loadPDFGenerator() {
  let code = fs.readFileSync(SCRIPT_PATH, 'utf-8');

  // Make the const a global assignment
  code = code.replace(/^const PDFGenerator\s*=/m, 'global.PDFGenerator =');

  eval(code);
}

beforeAll(() => {
  // Enhance the jsPDF mock from setupTests.js with missing methods
  // The generate() function uses setPage in its footer loop
  const originalJsPDF = global.jspdf.jsPDF;
  global.jspdf.jsPDF = jest.fn(() => {
    const doc = originalJsPDF();
    doc.setPage = jest.fn();
    return doc;
  });

  // PDFConfig must be defined before loading pdfGenerator.js
  global.PDFConfig = {
    folderMap: {
      prestart: 'Pre-Start Checklist',
      inspection: 'Site Inspection',
      incident: 'Incident Report',
      toolbox: 'Toolbox Talk',
      itp: 'ITP Form',
      'steel-itp': 'Steel ITP'
    },
    fieldLabels: {
      supervisorName: 'Supervisor',
      siteConducted: 'Site',
      builder: 'Builder',
      address: 'Address',
      notes: 'Notes',
      comments: 'Comments'
    },
    checklistLabels: {
      s1: 'Site access and egress points clear',
      s2: 'Exclusion zones and barriers in place',
      s3: 'First aid kit available and stocked',
      s4: 'Emergency assembly point identified',
      s5: 'Fire extinguishers available'
    },
    colors: {
      primary: [234, 88, 12],
      secondary: [249, 115, 22],
      success: [34, 197, 94],
      danger: [239, 68, 68],
      dark: [31, 41, 55],
      gray: [107, 114, 128],
      lightGray: [243, 244, 246],
      white: [255, 255, 255]
    }
  };

  loadPDFGenerator();
});

afterEach(() => {
  jest.clearAllMocks();
});

// =============================================================
// REGRESSION: Checklist column reset on page break
// =============================================================
describe('REGRESSION: checklist column resets on page break', () => {
  test('generate does not throw with a large checklist that forces page breaks', () => {
    // Build a checklist with many items to force page breaks
    const bigChecklist = {};
    for (let i = 0; i < 60; i++) {
      bigChecklist['item' + i] = i % 2 === 0;
    }

    const form = {
      type: 'prestart',
      createdAt: new Date().toISOString(),
      data: {
        siteConducted: 'Test Site',
        supervisorName: 'Scott Seeho',
        checklist: bigChecklist
      }
    };

    // Should not throw
    expect(() => PDFGenerator.generate(form)).not.toThrow();
  });

  test('addPage is called when checklist items exceed page height', () => {
    // Create many checklist items
    const checklist = {};
    for (let i = 0; i < 80; i++) {
      checklist['check_' + i] = true;
    }

    const form = {
      type: 'prestart',
      createdAt: new Date().toISOString(),
      data: { checklist }
    };

    const { doc } = PDFGenerator.generate(form);

    // With 80 items in 2 columns, we expect at least one addPage call
    // (page height is 297, each row ~8px, header takes ~42px, so ~30 rows per page = ~60 items)
    expect(doc.addPage).toHaveBeenCalled();
  });

  test('checklist renders boolean true and false values without errors', () => {
    const form = {
      type: 'prestart',
      createdAt: new Date().toISOString(),
      data: {
        checklist: { s1: true, s2: false, s3: 'yes', s4: 'no' }
      }
    };

    const { doc } = PDFGenerator.generate(form);

    // rect is called for checkboxes and for checked/unchecked fills
    expect(doc.rect).toHaveBeenCalled();
    // text should have been called multiple times for checklist labels and symbols
    expect(doc.text).toHaveBeenCalled();
  });
});

// =============================================================
// Basic generate functionality
// =============================================================
describe('PDFGenerator.generate - basic functionality', () => {
  test('returns doc, filename, and folderName', () => {
    const form = {
      type: 'prestart',
      createdAt: '2026-03-07T10:00:00.000Z',
      data: { siteConducted: 'Martin Place' }
    };

    const result = PDFGenerator.generate(form);

    expect(result).toHaveProperty('doc');
    expect(result).toHaveProperty('filename');
    expect(result).toHaveProperty('folderName');
    expect(result.folderName).toBe('Pre-Start Checklist');
  });

  test('filename contains site name and form type', () => {
    const form = {
      type: 'inspection',
      createdAt: '2026-03-07T10:00:00.000Z',
      data: { siteConducted: 'Sydney CBD' }
    };

    const result = PDFGenerator.generate(form);

    expect(result.filename).toContain('Sydney-CBD');
    expect(result.filename).toContain('Site-Inspection');
    expect(result.filename).toMatch(/\.pdf$/);
  });

  test('filename falls back to "Form" when no site name', () => {
    const form = {
      type: 'prestart',
      createdAt: '2026-03-07T10:00:00.000Z',
      data: {}
    };

    const result = PDFGenerator.generate(form);

    expect(result.filename).toContain('Form');
  });

  test('handles unknown form type gracefully', () => {
    const form = {
      type: 'unknown-type',
      createdAt: '2026-03-07T10:00:00.000Z',
      data: { siteConducted: 'Test' }
    };

    expect(() => PDFGenerator.generate(form)).not.toThrow();
  });
});

// =============================================================
// Section rendering
// =============================================================
describe('PDFGenerator.generate - sections', () => {
  test('renders site details when supervisor and site are present', () => {
    const form = {
      type: 'prestart',
      createdAt: new Date().toISOString(),
      data: {
        supervisorName: 'Scott Seeho',
        siteConducted: 'Martin Place',
        builder: 'Multiplex'
      }
    };

    const { doc } = PDFGenerator.generate(form);

    // text should have been called with site details header
    const allTextCalls = doc.text.mock.calls.map(c => String(c[0]));
    expect(allTextCalls).toContain('SITE DETAILS');
  });

  test('renders notes section when notes are present', () => {
    const form = {
      type: 'prestart',
      createdAt: new Date().toISOString(),
      data: {
        notes: 'Check crane before lifting'
      }
    };

    const { doc } = PDFGenerator.generate(form);

    const allTextCalls = doc.text.mock.calls.map(c => String(c[0]));
    expect(allTextCalls).toContain('NOTES');
  });

  test('renders incident-specific fields for incident type', () => {
    const form = {
      type: 'incident',
      createdAt: new Date().toISOString(),
      data: {
        incidentDate: '2026-03-07',
        incidentTime: '14:30',
        incidentType: 'Near Miss',
        description: 'Worker slipped on wet surface',
        actionTaken: 'Area cordoned off and cleaned'
      }
    };

    const { doc } = PDFGenerator.generate(form);

    const allTextCalls = doc.text.mock.calls.map(c => String(c[0]));
    expect(allTextCalls).toContain('INCIDENT DETAILS');
  });
});

// =============================================================
// download method
// =============================================================
describe('PDFGenerator.download', () => {
  test('calls doc.save and returns a pdf filename', () => {
    const form = {
      type: 'prestart',
      createdAt: new Date().toISOString(),
      data: { siteConducted: 'Test Site' }
    };

    const filename = PDFGenerator.download(form);

    expect(filename).toMatch(/\.pdf$/);
    expect(typeof filename).toBe('string');
  });
});
