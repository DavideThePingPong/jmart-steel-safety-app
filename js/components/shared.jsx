// Shared components: Icon, LucideIcon, SignaturePad, NoteMediaBox
// Extracted from index.html

// React hooks and Lucide icons - attached to window for cross-file access
const { useState, useRef, useEffect, useMemo } = React;
window.useState = useState;
window.useRef = useRef;
window.useEffect = useEffect;
window.useMemo = useMemo;

const {
  Shield, ClipboardCheck, AlertTriangle, Users, Plus, ChevronRight, ChevronLeft,
  Check, X, Calendar, User, MapPin, Building, Wrench, AlertCircle, CheckCircle,
  Home, Menu, Bell, Settings, Trash2, Phone, Edit3, Copy, Clock, Download,
  FileText, Camera, Image: LucideImage, StickyNote, Clipboard
} = lucide;

// Icon component wrapper
function Icon({ icon, size = 24, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && icon) {
      ref.current.innerHTML = '';
      const svg = icon;
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      if (className) {
        className.split(' ').forEach(c => c && svg.classList.add(c));
      }
      ref.current.appendChild(svg.cloneNode(true));
    }
  }, [icon, size, className]);
  return <span ref={ref} style={{display: 'inline-flex', alignItems: 'center'}}></span>;
}

// Simple icon rendering function
function LucideIcon({ name, size = 24, className = "" }) {
  const iconRef = useRef(null);
  useEffect(() => {
    if (iconRef.current) {
      iconRef.current.innerHTML = '';
      lucide.createIcons({
        icons: { [name]: lucide.icons[name] },
        attrs: { width: size, height: size, class: className }
      });
    }
  }, [name, size, className]);
  return <i ref={iconRef} data-lucide={name} style={{width: size, height: size}}></i>;
}

