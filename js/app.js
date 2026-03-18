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
            var keysToRemove = [];
            for (var i = 0; i < localStorage.length; i++) {
              var key = localStorage.key(i);
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

// Icon component wrapper
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
    style: {
      display: 'inline-flex',
      alignItems: 'center'
    }
  });
}

// Simple icon rendering function
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
    style: {
      width: size,
      height: size
    }
  });
}

// Signature Pad Component
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
      const saved = localStorage.getItem('jmart-team-signatures');
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
    ToastNotifier.warning(`Security Notice: ${memberName} must sign their own signature. Please have them sign directly on this device.`);
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
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl w-full max-w-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 border-b"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "Sign: ", name), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, "Draw your signature below or use a saved one")), showVerification && /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-amber-50 border-b border-amber-200"
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
    className: "w-full border border-amber-300 rounded-lg px-3 py-2 mb-2 text-center text-lg tracking-widest"
  }), verificationError && /*#__PURE__*/React.createElement("p", {
    className: "text-red-600 text-sm mb-2"
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
    onMouseDown: startDrawing,
    onMouseMove: draw,
    onMouseUp: stopDrawing,
    onMouseLeave: stopDrawing,
    onTouchStart: startDrawing,
    onTouchMove: draw,
    onTouchEnd: stopDrawing
  }), /*#__PURE__*/React.createElement("div", {
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
        ToastNotifier.warning('Maximum ' + MAX_PHOTOS_PER_SECTION + ' photos per section. Remove a photo to add more.');
        e.target.value = '';
        return;
      }
      const filesToProcess = Array.from(files).slice(0, remaining);
      if (filesToProcess.length < files.length) {
        ToastNotifier.info('Only adding ' + filesToProcess.length + ' of ' + files.length + ' photos (limit: ' + MAX_PHOTOS_PER_SECTION + ' per section).');
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
                  useImageFallback(event.target.result, maxWidth, quality, resolve);
                });
              } else {
                // Fallback for browsers without createImageBitmap
                useImageFallback(event.target.result, maxWidth, quality, resolve);
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
        const useImageFallback = (dataUrl, maxWidth, quality, resolve) => {
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
  }, "\uD83D\uDCDD Add Note"), (media || []).length < MAX_PHOTOS_PER_SECTION ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    onClick: () => cameraInputRef.current?.click(),
    className: "flex-1 bg-purple-50 border border-purple-200 text-purple-700 py-2 px-3 rounded-lg text-sm font-medium"
  }, "\uD83D\uDCF7 Camera"), /*#__PURE__*/React.createElement("button", {
    onClick: () => galleryInputRef.current?.click(),
    className: "flex-1 bg-green-50 border border-green-200 text-green-700 py-2 px-3 rounded-lg text-sm font-medium"
  }, "\uD83D\uDDBC\uFE0F Gallery")) : /*#__PURE__*/React.createElement("span", {
    className: "flex-1 text-center text-xs text-gray-400 py-2"
  }, "\uD83D\uDCF7 ", MAX_PHOTOS_PER_SECTION, "/", MAX_PHOTOS_PER_SECTION, " max"), /*#__PURE__*/React.createElement("input", {
    ref: cameraInputRef,
    type: "file",
    accept: "image/*",
    capture: "environment",
    onChange: handleMediaCapture,
    className: "hidden"
  }), /*#__PURE__*/React.createElement("input", {
    ref: galleryInputRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: handleMediaCapture,
    className: "hidden"
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
    className: "text-blue-500 ml-2"
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
  }, "\u2601\uFE0F In cloud"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onRemoveMedia(idx),
    className: "absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
  }, "\u2715"))))));
}

// Export to window for cross-file access (Babel standalone scoping)
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

// === js/components/hooks.jsx ===
// Custom React Hooks for JMart Steel Safety App
// Extracted from app.jsx for maintainability

// =============================================
// useFormManager - CRUD operations for forms
// =============================================
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
      const saved = localStorage.getItem('jmart-backed-up-forms');
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
      const saved = localStorage.getItem('jmart-team-signatures');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('Could not parse team signatures:', e);
      return {};
    }
  });
  const deletingFormRef = useRef(false);
  const deletedFormIdsRef = useRef(new Set(function () {
    try {
      return JSON.parse(localStorage.getItem('jmart-deleted-form-ids') || '[]');
    } catch (e) {
      return [];
    }
  }()));

  // Mark form as backed up (after PDF download)
  const markAsBackedUp = formId => {
    const newBackedUp = [...backedUpForms, formId];
    setBackedUpForms(newBackedUp);
    localStorage.setItem('jmart-backed-up-forms', JSON.stringify(newBackedUp));
  };

  // Check if form is backed up
  const isFormBackedUp = formId => backedUpForms.includes(formId);

  // Update team signatures
  const updateSignatures = newSignatures => {
    setSavedSignatures(newSignatures);
    if (typeof StorageQuotaManager !== 'undefined' && StorageQuotaManager.safeSignaturesWrite) {
      StorageQuotaManager.safeSignaturesWrite(newSignatures);
    } else {
      localStorage.setItem('jmart-team-signatures', JSON.stringify(newSignatures));
    }
    if (FirebaseSync.isConnected()) {
      firebaseDb.ref('signatures').set(typeof sanitizeForFirebase === 'function' ? sanitizeForFirebase(newSignatures) : newSignatures).catch(err => console.error('Signature sync error:', err));
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
        createdByName: localStorage.getItem('jmart-user-name') || 'Unknown User',
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
      ToastNotifier.error('Error saving form: ' + err.message + '. Please try again.');
    }
  };

  // Unlock a locked form (admin only)
  const unlockForm = formId => {
    if (!DeviceAuthManager.isAdmin) {
      ToastNotifier.warning('Only admins can unlock submitted forms for editing.');
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
        ToastNotifier.warning('This form has been submitted and locked. Only an admin can edit it.');
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
      modifiedByName: localStorage.getItem('jmart-user-name') || 'Unknown User',
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
          const remoteSnap = await firebaseDb.ref('jmart-safety/forms/' + form.id).once('value');
          const remoteForm = remoteSnap.val();
          if (remoteForm && remoteForm.version && originalForm && originalForm.version) {
            if (remoteForm.version > originalForm.version) {
              const overwrite = await ConfirmDialog.show('This form was updated by another device (v' + remoteForm.version + ' vs your v' + originalForm.version + '). Overwrite with your changes?', {
                title: 'Version Conflict',
                confirmLabel: 'Overwrite',
                destructive: true
              });
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
      try {
        const filename = PDFGenerator.download(form);
        if (filename) {
          markAsBackedUp(form.id);
          console.log('Downloaded updated PDF:', filename);
          if (GoogleDriveSync.isConnected()) {
            const result = PDFGenerator.generate(form);
            if (result && result.doc) {
              const pdfBlob = result.doc.output('blob');
              await GoogleDriveSync.uploadPDF(pdfBlob, filename, form.type);
              console.log('Uploaded new PDF to Drive:', form.type);
            }
          }
        }
      } catch (pdfErr) {
        console.error('PDF generation failed during update:', pdfErr);
        // Non-fatal — form data is already saved
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
      ToastNotifier.error('Error updating form. Please try again.');
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
      try {
        const filename = PDFGenerator.download(successModal.form);
        if (filename) {
          markAsBackedUp(successModal.form.id);
          console.log('Downloaded and backed up:', filename);
        }
      } catch (e) {
        console.error('PDF download failed:', e);
        if (typeof ToastNotifier !== 'undefined') ToastNotifier.error('Could not generate PDF');
      }
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

    // Persist deleted form ID so Firebase listener won't merge it back when reconnecting
    deletedFormIdsRef.current.add(formId);
    try {
      localStorage.setItem('jmart-deleted-form-ids', JSON.stringify([...deletedFormIdsRef.current]));
    } catch (e) {
      console.warn('Could not persist deleted form IDs:', e.message);
    }
    setForms(prevForms => {
      const deletedForm = prevForms.find(f => f.id === formId);
      const updatedForms = prevForms.filter(f => f.id !== formId);
      AuditLogManager.log('delete', {
        formId: formId,
        formType: deletedForm?.type || 'unknown',
        site: deletedForm?.data?.siteConducted || deletedForm?.data?.site || 'Unknown',
        originalCreatedBy: deletedForm?.createdBy || deletedForm?._modifiedBy || 'unknown',
        originalCreatedAt: deletedForm?.createdAt || 'unknown',
        action: 'Form deleted'
      });
      StorageQuotaManager.safeFormsWrite(updatedForms);
      console.log('Form deleted, saved to localStorage:', updatedForms.length, 'forms remaining');
      deletingFormRef.current = true;
      if (FirebaseSync.isConnected()) {
        FirebaseSync.syncForms(updatedForms).then(() => {
          console.log('Deletion synced to Firebase');
          deletingFormRef.current = false;
          // Clean up the persisted deleted ID since Firebase is now in sync
          deletedFormIdsRef.current.delete(formId);
          try {
            localStorage.setItem('jmart-deleted-form-ids', JSON.stringify([...deletedFormIdsRef.current]));
          } catch (e) {}
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
    deletedFormIdsRef,
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
function useDataSync({
  setForms,
  setSites,
  deletingFormRef,
  deletedFormIdsRef
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const isOnlineRef = useRef(isOnline);
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
    const savedForms = localStorage.getItem('jmart-safety-forms');
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
    const savedSites = localStorage.getItem('jmart-safety-sites');
    if (savedSites) {
      try {
        const parsed = JSON.parse(savedSites);
        const mapped = (Array.isArray(parsed) ? parsed : Object.values(parsed || {})).map(s => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') {
            const chars = Object.keys(s).filter(k => k !== '_lastModified' && !isNaN(k)).sort((a, b) => Number(a) - Number(b));
            return chars.map(k => s[k]).join('');
          }
          return String(s);
        }).filter(s => s && s.length > 1 && s !== 'undefined' && s !== 'null');
        // Deduplicate case-insensitively, keeping first occurrence
        const seen = new Set();
        const sanitized = mapped.filter(s => {
          const key = s.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setSites(sanitized);
        localStorage.setItem('jmart-safety-sites', JSON.stringify(sanitized));
      } catch (e) {
        console.error('Error parsing localStorage sites:', e);
        if (typeof ErrorTelemetry !== 'undefined') ErrorTelemetry.captureError(e, 'sites-parse');
      }
    }
    const lastSync = localStorage.getItem('jmart-last-sync');
    if (lastSync) setLastSynced(lastSync);
    if (FirebaseSync.isConnected()) {
      const unsubForms = FirebaseSync.onFormsChange(firebaseForms => {
        const formsArray = Array.isArray(firebaseForms) ? firebaseForms : Object.values(firebaseForms || {});

        // Throttle: skip if last write was <5s ago (prevents rapid-fire listener loop)
        var now = Date.now();
        if (now - lastFormsWriteRef.current < 5000) return;
        lastFormsWriteRef.current = now;
        console.log('Firebase forms received:', formsArray.length, 'forms');
        if (deletingFormRef.current) {
          deletingFormRef.current = false;
        }
        if (formsArray.length > 0) {
          const formMap = new Map();

          // Filter out forms that were deleted offline but haven't been purged from Firebase yet
          const deletedIds = deletedFormIdsRef ? deletedFormIdsRef.current : new Set();
          formsArray.forEach(form => {
            if (deletedIds.has(form.id)) return; // Skip forms deleted offline
            formMap.set(form.id, {
              ...form,
              source: 'firebase'
            });
          });

          // Merge with local-only forms (forms not yet in Firebase)
          let currentLocalForms = [];
          try {
            const freshLocal = localStorage.getItem('jmart-safety-forms');
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
            const freshLocal = localStorage.getItem('jmart-safety-forms');
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
        const mapped = rawArray.map(s => {
          if (typeof s === 'string') return s;
          if (s && typeof s === 'object') {
            const chars = Object.keys(s).filter(k => k !== '_lastModified' && !isNaN(k)).sort((a, b) => Number(a) - Number(b));
            return chars.map(k => s[k]).join('');
          }
          return String(s);
        }).filter(s => s && s.length > 0 && s !== 'undefined' && s !== 'null');
        // Deduplicate case-insensitively, keeping first occurrence
        const seenSites = new Set();
        const sitesArray = mapped.filter(s => {
          const key = s.toLowerCase().trim();
          if (seenSites.has(key)) return false;
          seenSites.add(key);
          return true;
        });
        if (sitesArray.length > 0) {
          sitesFromFirebaseRef.current = true;
          setSites(sitesArray);
          localStorage.setItem('jmart-safety-sites', JSON.stringify(sitesArray));
        }
      });

      // ONE-TIME CLEANUP: Fix corrupted Firebase sites data
      (async () => {
        try {
          const sitesSnap = await firebaseDb.ref('jmart-safety/sites').once('value');
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
            await firebaseDb.ref('jmart-safety/sites').set(cleanSites);
            setSites(cleanSites);
            localStorage.setItem('jmart-safety-sites', JSON.stringify(cleanSites));
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
        localStorage.setItem('jmart-last-sync', new Date().toISOString());
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
      if (FirebaseSync.isConnected() && isOnlineRef.current && forms.length > 0) {
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
      localStorage.setItem('jmart-safety-sites', JSON.stringify(sites));
      if (sitesFromFirebaseRef.current) {
        sitesFromFirebaseRef.current = false;
        return;
      }
      if (FirebaseSync.isConnected() && isOnlineRef.current) {
        FirebaseSync.syncSites(sites);
      }
    }
  };

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      isOnlineRef.current = true;
    };
    const handleOffline = () => {
      setIsOnline(false);
      isOnlineRef.current = false;
    };
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
        var msg = details?.message || details?.error || '';
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
            var timeout = setTimeout(resolve, 6000);
            if (firebaseDb) {
              var ref = firebaseDb.ref('.info/connected');
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
            ToastNotifier.error('Your device access has been revoked by an administrator.', {
              duration: 10000
            });
          }
        });
        if (unsubOwnStatus) cleanups.push(unsubOwnStatus);
      } else {
        setDeviceAuthStatus('pending');

        // Real-time listener for device approval — replaces 5s polling
        if (firebaseDb && DeviceAuth.deviceId) {
          const approvalRef = firebaseDb.ref('jmart-safety/devices/approved/' + DeviceAuth.deviceId);
          approvalRef.on('value', snapshot => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              setDeviceAuthStatus('approved');
              setIsDeviceAdmin(data.role === 'admin');
              approvalRef.off('value');
              window.location.reload();
            }
          }, function (err) {
            console.warn('[hooks] Approval listener error:', err.message);
          });
          cleanups.push(() => approvalRef.off('value'));
        }
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
function usePWAInstall() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  useEffect(() => {
    const handler = e => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('jmart-install-dismissed');
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
    localStorage.setItem('jmart-install-dismissed', 'true');
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
function useAutoSave(formKey, formData, intervalMs) {
  const saveInterval = intervalMs || 30000; // default 30 seconds
  const draftKey = 'jmart-draft-' + formKey;

  // Keep a ref to the latest formData so the interval callback always reads current data
  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Stabilize dependency: only restart the interval when the serialized data actually changes
  const formDataStr = JSON.stringify(formData);

  // Save draft periodically
  useEffect(() => {
    if (!formDataRef.current || !formKey) return;
    const timer = IntervalRegistry.setInterval(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          data: formDataRef.current,
          savedAt: Date.now()
        }));
      } catch (e) {
        console.warn('[AutoSave] Could not save draft:', e.message);
      }
    }, saveInterval, 'useAutoSave-' + formKey);
    return () => IntervalRegistry.clearInterval(timer);
  }, [formDataStr, formKey]);

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

// Export to window for cross-file access
window.useFormManager = useFormManager;
window.useDataSync = useDataSync;
window.useDeviceAuth = useDeviceAuth;
window.usePWAInstall = usePWAInstall;
window.useAutoSave = useAutoSave;
window.useBeforeUnload = useBeforeUnload;

// === js/components/modals.jsx ===
// Modal & Banner Components
// Extracted from app.jsx for maintainability

// =============================================
// Success Modal - shown after form submission
// =============================================
function SuccessModal({
  successModal,
  onDownloadPDF,
  onClose
}) {
  if (!successModal) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-green-500 text-white p-6 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-5xl mb-3"
  }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
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
function ViewFormModal({
  viewFormModal,
  onClose,
  onEdit,
  onDownloadPDF,
  onDelete
}) {
  if (!viewFormModal) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-600 text-white p-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-bold"
  }, PDFGenerator.folderMap[viewFormModal.type] || viewFormModal.type), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    className: "text-white text-2xl"
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
function DeleteConfirmModal({
  deleteConfirmModal,
  isFormBackedUp,
  onDownloadPDF,
  onDelete,
  onCancel
}) {
  if (!deleteConfirmModal) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[110] p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-red-500 text-white p-4 text-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-4xl"
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("h2", {
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
function UpdateConfirmModal({
  updateConfirmModal,
  isUpdating,
  onConfirm,
  onContinueEditing,
  onCancel
}) {
  if (!updateConfirmModal) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[120] p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-600 text-white p-4 text-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-4xl"
  }, "\uD83D\uDD04"), /*#__PURE__*/React.createElement("h2", {
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
function NewDeviceNotification({
  notification,
  isDeviceAdmin,
  onApprove,
  onDeny,
  onDismiss
}) {
  if (!notification || !isDeviceAdmin) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed top-4 left-4 right-4 bg-blue-600 text-white p-4 rounded-xl shadow-lg z-[200] animate-pulse"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
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
    className: "text-white opacity-70 px-2"
  }, "\u2715"))));
}

// =============================================
// Pending Devices Banner (admin only)
// =============================================
function PendingDevicesBanner({
  pendingDevices,
  isDeviceAdmin,
  hasNotification,
  onNavigateSettings
}) {
  if (pendingDevices.length === 0 || !isDeviceAdmin || hasNotification) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onNavigateSettings,
    className: "bg-blue-500 text-white p-2 text-center cursor-pointer hover:bg-blue-600 transition"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium"
  }, "\uD83D\uDCF1 ", pendingDevices.length, " device(s) waiting for approval - Tap to review"));
}

// =============================================
// Sync Error/Pending Banner
// =============================================
function SyncStatusBanner({
  syncStatus,
  pendingSyncCount,
  syncError,
  onRetry
}) {
  if (syncStatus !== 'error' && !(syncStatus === 'pending' && pendingSyncCount > 0)) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: `fixed bottom-20 left-3 right-3 ${syncStatus === 'error' ? 'bg-red-600' : 'bg-yellow-600'} text-white p-3 rounded-xl shadow-lg z-50`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
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
function FirebaseSetupBanner({
  showSyncBanner,
  onDismiss,
  onSetup
}) {
  if (!showSyncBanner || FirebaseSync.isConnected()) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed bottom-20 left-3 right-3 bg-blue-600 text-white p-3 rounded-xl shadow-lg z-50 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "\u2601\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-sm"
  }, "Enable Cloud Sync"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs opacity-80"
  }, "Sync data across all devices"))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    className: "text-white opacity-70 px-2 py-1 text-sm"
  }, "Later"), /*#__PURE__*/React.createElement("button", {
    onClick: onSetup,
    className: "bg-white text-blue-600 px-3 py-1 rounded-lg text-sm font-semibold"
  }, "Setup")));
}

// =============================================
// Install Prompt Banner
// =============================================
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
    className: "text-2xl"
  }, "\uD83D\uDCF2"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-sm"
  }, "Install J&M Artsteel Safety"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs opacity-80"
  }, "Quick access from home screen"))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    className: "text-white opacity-70 px-2 py-1 text-sm"
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

function LoginScreen({
  onAuthenticated,
  authStatus
}) {
  const [password, setPassword] = useState('');
  const [deviceName, setDeviceName] = useState(() => {
    try {
      return localStorage.getItem('jmart-device-name') || '';
    } catch (e) {
      return '';
    }
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
          localStorage.setItem('jmart-device-name', deviceName);
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
    setIsLoading(true);
    setError('');
    if (await DeviceAuthManager.verifyPassword(password)) {
      // Password correct - grant access IMMEDIATELY
      onAuthenticated(true);
      // Save device name locally so it's remembered next time
      if (deviceName) {
        try {
          localStorage.setItem('jmart-device-name', deviceName);
        } catch (e) {}
      }
      // Fire-and-forget device registration
      Promise.race([DeviceAuthManager.init(), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))]).then(status => {
        if (status.status === 'new') {
          DeviceAuthManager.registerDevice(deviceName || 'Unknown Device').catch(() => {});
        }
      }).catch(() => {});
    } else {
      setError('Incorrect password');
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
      className: "text-4xl"
    }, "\uD83D\uDEE1\uFE0F")), /*#__PURE__*/React.createElement("h1", {
      className: "text-2xl font-bold text-gray-800"
    }, "J&M Artsteel Safety"), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-500 mt-2"
    }, "First Time Setup")), /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-1"
    }, "Device Name"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: deviceName,
      onChange: e => setDeviceName(e.target.value),
      placeholder: "e.g. Jeff's iPhone",
      className: "w-full border border-gray-300 rounded-lg p-3 text-lg"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-1"
    }, "Set App Password"), /*#__PURE__*/React.createElement("input", {
      type: "password",
      value: newPassword,
      onChange: e => setNewPassword(e.target.value),
      placeholder: "Create a password",
      className: "w-full border border-gray-300 rounded-lg p-3 text-lg"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-1"
    }, "Confirm Password"), /*#__PURE__*/React.createElement("input", {
      type: "password",
      value: confirmPassword,
      onChange: e => setConfirmPassword(e.target.value),
      placeholder: "Confirm password",
      className: "w-full border border-gray-300 rounded-lg p-3 text-lg",
      onKeyPress: e => e.key === 'Enter' && handleFirstSetup()
    })), error && /*#__PURE__*/React.createElement("div", {
      className: "bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm"
    }, error), /*#__PURE__*/React.createElement("button", {
      onClick: handleFirstSetup,
      disabled: isLoading,
      className: "w-full bg-orange-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-orange-700 disabled:bg-gray-400"
    }, isLoading ? '⏳ Setting up...' : '🔐 Complete Setup'), /*#__PURE__*/React.createElement("p", {
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
      className: "text-4xl"
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
    }, "\uD83D\uDD04 Check Again")));
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
    className: "text-4xl"
  }, "\uD83D\uDEE1\uFE0F")), /*#__PURE__*/React.createElement("h1", {
    className: "text-2xl font-bold text-gray-800"
  }, "J&M Artsteel Safety"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 mt-2"
  }, "Enter password to access")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Device Name (optional)"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: deviceName,
    onChange: e => setDeviceName(e.target.value),
    placeholder: "e.g. Scott's iPad",
    className: "w-full border border-gray-300 rounded-lg p-3"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Password"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: password,
    onChange: e => setPassword(e.target.value),
    placeholder: "Enter app password",
    className: "w-full border border-gray-300 rounded-lg p-3 text-lg",
    onKeyPress: e => e.key === 'Enter' && handleLogin()
  })), error && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm"
  }, error), /*#__PURE__*/React.createElement("button", {
    onClick: handleLogin,
    disabled: isLoading,
    className: "w-full bg-orange-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-orange-700 disabled:bg-gray-400"
  }, isLoading ? '⏳ Checking...' : '🔓 Enter App'))));
}

