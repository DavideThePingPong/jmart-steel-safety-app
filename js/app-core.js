"use strict";

// === js/components/shared.jsx ===
// Shared components: Icon, LucideIcon, SignaturePad, NoteMediaBox
// Extracted from index.html

// React hooks and Lucide icons - attached to window for cross-file access
const {
  useState,
  useRef,
  useEffect,
  useMemo
} = React;
window.useState = useState;
window.useRef = useRef;
window.useEffect = useEffect;
window.useMemo = useMemo;
const {
  Shield,
  ClipboardCheck,
  AlertTriangle,
  Users,
  Plus,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Calendar,
  User,
  MapPin,
  Building,
  Wrench,
  AlertCircle,
  CheckCircle,
  Home,
  Menu,
  Bell,
  Settings,
  Trash2,
  Phone,
  Edit3,
  Copy,
  Clock,
  Download,
  FileText,
  Camera,
  Image: LucideImage,
  StickyNote,
  Clipboard
} = lucide;

// =============================================
// ErrorBoundary - Prevents full-app crashes from component errors
// =============================================
/**
 * React error boundary that catches component errors and prevents full-app crashes.
 * Logs caught errors to AuditLogManager and ErrorTelemetry when available.
 * Renders a crash recovery screen with "Reload App" and "Clear Cache & Reload" options.
 * @extends React.Component
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({
      errorInfo
    });

    // Log to audit trail if available
    if (typeof AuditLogManager !== 'undefined') {
      try {
        AuditLogManager.log('error', {
          message: error.message,
          stack: error.stack ? error.stack.substring(0, 500) : 'no stack',
          component: errorInfo?.componentStack ? errorInfo.componentStack.substring(0, 200) : 'unknown'
        });
      } catch (e) {/* non-fatal */}
    }

    // Report to ErrorTelemetry if available
    if (typeof ErrorTelemetry !== 'undefined') {
      ErrorTelemetry.captureError(error, 'react-error-boundary');
    }
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        role: 'alert',
        style: {
          minHeight: '100vh',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }
      }, React.createElement('div', {
        style: {
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '100%',
          overflow: 'hidden'
        }
      }, React.createElement('div', {
        style: {
          padding: '24px',
          textAlign: 'center',
          backgroundColor: '#ea580c',
          color: 'white'
        }
      }, React.createElement('div', {
        style: {
          fontSize: '48px',
          marginBottom: '12px'
        }
      }, '\u26A0\uFE0F'), React.createElement('h2', {
        style: {
          fontSize: '20px',
          fontWeight: 'bold'
        }
      }, 'Something Went Wrong')), React.createElement('div', {
        style: {
          padding: '24px'
        }
      }, React.createElement('p', {
        style: {
          color: '#4b5563',
          marginBottom: '12px',
          textAlign: 'center'
        }
      }, 'The app encountered an error. Your data is safe in local storage.'), React.createElement('div', {
        style: {
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '13px',
          color: '#92400e',
          wordBreak: 'break-word'
        }
      }, this.state.error ? this.state.error.message : 'Unknown error'), React.createElement('button', {
        onClick: function () {
          window.location.reload();
        },
        style: {
          width: '100%',
          backgroundColor: '#ea580c',
          color: 'white',
          padding: '12px',
          borderRadius: '12px',
          border: 'none',
          fontWeight: '600',
          fontSize: '16px',
          cursor: 'pointer'
        }
      }, 'Reload App'), React.createElement('button', {
        onClick: function () {
          try {
            // Clear potentially corrupted data, keep forms
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.includes('temp') || key.includes('cache') || key.includes('draft'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(function (k) {
              localStorage.removeItem(k);
            });
            window.location.reload();
          } catch (e) {
            window.location.reload();
          }
        },
        style: {
          width: '100%',
          backgroundColor: '#e5e7eb',
          color: '#374151',
          padding: '12px',
          borderRadius: '12px',
          border: 'none',
          fontWeight: '500',
          fontSize: '14px',
          cursor: 'pointer',
          marginTop: '8px'
        }
      }, 'Clear Cache & Reload'))));
    }
    return this.props.children;
  }
}
window.ErrorBoundary = ErrorBoundary;

/**
 * Renders a Lucide icon component by element reference.
 * Clones the provided SVG element to avoid mutating the shared Lucide singleton.
 * @param {Object} props
 * @param {SVGElement} props.icon - Lucide icon SVG element reference (e.g. lucide.Shield)
 * @param {number} [props.size=24] - Icon width and height in pixels
 * @param {string} [props.className=""] - Additional CSS class names applied to the SVG
 */
function Icon({
  icon,
  size = 24,
  className = ""
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && icon) {
      ref.current.innerHTML = '';
      // Clone BEFORE mutating — icon is a shared singleton from lucide,
      // mutating it directly would pollute all other Icon instances
      const svg = icon.cloneNode(true);
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      if (className) {
        className.split(' ').forEach(c => c && svg.classList.add(c));
      }
      ref.current.appendChild(svg);
    }
  }, [icon, size, className]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    "aria-hidden": "true",
    style: {
      display: 'inline-flex',
      alignItems: 'center'
    }
  });
}

/**
 * Renders a Lucide icon by string name lookup via lucide.createIcons.
 * @param {Object} props
 * @param {string} props.name - Lucide icon name (e.g. "shield", "alert-triangle")
 * @param {number} [props.size=24] - Icon width and height in pixels
 * @param {string} [props.className=""] - Additional CSS class names applied to the icon
 */
function LucideIcon({
  name,
  size = 24,
  className = ""
}) {
  const iconRef = useRef(null);
  useEffect(() => {
    if (iconRef.current) {
      iconRef.current.innerHTML = '';
      lucide.createIcons({
        icons: {
          [name]: lucide.icons[name]
        },
        attrs: {
          width: size,
          height: size,
          class: className
        }
      });
    }
  }, [name, size, className]);
  return /*#__PURE__*/React.createElement("i", {
    ref: iconRef,
    "data-lucide": name,
    "aria-hidden": "true",
    style: {
      width: size,
      height: size
    }
  });
}

/**
 * Canvas-based signature capture pad with save, clear, and cancel actions.
 * Supports drawing via mouse and touch input. Can load saved signatures from
 * localStorage (with 4-digit verification code) and uploads to Google Drive when connected.
 * Enforces signature security by requiring each team member to sign their own.
 * @param {Object} props
 * @param {Function} props.onSave - Callback invoked with the signature as a PNG data URL string
 * @param {Function} props.onCancel - Callback invoked when the user cancels signing
 * @param {string} props.name - Name of the person signing (used for saved signature lookup)
 */
function SignaturePad({
  onSave,
  onCancel,
  name
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [showSavedOptions, setShowSavedOptions] = useState(false);

  // Get saved signatures from localStorage
  const savedSignatures = useMemo(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEAM_SIGNATURES);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }, []);

  // Check if this person has a saved signature
  const hasSavedSignature = savedSignatures[name] && savedSignatures[name].startsWith('data:image');
  const getCoordinates = e => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };
  const startDrawing = e => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const {
      x,
      y
    } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };
  const draw = e => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const {
      x,
      y
    } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasSignature(true);
  };
  const stopDrawing = () => setIsDrawing(false);
  const clearSignature = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
  };
  const saveSignature = () => onSave(canvasRef.current.toDataURL('image/png'));

  // SIGNATURE SECURITY: Require verification before using saved signatures
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [verificationError, setVerificationError] = useState('');

  // Focus trap for modal accessibility
  const sigPadCloseCallback = React.useCallback(() => {
    onCancel();
  }, [onCancel]);
  const sigTrapRef = useFocusTrap(true, sigPadCloseCallback);

  // Generate a simple verification code based on name (last 4 chars of name hash)
  const getVerificationCode = memberName => {
    let hash = 0;
    const str = memberName.toLowerCase().replace(/\s/g, '');
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash % 10000).toString().padStart(4, '0');
  };

  // Use saved signature - requires verification
  const useSavedSignature = () => {
    if (hasSavedSignature) {
      setSelectedMember(name);
      setShowVerification(true);
      setVerificationError('');
    }
  };

  // Use another team member's saved signature - DISABLED for security
  // Each person must sign their own signature
  const useOtherSignature = memberName => {
    // SECURITY FIX: Do not allow using other people's signatures
    // Instead, show a message that each person must sign their own
    alert(`Security Notice: ${memberName} must sign their own signature. Please have them sign directly on this device.`);
    setShowSavedOptions(false);
  };

  // Verify and apply signature
  const verifyAndApplySignature = () => {
    if (!selectedMember) return;
    const expectedCode = getVerificationCode(selectedMember);
    if (verificationCode === expectedCode) {
      // Verification passed - apply signature with audit log
      AuditLogManager.log('signature_used', {
        signerName: selectedMember,
        usedBy: DeviceAuthManager.deviceId,
        method: 'saved_signature',
        timestamp: new Date().toISOString()
      });
      onSave(savedSignatures[selectedMember]);
      setShowVerification(false);
      setVerificationCode('');
    } else {
      setVerificationError('Incorrect code. Please enter your personal verification code.');
    }
  };

  // Get list of team members with saved signatures (for display only)
  const membersWithSignatures = Object.entries(savedSignatures).filter(([_, sig]) => sig && sig.startsWith('data:image')).map(([memberName]) => memberName);
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "signature-pad-title"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl w-full max-w-md",
    ref: sigTrapRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 border-b"
  }, /*#__PURE__*/React.createElement("h3", {
    id: "signature-pad-title",
    className: "font-semibold text-gray-800"
  }, "Sign: ", name), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, "Draw your signature below or use a saved one")), showVerification && /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-amber-50 border-b border-amber-200",
    role: "dialog",
    "aria-modal": "true"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-amber-800 mb-2 font-medium"
  }, "\uD83D\uDD10 Signature Verification Required"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-amber-700 mb-3"
  }, "To use ", selectedMember, "'s saved signature, please enter your personal verification code.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "text-amber-600"
  }, "(Hint: Your code is based on your name)")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    inputMode: "numeric",
    pattern: "[0-9]*",
    maxLength: 4,
    value: verificationCode,
    onChange: e => setVerificationCode(e.target.value.replace(/\D/g, '')),
    placeholder: "Enter 4-digit code",
    "aria-label": "Verification code",
    className: "w-full border border-amber-300 rounded-lg px-3 py-2 mb-2 text-center text-lg tracking-widest"
  }), verificationError && /*#__PURE__*/React.createElement("p", {
    className: "text-red-600 text-sm mb-2",
    role: "alert"
  }, verificationError), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowVerification(false);
      setVerificationCode('');
      setVerificationError('');
    },
    className: "flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: verifyAndApplySignature,
    className: "flex-1 bg-amber-600 text-white py-2 rounded-lg font-medium"
  }, "Verify & Sign"))), hasSavedSignature && !showVerification && /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-green-50 border-b border-green-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-green-700 mb-2"
  }, "\u2713 ", name, " has a saved signature"), /*#__PURE__*/React.createElement("button", {
    onClick: useSavedSignature,
    className: "w-full bg-green-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\u270D\uFE0F"), " Use Saved Signature (requires verification)")), membersWithSignatures.length > 1 && !showVerification && /*#__PURE__*/React.createElement("div", {
    className: "px-4 pt-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 italic"
  }, "\uD83D\uDD12 Security: Each team member must sign their own signature. Saved signatures require verification before use.")), /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mb-2"
  }, "Or draw a new signature:"), /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-gray-300 rounded-lg bg-gray-50 relative"
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: canvasRef,
    width: 350,
    height: 150,
    className: "w-full touch-none",
    "aria-label": "Signature drawing area. Use touch or mouse to draw your signature.",
    onMouseDown: startDrawing,
    onMouseMove: draw,
    onMouseUp: stopDrawing,
    onMouseLeave: stopDrawing,
    onTouchStart: startDrawing,
    onTouchMove: draw,
    onTouchEnd: stopDrawing
  }), /*#__PURE__*/React.createElement("span", {
    className: "sr-only"
  }, "This signature pad requires touch or mouse input."), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-2 left-2 right-2 border-t border-gray-400"
  }), /*#__PURE__*/React.createElement("span", {
    className: "absolute bottom-3 left-3 text-xs text-gray-400"
  }, "Sign here"))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 border-t flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: clearSignature,
    className: "flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg"
  }, "Clear"), /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    className: "flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    onClick: saveSignature,
    disabled: !hasSignature,
    className: "flex-1 bg-green-600 text-white py-2 rounded-lg disabled:bg-gray-300"
  }, "Save"))));
}

// Note Media Box Component
// MAX_PHOTOS_PER_SECTION: prevents memory/storage issues from too many photos
const MAX_PHOTOS_PER_SECTION = 5;

/**
 * Multi-input field combining a text area, notes list, and photo attachments.
 * Photos are compressed before storage (800px max, JPEG 0.6 quality) and optionally
 * uploaded to Google Drive in the background. Enforces a per-section photo limit.
 * @param {Object} props
 * @param {string} props.label - Display label for the section header
 * @param {string} props.iconName - Lucide icon name displayed alongside the label
 * @param {string} props.value - Current text area value
 * @param {string[]} props.notes - Array of note strings attached to this section
 * @param {Array<{name: string, type: string, data: string}>} props.media - Array of photo attachment objects
 * @param {Function} props.onValueChange - Callback invoked with new text area value on change
 * @param {Function} props.onAddNote - Callback invoked with note string when a note is added
 * @param {Function} props.onAddMedia - Callback invoked with media object when a photo is captured
 * @param {Function} props.onRemoveNote - Callback invoked with note index to remove
 * @param {Function} props.onRemoveMedia - Callback invoked with media index to remove
 * @param {string} [props.siteName] - Site name used for Google Drive upload folder organization
 */
