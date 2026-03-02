/**
 * Welding Consumables Data
 * For estimating rod/wire quantities
 *
 * Based on AS/NZS 1554 Structural Steel Welding
 */

/**
 * Fillet weld metal volumes
 * Volume in mm³ per mm of weld length
 * Assumes equal leg fillet with reinforcement factor
 */
export const FILLET_WELD_VOLUME = {
  // Leg size (mm) -> volume (mm³/mm), including 15% reinforcement
  3: 5.2,
  4: 9.2,
  5: 14.4,
  6: 20.7,
  8: 36.8,
  10: 57.5,
  12: 82.8,
  16: 147.2,
  20: 230.0
};

/**
 * Butt weld metal volumes (single V, 60° included angle)
 * Volume in mm³ per mm of weld length
 */
export const BUTT_WELD_VOLUME = {
  // Plate thickness (mm) -> volume (mm³/mm)
  3: 8,
  4: 12,
  5: 18,
  6: 25,
  8: 42,
  10: 62,
  12: 88,
  16: 150,
  20: 230,
  25: 355
};

/**
 * Welding consumable specifications
 */
export const CONSUMABLES = {
  // MMA (Stick) electrodes
  E4816: {
    name: 'E4816 (7016/7018 Low Hydrogen)',
    process: 'MMA/SMAW',
    type: 'electrode',
    diameter_mm: [2.5, 3.2, 4.0, 5.0],
    deposition_rate_kg_hr: { 2.5: 0.8, 3.2: 1.2, 4.0: 1.8, 5.0: 2.5 },
    recovery_percent: 105,  // Flux-cored recovery
    typical_amps: { 2.5: '70-100', 3.2: '100-140', 4.0: '140-190', 5.0: '180-250' }
  },

  E4811: {
    name: 'E4811 (6011 Cellulosic)',
    process: 'MMA/SMAW',
    type: 'electrode',
    diameter_mm: [2.5, 3.2, 4.0],
    deposition_rate_kg_hr: { 2.5: 0.7, 3.2: 1.0, 4.0: 1.5 },
    recovery_percent: 95,
    typical_amps: { 2.5: '60-90', 3.2: '90-130', 4.0: '130-170' }
  },

  // MIG wires
  ER70S6: {
    name: 'ER70S-6 Solid Wire',
    process: 'MIG/GMAW',
    type: 'wire',
    diameter_mm: [0.8, 0.9, 1.0, 1.2],
    deposition_rate_kg_hr: { 0.8: 1.5, 0.9: 2.0, 1.0: 2.5, 1.2: 3.5 },
    recovery_percent: 98,
    gas: '75/25 Ar/CO2 or 100% CO2'
  },

  E71T1: {
    name: 'E71T-1 Flux-cored',
    process: 'FCAW',
    type: 'wire',
    diameter_mm: [1.2, 1.6],
    deposition_rate_kg_hr: { 1.2: 3.5, 1.6: 5.0 },
    recovery_percent: 85,
    gas: '100% CO2 or 75/25 Ar/CO2'
  },

  E71T11: {
    name: 'E71T-11 Self-shielded',
    process: 'FCAW-S',
    type: 'wire',
    diameter_mm: [1.2, 1.6, 2.0],
    deposition_rate_kg_hr: { 1.2: 2.5, 1.6: 3.5, 2.0: 4.5 },
    recovery_percent: 82,
    gas: 'None (self-shielded)'
  }
};

/**
 * Steel density for weight calculations
 */
export const STEEL_DENSITY = 7850; // kg/m³

/**
 * Wastage factors by process
 */
export const WASTAGE_FACTORS = {
  MMA: 1.35,    // 35% stub ends, spatter, slag
  MIG: 1.05,    // 5% spatter
  FCAW: 1.12,   // 12% spatter and slag
  'FCAW-S': 1.15, // 15% spatter and slag
  TIG: 1.02     // 2% minimal waste
};

/**
 * Common weld joint configurations
 */
export const JOINT_TYPES = {
  fillet_single: {
    name: 'Single Fillet',
    sides: 1,
    volumeCalc: (leg, length) => FILLET_WELD_VOLUME[leg] * length
  },
  fillet_double: {
    name: 'Double Fillet (both sides)',
    sides: 2,
    volumeCalc: (leg, length) => FILLET_WELD_VOLUME[leg] * length * 2
  },
  butt_single_v: {
    name: 'Single V Butt',
    volumeCalc: (thickness, length) => BUTT_WELD_VOLUME[thickness] * length
  },
  butt_double_v: {
    name: 'Double V Butt',
    volumeCalc: (thickness, length) => BUTT_WELD_VOLUME[thickness] * length * 0.6 // Less fill than single V
  }
};

/**
 * Preheat requirements per AS/NZS 1554.1
 * Based on combined thickness and CE (carbon equivalent)
 */
export const PREHEAT_REQUIREMENTS = {
  // Combined thickness (mm) -> minimum preheat (°C) for CE < 0.4
  low_ce: {
    20: 0,
    40: 50,
    60: 75,
    80: 100,
    100: 125
  },
  // For CE 0.4-0.5
  medium_ce: {
    20: 50,
    40: 75,
    60: 100,
    80: 125,
    100: 150
  },
  // For CE > 0.5
  high_ce: {
    20: 75,
    40: 100,
    60: 125,
    80: 150,
    100: 175
  }
};

export default {
  FILLET_WELD_VOLUME,
  BUTT_WELD_VOLUME,
  CONSUMABLES,
  STEEL_DENSITY,
  WASTAGE_FACTORS,
  JOINT_TYPES,
  PREHEAT_REQUIREMENTS
};
