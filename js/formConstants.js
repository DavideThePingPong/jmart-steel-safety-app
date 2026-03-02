// ========================================
// FORM CONSTANTS - Shared Data
// Team members, builders, supervisors, checklist definitions
// Used across all form components and views
// ========================================

const FORM_CONSTANTS = {
  // Team members (used for signatures across all forms)
  teamMembers: ['Jeff Fu', 'Scott Seeho', 'Davide Casolini', 'Zonggang Jiang', 'Leon Yu', 'Wang Jia', 'Gen Bao'],

  // Supervisors/preparers (subset of team members with leadership roles)
  supervisors: ['Jeff Fu', 'Scott Seeho', 'Davide Casolini'],

  // Builders (for pre-start and other forms)
  builders: ['Fdc Fitout and Refurbishment', 'Fdc Construction', 'Hunter Mason', 'Built', 'Lendlease'],

  // Default sites (used when no custom sites are configured)
  defaultSites: ['Site 1 - Sydney CBD', 'Site 2 - Parramatta', 'Site 3 - North Sydney', 'Site 4 - Chatswood', 'Site 5 - Liverpool'],

  // Helper: create empty signatures object from teamMembers
  emptySignatures: function() {
    const sigs = {};
    this.teamMembers.forEach(name => { sigs[name] = null; });
    return sigs;
  },

  // Pre-Start Checklist Types
  checklistTypes: [
    { id: 'site', label: 'Site Pre-Start', emoji: '\u{1F3D7}\uFE0F', color: 'bg-blue-500' },
    { id: 'crane', label: 'Crane/Hoist', emoji: '\u{1F3D7}\uFE0F', color: 'bg-orange-500' },
    { id: 'forklift', label: 'Forklift', emoji: '\u{1F69C}', color: 'bg-green-500' },
    { id: 'vehicle', label: 'Vehicle', emoji: '\u{1F697}', color: 'bg-purple-500' },
    { id: 'welding', label: 'Welding Equipment', emoji: '\u{1F525}', color: 'bg-red-500' },
    { id: 'scaffold', label: 'Scaffold', emoji: '\u{1FA9C}', color: 'bg-yellow-500' },
  ],

  // Pre-Start Checklist Items (grouped by type)
  checklistItems: {
    site: [
      { id: 's1', text: 'Site access and egress points clear' },
      { id: 's2', text: 'Exclusion zones and barriers in place' },
      { id: 's3', text: 'First aid kit available and stocked' },
      { id: 's4', text: 'Emergency assembly point identified' },
      { id: 's5', text: 'Fire extinguishers available' },
      { id: 's6', text: 'Site amenities available' },
      { id: 's7', text: 'Electrical leads safe' },
      { id: 's8', text: 'Work area clean and tidy' },
      { id: 's9', text: 'Weather conditions suitable' },
      { id: 's10', text: 'All workers inducted' },
    ],
    crane: [
      { id: 'c1', text: 'Visual inspection completed' },
      { id: 'c2', text: 'Safety devices operational' },
      { id: 'c3', text: 'Load chart available' },
      { id: 'c4', text: 'Wire ropes in good condition' },
      { id: 'c5', text: 'Hooks and latches functioning' },
    ],
    forklift: [
      { id: 'f1', text: 'Pre-operational walk around done' },
      { id: 'f2', text: 'Tyres in good condition' },
      { id: 'f3', text: 'Forks not bent or cracked' },
      { id: 'f4', text: 'Brakes functioning' },
      { id: 'f5', text: 'Horn and lights working' },
    ],
    vehicle: [
      { id: 'v1', text: 'Lights and indicators working' },
      { id: 'v2', text: 'Tyres in good condition' },
      { id: 'v3', text: 'Brakes functioning' },
      { id: 'v4', text: 'Windscreen clear' },
      { id: 'v5', text: 'First aid kit present' },
    ],
    welding: [
      { id: 'w1', text: 'Welding leads inspected' },
      { id: 'w2', text: 'Earth clamp secure' },
      { id: 'w3', text: 'Gas bottles secured' },
      { id: 'w4', text: 'Fire extinguisher nearby' },
      { id: 'w5', text: 'PPE available' },
    ],
    scaffold: [
      { id: 'sc1', text: 'Scaffold tag current' },
      { id: 'sc2', text: 'Base plates in place' },
      { id: 'sc3', text: 'Guardrails in place' },
      { id: 'sc4', text: 'Safe access provided' },
      { id: 'sc5', text: 'No overloading' },
    ],
  },

  // Toolbox Talk Topics
  toolboxTopics: [
    'Manual Handling',
    'Working at Heights',
    'Electrical Safety',
    'Fire Safety',
    'PPE Requirements',
    'Housekeeping',
    'Chemical Safety',
    'Heat Stress',
    'Noise Exposure',
    'Confined Spaces',
    'Other'
  ]
};
