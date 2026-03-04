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

// Mock sessionStorage
Object.defineProperty(global, 'sessionStorage', { value: localStorageMock, writable: true });

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
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
      push: jest.fn(),
      update: jest.fn(),
      remove: jest.fn()
    }))
  }))
};

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
    text: jest.fn(),
    addPage: jest.fn(),
    addImage: jest.fn(),
    save: jest.fn(),
    output: jest.fn(() => new Blob()),
    internal: {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
      pages: []
    }
  }))
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.getItem.mockReturnValue(null);
});
