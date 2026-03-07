/**
 * Tests for js/trainingCertGenerator.js — TrainingCertGenerator
 *
 * Covers: generate() with valid inputs, null workerName, null selectedCourse,
 *         score display, and the two REGRESSION fixes.
 */
const fs = require('fs');
const path = require('path');

// Load the source and make the const available globally
const ROOT = path.resolve(__dirname, '..', '..', '..');
let code = fs.readFileSync(path.resolve(ROOT, 'js/trainingCertGenerator.js'), 'utf-8');

// Replace `const TrainingCertGenerator` with `global.TrainingCertGenerator`
code = code.replace(/^const TrainingCertGenerator\s*=/m, 'global.TrainingCertGenerator =');
eval(code);

const TrainingCertGenerator = global.TrainingCertGenerator;

describe('TrainingCertGenerator', () => {
  let mockDoc;
  let mockCourse;

  beforeEach(() => {
    jest.clearAllMocks();

    // Build a fresh mock jsPDF document for each test
    mockDoc = {
      setFontSize: jest.fn(),
      setFont: jest.fn(),
      setTextColor: jest.fn(),
      setDrawColor: jest.fn(),
      setFillColor: jest.fn(),
      setLineWidth: jest.fn(),
      text: jest.fn(),
      addPage: jest.fn(),
      addImage: jest.fn(),
      save: jest.fn(),
      output: jest.fn(() => new Blob()),
      line: jest.fn(),
      rect: jest.fn(),
      roundedRect: jest.fn(),
      circle: jest.fn(),
      getTextWidth: jest.fn(() => 50),
      splitTextToSize: jest.fn((text) => [text]),
      internal: {
        pageSize: { getWidth: () => 210, getHeight: () => 297 },
        pages: [null, ''],
        getNumberOfPages: () => 1
      }
    };

    // Re-mock jsPDF constructor to return our mockDoc
    global.jspdf = { jsPDF: jest.fn(() => mockDoc) };
    window.jspdf = global.jspdf;

    // Standard mock course
    mockCourse = {
      id: 'heights-safety',
      title: 'Working at Heights / Safety Training',
      duration: '30 min',
      questions: [
        { question: 'What is the minimum height for fall protection? / Safety Q1', options: ['1.8m', '2m'], answer: 0 },
        { question: 'What PPE is required? / Safety Q2', options: ['Harness', 'Gloves'], answer: 0 }
      ],
      standards: [
        { code: 'AS/NZS 1891.1 - Industrial Fall Arrest' }
      ]
    };

    // Mock localStorage for team signatures (Scott Seeho lookup)
    localStorage.getItem.mockReturnValue(null);
  });

  // -------------------------------------------------------
  // Basic generation
  // -------------------------------------------------------
  it('should generate a PDF and call doc.save with correct filename', () => {
    TrainingCertGenerator.generate('David Casolini', mockCourse, null, 95);

    expect(global.jspdf.jsPDF).toHaveBeenCalledTimes(1);
    expect(mockDoc.save).toHaveBeenCalledTimes(1);

    const fileName = mockDoc.save.mock.calls[0][0];
    expect(fileName).toContain('JMart-Certificate-heights-safety-David-Casolini');
    expect(fileName).toMatch(/\.pdf$/);
  });

  it('should use the course title (before " / ") in the PDF', () => {
    TrainingCertGenerator.generate('Test Worker', mockCourse, null, 100);

    // Find the text() call that renders the course title
    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    expect(textCalls).toContain('Working at Heights');
  });

  // -------------------------------------------------------
  // Score display
  // -------------------------------------------------------
  it('should display score percentage when calculateScore is a number', () => {
    TrainingCertGenerator.generate('Worker', mockCourse, null, 85);

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    const scoreLine = textCalls.find(t => typeof t === 'string' && t.includes('PASSED'));
    expect(scoreLine).toContain('85%');
  });

  it('should default to 100% when calculateScore is not a number', () => {
    TrainingCertGenerator.generate('Worker', mockCourse, null, undefined);

    const textCalls = mockDoc.text.mock.calls.map(c => c[0]);
    const scoreLine = textCalls.find(t => typeof t === 'string' && t.includes('PASSED'));
    expect(scoreLine).toContain('100%');
  });

  // -------------------------------------------------------
  // REGRESSION: null workerName
  // -------------------------------------------------------
  it('should not crash when workerName is null [REGRESSION]', () => {
    expect(() => {
      TrainingCertGenerator.generate(null, mockCourse, null, 100);
    }).not.toThrow();

    // The filename should use "Unknown" as the fallback
    const fileName = mockDoc.save.mock.calls[0][0];
    expect(fileName).toContain('Unknown');
  });

  // -------------------------------------------------------
  // REGRESSION: null selectedCourse
  // -------------------------------------------------------
  it('should return early and not crash when selectedCourse is null [REGRESSION]', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => {
      TrainingCertGenerator.generate('Worker', null, null, 100);
    }).not.toThrow();

    // Should NOT have tried to create a jsPDF instance
    expect(global.jspdf.jsPDF).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  // -------------------------------------------------------
  // Signature handling
  // -------------------------------------------------------
  it('should add worker signature image when signatureData is provided', () => {
    const sigData = 'data:image/png;base64,fakeSignatureData';
    TrainingCertGenerator.generate('Worker', mockCourse, sigData, 100);

    // addImage should be called at least once for the worker signature
    const addImageCalls = mockDoc.addImage.mock.calls;
    const workerSigCall = addImageCalls.find(c => c[0] === sigData);
    expect(workerSigCall).toBeDefined();
  });
});
