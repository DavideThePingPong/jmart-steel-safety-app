/**
 * SITE TOOLS - For when you're sweating and can't fuck up
 *
 * Design principles:
 * 1. ONE INPUT → ONE ANSWER (no navigation)
 * 2. OFFLINE FIRST (no network = still works)
 * 3. VERIFY EVERYTHING (catch mistakes before they cost money)
 * 4. SHOW THE MATH (so you can double-check)
 * 5. PREVENT DANGEROUS ERRORS (stop before someone gets hurt)
 */

import { STEEL_SECTIONS, SECTION_FULL_NAMES } from './data/steelSections.js';

// =============================================================================
// BOLT TORQUE VALUES - MEMORIZE THESE OR USE THIS
// AS 4100 Table 15.2.5.1 - Snug tight + part turn method
// =============================================================================

const BOLT_TORQUE = {
  // Grade 4.6 (property class 4.6) - mild steel bolts
  '4.6': {
    M12: { snug: 45, full: 85 },
    M16: { snug: 110, full: 200 },
    M20: { snug: 220, full: 390 },
    M24: { snug: 380, full: 680 },
    M30: { snug: 750, full: 1350 }
  },
  // Grade 8.8 (property class 8.8) - high tensile
  '8.8': {
    M12: { snug: 85, full: 170 },
    M16: { snug: 200, full: 400 },
    M20: { snug: 390, full: 785 },
    M24: { snug: 680, full: 1350 },
    M30: { snug: 1350, full: 2700 },
    M36: { snug: 2400, full: 4700 }
  },
  // Grade 10.9 (property class 10.9) - extra high tensile
  '10.9': {
    M12: { snug: 120, full: 240 },
    M16: { snug: 290, full: 580 },
    M20: { snug: 570, full: 1140 },
    M24: { snug: 980, full: 1960 },
    M30: { snug: 1950, full: 3900 }
  }
};

// Common hole sizes for bolts
const BOLT_HOLES = {
  M12: { standard: 14, oversize: 16, slot_short: '14x18', slot_long: '14x30' },
  M16: { standard: 18, oversize: 20, slot_short: '18x22', slot_long: '18x40' },
  M20: { standard: 22, oversize: 24, slot_short: '22x26', slot_long: '22x50' },
  M24: { standard: 26, oversize: 30, slot_short: '26x32', slot_long: '26x60' },
  M30: { standard: 33, oversize: 37, slot_short: '33x40', slot_long: '33x75' },
  M36: { standard: 39, oversize: 44, slot_short: '39x46', slot_long: '39x90' }
};

// =============================================================================
// WEIGHT LOOKUP - INSTANT, NO BULLSHIT
// =============================================================================

/**
 * Weight cache for instant lookup
 * Pre-computed for speed
 */
const WEIGHT_CACHE = buildWeightCache();

function buildWeightCache() {
  const cache = {};

  Object.entries(STEEL_SECTIONS).forEach(([type, section]) => {
    Object.entries(section.data).forEach(([size, massPerM]) => {
      // Multiple lookup keys for the same thing
      // Because on site you might say "50x50x3" or "50 SHS" or "SHS 50x50x3"
      const keys = [
        `${type} ${size}`.toLowerCase(),
        `${size} ${type}`.toLowerCase(),
        size.toLowerCase(),
        `${type}${size}`.toLowerCase().replace(/\s/g, '')
      ];

      keys.forEach(key => {
        cache[key] = { type, size, massPerM, fullName: SECTION_FULL_NAMES[type] };
      });
    });
  });

  return cache;
}

/**
 * INSTANT weight lookup - type anything, get answer
 * @param {string} query - "50x50x3 SHS", "310UB40", "SHS 100x100x6", etc.
 * @returns {Object} - The answer or suggestions
 */