function NoteMediaBox({
  label,
  iconName,
  value,
  notes,
  media,
  onValueChange,
  onAddNote,
  onAddMedia,
  onRemoveNote,
  onRemoveMedia,
  siteName
}) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [uploadStatus, setUploadStatus] = useState(''); // Drive upload feedback

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
      setShowNoteInput(false);
    }
  };
  const handleMediaCapture = e => {
    const files = e.target.files;
    console.log('handleMediaCapture called, files:', files?.length);
    if (files && files.length > 0) {
      // Enforce per-section photo limit
      const currentCount = (media || []).length;
      const remaining = MAX_PHOTOS_PER_SECTION - currentCount;
      if (remaining <= 0) {
        alert('Maximum ' + MAX_PHOTOS_PER_SECTION + ' photos per section. Remove a photo to add more.');
        e.target.value = '';
        return;
      }
      const filesToProcess = Array.from(files).slice(0, remaining);
      if (filesToProcess.length < files.length) {
        alert('Only adding ' + filesToProcess.length + ' of ' + files.length + ' photos (limit: ' + MAX_PHOTOS_PER_SECTION + ' per section).');
      }
      filesToProcess.forEach(file => {
        console.log('Processing file:', file.name, 'type:', file.type, 'size:', file.size);

        // Compress image before storing to avoid localStorage quota issues on mobile
        // Aggressive settings: 800px max (construction photos don't need 4K), JPEG 0.6
        const compressImage = (file, maxWidth = 800, quality = 0.6) => {
          return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = event => {
              console.log('FileReader loaded, data length:', event.target.result?.length);

              // For mobile compatibility, use createImageBitmap if available (better for large images)
              if (typeof createImageBitmap !== 'undefined') {
                createImageBitmap(file).then(bitmap => {
                  console.log('ImageBitmap created:', bitmap.width, 'x', bitmap.height);
                  const canvas = document.createElement('canvas');
                  let width = bitmap.width;
                  let height = bitmap.height;

                  // Scale down if larger than maxWidth
                  if (width > maxWidth) {
                    height = height * maxWidth / width;
                    width = maxWidth;
                  }
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(bitmap, 0, 0, width, height);
                  bitmap.close(); // Free memory

                  const compressedData = canvas.toDataURL('image/jpeg', quality);
                  console.log('Compressed via ImageBitmap, data length:', compressedData?.length);
                  resolve(compressedData);
                }).catch(err => {
                  console.error('ImageBitmap error, falling back to Image:', err);
                  // Fallback to Image approach
                  applyImageFallback(event.target.result, maxWidth, quality, resolve);
                });
              } else {
                // Fallback for browsers without createImageBitmap
                applyImageFallback(event.target.result, maxWidth, quality, resolve);
              }
            };
            reader.onerror = err => {
              console.error('Error reading file:', file.name, err);
              resolve(null);
            };
            reader.readAsDataURL(file);
          });
        };

        // Fallback function using Image element
        const applyImageFallback = (dataUrl, maxWidth, quality, resolve) => {
          const img = new Image();
          img.onload = () => {
            console.log('Image loaded:', img.width, 'x', img.height);
            try {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              if (width > maxWidth) {
                height = height * maxWidth / width;
                width = maxWidth;
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              const compressedData = canvas.toDataURL('image/jpeg', quality);
              console.log('Compressed via Image, data length:', compressedData?.length);
              resolve(compressedData);
            } catch (err) {
              console.error('Canvas error:', err);
              resolve(dataUrl); // Use original if canvas fails
            }
          };
          img.onerror = err => {
            console.error('Image load error:', err);
            resolve(dataUrl); // Use original if image fails to load
          };
          // Set crossOrigin before src to avoid CORS issues
          img.crossOrigin = 'anonymous';
          img.src = dataUrl;
        };

        // Helper: add photo to form state AND upload to Drive in background
        const addPhotoAndUpload = (photoData, fileName) => {
          onAddMedia({
            name: fileName,
            type: 'image/jpeg',
            data: photoData
          });
          // Upload to Google Drive immediately if connected (non-blocking)
          if (typeof GoogleDriveSync !== 'undefined' && GoogleDriveSync.isConnected()) {
            const site = siteName || 'Unknown Site';
            setUploadStatus('☁️ Uploading to Drive...');
            GoogleDriveSync.uploadJobPhoto(photoData, fileName, site, new Date()).then(result => {
              if (result) {
                setUploadStatus('✅ Saved to Drive');
                console.log('Photo uploaded to Drive:', fileName);
              } else {
                setUploadStatus('⚠️ Drive upload failed');
              }
              setTimeout(() => setUploadStatus(''), 3000);
            }).catch(err => {
              console.error('Drive photo upload error:', err);
              setUploadStatus('⚠️ Drive upload failed');
              setTimeout(() => setUploadStatus(''), 3000);
            });
          }
        };
        compressImage(file).then(compressedData => {
          console.log('compressImage resolved, data:', compressedData ? 'yes' : 'no');
          if (compressedData) {
            // If still over 200KB base64 (~150KB actual), re-compress more aggressively
            const MAX_BASE64_SIZE = 200000;
            if (compressedData.length > MAX_BASE64_SIZE) {
              console.warn('Photo still large (' + Math.round(compressedData.length / 1024) + 'KB base64), re-compressing at 600px/0.4 quality');
              compressImage(file, 600, 0.4).then(smallerData => {
                console.log('Re-compressed to:', Math.round((smallerData || compressedData).length / 1024) + 'KB');
                addPhotoAndUpload(smallerData || compressedData, file.name);
              });
            } else {
              addPhotoAndUpload(compressedData, file.name);
            }
          } else {
            console.error('No compressed data returned for', file.name);
          }
        }).catch(err => {
          console.error('compressImage error:', err);
        });
      });
    }
    e.target.value = '';
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-3"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-gray-800 text-orange-600"
  }, label), /*#__PURE__*/React.createElement("textarea", {
    value: value,
    onChange: e => onValueChange(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]",
    placeholder: `Enter ${label.toLowerCase()}...`
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowNoteInput(!showNoteInput),
    className: "flex-1 bg-blue-50 border border-blue-200 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCDD"), " Add Note"), (media || []).length < MAX_PHOTOS_PER_SECTION ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => cameraInputRef.current?.click(),
    "aria-label": "Take photo with camera",
    className: "flex-1 bg-purple-50 border border-purple-200 text-purple-700 py-2 px-3 rounded-lg text-sm font-medium"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCF7"), " Camera"), /*#__PURE__*/React.createElement("button", {
    onClick: () => galleryInputRef.current?.click(),
    "aria-label": "Choose photo from gallery",
    className: "flex-1 bg-green-50 border border-green-200 text-green-700 py-2 px-3 rounded-lg text-sm font-medium"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDDBC\uFE0F"), " Gallery")) : /*#__PURE__*/React.createElement("span", {
    className: "flex-1 text-center text-xs text-gray-400 py-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCF7"), " ", MAX_PHOTOS_PER_SECTION, "/", MAX_PHOTOS_PER_SECTION, " max"), /*#__PURE__*/React.createElement("input", {
    ref: cameraInputRef,
    type: "file",
    accept: "image/*",
    capture: "environment",
    onChange: handleMediaCapture,
    className: "hidden",
    "aria-label": "Capture photo with camera"
  }), /*#__PURE__*/React.createElement("input", {
    ref: galleryInputRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: handleMediaCapture,
    className: "hidden",
    "aria-label": "Choose photo from gallery"
  })), uploadStatus && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-center text-gray-500"
  }, uploadStatus), showNoteInput && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: newNote,
    onChange: e => setNewNote(e.target.value),
    className: "flex-1 border border-gray-300 rounded-lg p-2 text-sm",
    placeholder: "Type your note...",
    onKeyPress: e => e.key === 'Enter' && handleAddNote()
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleAddNote,
    className: "bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
  }, "Add")), notes && notes.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-medium text-gray-500 uppercase"
  }, "Notes:"), notes.map((note, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex items-start justify-between bg-blue-50 p-2 rounded-lg"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-blue-800"
  }, note), /*#__PURE__*/React.createElement("button", {
    onClick: () => onRemoveNote(idx),
    className: "text-blue-500 ml-2",
    "aria-label": "Remove note"
  }, "\u2715")))), media && media.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-medium text-gray-500 uppercase"
  }, "Photos (", media.length, "/", MAX_PHOTOS_PER_SECTION, "):"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, media.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "relative"
  }, item.data && item.data !== '[in-firebase]' && item.data.startsWith('data:') ? /*#__PURE__*/React.createElement("img", {
    src: item.data,
    alt: item.name,
    className: "w-full h-20 object-cover rounded-lg"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u2601\uFE0F"), " In cloud"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onRemoveMedia(idx),
    className: "absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs",
    "aria-label": "Remove photo"
  }, "\u2715"))))));
}

// Export to window for cross-file access (Babel standalone scoping)
// =============================================
// SkeletonLoader - Placeholder loading state for lazy-loaded views
// =============================================
/**
 * Renders a skeleton loading placeholder with animated pulse effect.
 * Used as fallback while view bundles are loading.
 */
function SkeletonLoader() {
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4",
    role: "status",
    "aria-label": "Loading content"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-6 bg-gray-200 rounded-lg w-2/3 animate-pulse"
  }), /*#__PURE__*/React.createElement("div", {
    className: "h-4 bg-gray-200 rounded w-full animate-pulse"
  }), /*#__PURE__*/React.createElement("div", {
    className: "h-4 bg-gray-200 rounded w-5/6 animate-pulse"
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-5 bg-gray-200 rounded-lg w-1/2 animate-pulse"
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-20 bg-gray-200 rounded-lg animate-pulse"
  }), /*#__PURE__*/React.createElement("div", {
    className: "h-20 bg-gray-200 rounded-lg animate-pulse"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-5 bg-gray-200 rounded-lg w-3/4 animate-pulse"
  }), /*#__PURE__*/React.createElement("div", {
    className: "h-10 bg-gray-200 rounded-lg w-full animate-pulse"
  }), /*#__PURE__*/React.createElement("div", {
    className: "h-10 bg-gray-200 rounded-lg w-full animate-pulse"
  })), /*#__PURE__*/React.createElement("span", {
    className: "sr-only"
  }, "Loading view..."));
}
window.SkeletonLoader = SkeletonLoader;
window.Icon = Icon;
window.LucideIcon = LucideIcon;
window.SignaturePad = SignaturePad;
window.NoteMediaBox = NoteMediaBox;
window.Shield = Shield;
window.ClipboardCheck = ClipboardCheck;
window.AlertTriangle = AlertTriangle;
window.Users = Users;
window.Plus = Plus;
window.ChevronRight = ChevronRight;
window.ChevronLeft = ChevronLeft;
window.Check = Check;
window.X = X;
window.Calendar = Calendar;
window.User = User;
window.MapPin = MapPin;
window.Building = Building;
window.Wrench = Wrench;
window.AlertCircle = AlertCircle;
window.CheckCircle = CheckCircle;
window.Home = Home;
window.Menu = Menu;
window.Bell = Bell;
window.Settings = Settings;
window.Trash2 = Trash2;
window.Phone = Phone;
window.Edit3 = Edit3;
window.Copy = Copy;
window.Clock = Clock;
window.Download = Download;
window.FileText = FileText;
window.Camera = Camera;
window.LucideImage = LucideImage;
window.StickyNote = StickyNote;
window.Clipboard = Clipboard;

// === js/components/a11y.jsx ===
/**
 * @module A11y
 * @description Reusable accessibility hooks and components for WCAG 2.1 AA compliance.
 * Provides focus trapping for modals, live-region announcements for screen readers,
 * and a visually-hidden utility component.
 *
 * useFocusTrap  — Traps keyboard focus inside a modal, handles Escape, restores focus on close
 * useAnnouncer  — Provides an announce() function and an aria-live region for dynamic updates
 * VisuallyHidden — Renders screen-reader-only text (uses .sr-only class)
 */

/**
 * Hook that traps keyboard focus inside a container element.
 * When isOpen is true: stores previous focus, focuses the first focusable element,
 * cycles Tab/Shift+Tab within the container, and calls onClose on Escape.
 * When isOpen becomes false: restores focus to the previously focused element.
 *
 * @param {boolean} isOpen - Whether the trap is active
 * @param {Function} [onClose] - Called when Escape is pressed
 * @returns {React.RefObject} Ref to attach to the modal/dialog container element
 */
