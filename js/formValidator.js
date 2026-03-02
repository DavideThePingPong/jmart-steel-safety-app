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
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')    // Remove iframes
      .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')    // Remove objects
      .replace(/<embed[^>]*>/gi, '')                        // Remove embeds
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
    if (!phone) return null;
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    if (cleaned.length < 8 || cleaned.length > 15) return 'Invalid phone number';
    if (!/^[\+]?[0-9]+$/.test(cleaned)) return 'Phone number contains invalid characters';
    return null;
  }

  // ========================================
  // FORM-SPECIFIC VALIDATORS
  // ========================================

  function validateToolbox(form) {
    const errors = [];
    if (!isPresent(form.siteConducted)) errors.push('Site/Location is required');
    if (!isPresent(form.preparedBy)) errors.push('Presented By is required');
    if (!isPresent(form.topics || form.selectedTopics)) errors.push('At least one topic must be selected');
    const lenErr = maxLength(form.siteConducted, 200, 'Site/Location');
    if (lenErr) errors.push(lenErr);
    const signedCount = form.signatures ? Object.values(form.signatures).filter(s => s !== null).length : 0;
    if (signedCount === 0) errors.push('At least one attendee must sign on');
    return errors;
  }

  function validateInspection(form) {
    const errors = [];
    if (!isPresent(form.siteConducted)) errors.push('Site/Location is required');
    if (!isPresent(form.preparedBy)) errors.push('Prepared By is required');
    if (!isPresent(form.completedBy)) errors.push('Completed By is required');
    if (form.inspectionItems) {
      const answered = Object.values(form.inspectionItems).filter(v => v !== null && v !== undefined).length;
      const total = Object.keys(form.inspectionItems).length;
      if (answered < total) errors.push('All ' + total + ' inspection items must be completed (' + answered + ' done)');
    }
    return errors;
  }

  function validateITP(form) {
    const errors = [];
    if (!isPresent(form.siteConducted)) errors.push('Site/Location is required');
    if (!isPresent(form.preparedBy)) errors.push('Prepared By is required');
    if (!isPresent(form.builderSignoffName)) errors.push('Builder name is required');
    if (!isPresent(form.builderSignature)) errors.push('Builder signature is required');
    return errors;
  }

  function validateSteelITP(form) {
    const errors = [];
    if (!isPresent(form.siteConducted)) errors.push('Site/Location is required');
    if (!isPresent(form.preparedBy)) errors.push('Prepared By is required');
    if (!isPresent(form.managerName)) errors.push('Manager name is required');
    if (!isPresent(form.managerSignature)) errors.push('Manager signature is required');
    return errors;
  }

  function validatePrestart(form) {
    const errors = [];
    if (!isPresent(form.supervisorName)) errors.push('Supervisor name is required');
    if (!isPresent(form.siteConducted)) errors.push('Site/Location is required');
    if (!isPresent(form.builder)) errors.push('Builder is required');
    if (!isPresent(form.address)) errors.push('Address is required');
    if (!isPresent(form.highRiskWorks)) errors.push('High Risk Works selection is required');
    if (!isPresent(form.worksCoveredBySWMS)) errors.push('SWMS coverage selection is required');
    if (!isPresent(form.isPlantEquipmentUsed)) errors.push('Plant/Equipment selection is required');
    // Field length checks
    var lenErr = maxLength(form.address, 500, 'Address');
    if (lenErr) errors.push(lenErr);
    lenErr = maxLength(form.supervisorName, 100, 'Supervisor name');
    if (lenErr) errors.push(lenErr);
    // Hazard cross-validation
    if (form.highRiskWorks === 'yes' && form.worksCoveredBySWMS !== 'yes') {
      errors.push('High-risk works require SWMS coverage');
    }
    // Site hazards
    if (form.siteHazards) {
      var hazVal = form.siteHazards.value || '';
      var hazNotes = Array.isArray(form.siteHazards.notes) ? form.siteHazards.notes : [];
      if (hazVal === '' && hazNotes.length === 0) errors.push('Site hazards must be identified');
    }
    // Checklist completion
    if (form.checkType && form.checklistItems && form.checks) {
      var items = form.checklistItems[form.checkType] || [];
      var completedItems = Object.keys(form.checks).length;
      if (completedItems < items.length) {
        errors.push('All ' + items.length + ' checklist items must be completed (' + completedItems + ' done)');
      }
    }
    const signedCount = form.signatures ? Object.values(form.signatures).filter(s => s !== null).length : 0;
    if (signedCount === 0) errors.push('At least one worker must sign on');
    return errors;
  }

  function validateIncident(form) {
    const errors = [];
    if (!isPresent(form.incidentType || form.type)) errors.push('Incident type is required');
    if (!isPresent(form.incidentDate || form.date)) errors.push('Date of incident is required');
    if (!isPresent(form.incidentTime || form.time)) errors.push('Time of incident is required');
    if (!isPresent(form.location)) errors.push('Location is required');
    if (!isPresent(form.description)) errors.push('Description is required');
    if (!isPresent(form.reportedBy)) errors.push('Reporter name is required');
    if (!isPresent(form.immediateActions)) errors.push('Immediate actions taken is required');
    if (!isPresent(form.reporterSignature)) errors.push('Reporter signature is required');
    // Field length checks
    var lenErr = maxLength(form.description, 5000, 'Description');
    if (lenErr) errors.push(lenErr);
    lenErr = maxLength(form.immediateActions, 2000, 'Immediate actions');
    if (lenErr) errors.push(lenErr);
    // Date checks
    const dateErr = dateNotFuture(form.incidentDate || form.date);
    if (dateErr) errors.push(dateErr);
    const oldErr = dateNotTooOld(form.incidentDate || form.date, 365);
    if (oldErr) errors.push(oldErr);
    return errors;
  }

  function isNotifiableIncident(incident) {
    const notifiable = ['death','serious injury','dangerous incident','hospitalization','amputation','serious burns','spinal injury','loss of consciousness'];
    const text = ((incident.incidentType || '') + ' ' + (incident.severity || '') + ' ' + (incident.description || '')).toLowerCase();
    return notifiable.some(t => text.includes(t));
  }

  // ========================================
  // UNIVERSAL VALIDATE: sanitize + validate any form type
  // ========================================
  function validate(form) {
    if (!form || !form.type) return { valid: false, errors: ['Form type is missing'], form: form };

    // Sanitize all string fields first
    const clean = sanitizeForm(form);

    // Run type-specific validation
    let errors = [];
    switch (clean.type) {
      case 'prestart':   errors = validatePrestart(clean); break;
      case 'toolbox':    errors = validateToolbox(clean); break;
      case 'incident':   errors = validateIncident(clean); break;
      case 'inspection': errors = validateInspection(clean); break;
      case 'itp':        errors = validateITP(clean); break;
      case 'steel-itp':  errors = validateSteelITP(clean); break;
      default: break; // Unknown type — no validation
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      form: clean // Return sanitized form
    };
  }

  return {
    validate: validate,
    sanitize: sanitize,
    sanitizeForm: sanitizeForm,
    escapeHtml: escapeHtml,
    validatePrestart: validatePrestart,
    validateIncident: validateIncident,
    validateToolbox: validateToolbox,
    validateInspection: validateInspection,
    validateITP: validateITP,
    validateSteelITP: validateSteelITP,
    isNotifiableIncident: isNotifiableIncident,
    isPresent: isPresent,
    dateNotFuture: dateNotFuture,
    dateNotTooOld: dateNotTooOld,
    maxLength: maxLength,
    validateEmail: validateEmail,
    validatePhone: validatePhone
  };
})();