function whatWeighs(query) {
  if (!query || typeof query !== 'string') {
    return { error: 'Type something like "310UB40" or "50x50x3 SHS"' };
  }

  const q = query.toLowerCase().trim().replace(/\s+/g, ' ');

  // Direct lookup
  if (WEIGHT_CACHE[q]) {
    const data = WEIGHT_CACHE[q];
    return {
      found: true,
      section: `${data.type} ${data.size}`,
      fullName: data.fullName,
      massPerMetre: data.massPerM,
      // Quick reference weights
      weight_1m: data.massPerM,
      weight_6m: round(data.massPerM * 6, 1),
      weight_12m: round(data.massPerM * 12, 1)
    };
  }

  // Try partial match
  const matches = Object.entries(WEIGHT_CACHE)
    .filter(([key, _]) => key.includes(q) || q.includes(key.split(' ')[1] || ''))
    .slice(0, 5)
    .map(([_, data]) => `${data.type} ${data.size} = ${data.massPerM} kg/m`);

  if (matches.length > 0) {
    return {
      found: false,
      message: `Did you mean:`,
      suggestions: matches
    };
  }

  return {
    found: false,
    message: 'Not found. Examples: "310UB40", "100x100x6 SHS", "150PFC"'
  };
}

/**
 * Quick weight for a specific piece
 * @param {string} section - Section identifier
 * @param {number} length - Length in metres
 * @param {number} qty - Quantity (default 1)
 */
function quickWeight(section, length, qty = 1) {
  const lookup = whatWeighs(section);

  if (!lookup.found) {
    return lookup;
  }

  if (length <= 0) {
    return { error: 'Length must be positive' };
  }

  if (length > 18) {
    return { error: `${length}m exceeds max stock length (18m). Did you mean ${length/1000}m?` };
  }

  const total = round(lookup.massPerMetre * length * qty, 1);

  return {
    section: lookup.section,
    length,
    qty,
    massPerMetre: lookup.massPerMetre,
    totalWeight: total,
    // For crane
    totalTonnes: round(total / 1000, 2),
    // Show the math so you can verify
    calculation: `${lookup.massPerMetre} kg/m × ${length}m × ${qty} = ${total} kg`
  };
}

// =============================================================================
// DELIVERY VERIFICATION - CATCH WRONG STEEL BEFORE IT'S TOO LATE
// =============================================================================

/**
 * Verify delivery weight matches what should have arrived
 * @param {Array} items - [{ section, length, qty }]
 * @param {number} docketWeight - Weight on delivery docket (kg)
 * @param {number} tolerance - Acceptable tolerance % (default 3%)
 */
function verifyDelivery(items, docketWeight, tolerance = 3) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Enter items as array: [{ section: "310UB40", length: 6, qty: 4 }]' };
  }

  let calculatedWeight = 0;
  const breakdown = [];
  const errors = [];

  items.forEach((item, idx) => {
    const result = quickWeight(item.section, item.length, item.qty || 1);

    if (result.error) {
      errors.push(`Item ${idx + 1}: ${result.error}`);
    } else if (!result.totalWeight) {
      errors.push(`Item ${idx + 1}: Could not calculate weight`);
    } else {
      calculatedWeight += result.totalWeight;
      breakdown.push({
        item: result.section,
        length: item.length,
        qty: item.qty || 1,
        weight: result.totalWeight
      });
    }
  });

  if (errors.length > 0) {
    return { error: 'Fix these first:', errors };
  }

  const difference = docketWeight - calculatedWeight;
  const differencePercent = round((difference / calculatedWeight) * 100, 1);
  const withinTolerance = Math.abs(differencePercent) <= tolerance;

  const result = {
    calculatedWeight: round(calculatedWeight, 1),
    docketWeight,
    difference: round(difference, 1),
    differencePercent,
    tolerance,
    breakdown,
    calculation: breakdown.map(b => `${b.item} × ${b.length}m × ${b.qty} = ${b.weight}kg`).join('\n')
  };

  if (withinTolerance) {
    result.status = '✓ WEIGHT OK';
    result.message = `Difference ${differencePercent}% is within ${tolerance}% tolerance`;
  } else if (difference > 0) {
    result.status = '⚠️ DOCKET HEAVIER';
    result.message = `Docket shows ${round(difference, 1)}kg MORE than calculated. Check for extra items or wrong sections.`;
    result.possibleCauses = [
      'Extra pieces included',
      'Heavier section supplied (e.g., 310UB46 instead of 310UB40)',
      'Longer lengths than ordered',
      'Offcuts included'
    ];
  } else {
    result.status = '⚠️ DOCKET LIGHTER';
    result.message = `Docket shows ${round(Math.abs(difference), 1)}kg LESS than calculated. CHECK FOR MISSING ITEMS.`;
    result.possibleCauses = [
      'Missing pieces',
      'Lighter section supplied (e.g., 310UB32 instead of 310UB40)',
      'Shorter lengths than ordered'
    ];
  }

  return result;
}