function useFocusTrap(isOpen, onClose) {
  const containerRef = React.useRef(null);
  const previousFocusRef = React.useRef(null);
  React.useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // Store the element that had focus before the modal opened
    previousFocusRef.current = document.activeElement;

    // Find all focusable elements inside the container
    const getFocusable = () => containerRef.current ? containerRef.current.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') : [];

    // Focus the first focusable element after a brief delay for render
    const timer = setTimeout(() => {
      const focusable = getFocusable();
      if (focusable.length > 0) focusable[0].focus();
    }, 50);
    const handleKeyDown = function (e) {
      // Escape key — close the modal
      if (e.key === 'Escape') {
        if (onClose) onClose();
        return;
      }
      // Tab key — trap focus within the container
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return function () {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that was focused before the modal opened
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);
  return containerRef;
}

/**
 * Hook that provides a screen-reader announcement system using an aria-live region.
 * Returns an announce() function and an AnnouncerRegion component to render in JSX.
 *
 * @returns {{ announce: Function, AnnouncerRegion: Function }}
 *   announce(message: string, assertive?: boolean) - Triggers a screen reader announcement
 *   AnnouncerRegion - React component rendering the hidden aria-live div
 */
function useAnnouncer() {
  const [message, setMessage] = React.useState('');
  const [priority, setPriority] = React.useState('polite');
  const announce = function (msg, assertive) {
    // Clear then set — ensures screen readers re-read even if same message
    setMessage('');
    setTimeout(function () {
      setPriority(assertive ? 'assertive' : 'polite');
      setMessage(msg);
    }, 50);
  };
  const AnnouncerRegion = function () {
    return React.createElement('div', {
      'aria-live': priority,
      'aria-atomic': 'true',
      role: 'status',
      className: 'sr-only'
    }, message);
  };
  return {
    announce: announce,
    AnnouncerRegion: AnnouncerRegion
  };
}

/**
 * Renders children as screen-reader-only text (visually hidden).
 * Uses the .sr-only CSS class defined in index.html.
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {React.ReactElement}
 */
function VisuallyHidden({
  children
}) {
  return React.createElement('span', {
    className: 'sr-only'
  }, children);
}

// Export to global scope for use by other components
window.useFocusTrap = useFocusTrap;
window.useAnnouncer = useAnnouncer;
window.VisuallyHidden = VisuallyHidden;

// === js/components/hooks.jsx ===
// Custom React Hooks for JMart Steel Safety App
// Extracted from app.jsx for maintainability
// Uses STORAGE_KEYS from js/storageKeys.js and FB_PATHS from js/firebasePaths.js

// =============================================
// useFormManager - CRUD operations for forms
// =============================================
/**
 * Form CRUD operations: add, update, delete, download PDF, manage signatures.
 * Handles localStorage persistence, Firebase sync, Google Drive PDF upload,
 * audit logging, version conflict detection, and form locking (admin-only unlock).
 *
 * @param {Object} params
 * @param {Array}    params.forms           - Current array of form objects.
 * @param {Function} params.setForms        - React state setter for forms.
 * @param {Object|null} params.editingForm  - The form currently being edited, or null.
 * @param {Function} params.setEditingForm  - React state setter for editingForm.
 * @param {Function} params.setCurrentView  - React state setter for the active view/route.
 * @returns {Object} Manager object containing state (successModal, viewFormModal,
 *   deleteConfirmModal, updateConfirmModal, isUpdating, backedUpForms, savedSignatures,
 *   deletingFormRef) and methods (addForm, updateForm, unlockForm, confirmUpdate,
 *   continueEditing, cancelUpdate, deleteForm, handleDownloadPDF, closeSuccessModal,
 *   markAsBackedUp, isFormBackedUp, updateSignatures, signatureReuseWarning).
 */
function useFormManager({
  forms,
  setForms,
  editingForm,
  setEditingForm,
  setCurrentView
}) {
  const [successModal, setSuccessModal] = useState(null);
  const [viewFormModal, setViewFormModal] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [updateConfirmModal, setUpdateConfirmModal] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [backedUpForms, setBackedUpForms] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BACKED_UP_FORMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : Object.values(parsed || {});
      }
    } catch (e) {
      console.warn('Could not parse backed-up forms:', e);
    }
    return [];
  });
  const [savedSignatures, setSavedSignatures] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEAM_SIGNATURES);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Could not parse team signatures:', e);
      return {};
    }
  });
  const deletingFormRef = useRef(false);

  // Mark form as backed up (after PDF download)
  const markAsBackedUp = formId => {
    const newBackedUp = [...backedUpForms, formId];
    setBackedUpForms(newBackedUp);
    localStorage.setItem(STORAGE_KEYS.BACKED_UP_FORMS, JSON.stringify(newBackedUp));
  };

  // Check if form is backed up
  const isFormBackedUp = formId => backedUpForms.includes(formId);

  // Update team signatures
  const updateSignatures = newSignatures => {
    setSavedSignatures(newSignatures);
    if (typeof StorageQuotaManager !== 'undefined' && StorageQuotaManager.safeSignaturesWrite) {
      StorageQuotaManager.safeSignaturesWrite(newSignatures);
    } else {
      localStorage.setItem(STORAGE_KEYS.TEAM_SIGNATURES, JSON.stringify(newSignatures));
    }
    if (FirebaseSync.isConnected()) {
      firebaseDb.ref('signatures').set(newSignatures)
        .catch(err => console.error('Signature sync error:', err));
    }
  };

  // Signature reuse warning flag — components should show amber banner when using saved signatures
  const signatureReuseWarning = Object.keys(savedSignatures).length > 0 ? 'Saved signatures are being reused. Ensure each signer is physically present and consents to signing.' : null;

  // Add a new form
  const addForm = (formType, formData) => {
    try {
      const uniqueId = Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
      const newForm = {
        id: uniqueId,
        type: formType,
        data: formData,
        createdAt: new Date().toISOString(),
        createdBy: DeviceAuthManager.deviceId || 'unknown',
        createdByName: localStorage.getItem(STORAGE_KEYS.USER_NAME) || 'Unknown User',
        version: 1,
        status: 'completed',
        locked: true // Forms are locked after submission — only admins can edit
      };
      console.log('addForm called, current forms:', forms.length);
      setForms(prevForms => {
        const updatedForms = [newForm, ...prevForms];
        console.log('setForms update, new length:', updatedForms.length);

        // Safe write to localStorage (strips large data, trims to fit)
        StorageQuotaManager.safeFormsWrite(updatedForms);

        // Sync full form (with photos) to Firebase — Firebase is the source of truth
        if (FirebaseSync.isConnected()) {
          FirebaseSync.syncForms(updatedForms).then(() => {
            console.log('Synced to Firebase');
          }).catch(err => console.error('Firebase sync error:', err));
        }
        return updatedForms;
      });

      // Auto-download PDF + upload to Drive
      setTimeout(() => {
        try {
          const filename = PDFGenerator.download(newForm);
          markAsBackedUp(newForm.id);
          console.log('Auto-saved PDF:', filename);

          // Upload PDF to Google Drive (non-blocking — form is already saved)
          if (typeof GoogleDriveSync !== 'undefined' && GoogleDriveSync.isConnected()) {
            try {
              const {
                doc
              } = PDFGenerator.generate(newForm);
              const pdfBlob = doc.output('blob');
              GoogleDriveSync.uploadPDF(pdfBlob, filename, formType).then(function (r) {
                if (r) console.log('PDF uploaded to Drive:', filename);
              }).catch(function (e) {
                console.error('Drive PDF upload error:', e);
                if (typeof ToastNotifier !== 'undefined') ToastNotifier.warning('PDF saved locally but Drive upload failed');
              });
            } catch (driveErr) {
              console.error('Drive PDF generation error:', driveErr);
              if (typeof ToastNotifier !== 'undefined') ToastNotifier.warning('Could not generate PDF for Drive backup');
            }
          }
        } catch (pdfErr) {
          console.error('PDF generation error:', pdfErr);
        }
      }, 500);

      // AUDIT LOG
      AuditLogManager.log('create', {
        formId: newForm.id,
        formType: formType,
        site: formData.siteConducted || formData.site || 'Unknown',
        action: 'Form created'
      });
      setSuccessModal({
        form: newForm,
        type: formType
      });
    } catch (err) {
      console.error('Error saving form:', err);
      alert('Error saving form: ' + err.message + '. Please try again.');
    }
  };

  // Unlock a locked form (admin only)
  const unlockForm = formId => {
    if (!DeviceAuthManager.isAdmin) {
      alert('Only admins can unlock submitted forms for editing.');
      return false;
    }
    setForms(prevForms => {
      const updated = prevForms.map(f => f.id === formId ? {
        ...f,
        locked: false
      } : f);
      StorageQuotaManager.safeFormsWrite(updated);
      return updated;
    });
    AuditLogManager.log('unlock', {
      formId,
      action: 'Form unlocked for editing by admin'
    });
    return true;
  };

  // Show confirmation modal before updating
  const updateForm = (formId, formType, formData) => {
    // Check if form is locked — only admins can edit locked forms
    if (editingForm?.locked) {
      if (!DeviceAuthManager.isAdmin) {
        alert('This form has been submitted and locked. Only an admin can edit it.');
        return;
      }
      // Admin can proceed — form will be unlocked during update
      console.log('Admin editing locked form:', formId);
    }
    console.log('updateForm called - showing confirmation for id:', formId);
    const updatedForm = {
      id: formId,
      type: formType,
      data: formData,
      createdAt: editingForm?.createdAt,
      createdBy: editingForm?.createdBy,
      createdByName: editingForm?.createdByName,
      updatedAt: new Date().toISOString(),
      modifiedBy: DeviceAuthManager.deviceId || 'unknown',
      modifiedByName: localStorage.getItem(STORAGE_KEYS.USER_NAME) || 'Unknown User',
      version: (editingForm?.version || 1) + 1,
      previousVersion: editingForm ? {
        data: editingForm.data,
        modifiedAt: editingForm.updatedAt || editingForm.createdAt,
        modifiedBy: editingForm.modifiedBy || editingForm.createdBy
      } : null,
      status: 'completed'
    };
    setUpdateConfirmModal({
      form: updatedForm,
      formType,
      formData,
      originalForm: editingForm
    });
  };

  // Go back to editing mode
  const continueEditing = () => {
    setUpdateConfirmModal(null);
  };

  // Confirm and sync the update — checks remote version before overwriting
  const confirmUpdate = async () => {
    if (!updateConfirmModal) return;
    setIsUpdating(true);
    const {
      form,
      formType,
      formData,
      originalForm
    } = updateConfirmModal;
    const siteName = formData.siteConducted || formData.site || '';
    try {
      // Version check: read remote version from Firebase before writing
      if (FirebaseSync.isConnected() && form.id) {
        try {
          const remoteSnap = await firebaseDb.ref(FB_PATHS.FORMS + '/' + form.id).once('value');
          const remoteForm = remoteSnap.val();
          if (remoteForm && remoteForm.version && originalForm && originalForm.version) {
            if (remoteForm.version > originalForm.version) {
              const overwrite = window.confirm('This form was updated by another device (v' + remoteForm.version + ' vs your v' + originalForm.version + '). Overwrite with your changes?');
              if (!overwrite) {
                setIsUpdating(false);
                return;
              }
            }
          }
        } catch (versionErr) {
          console.warn('Version check skipped (non-fatal):', versionErr.message);
        }
      }
      if (GoogleDriveSync.isConnected() && siteName) {
        console.log('Searching for old PDFs to delete...');
        await GoogleDriveSync.deleteOldFormPDFs(form.id, siteName);
      }
      setForms(prevForms => {
        const updatedForms = prevForms.map(f => {
          if (f.id === form.id) {
            return {
              ...f,
              data: formData,
              updatedAt: new Date().toISOString(),
              version: form.version,
              modifiedBy: form.modifiedBy,
              modifiedByName: form.modifiedByName,
              previousVersion: form.previousVersion,
              status: form.status || 'completed'
            };
          }
          return f;
        });
        StorageQuotaManager.safeFormsWrite(updatedForms);
        console.log('Updated form saved to localStorage');
        if (FirebaseSync.isConnected()) {
          FirebaseSync.syncForms(updatedForms).then(() => {
            console.log('Updated form synced to Firebase');
          }).catch(err => console.error('Firebase sync error:', err));
        }
        return updatedForms;
      });
      const filename = PDFGenerator.download(form);
      markAsBackedUp(form.id);
      console.log('Downloaded updated PDF:', filename);
      if (GoogleDriveSync.isConnected()) {
        const {
          doc
        } = PDFGenerator.generate(form);
        const pdfBlob = doc.output('blob');
        await GoogleDriveSync.uploadPDF(pdfBlob, filename, form.type);
        console.log('Uploaded new PDF to Drive:', form.type);
      }
      AuditLogManager.log('update', {
        formId: form.id,
        formType: formType,
        site: formData.siteConducted || formData.site || 'Unknown',
        version: form.version || 2,
        action: 'Form updated'
      });
      setUpdateConfirmModal(null);
      setEditingForm(null);
      setIsUpdating(false);
      setSuccessModal({
        form,
        type: formType,
        wasUpdated: true
      });
    } catch (error) {
      console.error('Error during update:', error);
      setIsUpdating(false);
      alert('Error updating form. Please try again.');
    }
  };

  // Cancel update and go back to dashboard
  const cancelUpdate = () => {
    setUpdateConfirmModal(null);
    setEditingForm(null);
    setCurrentView('dashboard');
  };
  const handleDownloadPDF = () => {
    if (successModal?.form) {
      const filename = PDFGenerator.download(successModal.form);
      markAsBackedUp(successModal.form.id);
      console.log('Downloaded and backed up:', filename);
    }
  };
  const closeSuccessModal = () => {
    setSuccessModal(null);
    setEditingForm(null);
    setCurrentView('dashboard');
  };

  // Delete form (with backup check) — uses setForms callback to avoid stale closure
  const deleteForm = formId => {
    setDeleteConfirmModal(null);
    setViewFormModal(null);
    setForms(prevForms => {
      const deletedForm = prevForms.find(f => f.id === formId);
      const updatedForms = prevForms.filter(f => f.id !== formId);
      AuditLogManager.log('delete', {
        formId: formId,
        formType: deletedForm?.type || 'unknown',
        site: deletedForm?.data?.siteConducted || deletedForm?.data?.site || 'Unknown',
        originalCreatedBy: deletedForm?.createdBy,
        originalCreatedAt: deletedForm?.createdAt,
        action: 'Form deleted'
      });
      StorageQuotaManager.safeFormsWrite(updatedForms);
      console.log('Form deleted, saved to localStorage:', updatedForms.length, 'forms remaining');
      deletingFormRef.current = true;
      if (FirebaseSync.isConnected()) {
        FirebaseSync.syncForms(updatedForms).then(() => {
          console.log('Deletion synced to Firebase');
          deletingFormRef.current = false;
        }).catch(err => {
          console.error('Failed to sync deletion to Firebase:', err);
          deletingFormRef.current = false;
        });
      } else {
        deletingFormRef.current = false;
      }
      return updatedForms;
    });
  };
  return {
    // State
    successModal,
    viewFormModal,
    setViewFormModal,
    deleteConfirmModal,
    setDeleteConfirmModal,
    updateConfirmModal,
    isUpdating,
    backedUpForms,
    savedSignatures,
    deletingFormRef,
    // Functions
    addForm,
    updateForm,
    unlockForm,
    confirmUpdate,
    continueEditing,
    cancelUpdate,
    deleteForm,
    handleDownloadPDF,
    closeSuccessModal,
    markAsBackedUp,
    isFormBackedUp,
    updateSignatures,
    signatureReuseWarning
  };
}

// =============================================
// useDataSync - Firebase/localStorage sync
// =============================================
/**
 * Firebase + localStorage data synchronization.
 * On mount, loads forms and sites from localStorage, then subscribes to Firebase
 * real-time listeners for two-way sync. Includes anti-loop protection (prevents
 * echoing Firebase data back), throttled writes, corrupted-sites cleanup, and
 * online/offline detection.
 *
 * @param {Object} params
 * @param {Function}  params.setForms        - React state setter for forms array.
 * @param {Function}  params.setSites        - React state setter for sites array.
 * @param {Object}    params.deletingFormRef  - React ref flagging an in-progress deletion
 *                                              (prevents Firebase listener from re-adding the form).
 * @returns {Object} Sync state and helpers: { isOnline, syncStatus, pendingSyncCount,
 *   pendingPhotoCount, syncError, showSyncBanner, syncFormsEffect, syncSitesEffect }.
 */
