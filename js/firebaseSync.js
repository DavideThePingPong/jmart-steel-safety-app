// Firebase Sync
// Extracted from index.html for maintainability
const FirebaseSync = {
  // Retry queue stored in localStorage
  pendingQueue: [],
  retryAttempts: {},
  maxRetries: 5,
  retryDelays: [1000, 5000, 15000, 30000, 60000], // Exponential backoff
  syncListeners: [], // UI callbacks for sync status

  // Circuit breaker â€” stops retry storms when storage is full or Firebase is down
  CIMCTÂ•_OPU“ˆ˜[ÙKˆÛÛœÙXİ]]™TİÜ˜YÙQ\œ›ÜœÎˆˆÒTÕRUĞ”‘PRÑT—Õ‘TÒÓˆËˆÚ\˜İZ]Ü[™Y]ˆ[ˆÒTÕRUĞÓÓÓÕÓ—ÓNˆˆ
ˆŒ
ˆLËÈˆZ[]\È
™YXÙYœ›ÛHH›Üˆ˜\İ\ˆ™XÛİ™\JB‚ˆËÈ[š]X[^™HHØY[™[™È]Y]YHœ›ÛHØØ[İÜ˜YÙBˆ[š]ˆ[˜İ[ÛŠ
HÂˆHÂˆÛÛœİØ]™YHØØ[İÜ˜YÙK™Ù]][J	Ú›X\\Ş[˜Ë\]Y]YIÊNÂˆ\Ëœ[™[™Ô]Y]YHHØ]™YÈ”ÓÓ‹œ\œÙJØ]™Y
Hˆ×NÂˆYˆ
\Ëœ[™[™Ô]Y]YK›[™İˆ
HÂˆÛÛœÛÛK›ÙÊ›İ[™	İ\Ëœ[™[™Ô]Y]YK›[™İH[™[™ÈŞ[˜È][\Ø
NÂˆ\Ëœ›ØÙ\ÜÔ]Y]YJ
NÂˆBˆHØ]Ú
JHÂˆÛÛœÛÛK™\œ›ÜŠ	Ñ\œ›ÜˆØY[™ÈŞ[˜È]Y]YN‰ËJNÂˆ\Ëœ[™[™Ô]Y]YHH×NÂˆBˆK‚ˆËÈØ]™H]Y]YHÈØØ[İÜ˜YÙH8¦%˜XÚÜÈİÜ˜YÙH\œ›ÜœÈ›ÜˆÚ\˜İZ]œ™XZÙ\‚ˆØ]™T]Y]YNˆ[˜İ[ÛŠ
HÂˆHÂˆØØ[İÜ˜YÙKœÙ]][J	Ú›X\\Ş[˜Ë\]Y]YIË”ÓÓ‹œİš[™ÚYJ\Ëœ[™[™Ô]Y]YJJNÂˆËÈ™\Ù]ÛÛœÙXİ]]™H\œ›ÜˆÛİ[\ˆÛˆİXØÙ\ÜÂˆ\Ë˜ÛÛœÙXİ]]™TİÜ˜YÙQ\œ›ÜœÈHÂˆHØ]Ú
JHÂˆÛÛœÛÛK™\œ›ÜŠ	Ñ\œ›ÜˆØ]š[™ÈŞ[˜È]Y]YN‰ËJNÂˆ\Ë˜ÛÛœÙXİ]]™TİÜ˜YÙQ\œ›ÜœÊÊÎÂˆYˆ
\Ë˜ÛÛœÙXİ]]™TİÜ˜YÙQ\œ›ÜœÈH\ËÒTÕRUĞ”‘PRÑT—Õ‘TÒÓ	‰ˆ]\Ë˜Ú\˜İZ]Ü[ŠHÂˆ\Ë˜Ú\˜İZ]Ü[ˆHYNÂˆ\Ë˜Ú\˜İZ]Ü[™Y]H]K››İÊ
NÂˆÛÛœÛÛK™\œ›ÜŠ	ĞÒTÕRU”‘PRÑTˆÔSˆ8 %ÛÈX[HİÜ˜YÙH\œ›ÜœÈ
	È
È\Ë˜ÛÛœÙXİ]]™TİÜ˜YÙQ\œ›ÜœÈ
È	ÊKˆ™]šY\È]\ÙY›ÜˆHZ[]\Ë‰ÊNÂˆ\Ë››İYS\İ[™\œÊ	ØÚ\˜İZ]ÛÜ[‰ËÈ™X\ÛÛˆ	ÜİÜ˜YÙWÙ[	ËÛÛÛİÛ“\Îˆ\ËÒTÕRUĞÓÓÓÕÓ—ÓTÈJNÂˆBˆBˆK‚ˆËÈY\İ[™\ˆ›ÜˆŞ[˜Èİ]\È\]\ÂˆÛ”Ş[˜Ôİ]\ĞÚ[™ÙNˆ[˜İ[ÛŠØ[˜XÚÊHÂˆ\ËœŞ[˜Ó\İ[™\œËœ\Ú
Ø[˜XÚÊNÂˆ™]\›ˆ

HOˆÂˆ\ËœŞ[˜Ó\İ[™\œÈH\ËœŞ[˜Ó\İ[™\œË™š[\ŠØˆOˆØˆOOHØ[˜XÚÊNÂˆNÂˆK‚ˆËÈ›İYH\İ[™\œÈÙˆİ]\ÈÚ[™ÙBˆ›İYS\İ[™\œÎˆ[˜İ[ÛŠİ]\Ë]Z[ÊHÂˆ\ËœŞ[˜Ó\İ[™\œË™›Ü‘XXÚ
ØˆOˆØŠİ]\Ë]Z[ÊJNÂˆK‚ˆËÈY][HÈ™]H]Y]YH8 %›ØÚÙYÚ[ˆÚ\˜İZ]œ™XZÙ\ˆ\ÈÜ[‚ˆQQÕ×ÔUEUQX@
SHES‚: function(type, data) {
    if (this.circuitOpen) {
      console.warn('Circuit breaker OPEN â€” cannot add to queue. Try again after cooldown.');
      this.notifyListeners('circuit_open', { reason: 'queue_blocked' });
      return null;
    }
    const item = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      type,
      data,
      timestamp: new Date().toISOString(),
      attempts: 0
    };
    this.pendingQueue.push(item);
    this.saveQueue();
    this.notifyListeners('queued', { pending: this.pendingQueue.length });
    return item.id;
  },

  // Process the retry queue â€” respects circuit breaker
  processQueue: async function() {
    // Circuit breaker check
    if (this.circuitOpen) {
      const elapsed = Date.now() - (this.circuitOpenedAt || 0);
      if (elapsed < this.CIRCUIT_COOLDOWN_MS) {
        console.log('Circuit breaker OPEN â€” queue processing blocked. Cooldown: ' + Math.round((this.CIRCUIT_COOLDOWN_MS - elapsed) / 1000) + 's remaining');
        return;
      }
      // Half-open: try one cycle
      console.log('Circuit breaker half-open â€” attempting recovery...');
      this.circuitOpen = false;
      this.consecutiveStorageErrors = 0;
    }

    if (!navigator.onLine || !this.isConnected()) {
      console.log('Offline - queue processing deferred');
      return;
    }

    const itemsToProcess = [...this.pendingQueue];
    for (const item of itemsToProcess) {
      try {
        await this.executeSync(item);
        // Success - remove from queue
        this.pendingQueue = this.pendingQueue.filter(i => i.id !== item.id);
        this.saveQueue();
        this.notifyListeners('synced', { pending: this.pendingQueue.length, item: item.type });
        console.log(`Sync successful for ${item.type}`);
      } catch (error) {
        item.attempts++;
        if (item.attempts >= this.maxRetries) {
          console.error(`Max retries reached for ${item.type}, removing from queue`);
          this.pendingQueue = this.pendingQueue.filter(i => i.id !== item.id);
          this.notifyListeners('failed', { pending: this.pendingQueue.length, error: error.message });
        } else {
          const delay = this.retryDelays[Math.min(item.attempts - 1, this.retryDelays.length - 1)];
          console.lm¨`Retry ${item.attempts}/${this.maxRetries} for ${item.type} in ${delay}ms`);
          setTimeout(() => this.processQueue(), delay);
        }
        this.saveQueue();
      }
    }
  },

  // Execute a single sync operation (v3: supports granular update/delete)
  executeSync: async function(item) {
    if (!firebaseDb || !isFirebaseConfigured) {
      throw new Error('Firebase not configured');
    }

    // v3 granular operations (path-based)
    if (item.path && item.operation) {
      const ref = firebaseDb.ref(item.path);
      switch (item.operation) {
        case 'set': await ref.set(item.data); break;
        case 'update': await ref.update(item.data); break;
        case 'delete': await ref.remove(); break;
        default: throw new Error(`Unknown operation: ${item.operation}`);
      }
      return;
    }

    // Legacy bulk operations (fallback)
    switch (item.type) {
      case 'forms':
        await firebaseDb.ref('jmart-safety/forms').set(item.data);
        break;
      case 'sites': {
        // Sanitize queued sites data â€”"old queue entries may contain corrupted objects
        const raw = Array.isArray(item.data) ? item.data : Object.values(item.data || {});
        const clean = [...new Set(raw.map(s => {
          if (typeof s === 'string') return(Ìì(€€€€€€€€€¥˜€¡Ì€˜˜ÑåÁ•½˜Ì€ôôô€½‰©•Ğœ¤ì(€€€€€€€€€€€½¹ÍĞ¡…ÉÌ€ô=‰©•Ğ¹­•åÌ¡Ì¤¹™¥±Ñ•È¡¬€ôø¬€„ôô€}±…ÍÑ5½‘¥™¥•œ€˜˜€…¥Í9…8¡¬¤¤¹Í½ÉĞ ¡„±ˆ¤€ôø9Õµ‰•È¡„¤€´9Õµ‰•È¡ˆ¤¤ì(€€€€€€€€€€€É•ÑÕÉ¸¡…ÉÌ¹µ…À¡¬€ôøÍm­t¤¹©½¥¸ œœ¤ì(€€€€€€€€€ô(€€€€€€€€€É•ÑÕÉ¸¹Õ±°ì(€€€€€€€ô¤¹™¥±Ñ•È¡Ì€ôøÌ€˜˜Ì¹±•¹Ñ €ø€Ä€˜˜Ì€„ôô€Õ¹‘•™¥¹•œ€˜˜Ì€„ôô€¹Õ±°œ¤¥tì(€€€€€€€…İ…¥Ğ™¥É•‰…Í•ˆ¹É•˜ ©µ…ÉĞµÍ…™•Ñä½Í¥Ñ•Ìœ¤¹Í•Ğ¡±•…¸¤ì(€€€€€€€‰É•…¬ì(€€€€€ô(€€€€€…Í”€ÑÉ…¥¹¥¹œœè(€€€€€€€…İ…¥Ğ™¥É•‰…Í•ˆ¹É•˜ ©µ…ÉĞµÍ…™•Ñä½ÑÉ…¥¹¥¹œœ¤¹Í•Ğ¡¥Ñ•´¹‘…Ñ„¤ì(€€€€€€€‰É•…¬ì(€€€€€…Í”€Í¥¹…ÑÕÉ•Ìœè(€€€€€€€…İ…¥Ğ™¥É•‰…Í•ˆ¹É•˜ Í¥¹…ÑÕÉ•Ìœ¤¹Í•Ğ¡¥Ñ•´¹‘…Ñ„¤ì(€€€€€€€‰É•…¬ì(€€€€€‘•™…Õ±Ğè(€€€€€€€Ñ¡É½Ü¹•ÜÉÉ½È¡U¹­¹½İ¸Íå¹ŒÑåÁ”è€‘í¥Ñ•´¹ÑåÁ•õ€¤ì(€€€ô(€ô°((€€¼¼Må¹Œ™½ÉµÌÑ¼¥É•‰…Í”€´ØÌèÉ…¹Õ±…ÈÁ•Èµ™½É´ÕÁ‘…Ñ” ¤¥¹ÍÑ•…½˜™Õ±°Í•Ğ ¤(€Íå¹½ÉµÌè‚ı¹Íå¹Œ™Õ¹Ñ¥½¸¡™½ÉµÌ¤ì(€€€¥˜€ …™¥É•‰…Í•ˆñğ€…¥Í¥É•‰…Í•½¹™¥ÕÉ•¤ì(€€€€€Ñ¡¥Ì¹…‘‘Q½EÕ•Õ” ™½ÉµÌœ°™½ÉµÌ¤ì(€€€€€É•ÑÕÉ¸ìÍÕ•ÍÌè™…±Í”°ÅÕ•Õ•èÑÉÕ”ôì(€€€ô(€€(€€€€€€€€€€€€€Ç)Rt±½Í•€)ô(