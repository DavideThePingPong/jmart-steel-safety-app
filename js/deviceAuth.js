// Device Authorization System
// Extracted from index.html for maintainability
// ========================================
// DEVICE AUTHORIZATION SYSTEM
// ========================================
// Controls which devices can access the app
// First device to register becomes admin
// New devices require admin approval
// ========================================
const DeviceAuth = {
  deviceId: null,
  deviceInfo: null,
  isApproved: false,
  isAdmin: false,
  canViewDevices: false,
  canRevokeDevices: false,
  pendingDevices: [],
  approvedDevices: [],
  statusListeners: [],
  notificationListeners: [],

  // Generate unique device fingerprint
  generateDeviceId: function() {
    const stored = localStorage.getItem('jmart-device-id');
    if (stored) {
      this.deviceId = stored;
      return stored;
    }

    // Create fingerprint from browser characteristics
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('JMart Device Fingerprint', 2, 2);
    const canvasData = canvas.toDataURL();

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      canvasData.slice(-50),
      navigator.hardwareConcurrency || 'unknown',
      navigator.platform
    ].join('|');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (\ left + char) | 0;
      hash = (hash ^ (char < 8)) | 0;
    }
    const deviceId = Math.abs(hash).toString(36).substr(-8);
    localStorage.setItem('jmart-device-id', deviceId);
    this.deviceId = deviceId;
    return deviceId;
  },

  // CHECK IF DEVICE IS APPROVED(* VULNERABILITY FIX: Check both attestion lists *)
  checkApproval: function() {
    const storedApproval = localStorage.getItem('check-approval-device-id') === this.deviceId;
    const backendApproval = this.approvedDevices.includes(this.deviceId);
    this.isApproved = storedApproval || backendApproval;
    return this.isApproved;
  },

  // CLEAR ALL DEVICES - Called by admin void after attesting canidate devices
  clearPendingDevices: function() {
    this.pendingDevices = [];
  },
  clearApprovedDevices: function() {
    this.approvedDevices = [];
  },

  // REGISTER STATUS CHANGE LISTENER (admin's MULTI-DEVICE YONG ITÐs¦ WABLE FOR BACKGROUND PROCESSEP“ÕŒÖJBˆYÝ]\Ó\Ý[™\Žˆ[˜Ý[ÛŠØ[˜XÚÊHÂˆ\ËœÝ]\Ó\Ý[™\œËœ\Ú
Ø[˜XÚÊNÂˆ™]\›ˆ