function useDataSync({
  setForms,
  setSites,
  deletingFormRef
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncStatus, setSyncStatus] = useState(FirebaseSync.isConnected() ? 'synced' : 'local');
  const [pendingSyncCount, setPendingSyncCount] = useState(FirebaseSync.getPendingCount());
  const [pendingPhotoCount, setPendingPhotoCount] = useState(OfflinePhotoQueue.getCount());
  const [syncError, setSyncError] = useState(null);
  const [showSyncBanner, setShowSyncBanner] = useState(!FirebaseSync.isConnected());
  const isInitialLoad = useRef(true);
  const formsFromFirebaseRef = useRef(false); // Anti-loop: skip syncing back to Firebase when data came FROM Firebase
  const sitesFromFirebaseRef = useRef(false);
  const lastFormsWriteRef = useRef(0); // throttle forms listener writes

  // Load saved data from localStorage first, then listen to Firebase
  useEffect(() => {
    const savedForms = localStorage.getItem(STORAGE_KEYS.FORMS);
    let localForms = [];
    if (savedForms) {
      try {
        localForms = JSON.parse(savedForms);
        setForms(localForms);
        console.log('Loaded from localStorage:', localForms.length, 'forms');
      } catch (e) {
        console.error('Error parsing localStorage forms:', e);
        if (typeof ToastNotifier !== 'undefined') ToastNotifier.warning('Form data may be corrupted. Try Fix Everything in Settings.');
        if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(e, 'forms-parse');
      }
    }
    const savedSites = localStorage.getItem(STORAGE_KEYS.SITES);
    if (savedSites) {
      try {
        const parsed = JSON.parse(savedSites);
        const sanitized = [...new Set((Array.isArray(parsed) ? parsed : Object.values(parsed || {})).map(s => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') {
            const chars = Object.keys(s).filter(k => k !== '_lastModified' && !isNaN(k)).sort((a, b) => Number(a) - Number(b));
            return chars.map(k => s[k]).join('');
          }
          return String(s);
        }).filter(s => s && s.length > 1 && s !== 'undefined' && s !== 'null'))];
        setSites(sanitized);
        localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(sanitized));
      } catch (e) {
        console.error('Error parsing localStorage sites:', e);
        if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(e, 'sites-parse');
      }
    }
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    if (lastSync) setLastSynced(lastSync);
    if (FirebaseSync.isConnected()) {
      const unsubForms = FirebaseSync.onFormsChange(firebaseForms => {
        const formsArray = Array.isArray(firebaseForms) ? firebaseForms : Object.values(firebaseForms || {});

        // Throttle: skip if last write was <5s ago (prevents rapid-fire listener loop)
        const now = Date.now();
        if (now - lastFormsWriteRef.current < 5000) return;
        lastFormsWriteRef.current = now;
        console.log('Firebase forms received:', formsArray.length, 'forms');
        if (deletingFormRef.current) {
          deletingFormRef.current = false;
        }
        if (formsArray.length > 0) {
          const formMap = new Map();
          formsArray.forEach(form => {
            formMap.set(form.id, {
              ...form,
              source: 'firebase'
            });
          });

          // Merge with local-only forms (forms not yet in Firebase)
          let currentLocalForms = [];
          try {
            const freshLocal = localStorage.getItem(STORAGE_KEYS.FORMS);
            if (freshLocal) currentLocalForms = JSON.parse(freshLocal);
          } catch (e) {/* ignore */}
          currentLocalForms.forEach(localForm => {
            if (!formMap.has(localForm.id)) {
              formMap.set(localForm.id, {
                ...localForm,
                source: 'local'
              });
            }
          });
          const mergedForms = [];
          formMap.forEach(form => mergedForms.push(form));
          mergedForms.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

          // Update React state with full data (including photos for viewing)
          formsFromFirebaseRef.current = true; // Prevent syncFormsEffect from sending back to Firebase
          setForms(mergedForms);

          // Write to localStorage using safe writer (strips large data, trims to fit)
          StorageQuotaManager.safeFormsWrite(mergedForms);
          console.log('Forms synced:', mergedForms.length, 'total');
        } else {
          // Firebase returned empty — check if we have local forms to push
          // Read fresh from localStorage to avoid stale closure over initial localForms
          let freshLocalForms = [];
          try {
            const freshLocal = localStorage.getItem(STORAGE_KEYS.FORMS);
            if (freshLocal) freshLocalForms = JSON.parse(freshLocal);
          } catch (e) {/* ignore */}
          if (freshLocalForms.length > 0) {
            console.log('Firebase empty, pushing local forms to Firebase');
            FirebaseSync.syncForms(freshLocalForms);
          }
        }
        setSyncStatus('synced');
        setLastSynced(new Date().toISOString());
        setSyncError(null);
      });
      const unsubSites = FirebaseSync.onSitesChange(firebaseSites => {
        const rawArray = Array.isArray(firebaseSites) ? firebaseSites : Object.values(firebaseSites || {});
        const sitesArray = [...new Set(rawArray.map(s => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') {
            const chars = Object.keys(s).filter(k => k !== '_lastModified' && !isNaN(k)).sort((a, b) => Number(a) - Number(b));
            return chars.map(k => s[k]).join('');
          }
          return String(s);
        }).filter(s => s && s.length > 0 && s !== 'undefined' && s !== 'null'))];
        if (sitesArray.length > 0) {
          sitesFromFirebaseRef.current = true;
          setSites(sitesArray);
          localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(sitesArray));
        }
      });

      // ONE-TIME CLEANUP: Fix corrupted Firebase sites data
      (async () => {
        try {
          const sitesSnap = await firebaseDb.ref(FB_PATHS.SITES).once('value');
          const rawData = sitesSnap.val();
          if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
            console.log('CLEANUP: Firebase sites is corrupted object, fixing...');
            const cleanSites = [...new Set(Object.values(rawData).map(s => {
              if (typeof s === 'string') return s;
              if (s && typeof s === 'object') {
                const chars = Object.keys(s).filter(k => k !== '_lastModified' && !isNaN(k)).sort((a, b) => Number(a) - Number(b));
                return chars.map(k => s[k]).join('');
              }
              return null;
            }).filter(s => s && s.length > 1 && s !== 'undefined' && s !== 'null'))];
            console.log('CLEANUP: Replacing with', cleanSites.length, 'clean sites:', cleanSites);
            sitesFromFirebaseRef.current = true;
            await firebaseDb.ref(FB_PATHS.SITES).set(cleanSites);
            setSites(cleanSites);
            localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(cleanSites));
            console.log('CLEANUP: Firebase sites fixed!');
          }
        } catch (err) {
          console.warn('Sites cleanup skipped:', err.message);
        }
      })();
      setTimeout(() => {
        isInitialLoad.current = false;
      }, 1000);
      return () => {
        unsubForms();
        unsubSites();
      };
    } else {
      isInitialLoad.current = false;
    }
  }, []);

  // Save forms to localStorage and sync to Firebase
  const syncFormsEffect = forms => {
    if (!isInitialLoad.current) {
      try {
        // FIXED: Use safeFormsWrite instead of raw setItem.
        // Raw setItem wrote unstripped base64 photos from React state → storage bomb.
        // safeFormsWrite strips large data and enforces 2MB cap.
        StorageQuotaManager.safeFormsWrite(forms);
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      } catch (storageErr) {
        console.error('[syncFormsEffect] localStorage write failed:', storageErr.message, '— forms NOT lost, still in React state');
        // Don't crash — forms are still in React state and can be synced to Firebase
      }
      setLastSynced(new Date().toISOString());
      console.log('Forms saved to localStorage:', forms.length, 'forms');

      // FIXED: Anti-loop — don't send forms back to Firebase when they just came FROM Firebase.
      // Without this, the Firebase listener → setForms → syncFormsEffect → syncForms loop
      // sent full photo data back on every update, and if the write failed, the ENTIRE
      // forms array (with photos) was stored in the sync queue → 5MB+ in localStorage.
      // syncSitesEffect already had this protection (sitesFromFirebaseRef). Forms didn't.
      if (formsFromFirebaseRef.current) {
        formsFromFirebaseRef.current = false;
        setSyncStatus('synced');
        return;
      }
      if (FirebaseSync.isConnected() && isOnline && forms.length > 0) {
        setSyncStatus('syncing');
        FirebaseSync.syncForms(forms).then(() => {
          setSyncStatus('synced');
          console.log('Forms synced to Firebase:', forms.length, 'forms');
        }).catch(err => {
          setSyncStatus('offline');
          console.error('Firebase sync failed:', err);
        });
      }
    }
  };

  // Save sites to localStorage and sync to Firebase
  const syncSitesEffect = sites => {
    if (sites.length > 0 && !isInitialLoad.current) {
      localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(sites));
      if (sitesFromFirebaseRef.current) {
        sitesFromFirebaseRef.current = false;
        return;
      }
      if (FirebaseSync.isConnected() && isOnline) {
        FirebaseSync.syncSites(sites);
      }
    }
  };

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync status listener — only show errors for real Firebase failures, not localStorage issues
  useEffect(() => {
    const unsubscribe = FirebaseSync.onSyncStatusChange((status, details) => {
      setPendingSyncCount(details?.pending || 0);
      if (status === 'synced' && details?.pending === 0) {
        setSyncStatus('synced');
        setSyncError(null);
      } else if (status === 'queued' || details?.pending > 0) {
        setSyncStatus('pending');
      } else if (status === 'circuit_open' || status === 'circuit_reset') {
        // Circuit breaker is a storage issue, not a sync issue — don't alarm the user
        setSyncStatus(FirebaseSync.isConnected() ? 'synced' : 'pending');
      } else if (status === 'error' || status === 'failed') {
        // Only show sync error if Firebase is actually disconnected
        const msg = details?.message || details?.error || '';
        if (msg.indexOf('Storage') !== -1 || msg.indexOf('quota') !== -1 || msg.indexOf('storage') !== -1) {
          // Storage error — Firebase is fine, just localStorage is full
          setSyncStatus(FirebaseSync.isConnected() ? 'synced' : 'pending');
        } else {
          setSyncStatus('error');
          setSyncError(msg || 'Sync failed');
        }
      }
    });
    return unsubscribe;
  }, []);

  // Photo queue listener
  useEffect(() => {
    const unsubscribe = OfflinePhotoQueue.subscribe((count, isProcessing) => {
      setPendingPhotoCount(count);
    });
    return unsubscribe;
  }, []);
  return {
    isOnline,
    lastSynced,
    syncStatus,
    setSyncStatus,
    pendingSyncCount,
    pendingPhotoCount,
    syncError,
    showSyncBanner,
    setShowSyncBanner,
    isInitialLoad,
    sitesFromFirebaseRef,
    syncFormsEffect,
    syncSitesEffect
  };
}

// =============================================
// useDeviceAuth - Device authorization state
// =============================================
/**
 * Device authorization hook.
 * Initialises DeviceAuth on mount (with a retry if Firebase DB is not yet connected),
 * sets up admin notification listeners, pending/approved device listeners, and polls
 * for approval when the current device is still pending.
 *
 * @returns {Object} Auth state: { deviceAuthStatus, isDeviceAdmin, canViewDevices,
 *   canRevokeDevices, pendingDevices, approvedDevices, newDeviceNotification }.
 */
function useDeviceAuth() {
  const [deviceAuthStatus, setDeviceAuthStatus] = useState('checking');
  const [isDeviceAdmin, setIsDeviceAdmin] = useState(false);
  const [canViewDevices, setCanViewDevices] = useState(false);
  const [canRevokeDevices, setCanRevokeDevices] = useState(false);
  const [pendingDevices, setPendingDevices] = useState([]);
  const [approvedDevices, setApprovedDevices] = useState([]);
  const [newDeviceNotification, setNewDeviceNotification] = useState(null);
  useEffect(() => {
    const cleanups = [];
    const initDeviceAuth = async () => {
      // Wait for Firebase DB WebSocket to connect before checking device auth.
      // DeviceAuth.init() may fail if called before DB is ready (returns approved:false
      // even though device IS approved). Retry once after a delay if initial check fails.
      let result = await DeviceAuth.init();
      if (!result.approved && typeof firebaseDb !== 'undefined' && firebaseDb) {
        // First attempt failed — Firebase DB may not have been connected yet.
        // Wait for connection and retry once.
        try {
          await new Promise(function (resolve) {
            const timeout = setTimeout(resolve, 6000);
            if (firebaseDb) {
              const ref = firebaseDb.ref('.info/connected');
              var handler = ref.on('value', function (snap) {
                if (snap.val() === true) {
                  clearTimeout(timeout);
                  ref.off('value', handler);
                  resolve();
                }
              });
            } else {
              resolve();
            }
          });
          result = await DeviceAuth.checkDeviceStatus();
        } catch (e) {
          console.warn('DeviceAuth retry failed:', e.message);
        }
      }
      if (result.approved) {
        setDeviceAuthStatus('approved');
        setIsDeviceAdmin(result.admin);
        setCanViewDevices(result.canViewDevices || result.admin);
        setCanRevokeDevices(result.canRevokeDevices || result.admin);
        if (result.admin) {
          DeviceAuth.requestNotificationPermission();
          const unsubNotify = DeviceAuth.onNotification((type, data) => {
            if (type === 'new_device') {
              setNewDeviceNotification(data);
              DeviceAuth.showBrowserNotification('New Device Request', data.type + ' (' + data.browser + ') wants to access J&M Artsteel Safety');
              setTimeout(() => setNewDeviceNotification(null), 10000);
            }
          });
          if (unsubNotify) cleanups.push(unsubNotify);
        }
        if (result.admin || result.canViewDevices || result.canRevokeDevices) {
          const unsubPending = DeviceAuth.listenForPendingDevices(devices => {
            setPendingDevices(devices);
          });
          if (unsubPending) cleanups.push(unsubPending);
          const unsubApproved = DeviceAuth.listenForApprovedDevices(devices => {
            setApprovedDevices(devices);
          });
          if (unsubApproved) cleanups.push(unsubApproved);
        }
        const unsubOwnStatus = DeviceAuth.listenForOwnDeviceStatus(status => {
          if (status.revoked) {
            setDeviceAuthStatus('denied');
            alert('Your device access has been revoked by an administrator.');
          }
        });
        if (unsubOwnStatus) cleanups.push(unsubOwnStatus);
      } else {
        setDeviceAuthStatus('pending');
        const pollInterval = IntervalRegistry.setInterval(async () => {
          const checkResult = await DeviceAuth.checkDeviceStatus();
          if (checkResult.approved) {
            setDeviceAuthStatus('approved');
            setIsDeviceAdmin(checkResult.admin);
            IntervalRegistry.clearInterval(pollInterval);
            window.location.reload();
          }
        }, 5000, 'DeviceApprovalPoll');
        cleanups.push(() => IntervalRegistry.clearInterval(pollInterval));
      }
    };
    initDeviceAuth();
    return () => {
      cleanups.forEach(fn => {
        try {
          fn();
        } catch (e) {}
      });
    };
  }, []);
  return {
    deviceAuthStatus,
    isDeviceAdmin,
    canViewDevices,
    canRevokeDevices,
    pendingDevices,
    approvedDevices,
    newDeviceNotification,
    setNewDeviceNotification
  };
}

// =============================================
// usePWAInstall - PWA install prompt
// =============================================
/**
 * PWA install prompt hook.
 * Captures the browser's `beforeinstallprompt` event and exposes controls to
 * show, trigger, or dismiss the install banner. The prompt is delayed 30 seconds
 * and respects a localStorage dismissal flag.
 *
 * @returns {Object} Install state and actions: { showInstallPrompt, handleInstall, dismissInstall }.
 */
function usePWAInstall() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  useEffect(() => {
    const handler = e => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem(STORAGE_KEYS.INSTALL_DISMISSED);
      if (!dismissed) {
        setTimeout(() => setShowInstallPrompt(true), 30000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const {
        outcome
      } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };
  const dismissInstall = () => {
    setShowInstallPrompt(false);
    localStorage.setItem(STORAGE_KEYS.INSTALL_DISMISSED, 'true');
  };
  return {
    showInstallPrompt,
    handleInstall,
    dismissInstall
  };
}

// =============================================
// useAutoSave - Auto-save form drafts to localStorage
// =============================================
/**
 * Auto-saves form data to localStorage at regular intervals.
 * Stores drafts under a prefixed key and discards them after 24 hours.
 * Provides helpers to load an existing draft or clear it after submission.
 *
 * @param {string} formKey      - Unique key identifying this form (used as localStorage suffix).
 * @param {Object} formData     - Current form field values to persist.
 * @param {number} [intervalMs=30000] - Save interval in milliseconds (default 30 seconds).
 * @returns {Object} Draft helpers: { loadDraft, clearDraft }.
 */
function useAutoSave(formKey, formData, intervalMs) {
  const saveInterval = intervalMs || 30000; // default 30 seconds
  const draftKey = STORAGE_KEYS.DRAFT_PREFIX + formKey;

  // Save draft periodically
  useEffect(() => {
    if (!formData || !formKey) return;
    const timer = IntervalRegistry.setInterval(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          data: formData,
          savedAt: Date.now()
        }));
      } catch (e) {
        console.warn('[AutoSave] Could not save draft:', e.message);
      }
    }, saveInterval, 'useAutoSave-' + formKey);
    return () => IntervalRegistry.clearInterval(timer);
  }, [formData, formKey]);

  // Load existing draft
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const ageMinutes = Math.round((Date.now() - parsed.savedAt) / 60000);
        if (ageMinutes < 1440) {
          // Discard drafts older than 24 hours
          return {
            data: parsed.data,
            ageMinutes
          };
        }
        localStorage.removeItem(draftKey); // Expired draft
      }
    } catch (e) {
      console.warn('[AutoSave] Could not load draft:', e.message);
    }
    return null;
  };

  // Clear draft (after successful submission)
  const clearDraft = () => {
    localStorage.removeItem(draftKey);
  };
  return {
    loadDraft,
    clearDraft
  };
}

// =============================================
// useBeforeUnload - Warn when form has unsaved data
// =============================================
/**
 * Registers a `beforeunload` warning when the user has unsaved changes.
 * The browser will show a confirmation dialog if the user attempts to
 * navigate away or close the tab while unsaved data exists.
 *
 * @param {boolean} hasUnsavedData - Whether there are currently unsaved changes.
 */
