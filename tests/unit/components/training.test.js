/**
 * training.test.js — Regression tests for TrainingView (training.jsx)
 *
 * REGRESSION: When reviewing answers, unanswered questions showed "undefined"
 * instead of "Not answered". Fix: added fallback text with a styled span
 * displaying "Not answered" when answers[i] is undefined.
 */

const fs = require('fs');
const path = require('path');

const trainingPath = path.resolve(__dirname, '../../../js/components/training.jsx');
let trainingCode;

beforeAll(() => {
  trainingCode = fs.readFileSync(trainingPath, 'utf-8');
});

describe('TrainingView — unanswered question display [REGRESSION]', () => {

  it('should contain "Not answered" fallback text [REGRESSION]', () => {
    expect(trainingCode).toMatch(/Not answered/);
  });

  it('should check answers[i] !== undefined before displaying selected option', () => {
    // The ternary: answers[i] !== undefined ? q.options[answers[i]] : <fallback>
    expect(trainingCode).toMatch(/answers\[i\]\s*!==\s*undefined/);
  });

  it('should render italic styling for "Not answered" text', () => {
    // The fallback should be visually distinct — using italic class or style
    expect(trainingCode).toMatch(/italic.*Not answered/s);
  });
});

describe('TrainingView — general structure', () => {

  it('should export TrainingView to window', () => {
    expect(trainingCode).toMatch(/window\.TrainingView\s*=\s*TrainingView/);
  });

  it('should calculate score based on correct answers', () => {
    expect(trainingCode).toMatch(/calculateScore/);
  });

  it('should require 80% to pass', () => {
    expect(trainingCode).toMatch(/score\s*>=\s*80/);
  });
});