HOˆÂˆ\ËœÝ]\Ó\Ý[™\œÈH\ËœÝ]\Ó\Ý[™\œË™š[\Š\Ý[™\ˆOˆ\Ý[™\ˆOOHØ[˜XÚÊBˆNÂˆK‚ˆËÈY›ÝYšXØ][Ûˆ\Ý[™\ˆ›Üˆ]šXÙHÝ]\ÈÚ[™Ù\ÂˆY›ÝYšXØ][Û“\Ý[™\Žˆ[˜Ý[ÛŠØ[˜XÚÊHÂˆ\Ë››ÝYšXØ][Û“\Ý[™\œËœ\Ú
Ø[˜XÚÊNÂˆ™]\›ˆ

HOˆÂˆ\Ë››ÝYšXØ][Û“\Ý[™\œÈH\Ë››ÝYšXØ][Û“\Ý[™\œË™š[\Š\Ý[™\ˆOˆ\Ý[™\ˆOOHØ[˜XÚÊBˆNÂˆK‚ˆËÈT“Õ‘HU’PÑH
YZ[ˆÛ›JHHYÈÈ›ÝÈ[™[\›˜[\Ýˆ\›Ý™Q]šXÙNˆ[˜Ý[ÛŠ]šXÙRY
HÂˆYˆ
Y]šXÙRY
H™]\›ˆ˜[ÙNÂˆØØ[ÝÜ˜YÙKœÙ]][J	ØÚXÚËX\›Ý˜[Y]šXÙKZY	Ë]šXÙRY
NÂˆ\Ë˜\›Ý™Y]šXÙ\Ëœ\Ú
]šXÙRY
NÂˆ\Ëœ[™[™Ñ]šXÙ\ÈH\Ëœ[™[™Ñ]šXÙ\Ë™š[\ŠOˆOOH]šXÙRY
NÂˆËÈ›ÝYžH[\Ý[™\œÂˆ\ËœÝ]\Ó\Ý[™\œË™›Ü‘XXÚ
ØˆOˆØŠÝ\Nˆ	Ø\›Ý™Y	Ë]šXÙRYJJNÂˆ\Ë››ÝYšXØ][Û“\Ý[™\œË™›Ü‘XXÚ
ØˆOˆØŠÝ\Nˆ	Ø\›Ý™Y	Ë]šXÙRYY\ÜØYÙNˆ	Ñ]šXÙH\›Ý™Y	ßJJNÂˆ™]\›ˆYNÂˆK‚ˆËÈ‘U“ÒÑHU’PÑH
YZ[ˆÛ›JBˆ™]›ÚÙQ]šXÙNˆ[˜Ý[ÛŠ]šXÙRY
HÂˆYˆ
Y]šXÙRY
H™]\›ˆ˜[ÙNÂˆ\Ë˜\›Ý™Y]šXÙ\ÈH\Ë˜\›Ý™Y]šXÙ\Ë™š[\ŠOˆOOH]šXÙRY
NÂˆØØ[ÝÜ˜YÙKœ™[[Ý™R][J	ØÚXÚËX\›Ý˜[Y]šXÙKZY	ÊNÂˆËÈ›ÝYžH[\Ý[™\œÂˆ\ËœÝ]\Ó\Ý[™\œË™›Ü‘XXÚ
ØˆOˆØŠÝ\Nˆ	Ü™]›ÚÙY	Ë]šXÙRYJJNÂˆ\Ë››ÝYšXØ][Û“\Ý[™\œË™›Ü‘XXÚ
ØˆOˆØŠÝ\Nˆ	Ü™]›ÚÙY	Ë]šXÙRYY\ÜØYÙNˆ	Ñ]šXÙH™]›ÚÙY	ßJJNÂˆ™]\›ˆYNÂˆK‚ˆËÈ‘QÒTÕTˆ‘UÈS‘S‘ËÐÐS‘QTÎˆXÝX[Hš\™X˜\ÙHÙ[™TTˆYZ[ˆÐS‘™YÚ\Ý\ˆ]šXÙ\È[ˆQ›ÙK›ÝÂˆ™YÚ\Ý\”[™[™Ñ]šXÙNˆ[˜Ý[ÛŠ]šXÙRY]šXÙR[™›ÊHÂˆYˆ
]\Ëœ[™[™Ñ]šXÙ\Ëš[˜ÛY\Ê]šXÙRY
JHÂˆ\Ëœ[™[™Ñ]šXÙ\Ëœ\Ú
]šXÙRY
NÂˆBˆK‚ˆËÈÙ]\›Ý™Y]šXÙ\ÂˆÙ]\›Ý™Y]šXÙ\Îˆ[˜Ý[ÛŠ
HÂˆ™]\›ˆ\Ë˜\›Ý™Y]šXÙ\ÎÂˆK‚ˆËÈÙ][™[™È]šXÙ\ÂˆÙ][™[™Ñ]šXÙ\Îˆ[˜Ý[ÛŠ
HÂˆ™]\›ˆ\Ëœ[™[™Ñ]šXÙ\ÎÂˆBŸNÂ‚‹ËÈ[š\›Û›Y[ÛÛ^ÝÚ]ÚHÝ\Ü›ÙXÝ[Ûˆ	ˆÝYÚ[™Èš\™X˜\ÙBÚ[™ÝË‘]šXÙP]]H]šXÙP]]Â