function useBeforeUnload(hasUnsavedData) {
  useEffect(() => {
    if (!hasUnsavedData) return;
    const handler = e => {
      e.preventDefault();
      e.returnValue = 'You have unsaved form data. Are you sure you want to leave?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedData]);
}

// =============================================
// useFormState - Consolidate form field useState calls
// =============================================
/**
 * Manages form field state with reset capability.
 * Replaces many individual `useState` calls with a single state object keyed by
 * field name. Automatically resets fields when `editingForm` changes (detected
 * via `editingForm.id`). Populates initial values from `editingForm.data`,
 * falling back to the provided defaults.
 *
 * @param {Object}      defaults     - Default values for every field (e.g. `{ siteConducted: '', preparedBy: '' }`).
 * @param {Object|null} editingForm  - The form being edited, or null for a new form.
 * @returns {Object} State and setters: { fields, setField, setFields, resetFields }.
 *
 * @example
 *   const DEFAULTS = { siteConducted: '', preparedBy: '', signature: null };
 *   const { fields, setField, setFields, resetFields } = useFormState(DEFAULTS, editingForm);
 *   // fields.siteConducted, setField('siteConducted', 'value'), etc.
 */
function useFormState(defaults, editingForm) {
  const initFromData = data => {
    const result = {};
    for (const key in defaults) {
      result[key] = data && data[key] != null ? data[key] : defaults[key];
    }
    return result;
  };
  const [fields, setFieldsState] = useState(() => initFromData(editingForm?.data));
  const setField = (name, value) => {
    setFieldsState(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const setFields = updates => {
    setFieldsState(prev => ({
      ...prev,
      ...updates
    }));
  };
  const resetFields = data => {
    setFieldsState(initFromData(data));
  };
  useEffect(() => {
    resetFields(editingForm?.data);
  }, [editingForm?.id]);
  return {
    fields,
    setField,
    setFields,
    resetFields
  };
}

// Export to window for cross-file access
window.useFormManager = useFormManager;
window.useDataSync = useDataSync;
window.useDeviceAuth = useDeviceAuth;
window.usePWAInstall = usePWAInstall;
window.useAutoSave = useAutoSave;
window.useBeforeUnload = useBeforeUnload;
window.useFormState = useFormState;

// === js/components/modals.jsx ===
// Modal & Banner Components
// Extracted from app.jsx for maintainability

// =============================================
// Success Modal - shown after form submission
// =============================================
/**
 * Form submission success dialog with PDF download option.
 * @param {Object} props
 * @param {Object|null} props.successModal - The submitted form object, or null to hide the modal
 * @param {Function} props.onDownloadPDF - Callback to download the submitted form as PDF
 * @param {Function} props.onClose - Callback to close the modal and return to dashboard
 */
function SuccessModal({
  successModal,
  onDownloadPDF,
  onClose
}) {
  const trapRef = useFocusTrap(!!successModal, onClose);
  if (!successModal) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "success-modal-title"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden",
    ref: trapRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-green-500 text-white p-6 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-5xl mb-3",
    "aria-hidden": "true"
  }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
    id: "success-modal-title",
    className: "text-xl font-bold"
  }, "Form Submitted!"), /*#__PURE__*/React.createElement("p", {
    className: "text-green-100 text-sm mt-1"
  }, PDFGenerator.folderMap[successModal.type] || successModal.type)), /*#__PURE__*/React.createElement("div", {
    className: "p-6 space-y-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-center text-sm"
  }, "Your form has been saved", FirebaseSync.isConnected() ? ' and synced to the cloud' : '', "."), /*#__PURE__*/React.createElement("button", {
    onClick: onDownloadPDF,
    className: "w-full bg-orange-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-orange-700 transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "\uD83D\uDCE5"), "Download PDF"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-400 text-center"
  }, "Save to Google Drive / JMart Steel / Safety Forms"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition"
  }, "Back to Dashboard"))));
}

// =============================================
// View Form Modal - shows form details
// =============================================
/**
 * Form detail viewer modal with edit, download, and delete actions.
 * @param {Object} props
 * @param {Object|null} props.viewFormModal - The form object to display, or null to hide
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Function} props.onEdit - Callback to enter edit mode for the form
 * @param {Function} props.onDownloadPDF - Callback to download the form as PDF
 * @param {Function} props.onDelete - Callback to initiate form deletion
 */
function ViewFormModal({
  viewFormModal,
  onClose,
  onEdit,
  onDownloadPDF,
  onDelete
}) {
  const trapRef = useFocusTrap(!!viewFormModal, onClose);
  if (!viewFormModal) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "view-form-title"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col",
    ref: trapRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-600 text-white p-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h2", {
    id: "view-form-title",
    className: "text-lg font-bold"
  }, PDFGenerator.folderMap[viewFormModal.type] || viewFormModal.type), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-white text-2xl",
    "aria-label": "Close"
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-gray-500"
  }, new Date(viewFormModal.createdAt).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }), ' at ', new Date(viewFormModal.createdAt).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit'
  })), viewFormModal.data && Object.entries(viewFormModal.data).map(([key, value]) => {
    if (!value || typeof value === 'object') return null;
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    return /*#__PURE__*/React.createElement("div", {
      key: key,
      className: "border-b border-gray-100 pb-2"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-500"
    }, label), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-800"
    }, String(value)));
  })), /*#__PURE__*/React.createElement("div", {
    className: "p-4 border-t border-gray-200 space-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onEdit(viewFormModal),
    className: "w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\u270F\uFE0F"), " Modify Form"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDownloadPDF(viewFormModal),
    className: "w-full bg-orange-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCE5"), " Download PDF"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDelete(viewFormModal),
    className: "w-full bg-red-100 text-red-600 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDDD1\uFE0F"), " Delete Form"))));
}

// =============================================
// Delete Confirmation Modal
// =============================================
/**
 * Deletion confirmation dialog with backup warning.
 * @param {Object} props
 * @param {Object|null} props.deleteConfirmModal - The form object to delete, or null to hide
 * @param {Function} props.isFormBackedUp - Returns whether a given form ID has been backed up
 * @param {Function} props.onDownloadPDF - Callback to download PDF before deleting
 * @param {Function} props.onDelete - Callback to permanently delete the form by ID
 * @param {Function} props.onCancel - Callback to cancel and close the dialog
 */
function DeleteConfirmModal({
  deleteConfirmModal,
  isFormBackedUp,
  onDownloadPDF,
  onDelete,
  onCancel
}) {
  const trapRef = useFocusTrap(!!deleteConfirmModal, onCancel);
  if (!deleteConfirmModal) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "delete-modal-title"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden",
    ref: trapRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-red-500 text-white p-4 text-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-4xl",
    "aria-hidden": "true"
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("h2", {
    id: "delete-modal-title",
    className: "text-lg font-bold mt-2"
  }, "Delete Form?")), /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-4"
  }, !isFormBackedUp(deleteConfirmModal.id) ? /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-yellow-800 text-sm font-medium"
  }, "This form has NOT been backed up!"), /*#__PURE__*/React.createElement("p", {
    className: "text-yellow-700 text-xs mt-1"
  }, "Download the PDF first to save a copy.")) : /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 border border-green-200 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-green-800 text-sm"
  }, "\u2713 This form has been backed up")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, !isFormBackedUp(deleteConfirmModal.id) && /*#__PURE__*/React.createElement("button", {
    onClick: () => onDownloadPDF(deleteConfirmModal),
    className: "w-full bg-orange-600 text-white py-3 rounded-xl font-semibold"
  }, "\uD83D\uDCE5 Download PDF First"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDelete(deleteConfirmModal.id),
    className: "w-full bg-red-600 text-white py-3 rounded-xl font-semibold"
  }, "\uD83D\uDDD1\uFE0F Delete Permanently"), /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    className: "w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium"
  }, "Cancel")))));
}

// =============================================
// Update Confirmation Modal
// =============================================
/**
 * Form update confirmation dialog.
 * @param {Object} props
 * @param {Object|null} props.updateConfirmModal - The form update data, or null to hide
 * @param {boolean} props.isUpdating - Whether an update is currently in progress
 * @param {Function} props.onConfirm - Callback to confirm and apply the update
 * @param {Function} props.onContinueEditing - Callback to dismiss the dialog and continue editing
 * @param {Function} props.onCancel - Callback to cancel the update entirely
 */
function UpdateConfirmModal({
  updateConfirmModal,
  isUpdating,
  onConfirm,
  onContinueEditing,
  onCancel
}) {
  const trapRef = useFocusTrap(!!updateConfirmModal, onCancel);
  if (!updateConfirmModal) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120] p-4",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "update-modal-title"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden",
    ref: trapRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-600 text-white p-4 text-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-4xl",
    "aria-hidden": "true"
  }, "\uD83D\uDD04"), /*#__PURE__*/React.createElement("h2", {
    id: "update-modal-title",
    className: "text-lg font-bold mt-2"
  }, "Update Form?")), /*#__PURE__*/React.createElement("div", {
    className: "p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-800 text-sm font-medium"
  }, "You've made changes to this form."), /*#__PURE__*/React.createElement("p", {
    className: "text-blue-700 text-xs mt-1"
  }, GoogleDriveSync.isConnected() ? 'This will update Firebase and replace the old PDF on Google Drive.' : 'This will update the form in Firebase.')), updateConfirmModal.formData?.siteConducted && /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-xs"
  }, "Site"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-800 font-medium"
  }, updateConfirmModal.formData.siteConducted)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onConfirm,
    disabled: isUpdating,
    className: "w-full bg-green-600 text-white py-3 rounded-xl font-semibold disabled:bg-gray-400 flex items-center justify-center gap-2"
  }, isUpdating ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "animate-spin"
  }, "\u23F3"), " Updating...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\u2713"), " Yes, Replace Old Version")), /*#__PURE__*/React.createElement("button", {
    onClick: onContinueEditing,
    disabled: isUpdating,
    className: "w-full bg-blue-100 text-blue-700 py-3 rounded-xl font-semibold disabled:bg-gray-200"
  }, "\u270F\uFE0F Keep Editing"), /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    disabled: isUpdating,
    className: "w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium disabled:bg-gray-200"
  }, "Cancel")))));
}

// =============================================
// Admin Device Notification Banner
// =============================================
/**
 * New device authorization alert shown to admins when an unrecognized device requests access.
 * @param {Object} props
 * @param {Object|null} props.notification - The new device notification object, or null to hide
 * @param {boolean} props.isDeviceAdmin - Whether the current device is a device admin
 * @param {Function} props.onApprove - Callback to approve the device by ID
 * @param {Function} props.onDeny - Callback to deny the device by ID
 * @param {Function} props.onDismiss - Callback to dismiss the notification without action
 */
function NewDeviceNotification({
  notification,
  isDeviceAdmin,
  onApprove,
  onDeny,
  onDismiss
}) {
  if (!notification || !isDeviceAdmin) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed top-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-xl shadow-lg z-[200] animate-pulse",
    role: "alert"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl",
    "aria-hidden": "true"
  }, "\uD83D\uDCF1"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold"
  }, "New Device Request!"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-blue-100"
  }, notification.type, " (", notification.browser, ") wants access"))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onApprove(notification.id),
    className: "bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-600"
  }, "Approve"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onDeny(notification.id),
    className: "bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-red-600"
  }, "Deny"), /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    className: "text-white opacity-70 px-2",
    "aria-label": "Dismiss"
  }, "\u2715"))));
}

// =============================================
// Pending Devices Banner (admin only)
// =============================================
/**
 * Banner displayed to admins when devices are awaiting approval.
 * @param {Object} props
 * @param {Array} props.pendingDevices - Array of devices awaiting approval
 * @param {boolean} props.isDeviceAdmin - Whether the current device is a device admin
 * @param {boolean} props.hasNotification - Whether a new device notification is already shown (hides banner if true)
 * @param {Function} props.onNavigateSettings - Callback to navigate to the settings view for device management
 */
function PendingDevicesBanner({
  pendingDevices,
  isDeviceAdmin,
  hasNotification,
  onNavigateSettings
}) {
  if (pendingDevices.length === 0 || !isDeviceAdmin || hasNotification) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onNavigateSettings,
    className: "bg-blue-500 text-white p-2 text-center cursor-pointer hover:bg-blue-600 transition",
    role: "status"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCF1"), " ", pendingDevices.length, " device(s) waiting for approval - Tap to review"));
}

// =============================================
// Sync Error/Pending Banner
// =============================================
/**
 * Firebase sync status indicator showing error or pending sync state with retry option.
 * @param {Object} props
 * @param {string} props.syncStatus - Current sync status ('error', 'pending', 'synced', 'syncing', 'local')
 * @param {number} props.pendingSyncCount - Number of forms waiting to sync
 * @param {string} props.syncError - Error message if sync failed
 * @param {Function} props.onRetry - Callback to retry syncing pending forms
 */
function SyncStatusBanner({
  syncStatus,
  pendingSyncCount,
  syncError,
  onRetry
}) {
  if (syncStatus !== 'error' && !(syncStatus === 'pending' && pendingSyncCount > 0)) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: `fixed bottom-20 left-3 right-3 ${syncStatus === 'error' ? 'bg-red-600' : 'bg-yellow-600'} text-white p-3 rounded-xl shadow-lg z-50`,
    role: "alert"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl",
    "aria-hidden": "true"
  }, syncStatus === 'error' ? '⚠️' : '🔄'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-sm"
  }, syncStatus === 'error' ? 'Sync Failed' : `${pendingSyncCount} form(s) waiting to sync`), /*#__PURE__*/React.createElement("p", {
    className: "text-xs opacity-80"
  }, syncStatus === 'error' ? syncError || 'Will retry automatically when online' : 'Will sync when connection is restored'))), /*#__PURE__*/React.createElement("button", {
    onClick: onRetry,
    className: "bg-white text-gray-800 px-3 py-1 rounded-lg text-sm font-semibold"
  }, "Retry Now")));
}

// =============================================
// Firebase Setup Banner
// =============================================
/**
 * Firebase configuration prompt banner encouraging users to enable cloud sync.
 * @param {Object} props
 * @param {boolean} props.showSyncBanner - Whether to display the banner
 * @param {Function} props.onDismiss - Callback to dismiss the banner
 * @param {Function} props.onSetup - Callback to navigate to Firebase setup in settings
 */
function FirebaseSetupBanner({
  showSyncBanner,
  onDismiss,
  onSetup
}) {
  if (!showSyncBanner || FirebaseSync.isConnected()) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed bottom-20 left-3 right-3 bg-blue-600 text-white p-3 rounded-xl shadow-lg z-50 flex items-center justify-between",
    role: "status"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl",
    "aria-hidden": "true"
  }, "\u2601\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-sm"
  }, "Enable Cloud Sync"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs opacity-80"
  }, "Sync data across all devices"))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    className: "text-white opacity-70 px-2 py-1 text-sm",
    "aria-label": "Dismiss"
  }, "Later"), /*#__PURE__*/React.createElement("button", {
    onClick: onSetup,
    className: "bg-white text-blue-600 px-3 py-1 rounded-lg text-sm font-semibold"
  }, "Setup")));
}

// =============================================
// Install Prompt Banner
// =============================================
/**
 * PWA install prompt banner allowing users to add the app to their home screen.
 * @param {Object} props
 * @param {boolean} props.showInstallPrompt - Whether to display the install prompt
 * @param {Function} props.onDismiss - Callback to dismiss the prompt
 * @param {Function} props.onInstall - Callback to trigger the PWA install flow
 */