// App Wrapper with Authentication
function AppWithAuth() {
  const [authState, setAuthState] = useState('loading'); // 'loading', 'authenticated', 'unauthenticated', 'pending'
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    // Check if Firebase is configured
    if (!isFirebaseConfigured || !firebaseDb) {
      // No Firebase = no auth required (local mode)
      setAuthState('authenticated');
      return;
    }
    let status;
    try {
      status = await Promise.race([DeviceAuthManager.init(), new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000))]);
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
      className: "text-3xl"
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

// === js/components/app.jsx ===
// Main App: JMartSteelSafetyApp
// Uses custom hooks from hooks.jsx and modal components from modals.jsx

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
    deletedFormIdsRef,
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
    deletingFormRef,
    deletedFormIdsRef
  });

  // PWA Install
  const {
    showInstallPrompt,
    handleInstall,
    dismissInstall
  } = usePWAInstall();

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
      className: "text-6xl mb-4"
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
      className: "text-6xl mb-4"
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
    "aria-label": "Menu"
  }, "\u2630"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDEE1\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "font-bold text-lg leading-tight"
  }, "J&M Artsteel"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-orange-200"
  }, !isOnline ? '📴 Offline Mode' : syncStatus === 'error' ? '⚠️ Sync Error' : pendingPhotoCount > 0 ? '📷 ' + pendingPhotoCount + ' photo' + (pendingPhotoCount > 1 ? 's' : '') + ' queued' : syncStatus === 'pending' ? '🔄 ' + pendingSyncCount + ' pending' : syncStatus === 'synced' ? '☁️ Synced' : syncStatus === 'syncing' ? '🔄 Syncing...' : syncStatus === 'local' ? '💾 Local Only' : 'Safety Management'))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1"
  }, pendingPhotoCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-blue-300 text-sm animate-pulse"
  }, "\u25CF"), syncStatus === 'synced' && pendingPhotoCount === 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-green-300 text-sm"
  }, "\u25CF"), syncStatus === 'syncing' && /*#__PURE__*/React.createElement("span", {
    className: "text-yellow-300 text-sm animate-pulse"
  }, "\u25CF"), syncStatus === 'pending' && /*#__PURE__*/React.createElement("span", {
    className: "text-yellow-300 text-sm animate-pulse"
  }, "\u25CF"), syncStatus === 'error' && /*#__PURE__*/React.createElement("span", {
    className: "text-red-400 text-sm"
  }, "\u25CF"), !isOnline && /*#__PURE__*/React.createElement("span", {
    className: "text-yellow-300 text-sm"
  }, "\u25CF"))), menuOpen && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-40 flex"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50",
    onClick: () => setMenuOpen(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative w-72 bg-white shadow-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-orange-600 text-white"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold"
  }, "J&M Artsteel"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-orange-200"
  }, "NSW Operations")), /*#__PURE__*/React.createElement("nav", {
    className: "p-2"
  }, navItems.map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    onClick: () => {
      setCurrentView(item.id);
      setMenuOpen(false);
    },
    className: `w-full flex items-center gap-3 p-3 rounded-lg text-left ${currentView === item.id ? 'bg-orange-100 text-orange-600' : 'text-gray-700 hover:bg-gray-100'}`
  }, /*#__PURE__*/React.createElement("span", null, item.emoji), /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, item.label)))))), /*#__PURE__*/React.createElement("main", {
    className: "flex-1 p-4 pb-20"
  }, currentView === 'dashboard' && /*#__PURE__*/React.createElement(Dashboard, {
    setCurrentView: setCurrentView,
    forms: forms,
    onViewForm: setViewFormModal,
    isFormBackedUp: isFormBackedUp,
    sites: sites
  }), currentView === 'training' && /*#__PURE__*/React.createElement(TrainingView, null), currentView === 'prestart' && /*#__PURE__*/React.createElement(PrestartView, {
    onSubmit: data => addForm('prestart', data),
    onUpdate: updateForm,
    editingForm: editingForm?.type === 'prestart' ? editingForm : null,
    previousPrestarts: previousPrestarts,
    sites: sites
  }), currentView === 'steel-itp' && /*#__PURE__*/React.createElement(SteelITPView, {
    onSubmit: data => addForm('steel-itp', data),
    onUpdate: updateForm,
    editingForm: editingForm?.type === 'steel-itp' ? editingForm : null,
    sites: sites
  }), currentView === 'inspection' && /*#__PURE__*/React.createElement(SubcontractorInspectionView, {
    onSubmit: data => addForm('inspection', data),
    onUpdate: updateForm,
    editingForm: editingForm?.type === 'inspection' ? editingForm : null,
    sites: sites
  }), currentView === 'itp' && /*#__PURE__*/React.createElement(ITPFormView, {
    onSubmit: data => addForm('itp', data),
    onUpdate: updateForm,
    editingForm: editingForm?.type === 'itp' ? editingForm : null,
    sites: sites
  }), currentView === 'incidents' && /*#__PURE__*/React.createElement(IncidentView, {
    onSubmit: data => addForm('incident', data),
    onUpdate: updateForm,
    editingForm: editingForm?.type === 'incident' ? editingForm : null
  }), currentView === 'toolbox' && /*#__PURE__*/React.createElement(ToolboxView, {
    onSubmit: data => addForm('toolbox', data),
    onUpdate: updateForm,
    editingForm: editingForm?.type === 'toolbox' ? editingForm : null,
    sites: sites
  }), currentView === 'emergency' && /*#__PURE__*/React.createElement(EmergencyView, null), currentView === 'settings' && /*#__PURE__*/React.createElement(SettingsView, {
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
  }), currentView === 'recordings' && /*#__PURE__*/React.createElement(RecordingsView, {
    forms: forms,
    sites: sites
  })), /*#__PURE__*/React.createElement("nav", {
    className: "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 px-1 z-30"
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
    className: `flex flex-col items-center p-2 rounded-lg ${currentView === item.id ? 'text-orange-600' : 'text-gray-500'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, item.emoji), /*#__PURE__*/React.createElement("span", {
    className: "text-xs mt-1"
  }, item.label)))));
}

// Export to window for cross-file access
window.JMartSteelSafetyApp = JMartSteelSafetyApp;

// === js/components/dashboard.jsx ===
// Dashboard
// Extracted from index.html

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
  const allJobs = [...new Set(sites.length > 0 ? sites : defaultSites)];
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
    let errorMessages = [];
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
    className: "hidden"
  }), /*#__PURE__*/React.createElement("input", {
    ref: galleryInputRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: handlePhotoCapture,
    className: "hidden"
  }), uploadProgress && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-blue-700 text-sm"
  }, uploadProgress)), uploadStatus && /*#__PURE__*/React.createElement("div", {
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
    className: "w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-xl backdrop-blur-sm"
  }, "\uD83D\uDCF7"), showPhotoMenu && /*#__PURE__*/React.createElement("div", {
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
    className: "text-xl"
  }, "\uD83D\uDCF8"), "Take Photo"), /*#__PURE__*/React.createElement("button", {
    onClick: handleGalleryClick,
    className: "w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl"
  }, "\uD83D\uDDBC\uFE0F"), "Choose from Gallery"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 text-center mt-2"
  }, "Gallery allows multiple photos"))))), /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold"
  }, "Welcome Back!"), /*#__PURE__*/React.createElement("p", {
    className: "text-orange-100 text-sm mt-1"
  }, "Stay safe on site today"), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-center gap-2 text-sm"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC5"), /*#__PURE__*/React.createElement("span", null, todayDate))), /*#__PURE__*/React.createElement("div", {
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
    className: "text-2xl"
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-yellow-800"
  }, "Daily Safety Reminder"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-yellow-700 mt-1"
  }, "Always wear appropriate PPE including safety glasses, steel-capped boots, and high-vis clothing when on site.")))));
}

// Training View Component

// Export to window for cross-file access
window.Dashboard = Dashboard;

// === js/components/training.jsx ===
// TrainingView Component
// Uses TRAINING_COURSES from trainingCourseData.js
// Uses TrainingCertGenerator from trainingCertGenerator.js

function TrainingView() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [workerName, setWorkerName] = useState('');
  const [showCertificate, setShowCertificate] = useState(false);
  const [signatureData, setSignatureData] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [viewingStandards, setViewingStandards] = useState(null);
  const [completedCourses, setCompletedCourses] = useState(() => {
    try {
      const saved = localStorage.getItem('jmart-completed-training');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Could not parse completed training:', e);
      return [];
    }
  });

  // Course data from external file
  const courses = TRAINING_COURSES;
  const handleAnswer = (questionIndex, answerIndex) => {
    setAnswers({
      ...answers,
      [questionIndex]: answerIndex
    });
  };
  const calculateScore = () => {
    if (!selectedCourse) return 0;
    let correct = 0;
    selectedCourse.questions.forEach((q, i) => {
      if (answers[i] === q.correct) correct++;
    });
    return Math.round(correct / selectedCourse.questions.length * 100);
  };
  const completeCourse = () => {
    const score = calculateScore();
    if (score >= 80) {
      const newCompleted = [...completedCourses, {
        courseId: selectedCourse.id,
        completedAt: new Date().toISOString(),
        score: score
      }];
      setCompletedCourses(newCompleted);
      try {
        localStorage.setItem('jmart-completed-training', JSON.stringify(newCompleted));
      } catch (e) {
        console.warn('Could not save training completion:', e.message);
      }
    }
    setShowResults(true);
  };
  const resetCourse = () => {
    setSelectedCourse(null);
    setCurrentQuestion(0);
    setAnswers({});
    setShowResults(false);
  };
  const isCompleted = courseId => completedCourses.some(c => c.courseId === courseId);
  const generateCertificate = () => {
    TrainingCertGenerator.generate(workerName, selectedCourse, signatureData, calculateScore);
  };
  const getAppUrl = () => 'https://davidethepingpong.github.io/jmart-steel-safety-app/index.html';

  // Course List View
  if (!selectedCourse) {
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, showQRCode && /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4",
      onClick: () => setShowQRCode(false)
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-6 max-w-sm text-center",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-bold text-lg mb-3"
    }, "\uD83D\uDCF1 Share J&M Artsteel Safety App"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600 mb-4"
    }, "Workers can scan this QR code to install the Safety App on their phone"), /*#__PURE__*/React.createElement("div", {
      className: "bg-gray-100 p-4 rounded-lg mb-4"
    }, /*#__PURE__*/React.createElement("img", {
      src: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(getAppUrl()),
      alt: "QR Code",
      className: "mx-auto"
    })), /*#__PURE__*/React.createElement("div", {
      className: "bg-gray-50 p-3 rounded-lg text-xs break-all text-gray-600 mb-4"
    }, getAppUrl()), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        navigator.clipboard.writeText(getAppUrl());
        ToastNotifier.success('Link copied!');
      },
      className: "w-full bg-orange-600 text-white p-3 rounded-lg font-semibold mb-2"
    }, "\uD83D\uDCCB Copy Link"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowQRCode(false),
      className: "w-full bg-gray-200 p-3 rounded-lg font-semibold"
    }, "Close"))), viewingStandards && /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4",
      onClick: () => setViewingStandards(null)
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 max-w-md w-full max-h-[80vh] overflow-y-auto",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-bold text-lg mb-3"
    }, "\uD83D\uDCCB ", viewingStandards.title, " - Standards"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600 mb-4"
    }, "This training references the following Australian Standards:"), /*#__PURE__*/React.createElement("div", {
      className: "space-y-3"
    }, viewingStandards.standards && viewingStandards.standards.map((s, i) => /*#__PURE__*/React.createElement("a", {
      key: i,
      href: s.url,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "block bg-blue-50 p-3 rounded-lg hover:bg-blue-100 transition-colors"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-medium text-blue-800 text-sm"
    }, s.code), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-blue-600 mt-1"
    }, "\uD83D\uDD17 View Standard \u2192")))), /*#__PURE__*/React.createElement("button", {
      onClick: () => setViewingStandards(null),
      className: "w-full bg-gray-200 p-3 rounded-lg font-semibold mt-4"
    }, "Close"))), /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-xl"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
      className: "text-xl font-bold"
    }, "\uD83D\uDCDA Training Courses"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm opacity-90 mt-1"
    }, "Complete courses to stay safe on site")), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowQRCode(true),
      className: "bg-white bg-opacity-20 p-2 rounded-lg hover:bg-opacity-30",
      title: "Share with workers"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-2xl"
    }, "\uD83D\uDCF1")))), /*#__PURE__*/React.createElement("div", {
      className: "grid gap-3"
    }, courses.map(course => /*#__PURE__*/React.createElement("div", {
      key: course.id,
      className: "bg-white p-4 rounded-xl shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-4xl"
    }, course.image), /*#__PURE__*/React.createElement("div", {
      className: "flex-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-semibold text-gray-900"
    }, course.title), isCompleted(course.id) && /*#__PURE__*/React.createElement("span", {
      className: "text-green-500 text-lg"
    }, "\u2705")), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600"
    }, course.description), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-400 mt-1"
    }, "\u23F1\uFE0F ", course.duration, " \u2022 ", course.questions.length, " questions"))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 mt-3"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setSelectedCourse(course),
      className: "flex-1 bg-orange-600 text-white p-2 rounded-lg font-semibold text-sm"
    }, "Start Course \u25B6"), course.standards && /*#__PURE__*/React.createElement("button", {
      onClick: () => setViewingStandards(course),
      className: "bg-blue-100 text-blue-700 p-2 rounded-lg text-sm font-medium"
    }, "\uD83D\uDCCB Standards"))))), completedCourses.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "bg-green-50 border border-green-200 p-4 rounded-xl mt-4"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-semibold text-green-800"
    }, "\uD83C\uDF89 Completed Training"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-green-600"
    }, completedCourses.length, " of ", courses.length, " courses completed")));
  }

  // Results View
  if (showResults) {
    const score = calculateScore();
    const passed = score >= 80;
    if (showSignature) {
      return /*#__PURE__*/React.createElement(SignaturePad, {
        name: workerName,
        onSave: sig => {
          setSignatureData(sig);
          setShowSignature(false);
          setShowCertificate(true);
        },
        onCancel: () => setShowSignature(false)
      });
    }
    if (showCertificate) {
      return /*#__PURE__*/React.createElement("div", {
        className: "space-y-4"
      }, /*#__PURE__*/React.createElement("div", {
        className: "bg-green-500 text-white p-6 rounded-xl text-center"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-6xl mb-4"
      }, "\uD83C\uDF93"), /*#__PURE__*/React.createElement("h2", {
        className: "text-2xl font-bold"
      }, "Certificate Ready!"), /*#__PURE__*/React.createElement("p", {
        className: "mt-2"
      }, "Your training certificate has been prepared")), /*#__PURE__*/React.createElement("div", {
        className: "bg-white rounded-xl p-4 space-y-4"
      }, /*#__PURE__*/React.createElement("div", {
        className: "text-center"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-4xl mb-2"
      }, selectedCourse.image), /*#__PURE__*/React.createElement("h3", {
        className: "font-bold text-lg"
      }, selectedCourse.title), /*#__PURE__*/React.createElement("p", {
        className: "text-green-600 font-semibold"
      }, "Score: ", score, "% \u2713")), /*#__PURE__*/React.createElement("div", {
        className: "border-t pt-4"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-gray-600 mb-2"
      }, /*#__PURE__*/React.createElement("strong", null, "Worker:"), " ", workerName), /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-gray-600 mb-2"
      }, /*#__PURE__*/React.createElement("strong", null, "Date:"), " ", new Date().toLocaleDateString('en-AU')), signatureData && /*#__PURE__*/React.createElement("div", {
        className: "mt-3"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-500 mb-1"
      }, "Signature:"), /*#__PURE__*/React.createElement("img", {
        src: signatureData,
        alt: "Signature",
        className: "h-12 border rounded"
      }))), selectedCourse.standards && /*#__PURE__*/React.createElement("div", {
        className: "bg-blue-50 p-3 rounded-lg"
      }, /*#__PURE__*/React.createElement("p", {
        className: "text-xs font-semibold text-blue-800 mb-2"
      }, "\uD83D\uDCCB Standards Referenced:"), selectedCourse.standards.map((s, i) => /*#__PURE__*/React.createElement("p", {
        key: i,
        className: "text-xs text-blue-700"
      }, "\u2022 ", s.code)))), /*#__PURE__*/React.createElement("button", {
        onClick: generateCertificate,
        className: "w-full bg-green-600 text-white p-4 rounded-xl font-semibold"
      }, "\uD83D\uDCE5 Download Certificate"), /*#__PURE__*/React.createElement("button", {
        onClick: resetCourse,
        className: "w-full bg-gray-200 text-gray-700 p-4 rounded-xl font-semibold"
      }, "Back to Courses"));
    }
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: `${passed ? 'bg-green-500' : 'bg-red-500'} text-white p-6 rounded-xl text-center`
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-6xl mb-4"
    }, passed ? '🎉' : '📚'), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold"
    }, passed ? 'Congratulations!' : 'Keep Learning!'), /*#__PURE__*/React.createElement("p", {
      className: "text-4xl font-bold mt-2"
    }, score, "%"), /*#__PURE__*/React.createElement("p", {
      className: "mt-2"
    }, passed ? 'You passed the course!' : 'You need 80% to pass. Try again!')), passed && /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 space-y-3"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-semibold"
    }, "\uD83D\uDCDD Sign & Get Certificate"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600"
    }, "Enter your name and sign to receive your training certificate."), /*#__PURE__*/React.createElement("input", {
      type: "text",
      placeholder: "Enter your full name",
      value: workerName,
      onChange: e => setWorkerName(e.target.value),
      className: "w-full p-3 border rounded-lg"
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowSignature(true),
      disabled: !workerName.trim(),
      className: `w-full p-3 rounded-lg font-semibold ${workerName.trim() ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`
    }, "\u270D\uFE0F Sign Certificate")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 space-y-3"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-semibold"
    }, "Review Your Answers"), selectedCourse.questions.map((q, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `p-3 rounded-lg ${answers[i] === q.correct ? 'bg-green-50' : 'bg-red-50'}`
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-medium text-sm"
    }, q.question), /*#__PURE__*/React.createElement("p", {
      className: "text-xs mt-1"
    }, "Your answer: ", answers[i] !== undefined ? q.options[answers[i]] : /*#__PURE__*/React.createElement("span", {
      className: "italic text-gray-400"
    }, "Not answered")), answers[i] !== q.correct && /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-green-700 mt-1"
    }, "Correct: ", q.options[q.correct]), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-gray-500 mt-1 italic"
    }, q.explanation)))), /*#__PURE__*/React.createElement("button", {
      onClick: resetCourse,
      className: "w-full bg-orange-600 text-white p-4 rounded-xl font-semibold"
    }, "Back to Courses"));
  }

  // Quiz View
  const question = selectedCourse.questions[currentQuestion];
  const progress = (currentQuestion + 1) / selectedCourse.questions.length * 100;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: resetCourse,
    className: "text-gray-500"
  }, "\u2715 Exit"), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-500"
  }, currentQuestion + 1, " / ", selectedCourse.questions.length)), /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-gray-200 rounded-full h-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-orange-500 h-2 rounded-full transition-all",
    style: {
      width: progress + '%'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-4xl"
  }, selectedCourse.image), /*#__PURE__*/React.createElement("h2", {
    className: "font-bold text-lg mt-2"
  }, selectedCourse.title)), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-4 rounded-lg mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-gray-900"
  }, question.question)), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, question.options.map((option, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    onClick: () => handleAnswer(currentQuestion, i),
    className: `w-full p-3 rounded-lg text-left transition-colors ${answers[currentQuestion] === i ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`
  }, option)))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, currentQuestion > 0 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentQuestion(currentQuestion - 1),
    className: "flex-1 bg-gray-200 p-4 rounded-xl font-semibold"
  }, "\u2190 Previous"), currentQuestion < selectedCourse.questions.length - 1 ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setCurrentQuestion(currentQuestion + 1),
    disabled: answers[currentQuestion] === undefined,
    className: `flex-1 p-4 rounded-xl font-semibold ${answers[currentQuestion] !== undefined ? 'bg-orange-600 text-white' : 'bg-gray-300 text-gray-500'}`
  }, "Next \u2192") : /*#__PURE__*/React.createElement("button", {
    onClick: completeCourse,
    disabled: answers[currentQuestion] === undefined,
    className: `flex-1 p-4 rounded-xl font-semibold ${answers[currentQuestion] !== undefined ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500'}`
  }, "Complete \u2713")));
}

// Error Boundary for debugging
class DebugErrorBoundary extends React.Component {
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
      error: error
    };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({
      errorInfo: errorInfo
    });
    console.error('ERROR BOUNDARY CAUGHT:', error.message, error.stack);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: {
          padding: '20px',
          background: '#fee',
          border: '2px solid red',
          margin: '10px',
          borderRadius: '8px'
        }
      }, React.createElement('h2', {
        style: {
          color: 'red'
        }
      }, 'Component Error'), React.createElement('pre', {
        style: {
          whiteSpace: 'pre-wrap',
          fontSize: '12px'
        }
      }, String(this.state.error)), React.createElement('pre', {
        style: {
          whiteSpace: 'pre-wrap',
          fontSize: '10px',
          marginTop: '10px'
        }
      }, this.state.errorInfo ? this.state.errorInfo.componentStack : 'no stack'));
    }
    return this.props.children;
  }
}

// Export to window for cross-file access
window.TrainingView = TrainingView;
window.DebugErrorBoundary = DebugErrorBoundary;

// === js/components/form-prestart.jsx ===
// PrestartView Component
// Extracted from forms.jsx

// Form views: Prestart, Incident, Toolbox, Inspection, ITP, SteelITP
// Extracted from index.html