// =============================================================================
// SECTION IDENTIFICATION - WHAT IS THIS PIECE?
// =============================================================================

/**
 * Identify a section from measurements
 * For when you're looking at steel and need to know what it is
 *
 * @param {Object} measurements - { depth?, width?, flange?, web?, wall?, od?, leg? }
 * @param {string} shape - 'I', 'H', 'C', 'L', 'SHS', 'RHS', 'CHS', 'flat', 'round'
 */
function identifySection(measurements, shape) {
  const { depth, width, flange, web, wall, od, leg } = measurements;
  const candidates = [];

  // Tolerance for measurement matching (mm)
  const tol = 2;

  function within(measured, nominal) {
    return Math.abs(measured - nominal) <= tol;
  }

  if (shape === 'I' || shape === 'H' || !shape) {
    // Check UB, UC, WB, WC
    ['UB', 'UC', 'WB', 'WC'].forEach(type => {
      if (!STEEL_SECTIONS[type]) return;

      Object.entries(STEEL_SECTIONS[type].data).forEach(([size, mass]) => {
        // Parse depth from size (e.g., "310UB40" -> 310)
        const nominalDepth = parseInt(size);

        if (depth && within(depth, nominalDepth)) {
          candidates.push({
            section: `${type} ${size}`,
            mass,
            match: 'depth',
            nominalDepth
          });
        }
      });
    });
  }

  if (shape === 'SHS' || !shape) {
    if (STEEL_SECTIONS.SHS && (width || depth)) {
      const size = width || depth;
      Object.entries(STEEL_SECTIONS.SHS.data).forEach(([sizeStr, mass]) => {
        const dims = sizeStr.split('x').map(Number);
        if (within(size, dims[0])) {
          if (!wall || within(wall, dims[2])) {
            candidates.push({
              section: `SHS ${sizeStr}`,
              mass,
              match: wall ? 'size+wall' : 'size'
            });
          }
        }
      });
    }
  }

  if (shape === 'RHS' || !shape) {
    if (STEEL_SECTIONS.RHS && depth && width) {
      Object.entries(STEEL_SECTIONS.RHS.data).forEach(([sizeStr, mass]) => {
        const dims = sizeStr.split('x').map(Number);
        if ((within(depth, dims[0]) && within(width, dims[1])) ||
            (within(depth, dims[1]) && within(width, dims[0]))) {
          if (!wall || within(wall, dims[2])) {
            candidates.push({
              section: `RHS ${sizeStr}`,
              mass,
              match: wall ? 'dims+wall' : 'dims'
            });
          }
        }
      });
    }
  }

  if (shape === 'CHS' || !shape) {
    if (STEEL_SECTIONS.CHS && od) {
      Object.entries(STEEL_SECTIONS.CHS.data).forEach(([sizeStr, mass]) => {
        const dims = sizeStr.split('x').map(Number);
        if (within(od, dims[0])) {
          if (!wall || within(wall, dims[1])) {
            candidates.push({
              section: `CHS ${sizeStr}`,
              mass,
              match: wall ? 'od+wall' : 'od'
            });
          }
        }
      });
    }
  }

  if (shape === 'C' || !shape) {
    if (STEEL_SECTIONS.PFC && depth) {
      Object.entries(STEEL_SECTIONS.PFC.data).forEach(([sizeStr, mass]) => {
        const dims = sizeStr.split('x').map(Number);
        if (within(depth, dims[0])) {
          candidates.push({
            section: `PFC ${sizeStr}`,
            mass,
            match: 'depth'
          });
        }
      });
    }
  }

  if (shape === 'L' || !shape) {
    if (leg) {
      ['EA', 'UA'].forEach(type => {
        if (!STEEL_SECTIONS[type]) return;

        Object.entries(STEEL_SECTIONS[type].data).forEach(([sizeStr, mass]) => {
          const dims = sizeStr.split('x').map(Number);
          if (within(leg, dims[0]) || within(leg, dims[1])) {
            candidates.push({
              section: `${type} ${sizeStr}`,
              mass,
              match: 'leg'
            });
          }
        });
      });
    }
  }

  if (candidates.length === 0) {
    return {
      found: false,
      message: 'No match found. Provide more measurements or check values.',
      tip: 'Measure: depth (total height), width (flange width), wall thickness'
    };
  }

  // Sort by match quality
  const bestMatches = candidates
    .sort((a, b) => {
      // Prioritize more specific matches
      const matchScore = { 'dims+wall': 3, 'size+wall': 3, 'od+wall': 3, 'dims': 2, 'size': 2, 'depth': 1, 'od': 1, 'leg': 1 };
      return (matchScore[b.match] || 0) - (matchScore[a.match] || 0);
    })
    .slice(0, 5);

  return {
    found: true,
    bestGuess: bestMatches[0],
    alternatives: bestMatches.slice(1),
    tip: 'Verify by weighing a known length. 1m of ' + bestMatches[0].section + ' = ' + bestMatches[0].mass + 'kg'
  };
}

