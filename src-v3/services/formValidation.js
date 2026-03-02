/**
 * Form Validation Service v3 for JMart Steel Safety App
 * WHS (Work Health & Safety) Compliance Validation
 *
 * Ensures all safety forms meet regulatory requirements before submission
 * Based on Australian WHS Act 2011 and Construction Work Code of Practice
 */

/**
 * Validation severity levels
 */
export const SEVERITY = {
  ERROR: 'error',      // Blocks submission
  WARNING: 'warning',  // Warns but allows submission
  INFO: 'info'         // Informational only
};

/**
 * Field validation rules for WHS compliance
 */
const WHS_REQUIRED_FIELDS = {
  prestart: {
    // Mandatory fields per WHS Construction Code
    required: [
      { field: 'date', label: 'Date', message: 'Date is required for audit trail' },
      { field: 'siteName', label: 'Site Name', message: 'Site identification is mandatory' },
      { field: 'projectNumber', label: 'Project Number', message: 'Project reference required for traceability' },
      { field: 'conductedBy', label: 'Conducted By', message: 'Inspector name is required' },
      { field: 'plantId', label: 'Plant/Equipment ID', message: 'Equipment identification required' },
      { field: 'operatorName', label: 'Operator Name', message: 'Operator identification is mandatory' }
    ],
    // Fields that should trigger warnings if empty
    recommended: [
      { field: 'operatorLicence', label: 'Operator Licence', message: 'Licence verification recommended' },
      { field: 'lastServiceDate', label: 'Last Service Date', message: 'Service history aids compliance tracking' }
    ],
    // Checklist items that must be completed
    checklistRequired: [
      'emergencyEquipment',
      'ppe',
      'safetyDevices',
      'controlsFunction'
    ]
  },

  incident: {
    required: [
      { field: 'date', label: 'Date', message: 'Incident date is mandatory for reporting' },
      { field: 'time', label: 'Time', message: 'Incident time is mandatory for reporting' },
      { field: 'location', label: 'Location', message: 'Incident location must be documented' },
      { field: 'description', label: 'Description', message: 'Incident description is required' },
      { field: 'reportedBy', label: 'Reported By', message: 'Reporter identification is mandatory' },
      { field: 'incidentType', label: 'Incident Type', message: 'Incident classification is required' }
    ],
    recommended: [
      { field: 'witnesses', label: 'Witnesses', message: 'Witness details strengthen the report' },
      { field: 'immediateActions', label: 'Immediate Actions', message: 'Document actions taken' }
    ],
    // Notifiable incidents require additional fields
    notifiableRequired: [
      { field: 'regulatorNotified', label: 'Regulator Notified', message: 'SafeWork notification required for notifiable incidents' },
      { field: 'notificationTime', label: 'Notification Time', message: 'Notification timing must be documented' }
    ]
  },

  inspection: {
    required: [
      { field: 'date', label: 'Date', message: 'Inspection date is required' },
      { field: 'siteName', label: 'Site Name', message: 'Site identification is mandatory' },
      { field: 'inspector', label: 'Inspector', message: 'Inspector name is required' },
      { field: 'inspectionType', label: 'Inspection Type', message: 'Inspection category is required' }
    ],
    recommended: [
      { field: 'weatherConditions', label: 'Weather Conditions', message: 'Weather may affect safety conditions' },
      { field: 'attendees', label: 'Attendees', message: 'Record who was present' }
    ]
  },

  toolbox: {
    required: [
      { field: 'date', label: 'Date', message: 'Meeting date is required' },
      { field: 'siteName', label: 'Site Name', message: 'Site identification is mandatory' },
      { field: 'conductedBy', label: 'Conducted By', message: 'Presenter name is required' },
      { field: 'topic', label: 'Topic', message: 'Discussion topic is required' },
      { field: 'attendees', label: 'Attendees', message: 'At least one attendee is required', minLength: 1 }
    ],
    recommended: [
      { field: 'keyPoints', label: 'Key Points', message: 'Document key discussion points' },
      { field: 'actionItems', label: 'Action Items', message: 'Record any follow-up actions' }
    ]
  },

  itp: {
    required: [
      { field: 'projectName', label: 'Project Name', message: 'Project identification is required' },
      { field: 'itpNumber', label: 'ITP Number', message: 'Document reference is required' },
      { field: 'revision', label: 'Revision', message: 'Document revision is required' },
      { field: 'preparedBy', label: 'Prepared By', message: 'Author name is required' },
      { field: 'date', label: 'Date', message: 'Document date is required' }
    ],
    recommended: [
      { field: 'approvedBy', label: 'Approved By', message: 'Approval signature recommended' },
      { field: 'clientRef', label: 'Client Reference', message: 'Client reference aids traceability' }
    ]
  }
};

