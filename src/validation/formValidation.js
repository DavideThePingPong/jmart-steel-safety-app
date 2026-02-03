/**
 * Form Validation Module for JMart Steel Safety App
 * Extracted from index.html for testability
 *
 * Implements WHS (Work Health & Safety) compliance validation
 */

/**
 * Validates a Pre-Start Checklist form
 * @param {Object} formData - The form data to validate
 * @param {Object} options - Validation options
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export function validatePrestartForm(formData, options = {}) {
  const errors = [];
  const {
    siteConducted,
    supervisorName,
    siteHazards,
    highRiskWorks,
    worksCoveredBySWMS,
    isPlantEquipmentUsed,
    signatures,
    checkType,
    checks
  } = formData;

  // Required fields for WHS compliance
  if (!siteConducted || siteConducted.trim() === '') {
    errors.push('Site/Location is required');
  }

  if (!supervisorName || supervisorName.trim() === '') {
    errors.push('Supervisor name is required');
  }

  // Site hazards must be identified (either value or notes)
  const hazardsValue = typeof siteHazards === 'object' ? siteHazards.value : siteHazards;
  const hazardsNotes = typeof siteHazards === 'object' ? (siteHazards.notes || []) : [];
  if (!hazardsValue && hazardsNotes.length === 0) {
    errors.push('Site hazards must be identified');
  }

  // High-risk works question must be answered
  if (highRiskWorks === null || highRiskWorks === undefined) {
    errors.push('High-risk works question must be answered');
  }

  // SWMS coverage question must be answered
  if (worksCoveredBySWMS === null || worksCoveredBySWMS === undefined) {
    errors.push('SWMS coverage question must be answered');
  }

  // High-risk works require SWMS coverage
  if (highRiskWorks === 'yes' && worksCoveredBySWMS !== 'yes') {
    errors.push('High-risk works require SWMS coverage');
  }

  // Plant/equipment question must be answered
  if (isPlantEquipmentUsed === null || isPlantEquipmentUsed === undefined) {
    errors.push('Plant/equipment question must be answered');
  }

  // At least one worker must sign on
  if (signatures) {
    const signedCount = Object.values(signatures).filter(s => s !== null).length;
    if (signedCount === 0) {
      errors.push('At least one worker must sign on');
    }
  } else {
    errors.push('At least one worker must sign on');
  }

  // Checklist completion check
  if (checkType && checks) {
    const checklistItemCounts = {
      site: 10,
      crane: 5,
      forklift: 5,
      vehicle: 5,
      welding: 5,
      scaffold: 5
    };
    const expectedItems = checklistItemCounts[checkType] || 0;
    const completedItems = Object.keys(checks).length;
    if (completedItems < expectedItems) {
      errors.push(`All ${expectedItems} checklist items must be completed (${completedItems} done)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an Incident Report form
 * @param {Object} formData - The form data to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export function validateIncidentForm(formData) {
  const errors = [];
  const {
    incidentDate,
    incidentTime,
    incidentType,
    location,
    description,
    workerName,
    signature,
    actionTaken
  } = formData;

  // Required fields
  if (!incidentDate) {
    errors.push('Incident date is required');
  } else {
    // Validate date is not in the future
    const incidentDateTime = new Date(incidentDate);
    const now = new Date();
    if (incidentDateTime > now) {
      errors.push('Incident date cannot be in the future');
    }
  }

  if (!incidentTime) {
    errors.push('Incident time is required');
  }

  if (!incidentType || incidentType.trim() === '') {
    errors.push('Incident type is required');
  }

  if (!location || location.trim() === '') {
    errors.push('Location is required');
  }

  if (!description || description.trim() === '') {
    errors.push('Description is required');
  }

  if (!workerName || workerName.trim() === '') {
    errors.push('Worker name is required');
  }

  // Signature is required for incident reports (compliance requirement)
  if (!signature) {
    errors.push('Signature is required for incident reports');
  }

  // Action taken should be documented
  if (!actionTaken || actionTaken.trim() === '') {
    errors.push('Immediate action taken must be documented');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a Toolbox Talk form
 * @param {Object} formData - The form data to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export function validateToolboxForm(formData) {
  const errors = [];
  const {
    topic,
    location,
    conductedBy,
    date,
    attendees,
    keyPoints,
    signature
  } = formData;

  if (!topic || topic.trim() === '') {
    errors.push('Topic is required');
  }

  if (!location || location.trim() === '') {
    errors.push('Location is required');
  }

  if (!conductedBy || conductedBy.trim() === '') {
    errors.push('Conducted by is required');
  }

  if (!date) {
    errors.push('Date is required');
  }

  // At least one attendee required
  if (!attendees || attendees.length === 0) {
    errors.push('At least one attendee is required');
  }

  if (!keyPoints || keyPoints.trim() === '') {
    errors.push('Key points discussed are required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an ITP (Inspection Test Plan) form
 * @param {Object} formData - The form data to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export function validateITPForm(formData) {
  const errors = [];
  const {
    siteName,
    inspectorName,
    date,
    checkpoints,
    supervisorSignature,
    builderSignature
  } = formData;

  if (!siteName || siteName.trim() === '') {
    errors.push('Site name is required');
  }

  if (!inspectorName || inspectorName.trim() === '') {
    errors.push('Inspector name is required');
  }

  if (!date) {
    errors.push('Date is required');
  }

  // All checkpoints must be completed
  if (checkpoints) {
    const incompleteCheckpoints = Object.entries(checkpoints)
      .filter(([key, value]) => value === null || value === undefined);
    if (incompleteCheckpoints.length > 0) {
      errors.push(`${incompleteCheckpoints.length} checkpoint(s) are incomplete`);
    }
  }

  // Supervisor signature required
  if (!supervisorSignature) {
    errors.push('Supervisor signature is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a Site Inspection form
 * @param {Object} formData - The form data to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export function validateSiteInspectionForm(formData) {
  const errors = [];
  const {
    siteName,
    inspectorName,
    date,
    builder,
    areas,
    findings,
    signature
  } = formData;

  if (!siteName || siteName.trim() === '') {
    errors.push('Site name is required');
  }

  if (!inspectorName || inspectorName.trim() === '') {
    errors.push('Inspector name is required');
  }

  if (!date) {
    errors.push('Date is required');
  }

  if (!builder || builder.trim() === '') {
    errors.push('Builder is required');
  }

  // At least one area must be inspected
  if (!areas || areas.length === 0) {
    errors.push('At least one area must be inspected');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates signature data
 * @param {string} signatureData - Base64 signature data
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export function validateSignature(signatureData) {
  const errors = [];

  if (!signatureData) {
    errors.push('Signature is required');
    return { isValid: false, errors };
  }

  // Check if it's a valid base64 data URL
  if (!signatureData.startsWith('data:image/')) {
    errors.push('Invalid signature format');
  }

  // Check minimum length (signature should have some content)
  // A blank canvas would be very small
  if (signatureData.length < 1000) {
    errors.push('Signature appears to be empty or too simple');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generic form validator - routes to specific validators
 * @param {string} formType - Type of form
 * @param {Object} formData - Form data to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export function validateForm(formType, formData) {
  switch (formType) {
    case 'prestart':
      return validatePrestartForm(formData);
    case 'incident':
      return validateIncidentForm(formData);
    case 'toolbox':
      return validateToolboxForm(formData);
    case 'itp':
    case 'steel-itp':
      return validateITPForm(formData);
    case 'inspection':
      return validateSiteInspectionForm(formData);
    default:
      return { isValid: false, errors: [`Unknown form type: ${formType}`] };
  }
}