function InstallPromptBanner({
  showInstallPrompt,
  onDismiss,
  onInstall
}) {
  if (!showInstallPrompt) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "install-banner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl",
    "aria-hidden": "true"
  }, "\uD83D\uDCF2"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-sm"
  }, "Install J&M Artsteel Safety"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs opacity-80"
  }, "Quick access from home screen"))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    className: "text-white opacity-70 px-2 py-1 text-sm",
    "aria-label": "Dismiss"
  }, "Later"), /*#__PURE__*/React.createElement("button", {
    onClick: onInstall,
    className: "bg-white text-orange-600 px-3 py-1 rounded-lg text-sm font-semibold"
  }, "Install")));
}

// Export to window for cross-file access
window.SuccessModal = SuccessModal;
window.ViewFormModal = ViewFormModal;
window.DeleteConfirmModal = DeleteConfirmModal;
window.UpdateConfirmModal = UpdateConfirmModal;
window.NewDeviceNotification = NewDeviceNotification;
window.PendingDevicesBanner = PendingDevicesBanner;
window.SyncStatusBanner = SyncStatusBanner;
window.FirebaseSetupBanner = FirebaseSetupBanner;
window.InstallPromptBanner = InstallPromptBanner;

// === js/components/auth.jsx ===
// Auth: LoginScreen, AppWithAuth
// Extracted from index.html
// v2: Added brute-force protection, login audit logging, session timeout

/**
 * Login brute-force protection settings.
 * Defines max attempts before lockout, lockout duration, and progressive delay
 * per failed attempt to mitigate password-guessing attacks.
 * @constant {Object}
 * @property {number} MAX_ATTEMPTS_BEFORE_LOCKOUT - Failed attempts before account lockout (5)
 * @property {number} LOCKOUT_DURATION_MS - Lockout duration in milliseconds (30000ms / 30s)
 * @property {number[]} DELAYS - Progressive delay in ms applied after each failed attempt
 */
const LOGIN_SECURITY = {
  MAX_ATTEMPTS_BEFORE_LOCKOUT: 5,
  LOCKOUT_DURATION_MS: 30000,
  // 30 seconds
  DELAYS: [0, 0, 2000, 5000, 10000] // ms delay after each attempt (index = attempt - 1)
};

/**
 * Session inactivity timeout in milliseconds.
 * Set to 8 hours to match a typical construction shift. After this period
 * of inactivity, the user is automatically logged out and must re-authenticate.
 * @constant {number}
 */
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000;

/**
 * Login form with password authentication, device naming, and brute-force protection.
 * Handles two flows: first-time setup (password creation + admin registration) and
 * returning login (password verification with progressive delays and lockout).
 * Logs successful and failed login attempts to AuditLogManager.
 * @param {Object} props
 * @param {Function} props.onAuthenticated - Callback invoked with (success: boolean, status?: string) on auth result
 * @param {string} props.authStatus - Current auth state ("unauthenticated" | "pending") controlling which screen to render
 */
function LoginScreen({
  onAuthenticated,
  authStatus
}) {
  const [password, setPassword] = useState('');
  const [deviceName, setDeviceName] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.DEVICE_NAME) || '';
    } catch (e) {
      return '';
    }
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Brute-force protection state
  const loginAttemptsRef = useRef(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutUntil <= Date.now()) {
      setLockoutRemaining(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      if (remaining <= 0) setLockoutUntil(0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);
  useEffect(() => {
    // Check if this is first time setup (no password set)
    if (!DeviceAuthManager.APP_PASSWORD_HASH) {
      setIsFirstSetup(true);
    }
  }, []);
  const handleFirstSetup = async () => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters (use a mix of letters and numbers)');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await Promise.race([(async () => {
        await DeviceAuthManager.setPassword(newPassword);
        await DeviceAuthManager.registerDevice(deviceName || 'Admin Device');
        await DeviceAuthManager.approveAsAdmin();
      })(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))]);
      // Save device name locally so it's remembered forever
      if (deviceName) {
        try {
          localStorage.setItem(STORAGE_KEYS.DEVICE_NAME, deviceName);
        } catch (e) {}
      }
      onAuthenticated(true);
    } catch (err) {
      if (err.message === 'timeout') {
        console.warn('Setup timed out waiting for Firebase, proceeding anyway');
        onAuthenticated(true);
      } else {
        setError('Setup failed. Please try again.');
      }
    }
    setIsLoading(false);
  };
  const handleLogin = async () => {
    if (!password) {
      setError('Please enter the password');
      return;
    }

    // Brute-force lockout check
    if (lockoutUntil > Date.now()) {
      setError('Too many failed attempts. Try again in ' + lockoutRemaining + 's');
      return;
    }
    setIsLoading(true);
    setError('');

    // Apply delay for repeated attempts (attempts 3+ get progressively slower)
    const attempts = loginAttemptsRef.current;
    const delayMs = LOGIN_SECURITY.DELAYS[Math.min(attempts, LOGIN_SECURITY.DELAYS.length - 1)] || 0;
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    if (await DeviceAuthManager.verifyPassword(password)) {
      // Password correct - reset attempts and grant access
      loginAttemptsRef.current = 0;
      onAuthenticated(true);
      // Save device name locally so it's remembered next time
      if (deviceName) {
        try {
          localStorage.setItem(STORAGE_KEYS.DEVICE_NAME, deviceName);
        } catch (e) {}
      }
      // Audit log: successful login
      if (typeof AuditLogManager !== 'undefined') {
        try {
          AuditLogManager.log('login_success', {
            deviceName: deviceName || 'Unknown Device',
            deviceId: DeviceAuthManager.deviceId || 'unknown'
          });
        } catch (e) {/* non-fatal */}
      }
      // Fire-and-forget device registration
      Promise.race([DeviceAuthManager.initWithStatus(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))]).then(status => {
        if (status.status === 'new') {
          DeviceAuthManager.registerDevice(deviceName || 'Unknown Device').catch(() => {});
        }
      }).catch(() => {});
    } else {
      // Password incorrect - increment attempts
      loginAttemptsRef.current++;
      const currentAttempts = loginAttemptsRef.current;

      // Audit log: failed login
      if (typeof AuditLogManager !== 'undefined') {
        try {
          AuditLogManager.log('login_failed', {
            deviceName: deviceName || 'Unknown Device',
            attempts: currentAttempts
          });
        } catch (e) {/* non-fatal */}
      }
      if (currentAttempts >= LOGIN_SECURITY.MAX_ATTEMPTS_BEFORE_LOCKOUT) {
        // Trigger lockout
        const lockoutEnd = Date.now() + LOGIN_SECURITY.LOCKOUT_DURATION_MS;
        setLockoutUntil(lockoutEnd);
        setError('Too many failed attempts. Locked out for ' + LOGIN_SECURITY.LOCKOUT_DURATION_MS / 1000 + ' seconds');
        loginAttemptsRef.current = 0; // Reset so they get fresh attempts after lockout
      } else {
        const remaining = LOGIN_SECURITY.MAX_ATTEMPTS_BEFORE_LOCKOUT - currentAttempts;
        setError('Incorrect password (' + remaining + ' attempt' + (remaining !== 1 ? 's' : '') + ' remaining)');
      }
    }
    setIsLoading(false);
  };

  // First time setup screen
  if (isFirstSetup) {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen bg-gray-100 flex items-center justify-center p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-center mb-6"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-4xl",
      "aria-hidden": "true"
    }, "\uD83D\uDEE1\uFE0F")), /*#__PURE__*/React.createElement("h1", {
      className: "text-2xl font-bold text-gray-800"
    }, "J&M Artsteel Safety"), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-500 mt-2"
    }, "First Time Setup")), /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      htmlFor: "setup-device-name",
      className: "block text-sm font-medium text-gray-700 mb-1"
    }, "Device Name"), /*#__PURE__*/React.createElement("input", {
      id: "setup-device-name",
      type: "text",
      value: deviceName,
      onChange: e => setDeviceName(e.target.value),
      placeholder: "e.g. Jeff's iPhone",
      className: "w-full border border-gray-300 rounded-lg p-3 text-lg",
      "aria-required": "true"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      htmlFor: "setup-new-password",
      className: "block text-sm font-medium text-gray-700 mb-1"
    }, "Set App Password"), /*#__PURE__*/React.createElement("input", {
      id: "setup-new-password",
      type: "password",
      value: newPassword,
      onChange: e => setNewPassword(e.target.value),
      placeholder: "Create a password",
      className: "w-full border border-gray-300 rounded-lg p-3 text-lg",
      "aria-required": "true",
      "aria-invalid": !!error,
      "aria-describedby": "setup-error-message"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      htmlFor: "setup-confirm-password",
      className: "block text-sm font-medium text-gray-700 mb-1"
    }, "Confirm Password"), /*#__PURE__*/React.createElement("input", {
      id: "setup-confirm-password",
      type: "password",
      value: confirmPassword,
      onChange: e => setConfirmPassword(e.target.value),
      placeholder: "Confirm password",
      className: "w-full border border-gray-300 rounded-lg p-3 text-lg",
      onKeyPress: e => e.key === 'Enter' && handleFirstSetup(),
      "aria-required": "true",
      "aria-invalid": !!error,
      "aria-describedby": "setup-error-message"
    })), error && /*#__PURE__*/React.createElement("div", {
      id: "setup-error-message",
      className: "bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm",
      role: "alert"
    }, error), /*#__PURE__*/React.createElement("button", {
      onClick: handleFirstSetup,
      disabled: isLoading,
      className: "w-full bg-orange-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-orange-700 disabled:bg-gray-400"
    }, isLoading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u23F3"), " Setting up...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\uD83D\uDD10"), " Complete Setup")), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-500 text-center"
    }, "This password will be required for all devices accessing the app. Share it only with authorized team members."))));
  }

  // Pending approval screen
  if (authStatus === 'pending') {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen bg-gray-100 flex items-center justify-center p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-2xl shadow-xl p-6 w-full max-w-md text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-20 h-20 bg-yellow-500 rounded-2xl flex items-center justify-center mx-auto mb-4"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-4xl",
      "aria-hidden": "true"
    }, "\u23F3")), /*#__PURE__*/React.createElement("h1", {
      className: "text-2xl font-bold text-gray-800"
    }, "Awaiting Approval"), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-500 mt-2 mb-6"
    }, "Your device is waiting for admin approval. Please ask Jeff or your supervisor to approve this device."), /*#__PURE__*/React.createElement("div", {
      className: "bg-gray-50 rounded-lg p-4 mb-4"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600"
    }, "Device ID:"), /*#__PURE__*/React.createElement("p", {
      className: "font-mono text-xs text-gray-800 break-all"
    }, DeviceAuthManager.deviceId)), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.location.reload(),
      className: "w-full bg-orange-600 text-white py-3 rounded-lg font-semibold"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\uD83D\uDD04"), " Check Again")));
  }

  // Normal login screen
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-gray-100 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-xl p-6 w-full max-w-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-4xl",
    "aria-hidden": "true"
  }, "\uD83D\uDEE1\uFE0F")), /*#__PURE__*/React.createElement("h1", {
    className: "text-2xl font-bold text-gray-800"
  }, "J&M Artsteel Safety"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 mt-2"
  }, "Enter password to access")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: "login-device-name",
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Device Name (optional)"), /*#__PURE__*/React.createElement("input", {
    id: "login-device-name",
    type: "text",
    value: deviceName,
    onChange: e => setDeviceName(e.target.value),
    placeholder: "e.g. Scott's iPad",
    className: "w-full border border-gray-300 rounded-lg p-3"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: "login-password",
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Password"), /*#__PURE__*/React.createElement("input", {
    id: "login-password",
    type: "password",
    value: password,
    onChange: e => setPassword(e.target.value),
    placeholder: "Enter app password",
    className: "w-full border border-gray-300 rounded-lg p-3 text-lg",
    onKeyPress: e => e.key === 'Enter' && handleLogin(),
    "aria-required": "true",
    "aria-invalid": !!error,
    "aria-describedby": "login-error-message"
  })), error && /*#__PURE__*/React.createElement("div", {
    id: "login-error-message",
    className: "bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm",
    role: "alert"
  }, error), lockoutRemaining > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-lg text-sm text-center",
    role: "timer",
    "aria-live": "polite",
    "aria-atomic": "true"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDD12"), " Locked out \u2014 try again in ", lockoutRemaining, "s"), /*#__PURE__*/React.createElement("button", {
    onClick: handleLogin,
    disabled: isLoading || lockoutRemaining > 0,
    className: "w-full bg-orange-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-orange-700 disabled:bg-gray-400"
  }, isLoading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u23F3"), " Checking...") : lockoutRemaining > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDD12"), " Locked (", lockoutRemaining, "s)") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDD13"), " Enter App")))));
}

/**
 * Authentication wrapper component that manages login state and session timeout.
 * Checks device auth status on mount via DeviceAuthManager, detects admin privileges,
 * and enforces an 8-hour inactivity timeout (SESSION_TIMEOUT_MS). Renders LoginScreen
 * for unauthenticated/pending states, a loading spinner during auth check, or
 * the main JMartSteelSafetyApp when authenticated. Falls back to local mode
 * (no auth required) when Firebase is not configured.
 */
function AppWithAuth() {
  const [authState, setAuthState] = useState('loading'); // 'loading', 'authenticated', 'unauthenticated', 'pending'
  const [isAdmin, setIsAdmin] = useState(false);
  const lastActivityRef = useRef(Date.now());
  useEffect(() => {
    checkAuth();
  }, []);

  // Session timeout — auto-lock after 8 hours of inactivity
  useEffect(() => {
    if (authState !== 'authenticated') return;

    // Track user activity (throttled — only update ref, no re-renders)
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Listen for user interaction events
    window.addEventListener('click', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('keydown', updateActivity);

    // Check inactivity every 60 seconds
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed > SESSION_TIMEOUT_MS) {
        console.log('[Session] Timed out after inactivity (' + Math.round(elapsed / 3600000) + 'h)');
        // Audit log: session timeout
        if (typeof AuditLogManager !== 'undefined') {
          try {
            AuditLogManager.log('session_timeout', {
              deviceId: DeviceAuthManager.deviceId || 'unknown',
              inactiveMinutes: Math.round(elapsed / 60000)
            });
          } catch (e) {/* non-fatal */}
        }
        setAuthState('unauthenticated');
      }
    }, 60000);
    return () => {
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      clearInterval(checkInterval);
    };
  }, [authState]);
  const checkAuth = async () => {
    // Check if Firebase is configured
    if (!isFirebaseConfigured || !firebaseDb) {
      // No Firebase = no auth required (local mode)
      setAuthState('authenticated');
      return;
    }
    let status;
    try {
      status = await Promise.race([DeviceAuthManager.initWithStatus(), new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000))]);
    } catch (timeoutErr) {
      console.warn('Auth check timed out after 5s, showing login screen:', timeoutErr.message);
      setAuthState('unauthenticated');
      return;
    }
    console.log('Device auth status:', status);
    if (status.canAccess) {
      setIsAdmin(DeviceAuthManager.isAdmin);
      setAuthState('authenticated');

      // Update last seen
      DeviceAuthManager.updateLastSeen();
    } else if (status.status === 'pending') {
      setAuthState('pending');
    } else if (status.status === 'new' && !DeviceAuthManager.APP_PASSWORD_HASH) {
      // First time setup
      setAuthState('unauthenticated');
    } else {
      setAuthState('unauthenticated');
    }
  };
  const handleAuthenticated = (success, newStatus) => {
    if (success) {
      setIsAdmin(DeviceAuthManager.isAdmin);
      setAuthState('authenticated');
      lastActivityRef.current = Date.now(); // Reset activity timer on login
    } else if (newStatus === 'pending') {
      setAuthState('pending');
    }
  };
  if (authState === 'loading') {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen bg-gray-100 flex items-center justify-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-3xl",
      "aria-hidden": "true"
    }, "\uD83D\uDEE1\uFE0F")), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600"
    }, "Loading...")));
  }
  if (authState === 'unauthenticated' || authState === 'pending') {
    return /*#__PURE__*/React.createElement(LoginScreen, {
      onAuthenticated: handleAuthenticated,
      authStatus: authState
    });
  }
  return /*#__PURE__*/React.createElement(JMartSteelSafetyApp, {
    isAdmin: isAdmin
  });
}