// =============================================================================
// BOLT TORQUE - INSTANT LOOKUP
// =============================================================================

/**
 * Get bolt torque value
 * @param {string} size - M12, M16, M20, M24, M30, M36
 * @param {string} grade - "4.6", "8.8", "10.9"
 * @param {string} type - "snug" or "full"
 */
function boltTorque(size, grade = '8.8', type = 'full') {
  const sizeUpper = size.toUpperCase();
  const gradeData = BOLT_TORQUE[grade];

  if (!gradeData) {
    return { error: `Unknown grade "${grade}". Use: 4.6, 8.8, or 10.9` };
  }

  const sizeData = gradeData[sizeUpper];
  if (!sizeData) {
    return { error: `No data for ${sizeUpper} grade ${grade}. Available: ${Object.keys(gradeData).join(', ')}` };
  }

  const holeData = BOLT_HOLES[sizeUpper];

  return {
    bolt: `${sizeUpper} Grade ${grade}`,
    snugTorque: sizeData.snug,
    fullTorque: sizeData.full,
    recommendedTorque: type === 'snug' ? sizeData.snug : sizeData.full,
    unit: 'Nm',
    holeSize: holeData?.standard,
    note: type === 'snug'
      ? 'Snug tight = impact wrench stops, then 1/2 to 1 turn more by hand'
      : 'Full tension = per AS 4100, verify with calibrated wrench'
  };
}

/**
 * Quick bolt count for simple connections
 * @param {number} load - Load in kN
 * @param {string} boltSize - M16, M20, etc.
 * @param {string} loadType - 'shear' or 'tension'
 * @param {string} grade - '8.8' or '10.9'
 */
function boltCount(load, boltSize = 'M20', loadType = 'shear', grade = '8.8') {
  // Simplified capacities per AS 4100 (φ = 0.8 for shear, 0.8 for tension)
  const capacities = {
    '8.8': {
      M12: { shear: 30.6, tension: 49.8 },   // Single shear
      M16: { shear: 54.8, tension: 91.6 },
      M20: { shear: 86.1, tension: 143 },
      M24: { shear: 124, tension: 206 },
      M30: { shear: 194, tension: 323 }
    },
    '10.9': {
      M12: { shear: 37.7, tension: 61.2 },
      M16: { shear: 67.5, tension: 113 },
      M20: { shear: 106, tension: 176 },
      M24: { shear: 153, tension: 254 },
      M30: { shear: 239, tension: 398 }
    }
  };

  const gradeData = capacities[grade];
  if (!gradeData) {
    return { error: `Unknown grade ${grade}` };
  }

  const sizeData = gradeData[boltSize.toUpperCase()];
  if (!sizeData) {
    return { error: `No data for ${boltSize}` };
  }

  const capacity = sizeData[loadType];
  const boltsNeeded = Math.ceil(load / capacity);

  return {
    load: `${load} kN ${loadType}`,
    bolt: `${boltSize} Grade ${grade}`,
    capacityPerBolt: capacity,
    boltsRequired: boltsNeeded,
    totalCapacity: round(boltsNeeded * capacity, 1),
    safetyMargin: round(((boltsNeeded * capacity) / load - 1) * 100, 0) + '%',
    warning: boltsNeeded > 8 ? 'Consider larger bolts or more rows' : null
  };
}

// =============================================================================
// SAFETY INTERLOCKS - PREVENT DANGEROUS MISTAKES
// =============================================================================

/**
 * Validate a lift before it happens
 * @param {number} loadWeight - Load in kg
 * @param {number} craneCapacity - Crane capacity at this radius in kg
 * @param {number} slingAngle - Sling angle from vertical in degrees
 */
