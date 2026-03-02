// PDF Generator Configuration
// Labels, colors, and checklist mappings used by PDFGenerator

const PDFConfig = {
  folderMap: {
    'prestart': 'Pre-Start Checklist',
    'inspection': 'Site Inspection',
    'itp': 'ITP Form',
    'incident': 'Incident Report',
    'toolbox': 'Toolbox Talk',
    'steel-itp': 'Steel ITP',
    'training': 'Training Certificate'
  },

  fieldLabels: {
    supervisorName: 'Supervisor',
    siteConducted: 'Site',
    builder: 'Builder',
    address: 'Address',
    workAreas: 'Work Areas',
    taskToComplete: 'Tasks This Shift',
    plantEquipment: 'Plant/Equipment Used',
    siteHazards: 'Site Specific Hazards',
    permitsRequired: 'Permits Required',
    highRiskWorks: 'High Risk Works',
    swmsCovered: 'SWMS Covered',
    safetyIssues: 'Safety Issues from Previous Shift',
    workerName: 'Worker Name',
    incidentDate: 'Incident Date',
    incidentTime: 'Incident Time',
    incidentType: 'Incident Type',
    description: 'Description',
    actionTaken: 'Action Taken',
    witnesses: 'Witnesses',
    injuries: 'Injuries',
    topic: 'Topic',
    attendees: 'Attendees',
    keyPoints: 'Key Points',
    location: 'Location',
    inspectorName: 'Inspector',
    notes: 'Notes',
    comments: 'Comments'
  },

  checklistLabels: {
    // Site Pre-Start
    s1: 'Site access and egress points clear',
    s2: 'Exclusion zones and barriers in place',
    s3: 'First aid kit available and stocked',
    s4: 'Emergency assembly point identified',
    s5: 'Fire extinguishers available',
    s6: 'Site amenities available',
    s7: 'Electrical leads safe',
    s8: 'Work area clean and tidy',
    s9: 'Weather conditions suitable',
    s10: 'All workers inducted',
    // Crane/Hoist
    c1: 'Visual inspection completed',
    c2: 'Safety devices operational',
    c3: 'Load chart available',
    c4: 'Wire ropes in good condition',
    c5: 'Hooks and latches functioning',
    // Forklift
    f1: 'Pre-operational walk around done',
    f2: 'Tyres in good condition',
    f3: 'Forks not bent or cracked',
    f4: 'Brakes functioning',
    f5: 'Horn and lights working',
    // Vehicle
    v1: 'Lights and indicators working',
    v2: 'Tyres in good condition',
    v3: 'Brakes functioning',
    v4: 'Windscreen clear',
    v5: 'First aid kit present',
    // Welding
    w1: 'Welding leads inspected',
    w2: 'Earth clamp secure',
    w3: 'Gas bottles secured',
    w4: 'Fire extinguisher nearby',
    w5: 'PPE available',
    // Scaffold
    sc1: 'Scaffold tag current',
    sc2: 'Base plates in place',
    sc3: 'Guardrails in place',
    sc4: 'Safe access provided',
    sc5: 'No overloading',
    // Legacy labels
    siteAccess: 'Site access and egress points clear',
    exclusionZones: 'Exclusion zones and barriers in place',
    firstAid: 'First aid kit available and stocked',
    emergencyAssembly: 'Emergency assembly point identified',
    fireExtinguishers: 'Fire extinguishers available',
    amenities: 'Site amenities available',
    ppe: 'PPE requirements confirmed',
    hazards: 'Hazards identified and controlled',
    permits: 'Required permits obtained',
    communication: 'Communication systems working'
  },

  colors: {
    primary: [234, 88, 12],      // Orange
    secondary: [249, 115, 22],   // Light orange
    success: [34, 197, 94],      // Green
    danger: [239, 68, 68],       // Red
    dark: [31, 41, 55],          // Dark gray
    gray: [107, 114, 128],       // Gray
    lightGray: [243, 244, 246],  // Light gray
    white: [255, 255, 255]
  }
};