function PrestartView({
  onSubmit,
  onUpdate,
  editingForm,
  previousPrestarts = [],
  sites = []
}) {
  const isEditing = !!editingForm;
  const editData = editingForm?.data || {};
  const [step, setStep] = useState(isEditing ? 2 : 1);
  const [checkType, setCheckType] = useState(editData.type || null);
  const [checks, setChecks] = useState(editData.checks || {});
  const [notes, setNotes] = useState(editData.notes || '');
  const [submitted, setSubmitted] = useState(false);
  const [signingWorker, setSigningWorker] = useState(null);
  const [showPreviousList, setShowPreviousList] = useState(false);
  const [supervisorName, setSupervisorName] = useState(editData.supervisorName || '');
  const [siteConducted, setSiteConducted] = useState(editData.siteConducted || '');
  const [builder, setBuilder] = useState(editData.builder || '');
  const [address, setAddress] = useState(editData.address || '');
  const [isLocating, setIsLocating] = useState(false);
  const [formDate, setFormDate] = useState(editData.date ? new Date(editData.date) : new Date());

  // Helper to ensure media fields have proper structure
  const ensureMediaStructure = data => ({
    value: data?.value || '',
    notes: Array.isArray(data?.notes) ? data.notes : [],
    media: Array.isArray(data?.media) ? data.media : []
  });
  const [workAreas, setWorkAreas] = useState(ensureMediaStructure(editData.workAreas));
  const [tasksThisShift, setTasksThisShift] = useState(ensureMediaStructure(editData.tasksThisShift));
  const [machineryControls, setMachineryControls] = useState(ensureMediaStructure(editData.machineryControls));
  const [siteHazards, setSiteHazards] = useState(ensureMediaStructure(editData.siteHazards));
  const [permitsRequired, setPermitsRequired] = useState(ensureMediaStructure(editData.permitsRequired));

  // New fields
  const [isPlantEquipmentUsed, setIsPlantEquipmentUsed] = useState(editData.isPlantEquipmentUsed ?? null); // yes/no
  const [highRiskWorks, setHighRiskWorks] = useState(editData.highRiskWorks ?? null); // yes/no/na
  const [worksCoveredBySWMS, setWorksCoveredBySWMS] = useState(editData.worksCoveredBySWMS ?? null); // yes/no/na
  const [hasSafetyIssues, setHasSafetyIssues] = useState(editData.hasSafetyIssues ?? null); // yes/no
  const [safetyIssuesPreviousShift, setSafetyIssuesPreviousShift] = useState(ensureMediaStructure(editData.safetyIssuesPreviousShift));
  const [translatorRequired, setTranslatorRequired] = useState(editData.translatorRequired ?? null); // yes/no
  const [translatorSignature, setTranslatorSignature] = useState(editData.translatorSignature || null);
  const [translatorName, setTranslatorName] = useState(editData.translatorName || '');
  const [signingTranslator, setSigningTranslator] = useState(false);
  const [signatures, setSignatures] = useState(editData.signatures || FORM_CONSTANTS.emptySignatures());

  // Reset form state when editingForm prop changes (useState initializers only run on mount)
  useEffect(() => {
    const data = editingForm?.data || {};
    setStep(editingForm ? 2 : 1);
    setCheckType(data.type || null);
    setChecks(data.checks || {});
    setNotes(data.notes || '');
    setSupervisorName(data.supervisorName || '');
    setSiteConducted(data.siteConducted || '');
    setBuilder(data.builder || '');
    setAddress(data.address || '');
    setFormDate(data.date ? new Date(data.date) : new Date());
    setWorkAreas(ensureMediaStructure(data.workAreas));
    setTasksThisShift(ensureMediaStructure(data.tasksThisShift));
    setMachineryControls(ensureMediaStructure(data.machineryControls));
    setSiteHazards(ensureMediaStructure(data.siteHazards));
    setPermitsRequired(ensureMediaStructure(data.permitsRequired));
    setIsPlantEquipmentUsed(data.isPlantEquipmentUsed ?? null);
    setHighRiskWorks(data.highRiskWorks ?? null);
    setWorksCoveredBySWMS(data.worksCoveredBySWMS ?? null);
    setHasSafetyIssues(data.hasSafetyIssues ?? null);
    setSafetyIssuesPreviousShift(ensureMediaStructure(data.safetyIssuesPreviousShift));
    setTranslatorRequired(data.translatorRequired ?? null);
    setTranslatorSignature(data.translatorSignature || null);
    setTranslatorName(data.translatorName || '');
    setSignatures(data.signatures || FORM_CONSTANTS.emptySignatures());
    setSubmitted(false);
    setValidationErrors([]);
  }, [editingForm?.id]);
  const displayDate = formDate.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const displayTime = formDate.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit'
  });
  const builders = FORM_CONSTANTS.builders;
  const sitesList = [...new Set((sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string'))];
  const teamMembers = FORM_CONSTANTS.teamMembers;
  const checklistTypes = FORM_CONSTANTS.checklistTypes;
  const checklistItems = FORM_CONSTANTS.checklistItems;
  const getLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          const data = await response.json();
          setAddress(data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`);
        } catch (e) {
          setAddress(`${position.coords.latitude}, ${position.coords.longitude}`);
        }
        setIsLocating(false);
      }, () => {
        ToastNotifier.error('Unable to get location');
        setIsLocating(false);
      }, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    } else {
      setIsLocating(false);
    }
  };

  // Validation for Pre-Start form - WHS compliance required fields
  const [validationErrors, setValidationErrors] = useState([]);
  const validateForm = () => {
    // Use centralized validator for WHS-compliant checks
    if (window.formValidator) {
      return window.formValidator.validatePrestart({
        supervisorName,
        siteConducted,
        builder,
        address,
        highRiskWorks,
        worksCoveredBySWMS,
        isPlantEquipmentUsed,
        siteHazards,
        signatures,
        checks,
        checkType,
        checklistItems
      });
    }
    // Fallback: basic inline validation if validator not loaded
    const errors = [];
    if (!siteConducted) errors.push('Site/Location is required');
    if (!supervisorName) errors.push('Supervisor name is required');
    return errors;
  };
  const handleSubmit = () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    const formData = {
      type: checkType,
      checks,
      notes,
      signatures,
      supervisorName,
      siteConducted,
      builder,
      address,
      workAreas,
      tasksThisShift,
      machineryControls,
      siteHazards,
      permitsRequired,
      isPlantEquipmentUsed,
      highRiskWorks,
      worksCoveredBySWMS,
      hasSafetyIssues,
      safetyIssuesPreviousShift,
      translatorRequired,
      translatorSignature,
      translatorName,
      date: formDate.toISOString()
    };
    if (isEditing && onUpdate) {
      // When editing, the confirmation modal will handle the flow
      onUpdate(editingForm.id, 'prestart', formData);
      // Don't set submitted - the modal will handle navigation
    } else {
      onSubmit(formData);
      setSubmitted(true);
    }
  };
  const resetForm = () => {
    setStep(1);
    setCheckType(null);
    setChecks({});
    setNotes('');
    setSupervisorName('');
    setSiteConducted('');
    setBuilder('');
    setAddress('');
    setWorkAreas({
      value: '',
      notes: [],
      media: []
    });
    setTasksThisShift({
      value: '',
      notes: [],
      media: []
    });
    setMachineryControls({
      value: '',
      notes: [],
      media: []
    });
    setSiteHazards({
      value: '',
      notes: [],
      media: []
    });
    setPermitsRequired({
      value: '',
      notes: [],
      media: []
    });
    setIsPlantEquipmentUsed(null);
    setHighRiskWorks(null);
    setWorksCoveredBySWMS(null);
    setHasSafetyIssues(null);
    setSafetyIssuesPreviousShift({
      value: '',
      notes: [],
      media: []
    });
    setTranslatorRequired(null);
    setTranslatorSignature(null);
    setTranslatorName('');
    setSigningTranslator(false);
    setSignatures(FORM_CONSTANTS.emptySignatures());
    setSubmitted(false);
  };
  if (submitted) {
    const signedCount = Object.values(signatures).filter(s => s !== null).length;
    return /*#__PURE__*/React.createElement("div", {
      className: "text-center py-12"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl"
    }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold text-gray-800 mb-2"
    }, isEditing ? 'Pre-Start Updated!' : 'Pre-Start Complete!'), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 mb-2"
    }, isEditing ? 'Your changes have been saved.' : 'Your checklist has been recorded.'), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-500 mb-6"
    }, signedCount, " worker(s) signed on"), /*#__PURE__*/React.createElement("button", {
      onClick: resetForm,
      className: "bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
    }, isEditing ? 'Back to Dashboard' : 'Start Another Check'));
  }

  // Function to load data from a previous prestart
  const loadFromPrevious = previousForm => {
    const data = previousForm.data;

    // Set checklist type and move to step 2
    setCheckType(data.type);

    // Copy site details
    setSupervisorName(data.supervisorName || '');
    setSiteConducted(data.siteConducted || '');
    setBuilder(data.builder || '');
    setAddress(data.address || '');

    // Copy work context fields (with media)
    setWorkAreas(ensureMediaStructure(data.workAreas));
    setTasksThisShift(ensureMediaStructure(data.tasksThisShift));
    setMachineryControls(ensureMediaStructure(data.machineryControls));
    setSiteHazards(ensureMediaStructure(data.siteHazards));
    setPermitsRequired(ensureMediaStructure(data.permitsRequired));

    // Copy yes/no fields
    setIsPlantEquipmentUsed(data.isPlantEquipmentUsed ?? null);
    setHighRiskWorks(data.highRiskWorks ?? null);
    setWorksCoveredBySWMS(data.worksCoveredBySWMS ?? null);

    // Copy checklist checks
    setChecks(data.checks || {});

    // Reset fields that should be fresh for new form
    setFormDate(new Date()); // Current date/time
    setHasSafetyIssues(null); // Reset safety issues question
    setSafetyIssuesPreviousShift({
      value: '',
      notes: [],
      media: []
    }); // Clear safety issues
    setNotes(''); // Clear notes
    setTranslatorRequired(null);
    setTranslatorSignature(null);
    setTranslatorName('');
    setSignatures(FORM_CONSTANTS.emptySignatures()); // Clear all signatures

    // Close modal and go to step 2
    setShowPreviousList(false);
    setStep(2);
  };
  if (step === 1) {
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, showPreviousList && /*#__PURE__*/React.createElement("div", {
      className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
    }, /*#__PURE__*/React.createElement("div", {
      className: "p-4 border-b flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "text-lg font-bold text-gray-800"
    }, "Load from Previous"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowPreviousList(false),
      className: "text-gray-500 text-xl"
    }, "\u2715")), /*#__PURE__*/React.createElement("div", {
      className: "overflow-y-auto flex-1 p-4"
    }, previousPrestarts.length === 0 ? /*#__PURE__*/React.createElement("div", {
      className: "text-center py-8 text-gray-500"
    }, /*#__PURE__*/React.createElement("p", null, "No previous prestarts found."), /*#__PURE__*/React.createElement("p", {
      className: "text-sm mt-2"
    }, "Complete a prestart first to use this feature.")) : /*#__PURE__*/React.createElement("div", {
      className: "space-y-3"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-gray-600 mb-3"
    }, "Select a previous prestart to copy. Signatures and date will be reset."), previousPrestarts.slice(0, 20).map(form => {
      const formDate = new Date(form.data.date || form.createdAt);
      const typeInfo = checklistTypes.find(t => t.id === form.data.type);
      return /*#__PURE__*/React.createElement("button", {
        key: form.id,
        onClick: () => loadFromPrevious(form),
        className: "w-full bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-xl p-4 text-left transition-colors"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-start gap-3"
      }, /*#__PURE__*/React.createElement("div", {
        className: `w-10 h-10 ${typeInfo?.color || 'bg-gray-500'} rounded-full flex items-center justify-center text-lg flex-shrink-0`
      }, typeInfo?.emoji || '📋'), /*#__PURE__*/React.createElement("div", {
        className: "flex-1 min-w-0"
      }, /*#__PURE__*/React.createElement("p", {
        className: "font-semibold text-gray-800 truncate"
      }, form.data.siteConducted || 'Unknown Site'), /*#__PURE__*/React.createElement("p", {
        className: "text-sm text-gray-600 truncate"
      }, typeInfo?.label || 'Pre-Start', " \u2022 ", form.data.builder || 'No builder'), /*#__PURE__*/React.createElement("p", {
        className: "text-xs text-gray-400 mt-1"
      }, formDate.toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })))));
    }))))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h2", {
      className: "text-xl font-bold text-gray-800 flex items-center gap-2"
    }, "\uD83D\uDCCB Pre-Start Checklists"), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-500 text-sm mt-1"
    }, "Select the type of pre-start check")), previousPrestarts.length > 0 && /*#__PURE__*/React.createElement("button", {
      onClick: () => setShowPreviousList(true),
      className: "w-full bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300 hover:border-blue-400 rounded-xl p-4 flex items-center justify-center gap-3 transition-colors"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-2xl"
    }, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("div", {
      className: "text-left"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-semibold text-blue-700"
    }, "Copy from Previous Prestart"), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-blue-600"
    }, "Same job, different day? Load previous details"))), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 gap-3"
    }, checklistTypes.map(type => /*#__PURE__*/React.createElement("button", {
      key: type.id,
      onClick: () => {
        setCheckType(type.id);
        setStep(2);
      },
      className: "bg-white rounded-xl p-4 shadow-sm flex flex-col items-center gap-3 hover:shadow-md"
    }, /*#__PURE__*/React.createElement("div", {
      className: `w-14 h-14 ${type.color} rounded-full flex items-center justify-center text-2xl`
    }, type.emoji), /*#__PURE__*/React.createElement("span", {
      className: "font-medium text-gray-700 text-center"
    }, type.label)))));
  }
  const items = checklistItems[checkType] || [];
  const allChecked = items.every(item => checks[item.id] !== undefined);
  const signedCount = Object.values(signatures).filter(s => s !== null).length;
  if (step === 2) {
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, signingWorker && /*#__PURE__*/React.createElement(SignaturePad, {
      name: signingWorker,
      onSave: data => {
        setSignatures({
          ...signatures,
          [signingWorker]: data
        });
        setSigningWorker(null);
      },
      onCancel: () => setSigningWorker(null)
    }), isEditing && /*#__PURE__*/React.createElement("div", {
      className: "bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-blue-600 text-xl"
    }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-blue-800 font-semibold"
    }, "Editing Mode"), /*#__PURE__*/React.createElement("p", {
      className: "text-blue-600 text-sm"
    }, "Modify this form and save your changes"))), /*#__PURE__*/React.createElement("div", {
      className: "bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-2"
    }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC5"), /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-lg"
    }, displayDate), /*#__PURE__*/React.createElement("span", {
      className: "text-sm opacity-80"
    }, "at ", displayTime)), isEditing && /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 mt-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "date",
      value: formDate.toISOString().split('T')[0],
      onChange: e => {
        const newDate = new Date(formDate);
        const [year, month, day] = e.target.value.split('-');
        newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
        setFormDate(newDate);
      },
      className: "flex-1 bg-white/20 text-white border border-white/30 rounded-lg p-2 text-sm"
    }), /*#__PURE__*/React.createElement("input", {
      type: "time",
      value: formDate.toTimeString().slice(0, 5),
      onChange: e => {
        const newDate = new Date(formDate);
        const [hours, minutes] = e.target.value.split(':');
        newDate.setHours(parseInt(hours), parseInt(minutes));
        setFormDate(newDate);
      },
      className: "bg-white/20 text-white border border-white/30 rounded-lg p-2 text-sm"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("h2", {
      className: "text-xl font-bold text-gray-800"
    }, checklistTypes.find(t => t.id === checkType)?.label), /*#__PURE__*/React.createElement("button", {
      onClick: () => setStep(1),
      className: "text-gray-500 text-xl"
    }, "\u2715"))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "font-semibold text-gray-800"
    }, "Site Details"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, "\uD83D\uDC64 Supervisor Name *"), /*#__PURE__*/React.createElement("select", {
      value: supervisorName,
      onChange: e => setSupervisorName(e.target.value),
      className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Select Supervisor"), FORM_CONSTANTS.supervisors.map(name => /*#__PURE__*/React.createElement("option", {
      key: name,
      value: name
    }, name)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, "Site Conducted *"), /*#__PURE__*/React.createElement("select", {
      value: siteConducted,
      onChange: e => setSiteConducted(e.target.value),
      className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Select Site"), sitesList.map(site => /*#__PURE__*/React.createElement("option", {
      key: site,
      value: site
    }, site)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, "Builder *"), /*#__PURE__*/React.createElement("select", {
      value: builder,
      onChange: e => setBuilder(e.target.value),
      className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
    }, /*#__PURE__*/React.createElement("option", {
      value: ""
    }, "Select Builder"), builders.map(b => /*#__PURE__*/React.createElement("option", {
      key: b,
      value: b
    }, b)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, "\uD83D\uDCCD Address *"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: address,
      onChange: e => setAddress(e.target.value),
      className: "flex-1 border border-gray-300 rounded-lg p-3",
      placeholder: "Enter site address"
    }), /*#__PURE__*/React.createElement("button", {
      onClick: getLocation,
      disabled: isLocating,
      className: "bg-blue-600 text-white px-4 rounded-lg disabled:bg-blue-400"
    }, isLocating ? '...' : '📍')))), /*#__PURE__*/React.createElement(NoteMediaBox, {
      label: "Work Areas",
      value: workAreas.value,
      notes: workAreas.notes,
      media: workAreas.media,
      siteName: siteConducted,
      onValueChange: val => setWorkAreas(prev => ({
        ...prev,
        value: val
      })),
      onAddNote: note => setWorkAreas(prev => ({
        ...prev,
        notes: [...prev.notes, note]
      })),
      onAddMedia: item => {
        console.log('Work Areas onAddMedia called with:', item?.name);
        setWorkAreas(prev => ({
          ...prev,
          media: [...prev.media, item]
        }));
      },
      onRemoveNote: idx => setWorkAreas(prev => ({
        ...prev,
        notes: prev.notes.filter((_, i) => i !== idx)
      })),
      onRemoveMedia: idx => setWorkAreas(prev => ({
        ...prev,
        media: prev.media.filter((_, i) => i !== idx)
      }))
    }), /*#__PURE__*/React.createElement(NoteMediaBox, {
      label: "Task to be Completed this Shift",
      value: tasksThisShift.value,
      notes: tasksThisShift.notes,
      media: tasksThisShift.media,
      siteName: siteConducted,
      onValueChange: val => setTasksThisShift(prev => ({
        ...prev,
        value: val
      })),
      onAddNote: note => setTasksThisShift(prev => ({
        ...prev,
        notes: [...prev.notes, note]
      })),
      onAddMedia: item => {
        console.log('Tasks onAddMedia called with:', item?.name);
        setTasksThisShift(prev => ({
          ...prev,
          media: [...prev.media, item]
        }));
      },
      onRemoveNote: idx => setTasksThisShift(prev => ({
        ...prev,
        notes: prev.notes.filter((_, i) => i !== idx)
      })),
      onRemoveMedia: idx => setTasksThisShift(prev => ({
        ...prev,
        media: prev.media.filter((_, i) => i !== idx)
      }))
    }), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 mb-3"
    }, "\uD83D\uDE9C Is Plant/Equipment to be used?"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setIsPlantEquipmentUsed(true),
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${isPlantEquipmentUsed === true ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "Yes"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setIsPlantEquipmentUsed(false),
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${isPlantEquipmentUsed === false ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "No"))), isPlantEquipmentUsed === true && /*#__PURE__*/React.createElement(NoteMediaBox, {
      label: "Controls Required for Machinery / Plants",
      value: machineryControls.value,
      notes: machineryControls.notes,
      media: machineryControls.media,
      siteName: siteConducted,
      onValueChange: val => setMachineryControls(prev => ({
        ...prev,
        value: val
      })),
      onAddNote: note => setMachineryControls(prev => ({
        ...prev,
        notes: [...prev.notes, note]
      })),
      onAddMedia: item => {
        console.log('Machinery onAddMedia called with:', item?.name);
        setMachineryControls(prev => ({
          ...prev,
          media: [...prev.media, item]
        }));
      },
      onRemoveNote: idx => setMachineryControls(prev => ({
        ...prev,
        notes: prev.notes.filter((_, i) => i !== idx)
      })),
      onRemoveMedia: idx => setMachineryControls(prev => ({
        ...prev,
        media: prev.media.filter((_, i) => i !== idx)
      }))
    }), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 text-orange-600 mb-3"
    }, "Site Specific Hazards"), /*#__PURE__*/React.createElement("textarea", {
      value: siteHazards.value,
      onChange: e => setSiteHazards(prev => ({
        ...prev,
        value: e.target.value
      })),
      className: "w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]",
      placeholder: "Enter site specific hazards..."
    })), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 text-orange-600 mb-3"
    }, "Site Specific Permits Required"), /*#__PURE__*/React.createElement("textarea", {
      value: permitsRequired.value,
      onChange: e => setPermitsRequired(prev => ({
        ...prev,
        value: e.target.value
      })),
      className: "w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]",
      placeholder: "Enter permits required..."
    })), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 mb-3"
    }, "\u26A0\uFE0F High Risk Works?"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setHighRiskWorks('yes'),
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${highRiskWorks === 'yes' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "Yes"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setHighRiskWorks('no'),
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${highRiskWorks === 'no' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "No"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setHighRiskWorks('na'),
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${highRiskWorks === 'na' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "N/A"))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 mb-3"
    }, "\uD83D\uDCCB Works performed are covered by SWMS?"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setWorksCoveredBySWMS('yes'),
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${worksCoveredBySWMS === 'yes' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "Yes"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setWorksCoveredBySWMS('no'),
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${worksCoveredBySWMS === 'no' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "No"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setWorksCoveredBySWMS('na'),
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${worksCoveredBySWMS === 'na' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "N/A"))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 mb-3"
    }, "\u26A0\uFE0F Safety Issues/Incidents from Previous Shift or Industry Safety Notices?"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setHasSafetyIssues(true),
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${hasSafetyIssues === true ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "Yes"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setHasSafetyIssues(false);
        setSafetyIssuesPreviousShift({
          value: '',
          notes: [],
          media: []
        });
      },
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${hasSafetyIssues === false ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "No"))), hasSafetyIssues === true && /*#__PURE__*/React.createElement(NoteMediaBox, {
      label: "Safety Issues/Incidents Details",
      value: safetyIssuesPreviousShift.value,
      notes: safetyIssuesPreviousShift.notes,
      media: safetyIssuesPreviousShift.media,
      siteName: siteConducted,
      onValueChange: val => setSafetyIssuesPreviousShift(prev => ({
        ...prev,
        value: val
      })),
      onAddNote: note => setSafetyIssuesPreviousShift(prev => ({
        ...prev,
        notes: [...prev.notes, note]
      })),
      onAddMedia: item => {
        console.log('Safety Issues onAddMedia called with:', item?.name);
        setSafetyIssuesPreviousShift(prev => ({
          ...prev,
          media: [...prev.media, item]
        }));
      },
      onRemoveNote: idx => setSafetyIssuesPreviousShift(prev => ({
        ...prev,
        notes: prev.notes.filter((_, i) => i !== idx)
      })),
      onRemoveMedia: idx => setSafetyIssuesPreviousShift(prev => ({
        ...prev,
        media: prev.media.filter((_, i) => i !== idx)
      }))
    }), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl shadow-sm divide-y"
    }, items.map((item, idx) => /*#__PURE__*/React.createElement("div", {
      key: item.id,
      className: "p-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-gray-700"
    }, idx + 1, ". ", item.text), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setChecks({
        ...checks,
        [item.id]: true
      }),
      className: `w-10 h-10 rounded-lg flex items-center justify-center border-2 ${checks[item.id] === true ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`
    }, "\u2713"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setChecks({
        ...checks,
        [item.id]: false
      }),
      className: `w-10 h-10 rounded-lg flex items-center justify-center border-2 ${checks[item.id] === false ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300'}`
    }, "\u2715")))))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, "Notes / Issues"), /*#__PURE__*/React.createElement("textarea", {
      value: notes,
      onChange: e => setNotes(e.target.value),
      className: "w-full border border-gray-300 rounded-lg p-3",
      rows: 3,
      placeholder: "Record any issues..."
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => setStep(3),
      disabled: !allChecked || !supervisorName || !siteConducted || !builder || !address,
      className: "w-full bg-orange-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
    }, "Next: Worker Sign-On \u2192"));
  }
  if (step === 3) {
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, signingWorker && /*#__PURE__*/React.createElement(SignaturePad, {
      name: signingWorker,
      onSave: data => {
        setSignatures({
          ...signatures,
          [signingWorker]: data
        });
        setSigningWorker(null);
      },
      onCancel: () => setSigningWorker(null)
    }), signingTranslator && /*#__PURE__*/React.createElement(SignaturePad, {
      name: translatorName || "Translator",
      onSave: data => {
        setTranslatorSignature(data);
        setSigningTranslator(false);
      },
      onCancel: () => setSigningTranslator(false)
    }), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("h2", {
      className: "text-xl font-bold text-gray-800"
    }, "Worker Sign-On"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setStep(2),
      className: "text-gray-500"
    }, "\u2190 Back")), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-500 text-sm mt-1"
    }, "Tap on a signature box to sign")), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl p-4 shadow-sm"
    }, /*#__PURE__*/React.createElement("h4", {
      className: "font-semibold text-gray-800 mb-3"
    }, "\uD83C\uDF10 Translator Required?"), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3 mb-4"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setTranslatorRequired(true),
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${translatorRequired === true ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "Yes"), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setTranslatorRequired(false);
        setTranslatorSignature(null);
        setTranslatorName('');
      },
      className: `flex-1 py-3 rounded-lg font-medium border-2 ${translatorRequired === false ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`
    }, "No")), translatorRequired === true && /*#__PURE__*/React.createElement("div", {
      className: "border-t pt-4 space-y-3"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, "Translator Name *"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      value: translatorName,
      onChange: e => setTranslatorName(e.target.value),
      className: "w-full border border-gray-300 rounded-lg p-3",
      placeholder: "Enter translator name"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-medium text-gray-700 mb-2"
    }, "Translator Signature *"), translatorSignature ? /*#__PURE__*/React.createElement("div", {
      className: "relative inline-block"
    }, /*#__PURE__*/React.createElement("div", {
      className: "border-2 border-green-500 rounded-lg p-2 bg-green-50 h-20 w-40"
    }, /*#__PURE__*/React.createElement("img", {
      src: translatorSignature,
      alt: "translator signature",
      className: "h-full w-full object-contain"
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => setTranslatorSignature(null),
      className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
    }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
      onClick: () => setSigningTranslator(true),
      className: "h-20 w-40 border-2 border-dashed border-blue-300 rounded-lg text-blue-500 hover:border-blue-500"
    }, "Tap to sign")))), /*#__PURE__*/React.createElement("div", {
      className: "bg-white rounded-xl shadow-sm divide-y"
    }, teamMembers.map(name => /*#__PURE__*/React.createElement("div", {
      key: name,
      className: "p-4 flex items-center justify-between"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-medium text-gray-800"
    }, name), signatures[name] ? /*#__PURE__*/React.createElement("div", {
      className: "relative"
    }, /*#__PURE__*/React.createElement("div", {
      className: "border-2 border-green-500 rounded-lg p-2 bg-green-50 h-16 w-32"
    }, /*#__PURE__*/React.createElement("img", {
      src: signatures[name],
      alt: "signature",
      className: "h-full w-full object-contain"
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => setSignatures({
        ...signatures,
        [name]: null
      }),
      className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
    }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
      onClick: () => setSigningWorker(name),
      className: "h-16 w-32 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-orange-500"
    }, "Tap to sign")))), /*#__PURE__*/React.createElement("div", {
      className: "bg-blue-50 border border-blue-200 rounded-xl p-4"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-blue-800 font-medium"
    }, signedCount, " of ", teamMembers.length, " workers signed")), validationErrors.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "bg-red-50 border border-red-300 rounded-xl p-4"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-red-800 font-semibold mb-2"
    }, "\u26A0\uFE0F Cannot submit - please fix these issues:"), /*#__PURE__*/React.createElement("ul", {
      className: "text-red-700 text-sm space-y-1"
    }, validationErrors.map((err, i) => /*#__PURE__*/React.createElement("li", {
      key: i
    }, "\u2022 ", err)))), /*#__PURE__*/React.createElement("div", {
      className: "flex gap-3"
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setValidationErrors([]);
        setStep(2);
      },
      className: "flex-1 border border-gray-300 text-gray-700 py-4 rounded-xl font-semibold"
    }, "\u2190 Back"), /*#__PURE__*/React.createElement("button", {
      onClick: handleSubmit,
      className: "flex-1 bg-green-600 text-white py-4 rounded-xl font-semibold"
    }, isEditing ? '✓ Update Pre-Start' : '✓ Complete Pre-Start')));
  }
  return null;
}