// Signature Pad Component
function SignaturePad({ onSave, onCancel, name }) {
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

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getCoordinates(e);
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
  const getVerificationCode = (memberName) => {
    let hash = 0;
    const str = memberName.toLowerCase().replace(/\s/g, '');
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
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
  const useOtherSignature = (memberName) => {
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
  const membersWithSignatures = Object.entries(savedSignatures)
    .filter(([_, sig]) => sig && sig.startsWith('data:image'))
    .map(([memberName]) => memberName);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-800">Sign: {name}</h3>
          <p className="text-sm text-gray-500">Draw your signature below or use a saved one</p>
        </div>

        {/* Verification Modal */}
        {showVerification && (
          <div className="p-4 bg-amber-50 border-b border-amber-200">
            <p className="text-sm text-amber-800 mb-2 font-medium">🔐 Signature Verification Required</p>
            <p className="text-xs text-amber-700 mb-3">
              To use {selectedMember}'s saved signature, please enter your personal verification code.
              <br/>
              <span className="text-amber-600">(Hint: Your code is based on your name)</span>
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-digit code"
              className="w-full border border-amber-300 rounded-lg px-3 py-2 mb-2 text-center text-lg tracking-widest"
            />
            {verificationError && (
              <p className="text-red-600 text-sm mb-2">{verificationError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowVerification(false); setVerificationCode(''); setVerificationError(''); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={verifyAndApplySignature}
                className="flex-1 bg-amber-600 text-white py-2 rounded-lg font-medium"
              >
                Verify & Sign
              </button>
            </div>
          </div>
        )}

        {/* Saved Signature Option - only show if not in verification mode */}
        {hasSavedSignature && !showVerification && (
          <div className="p-4 bg-green-50 border-b border-green-100">
            <p className="text-sm text-green-700 mb-2">✓ {name} has a saved signature</p>
            <button
              onClick={useSavedSignature}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <span>✍️</span> Use Saved Signature (requires verification)
            </button>
          </div>
        )}

        {/* Info about signature security */}
        {membersWithSignatures.length > 1 && !showVerification && (
          <div className="px-4 pt-3">
            <p className="text-xs text-gray-500 italic">
              🔒 Security: Each team member must sign their own signature.
              Saved signatures require verification before use.
            </p>
          </div>
        )}

        <div className="p-4">
          <p className="text-xs text-gray-500 mb-2">Or draw a new signature:</p>
          <div className="border-2 border-gray-300 rounded-lg bg-gray-50 relative">
            <canvas ref={canvasRef} width={350} height={150} className="w-full touch-none"
              onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
              onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
            <div className="absolute bottom-2 left-2 right-2 border-t border-gray-400"></div>
            <span className="absolute bottom-3 left-3 text-xs text-gray-400">Sign here</span>
          </div>
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={clearSignature} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg">Clear</button>
          <button onClick={onCancel} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg">Cancel</button>
          <button onClick={saveSignature} disabled={!hasSignature} className="flex-1 bg-green-600 text-white py-2 rounded-lg disabled:bg-gray-300">Save</button>
        </div>
      </div>
    </div>
  );
}

// Note Media Box Component
function NoteMediaBox({ label, iconName, value, notes, media, onValueChange, onAddNote, onAddMedia, onRemoveNote, onRemoveMedia }) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNote, setNewNote] = useState('');

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
      setShowNoteInput(false);
    }
  };

  const handleMediaCapture = (e) => {
    const files = e.target.files;
    console.log('handleMediaCapture called, files:', files?.length);
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        console.log('Processing file:', file.name, 'type:', file.type, 'size:', file.size);

        // Compress image before storing to avoid localStorage quota issues on mobile
        const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
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
                    height = (height * maxWidth) / width;
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
            reader.onerror = (err) => {
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
                height = (height * maxWidth) / width;
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
          img.onerror = (err) => {
            console.error('Image load error:', err);
            resolve(dataUrl); // Use original if image fails to load
          };
          // Set crossOrigin before src to avoid CORS issues
          img.crossOrigin = 'anonymous';
          img.src = dataUrl;
        };

        compressImage(file).then(compressedData => {
          console.log('compressImage resolved, data:', compressedData ? 'yes' : 'no');
          if (compressedData) {
            console.log('Calling onAddMedia with data');
            onAddMedia({ name: file.name, type: 'image/jpeg', data: compressedData });
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

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
      <h4 className="font-semibold text-gray-800 text-orange-600">{label}</h4>
      <textarea value={value} onChange={(e) => onValueChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg p-3 text-sm min-h-[80px]"
        placeholder={`Enter ${label.toLowerCase()}...`} />
      <div className="flex gap-2">
        <button onClick={() => setShowNoteInput(!showNoteInput)}
          className="flex-1 bg-blue-50 border border-blue-200 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium">
          📝 Add Note
        </button>
        <button onClick={() => cameraInputRef.current?.click()}
          className="flex-1 bg-purple-50 border border-purple-200 text-purple-700 py-2 px-3 rounded-lg text-sm font-medium">
          📷 Camera
        </button>
        <button onClick={() => galleryInputRef.current?.click()}
          className="flex-1 bg-green-50 border border-green-200 text-green-700 py-2 px-3 rounded-lg text-sm font-medium">
          🖼️ Gallery
        </button>
        {/* Camera input - with capture attribute to open camera */}
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleMediaCapture} className="hidden" />
        {/* Gallery input - without capture attribute to open photo library */}
        <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleMediaCapture} className="hidden" />
      </div>
      {showNoteInput && (
        <div className="flex gap-2">
          <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg p-2 text-sm" placeholder="Type your note..."
            onKeyPress={(e) => e.key === 'Enter' && handleAddNote()} />
          <button onClick={handleAddNote} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Add</button>
        </div>
      )}
      {notes && notes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase">Notes:</p>
          {notes.map((note, idx) => (
            <div key={idx} className="flex items-start justify-between bg-blue-50 p-2 rounded-lg">
              <p className="text-sm text-blue-800">{note}</p>
              <button onClick={() => onRemoveNote(idx)} className="text-blue-500 ml-2">✕</button>
            </div>
          ))}
        </div>
      )}
      {media && media.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase">Photos:</p>
          <div className="grid grid-cols-3 gap-2">
            {media.map((item, idx) => (
              <div key={idx} className="relative">
                <img src={item.data} alt={item.name} className="w-full h-20 object-cover rounded-lg" />
                <button onClick={() => onRemoveMedia(idx)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