// Main App

// Export to window for cross-file access
window.LoginScreen = LoginScreen;
window.AppWithAuth = AppWithAuth;
window.LOGIN_SECURITY = LOGIN_SECURITY;
window.SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MS;

// === js/components/app.jsx ===
// Main App: JMartSteelSafetyApp
// Uses custom hooks from hooks.jsx and modal components from modals.jsx

/**
 * Root application component. Manages navigation, form state, data sync, device auth, and renders the appropriate view based on currentView state.
 * @param {Object} props
 * @param {boolean} [props.isAdmin=false] - Whether the app is running in admin mode
 */
function JMartSteelSafetyApp({
  isAdmin = false
}) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [forms, setForms] = useState([]);
  const [sites, setSites] = useState([]);
  const [editingForm, setEditingForm] = useState(null);

  // Device Authorization
  const {
    deviceAuthStatus,
    isDeviceAdmin,
    canViewDevices,
    canRevokeDevices,
    pendingDevices,
    approvedDevices,
    newDeviceNotification,
    setNewDeviceNotification
  } = useDeviceAuth();

  // Form CRUD operations
  const formManager = useFormManager({
    forms,
    setForms,
    editingForm,
    setEditingForm,
    setCurrentView
  });
  const {
    successModal,
    viewFormModal,
    setViewFormModal,
    deleteConfirmModal,
    setDeleteConfirmModal,
    updateConfirmModal,
    isUpdating,
    savedSignatures,
    deletingFormRef,
    addForm,
    updateForm,
    confirmUpdate,
    continueEditing,
    cancelUpdate,
    deleteForm,
    handleDownloadPDF,
    closeSuccessModal,
    markAsBackedUp,
    isFormBackedUp,
    updateSignatures
  } = formManager;

  // Data sync (Firebase + localStorage)
  const {
    isOnline,
    syncStatus,
    setSyncStatus,
    pendingSyncCount,
    pendingPhotoCount,
    syncError,
    showSyncBanner,
    setShowSyncBanner,
    syncFormsEffect,
    syncSitesEffect
  } = useDataSync({
    setForms,
    setSites,
    deletingFormRef
  });

  // PWA Install
  const {
    showInstallPrompt,
    handleInstall,
    dismissInstall
  } = usePWAInstall();

  // Lazy view loading — re-render when view bundles finish loading
  const [viewsReady, setViewsReady] = useState(typeof TrainingView === 'function');
  useEffect(() => {
    if (!viewsReady) {
      const check = setInterval(() => {
        if (typeof TrainingView === 'function') {
          setViewsReady(true);
          clearInterval(check);
        }
      }, 100);
      return () => clearInterval(check);
    }
  }, [viewsReady]);

  // Focus trap for side menu
  const menuCloseCallback = React.useCallback(() => setMenuOpen(false), []);
  const menuTrapRef = useFocusTrap(menuOpen, menuCloseCallback);

  // Sync forms when they change
  useEffect(() => {
    syncFormsEffect(forms);
  }, [forms, isOnline]);

  // Sync sites when they change
  useEffect(() => {
    syncSitesEffect(sites);
  }, [sites, isOnline]);
  const previousPrestarts = forms.filter(f => f.type === 'prestart');
  const navItems = [{
    id: 'dashboard',
    label: 'Dashboard',
    emoji: '🏠'
  }, {
    id: 'training',
    label: 'Training',
    emoji: '🎓'
  }, {
    id: 'recordings',
    label: 'Recordings',
    emoji: '📸'
  }, {
    id: 'prestart',
    label: 'Pre-Start Checks',
    emoji: '📋'
  }, {
    id: 'steel-itp',
    label: 'Steel ITP',
    emoji: '🔩'
  }, {
    id: 'inspection',
    label: 'Site Inspection',
    emoji: '🔍'
  }, {
    id: 'itp',
    label: 'ITP Form',
    emoji: '📝'
  }, {
    id: 'incidents',
    label: 'Incident Reports',
    emoji: '⚠️'
  }, {
    id: 'toolbox',
    label: 'Toolbox Talks',
    emoji: '👥'
  }, {
    id: 'emergency',
    label: 'Emergency Info',
    emoji: '📞'
  }, {
    id: 'settings',
    label: 'Settings',
    emoji: '⚙️'
  }];

  // Show loading while checking device authorization
  if (deviceAuthStatus === 'checking') {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen bg-gray-100 flex items-center justify-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-6xl mb-4",
      "aria-hidden": "true"
    }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("h2", {
      className: "text-xl font-bold text-gray-800"
    }, "J&M Artsteel Safety"), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 mt-2"
    }, "Verifying device authorization..."), /*#__PURE__*/React.createElement("div", {
      className: "mt-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "animate-spin inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"
    }))));
  }

  // Show pending approval screen if device is not approved
  if (deviceAuthStatus === 'pending' || deviceAuthStatus === 'denied') {
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen bg-gray-100 flex items-center justify-center p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: `p-6 text-center ${deviceAuthStatus === 'denied' ? 'bg-red-500' : 'bg-orange-500'} text-white`
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-6xl mb-4",
      "aria-hidden": "true"
    }, deviceAuthStatus === 'denied' ? '🚫' : '🔐'), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold"
    }, deviceAuthStatus === 'denied' ? 'Access Denied' : 'Authorization Required')), /*#__PURE__*/React.createElement("div", {
      className: "p-6 space-y-4"
    }, deviceAuthStatus === 'pending' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 text-center"
    }, "This device is not yet authorized to access J&M Artsteel Safety."), /*#__PURE__*/React.createElement("div", {
      className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-yellow-800 font-medium text-center"
    }, "Waiting for Admin Approval"), /*#__PURE__*/React.createElement("p", {
      className: "text-yellow-700 text-sm text-center mt-1"
    }, "Your request has been sent. An administrator will review it shortly.")), /*#__PURE__*/React.createElement("div", {
      className: "bg-gray-50 rounded-lg p-4 space-y-2"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-500"
    }, "Your Device:"), /*#__PURE__*/React.createElement("p", {
      className: "font-medium text-gray-800"
    }, DeviceAuth.deviceInfo?.type, " (", DeviceAuth.deviceInfo?.browser, ")"), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-400"
    }, "ID: ", DeviceAuth.deviceId)), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-center gap-2 text-sm text-gray-500"
    }, /*#__PURE__*/React.createElement("div", {
      className: "animate-pulse w-2 h-2 bg-orange-500 rounded-full"
    }), /*#__PURE__*/React.createElement("span", null, "Checking for approval..."))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 text-center"
    }, "Your device access has been denied or revoked by an administrator."), /*#__PURE__*/React.createElement("div", {
      className: "bg-red-50 border border-red-200 rounded-lg p-4"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-red-800 text-center"
    }, "Please contact your administrator if you believe this is an error."))), /*#__PURE__*/React.createElement("button", {
      onClick: () => window.location.reload(),
      className: "w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition"
    }, "Refresh"))));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen bg-gray-100 flex flex-col safe-top"
  }, /*#__PURE__*/React.createElement(NewDeviceNotification, {
    notification: newDeviceNotification,
    isDeviceAdmin: isDeviceAdmin,
    onApprove: async id => {
      await DeviceAuth.approveDevice(id);
      setNewDeviceNotification(null);
    },
    onDeny: async id => {
      await DeviceAuth.denyDevice(id);
      setNewDeviceNotification(null);
    },
    onDismiss: () => setNewDeviceNotification(null)
  }), /*#__PURE__*/React.createElement(PendingDevicesBanner, {
    pendingDevices: pendingDevices,
    isDeviceAdmin: isDeviceAdmin,
    hasNotification: !!newDeviceNotification,
    onNavigateSettings: () => setCurrentView('settings')
  }), !isOnline && /*#__PURE__*/React.createElement("div", {
    className: "offline-banner"
  }, "\u26A0\uFE0F You're offline - Data will sync when connected"), /*#__PURE__*/React.createElement(SuccessModal, {
    successModal: successModal,
    onDownloadPDF: handleDownloadPDF,
    onClose: closeSuccessModal
  }), /*#__PURE__*/React.createElement(ViewFormModal, {
    viewFormModal: viewFormModal,
    onClose: () => setViewFormModal(null),
    onEdit: form => {
      setEditingForm(form);
      setViewFormModal(null);
      setCurrentView(form.type);
    },
    onDownloadPDF: form => {
      PDFGenerator.download(form);
      markAsBackedUp(form.id);
    },
    onDelete: form => setDeleteConfirmModal(form)
  }), /*#__PURE__*/React.createElement(DeleteConfirmModal, {
    deleteConfirmModal: deleteConfirmModal,
    isFormBackedUp: isFormBackedUp,
    onDownloadPDF: form => {
      PDFGenerator.download(form);
      markAsBackedUp(form.id);
    },
    onDelete: formId => deleteForm(formId),
    onCancel: () => setDeleteConfirmModal(null)
  }), /*#__PURE__*/React.createElement(UpdateConfirmModal, {
    updateConfirmModal: updateConfirmModal,
    isUpdating: isUpdating,
    onConfirm: confirmUpdate,
    onContinueEditing: continueEditing,
    onCancel: cancelUpdate
  }), /*#__PURE__*/React.createElement(SyncStatusBanner, {
    syncStatus: syncStatus,
    pendingSyncCount: pendingSyncCount,
    syncError: syncError,
    onRetry: () => {
      FirebaseSync.retryAll();
      setSyncStatus('syncing');
    }
  }), /*#__PURE__*/React.createElement(FirebaseSetupBanner, {
    showSyncBanner: showSyncBanner,
    onDismiss: () => setShowSyncBanner(false),
    onSetup: () => {
      setCurrentView('settings');
      setShowSyncBanner(false);
    }
  }), /*#__PURE__*/React.createElement(InstallPromptBanner, {
    showInstallPrompt: showInstallPrompt,
    onDismiss: dismissInstall,
    onInstall: handleInstall
  }), /*#__PURE__*/React.createElement("header", {
    className: "bg-orange-600 text-white p-4 flex items-center justify-between shadow-lg sticky top-0 z-50 safe-top"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setMenuOpen(!menuOpen),
    className: "p-2 hover:bg-orange-700 rounded-lg text-xl",
    "aria-label": "Menu",
    "aria-expanded": menuOpen
  }, "\u2630"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl",
    "aria-hidden": "true"
  }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "font-bold text-lg leading-tight"
  }, "J&M Artsteel"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-orange-200"
  }, !isOnline ? '📴 Offline Mode' : syncStatus === 'error' ? '⚠️ Sync Error' : pendingPhotoCount > 0 ? '📷 ' + pendingPhotoCount + ' photo' + (pendingPhotoCount > 1 ? 's' : '') + ' queued' : syncStatus === 'pending' ? '🔄 ' + pendingSyncCount + ' pending' : syncStatus === 'synced' ? '☁️ Synced' : syncStatus === 'syncing' ? '🔄 Syncing...' : syncStatus === 'local' ? '💾 Local Only' : 'Safety Management'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, pendingPhotoCount > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-300 text-sm animate-pulse",
    "aria-hidden": "true"
  }, "\u25CF"), /*#__PURE__*/React.createElement("span", {
    className: "sr-only"
  }, "Photos pending upload")), syncStatus === 'synced' && pendingPhotoCount === 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-green-300 text-sm",
    "aria-hidden": "true"
  }, "\u25CF"), /*#__PURE__*/React.createElement("span", {
    className: "sr-only"
  }, "Synced")), syncStatus === 'syncing' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-yellow-300 text-sm animate-pulse",
    "aria-hidden": "true"
  }, "\u25CF"), /*#__PURE__*/React.createElement("span", {
    className: "sr-only"
  }, "Syncing")), syncStatus === 'pending' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-yellow-300 text-sm animate-pulse",
    "aria-hidden": "true"
  }, "\u25CF"), /*#__PURE__*/React.createElement("span", {
    className: "sr-only"
  }, "Sync pending")), syncStatus === 'error' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-red-400 text-sm",
    "aria-hidden": "true"
  }, "\u25CF"), /*#__PURE__*/React.createElement("span", {
    className: "sr-only"
  }, "Sync error")), !isOnline && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-yellow-300 text-sm",
    "aria-hidden": "true"
  }, "\u25CF"), /*#__PURE__*/React.createElement("span", {
    className: "sr-only"
  }, "Offline")))), menuOpen && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-40 flex",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Navigation menu"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50",
    onClick: () => setMenuOpen(false),
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative w-72 bg-white shadow-xl",
    ref: menuTrapRef
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-orange-600 text-white"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold"
  }, "J&M Artsteel"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-orange-200"
  }, "NSW Operations")), /*#__PURE__*/React.createElement("nav", {
    className: "p-2",
    "aria-label": "Main menu"
  }, navItems.map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    onClick: () => {
      setCurrentView(item.id);
      setMenuOpen(false);
    },
    className: `w-full flex items-center gap-3 p-3 rounded-lg text-left ${currentView === item.id ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'}`,
    "aria-current": currentView === item.id ? 'page' : undefined
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, item.emoji), /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, item.label)))))), /*#__PURE__*/React.createElement("main", {
    id: "main-content",
    className: "flex-1 p-4 pb-20"
  }, /*#__PURE__*/React.createElement("div", {
    key: currentView,
    className: "view-transition"
  }, currentView === 'dashboard' && /*#__PURE__*/React.createElement(Dashboard, {
    setCurrentView: setCurrentView,
    forms: forms,
    onViewForm: setViewFormModal,
    isFormBackedUp: isFormBackedUp,
    sites: sites
  }), currentView === 'training' && (typeof TrainingView === 'function' ? /*#__PURE__*/React.createElement(TrainingView, null) : /*#__PURE__*/React.createElement(SkeletonLoader, null)), currentView === 'prestart' && (typeof PrestartView === 'function' ? /*#__PURE__*/React.createElement(PrestartView, {
    onSubmit: data => addForm('prestart', data),
    onUpdate: updateForm,
    editingForm: editingForm?.type === 'prestart' ? editingForm : null,
    previousPrestarts: previousPrestarts,
    sites: sites
  }) : /*#__PURE__*/React.createElement(SkeletonLoader, null)), currentView === 'steel-itp' && (typeof SteelITPView === 'function' ? /*#__PURE__*/React.createElement(SteelITPView, {
    onSubmit: data => addForm('steel-itp', data),
    onUpdate: updateForm,
    editingForm: editingForm?.type === 'steel-itp' ? editingForm : null,
    sites: sites
  }) : /*#__PURE__*/React.createElement(SkeletonLoader, null)), currentView === 'inspection' && (typeof SubcontractorInspectionView === 'function' ? /*#__PURE__*/React.createElement(SubcontractorInspectionView, {
    onSubmit: data => addForm('inspection', data),
    onUpdate: updateForm,
    editingForm: editingForm?.type === 'inspection' ? editingForm : null,
    sites: sites
  }) : /*#__PURE__*/React.createElement(SkeletonLoader, null)), currentView === 'itp' && (typeof ITPFormView === 'function' ? /*#__PURE__*/React.createElement(ITPFormView, {
    onSubmit: data => addForm('itp', data),
    onUpdate: updateForm,
    editingForm: editingForm?.type === 'itp' ? editingForm : null,
    sites: sites
  }) : /*#__PURE__*/React.createElement(SkeletonLoader, null)), currentView === 'incidents' && (typeof IncidentView === 'function' ? /*#__PURE__*/React.createElement(IncidentView, {
    onSubmit: data => addForm('incident', data),
    onUpdate: updateForm,
    editingForm: editingForm?.type === 'incident' ? editingForm : null
  }) : /*#__PURE__*/React.createElement(SkeletonLoader, null)), currentView === 'toolbox' && (typeof ToolboxView === 'function' ? /*#__PURE__*/React.createElement(ToolboxView, {
    onSubmit: data => addForm('toolbox', data),
    onUpdate: updateForm,
    editingForm: editingForm?.type === 'toolbox' ? editingForm : null,
    sites: sites
  }) : /*#__PURE__*/React.createElement(SkeletonLoader, null)), currentView === 'emergency' && (typeof EmergencyView === 'function' ? /*#__PURE__*/React.createElement(EmergencyView, null) : /*#__PURE__*/React.createElement(SkeletonLoader, null)), currentView === 'settings' && (typeof SettingsView === 'function' ? /*#__PURE__*/React.createElement(SettingsView, {
    sites: sites,
    onUpdateSites: setSites,
    signatures: savedSignatures,
    onUpdateSignatures: updateSignatures,
    isAdmin: isAdmin,
    isDeviceAdmin: isDeviceAdmin,
    canViewDevices: canViewDevices,
    canRevokeDevices: canRevokeDevices,
    pendingDevices: pendingDevices,
    approvedDevices: approvedDevices
  }) : /*#__PURE__*/React.createElement(SkeletonLoader, null)), currentView === 'recordings' && (typeof RecordingsView === 'function' ? /*#__PURE__*/React.createElement(RecordingsView, {
    forms: forms,
    sites: sites
  }) : /*#__PURE__*/React.createElement(SkeletonLoader, null)))), /*#__PURE__*/React.createElement("nav", {
    className: "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 px-1 z-30",
    "aria-label": "Quick navigation"
  }, [{
    id: 'dashboard',
    emoji: '🏠',
    label: 'Home'
  }, {
    id: 'training',
    emoji: '🎓',
    label: 'Training'
  }, {
    id: 'prestart',
    emoji: '📋',
    label: 'Pre-Start'
  }, {
    id: 'incidents',
    emoji: '⚠️',
    label: 'Incidents'
  }, {
    id: 'emergency',
    emoji: '📞',
    label: 'Emergency'
  }].map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    onClick: () => setCurrentView(item.id),
    className: `flex flex-col items-center p-2 rounded-lg ${currentView === item.id ? 'text-orange-600' : 'text-gray-500'}`,
    "aria-current": currentView === item.id ? 'page' : undefined
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl",
    "aria-hidden": "true"
  }, item.emoji), /*#__PURE__*/React.createElement("span", {
    className: "text-xs mt-1"
  }, item.label)))));
}