// Incident View
window.PrestartView = PrestartView;

// === js/components/form-incident.jsx ===
// IncidentView Component
// Extracted from forms.jsx

function IncidentView({
  onSubmit,
  onUpdate,
  editingForm
}) {
  const isEditing = !!editingForm;
  const editData = editingForm?.data || {};
  const [step, setStep] = useState(isEditing ? 2 : 1);
  const [formData, setFormData] = useState({
    type: editData.type || '',
    date: editData.date || new Date().toISOString().split('T')[0],
    time: editData.time || new Date().toTimeString().slice(0, 5),
    location: editData.location || '',
    description: editData.description || '',
    injuries: editData.injuries || 'none',
    injuryDetails: editData.injuryDetails || '',
    witnesses: editData.witnesses || '',
    immediateActions: editData.immediateActions || '',
    reportedBy: editData.reportedBy || ''
  });
  const [reporterSignature, setReporterSignature] = useState(editData.reporterSignature || null);
  const [signingReporter, setSigningReporter] = useState(false);
  const [validationError, setValidationError] = useState('');
  const incidentTypes = [{
    id: 'nearmiss',
    label: 'Near Miss',
    description: 'Could have caused injury',
    color: 'bg-yellow-500'
  }, {
    id: 'injury',
    label: 'Injury',
    description: 'Resulted in injury',
    color: 'bg-red-500'
  }, {
    id: 'damage',
    label: 'Property Damage',
    description: 'Equipment/property damage',
    color: 'bg-orange-500'
  }, {
    id: 'environmental',
    label: 'Environmental',
    description: 'Spill/leak/environmental',
    color: 'bg-green-500'
  }];
  useEffect(() => {
    const data = editingForm?.data || {};
    setStep(editingForm ? 2 : 1);
    setFormData({
      type: data.type || '',
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || new Date().toTimeString().slice(0, 5),
      location: data.location || '',
      description: data.description || '',
      injuries: data.injuries || 'none',
      injuryDetails: data.injuryDetails || '',
      witnesses: data.witnesses || '',
      immediateActions: data.immediateActions || '',
      reportedBy: data.reportedBy || ''
    });
    setReporterSignature(data.reporterSignature || null);
    setSigningReporter(false);
    setValidationError('');
  }, [editingForm?.id]);
  const handleIncidentSubmit = () => {
    // Use centralized validator for comprehensive WHS-compliant checks
    const validationData = {
      ...formData,
      reporterSignature,
      incidentType: formData.type,
      incidentDate: formData.date,
      incidentTime: formData.time
    };
    const errors = window.formValidator ? window.formValidator.validateIncident(validationData) : [];
    if (errors.length > 0) {
      setValidationError(errors.join('. '));
      return;
    }
    setValidationError('');
    const submitData = {
      ...formData,
      reporterSignature
    };
    if (isEditing && onUpdate) {
      onUpdate(editingForm.id, 'incident', submitData);
    } else {
      onSubmit(submitData);
      setStep(4);
    }
  };
  const isNotifiable = formData.type === 'injury' || formData.type === 'damage' && formData.description && formData.description.toLowerCase().match(/collapse|fall|electr|explos|gas|chemical|asbestos|confined|trench/);
  if (step === 4) {
    return /*#__PURE__*/React.createElement("div", {
      className: "text-center py-12"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl"
    }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold text-gray-800 mb-2"
    }, isEditing ? 'Report Updated!' : 'Report Submitted!'), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 mb-6"
    }, "Reference: INC-", Date.now().toString().slice(-6)), isNotifiable && /*#__PURE__*/React.createElement("div", {
      className: "bg-red-50 border-2 border-red-400 rounded-xl p-4 mx-4 mb-6 text-left"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-2xl"
    }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
      className: "font-bold text-red-800 text-lg"
    }, "Possible Notifiable Incident"), /*#__PURE__*/React.createElement("p", {
      className: "text-red-700 text-sm mt-1"
    }, "Under the WHS Act 2011, serious injuries, dangerous incidents, and deaths must be reported to SafeWork NSW immediately."), /*#__PURE__*/React.createElement("div", {
      className: "mt-3 space-y-1 text-sm text-red-800"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-semibold"
    }, "You must:"), /*#__PURE__*/React.createElement("p", null, "1. Call SafeWork NSW: ", /*#__PURE__*/React.createElement("a", {
      href: "tel:131050",
      className: "underline font-bold"
    }, "13 10 50")), /*#__PURE__*/React.createElement("p", null, "2. Preserve the scene (do not disturb unless preventing further injury)"), /*#__PURE__*/React.createElement("p", null, "3. Written notification within 48 hours"))))), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setStep(1);
        setFormData({
          type: '',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          location: '',
          description: '',
          injuries: 'none',
          injuryDetails: '',
          witnesses: '',
          immediateActions: '',
          reportedBy: ''
        });
        setReporterSignature(null);
        setValidationError('');
      },
      className: "bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
    }, "Submit Another"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800 flex items-center gap-2"
  }, "\u26A0\uFE0F Incident / Near Miss Report"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 text-sm mt-1"
  }, "Report all incidents within 24 hours")), isEditing && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 text-xl"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-800 font-semibold"
  }, "Editing Mode"), /*#__PURE__*/React.createElement("p", {
    className: "text-blue-600 text-sm"
  }, "Modify this report and save your changes"))), step === 1 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, incidentTypes.map(type => /*#__PURE__*/React.createElement("button", {
    key: type.id,
    onClick: () => {
      setFormData({
        ...formData,
        type: type.id
      });
      setStep(2);
    },
    className: "w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-12 h-12 ${type.color} rounded-full flex items-center justify-center text-white text-xl`
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("div", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-800"
  }, type.label), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, type.description))))), step === 2 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "Incident Details"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Date *"), /*#__PURE__*/React.createElement("input", {
    type: "date",
    value: formData.date,
    onChange: e => setFormData({
      ...formData,
      date: e.target.value
    }),
    className: "w-full border rounded-lg p-3"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Time *"), /*#__PURE__*/React.createElement("input", {
    type: "time",
    value: formData.time,
    onChange: e => setFormData({
      ...formData,
      time: e.target.value
    }),
    className: "w-full border rounded-lg p-3"
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Location *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.location,
    onChange: e => setFormData({
      ...formData,
      location: e.target.value
    }),
    className: "w-full border rounded-lg p-3",
    placeholder: "Where did this occur?"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Description *"), /*#__PURE__*/React.createElement("textarea", {
    value: formData.description,
    onChange: e => setFormData({
      ...formData,
      description: e.target.value
    }),
    className: "w-full border rounded-lg p-3",
    rows: 4,
    placeholder: "Describe what happened..."
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(1),
    className: "flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg"
  }, "Back"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(3),
    disabled: !formData.location || !formData.description,
    className: "flex-1 bg-orange-600 text-white py-3 rounded-lg disabled:bg-gray-300"
  }, "Next"))), step === 3 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "Additional Information"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Reported By *"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.reportedBy,
    onChange: e => setFormData({
      ...formData,
      reportedBy: e.target.value
    }),
    className: "w-full border rounded-lg p-3",
    placeholder: "Your name"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Witnesses (if any)"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: formData.witnesses,
    onChange: e => setFormData({
      ...formData,
      witnesses: e.target.value
    }),
    className: "w-full border rounded-lg p-3",
    placeholder: "Names of any witnesses"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Immediate Actions Taken *"), /*#__PURE__*/React.createElement("textarea", {
    value: formData.immediateActions,
    onChange: e => setFormData({
      ...formData,
      immediateActions: e.target.value
    }),
    className: "w-full border rounded-lg p-3",
    rows: 3,
    placeholder: "What actions were taken immediately after the incident?"
  })), /*#__PURE__*/React.createElement("div", {
    className: "border-t pt-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Reporter Signature * ", /*#__PURE__*/React.createElement("span", {
    className: "text-red-500 text-xs"
  }, "(Required for submission)")), reporterSignature ? /*#__PURE__*/React.createElement("div", {
    className: "relative inline-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-green-500 rounded-lg p-2 bg-green-50"
  }, /*#__PURE__*/React.createElement("img", {
    src: reporterSignature,
    alt: "signature",
    className: "h-16 object-contain"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setReporterSignature(null),
    className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
  }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSigningReporter(true),
    className: "w-full h-20 border-2 border-dashed border-red-300 rounded-lg text-red-500 hover:border-red-500 bg-red-50 font-medium"
  }, "\u270D\uFE0F Tap to Sign (Required)")), validationError && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-300 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-700 text-sm"
  }, "\u26A0\uFE0F ", validationError)), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setValidationError('');
      setStep(2);
    },
    className: "flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg"
  }, "Back"), /*#__PURE__*/React.createElement("button", {
    onClick: handleIncidentSubmit,
    className: "flex-1 bg-red-600 text-white py-3 rounded-lg"
  }, "Submit Report"))), signingReporter && /*#__PURE__*/React.createElement(SignaturePad, {
    name: formData.reportedBy || "Reporter",
    onSave: sig => {
      setReporterSignature(sig);
      setSigningReporter(false);
    },
    onCancel: () => setSigningReporter(false)
  }));
}

// Toolbox View
window.IncidentView = IncidentView;

// === js/components/form-toolbox.jsx ===
// ToolboxView Component
// Extracted from forms.jsx