/**
 * Signature validation rules
 */
const SIGNATURE_RULES = {
  prestart: {
    required: ['operatorSignature'],
    recommended: ['supervisorSignature']
  },
  incident: {
    required: ['reporterSignature'],
    recommended: ['supervisorSignature', 'witnessSignature']
  },
  inspection: {
    required: ['inspectorSignature'],
    recommended: []
  },
  toolbox: {
    required: ['presenterSignature'],
    recommended: ['attendeeSignatures']
  },
  itp: {
    required: ['preparedBySignature'],
    recommended: ['approvedBySignature', 'clientSignature']
  }
};

/**
 * Creates a form validation service
 * @param {Object} options - Configuration options
 * @returns {Object} - Validation service
 */
export function createFormValidation(options = {}) {
  const {
    strictMode = false,  // Treat warnings as errors
    customRules = {},    // Additional validation rules
    onValidationError = null
  } = options;

  /**
   * Validate a single field
   */
  function validateField(value, rule) {
    const errors = [];

    // Check required
    if (value === undefined || value === null || value === '') {
      errors.push({
        field: rule.field,
        label: rule.label,
        message: rule.message,
        severity: SEVERITY.ERROR
      });
      return errors;
    }

    // Check minimum length (for arrays)
    if (rule.minLength !== undefined && Array.isArray(value) && value.length < rule.minLength) {
      errors.push({
        field: rule.field,
        label: rule.label,
        message: `${rule.label} requires at least ${rule.minLength} entry`,
        severity: SEVERITY.ERROR
      });
    }

    // Check string minimum length
    if (rule.minLength !== undefined && typeof value === 'string' && value.length < rule.minLength) {
      errors.push({
        field: rule.field,
        label: rule.label,
        message: `${rule.label} must be at least ${rule.minLength} characters`,
        severity: SEVERITY.ERROR
      });
    }

    return errors;
  }

  /**
   * Validate date is not in future
   */
  function validateDateNotFuture(date, fieldName = 'Date') {
    const errors = [];
    const formDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (formDate > today) {
      errors.push({
        field: fieldName.toLowerCase(),
        label: fieldName,
        message: `${fieldName} cannot be in the future`,
        severity: SEVERITY.ERROR
      });
    }

    return errors;
  }

  /**
   * Validate signature exists and is valid
   */
  function validateSignature(signature, fieldName) {
    const errors = [];

    if (!signature || signature === '') {
      errors.push({
        field: fieldName,
        label: fieldName.replace(/([A-Z])/g, ' $1').trim(),
        message: 'Signature is required',
        severity: SEVERITY.ERROR
      });
      return errors;
    }

    // Check if it's a valid data URL (base64 image)
    if (typeof signature === 'string' && !signature.startsWith('data:image/')) {
      errors.push({
        field: fieldName,
        label: fieldName.replace(/([A-Z])/g, ' $1').trim(),
        message: 'Invalid signature format',
        severity: SEVERITY.ERROR
      });
    }

    return errors;
  }

  /**
   * Validate checklist items are completed
   */
  function validateChecklist(form, requiredItems) {
    const errors = [];

    for (const item of requiredItems) {
      const value = form[item] || form.checklist?.[item];

      if (value === undefined || value === null || value === '') {
        errors.push({
          field: item,
          label: item.replace(/([A-Z])/g, ' $1').trim(),
          message: `Checklist item "${item}" must be completed`,
          severity: SEVERITY.ERROR
        });
      }
    }

    return errors;
  }

  /**
   * Validate incident is notifiable
   * Per WHS Act, certain incidents must be reported to regulator
   */
  function isNotifiableIncident(incident) {
    const notifiableTypes = [
      'death',
      'serious injury',
      'dangerous incident',
      'hospitalization',
      'amputation',
      'serious burns',
      'spinal injury',
      'loss of consciousness'
    ];

    const type = (incident.incidentType || '').toLowerCase();
    const severity = (incident.severity || '').toLowerCase();
    const description = (incident.description || '').toLowerCase();

    return notifiableTypes.some(t =>
      type.includes(t) ||
      severity.includes(t) ||
      description.includes(t)
    );
  }

  /**
   * Validate pre-start checklist form
   */
  function validatePrestart(form) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      info: []
    };

    const rules = WHS_REQUIRED_FIELDS.prestart;

    // Required fields
    for (const rule of rules.required) {
      const fieldErrors = validateField(form[rule.field], rule);
      result.errors.push(...fieldErrors);
    }

    // Recommended fields (warnings)
    for (const rule of rules.recommended) {
      if (!form[rule.field]) {
        result.warnings.push({
          field: rule.field,
          label: rule.label,
          message: rule.message,
          severity: SEVERITY.WARNING
        });
      }
    }

    // Date validation
    if (form.date) {
      result.errors.push(...validateDateNotFuture(form.date));
    }

    // Signature validation
    const sigRules = SIGNATURE_RULES.prestart;
    for (const sigField of sigRules.required) {
      result.errors.push(...validateSignature(form[sigField], sigField));
    }
    for (const sigField of sigRules.recommended) {
      if (!form[sigField]) {
        result.warnings.push({
          field: sigField,
          label: sigField.replace(/([A-Z])/g, ' $1').trim(),
          message: 'Signature recommended for compliance',
          severity: SEVERITY.WARNING
        });
      }
    }

    // Checklist validation
    result.errors.push(...validateChecklist(form, rules.checklistRequired));

    // Determine overall validity
    result.valid = result.errors.length === 0;
    if (strictMode && result.warnings.length > 0) {
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate incident report form
   */
  function validateIncident(form) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      info: []
    };

    const rules = WHS_REQUIRED_FIELDS.incident;

    // Required fields
    for (const rule of rules.required) {
      const fieldErrors = validateField(form[rule.field], rule);
      result.errors.push(...fieldErrors);
    }

    // Recommended fields
    for (const rule of rules.recommended) {
      if (!form[rule.field]) {
        result.warnings.push({
          field: rule.field,
          label: rule.label,
          message: rule.message,
          severity: SEVERITY.WARNING
        });
      }
    }

    // Date/time validation
    if (form.date) {
      result.errors.push(...validateDateNotFuture(form.date));
    }

    // Check for notifiable incident requirements
    if (isNotifiableIncident(form)) {
      result.info.push({
        field: 'incidentType',
        label: 'Notifiable Incident',
        message: 'This may be a notifiable incident requiring SafeWork notification within 24-48 hours',
        severity: SEVERITY.INFO
      });

      // Additional required fields for notifiable incidents
      for (const rule of rules.notifiableRequired) {
        if (!form[rule.field]) {
          result.errors.push({
            field: rule.field,
            label: rule.label,
            message: rule.message,
            severity: SEVERITY.ERROR
          });
        }
      }
    }

    // Signature validation
    const sigRules = SIGNATURE_RULES.incident;
    for (const sigField of sigRules.required) {
      result.errors.push(...validateSignature(form[sigField], sigField));
    }

    result.valid = result.errors.length === 0;
    if (strictMode && result.warnings.length > 0) {
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate site inspection form
   */
  function validateInspection(form) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      info: []
    };

    const rules = WHS_REQUIRED_FIELDS.inspection;

    for (const rule of rules.required) {
      result.errors.push(...validateField(form[rule.field], rule));
    }

    for (const rule of rules.recommended) {
      if (!form[rule.field]) {
        result.warnings.push({
          field: rule.field,
          label: rule.label,
          message: rule.message,
          severity: SEVERITY.WARNING
        });
      }
    }

    if (form.date) {
      result.errors.push(...validateDateNotFuture(form.date));
    }

    const sigRules = SIGNATURE_RULES.inspection;
    for (const sigField of sigRules.required) {
      result.errors.push(...validateSignature(form[sigField], sigField));
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate toolbox talk form
   */
  function validateToolbox(form) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      info: []
    };

    const rules = WHS_REQUIRED_FIELDS.toolbox;

    for (const rule of rules.required) {
      result.errors.push(...validateField(form[rule.field], rule));
    }

    for (const rule of rules.recommended) {
      if (!form[rule.field]) {
        result.warnings.push({
          field: rule.field,
          label: rule.label,
          message: rule.message,
          severity: SEVERITY.WARNING
        });
      }
    }

    // Attendees check
    if (!form.attendees || form.attendees.length === 0) {
      result.errors.push({
        field: 'attendees',
        label: 'Attendees',
        message: 'At least one attendee must be recorded',
        severity: SEVERITY.ERROR
      });
    }

    if (form.date) {
      result.errors.push(...validateDateNotFuture(form.date));
    }

    const sigRules = SIGNATURE_RULES.toolbox;
    for (const sigField of sigRules.required) {
      result.errors.push(...validateSignature(form[sigField], sigField));
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate ITP form
   */
  function validateITP(form) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      info: []
    };

    const rules = WHS_REQUIRED_FIELDS.itp;

    for (const rule of rules.required) {
      result.errors.push(...validateField(form[rule.field], rule));
    }

    for (const rule of rules.recommended) {
      if (!form[rule.field]) {
        result.warnings.push({
          field: rule.field,
          label: rule.label,
          message: rule.message,
          severity: SEVERITY.WARNING
        });
      }
    }

    const sigRules = SIGNATURE_RULES.itp;
    for (const sigField of sigRules.required) {
      result.errors.push(...validateSignature(form[sigField], sigField));
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate any form by type
   */
  function validate(form, formType) {
    let result;

    switch (formType) {
      case 'prestart':
        result = validatePrestart(form);
        break;
      case 'incident':
        result = validateIncident(form);
        break;
      case 'inspection':
        result = validateInspection(form);
        break;
      case 'toolbox':
        result = validateToolbox(form);
        break;
      case 'itp':
      case 'steel-itp':
        result = validateITP(form);
        break;
      default:
        result = {
          valid: true,
          errors: [],
          warnings: [{ message: `Unknown form type: ${formType}` }],
          info: []
        };
    }

    // Apply custom rules
    if (customRules[formType]) {
      const customResult = customRules[formType](form);
      result.errors.push(...(customResult.errors || []));
      result.warnings.push(...(customResult.warnings || []));
      result.valid = result.errors.length === 0;
    }

    // Callback on errors
    if (!result.valid && onValidationError) {
      onValidationError(result, form, formType);
    }

    return result;
  }

  /**
   * Get validation rules for a form type
   */
  function getRules(formType) {
    return {
      fields: WHS_REQUIRED_FIELDS[formType] || {},
      signatures: SIGNATURE_RULES[formType] || {}
    };
  }

  /**
   * Check if form can be submitted (quick check)
   */
  function canSubmit(form, formType) {
    const result = validate(form, formType);
    return result.valid;
  }

  /**
   * Get human-readable summary of validation result
   */
  function getSummary(result) {
    if (result.valid) {
      if (result.warnings.length > 0) {
        return `Form is valid with ${result.warnings.length} warning(s)`;
      }
      return 'Form is valid and ready for submission';
    }

    return `Form has ${result.errors.length} error(s) that must be fixed`;
  }

  return {
    validate,
    validatePrestart,
    validateIncident,
    validateInspection,
    validateToolbox,
    validateITP,
    canSubmit,
    getRules,
    getSummary,
    isNotifiableIncident,
    SEVERITY
  };
}

export default createFormValidation;