function validateLift(loadWeight, craneCapacity, slingAngle = 60) {
  const errors = [];
  const warnings = [];

  // Load checks
  if (loadWeight <= 0) {
    errors.push('Load weight must be positive');
  }

  if (loadWeight > craneCapacity) {
    errors.push(`⛔ OVERLOAD: ${loadWeight}kg exceeds crane capacity of ${craneCapacity}kg`);
  }

  const utilizationPercent = round((loadWeight / craneCapacity) * 100, 0);

  if (utilizationPercent > 90) {
    warnings.push(`⚠️ ${utilizationPercent}% crane utilization - very close to limit`);
  } else if (utilizationPercent > 80) {
    warnings.push(`${utilizationPercent}% crane utilization - monitor closely`);
  }

  // Sling angle checks
  if (slingAngle < 30) {
    errors.push('⛔ SLING ANGLE TOO SHALLOW: Must be ≥30° from vertical');
  } else if (slingAngle < 45) {
    warnings.push('⚠️ Sling angle below 45° - high sling loads, increase headroom if possible');
  }

  // Result
  if (errors.length > 0) {
    return {
      safe: false,
      status: '⛔ DO NOT LIFT',
      errors,
      warnings
    };
  }

  return {
    safe: true,
    status: '✓ LIFT OK',
    loadWeight,
    craneCapacity,
    utilization: utilizationPercent + '%',
    slingAngle,
    warnings: warnings.length > 0 ? warnings : ['All checks passed']
  };
}

/**
 * Double-check critical calculation
 * @param {number} value1 - First calculation result
 * @param {number} value2 - Second calculation (verification)
 * @param {number} tolerance - Acceptable difference %
 * @param {string} description - What we're checking
 */
function verifyCalculation(value1, value2, tolerance = 1, description = 'Calculation') {
  const diff = Math.abs(value1 - value2);
  const diffPercent = round((diff / Math.max(value1, value2)) * 100, 2);

  if (diffPercent <= tolerance) {
    return {
      verified: true,
      status: '✓ VERIFIED',
      message: `${description}: Both methods give same result (±${tolerance}%)`,
      value1,
      value2,
      difference: diffPercent + '%'
    };
  }

  return {
    verified: false,
    status: '⚠️ MISMATCH',
    message: `${description}: Results differ by ${diffPercent}% - RECHECK`,
    value1,
    value2,
    difference: diffPercent + '%'
  };
}

// =============================================================================
// QUICK CONVERSIONS - NO GOOGLING
// =============================================================================

const convert = {
  // Length
  mmToM: (mm) => mm / 1000,
  mToMm: (m) => m * 1000,
  mmToInch: (mm) => round(mm / 25.4, 3),
  inchToMm: (inch) => round(inch * 25.4, 1),
  ftToM: (ft) => round(ft * 0.3048, 3),
  mToFt: (m) => round(m / 0.3048, 2),

  // Weight
  kgToTonne: (kg) => kg / 1000,
  tonneToKg: (t) => t * 1000,
  kgToLb: (kg) => round(kg * 2.20462, 1),
  lbToKg: (lb) => round(lb / 2.20462, 1),

  // Force
  knToKg: (kn) => round(kn * 101.97, 0),  // kN to kgf
  kgToKn: (kg) => round(kg / 101.97, 2),  // kgf to kN
  knToTonne: (kn) => round(kn / 9.81, 2),
  tonneToKn: (t) => round(t * 9.81, 1),

  // Pressure
  mpaToKsi: (mpa) => round(mpa / 6.895, 2),
  ksiToMpa: (ksi) => round(ksi * 6.895, 0),

  // Temperature
  cToF: (c) => round(c * 9/5 + 32, 1),
  fToC: (f) => round((f - 32) * 5/9, 1)
};

// =============================================================================
// HELPERS
// =============================================================================

function round(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// =============================================================================
// EXPORTS
// =============================================================================

export function createSiteTools() {
  return {
    // Instant weight
    whatWeighs,
    quickWeight,
    w: quickWeight,  // Shortcut: tools.w('310UB40', 6, 4)

    // Verification
    verifyDelivery,
    identifySection,
    validateLift,
    verifyCalculation,

    // Bolts
    boltTorque,
    boltCount,
    bt: boltTorque,  // Shortcut: tools.bt('M20', '8.8')

    // Conversions
    convert,

    // Raw data for direct access
    BOLT_TORQUE,
    BOLT_HOLES
  };
}

export default createSiteTools;