function ToolboxView({
  onSubmit,
  onUpdate,
  editingForm,
  sites = []
}) {
  const isEditing = !!editingForm;
  const editData = editingForm?.data || {};
  const [step, setStep] = useState(isEditing ? 2 : 1);
  const [signingWorker, setSigningWorker] = useState(null);
  const [siteConducted, setSiteConducted] = useState(editData.siteConducted || '');
  const [builder, setBuilder] = useState(editData.builder || '');
  const [address, setAddress] = useState(editData.address || '');
  const [isLocating, setIsLocating] = useState(false);
  const [preparedBy, setPreparedBy] = useState(editData.preparedBy || '');
  const [selectedTopics, setSelectedTopics] = useState(editData.topics || []);
  const [otherTopic, setOtherTopic] = useState(editData.otherTopic || '');
  const [correctiveAction, setCorrectiveAction] = useState(editData.correctiveAction || '');
  const [feedbackResponses, setFeedbackResponses] = useState(editData.feedbackResponses || '');
  const [signatures, setSignatures] = useState(editData.signatures || FORM_CONSTANTS.emptySignatures());
  const [validationErrors, setValidationErrors] = useState([]);
  const todayDate = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const teamMembers = FORM_CONSTANTS.teamMembers;
  const preparers = FORM_CONSTANTS.supervisors;
  const builders = FORM_CONSTANTS.builders;
  const sitesList = [...new Set((sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string'))];
  const topics = ['Manual Handling', 'Working at Heights', 'Hot Work Safety', 'PPE Requirements', 'Emergency Procedures', 'Electrical Safety', 'Housekeeping', 'Slips, Trips & Falls', 'Fire Safety', 'First Aid', 'Hazard Identification', 'Risk Assessment', 'Confined Spaces', 'Scaffolding Safety', 'Crane & Lifting Operations', 'Welding Safety', 'Chemical Handling', 'Noise & Hearing Protection', 'Sun & Heat Safety', 'Mental Health & Wellbeing', 'Tool Safety', 'Mobile Plant Safety', 'Traffic Management', 'Asbestos Awareness', 'Lock Out Tag Out (LOTO)', 'Incident Reporting', 'Near Miss Reporting', 'Safe Work Method Statements (SWMS)'];
  const signedCount = Object.values(signatures).filter(s => s !== null).length;
  const toggleTopic = topic => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };
  useEffect(() => {
    const data = editingForm?.data || {};
    setStep(editingForm ? 2 : 1);
    setSiteConducted(data.siteConducted || '');
    setBuilder(data.builder || '');
    setAddress(data.address || '');
    setPreparedBy(data.preparedBy || '');
    setSelectedTopics(data.topics || []);
    setOtherTopic(data.otherTopic || '');
    setCorrectiveAction(data.correctiveAction || '');
    setFeedbackResponses(data.feedbackResponses || '');
    setSignatures(data.signatures || FORM_CONSTANTS.emptySignatures());
    setValidationErrors([]);
  }, [editingForm?.id]);
  const getLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          const data = await response.json();
          setAddress(data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`);
        } catch (e) {
          setAddress(`${position.coords.latitude}, ${position.coords.longitude}`);
        }
        setIsLocating(false);
      }, () => {
        ToastNotifier.error('Unable to get location');
        setIsLocating(false);
      }, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    } else {
      setIsLocating(false);
    }
  };
  const handleSubmit = () => {
    let errors = [];
    if (window.formValidator) {
      errors = window.formValidator.validateToolbox({
        siteConducted,
        preparedBy,
        topics: selectedTopics,
        signatures
      });
    } else {
      if (!siteConducted) errors.push('Site/Location is required');
      if (!preparedBy) errors.push('Prepared by is required');
    }
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    const submitData = {
      siteConducted,
      builder,
      address,
      preparedBy,
      topics: selectedTopics,
      otherTopic,
      correctiveAction,
      feedbackResponses,
      signatures,
      date: new Date().toISOString()
    };
    if (isEditing && onUpdate) {
      onUpdate(editingForm.id, 'toolbox', submitData);
    } else {
      onSubmit(submitData);
      setStep(3);
    }
  };
  const resetForm = () => {
    setStep(1);
    setSiteConducted('');
    setBuilder('');
    setAddress('');
    setPreparedBy('');
    setSelectedTopics([]);
    setOtherTopic('');
    setCorrectiveAction('');
    setFeedbackResponses('');
    setSignatures(FORM_CONSTANTS.emptySignatures());
  };
  if (step === 3) {
    return /*#__PURE__*/React.createElement("div", {
      className: "text-center py-12"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl"
    }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold text-gray-800 mb-2"
    }, isEditing ? 'Toolbox Talk Updated!' : 'Toolbox Talk Recorded!'), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 mb-6"
    }, signedCount, " attendees signed on"), /*#__PURE__*/React.createElement("button", {
      onClick: resetForm,
      className: "bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
    }, "Record Another"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, signingWorker && /*#__PURE__*/React.createElement(SignaturePad, {
    name: signingWorker,
    onSave: data => {
      setSignatures({
        ...signatures,
        [signingWorker]: data
      });
      setSigningWorker(null);
    },
    onCancel: () => setSigningWorker(null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC5"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-lg"
  }, todayDate))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800 flex items-center gap-2"
  }, "\uD83D\uDC65 Toolbox Talk"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 text-sm mt-1"
  }, "Daily safety briefing record")), isEditing && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 text-xl"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-800 font-semibold"
  }, "Editing Mode"), /*#__PURE__*/React.createElement("p", {
    className: "text-blue-600 text-sm"
  }, "Modify this toolbox talk and save your changes"))), step === 1 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "Site Details"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Site Conducted *"), /*#__PURE__*/React.createElement("select", {
    value: siteConducted,
    onChange: e => setSiteConducted(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Site"), sitesList.map(site => /*#__PURE__*/React.createElement("option", {
    key: site,
    value: site
  }, site)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Builder *"), /*#__PURE__*/React.createElement("select", {
    value: builder,
    onChange: e => setBuilder(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Builder"), builders.map(b => /*#__PURE__*/React.createElement("option", {
    key: b,
    value: b
  }, b)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "\uD83D\uDCCD Site Address *"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: address,
    onChange: e => setAddress(e.target.value),
    className: "flex-1 border border-gray-300 rounded-lg p-3",
    placeholder: "Enter site address"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: getLocation,
    disabled: isLocating,
    className: "bg-blue-600 text-white px-4 rounded-lg disabled:bg-blue-400"
  }, isLocating ? '...' : '📍'))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Prepared By *"), /*#__PURE__*/React.createElement("select", {
    value: preparedBy,
    onChange: e => setPreparedBy(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Preparer"), preparers.map(p => /*#__PURE__*/React.createElement("option", {
    key: p,
    value: p
  }, p))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3"
  }, "\uD83D\uDCCB Topics Discussed"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500 mb-3"
  }, "Select all topics covered in this toolbox talk"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2"
  }, topics.map(topic => /*#__PURE__*/React.createElement("button", {
    key: topic,
    onClick: () => toggleTopic(topic),
    className: `p-2 rounded-lg text-sm text-left border-2 ${selectedTopics.includes(topic) ? 'bg-purple-100 border-purple-500 text-purple-700' : 'border-gray-200 text-gray-700'}`
  }, selectedTopics.includes(topic) ? '✓ ' : '', topic))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Other Topics"), /*#__PURE__*/React.createElement("textarea", {
    value: otherTopic,
    onChange: e => setOtherTopic(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 text-sm",
    rows: 2,
    placeholder: "Enter any other topics discussed..."
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-gray-800 text-orange-600 mb-3"
  }, "Corrective Action Required"), /*#__PURE__*/React.createElement("textarea", {
    value: correctiveAction,
    onChange: e => setCorrectiveAction(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]",
    placeholder: "Enter any corrective actions required..."
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-gray-800 text-orange-600 mb-3"
  }, "Feedback and Responses"), /*#__PURE__*/React.createElement("textarea", {
    value: feedbackResponses,
    onChange: e => setFeedbackResponses(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]",
    placeholder: "Enter feedback and responses from attendees..."
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(2),
    disabled: !siteConducted || !builder || !address || !preparedBy || selectedTopics.length === 0,
    className: "w-full bg-orange-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
  }, "Next: Attendance & Signatures \u2192")), step === 2 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800"
  }, "Attendance & Signatures"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(1),
    className: "text-gray-500"
  }, "\u2190 Back")), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 text-sm mt-1"
  }, "Tap on a signature box to sign")), /*#__PURE__*/React.createElement("div", {
    className: "bg-purple-50 border border-purple-200 rounded-xl p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-purple-800"
  }, /*#__PURE__*/React.createElement("strong", null, "Topics:"), " ", selectedTopics.join(', ')), otherTopic && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-purple-800 mt-1"
  }, /*#__PURE__*/React.createElement("strong", null, "Other:"), " ", otherTopic)), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm divide-y"
  }, teamMembers.map(name => /*#__PURE__*/React.createElement("div", {
    key: name,
    className: "p-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium text-gray-800"
  }, name), signatures[name] ? /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-green-500 rounded-lg p-2 bg-green-50 h-16 w-32"
  }, /*#__PURE__*/React.createElement("img", {
    src: signatures[name],
    alt: "signature",
    className: "h-full w-full object-contain"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setSignatures({
      ...signatures,
      [name]: null
    }),
    className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
  }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSigningWorker(name),
    className: "h-16 w-32 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-500"
  }, "Tap to sign")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-800 font-medium"
  }, signedCount, " of ", teamMembers.length, " attendees signed")), validationErrors.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-800 font-semibold mb-2"
  }, "Please fix the following:"), validationErrors.map((e, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-red-700 text-sm"
  }, "\u2022 ", e))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(1),
    className: "flex-1 border border-gray-300 text-gray-700 py-4 rounded-xl font-semibold"
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    disabled: signedCount === 0,
    className: "flex-1 bg-green-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
  }, "\u2713 Complete Toolbox Talk"))));
}

// Subcontractor Site Inspection View
window.ToolboxView = ToolboxView;

// === js/components/form-inspection.jsx ===
// SubcontractorInspectionView Component
// Extracted from forms.jsx

function SubcontractorInspectionView({
  onSubmit,
  onUpdate,
  editingForm,
  sites = []
}) {
  const isEditing = !!editingForm;
  const editData = editingForm?.data || {};
  const defaultInspectionItems = {
    siteBoxes: null,
    electricalLeads: null,
    toolsRetagging: null,
    exclusionZones: null,
    permitsCompleted: null,
    permitsActive: null,
    penetrationsCovered: null,
    equipmentInspection: null,
    workerSafetyConcerns: null,
    builderRequests: null
  };
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [siteConducted, setSiteConducted] = useState(editData.siteConducted || '');
  const [preparedBy, setPreparedBy] = useState(editData.preparedBy || '');
  const [location, setLocation] = useState(editData.location || '');
  const [isLocating, setIsLocating] = useState(false);
  const [completedBy, setCompletedBy] = useState(editData.completedBy || '');
  const [completedBySignature, setCompletedBySignature] = useState(editData.completedBySignature || null);
  const [signingInspector, setSigningInspector] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Inspection items with Yes/No/N/A
  const [inspectionItems, setInspectionItems] = useState(editData.inspectionItems || defaultInspectionItems);
  const todayDate = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const preparers = FORM_CONSTANTS.supervisors;
  const inspectors = ['Scott Seeho', 'Davide Casolini'];
  const sitesList = [...new Set((sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string'))];
  useEffect(() => {
    const data = editingForm?.data || {};
    setSiteConducted(data.siteConducted || '');
    setPreparedBy(data.preparedBy || '');
    setLocation(data.location || '');
    setCompletedBy(data.completedBy || '');
    setCompletedBySignature(data.completedBySignature || null);
    setInspectionItems(data.inspectionItems || defaultInspectionItems);
    setSubmitted(false);
    setValidationErrors([]);
  }, [editingForm?.id]);
  const inspectionQuestions = [{
    id: 'siteBoxes',
    text: 'Site boxes in good condition and lockable'
  }, {
    id: 'electricalLeads',
    text: 'Electrical leads and tools are tagged and tested up to date'
  }, {
    id: 'toolsRetagging',
    text: 'Tools or Equipment needed retagging or testing soon'
  }, {
    id: 'exclusionZones',
    text: 'Exclusion zones set up around work areas (as required)'
  }, {
    id: 'permitsCompleted',
    text: 'Permits are completed (as required)'
  }, {
    id: 'permitsActive',
    text: 'Permits Active during inspection'
  }, {
    id: 'penetrationsCovered',
    text: 'Penetrations are covered or have barriers around them'
  }, {
    id: 'equipmentInspection',
    text: 'Equipment onsite has recent inspection completed'
  }, {
    id: 'workerSafetyConcerns',
    text: 'Any worker reports of safety concerns or improvements'
  }, {
    id: 'builderRequests',
    text: 'Any request from Builder'
  }];
  const getLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          const data = await response.json();
          setLocation(data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`);
        } catch (e) {
          setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
        }
        setIsLocating(false);
      }, () => {
        ToastNotifier.error('Unable to get location');
        setIsLocating(false);
      }, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    } else {
      setIsLocating(false);
    }
  };
  const setInspectionValue = (id, value) => {
    setInspectionItems({
      ...inspectionItems,
      [id]: value
    });
  };
  const allAnswered = Object.values(inspectionItems).every(v => v !== null);
  const handleSubmit = () => {
    let errors = [];
    if (window.formValidator) {
      errors = window.formValidator.validateInspection({
        siteConducted,
        preparedBy,
        completedBy,
        inspectionItems
      });
    } else {
      if (!siteConducted) errors.push('Site/Location is required');
      if (!preparedBy) errors.push('Prepared by is required');
      if (!completedBy) errors.push('Completed by is required');
    }
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    const submitData = {
      siteConducted,
      preparedBy,
      location,
      completedBy,
      completedBySignature,
      inspectionItems,
      date: new Date().toISOString()
    };
    if (isEditing && onUpdate) {
      onUpdate(editingForm.id, 'inspection', submitData);
    } else {
      onSubmit(submitData);
      setSubmitted(true);
    }
  };
  const resetForm = () => {
    setSiteConducted('');
    setPreparedBy('');
    setLocation('');
    setCompletedBy('');
    setCompletedBySignature(null);
    setSigningInspector(false);
    setInspectionItems({
      siteBoxes: null,
      electricalLeads: null,
      toolsRetagging: null,
      exclusionZones: null,
      permitsCompleted: null,
      permitsActive: null,
      penetrationsCovered: null,
      equipmentInspection: null,
      workerSafetyConcerns: null,
      builderRequests: null
    });
    setSubmitted(false);
  };
  if (submitted) {
    return /*#__PURE__*/React.createElement("div", {
      className: "text-center py-12"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl"
    }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold text-gray-800 mb-2"
    }, isEditing ? 'Inspection Updated!' : 'Inspection Complete!'), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 mb-6"
    }, isEditing ? 'Your changes have been saved.' : 'Site inspection has been recorded.'), /*#__PURE__*/React.createElement("button", {
      onClick: resetForm,
      className: "bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
    }, "Start Another Inspection"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, signingInspector && /*#__PURE__*/React.createElement(SignaturePad, {
    name: completedBy || "Inspector",
    onSave: data => {
      setCompletedBySignature(data);
      setSigningInspector(false);
    },
    onCancel: () => setSigningInspector(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC5"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-lg"
  }, todayDate))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800 flex items-center gap-2"
  }, "\uD83D\uDD0D Subcontractor Site Inspection"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 text-sm mt-1"
  }, "Complete site safety inspection")), isEditing && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 text-xl"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-800 font-semibold"
  }, "Editing Mode"), /*#__PURE__*/React.createElement("p", {
    className: "text-blue-600 text-sm"
  }, "Modify this inspection and save your changes"))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "Site Details"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Site Conducted *"), /*#__PURE__*/React.createElement("select", {
    value: siteConducted,
    onChange: e => setSiteConducted(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Site"), sitesList.map(site => /*#__PURE__*/React.createElement("option", {
    key: site,
    value: site
  }, site)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Prepared By *"), /*#__PURE__*/React.createElement("select", {
    value: preparedBy,
    onChange: e => setPreparedBy(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Preparer"), preparers.map(p => /*#__PURE__*/React.createElement("option", {
    key: p,
    value: p
  }, p)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "\uD83D\uDCCD Location *"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: location,
    onChange: e => setLocation(e.target.value),
    className: "flex-1 border border-gray-300 rounded-lg p-3",
    placeholder: "Enter location"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: getLocation,
    disabled: isLocating,
    className: "bg-blue-600 text-white px-4 rounded-lg disabled:bg-blue-400"
  }, isLocating ? '...' : '📍')))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-4"
  }, "\uD83D\uDCCB Inspection Checklist"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, inspectionQuestions.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    className: "border-b border-gray-100 pb-4 last:border-0 last:pb-0"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 mb-2 text-sm"
  }, idx + 1, ". ", item.text), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setInspectionValue(item.id, 'yes'),
    className: `flex-1 py-2 rounded-lg font-medium text-sm border-2 ${inspectionItems[item.id] === 'yes' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`
  }, "Yes"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setInspectionValue(item.id, 'no'),
    className: `flex-1 py-2 rounded-lg font-medium text-sm border-2 ${inspectionItems[item.id] === 'no' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`
  }, "No"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setInspectionValue(item.id, 'na'),
    className: `flex-1 py-2 rounded-lg font-medium text-sm border-2 ${inspectionItems[item.id] === 'na' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`
  }, "N/A")))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "\u2705 Inspection Completed By *"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Name *"), /*#__PURE__*/React.createElement("select", {
    value: completedBy,
    onChange: e => {
      setCompletedBy(e.target.value);
      setCompletedBySignature(null);
    },
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Inspector"), inspectors.map(i => /*#__PURE__*/React.createElement("option", {
    key: i,
    value: i
  }, i)))), completedBy && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Signature *"), completedBySignature ? /*#__PURE__*/React.createElement("div", {
    className: "relative inline-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-green-500 rounded-lg p-2 bg-green-50 h-20 w-40"
  }, /*#__PURE__*/React.createElement("img", {
    src: completedBySignature,
    alt: "inspector signature",
    className: "h-full w-full object-contain"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setCompletedBySignature(null),
    className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
  }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSigningInspector(true),
    className: "h-20 w-40 border-2 border-dashed border-blue-300 rounded-lg text-blue-500 hover:border-blue-500"
  }, "Tap to sign"))), validationErrors.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-800 font-semibold mb-2"
  }, "Please fix the following:"), validationErrors.map((e, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-red-700 text-sm"
  }, "\u2022 ", e))), /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    disabled: !siteConducted || !preparedBy || !location || !allAnswered || !completedBy || !completedBySignature,
    className: "w-full bg-green-600 text-white py-4 rounded-xl font-semibold disabled:bg-gray-300"
  }, "\u2713 Complete Inspection"));
}

// ITP Form View
window.SubcontractorInspectionView = SubcontractorInspectionView;

// === js/components/form-itp.jsx ===
// ITPFormView Component
// Extracted from forms.jsx

