// ========================================
// FORM VALIDATOR - WHS Compliance + XSS Protection
// Extracted from index.html for maintainability
// v2: Added sanitization, XSS protection, field-level validation
// ========================================
window.formValidator = (function() {

  // ========================================
  // XSS SANITIZATION
  // ========================================

  // Strip HTML tags and dangerous patterns from user input
  function sanitize(val) {
    if (val === undefined || val === null) return val;
    if (typeof val !== 'string') return val;
    return val
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // Remove script tags
      .replace(/<[^>]*on\w+\s*=/gi, '<')                  // Remove event handlers
      .replace(/javascript\s*:/gi, '')                     // Remove javascript: URIs
      .replace(/data\s*:\s*text\/html/gi, '')              // Remove data:text/html
      .replace(/<iframe[_>]*>[\s\S]*?<\/iframe>/gi, '')    // Remove iframes
      .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')    // Remove objects
      .replace(/<embed[_>]*>/gi, '')                        // Remove embeds
      .replace(/<link[^>]*>/gi, '')                         // Remove link tags
      .trim();
  }

  // HTML-escape for safe rendering (use when displaying user data)
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Sanitize an entire form object (recursive, all string fields)
  function sanitizeForm(form) {
    if (!form || typeof form !== 'object') return form;
    const clean = Array.isArray(form) ? [] : {};
    for (const key of Object.keys(form)) {
      const val = form[key];
      if (typeof val === 'string') {
        clean[key] = sanitize(val);
      } else if (val && typeof val === 'object' && !(val instanceof Date)) {
        clean[key] = sanitizeForm(val);
      } else {
        clean[key] = val;
      }
    }
    return clean;
  }

  // ========================================
  // FIELD VALIDATORS
  // ========================================

  function isPresent(val) {
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    return true;
  }

  function dateNotFuture(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid date format';
    const today = new Date(); today.setHours(23,59,59,999);
    if (d > today) return 'Date cannot be in the future';
    return null;
  }

  function dateNotTooOld(dateStr, maxDaysAgo) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (maxDaysAgo || 365));
    if (d < cutoff) return 'Date is too far in the past (max ' + maxDaysAgo + ' days)';
    return null;
  }

  function maxLength(val, max, fieldName) {
    if (!val || typeof val !== 'string') return null;
    if (val.length > max) return fieldName + ' exceeds maximum length (' + max + ' characters)';
    return null;
  }

  function validateEmail(email) {
    if (!email) return null;
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!pattern.test(email)) return 'Invalid email address';
    return null;
  }

  function validatePhone(phone) {
    if (!phone) return(¹Õ±°ì(€€€½¹ÍÐ±•…¹•€ôÁ¡½¹”¹É•Á±…” ½mqÍpµp¡p¥p¹t½œ°€œœ¤ì(€€€¥˜€¡±•…¹•¹±•¹Ñ €ð€àñð±•…¹•¹±•¹Ñ €ø€ÄÔ¤É•ÑÕÉ¸€%¹Ù…±¥Á¡½¹”¹Õµ‰•Èœì(€€€¥˜€ „½ymp­týlÀ´åt¬¼¹Ñ•ÍÐ¡±•…¹•¤¤É•ÑÕÉ¸€A¡½¹”¹Õµ‰•È½¹Ñ…¥¹Ì¥¹Ù…±¥¡…É…Ñ•ÉÌœì(€€€É•ÑÕÉ¸¹Õ±°ì(€ô((€€¼¼€ôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôô(€€¼¼=I4µMA%%Y1%Q=IL(€€¼¼€ôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôôô((€™Õ¹Ñ¥½¸Ù…±¥‘…Ñ•Q½½±‰½à¡™½É´¤ì(€€€½¹ÍÐ•ÉÉ½ÉÌ€ômtì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹Í¥Ñ•½¹‘ÕÑ•¤¤•ÉÉ½ÉÌ¹ÁÕÍ  M¥Ñ”½1½…Ñ¥½¸¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹ÁÉ•Á…É•‘	ä¤¤•ÉÉ½ÉÌ¹ÁÕÍ  AÉ•Í•¹Ñ•	ä¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹Ñ½Á¥Ìñð™½É´¹Í•±•Ñ•‘Q½Á¥Ì¤¤•ÉÉ½ÉÌ¹ÁÕÍ  Ð±•…ÍÐ½¹”Ñ½Á¥ŒµÕÍÐ‰”Í•±•Ñ•œ¤ì(€€€½¹ÍÐ±•¹ÉÈ€ôµ…á1•¹Ñ ¡™½É´¹Í¥Ñ•½¹‘ÕÑ•°€ÈÀÀ°€M¥Ñ”½1½…Ñ¥½¸œ¤ì(€€€¥˜€¡±•¹ÉÈ¤•ÉÉ½ÉÌ¹ÁÕÍ ¡±•¹ÉÈ¤ì(€€€½¹ÍÐÍ¥¹•‘½Õ¹Ð€ô™½É´¹Í¥¹…ÑÕÉ•Ì€ü=‰©•Ð¹Ù…±Õ•Ì¡™½É´¹Í¥¹…ÑÕÉ•Ì¤¹™¥±Ñ•È¡Ì€ôøÌ€„ôô¹Õ±°¤¹±•¹Ñ €è€Àì(€€€¥˜€¡Í¥¹•‘½Õ¹Ð€ôôô€À¤•ÉÉ½ÉÌ¹ÁÕÍ  Ð±•…ÍÐ½¹”…ÑÑ•¹‘•”µÕÍÐÍ¥¸½¸œ¤ì(€€€É•ÑÕÉ¸•ÉÉ½ÉÌì(€ô((€™Õ¹Ñ¥½¸Ù…±¥‘…Ñ•%¹ÍÁ•Ñ¥½¸¡™½É´¤ì(€€€½¹ÍÐ•ÉÉ½ÉÌ€ômtì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹Í¥Ñ•½¹‘ÕÑ•¤¤•ÉÉ½ÉÌ¹ÁÕÍ  M¥Ñ”½1½…Ñ¥½¸¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹ÁÉ•Á…É•‘	ä¤¤•ÉÉ½ÉÌ¹ÁÕÍ  AÉ•Á…É•	ä¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹½µÁ±•Ñ•‘	ä¤¤•ÉÉ½ÉÌ¹ÁÕÍ  ½µÁ±•Ñ•	ä¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€¡™½É´¹¥¹ÍÁ•Ñ¥½¹%Ñ•µÌ¤ì(€€€€€½¹ÍÐ…¹ÍÝ•É•€ô=‰©•Ð¹Ù…±Õ•Ì¡™½É´¹¥¹ÍÁ•Ñ¥½¹%Ñ•µÌ¤¹™¥±Ñ•È¡Ø€ôøØ€„ôô¹Õ±°€˜˜Ø€„ôôÕ¹‘•™¥¹•¤¹±•¹Ñ ì(€€€€€½¹ÍÐÑ½Ñ…°€ô=‰©•Ð¹­•åÌ¡™½É´¹¥¹ÍÁ•Ñ¥½¹%Ñ•µÌ¤¹±•¹Ñ ì(€€€€€¥˜€¡…¹ÍÝ•É•€ðÑ½Ñ…°¤•ÉÉ½ÉÌ¹ÁÕÍ  ±°€œ€¬Ñ½Ñ…°€¬€œ¥¹ÍÁ•Ñ¥½¸¥Ñ•µÌµÕÍÐ‰”½µÁ±•Ñ•€ œ€¬…¹ÍÝ•É•€¬€œ‘½¹”¤œ¤ì(€€€ô(€€€É•ÑÕÉ¸•ÉÉ½ÉÌì(€ô((€™Õ¹Ñ¥½¸Ù…±¥‘…Ñ•%Q@¡™½É´¤ì(€€€½¹ÍÐ•ÉÉ½ÉÌ€ômtì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹Í¥Ñ•½¹‘ÕÑ•¤¤•ÉÉ½ÉÌ¹ÁÕÍ  M¥Ñ”½1½…Ñ¥½¸¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹ÁÉ•Á…É•‘	ä¤¤•ÉÉ½ÉÌ¹ÁÕÍ  AÉ•Á…É•	ä¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹‰Õ¥±‘•ÉM¥¹½™™9…µ”¤¤•ÉÉ½ÉÌ¹ÁÕÍ  	Õ¥±‘•È¹…µ”¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹‰Õ¥±‘•ÉM¥¹…ÑÕÉ”¤¤•ÉÉ½ÉÌ¹ÁÕÍ  	Õ¥±‘•ÈÍ¥¹…ÑÕÉ”¥ÌÉ•ÅÕ¥É•œ¤ì(€€€É•ÑÕÉ¸•ÉÉ½ÉÌì(€ô((€™Õ¹Ñ¥½¸Ù…±¥‘…Ñ•MÑ••±%Q@¡™½É´¤ì(€€€½¹ÍÐ•ÉÉ½ÉÌ€ômtì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹Í¥Ñ•½¹‘ÕÑ•¤¤•ÉÉ½ÉÌ¹ÁÕÍ  M¥Ñ”½1½…Ñ¥½¸¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹ÁÉ•Á…É•‘	ä¤¤•ÉÉ½ÉÌ¹ÁÕÍ  AÉ•Á…É•	ä¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹µ…¹…•É9…µ”¤¤•ÉÉ½ÉÌ¹ÁÕÍ  5…¹…•È¹…µ”¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹µ…¹…•ÉM¥¹…ÑÕÉ”¤¤•ÉÉ½ÉÌ¹ÁÕÍ  5…¹…•ÈÍ¥¹…ÑÕÉ”¥ÌÉ•ÅÕ¥É•œ¤ì(€€€É•ÑÕÉ¸•ÉÉ½ÉÌì(€ô((€™Õ¹Ñ¥½¸Ù…±¥‘…Ñ•AÉ•ÍÑ…ÉÐ¡™½É´¤ì(€€€½¹ÍÐ•ÉÉ½ÉÌ€ômtì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹ÍÕÁ•ÉÙ¥Í½É9…µ”¤¤•ÉÉ½ÉÌ¹ÁÕÍ  MÕÁ•ÉÙ¥Í½È¹…µ”¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹Í¥Ñ•½¹‘ÕÑ•¤¤•ÉÉ½ÉÌ¹ÁÕÍ  M¥Ñ”½1½…Ñ¥½¸¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹‰Õ¥±‘•È¤¤•ÉÉ½ÉÌ¹ÁÕÍ  	Õ¥±‘•È¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹…‘‘É•ÍÌ¤¤•ÉÉ½ÉÌ¹ÁÕÍ  ‘‘É•ÍÌ¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹¡¥¡I¥Í­]½É­Ì¤¤•ÉÉ½ÉÌ¹ÁÕÍ  !¥ I¥Í¬]½É­ÌÍ•±•Ñ¥½¸¥ÌÉ•ÅÕ¥É•œ¤ì(€€€¥˜€ …¥ÍAÉ•Í•¹Ð¡™½É´¹Ý½É­ÍÆ÷fW&VD'•5tÕ2’’W'&÷'2çW6‚‚u5tÕ26÷fW&vR6VÆV7F–öâ—2&WV—&VBr“°¢–b‚—5&W6VçB†f÷&Òæ—5ÆçDWV—ÖVçEW6VB’’W'&÷'2çW6‚‚uÆçBôWV—ÖVçB6VÆV7F–öâ—2&WV—&VBr“°¢òòf–VÆBÆVæwF‚6†V6·0¢f"ÆVäW'"ÒÖ„ÆVæwF‚†f÷&ÒæFG&W72ÂSÂtFG&W72r“°¢–b†ÆVäW'"’W'&÷'2çW6‚†ÆVäW'"“°¢ÆVäW'"ÒÖ„ÆVæwF‚†f÷&Òç7WW'f—6÷$æÖRÂÂu7WW'f—6÷"æÖRr“°¢–b†ÆVäW'"’W'&÷'2çW6‚†ÆVäW'"“°¢òò†¦&B7&÷72×fÆ–FF–öà¢–b†f÷&Òæ†–v…&—6µv÷&·2ÓÓÒw–W2rbbf÷&Òçv÷&·46÷fW&VD'•5tÕ2ÓÒw–W2r’°¢W'&÷'2çW6‚‚t†–v‚×&—6²v÷&·2&WV—&R5tÕ26÷fW&vRr“°¢Ð¢òò6—FR†¦&G0¢–b†f÷&Òç6—FT†¦&G2’°¢f"†¥fÂÒf÷&Òç6—FT†¦&G2çfÇVRÇÂrs°¢f"†¤æ÷FW2Ò'&’æ—4'&’†f÷&Òç6—FT†¦&G2ææ÷FW2’òf÷&Òç6—FT†¦&G2ææ÷FW2¢µÓ°¢–b††¥fÂÓÓÒrrbb†¤æ÷FW2æÆVæwF‚ÓÓÒ’W'&÷'2çW6‚‚u6—FR†¦&G2×W7B&R–FVçF–f–VBr“°¢Ð¢òò6†V6¶Æ—7B6ö×ÆWF–öà¢–b†f÷&Òæ6†V6µG—Rbbf÷&Òæ6†V6¶Æ—7D—FV×2bbf÷&Òæ6†V6·2’°¢f"—FV×2Òf÷&Òæ6†V6¶Æ—7D—FV×5¶f÷&Òæ6†V6µG—UÒÇÂµÓ°¢f"6ö×ÆWFVD—FV×2Òö&¦V7Bæ¶W—2†f÷&Òæ6†V6·2’æÆVæwFƒ°¢–b†6ö×ÆWFVD—FV×2Â—FV×2æÆVæwF‚’°¢W'&÷'2çW6‚‚tÆÂr²—FV×2æÆVæwF‚²r6†V6¶Æ—7B—FV×2×W7B&R6ö×ÆWFVB‚r²6ö×ÆWFVD—FV×2²rFöæR’r“°¢Ð¢Ð¢6öç7B6–væVD6÷VçBÒf÷&Òç6–væGW&W2òö&¦V7BçfÇVW2†f÷&Òç6–væGW&W2’æf–ÇFW"‡2Óâ2ÓÒçVÆÂ’æÆVæwF‚¢°¢–b‡6–væVD6÷VçBÓÓÒ’W'&÷'2çW6‚‚tBÆV7BöæRv÷&¶W"×W7B6–vâöâr“°¢&WGW&âW'&÷'3°¢Ð ¢gVæ7F–öâfÆ–FFT–æ6–FVçB†f÷&Ò’°¢6öç7BW'&÷'2ÒµÓ°¢–b‚—5&W6VçB†f÷&Òæ–æ6–FVçEG—RÇÂf÷&ÒçG—R’’W'&÷'2çW6‚‚t–æ6–FVçBG—R—2&WV—&VBr“°¢–b‚—5&W6VçB†f÷&Òæ–æ6–FVçDFFRÇÂf÷&ÒæFFR’’W'&÷'2çW6‚‚tFFRöb–æ6–FVçB—2&WV—&VBr“°¢–b‚—5&W6VçB†f÷&Òæ–æ6–FVçEF–ÖRÇÂf÷&ÒçF–ÖR’’W'&÷'2çW6‚‚uF–ÖRöb–æ6–FVçB—2&WV—&VBr“°¢–b‚—5&W6VçB†f÷&ÒæÆö6F–öâ’’W'&÷'2çW6‚‚tÆö6F–öâ—2&WV—&VBr“°¢–b‚—5&W6VçB†f÷&ÒæFW67&—F–öâ’’W'&÷'2çW6‚‚tFW67&—F–öâ—2&WV—&VBr“°¢–b‚—5&W6VçB†f÷&Òç&W÷'FVD'’’’W'&÷'2çW6‚‚u&W÷'FW"æÖR—2&WV—&VBr“°¢–b‚—5&W6VçB†f÷&Òæ–ÖÖVF–FT7F–öç2’’W'&÷'2çW6‚‚t–ÖÖVF–FR7F–öç2F¶Vâ—2&WV—&VBr“°¢–b‚—5&W6VçB†f÷&Òç&W÷'FW%6–væGW&R’’W'&÷'2çW6‚‚u&W÷'FW"6–væGW&R—2&WV—&VBr“°¢òòf–VÆBÆVæwF‚6†V6·0¢f"ÆVäW'"ÒÖ„ÆVæwF‚†f÷&ÒæFW67&—F–öâÂSÂtFW67&—F–öâr“°¢–b†ÆVäW'"’W'&÷'2çW6‚†ÆVäW'"“°¢ÆVäW'"ÒÖ„ÆVæwF‚†f÷&Òæ–ÖÖVF–FT7F–öç2Â#Ât–ÖÖVF–FR7F–öç2r“°¢–b†ÆVäW'"’W'&÷'2çW6‚†ÆVäW'"“°¢òòFFR6†V6·0¢6öç7BFFTW'"ÒFFTæ÷DgWGW&R†f÷&Òæ–æ6–FVçDFFRÇÂf÷&ÒæFFR“°¢–b†FFTW'"’W'&÷'2çW6‚†FFTW'"“°¢6öç7BöÆDW'"ÒFFTæ÷EFöôöÆB†f÷&Òæ–æ6–FVçDFFRÇÂf÷&ÒæFFRÂ3cR“°¢–b†öÆDW'"’W'&÷'2çW6‚†öÆDW'"“°¢&WGW&âW'&÷'3°¢Ð ¢gVæ7F–öâ—4æ÷F–f–&ÆT–æ6–FVçB†–æ6–FVçB’°¢6öç7Bæ÷F–f–&ÆRÒ²vFVF‚rÂw6W&–÷W2–æ§W'’rÂvFævW&÷W2–æ6–FVçBrÂv†÷7—FÆ—¦F–öârÂv×WFF–öârÂw6W&–÷W2'W&ç2rÂw7–æÂ–æ§W'’rÂvÆ÷72öb6öç66–÷W6æW72uÓ°¢6öç7BFW‡BÒ‚†–æ6–FVçBæ–æ6–FVçEG—RÇÂrr’²rr²†–æ6–FVçBç6WfW&—G’ÇÂrr’²rr²†–æ6–FVçBæFW67&—F–öâÇÂrr’’çFôÆ÷vW$66R‚“°¢&WGW&âæ÷F–f–&ÆRç6öÖR‡BÓâFW‡Bæ–æ6ÇVFW2‡B’“°¢Ð ¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐ¢òòTä•dU%4ÂdÄ”DDS¢6æ—F—¦R²fÆ–FFRç’f÷&ÒG—P¢òòÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÓÐ¢gVæ7F–öâfÆ–FFR†f÷&Ò’°¢–b‚f÷&ÒÇÂf÷&ÒçG—R’&WGW&â²fÆ–C¢fÇ6RÂW'&÷'3¢²tf÷&ÒG—R—2Ö—76–æruÒÂf÷&Ó¢f÷&ÒÓ° ¢òò6æ—F—¦RÆÂ7G&–ærf–VÆG2f—'7@¢6öç7B6ÆVâÒ6æ—F—¦Tf÷&Ò†f÷&Ò“° ¢òò'VâG—R×7V6–f–2fÆ–FF–öà¢ÆWBW'&÷'2ÒµÓ°¢7v—F6‚†6ÆVâçG—R’°¢66Rw&W7F'Bs¢W'&÷'2ÒfÆ–FFU&W7F'B†6ÆVâ“²'&V³°¢66RwFööÆ&÷‚s¢W'&÷'2ÒfÆ–FFUFööÆ&÷‚†6ÆVâ“²'&V³°¢66Rv–æ6–FVçBs¢W'&÷'2ÒfÆ–FFT–æ6–FVçB†6ÆVâ“²'&V³°¢66Rv–ç7V7F–öâs¢W'&÷'2ÒfÆ–FFT–ç7V7F–öâ†6ÆVâ“²'&V³°¢66Rv—Gs¢W'&÷'2ÒfÆ–FFT•E†6ÆVâ“²'&V³°¢66Rw7FVVÂÖ—Gs¢W'&÷'2ÒfÆ–FFU7FVVÄ•E†6ÆVâ“²'&V³°¢FVfVÇC¢'&V³²òòVæ¶æ÷vâG—R(	BæòfÆ–FF–öà¢Ð ¢&WGW&â°¢fÆ–C¢W'&÷'2æÆVæwF‚ÓÓÒÀ¢W'&÷'3¢W'&÷'2À¢f÷&Ó¢6ÆVâòò&WGW&â6æ—F—¦VBf÷&Ð¢Ó°¢Ð ¢&WGW&â°¢fÆ–FFS¢fÆ–FFRÀ¢6æ—F—¦S¢6æ—F—¦RÀ¢6æ—F—¦Tf÷&Ó¢6æ—F—¦Tf÷&ÒÀ¢W66T‡FÖÃ¢W66T‡FÖÂÀ¢fÆ–FFU&W7F'C¢fÆ–FFU&W7F'BÀ¢fÆ–FFT–æ6–FVçC¢fÆ–FFT–æ6–FVçBÀ¢fÆ–FFUFööÆ&÷ƒ¢fÆ–FFUFööÆ&÷‚À¢fÆ–FFT–ç7V7F–öã¢fÆ–FFT–ç7V7F–öâÀ¢fÆ–FFT•E¢fÆ–FFT•EÀ¢fÆ–FFU7FVVÄ•E¢fÆ–FFU7FVVÄ•EÀ¢—4æ÷F–f–&ÆT–æ6–FVçC¢—4æ÷F–f–&ÆT–æ6–FVçBÀ¢—5&W6VçC¢—5&W6VçBÀ¢FFTæ÷DgWGW&S¢FFTæ÷DgWGW&RÀ¢FFTæ÷EFöôöÆC¢FFTæ÷EFöôöÆBÀ¢Ö„ÆVæwFƒ¢Ö„ÆVæwF‚À¢fÆ–FFTVÖ–Ã¢fÆ–FFTVÖ–ÂÀ¢fÆ–FFU†öæS¢fÆ–FFU†öæP¢Ó°§Ò’‚“° 