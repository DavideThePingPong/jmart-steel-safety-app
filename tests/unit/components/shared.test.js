/**
 * shared.test.js — Code-structure tests for shared.jsx
 *
 * Covers ErrorBoundary, Icon, LucideIcon, SignaturePad, and NoteMediaBox.
 * Verifies security patterns, photo limits, and window exports.
 */

const fs = require('fs');
const path = require('path');

const sharedPath = path.resolve(__dirname, '../../../js/components/shared.jsx');
let code;

beforeAll(() => {
  code = fs.readFileSync(sharedPath, 'utf-8');
});

// ==========================================================================
// ErrorBoundary
// ==========================================================================
describe('ErrorBoundary', () => {

  it('should extend React.Component', () => {
    expect(code).toMatch(/class\s+ErrorBoundary\s+extends\s+React\.Component/);
  });

  it('should implement getDerivedStateFromError', () => {
    expect(code).toMatch(/static\s+getDerivedStateFromError/);
  });

  it('should implement componentDidCatch', () => {
    expect(code).toMatch(/componentDidCatch\s*\(\s*error\s*,\s*errorInfo\s*\)/);
  });

  it('should log to AuditLogManager when available', () => {
    expect(code).toMatch(/AuditLogManager\.log\(['"]error['"]/);
  });

  it('should report to ErrorTelemetry when available', () => {
    expect(code).toMatch(/ErrorTelemetry\.captureError\(error,\s*['"]react-error-boundary['"]\)/);
  });

  it('should guard ErrorTelemetry with typeof check', () => {
    expect(code).toMatch(/typeof ErrorTelemetry\s*!==\s*['"]undefined['"]/);
  });

  it('should show "Something Went Wrong" message', () => {
    expect(code).toMatch(/Something Went Wrong/);
  });

  it('should offer Reload App button', () => {
    expect(code).toMatch(/Reload App/);
  });

  it('should offer Clear Cache & Reload button', () => {
    expect(code).toMatch(/Clear Cache & Reload/);
  });

  it('should preserve children when no error', () => {
    expect(code).toMatch(/this\.props\.children/);
  });
});

// ==========================================================================
// Icon Component
// ==========================================================================
describe('Icon component', () => {

  it('should clone icon node before mutating (prevents shared singleton pollution)', () => {
    expect(code).toMatch(/icon\.cloneNode\(true\)/);
  });

  it('should set width and height from size prop', () => {
    expect(code).toMatch(/setAttribute\(['"]width['"]/);
    expect(code).toMatch(/setAttribute\(['"]height['"]/);
  });

  it('should use useRef for DOM attachment', () => {
    expect(code).toMatch(/const\s+ref\s*=\s*useRef\(null\)/);
  });
});

// ==========================================================================
// LucideIcon Component
// ==========================================================================
describe('LucideIcon component', () => {
  it('should use lucide.createIcons', () => {
    expect(code).toMatch(/lucide\.createIcons/);
  });

  it('should use data-lucide attribute', () => {
    expect(code).toMatch(/data-lucide=\{name\}/);
  });
});

// ==========================================================================
// SignaturePad — Core Functionality
// ==========================================================================
describe('SignaturePad — core functionality', () => {

  it('should use canvas for signature drawing', () => {
    expect(code).toMatch(/canvasRef/);
    expect(code).toMatch(/getContext\(['"]2d['"]\)/);
  });

  it('should support touch events for mobile', () => {
    expect(code).toMatch(/onTouchStart/);
    expect(code).toMatch(/onTouchMove/);
    expect(code).toMatch(/onTouchEnd/);
  });

  it('should export signature as PNG data URL', () => {
    expect(code).toMatch(/toDataURL\(['"]image\/png['"]\)/);
  });

  it('should have Clear, Cancel, and Save buttons', () => {
    expect(code).toMatch(/Clear/);
    expect(code).toMatch(/Cancel/);
    expect(code).toMatch(/Save/);
  });

  it('should disable Save when no signature drawn', () => {
    expect(code).toMatch(/disabled=\{!hasSignature\}/);
  });
});

// ==========================================================================
// SignaturePad — Security
// ==========================================================================
describe('SignaturePad — security', () => {

  it('should require verification code for saved signatures', () => {
    expect(code).toMatch(/Signature Verification Required/);
    expect(code).toMatch(/verificationCode/);
  });

  it('should generate verification code based on name hash', () => {
    expect(code).toMatch(/getVerificationCode/);
    expect(code).toMatch(/padStart\(4,\s*'0'\)/);
  });

  it('should BLOCK using other peoples signatures (security fix)', () => {
    expect(code).toMatch(/SECURITY FIX/);
    expect(code).toMatch(/must sign their own signature/);
  });

  it('should log signature usage to AuditLogManager', () => {
    expect(code).toMatch(/AuditLogManager\.log\(['"]signature_used['"]/);
  });

  it('should show error on incorrect verification code', () => {
    expect(code).toMatch(/Incorrect code/);
  });
});

// ==========================================================================
// NoteMediaBox
// ==========================================================================
describe('NoteMediaBox', () => {

  it('should define MAX_PHOTOS_PER_SECTION = 5', () => {
    expect(code).toMatch(/const\s+MAX_PHOTOS_PER_SECTION\s*=\s*5/);
  });

  it('should enforce photo limit per section', () => {
    expect(code).toMatch(/remaining\s*=\s*MAX_PHOTOS_PER_SECTION\s*-\s*currentCount/);
  });

  it('should alert when photo limit is reached', () => {
    expect(code).toMatch(/Maximum.*photos per section/);
  });

  it('should compress images before storing', () => {
    expect(code).toMatch(/compressImage/);
    expect(code).toMatch(/toDataURL\(['"]image\/jpeg['"]/);
  });

  it('should re-compress if photo exceeds 200KB base64', () => {
    expect(code).toMatch(/MAX_BASE64_SIZE\s*=\s*200000/);
  });

  it('should upload to Google Drive in background when connected', () => {
    expect(code).toMatch(/GoogleDriveSync\.isConnected\(\)/);
    expect(code).toMatch(/uploadJobPhoto/);
  });

  it('should have Note, Camera, and Gallery buttons', () => {
    expect(code).toMatch(/Add Note/);
    expect(code).toMatch(/Camera/);
    expect(code).toMatch(/Gallery/);
  });

  it('should use createImageBitmap for better mobile performance', () => {
    expect(code).toMatch(/createImageBitmap/);
  });

  it('should handle cloud-only photos gracefully', () => {
    expect(code).toMatch(/\[in-firebase\]/);
    expect(code).toMatch(/In cloud/);
  });
});

// ==========================================================================
// React Hooks on Window
// ==========================================================================
describe('shared.jsx — React hooks on window', () => {
  it('should destructure and export React hooks to window', () => {
    expect(code).toMatch(/window\.useState\s*=\s*useState/);
    expect(code).toMatch(/window\.useRef\s*=\s*useRef/);
    expect(code).toMatch(/window\.useEffect\s*=\s*useEffect/);
    expect(code).toMatch(/window\.useMemo\s*=\s*useMemo/);
  });
});

// ==========================================================================
// Window Exports
// ==========================================================================
describe('shared.jsx — component exports', () => {
  const componentExports = [
    'Icon', 'LucideIcon', 'SignaturePad', 'NoteMediaBox', 'ErrorBoundary'
  ];

  componentExports.forEach(name => {
    it(`should export window.${name}`, () => {
      expect(code).toMatch(new RegExp(`window\\.${name}\\s*=\\s*${name}`));
    });
  });

  it('should export Lucide icon references to window', () => {
    expect(code).toMatch(/window\.Shield\s*=\s*Shield/);
    expect(code).toMatch(/window\.AlertTriangle\s*=\s*AlertTriangle/);
    expect(code).toMatch(/window\.CheckCircle\s*=\s*CheckCircle/);
  });
});