// Sub-components defined outside ITPFormView to avoid re-creation on every render
const YesNoNAButtons = ({
  value,
  onChange,
  label
}) => /*#__PURE__*/React.createElement("div", {
  className: "bg-white rounded-xl p-4 shadow-sm"
}, /*#__PURE__*/React.createElement("p", {
  className: "text-gray-700 mb-3 font-medium"
}, label), /*#__PURE__*/React.createElement("div", {
  className: "flex gap-2"
}, /*#__PURE__*/React.createElement("button", {
  onClick: () => onChange('yes'),
  className: `flex-1 py-2 rounded-lg font-medium text-sm border-2 ${value === 'yes' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-gray-700'}`
}, "Yes"), /*#__PURE__*/React.createElement("button", {
  onClick: () => onChange('no'),
  className: `flex-1 py-2 rounded-lg font-medium text-sm border-2 ${value === 'no' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 text-gray-700'}`
}, "No"), /*#__PURE__*/React.createElement("button", {
  onClick: () => onChange('na'),
  className: `flex-1 py-2 rounded-lg font-medium text-sm border-2 ${value === 'na' ? 'bg-gray-500 border-gray-500 text-white' : 'border-gray-300 text-gray-700'}`
}, "N/A")));
const TextInputBox = ({
  value,
  onChange,
  label,
  placeholder
}) => /*#__PURE__*/React.createElement("div", {
  className: "bg-white rounded-xl p-4 shadow-sm"
}, /*#__PURE__*/React.createElement("p", {
  className: "text-gray-700 mb-2 font-medium"
}, label), /*#__PURE__*/React.createElement("input", {
  type: "text",
  value: value,
  onChange: e => onChange(e.target.value),
  className: "w-full border border-gray-300 rounded-lg p-3 text-sm",
  placeholder: placeholder || "Tap to edit"
}));
const SectionHeader = ({
  title,
  progress
}) => /*#__PURE__*/React.createElement("div", {
  className: "bg-indigo-400 rounded-xl p-3 flex justify-between items-center"
}, /*#__PURE__*/React.createElement("div", {
  className: "flex items-center gap-2"
}, /*#__PURE__*/React.createElement("span", {
  className: "text-white"
}, "\u25BC"), /*#__PURE__*/React.createElement("span", {
  className: "text-white font-medium"
}, title)), progress && /*#__PURE__*/React.createElement("span", {
  className: "text-white text-sm"
}, progress));
function ITPFormView({
  onSubmit,
  onUpdate,
  editingForm,
  sites = []
}) {
  const isEditing = !!editingForm;
  const editData = editingForm?.data || {};
  const [page, setPage] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [signingPerson, setSigningPerson] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Page 1 - Title Page
  const [siteConducted, setSiteConducted] = useState(editData.siteConducted || '');
  const [conductedOn, setConductedOn] = useState(editData.conductedOn || new Date().toISOString().slice(0, 16));
  const [preparedBy, setPreparedBy] = useState(editData.preparedBy || '');
  const [location, setLocation] = useState(editData.location || '');
  const [isLocating, setIsLocating] = useState(false);

  // Page 2 - Inspection Items
  const [preConstructionMeeting, setPreConstructionMeeting] = useState(editData.preConstructionMeeting || '');
  const [highRiskWorkshop, setHighRiskWorkshop] = useState(editData.highRiskWorkshop ?? null);
  const [shopdrawingsApproved, setShopdrawingsApproved] = useState(editData.shopdrawingsApproved ?? null);
  const [allItemsSignedOff, setAllItemsSignedOff] = useState(editData.allItemsSignedOff ?? null);

  // Procurement section
  const [shopdrawingRevision, setShopdrawingRevision] = useState(editData.shopdrawingRevision || '');
  const [orderedGlassFrom, setOrderedGlassFrom] = useState(editData.orderedGlassFrom || '');
  const [glassSpecification, setGlassSpecification] = useState(editData.glassSpecification || '');

  // Installation of Glass section
  const [glassFreeFromDamage, setGlassFreeFromDamage] = useState(editData.glassFreeFromDamage ?? null);
  const [specificationOfFixings, setSpecificationOfFixings] = useState(editData.specificationOfFixings || '');
  const [setoutCompletedBy, setSetoutCompletedBy] = useState(editData.setoutCompletedBy || '');
  const [installationMethod, setInstallationMethod] = useState(editData.installationMethod || '');
  const [glassInstalledCorrectRL, setGlassInstalledCorrectRL] = useState(editData.glassInstalledCorrectRL ?? null);
  const [glassLockedWedgedGlued, setGlassLockedWedgedGlued] = useState(editData.glassLockedWedgedGlued ?? null);
  const [removeWedgesCaulk, setRemoveWedgesCaulk] = useState(editData.removeWedgesCaulk || '');

  // Installation of Handrails section
  const [handrailSpecConfirmed, setHandrailSpecConfirmed] = useState(editData.handrailSpecConfirmed ?? null);
  const [spigotsCouplingsTight, setSpigotsCouplingsTight] = useState(editData.spigotsCouplingsTight ?? null);
  const [handrailCompliantHeight, setHandrailCompliantHeight] = useState(editData.handrailCompliantHeight ?? null);
  const [threadOnFixings, setThreadOnFixings] = useState(editData.threadOnFixings ?? null);
  const [fullWeldingJunctions, setFullWeldingJunctions] = useState(editData.fullWeldingJunctions ?? null);

  // Handover section
  const [allGlassNoDefects, setAllGlassNoDefects] = useState(editData.allGlassNoDefects ?? null);
  const [allHandrailNoDefects, setAllHandrailNoDefects] = useState(editData.allHandrailNoDefects ?? null);
  const [balustradeAsPerDesign, setBalustradeAsPerDesign] = useState(editData.balustradeAsPerDesign ?? null);

  // Page 3 - Sign off
  const [builderSignoffName, setBuilderSignoffName] = useState(editData.builderSignoffName || '');
  const [builderSignature, setBuilderSignature] = useState(editData.builderSignature || null);
  const [futureCorrespondence, setFutureCorrespondence] = useState(editData.futureCorrespondence || '');
  const todayDate = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const preparers = FORM_CONSTANTS.supervisors;
  const sitesList = [...new Set((sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string'))];
  useEffect(() => {
    const data = editingForm?.data || {};
    setPage(1);
    setSiteConducted(data.siteConducted || '');
    setConductedOn(data.conductedOn || new Date().toISOString().slice(0, 16));
    setPreparedBy(data.preparedBy || '');
    setLocation(data.location || '');
    setPreConstructionMeeting(data.preConstructionMeeting || '');
    setHighRiskWorkshop(data.highRiskWorkshop ?? null);
    setShopdrawingsApproved(data.shopdrawingsApproved ?? null);
    setAllItemsSignedOff(data.allItemsSignedOff ?? null);
    setShopdrawingRevision(data.shopdrawingRevision || '');
    setOrderedGlassFrom(data.orderedGlassFrom || '');
    setGlassSpecification(data.glassSpecification || '');
    setGlassFreeFromDamage(data.glassFreeFromDamage ?? null);
    setSpecificationOfFixings(data.specificationOfFixings || '');
    setSetoutCompletedBy(data.setoutCompletedBy || '');
    setInstallationMethod(data.installationMethod || '');
    setGlassInstalledCorrectRL(data.glassInstalledCorrectRL ?? null);
    setGlassLockedWedgedGlued(data.glassLockedWedgedGlued ?? null);
    setRemoveWedgesCaulk(data.removeWedgesCaulk || '');
    setHandrailSpecConfirmed(data.handrailSpecConfirmed ?? null);
    setSpigotsCouplingsTight(data.spigotsCouplingsTight ?? null);
    setHandrailCompliantHeight(data.handrailCompliantHeight ?? null);
    setThreadOnFixings(data.threadOnFixings ?? null);
    setFullWeldingJunctions(data.fullWeldingJunctions ?? null);
    setAllGlassNoDefects(data.allGlassNoDefects ?? null);
    setAllHandrailNoDefects(data.allHandrailNoDefects ?? null);
    setBalustradeAsPerDesign(data.balustradeAsPerDesign ?? null);
    setBuilderSignoffName(data.builderSignoffName || '');
    setBuilderSignature(data.builderSignature || null);
    setFutureCorrespondence(data.futureCorrespondence || '');
    setSubmitted(false);
    setValidationErrors([]);
  }, [editingForm?.id]);
  const getLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          const data = await response.json();
          setLocation(data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`);
        } catch (e) {
          setLocation(`${position.coords.latitude}, ${position.coords.longitude}`);
        }
        setIsLocating(false);
      }, () => {
        ToastNotifier.error('Unable to get location');
        setIsLocating(false);
      }, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    } else {
      setIsLocating(false);
    }
  };
  const handleSubmit = () => {
    let errors = [];
    if (window.formValidator) {
      errors = window.formValidator.validateITP({
        siteConducted,
        preparedBy,
        builderSignoffName,
        builderSignature
      });
    } else {
      if (!siteConducted) errors.push('Site/Location is required');
      if (!preparedBy) errors.push('Prepared by is required');
    }
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    const submitData = {
      siteConducted,
      conductedOn,
      preparedBy,
      location,
      preConstructionMeeting,
      highRiskWorkshop,
      shopdrawingsApproved,
      allItemsSignedOff,
      shopdrawingRevision,
      orderedGlassFrom,
      glassSpecification,
      glassFreeFromDamage,
      specificationOfFixings,
      setoutCompletedBy,
      installationMethod,
      glassInstalledCorrectRL,
      glassLockedWedgedGlued,
      removeWedgesCaulk,
      handrailSpecConfirmed,
      spigotsCouplingsTight,
      handrailCompliantHeight,
      threadOnFixings,
      fullWeldingJunctions,
      allGlassNoDefects,
      allHandrailNoDefects,
      balustradeAsPerDesign,
      builderSignoffName,
      builderSignature,
      futureCorrespondence,
      date: new Date().toISOString()
    };
    if (isEditing && onUpdate) {
      onUpdate(editingForm.id, 'itp', submitData);
    } else {
      onSubmit(submitData);
      setSubmitted(true);
    }
  };
  const resetForm = () => {
    setPage(1);
    setSubmitted(false);
    setSiteConducted('');
    setConductedOn(new Date().toISOString().slice(0, 16));
    setPreparedBy('');
    setLocation('');
    setPreConstructionMeeting('');
    setHighRiskWorkshop(null);
    setShopdrawingsApproved(null);
    setAllItemsSignedOff(null);
    setShopdrawingRevision('');
    setOrderedGlassFrom('');
    setGlassSpecification('');
    setGlassFreeFromDamage(null);
    setSpecificationOfFixings('');
    setSetoutCompletedBy('');
    setInstallationMethod('');
    setGlassInstalledCorrectRL(null);
    setGlassLockedWedgedGlued(null);
    setRemoveWedgesCaulk('');
    setHandrailSpecConfirmed(null);
    setSpigotsCouplingsTight(null);
    setHandrailCompliantHeight(null);
    setThreadOnFixings(null);
    setFullWeldingJunctions(null);
    setAllGlassNoDefects(null);
    setAllHandrailNoDefects(null);
    setBalustradeAsPerDesign(null);
    setBuilderSignoffName('');
    setBuilderSignature(null);
    setFutureCorrespondence('');
  };
  if (submitted) {
    return /*#__PURE__*/React.createElement("div", {
      className: "text-center py-12"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl"
    }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold text-gray-800 mb-2"
    }, isEditing ? 'ITP Form Updated!' : 'ITP Form Complete!'), /*#__PURE__*/React.createElement("p", {
      className: "text-gray-600 mb-6"
    }, isEditing ? 'Your changes have been saved.' : 'Inspection Test Plan has been recorded.'), /*#__PURE__*/React.createElement("button", {
      onClick: resetForm,
      className: "bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
    }, "Start New ITP"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, signingPerson && /*#__PURE__*/React.createElement(SignaturePad, {
    name: signingPerson,
    onSave: data => {
      setBuilderSignature(data);
      setSigningPerson(null);
    },
    onCancel: () => setSigningPerson(null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800"
  }, "\uD83D\uDCDD ITP Form"), /*#__PURE__*/React.createElement("p", {
    className: "text-gray-500 text-sm"
  }, "Page ", page, "/3")))), isEditing && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 text-xl"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-800 font-semibold"
  }, "Editing Mode"), /*#__PURE__*/React.createElement("p", {
    className: "text-blue-600 text-sm"
  }, "Modify this ITP form and save your changes"))), page === 1 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-lg"
  }, "Title Page"), /*#__PURE__*/React.createElement("p", {
    className: "text-indigo-200 text-sm"
  }, "Page 1/3")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "* Site Conducted"), /*#__PURE__*/React.createElement("select", {
    value: siteConducted,
    onChange: e => setSiteConducted(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 bg-indigo-100 text-indigo-800 font-medium"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Site"), sitesList.map(site => /*#__PURE__*/React.createElement("option", {
    key: site,
    value: site
  }, site)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Conducted on"), /*#__PURE__*/React.createElement("input", {
    type: "datetime-local",
    value: conductedOn,
    onChange: e => setConductedOn(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 bg-gray-100"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Prepared by"), /*#__PURE__*/React.createElement("select", {
    value: preparedBy,
    onChange: e => setPreparedBy(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Preparer"), preparers.map(p => /*#__PURE__*/React.createElement("option", {
    key: p,
    value: p
  }, p)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Location"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: location,
    onChange: e => setLocation(e.target.value),
    className: "flex-1 border border-gray-300 rounded-lg p-3",
    placeholder: "Enter location"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: getLocation,
    disabled: isLocating,
    className: "bg-indigo-500 text-white px-4 rounded-lg disabled:bg-indigo-300"
  }, isLocating ? '...' : '📍')))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPage(2),
    disabled: !siteConducted || !preparedBy,
    className: "bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium disabled:bg-gray-300"
  }, "Next \u2192 Page 2/3"))), page === 2 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-lg"
  }, "ITP Form"), /*#__PURE__*/React.createElement("p", {
    className: "text-indigo-200 text-sm"
  }, "Page 2/3")), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "* Pre-Construction Meeting completed with Builder : NAME",
    value: preConstructionMeeting,
    onChange: setPreConstructionMeeting,
    placeholder: "Tap to edit"
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "High Risk Workshop Completed: (If Applicable)",
    value: highRiskWorkshop,
    onChange: setHighRiskWorkshop
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Shopdrawings Submitted to Builder and approved by Engineer",
    value: shopdrawingsApproved,
    onChange: setShopdrawingsApproved
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "All Items Above completed and Signed off",
    value: allItemsSignedOff,
    onChange: setAllItemsSignedOff
  }), /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Procurement"
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Shopdrawing Revision for Glass Order",
    value: shopdrawingRevision,
    onChange: setShopdrawingRevision
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Ordered Glass from (Company Name)",
    value: orderedGlassFrom,
    onChange: setOrderedGlassFrom
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Glass Specification",
    value: glassSpecification,
    onChange: setGlassSpecification
  }), /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Installation of Glass",
    progress: "0/1 (0%)"
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Glass free from damages and defects on edges",
    value: glassFreeFromDamage,
    onChange: setGlassFreeFromDamage
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Specification of Fixings - Grout / Hilti HY270",
    value: specificationOfFixings,
    onChange: setSpecificationOfFixings
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Setout completed by - Surveyor or J&M Artsteel - Name/Company",
    value: setoutCompletedBy,
    onChange: setSetoutCompletedBy
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Installation method - Plant Required",
    value: installationMethod,
    onChange: setInstallationMethod
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Glass Installed with correct RL from builder and 1m from FFL Minimum",
    value: glassInstalledCorrectRL,
    onChange: setGlassInstalledCorrectRL
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "All Glass Locked off, wedged and Glued for 24 hours minimum",
    value: glassLockedWedgedGlued,
    onChange: setGlassLockedWedgedGlued
  }), /*#__PURE__*/React.createElement(TextInputBox, {
    label: "Remove Wedges and Caulk gap if required",
    value: removeWedgesCaulk,
    onChange: setRemoveWedgesCaulk
  }), /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Installation of Handrails",
    progress: "0/2 (0%)"
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Handrail Specification Confirmed and Shopdrawing Approved",
    value: handrailSpecConfirmed,
    onChange: setHandrailSpecConfirmed
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Install all spigots and threaded couplings hand tight for alignment",
    value: spigotsCouplingsTight,
    onChange: setSpigotsCouplingsTight
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Installation of handrail to compliant height as per shopdrawing and Architectural details",
    value: handrailCompliantHeight,
    onChange: setHandrailCompliantHeight
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Thread on all fixings / brackets, tack all tube together",
    value: threadOnFixings,
    onChange: setThreadOnFixings
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Full welding of all junctions of spigots, handrail joints and all coupling pieces tensioned",
    value: fullWeldingJunctions,
    onChange: setFullWeldingJunctions
  }), /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Handover and Finalisation of install",
    progress: "0/1 (0%)"
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "All glass installed to satisfactory finish with no defects or damages",
    value: allGlassNoDefects,
    onChange: setAllGlassNoDefects
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "All Handrail installed to satisfactory finish with no defects or damages - All joints welded and polished",
    value: allHandrailNoDefects,
    onChange: setAllHandrailNoDefects
  }), /*#__PURE__*/React.createElement(YesNoNAButtons, {
    label: "Balustrade system is installed as per design intent with correct RL heights",
    value: balustradeAsPerDesign,
    onChange: setBalustradeAsPerDesign
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPage(1),
    className: "border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium"
  }, "\u2190 Back Page 1/3"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPage(3),
    className: "bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium"
  }, "Next \u2192 Page 3/3"))), page === 3 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-lg"
  }, "Sign off Page"), /*#__PURE__*/React.createElement("p", {
    className: "text-indigo-200 text-sm"
  }, "Page 3/3")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 font-medium"
  }, "Builder Signoff - Name / Signature"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: builderSignoffName,
    onChange: e => setBuilderSignoffName(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3",
    placeholder: "Full name"
  }), builderSignoffName && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-2"
  }, "Signature"), builderSignature ? /*#__PURE__*/React.createElement("div", {
    className: "relative inline-block"
  }, /*#__PURE__*/React.createElement("div", {
    className: "border-2 border-green-500 rounded-lg p-2 bg-green-50 h-20 w-40"
  }, /*#__PURE__*/React.createElement("img", {
    src: builderSignature,
    alt: "builder signature",
    className: "h-full w-full object-contain"
  })), /*#__PURE__*/React.createElement("button", {
    onClick: () => setBuilderSignature(null),
    className: "absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
  }, "\u2715")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSigningPerson(builderSignoffName),
    className: "h-20 w-40 border-2 border-dashed border-indigo-300 rounded-lg text-indigo-500 hover:border-indigo-500 flex items-center justify-center"
  }, "\u270D\uFE0F Tap to sign"))), /*#__PURE__*/React.createElement(SectionHeader, {
    title: "Comments and Notes"
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-gray-700 mb-2 font-medium"
  }, "Items for Future correspondence or arisen issues during constructions"), /*#__PURE__*/React.createElement("textarea", {
    value: futureCorrespondence,
    onChange: e => setFutureCorrespondence(e.target.value),
    className: "w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[100px]",
    placeholder: "Tap to edit"
  })), validationErrors.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-800 font-semibold mb-2"
  }, "Please fix the following:"), validationErrors.map((e, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-red-700 text-sm"
  }, "\u2022 ", e))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setPage(2),
    className: "border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium"
  }, "\u2190 Back Page 2/3"), /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    className: "bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium"
  }, "Complete"))));
}

// Steel Inspection Test Plan View
window.ITPFormView = ITPFormView;

// === js/components/form-steel-itp.jsx ===
// SteelITPView Component
// Extracted from forms.jsx

// SelectField defined outside SteelITPView to avoid re-creation on every render
const SelectField = ({
  label,
  value,
  onChange
}) => /*#__PURE__*/React.createElement("div", {
  className: "space-y-2"
}, /*#__PURE__*/React.createElement("label", {
  className: "block text-sm font-medium text-gray-700"
}, label), /*#__PURE__*/React.createElement("div", {
  className: "flex gap-2"
}, ['Yes', 'No', 'N/A'].map(opt => /*#__PURE__*/React.createElement("button", {
  key: opt,
  onClick: () => onChange(opt),
  className: `flex-1 p-2 rounded-lg border text-sm font-medium ${value === opt ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-300'}`
}, opt))));
function SteelITPView({
  onSubmit,
  onUpdate,
  editingForm,
  sites = []
}) {
  const isEditing = !!editingForm;
  const editData = editingForm?.data || {};
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [managerSignature, setManagerSignature] = useState(editData.managerSignature || null);
  const [builderSignature, setBuilderSignature] = useState(editData.builderSignature || null);
  const [signingManager, setSigningManager] = useState(false);
  const [signingBuilder, setSigningBuilder] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Form state
  const [siteConducted, setSiteConducted] = useState(editData.siteConducted || '');
  const [preparedBy, setPreparedBy] = useState(editData.preparedBy || '');
  const [location, setLocation] = useState(editData.location || '');
  const [jobStructure, setJobStructure] = useState(editData.jobStructure || '');

  // Items section
  const [preConstMeeting, setPreConstMeeting] = useState(editData.preConstMeeting || '');
  const [highRiskWorkshop, setHighRiskWorkshop] = useState(editData.highRiskWorkshop || '');
  const [shopdrawingsApproved, setShopdrawingsApproved] = useState(editData.shopdrawingsApproved || '');
  const [allItemsSignedOff, setAllItemsSignedOff] = useState(editData.allItemsSignedOff || '');

  // Fabrication section
  const [materialsOrdered, setMaterialsOrdered] = useState(editData.materialsOrdered || '');
  const [materialsCorrect, setMaterialsCorrect] = useState(editData.materialsCorrect || '');
  const [visualCheck, setVisualCheck] = useState(editData.visualCheck || '');
  const [shopdrawingsCurrent, setShopdrawingsCurrent] = useState(editData.shopdrawingsCurrent || '');
  const [setoutCorrect, setSetoutCorrect] = useState(editData.setoutCorrect || '');
  const [tackWeld, setTackWeld] = useState(editData.tackWeld || '');
  const [fullyWelded, setFullyWelded] = useState(editData.fullyWelded || '');
  const [packLoad, setPackLoad] = useState(editData.packLoad || '');

  // Specialised finishes
  const [finishConfirmed, setFinishConfirmed] = useState(editData.finishConfirmed || '');
  const [deliveryBooked, setDeliveryBooked] = useState(editData.deliveryBooked || '');
  const [sentToPainter, setSentToPainter] = useState(editData.sentToPainter || '');
  const [deliveryVehicle, setDeliveryVehicle] = useState(editData.deliveryVehicle || '');
  const [afterDeliveryFinish, setAfterDeliveryFinish] = useState(editData.afterDeliveryFinish || '');

  // Site setout
  const [drawingsConfirmed, setDrawingsConfirmed] = useState(editData.drawingsConfirmed || '');
  const [surveyorMeasurements, setSurveyorMeasurements] = useState(editData.surveyorMeasurements || '');
  const [surveyorName, setSurveyorName] = useState(editData.surveyorName || '');
  const [clashesDetected, setClashesDetected] = useState(editData.clashesDetected || '');

  // Site installation
  const [chemicalAnchors, setChemicalAnchors] = useState(editData.chemicalAnchors || '');
  const [anchorsInstalled, setAnchorsInstalled] = useState(editData.anchorsInstalled || '');
  const [levelPlumb, setLevelPlumb] = useState(editData.levelPlumb || '');
  const [boltsTorqued, setBoltsTorqued] = useState(editData.boltsTorqued || '');
  const [weldingCompleted, setWeldingCompleted] = useState(editData.weldingCompleted || '');

  // Grouting
  const [groutingCompleted, setGroutingCompleted] = useState(editData.groutingCompleted || '');

  // Final inspection
  const [itemsChecked, setItemsChecked] = useState(editData.itemsChecked || '');
  const [finishAcceptable, setFinishAcceptable] = useState(editData.finishAcceptable || '');
  const [fixingsTorqued, setFixingsTorqued] = useState(editData.fixingsTorqued || '');

  // NDT
  const [weldTestingBooked, setWeldTestingBooked] = useState(editData.weldTestingBooked || '');
  const [testingIssues, setTestingIssues] = useState(editData.testingIssues || '');
  const [weldsPassed, setWeldsPassed] = useState(editData.weldsPassed || '');

  // Handover
  const [colourConfirmed, setColourConfirmed] = useState(editData.colourConfirmed || '');
  const [defectsChecked, setDefectsChecked] = useState(editData.defectsChecked || '');
  const [handoverAccepted, setHandoverAccepted] = useState(editData.handoverAccepted || '');

  // Manager info
  const [managerName, setManagerName] = useState(editData.managerName || '');
  const [builderName, setBuilderName] = useState(editData.builderName || '');
  const todayDate = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const sitesList = [...new Set((sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites).filter(s => typeof s === 'string'))];
  useEffect(() => {
    const data = editingForm?.data || {};
    setStep(1);
    setSiteConducted(data.siteConducted || '');
    setPreparedBy(data.preparedBy || '');
    setLocation(data.location || '');
    setJobStructure(data.jobStructure || '');
    setPreConstMeeting(data.preConstMeeting || '');
    setHighRiskWorkshop(data.highRiskWorkshop || '');
    setShopdrawingsApproved(data.shopdrawingsApproved || '');
    setAllItemsSignedOff(data.allItemsSignedOff || '');
    setMaterialsOrdered(data.materialsOrdered || '');
    setMaterialsCorrect(data.materialsCorrect || '');
    setVisualCheck(data.visualCheck || '');
    setShopdrawingsCurrent(data.shopdrawingsCurrent || '');
    setSetoutCorrect(data.setoutCorrect || '');
    setTackWeld(data.tackWeld || '');
    setFullyWelded(data.fullyWelded || '');
    setPackLoad(data.packLoad || '');
    setFinishConfirmed(data.finishConfirmed || '');
    setDeliveryBooked(data.deliveryBooked || '');
    setSentToPainter(data.sentToPainter || '');
    setDeliveryVehicle(data.deliveryVehicle || '');
    setAfterDeliveryFinish(data.afterDeliveryFinish || '');
    setDrawingsConfirmed(data.drawingsConfirmed || '');
    setSurveyorMeasurements(data.surveyorMeasurements || '');
    setSurveyorName(data.surveyorName || '');
    setClashesDetected(data.clashesDetected || '');
    setChemicalAnchors(data.chemicalAnchors || '');
    setAnchorsInstalled(data.anchorsInstalled || '');
    setLevelPlumb(data.levelPlumb || '');
    setBoltsTorqued(data.boltsTorqued || '');
    setWeldingCompleted(data.weldingCompleted || '');
    setGroutingCompleted(data.groutingCompleted || '');
    setItemsChecked(data.itemsChecked || '');
    setFinishAcceptable(data.finishAcceptable || '');
    setFixingsTorqued(data.fixingsTorqued || '');
    setWeldTestingBooked(data.weldTestingBooked || '');
    setTestingIssues(data.testingIssues || '');
    setWeldsPassed(data.weldsPassed || '');
    setColourConfirmed(data.colourConfirmed || '');
    setDefectsChecked(data.defectsChecked || '');
    setHandoverAccepted(data.handoverAccepted || '');
    setManagerName(data.managerName || '');
    setManagerSignature(data.managerSignature || null);
    setBuilderName(data.builderName || '');
    setBuilderSignature(data.builderSignature || null);
    setSubmitted(false);
    setValidationErrors([]);
  }, [editingForm?.id]);
  const handleSubmit = () => {
    let errors = [];
    if (window.formValidator) {
      errors = window.formValidator.validateSteelITP({
        siteConducted,
        preparedBy,
        managerName,
        managerSignature
      });
    } else {
      if (!siteConducted) errors.push('Site/Location is required');
      if (!preparedBy) errors.push('Prepared by is required');
    }
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    const data = {
      siteConducted,
      preparedBy,
      location,
      jobStructure,
      preConstMeeting,
      highRiskWorkshop,
      shopdrawingsApproved,
      allItemsSignedOff,
      materialsOrdered,
      materialsCorrect,
      visualCheck,
      shopdrawingsCurrent,
      setoutCorrect,
      tackWeld,
      fullyWelded,
      packLoad,
      finishConfirmed,
      deliveryBooked,
      sentToPainter,
      deliveryVehicle,
      afterDeliveryFinish,
      drawingsConfirmed,
      surveyorMeasurements,
      surveyorName,
      clashesDetected,
      chemicalAnchors,
      anchorsInstalled,
      levelPlumb,
      boltsTorqued,
      weldingCompleted,
      groutingCompleted,
      itemsChecked,
      finishAcceptable,
      fixingsTorqued,
      weldTestingBooked,
      testingIssues,
      weldsPassed,
      colourConfirmed,
      defectsChecked,
      handoverAccepted,
      managerName,
      managerSignature,
      builderName,
      builderSignature,
      submittedAt: new Date().toISOString()
    };
    if (isEditing && onUpdate) {
      onUpdate(editingForm.id, 'steel-itp', data);
    } else {
      onSubmit(data);
      setSubmitted(true);
    }
  };
  if (submitted) {
    return /*#__PURE__*/React.createElement("div", {
      className: "space-y-4"
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-green-500 text-white p-6 rounded-xl text-center"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-6xl mb-4"
    }, "\u2705"), /*#__PURE__*/React.createElement("h2", {
      className: "text-2xl font-bold"
    }, isEditing ? 'Steel ITP Updated!' : 'Steel ITP Submitted!')), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setSubmitted(false);
        setStep(1);
        // Reset all form fields
        setSiteConducted('');
        setPreparedBy('');
        setLocation('');
        setJobStructure('');
        setPreConstMeeting('');
        setHighRiskWorkshop('');
        setShopdrawingsApproved('');
        setAllItemsSignedOff('');
        setMaterialsOrdered('');
        setMaterialsCorrect('');
        setVisualCheck('');
        setShopdrawingsCurrent('');
        setSetoutCorrect('');
        setTackWeld('');
        setFullyWelded('');
        setPackLoad('');
        setFinishConfirmed('');
        setDeliveryBooked('');
        setSentToPainter('');
        setDeliveryVehicle('');
        setAfterDeliveryFinish('');
        setDrawingsConfirmed('');
        setSurveyorMeasurements('');
        setSurveyorName('');
        setClashesDetected('');
        setChemicalAnchors('');
        setAnchorsInstalled('');
        setLevelPlumb('');
        setBoltsTorqued('');
        setWeldingCompleted('');
        setGroutingCompleted('');
        setItemsChecked('');
        setFinishAcceptable('');
        setFixingsTorqued('');
        setWeldTestingBooked('');
        setTestingIssues('');
        setWeldsPassed('');
        setColourConfirmed('');
        setDefectsChecked('');
        setHandoverAccepted('');
        setManagerName('');
        setManagerSignature(null);
        setBuilderName('');
        setBuilderSignature(null);
        setValidationErrors([]);
      },
      className: "w-full bg-orange-600 text-white p-4 rounded-xl font-semibold"
    }, "Start New Steel ITP"));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, signingManager && /*#__PURE__*/React.createElement(SignaturePad, {
    name: managerName,
    onSave: sig => {
      setManagerSignature(sig);
      setSigningManager(false);
    },
    onCancel: () => setSigningManager(false)
  }), signingBuilder && /*#__PURE__*/React.createElement(SignaturePad, {
    name: builderName,
    onSave: sig => {
      setBuilderSignature(sig);
      setSigningBuilder(false);
    },
    onCancel: () => setSigningBuilder(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-slate-600 to-slate-700 text-white p-4 rounded-xl"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold"
  }, "\uD83D\uDD29 Steel Inspection Test Plan"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm opacity-90 mt-1"
  }, "J&M ArtSteel"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-2"
  }, todayDate)), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1"
  }, [1, 2, 3, 4, 5, 6, 7, 8].map(s => /*#__PURE__*/React.createElement("div", {
    key: s,
    className: `flex-1 h-2 rounded ${step >= s ? 'bg-orange-500' : 'bg-gray-200'}`
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 text-center"
  }, "Step ", step, " of 8"), isEditing && /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-100 border border-blue-300 rounded-xl p-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-blue-600 text-xl"
  }, "\u270F\uFE0F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-blue-800 font-semibold"
  }, "Editing Mode"), /*#__PURE__*/React.createElement("p", {
    className: "text-blue-600 text-sm"
  }, "Modify this Steel ITP and save your changes"))), step === 1 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Basic Information"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Site Conducted *"), /*#__PURE__*/React.createElement("select", {
    value: siteConducted,
    onChange: e => setSiteConducted(e.target.value),
    className: "w-full p-3 border rounded-lg"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select site"), sitesList.map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  }, s)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Prepared By"), /*#__PURE__*/React.createElement("select", {
    value: preparedBy,
    onChange: e => setPreparedBy(e.target.value),
    className: "w-full p-3 border rounded-lg bg-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select person"), /*#__PURE__*/React.createElement("option", {
    value: "Jeff Fu"
  }, "Jeff Fu"), /*#__PURE__*/React.createElement("option", {
    value: "Scott Seeho"
  }, "Scott Seeho"), /*#__PURE__*/React.createElement("option", {
    value: "Davide Casolini"
  }, "Davide Casolini"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Location"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: location,
    onChange: e => setLocation(e.target.value),
    placeholder: "Enter location",
    className: "w-full p-3 border rounded-lg"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Job / Structure ITP carried out on"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: jobStructure,
    onChange: e => setJobStructure(e.target.value),
    placeholder: "Enter job details",
    className: "w-full p-3 border rounded-lg"
  }))), step === 2 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Items"), /*#__PURE__*/React.createElement(SelectField, {
    label: "Pre-Construction Meeting Completed with Builder",
    value: preConstMeeting,
    onChange: setPreConstMeeting
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Structural Steel High Risk Workshop Completed",
    value: highRiskWorkshop,
    onChange: setHighRiskWorkshop
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Shopdrawings Submitted and Approved by Engineer",
    value: shopdrawingsApproved,
    onChange: setShopdrawingsApproved
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "All Above items completed and Signed off",
    value: allItemsSignedOff,
    onChange: setAllItemsSignedOff
  })), step === 3 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Fabrication"), /*#__PURE__*/React.createElement(SelectField, {
    label: "Materials Ordered as Per shopdrawings",
    value: materialsOrdered,
    onChange: setMaterialsOrdered
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Materials on delivery are correct",
    value: materialsCorrect,
    onChange: setMaterialsCorrect
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Visual Check Materials in good condition",
    value: visualCheck,
    onChange: setVisualCheck
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Shopdrawings are current revision",
    value: shopdrawingsCurrent,
    onChange: setShopdrawingsCurrent
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Setout cleats, plates, members correct",
    value: setoutCorrect,
    onChange: setSetoutCorrect
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Tack weld, check straight and plumb",
    value: tackWeld,
    onChange: setTackWeld
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Fully weld as per engineer specifications",
    value: fullyWelded,
    onChange: setFullyWelded
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Pack and load materials for transport",
    value: packLoad,
    onChange: setPackLoad
  })), step === 4 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Specialised Finishes"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Confirm finish of steel and approved"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: finishConfirmed,
    onChange: e => setFinishConfirmed(e.target.value),
    placeholder: "Enter finish type",
    className: "w-full p-3 border rounded-lg"
  })), /*#__PURE__*/React.createElement(SelectField, {
    label: "Book delivery to site/workshop",
    value: deliveryBooked,
    onChange: setDeliveryBooked
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Send material to painter/abrasive blaster",
    value: sentToPainter,
    onChange: setSentToPainter
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Correct Delivery vehicle and sizes confirmed",
    value: deliveryVehicle,
    onChange: setDeliveryVehicle
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "After delivery finish is acceptable",
    value: afterDeliveryFinish,
    onChange: setAfterDeliveryFinish
  })), step === 5 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Site Setout & Installation"), /*#__PURE__*/React.createElement(SelectField, {
    label: "Confirm correct drawings with builder",
    value: drawingsConfirmed,
    onChange: setDrawingsConfirmed
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Surveyor has correct measurements",
    value: surveyorMeasurements,
    onChange: setSurveyorMeasurements
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Surveyor Name"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: surveyorName,
    onChange: e => setSurveyorName(e.target.value),
    placeholder: "Enter surveyor name",
    className: "w-full p-3 border rounded-lg"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Clashes detected / issues"), /*#__PURE__*/React.createElement("textarea", {
    value: clashesDetected,
    onChange: e => setClashesDetected(e.target.value),
    placeholder: "Describe any issues",
    className: "w-full p-3 border rounded-lg",
    rows: 3
  })), /*#__PURE__*/React.createElement(SelectField, {
    label: "Chemical anchors correct as per specs",
    value: chemicalAnchors,
    onChange: setChemicalAnchors
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Anchors installed correctly",
    value: anchorsInstalled,
    onChange: setAnchorsInstalled
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Steel checked for level and plumbness",
    value: levelPlumb,
    onChange: setLevelPlumb
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Bolts and nuts tightened/torqued",
    value: boltsTorqued,
    onChange: setBoltsTorqued
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Welding completed to engineering specs",
    value: weldingCompleted,
    onChange: setWeldingCompleted
  })), step === 6 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Grouting & Final Inspection"), /*#__PURE__*/React.createElement(SelectField, {
    label: "Grouting completed to all steel members",
    value: groutingCompleted,
    onChange: setGroutingCompleted
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "All installed items checked as per drawings",
    value: itemsChecked,
    onChange: setItemsChecked
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Finish in good condition (touch ups done)",
    value: finishAcceptable,
    onChange: setFinishAcceptable
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "All fixings torqued at correct lengths",
    value: fixingsTorqued,
    onChange: setFixingsTorqued
  })), step === 7 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "NDT & Handover"), /*#__PURE__*/React.createElement(SelectField, {
    label: "Weld Testing booked and confirmed",
    value: weldTestingBooked,
    onChange: setWeldTestingBooked
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-gray-700 mb-1"
  }, "Any issues with Testing?"), /*#__PURE__*/React.createElement("textarea", {
    value: testingIssues,
    onChange: e => setTestingIssues(e.target.value),
    placeholder: "Describe issues",
    className: "w-full p-3 border rounded-lg",
    rows: 2
  })), /*#__PURE__*/React.createElement(SelectField, {
    label: "All welds tested have passed compliance",
    value: weldsPassed,
    onChange: setWeldsPassed
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Colour/finish confirmed by builder",
    value: colourConfirmed,
    onChange: setColourConfirmed
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Builder checked for defects",
    value: defectsChecked,
    onChange: setDefectsChecked
  }), /*#__PURE__*/React.createElement(SelectField, {
    label: "Builder accepted handover (defect free)",
    value: handoverAccepted,
    onChange: setHandoverAccepted
  })), step === 8 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-gray-800 border-b pb-2"
  }, "Sign-offs"), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-4 rounded-lg"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-gray-700 mb-3"
  }, "Manager Completing ITP"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: managerName,
    onChange: e => setManagerName(e.target.value),
    placeholder: "Manager name",
    className: "w-full p-3 border rounded-lg mb-3"
  }), managerSignature ? /*#__PURE__*/React.createElement("div", {
    className: "border rounded-lg p-2 bg-white"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mb-1"
  }, "Signature:"), /*#__PURE__*/React.createElement("img", {
    src: managerSignature,
    alt: "Manager signature",
    className: "h-16"
  })) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSigningManager(true),
    disabled: !managerName,
    className: `w-full p-3 rounded-lg font-semibold ${managerName ? 'bg-orange-500 text-white' : 'bg-gray-300 text-gray-500'}`
  }, "\u270D\uFE0F Sign")), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 p-4 rounded-lg"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-gray-700 mb-3"
  }, "Builder Signoff"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: builderName,
    onChange: e => setBuilderName(e.target.value),
    placeholder: "Builder name",
    className: "w-full p-3 border rounded-lg mb-3"
  }), builderSignature ? /*#__PURE__*/React.createElement("div", {
    className: "border rounded-lg p-2 bg-white"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mb-1"
  }, "Signature:"), /*#__PURE__*/React.createElement("img", {
    src: builderSignature,
    alt: "Builder signature",
    className: "h-16"
  })) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setSigningBuilder(true),
    disabled: !builderName,
    className: `w-full p-3 rounded-lg font-semibold ${builderName ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'}`
  }, "\u270D\uFE0F Sign"))), validationErrors.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-800 font-semibold mb-2"
  }, "Please fix the following:"), validationErrors.map((e, i) => /*#__PURE__*/React.createElement("p", {
    key: i,
    className: "text-red-700 text-sm"
  }, "\u2022 ", e))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3"
  }, step > 1 && /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(step - 1),
    className: "flex-1 bg-gray-200 p-4 rounded-xl font-semibold"
  }, "\u2190 Previous"), step < 8 ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(step + 1),
    className: "flex-1 bg-orange-600 text-white p-4 rounded-xl font-semibold"
  }, "Next \u2192") : /*#__PURE__*/React.createElement("button", {
    onClick: handleSubmit,
    disabled: !managerSignature,
    className: `flex-1 p-4 rounded-xl font-semibold ${managerSignature ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-500'}`
  }, "Submit Steel ITP \u2713")));
}