// Export to window for cross-file access
window.JMartSteelSafetyApp = JMartSteelSafetyApp;

// === js/components/dashboard.jsx ===
// Dashboard
// Extracted from index.html

/**
 * Main dashboard view showing today's date, quick-access form buttons, recent forms list, and job photo capture.
 * @param {Object} props
 * @param {Function} props.setCurrentView - Navigation callback to switch the active view
 * @param {Array} props.forms - Array of all saved form objects
 * @param {Function} props.onViewForm - Callback to open a form in the view modal
 * @param {Function} props.isFormBackedUp - Returns whether a given form ID has been backed up
 * @param {Array} [props.sites=[]] - List of site name strings for job selection
 */
function Dashboard({
  setCurrentView,
  forms,
  onViewForm,
  isFormBackedUp,
  sites = []
}) {
  const todayDate = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [menuStep, setMenuStep] = useState('jobs'); // 'jobs' or 'capture'
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const formTypeLabels = {
    'prestart': {
      label: 'Pre-Start',
      emoji: '📋',
      color: 'bg-green-500'
    },
    'inspection': {
      label: 'Site Inspection',
      emoji: '🔍',
      color: 'bg-blue-500'
    },
    'itp': {
      label: 'ITP Form',
      emoji: '📝',
      color: 'bg-indigo-500'
    },
    'incident': {
      label: 'Incident',
      emoji: '⚠️',
      color: 'bg-red-500'
    },
    'toolbox': {
      label: 'Toolbox Talk',
      emoji: '👥',
      color: 'bg-purple-500'
    },
    'steel-itp': {
      label: 'Steel ITP',
      emoji: '🔩',
      color: 'bg-slate-600'
    }
  };
  const defaultSites = ['Site 1 - Sydney CBD', 'Site 2 - Parramatta', 'Site 3 - North Sydney'];
  const allJobs = sites.length > 0 ? sites : defaultSites;
  const recentForms = forms.slice(0, 10); // Show last 10 forms

  const handleJobSelect = job => {
    setSelectedJob(job);
    setMenuStep('capture');
  };
  const handleCameraClick = () => {
    setShowPhotoMenu(false);
    setTimeout(() => cameraInputRef.current?.click(), 100);
  };
  const handleGalleryClick = () => {
    setShowPhotoMenu(false);
    setTimeout(() => galleryInputRef.current?.click(), 100);
  };
  const handleBackToJobs = () => {
    setMenuStep('jobs');
    setSelectedJob(null);
  };
  const handlePhotoCapture = async e => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedJob) {
      console.log('No files or job selected', {
        files: files?.length,
        selectedJob
      });
      return;
    }
    setUploadProgress(`Uploading ${files.length} photo(s)...`);
    setUploadStatus(null);
    let successCount = 0;
    let failCount = 0;
    const errorMessages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        setUploadProgress(`Uploading ${i + 1}/${files.length}: ${file.name}`);
        const result = await PhotoUploadManager.uploadPhoto(file, selectedJob, (message, percent) => setUploadProgress(`${i + 1}/${files.length}: ${message}`));
        console.log('Upload result:', result);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          errorMessages.push(`${file.name}: Upload failed`);
        }
      } catch (error) {
        console.error('Upload error:', error);
        failCount++;
        errorMessages.push(`${file.name}: ${error.message}`);
      }
    }

    // Show result
    if (successCount > 0 && failCount === 0) {
      setUploadStatus({
        type: 'success',
        message: `✅ ${successCount} photo(s) uploaded to ${selectedJob}`
      });
    } else if (successCount > 0 && failCount > 0) {
      setUploadStatus({
        type: 'warning',
        message: `⚠️ ${successCount} uploaded, ${failCount} failed`
      });
    } else {
      setUploadStatus({
        type: 'error',
        message: `❌ Upload failed. ${errorMessages[0] || 'Check console for details'}`
      });
    }
    setUploadProgress(null);
    setSelectedJob(null);
    setMenuStep('jobs');

    // Clear file input
    e.target.value = '';

    // Auto-hide status after 8 seconds
    setTimeout(() => setUploadStatus(null), 8000);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("input", {
    ref: cameraInputRef,
    type: "file",
    accept: "image/*",
    capture: "environment",
    onChange: handlePhotoCapture,
    className: "hidden",
    "aria-label": "Take photo with camera"
  }), /*#__PURE__*/React.createElement("input", {
    ref: galleryInputRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: handlePhotoCapture,
    className: "hidden",
    "aria-label": "Choose photos from gallery"
  }), uploadProgress && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3",
    role: "status"
  }, /*#__PURE__*/React.createElement("div", {
    className: "animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-blue-700 text-sm"
  }, uploadProgress)), uploadStatus && /*#__PURE__*/React.createElement("div", {
    role: "alert",
    className: `rounded-xl p-3 ${uploadStatus.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : uploadStatus.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' : 'bg-red-50 border border-red-200 text-red-700'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, uploadStatus.message)), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-3 right-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowPhotoMenu(!showPhotoMenu);
      setMenuStep('jobs');
    },
    "aria-label": "Upload site photos",
    "aria-expanded": showPhotoMenu,
    className: "w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-xl backdrop-blur-sm"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCF7")), showPhotoMenu && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-12 right-0 bg-white rounded-xl shadow-lg border border-gray-200 w-72 max-h-96 overflow-y-auto z-50"
  }, menuStep === 'jobs' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "p-3 border-b border-gray-100"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-gray-800"
  }, "\uD83D\uDCF7 Upload Site Photos"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Select which job these photos belong to")), /*#__PURE__*/React.createElement("div", {
    className: "p-2 max-h-60 overflow-y-auto"
  }, allJobs.map(job => /*#__PURE__*/React.createElement("button", {
    key: job,
    onClick: () => handleJobSelect(job),
    className: "w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 rounded-lg flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-lg"
  }, "\uD83C\uDFD7\uFE0F"), /*#__PURE__*/React.createElement("span", {
    className: "truncate"
  }, job), /*#__PURE__*/React.createElement("span", {
    className: "ml-auto text-gray-400"
  }, "\u2192"))))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "p-3 border-b border-gray-100"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleBackToJobs,
    className: "text-orange-600 text-sm flex items-center gap-1 mb-2"
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-gray-800"
  }, "Upload to: ", selectedJob)), /*#__PURE__*/React.createElement("div", {
    className: "p-3 space-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleCameraClick,
    className: "w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-purple-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl",
    "aria-hidden": "true"
  }, "\uD83D\uDCF8"), "Take Photo"), /*#__PURE__*/React.createElement("button", {
    onClick: handleGalleryClick,
    className: "w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl",
    "aria-hidden": "true"
  }, "\uD83D\uDDBC\uFE0F"), "Choose from Gallery"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 text-center mt-2"
  }, "Gallery allows multiple photos"))))), /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold"
  }, "Welcome Back!"), /*#__PURE__*/React.createElement("p", {
    className: "text-orange-100 text-sm mt-1"
  }, "Stay safe on site today"), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-center gap-2 text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCC5"), /*#__PURE__*/React.createElement("span", null, todayDate))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-5 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-2 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-white font-bold text-xs"
  }, forms.filter(f => f.type === 'prestart').length)), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-xs"
  }, "Pre-Start")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-2 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-white font-bold text-xs"
  }, forms.filter(f => f.type === 'inspection').length)), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-xs"
  }, "Inspect")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-2 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-white font-bold text-xs"
  }, forms.filter(f => f.type === 'itp').length)), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-xs"
  }, "ITP")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-2 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-white font-bold text-xs"
  }, forms.filter(f => f.type === 'incident').length)), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-xs"
  }, "Incident")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-2 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-white font-bold text-xs"
  }, forms.filter(f => f.type === 'toolbox').length)), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-600 text-xs"
  }, "Toolbox"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3"
  }, "Quick Actions"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentView('prestart'),
    className: "bg-white rounded-xl p-2 shadow-sm flex flex-col items-center gap-1 hover:shadow-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-lg"
  }, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium text-gray-700 text-center"
  }, "Pre-Start")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentView('recordings'),
    className: "bg-white rounded-xl p-2 shadow-sm flex flex-col items-center gap-1 hover:shadow-md border-2 border-teal-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-lg"
  }, "\uD83D\uDCF8"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium text-gray-700 text-center"
  }, "Recordings")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentView('steel-itp'),
    className: "bg-white rounded-xl p-2 shadow-sm flex flex-col items-center gap-1 hover:shadow-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-lg"
  }, "\uD83D\uDD29"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium text-gray-700 text-center"
  }, "Steel ITP")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentView('inspection'),
    className: "bg-white rounded-xl p-2 shadow-sm flex flex-col items-center gap-1 hover:shadow-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-lg"
  }, "\uD83D\uDD0D"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium text-gray-700 text-center"
  }, "Inspect")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentView('itp'),
    className: "bg-white rounded-xl p-2 shadow-sm flex flex-col items-center gap-1 hover:shadow-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center text-lg"
  }, "\uD83D\uDCDD"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium text-gray-700 text-center"
  }, "ITP")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentView('incidents'),
    className: "bg-white rounded-xl p-2 shadow-sm flex flex-col items-center gap-1 hover:shadow-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-lg"
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium text-gray-700 text-center"
  }, "Incident")))), recentForms.length > 0 && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3"
  }, "Recent Forms"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, recentForms.map(form => {
    const typeInfo = formTypeLabels[form.type] || {
      label: form.type,
      emoji: '📄',
      color: 'bg-gray-500'
    };
    const formDate = new Date(form.createdAt);
    const isBackedUp = isFormBackedUp(form.id);
    return /*#__PURE__*/React.createElement("button", {
      key: form.id,
      onClick: () => onViewForm(form),
      className: "w-full bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 hover:shadow-md transition text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-10 h-10 ${typeInfo.color} rounded-lg flex items-center justify-center text-lg`
    }, typeInfo.emoji), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-medium text-gray-800 text-sm truncate"
    }, form.data?.siteConducted || form.data?.site || form.data?.siteLocation || typeInfo.label), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-500"
    }, formDate.toLocaleDateString('en-AU'), " ", formDate.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit'
    }))), /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, isBackedUp && /*#__PURE__*/React.createElement("span", {
      className: "text-green-500 text-xs"
    }, "\u2713 Saved"), /*#__PURE__*/React.createElement("span", {
      className: "text-gray-400"
    }, "\u203A")));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-50 border border-yellow-200 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl",
    "aria-hidden": "true"
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-yellow-800"
  }, "Daily Safety Reminder"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-yellow-700 mt-1"
  }, "Always wear appropriate PPE including safety glasses, steel-capped boots, and high-vis clothing when on site.")))));
}

// Training View Component

// Export to window for cross-file access
window.Dashboard = Dashboard;

// === js/components/bootstrap.jsx ===
/**
 * @module Bootstrap
 * @description App entry point. Mounts the React application tree using ReactDOM.createRoot,
 * wrapping AppWithAuth inside an ErrorBoundary for crash recovery.
 */
// App bootstrap: ReactDOM.createRoot
// Extracted from index.html

console.log('[BOOTSTRAP] Starting React render...');
try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(/*#__PURE__*/React.createElement(ErrorBoundary, null, /*#__PURE__*/React.createElement(AppWithAuth, null)));
  console.log('[BOOTSTRAP] React render initiated successfully (with ErrorBoundary)');
} catch (err) {
  console.error('[BOOTSTRAP] Render error:', err);
  var errDiv = document.getElementById('root');
  errDiv.innerHTML = '<div style="padding:20px;color:red;font-family:system-ui;">' + '<h2>App Error</h2><pre></pre></div>';
  errDiv.querySelector('pre').textContent = err.message;
}