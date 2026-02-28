// ========================================
// FORM VALIDATOR - WHS Compliance
// Extracted from index.html for maintainability
// Adapted from src-v3/services/formValidation.js
// ========================================
window.formValidator = (function() {
  // Validate a value is present
  function isPresent(val) {
    if (val === undefined || val === null || val === '') return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }

  // Validate date is not in future
  function dateNotFuture(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const today = new Date(); today.setHours(23,59,59,999);
    if (d > today) return 'Date cannot be in the future';
    return null;
  }

  // Toolbox talk validation
  function validateToolbox(form) {
    const errors = [];
    if (!isPresent(form.siteConducted)) errors.push('Site/Location is required');
    if (!isPresent(form.preparedBy)) errors.push('Presented By is required');
    if (!isPresent(form.topics || form.selectedTopics)) errors.push('At least one topic must be selected');
    const signedCount = form.signatures ? Object.values(form.signatures).filter(s => s !== null).length : 0;
    if (signedCount === 0) errors.push('At least one attendee must sign on');
    return errors;
  }

  // Inspection validation
  function validateInspection(form) {
    const errors = [];
    if (!isPresent(form.siteConducted)) errors.push('Site/Location is required');
    if (!isPresent(form.preparedBy)) errors.push('Prepared By is required');
    if (!isPresent(form.completedBy)) errors.push('Completed By is required');
    // Check at least some inspection items answered
    if (form.inspectionItems) {
      const answered = Object.values(form.inspectionItems).filter(v => v !== null && v !== undefined).length;
      const total = Object.keys(form.inspectionItems).length;
      if (answered < total) errors.push('All ' + total + ' inspection items must be completed (' + answered + ' done)');
    }
    return errors;
  }

  // ITP (Glass) validation
  function validateITP(form) {
    const errors = [];
    if (!isPresent(form.siteConducted)) errors.push('Site/Location is required');
    if (!isPresent(form.preparedBy)) errors.push('Prepared By is required');
    if (!isPresent(form.builderSignoffName)) errors.push('Builder name is required');
    if (!isPresent(form.builderSignature)) errors.push('Builder signature is required');
    return errors;
  }

  // Steel ITP validation
  function validateSteelITP(form) {
    const errors = [];
    if (!isPresent(form.siteConducted)) errors.push('Site/Location is required');
    if (!isPresent(form.preparedBy)) errors.push('Prepared By is required');
    if (!isPresent(form.managerName)) errors.push('Manager name is required');
    if (!isPresent(form.managerSignature)) errors.push('Manager signature is required');
    return errors;
  }

  // Pre-start checklist validation
  function validatePrestart(form) {
    const errors = [];
    if (!isPresent(form.supervisorName)) errors.push('Supervisor name is required');
    if (!isPresent(form.siteConducted)) errors.push('Site/Location is required');
    if (!isPresent(form.builder)) errors.push('Builder is required');
    if (!isPresent(form.address)) errors.push('Address is required');
    if (!isPresent(form.highRiskWorks)) errors.push('High Risk Works selection is required');
    if (!isPresent(form.worksCoveredBySWMS)) errors.push('SWMS coverage selection is required');
    if (!isPresent(form.isPlantEquipmentUsed)) errors.push('Plant/Equipment selection is required');
    const signedCount = form.signatures ? Object.values(form.signatures).filter(s => s !== null).length : 0;
    if (signedCount === 0) errors.push('At least one worker must sign on');
    return errors;
  }

  // Incident report validation
  function validateIncident(form) {
    const errors = [];
    if (!isPresent(form.incidentType)) errors.push('Incident type is required');
    if (!isPresent(form.incidentDate)) errors.push('Date of incident is required');
    if (!isPresent(form.location)) errors.push('Location is required');
    if (!isPresent(form.description)) errors.push('Description is required');
    if (!isPresent(form.reportedBy)) errors.push('Reporter name is required');
    if (!isPresent(form.immediateActions)) errors.push('Immediate actions taken is required');
    if (!isPresent(form.reporterSignature)) errors.push('Reporter signature is required');
    const dateErr = dateNotFuture(form.incidentDate);
    if (dateErr) errors.push(dateErr);
    return errors;
  }

  // Check if incident is notifiable (WHS Act 2011)
  function isNotifiableIncident(incident) {
    const notifiable = ['death','serious injury','dangerous incident','hospitalization','amputation','serious burns','spinal injury','loss of consciousness'];
    const text = ((incident.incidentType || '') + ' ' + (incident.severity || '') + ' ' + (incident.description || '')).toLowerCase();
    return notifiable.some(t => text.includes(t));
  }

  return {
    validatePrestart: validatePrestart,
    validateIncident: validateIncident,
    validateToolbox: validateToolbox,
    validateInspection: validateInspection,
    validateITP: validateITP,
    validateSteelITP: validateSteelITP,
    isNotifiableIncident: isNotifiableIncident,
    isPresent: isPresent,
    dateNotFuture: dateNotFuture
  };
})();