// Emergency View

// Export to window for cross-file access
window.SteelITPView = SteelITPView;

// === js/components/view-emergency.jsx ===
// EmergencyView Component
// Extracted from views.jsx

// Other views: Emergency, Settings, Recordings
// Extracted from index.html

function EmergencyView() {
  const contacts = [{
    name: 'Emergency Services',
    number: '000',
    desc: 'Police, Fire, Ambulance'
  }, {
    name: 'SafeWork NSW',
    number: '13 10 50',
    desc: 'Report serious incidents'
  }, {
    name: 'Poisons Information',
    number: '13 11 26',
    desc: '24/7 advice'
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-red-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold flex items-center gap-2"
  }, "\uD83D\uDCDE Emergency Information"), /*#__PURE__*/React.createElement("p", {
    className: "text-red-100 text-sm mt-1"
  }, "Keep this information accessible")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm divide-y"
  }, contacts.map(contact => /*#__PURE__*/React.createElement("a", {
    key: contact.name,
    href: `tel:${contact.number.replace(/\s/g, '')}`,
    className: "p-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-gray-800"
  }, contact.name), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, contact.desc)), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-lg text-red-600"
  }, contact.number)))));
}
window.EmergencyView = EmergencyView;

// === js/components/view-settings.jsx ===
// SettingsView Component
// Extracted from views.jsx

// ========================================
// SYSTEM HEALTH CARD
// Shows error telemetry status in Settings
// ========================================
function SystemHealthCard() {
  const [health, setHealth] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [errors, setErrors] = useState([]);
  useEffect(() => {
    function refresh() {
      if (typeof ErrorTelemetry !== 'undefined') {
        setHealth(ErrorTelemetry.getHealth());
        if (showLog) {
          setErrors(ErrorTelemetry.getRecentErrors(20));
        }
      }
    }
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [showLog]);
  if (typeof ErrorTelemetry === 'undefined') return null;
  if (!health) return null;
  const statusColors = {
    healthy: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      dot: 'bg-green-500',
      label: 'Healthy'
    },
    degraded: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      dot: 'bg-yellow-500',
      label: 'Degraded'
    },
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      dot: 'bg-red-500',
      label: 'Critical'
    }
  };
  const s = statusColors[health.status] || statusColors.healthy;
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-base font-bold text-gray-800"
  }, "System Health"), /*#__PURE__*/React.createElement("span", {
    className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.border} border ${s.text}`
  }, /*#__PURE__*/React.createElement("span", {
    className: `w-2 h-2 rounded-full ${s.dot} mr-1.5`
  }), s.label)), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Errors (last hr)"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800"
  }, health.errorsLastHour)), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Total captured"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800"
  }, health.totalErrors)), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Sync queue"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800"
  }, health.syncQueueSize)), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Circuit breaker"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg font-bold text-gray-800 capitalize"
  }, health.circuitBreakerState || 'closed'))), health.lastSyncTime && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-400 mb-2"
  }, "Last sync: ", new Date(health.lastSyncTime).toLocaleTimeString()), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setShowLog(!showLog);
      if (!showLog) setErrors(ErrorTelemetry.getRecentErrors(20));
    },
    className: "w-full py-2 text-sm text-orange-600 font-medium rounded-lg bg-orange-50 active:bg-orange-100"
  }, showLog ? 'Hide Error Log' : 'View Error Log'), showLog && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 max-h-64 overflow-y-auto"
  }, errors.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-400 text-center py-3"
  }, "No errors recorded") : errors.map((err, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "border-b border-gray-100 py-2 last:border-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-medium text-red-600 flex-1"
  }, err.message || err.msg || 'Unknown error'), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-400 ml-2 whitespace-nowrap"
  }, err.timestamp ? new Date(err.timestamp).toLocaleTimeString() : '')), err.context && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-400 mt-0.5"
  }, err.context)))));
}
function SettingsView({
  sites = [],
  onUpdateSites,
  signatures = {},
  onUpdateSignatures,
  isAdmin = false,
  isDeviceAdmin = false,
  canViewDevices = false,
  canRevokeDevices = false,
  pendingDevices = [],
  approvedDevices = []
}) {
  const [newSite, setNewSite] = useState('');
  const [showAddSite, setShowAddSite] = useState(false);
  const [driveConnected, setDriveConnected] = useState(GoogleDriveSync.isConnected());
  const [driveError, setDriveError] = useState('');
  const [backupStatus, setBackupStatus] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(null); // Name of person to sign
  const [newMemberName, setNewMemberName] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);
  const [devices, setDevices] = useState({
    pending: [],
    approved: [],
    denied: []
  });
  const [pendingCount, setPendingCount] = useState(0);
  const [deviceActionLoading, setDeviceActionLoading] = useState(null);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [editingDeviceName, setEditingDeviceName] = useState('');
  const [storageInfo, setStorageInfo] = useState(null);
  const [fixStatus, setFixStatus] = useState('');
  const [isFixing, setIsFixing] = useState(false);
  const [fixDone, setFixDone] = useState(false);
  const currentSites = [...new Set(sites.length > 0 ? sites : FORM_CONSTANTS.defaultSites)];

  // Listen to device changes if admin, viewer, or has revoke permission
  useEffect(() => {
    if ((isAdmin || canViewDevices || canRevokeDevices) && isFirebaseConfigured) {
      const unsubscribe = DeviceAuthManager.listenToDevices(deviceData => {
        setDevices(deviceData);
        setPendingCount(deviceData.pending.length);
      });
      return () => unsubscribe();
    }
  }, [isAdmin, canViewDevices, canRevokeDevices]);

  // Listen for Google Drive connection status changes (real-time, no timeout)
  useEffect(() => {
    if (typeof GoogleDriveSync === 'undefined') return;
    let active = true;
    var unsubscribe = GoogleDriveSync.onConnectionChange((connected, error) => {
      if (!active) return;
      setDriveConnected(connected);
      if (error) {
        setDriveError(error);
      } else {
        setDriveError('');
      }
    });
    return () => {
      active = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);
  const handleApproveDevice = async deviceId => {
    setDeviceActionLoading(deviceId);
    const success = await DeviceAuthManager.approveDevice(deviceId);
    setDeviceActionLoading(null);
    if (!success) {
      ToastNotifier.error('Failed to approve device');
    }
  };
  const handleDenyDevice = async deviceId => {
    setDeviceActionLoading(deviceId);
    const success = await DeviceAuthManager.denyDevice(deviceId);
    setDeviceActionLoading(null);
    if (!success) {
      ToastNotifier.error('Failed to deny device');
    }
  };
  const handleRevokeDevice = async deviceId => {
    if (await ConfirmDialog.show('Are you sure you want to revoke access for this device?', {
      title: 'Revoke Device',
      confirmLabel: 'Revoke',
      destructive: true
    })) {
      setDeviceActionLoading(deviceId);
      const success = await DeviceAuth.revokeDevice(deviceId);
      setDeviceActionLoading(null);
      if (!success) {
        ToastNotifier.error('Failed to revoke device');
      }
    }
  };
  const handleRemoveDevice = async deviceId => {
    if (await ConfirmDialog.show('Are you sure you want to remove this device?', {
      title: 'Remove Device',
      confirmLabel: 'Remove',
      destructive: true
    })) {
      setDeviceActionLoading(deviceId);
      const success = await DeviceAuthManager.removeDevice(deviceId);
      setDeviceActionLoading(null);
      if (!success) {
        ToastNotifier.error('Failed to remove device');
      }
    }
  };
  const handleStartRename = device => {
    setEditingDeviceId(device.id);
    setEditingDeviceName(device.name || '');
  };
  const handleSaveRename = async deviceId => {
    if (!editingDeviceName.trim()) {
      ToastNotifier.warning('Device name cannot be empty');
      return;
    }
    setDeviceActionLoading(deviceId);
    const success = await DeviceAuthManager.renameDevice(deviceId, editingDeviceName);
    setDeviceActionLoading(null);
    setEditingDeviceId(null);
    setEditingDeviceName('');
    if (!success) {
      ToastNotifier.error('Failed to rename device');
    }
  };
  const handleCancelRename = () => {
    setEditingDeviceId(null);
    setEditingDeviceName('');
  };

  // Default team members from shared constants
  const defaultMembers = FORM_CONSTANTS.teamMembers;
  // Get all members (default + any custom added via signatures)
  const allMembers = [...new Set([...defaultMembers, ...Object.keys(signatures).filter(name => !defaultMembers.includes(name))])];
  const saveSignature = (name, signatureData) => {
    const newSignatures = {
      ...signatures,
      [name]: signatureData
    };
    onUpdateSignatures(newSignatures);
    setShowSignaturePad(null);
  };
  const deleteSignature = name => {
    const newSignatures = {
      ...signatures
    };
    delete newSignatures[name];
    onUpdateSignatures(newSignatures);
  };
  const addNewMember = () => {
    if (newMemberName.trim() && !allMembers.includes(newMemberName.trim())) {
      // Add member with empty signature (will show "Add Signature" button)
      const newSignatures = {
        ...signatures,
        [newMemberName.trim()]: null
      };
      onUpdateSignatures(newSignatures);
      setNewMemberName('');
      setShowAddMember(false);
    }
  };
  const deleteMember = name => {
    // Only allow deleting custom members (not in defaultMembers)
    if (!defaultMembers.includes(name)) {
      const newSignatures = {
        ...signatures
      };
      delete newSignatures[name];
      onUpdateSignatures(newSignatures);
    }
  };
  const addSite = () => {
    const trimmed = newSite.trim();
    if (trimmed) {
      const isDuplicate = currentSites.some(s => s.toLowerCase() === trimmed.toLowerCase());
      if (isDuplicate) {
        ToastNotifier.warning('This site already exists');
        return;
      }
      onUpdateSites([...currentSites, trimmed]);
      setNewSite('');
      setShowAddSite(false);
    }
  };
  const connectDrive = () => {
    setDriveError('');
    GoogleDriveSync.authorize();
    // Status updates come via onConnectionChange callback — no timeout needed
  };
  const disconnectDrive = () => {
    GoogleDriveSync.disconnect();
    setDriveConnected(false);
  };
  const backupNow = async () => {
    setIsBackingUp(true);
    setBackupStatus('Backing up...');
    try {
      const formsJson = localStorage.getItem('jmart-safety-forms');
      if (!formsJson) {
        setBackupStatus('No forms to backup');
        setIsBackingUp(false);
        return;
      }
      const forms = JSON.parse(formsJson);
      const result = await GoogleDriveSync.uploadDailyForms(forms);
      if (result.success) {
        setBackupStatus(`✅ Backed up ${result.uploaded} forms to Google Drive!`);
      } else {
        setBackupStatus('❌ Backup failed: ' + result.error);
      }
    } catch (error) {
      setBackupStatus('❌ Backup error: ' + error.message);
    }
    setIsBackingUp(false);
  };

  // --- Storage & Fix Everything ---
  const getStorageInfo = () => {
    var total = 0;
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key) continue;
      var val = localStorage.getItem(key);
      total += val ? val.length * 2 : 0;
    }
    var totalMB = (total / 1024 / 1024).toFixed(2);
    var pct = Math.min(Math.round(total / (5 * 1024 * 1024) * 100), 100);
    return {
      totalBytes: total,
      totalMB: totalMB,
      pct: pct
    };
  };
  useEffect(() => {
    setStorageInfo(getStorageInfo());
  }, []);
  const doFixEverything = async () => {
    if (!(await ConfirmDialog.show('This will strip photos from local cache and clear temp data.\n\nYour forms and credentials are preserved.\nPhotos are safe in Firebase & Drive.\n\nContinue?', {
      title: 'Clear Cache',
      confirmLabel: 'Continue'
    }))) return;
    setIsFixing(true);
    setFixDone(false);
    setFixStatus('Starting...');
    var steps = [];
    var beforeInfo = getStorageInfo();
    try {
      // 1. Delete ALL browser caches
      setFixStatus('Step 1/6: Clearing caches...');
      var cacheNames = await caches.keys();
      for (var i = 0; i < cacheNames.length; i++) {
        await caches.delete(cacheNames[i]);
      }
      steps.push('Deleted ' + cacheNames.length + ' cache(s)');

      // 2. Strip base64 photos from forms (the #1 storage bomb)
      setFixStatus('Step 2/6: Stripping photos from forms...');
      var strippedCount = 0;
      try {
        var formsRaw = localStorage.getItem('jmart-safety-forms');
        if (formsRaw && formsRaw.length > 10000) {
          var forms = JSON.parse(formsRaw);
          var stripped = JSON.parse(JSON.stringify(forms, function (key, value) {
            if (typeof value !== 'string') return value;
            if (value.length > 500 && (value.indexOf('data:') === 0 || value.indexOf('/9j/') === 0 || value.indexOf('iVBOR') === 0 || value.indexOf('JVBER') === 0)) {
              strippedCount++;
              return '[in-firebase]';
            }
            if (value.length > 5000) return value.substring(0, 200) + '...[truncated]';
            return value;
          }));
          stripped.sort(function (a, b) {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          });
          if (stripped.length > 50) stripped = stripped.slice(0, 50);
          localStorage.setItem('jmart-safety-forms', JSON.stringify(stripped));
          steps.push('Stripped ' + strippedCount + ' photos, kept ' + stripped.length + ' forms');
        } else {
          steps.push('Forms already small');
        }
      } catch (e) {
        steps.push('Forms error: ' + e.message);
      }

      // 3. Clear sync queue, audit log, photo queue, recordings
      setFixStatus('Step 3/6: Clearing sync queue & temp data...');
      var nuked = 0;
      ['jmart-sync-queue', 'jmart-audit-log', 'jmart-photo-queue', 'jmart-job-recordings', 'jmart-backed-up-forms', 'jmart-team-signatures'].forEach(function (k) {
        try {
          if (localStorage.getItem(k)) {
            localStorage.removeItem(k);
            nuked++;
          }
        } catch (e) {}
      });
      steps.push('Cleared ' + nuked + ' data store(s)');

      // 4. Clear temp/cache/draft/backup keys
      setFixStatus('Step 4/6: Removing temp keys...');
      var tempKeys = [];
      for (var j = localStorage.length - 1; j >= 0; j--) {
        var lsKey = localStorage.key(j);
        if (lsKey && (lsKey.includes('temp') || lsKey.includes('cache') || lsKey.includes('draft') || lsKey.includes('cdn-retry') || lsKey.includes('backup'))) {
          tempKeys.push(lsKey);
        }
      }
      tempKeys.forEach(function (k) {
        try {
          localStorage.removeItem(k);
        } catch (e) {}
      });
      steps.push('Removed ' + tempKeys.length + ' temp key(s)');

      // 5. Clear session storage
      setFixStatus('Step 5/6: Clearing session data...');
      sessionStorage.clear();
      steps.push('Session cleared');

      // 6. Reset Firebase connection state
      setFixStatus('Step 6/6: Resetting Firebase connection...');
      try {
        localStorage.removeItem('firebase:previous_websocket_failure');
      } catch (e) {}
      steps.push('Firebase connection reset');

      // Done
      var afterInfo = getStorageInfo();
      var freedMB = (parseFloat(beforeInfo.totalMB) - parseFloat(afterInfo.totalMB)).toFixed(2);
      setStorageInfo(afterInfo);
      setFixStatus('Freed ' + freedMB + ' MB (' + beforeInfo.totalMB + ' MB \u2192 ' + afterInfo.totalMB + ' MB). ' + steps.join('. '));
      setFixDone(true);
    } catch (e) {
      setFixStatus('Error: ' + e.message + '. Steps done: ' + steps.join(', '));
    }
    setIsFixing(false);
  };
  const lastBackup = localStorage.getItem('last-drive-backup-date');
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold text-gray-800 flex items-center gap-2"
  }, "\u2699\uFE0F Settings"), isDeviceAdmin && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-green-600 mt-1"
  }, "\uD83D\uDEE1\uFE0F Admin Mode - You can manage device access")), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDD10"), " This Device"), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-3 space-y-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-500"
  }, "Type:"), " ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, DeviceAuth.deviceInfo?.type)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-500"
  }, "Browser:"), " ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, DeviceAuth.deviceInfo?.browser)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-500"
  }, "Screen:"), " ", /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, DeviceAuth.deviceInfo?.screen)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-400 mt-2"
  }, "Device ID: ", DeviceAuth.deviceId))), (isAdmin || canViewDevices || canRevokeDevices) && isFirebaseConfigured && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDCF1"), " Connected Devices", isAdmin && pendingCount > 0 && /*#__PURE__*/React.createElement("span", {
    className: "bg-red-500 text-white text-xs px-2 py-0.5 rounded-full"
  }, pendingCount, " pending"), !isAdmin && !canRevokeDevices && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-400"
  }, "(View only)")), devices.pending.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-yellow-700 mb-2"
  }, "\u23F3 Pending Approval (", devices.pending.length, ")"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, devices.pending.map(device => /*#__PURE__*/React.createElement("div", {
    key: device.id,
    className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, editingDeviceId === device.id ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: editingDeviceName,
    onChange: e => setEditingDeviceName(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') handleSaveRename(device.id);
      if (e.key === 'Escape') handleCancelRename();
    },
    className: "border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-0",
    autoFocus: true,
    maxLength: 30
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleSaveRename(device.id),
    className: "text-green-600 text-sm font-medium px-2",
    disabled: deviceActionLoading === device.id
  }, deviceActionLoading === device.id ? '...' : '✓'), /*#__PURE__*/React.createElement("button", {
    onClick: handleCancelRename,
    className: "text-gray-400 text-sm font-medium px-1"
  }, "\u2715")) : /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-gray-800 flex items-center gap-2"
  }, device.name || 'Unknown Device', isAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => handleStartRename(device),
    className: "text-gray-400 hover:text-gray-600 text-xs ml-1",
    title: "Rename device"
  }, "\u270F\uFE0F")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Requested: ", new Date(device.registeredAt).toLocaleDateString('en-AU'))), isAdmin && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleApproveDevice(device.id),
    className: "bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium"
  }, "\u2713 Approve"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDenyDevice(device.id),
    className: "bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium"
  }, "\u2715 Deny"))))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-green-700 mb-2"
  }, "\u2713 Approved Devices (", devices.approved.length, ")"), devices.approved.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, "No approved devices yet") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, devices.approved.map(device => /*#__PURE__*/React.createElement("div", {
    key: device.id,
    className: "bg-green-50 border border-green-200 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, editingDeviceId === device.id ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: editingDeviceName,
    onChange: e => setEditingDeviceName(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') handleSaveRename(device.id);
      if (e.key === 'Escape') handleCancelRename();
    },
    className: "border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-0",
    autoFocus: true,
    maxLength: 30
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleSaveRename(device.id),
    className: "text-green-600 text-sm font-medium px-2",
    disabled: deviceActionLoading === device.id
  }, deviceActionLoading === device.id ? '...' : '✓'), /*#__PURE__*/React.createElement("button", {
    onClick: handleCancelRename,
    className: "text-gray-400 text-sm font-medium px-1"
  }, "\u2715")) : /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-gray-800 flex items-center gap-2"
  }, device.name || 'Unknown Device', device.isAdmin && /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-orange-500 text-white px-2 py-0.5 rounded"
  }, "Admin"), device.canViewDevices && !device.isAdmin && /*#__PURE__*/React.createElement("span", {
    className: "text-xs bg-blue-500 text-white px-2 py-0.5 rounded"
  }, "Viewer"), isAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => handleStartRename(device),
    className: "text-gray-400 hover:text-gray-600 text-xs ml-1",
    title: "Rename device"
  }, "\u270F\uFE0F")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Last seen: ", device.lastSeen ? new Date(device.lastSeen).toLocaleString('en-AU') : 'Never')), isAdmin && !device.isAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => handleRemoveDevice(device.id),
    className: "text-red-500 text-sm ml-2"
  }, "\uD83D\uDDD1\uFE0F")))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-gray-200"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, "Your Device ID: ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, DeviceAuthManager.deviceId)))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDCC1"), " Google Drive Backup"), !isGoogleDriveConfigured ? /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-yellow-800 font-medium"
  }, "\u26A0\uFE0F Google Drive not configured"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-yellow-700 mt-1"
  }, "Contact your admin to set up Google Drive integration")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `w-3 h-3 rounded-full ${driveConnected ? 'bg-green-500' : 'bg-gray-300'}`
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-600"
  }, driveConnected ? 'Connected' : 'Not connected')), driveConnected ? /*#__PURE__*/React.createElement("button", {
    onClick: disconnectDrive,
    className: "text-red-600 text-sm underline"
  }, "Disconnect") : /*#__PURE__*/React.createElement("button", {
    onClick: connectDrive,
    className: "bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
  }, "Connect Google Drive")), driveError && !driveConnected && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 rounded-lg p-2 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-red-700"
  }, "\u274C ", driveError)), driveConnected && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-50 rounded-lg p-3 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Auto-backup:"), " Every day at 7:00 PM"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Folder:"), " ", DRIVE_FOLDER_NAME), lastBackup && /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, "Last backup:"), " ", lastBackup)), /*#__PURE__*/React.createElement("button", {
    onClick: backupNow,
    disabled: isBackingUp,
    className: `w-full py-3 rounded-lg text-white font-medium ${isBackingUp ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`
  }, isBackingUp ? '⏳ Backing up...' : '☁️ Backup Now'), backupStatus && /*#__PURE__*/React.createElement("p", {
    className: `text-sm mt-2 text-center ${backupStatus.includes('✅') ? 'text-green-600' : backupStatus.includes('❌') ? 'text-red-600' : 'text-gray-600'}`
  }, backupStatus)))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "\uD83C\uDFD7\uFE0F Sites"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddSite(!showAddSite),
    className: "bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
  }, "+ Add Site")), showAddSite && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: newSite,
    onChange: e => setNewSite(e.target.value),
    className: "flex-1 border rounded-lg p-2 text-sm",
    placeholder: "Enter site name"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addSite,
    className: "bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
  }, "Add")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, currentSites.map(site => /*#__PURE__*/React.createElement("div", {
    key: site,
    className: "flex items-center justify-between p-2 bg-gray-50 rounded-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-gray-700"
  }, site), /*#__PURE__*/React.createElement("button", {
    onClick: () => onUpdateSites(currentSites.filter(s => s !== site)),
    className: "text-red-500"
  }, "\uD83D\uDDD1\uFE0F"))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "\u270D\uFE0F Team Signatures"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowAddMember(!showAddMember),
    className: "bg-green-600 text-white px-3 py-1 rounded-lg text-sm"
  }, "+ Add Member")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mb-3"
  }, "Save signatures once and use them automatically in all forms"), showAddMember && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: newMemberName,
    onChange: e => setNewMemberName(e.target.value),
    className: "flex-1 border rounded-lg p-2 text-sm",
    placeholder: "Enter team member name"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: addNewMember,
    className: "bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
  }, "Add")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, allMembers.map(name => /*#__PURE__*/React.createElement("div", {
    key: name,
    className: "flex items-center justify-between p-3 bg-gray-50 rounded-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium text-gray-700"
  }, name), signatures[name] ? /*#__PURE__*/React.createElement("img", {
    src: signatures[name],
    alt: `${name}'s signature`,
    className: "h-8 border rounded bg-white px-2"
  }) : /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-gray-400 italic"
  }, "No signature saved")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowSignaturePad(name),
    className: `px-3 py-1 rounded-lg text-sm ${signatures[name] ? 'bg-orange-100 text-orange-600' : 'bg-green-600 text-white'}`
  }, signatures[name] ? '✏️ Update' : '➕ Add'), signatures[name] && /*#__PURE__*/React.createElement("button", {
    onClick: () => deleteSignature(name),
    className: "text-red-500 text-lg"
  }, "\uD83D\uDDD1\uFE0F"), !defaultMembers.includes(name) && /*#__PURE__*/React.createElement("button", {
    onClick: () => deleteMember(name),
    className: "text-red-500 text-xs underline ml-1"
  }, "Remove")))))), showSignaturePad && /*#__PURE__*/React.createElement(SignaturePad, {
    name: showSignaturePad,
    onSave: sig => saveSignature(showSignaturePad, sig),
    onCancel: () => setShowSignaturePad(null)
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDD27"), " Storage & Maintenance"), storageInfo && /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-sm mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-gray-600"
  }, "Local Storage"), /*#__PURE__*/React.createElement("span", {
    className: "font-medium"
  }, storageInfo.totalMB, " MB / 5 MB")), /*#__PURE__*/React.createElement("div", {
    className: "bg-gray-200 rounded-full h-3 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full rounded-full transition-all ${storageInfo.pct > 90 ? 'bg-red-500' : storageInfo.pct > 70 ? 'bg-yellow-500' : 'bg-green-500'}`,
    style: {
      width: Math.max(storageInfo.pct, 2) + '%'
    }
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-400 mt-1"
  }, storageInfo.pct, "% used")), /*#__PURE__*/React.createElement("button", {
    onClick: doFixEverything,
    disabled: isFixing,
    className: `w-full py-3 rounded-lg text-white font-bold text-base ${isFixing ? 'bg-gray-400' : 'bg-red-600 active:bg-red-700'}`
  }, isFixing ? 'Working...' : 'Fix Everything'), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 mt-2 text-center"
  }, "Strips photos from cache, clears temp data & caches. Forms & credentials preserved."), fixStatus && /*#__PURE__*/React.createElement("div", {
    className: `mt-3 p-3 rounded-lg text-sm ${fixDone ? 'bg-green-50 border border-green-200 text-green-700' : isFixing ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-red-50 border border-red-200 text-red-700'}`
  }, fixStatus), fixDone && /*#__PURE__*/React.createElement("button", {
    onClick: () => window.location.reload(),
    className: "w-full mt-2 py-3 rounded-lg bg-orange-600 active:bg-orange-700 text-white font-bold text-base"
  }, "Reload App")), /*#__PURE__*/React.createElement(SystemHealthCard, null), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl shadow-sm p-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "J&M Artsteel Safety App v1.0"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-600"
  }, "NSW WHS Act 2011 Compliant")));
}
window.SettingsView = SettingsView;

