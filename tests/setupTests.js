import '@testing-library/jest-dom';

// Mock localStorage — use Object.defineProperty to override jsdom's built-in
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

// Mock sessionStorage (separate instance so tests can mock independently)
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock, writable: true });

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: {
    getCurrentPosition: jest.fn(),
    watchPosition: jest.fn(),
    clearWatch: jest.fn()
  }
});

// Mock Firebase
global.firebase = {
  initializeApp: jest.fn(),
  database: jest.fn(() => ({
    ref: jest.fn(() => ({
      set: jest.fn(),
      get: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
      push: jest.fn(),
      update: jest.fn(),
      remove: jest.fn()
    }))
  }))
};

// Firebase globals used by runtime scripts
global.firebaseDb = null;
global.isFirebaseConfigured = false;
global.firebaseAuthReady = Promise.resolve();

// Mock Google API
global.google = {
  accounts: {
    oauth2: {
      initTokenClient: jest.fn(() => ({
        requestAccessToken: jest.fn()
      }))
    }
  }
};

// Mock fetch
global.fetch = jest.fn();

// Mock jsPDF
global.jspdf = {
  jsPDF: jest.fn(() => ({
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
      pages: [null, ''], // jsPDF pages array (1-indexed)
      getNumberOfPages: () => 1
    }
  }))
};

// Mock FORM_CONSTANTS (used by form components)
global.FORM_CONSTANTS = {
  supervisors: ['Scott Seeho', 'Davide Casolini'],
  defaultSites: ['Sydney CBD', 'Martin Place', 'Chatswood'],
  builders: ['Multiplex', 'Lendlease', 'CPB'],
  incidentTypes: ['Near Miss', 'Injury', 'Property Damage', 'Environmental'],
  checklistItems: {
    erection: ['Item 1', 'Item 2'],
    fabrication: ['Item A', 'Item B']
  }
};

// Mock SignaturePad component (used by form components)
global.SignaturePad = function SignaturePadMock() { return null; };

// Mock console.warn/error to keep test output clean (but still track calls)
// Uncomment these if tests are too noisy:
// jest.spyOn(console, 'warn').mockImplementation(() => {});
// jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.getItem.mockReturnValue(null);
  sessionStorage.getItem.mockReturnValue(null);
});