// === js/components/view-recordings.jsx ===
// RecordingsView Component
// Extracted from views.jsx

function RecordingsView({
  forms,
  sites
}) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [savedRecordings, setSavedRecordings] = useState(() => {
    try {
      const saved = localStorage.getItem('jmart-job-recordings');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('Could not parse job recordings:', e);
      return [];
    }
  });
  const [viewingRecording, setViewingRecording] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Smart job detection - find today's prestart
  useEffect(() => {
    if (!selectedJob) {
      const today = new Date().toDateString();
      const todaysPrestarts = forms.filter(f => f.type === 'prestart' && new Date(f.createdAt).toDateString() === today);
      if (todaysPrestarts.length > 0) {
        // Get the most recent prestart from today
        const latestPrestart = todaysPrestarts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        setSelectedJob({
          id: latestPrestart.id,
          name: latestPrestart.data?.siteConducted || 'Unknown Site',
          date: latestPrestart.createdAt,
          type: 'prestart'
        });
      }
    }
  }, [forms, selectedJob]);

  // Get available jobs from prestarts and sites
  const getAvailableJobs = () => {
    const jobs = [];

    // Add jobs from recent prestarts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    forms.filter(f => f.type === 'prestart' && new Date(f.createdAt) > sevenDaysAgo).forEach(prestart => {
      const siteName = prestart.data?.siteConducted || 'Unknown Site';
      const dateStr = new Date(prestart.createdAt).toLocaleDateString('en-AU');
      jobs.push({
        id: prestart.id,
        name: siteName,
        date: prestart.createdAt,
        label: `${siteName} (${dateStr})`,
        type: 'prestart'
      });
    });

    // Add available sites (for manual selection)
    const defaultSites = sites.length > 0 ? sites : ['Site 1 - Sydney CBD', 'Site 2 - Parramatta', 'Site 3 - North Sydney'];
    defaultSites.forEach(site => {
      // Only add if not already in the list from prestarts
      if (!jobs.find(j => j.name === site)) {
        jobs.push({
          id: `site-${site}`,
          name: site,
          date: new Date().toISOString(),
          label: `${site} (No prestart today)`,
          type: 'site'
        });
      }
    });
    return jobs;
  };

  // Compress image
  const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = event => {
        const img = new Image();
        img.onload = () => {
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
          resolve(compressedData);
        };
        img.onerror = () => resolve(event.target.result);
        img.src = event.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  // Handle photo capture
  const handlePhotoCapture = async e => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        const compressedData = await compressImage(file);
        if (compressedData) {
          const newPhoto = {
            id: Date.now() + Math.random(),
            name: file.name,
            data: compressedData,
            timestamp: new Date().toISOString()
          };
          setPhotos(prev => [...prev, newPhoto]);
        }
      }
    }
    e.target.value = '';
  };

  // Remove photo
  const removePhoto = photoId => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // Save recording locally
  const saveRecordingLocally = () => {
    if (!selectedJob || photos.length === 0) return;
    const recording = {
      id: Date.now(),
      jobId: selectedJob.id,
      jobName: selectedJob.name,
      date: new Date().toISOString(),
      photos: photos,
      driveUploaded: false
    };
    const updatedRecordings = [recording, ...savedRecordings];
    setSavedRecordings(updatedRecordings);
    if (typeof StorageQuotaManager !== 'undefined' && StorageQuotaManager.safeRecordingsWrite) {
      StorageQuotaManager.safeRecordingsWrite(updatedRecordings);
    } else {
      localStorage.setItem('jmart-job-recordings', JSON.stringify(updatedRecordings));
    }
    setPhotos([]);
    setUploadStatus('Saved locally!');
    setTimeout(() => setUploadStatus(''), 3000);
  };

  // Upload to Google Drive
  const uploadToDrive = async () => {
    if (!selectedJob || photos.length === 0) return;
    if (!GoogleDriveSync.isConnected()) {
      setUploadStatus('Please connect Google Drive in Settings first');
      return;
    }
    setIsUploading(true);
    setUploadStatus('Uploading to Google Drive...');
    try {
      const result = await GoogleDriveSync.uploadJobPhotos(photos, selectedJob.name, new Date());
      if (result.success) {
        // Save recording with drive upload status
        const recording = {
          id: Date.now(),
          jobId: selectedJob.id,
          jobName: selectedJob.name,
          date: new Date().toISOString(),
          photos: photos,
          driveUploaded: true,
          driveResults: result.results
        };
        const updatedRecordings = [recording, ...savedRecordings];
        setSavedRecordings(updatedRecordings);
        if (typeof StorageQuotaManager !== 'undefined' && StorageQuotaManager.safeRecordingsWrite) {
          StorageQuotaManager.safeRecordingsWrite(updatedRecordings);
        } else {
          localStorage.setItem('jmart-job-recordings', JSON.stringify(updatedRecordings));
        }
        setPhotos([]);
        setUploadStatus(`Uploaded ${result.uploaded} photos to Google Drive!`);
      } else {
        setUploadStatus('Upload failed: ' + result.error);
      }
    } catch (error) {
      setUploadStatus('Upload error: ' + error.message);
    }
    setIsUploading(false);
    setTimeout(() => setUploadStatus(''), 5000);
  };

  // Download photos individually
  const downloadPhotos = () => {
    const downloadable = photos.filter(p => p.data && p.data !== '[in-firebase]');
    if (downloadable.length === 0) {
      ToastNotifier.info('No photos available for local download — they are in the cloud');
      return;
    }
    downloadable.forEach((photo, idx) => {
      downloadPhotoFile(photo.data, `${selectedJob?.name || 'job'}-photo-${idx + 1}.jpg`);
    });
    setUploadStatus(`Downloaded ${downloadable.length} photos!`);
    setTimeout(() => setUploadStatus(''), 3000);
  };

  // Delete saved recording
  const deleteRecording = recordingId => {
    const updatedRecordings = savedRecordings.filter(r => r.id !== recordingId);
    setSavedRecordings(updatedRecordings);
    if (typeof StorageQuotaManager !== 'undefined' && StorageQuotaManager.safeRecordingsWrite) {
      StorageQuotaManager.safeRecordingsWrite(updatedRecordings);
    } else {
      localStorage.setItem('jmart-job-recordings', JSON.stringify(updatedRecordings));
    }
    setViewingRecording(null);
  };
  const todayDate = new Date().toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-4 text-white"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl font-bold flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCF8"), " Job Recordings"), /*#__PURE__*/React.createElement("p", {
    className: "text-teal-100 text-sm mt-1"
  }, "Capture and save photos for your job"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center gap-2 text-sm"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC5"), /*#__PURE__*/React.createElement("span", null, todayDate))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "Current Job"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowJobSelector(!showJobSelector),
    className: "text-teal-600 text-sm underline"
  }, "Change")), selectedJob ? /*#__PURE__*/React.createElement("div", {
    className: "bg-teal-50 border border-teal-200 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, selectedJob.type === 'prestart' ? '📋' : '🏗️'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-teal-800"
  }, selectedJob.name), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-teal-600"
  }, selectedJob.type === 'prestart' ? 'Prestart completed' : 'Manual selection', " - ", new Date(selectedJob.date).toLocaleDateString('en-AU'))))) : /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-yellow-800 text-sm"
  }, "No job detected for today. Please select a job.")), showJobSelector && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-2 max-h-48 overflow-y-auto"
  }, getAvailableJobs().map(job => /*#__PURE__*/React.createElement("button", {
    key: job.id,
    onClick: () => {
      setSelectedJob(job);
      setShowJobSelector(false);
    },
    className: `w-full text-left p-3 rounded-lg border transition ${selectedJob?.id === job.id ? 'bg-teal-100 border-teal-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, job.type === 'prestart' ? '📋' : '🏗️'), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-medium"
  }, job.label)))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3"
  }, "Take Photos"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mb-4"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => cameraInputRef.current?.click(),
    className: "flex-1 bg-teal-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCF7"), " Camera"), /*#__PURE__*/React.createElement("button", {
    onClick: () => galleryInputRef.current?.click(),
    className: "flex-1 bg-purple-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDDBC\uFE0F"), " Gallery"), /*#__PURE__*/React.createElement("input", {
    ref: cameraInputRef,
    type: "file",
    accept: "image/*",
    capture: "environment",
    onChange: handlePhotoCapture,
    className: "hidden"
  }), /*#__PURE__*/React.createElement("input", {
    ref: galleryInputRef,
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: handlePhotoCapture,
    className: "hidden"
  })), photos.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-gray-700"
  }, photos.length, " photo(s) ready"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setPhotos([]),
    className: "text-red-500 text-sm underline"
  }, "Clear all")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-2"
  }, photos.map(photo => /*#__PURE__*/React.createElement("div", {
    key: photo.id,
    className: "relative"
  }, photo.data && photo.data !== '[in-firebase]' && photo.data.startsWith('data:') ? /*#__PURE__*/React.createElement("img", {
    src: photo.data,
    alt: "captured",
    className: "w-full h-16 object-cover rounded-lg"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "w-full h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400"
  }, "\u2601\uFE0F"), /*#__PURE__*/React.createElement("button", {
    onClick: () => removePhoto(photo.id),
    className: "absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
  }, "\u2715")))))), photos.length > 0 && selectedJob && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm space-y-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800"
  }, "Save Photos"), /*#__PURE__*/React.createElement("button", {
    onClick: downloadPhotos,
    className: "w-full bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCE5"), " Download to Phone"), /*#__PURE__*/React.createElement("button", {
    onClick: saveRecordingLocally,
    className: "w-full bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCBE"), " Save in App"), /*#__PURE__*/React.createElement("button", {
    onClick: uploadToDrive,
    disabled: isUploading || !GoogleDriveSync.isConnected(),
    className: `w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${GoogleDriveSync.isConnected() ? 'bg-orange-600 text-white' : 'bg-gray-300 text-gray-500'}`
  }, isUploading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "animate-spin"
  }, "\u23F3"), " Uploading...") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\u2601\uFE0F"), " Upload to Google Drive")), !GoogleDriveSync.isConnected() && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500 text-center"
  }, "Connect Google Drive in Settings to enable cloud upload")), uploadStatus && /*#__PURE__*/React.createElement("div", {
    className: `p-3 rounded-lg text-center ${uploadStatus.includes('error') || uploadStatus.includes('failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`
  }, uploadStatus), savedRecordings.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-xl p-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-semibold text-gray-800 mb-3"
  }, "Saved Recordings"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, savedRecordings.slice(0, 10).map(recording => /*#__PURE__*/React.createElement("button", {
    key: recording.id,
    onClick: () => setViewingRecording(recording),
    className: "w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDCF8"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-medium text-gray-800"
  }, recording.jobName), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gray-500"
  }, new Date(recording.date).toLocaleDateString('en-AU'), " - ", recording.photos.length, " photos"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, recording.driveUploaded && /*#__PURE__*/React.createElement("span", {
    className: "text-green-500 text-sm"
  }, "\u2601\uFE0F"), /*#__PURE__*/React.createElement("span", {
    className: "text-gray-400"
  }, "\u203A"))))))), viewingRecording && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-teal-600 text-white p-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-lg font-bold"
  }, viewingRecording.jobName), /*#__PURE__*/React.createElement("button", {
    onClick: () => setViewingRecording(null),
    className: "text-white text-2xl"
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 overflow-y-auto p-4 space-y-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-gray-500"
  }, new Date(viewingRecording.date).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })), viewingRecording.driveUploaded && /*#__PURE__*/React.createElement("div", {
    className: "bg-green-50 border border-green-200 rounded-lg p-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-green-700 text-sm"
  }, "\u2601\uFE0F Uploaded to Google Drive")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-2"
  }, viewingRecording.photos.map((photo, idx) => photo.data && photo.data !== '[in-firebase]' && photo.data.startsWith('data:') ? /*#__PURE__*/React.createElement("img", {
    key: idx,
    src: photo.data,
    alt: `Photo ${idx + 1}`,
    className: "w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80",
    onClick: () => {
      const win = window.open('', '_blank');
      if (!win) {
        const link = document.createElement('a');
        link.href = photo.data;
        link.download = `photo-${idx + 1}.jpg`;
        link.click();
        return;
      }
      const img = win.document.createElement('img');
      img.src = photo.data;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      win.document.body.appendChild(img);
    }
  }) : /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400"
  }, "\u2601\uFE0F In cloud")))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 border-t border-gray-200 space-y-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      viewingRecording.photos.forEach((photo, idx) => {
        downloadPhotoFile(photo.data, `${viewingRecording.jobName}-photo-${idx + 1}.jpg`);
      });
    },
    className: "w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCE5"), " Download All Photos"), /*#__PURE__*/React.createElement("button", {
    onClick: () => deleteRecording(viewingRecording.id),
    className: "w-full bg-red-100 text-red-600 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDDD1\uFE0F"), " Delete Recording")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-50 border border-blue-200 rounded-xl p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl"
  }, "\uD83D\uDCA1"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-blue-800"
  }, "Storage Info"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-blue-700 mt-1"
  }, "Photos are saved to your phone and can be uploaded to Google Drive. Firebase/Drive has plenty of space (~5GB free, affordable beyond that).")))));
}

// Export to window for cross-file access
window.RecordingsView = RecordingsView;

// === js/components/bootstrap.jsx ===
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