/**
 * Fabricator Tools v3
 * Practical tools for steel fabricators and installers
 *
 * Includes:
 * - Rigging/lifting calculations
 * - Welding consumables estimation
 * - Surface area for coatings
 * - Cut list optimization
 */

import { STEEL_SECTIONS, STAINLESS_STEEL_FACTOR } from './data/steelSections.js';
import {
  CHAIN_SLINGS_G80,
  WIRE_ROPE_SLINGS,
  WEB_SLINGS,
  SHACKLES,
  ANGLE_FACTORS,
  LIFT_POINT_SPACING
} from './data/riggingData.js';
import {
  FILLET_WELD_VOLUME,
  BUTT_WELD_VOLUME,
  CONSUMABLES,
  STEEL_DENSITY,
  WASTAGE_FACTORS,
  PREHEAT_REQUIREMENTS
} from './data/weldingData.js';

/**
 * Creates a fabricator tools service
 * @param {Object} options - Configuration options
 * @returns {Object} - Fabricator tools service
 */
export function createFabricatorTools(options = {}) {
  const {
    onCalculation = null,
    defaultStockLength = 12.0  // Standard Australian stock length in metres
  } = options;

  // ===========================================
  // RIGGING & LIFTING CALCULATIONS
  // ===========================================

  /**
   * Calculate required sling capacity for a lift
   * @param {number} loadWeight - Load weight in kg
   * @param {number} slingAngle - Angle from vertical in degrees (60° = good)
   * @param {number} numLegs - Number of sling legs (1, 2, or 4)
   * @param {number} safetyFactor - Additional safety factor (default 1.0)
   * @returns {Object} - Required sling capacities
   */
  function calculateSlingRequirement(loadWeight, slingAngle = 60, numLegs = 2, safetyFactor = 1.0) {
    // Critical input validation
    if (typeof loadWeight !== 'number' || isNaN(loadWeight)) {
      return { success: false, error: 'Load weight must be a valid number' };
    }

    if (loadWeight <= 0) {
      return { success: false, error: 'Load weight must be positive' };
    }

    if (loadWeight > 500000) {
      return { success: false, error: '⛔ Load exceeds 500 tonnes - requires engineered lifting study' };
    }

    if (typeof slingAngle !== 'number' || isNaN(slingAngle)) {
      return { success: false, error: 'Sling angle must be a valid number' };
    }

    if (slingAngle < 30) {
      return { success: false, error: '⛔ Sling angle too shallow (minimum 30°). Increase headroom or shorten slings.' };
    }

    if (slingAngle > 90) {
      return { success: false, error: 'Sling angle cannot exceed 90°' };
    }

    if (![1, 2, 4].includes(numLegs)) {
      return { success: false, error: 'Number of legs must be 1, 2, or 4' };
    }

    if (safetyFactor < 1.0) {
      return { success: false, error: '⛔ Safety factor cannot be less than 1.0' };
    }

    const loadTonnes = loadWeight / 1000;

    // Get angle factor (capacity reduction for shallow angles)
    const closestAngle = Object.keys(ANGLE_FACTORS)
      .map(Number)
      .reduce((prev, curr) => Math.abs(curr - slingAngle) < Math.abs(prev - slingAngle) ? curr : prev);
    const angleFactor = ANGLE_FACTORS[closestAngle];

    // Calculate required WLL per leg
    const effectiveLegs = numLegs === 4 ? 3 : numLegs; // 4-leg lift uses 3-leg factor for safety
    const requiredWllPerLeg = (loadTonnes * safetyFactor) / (angleFactor * effectiveLegs / 2);
    const totalRequiredWll = loadTonnes * safetyFactor;

    // Find suitable slings
    const suitableChains = findSuitableSlings(CHAIN_SLINGS_G80, requiredWllPerLeg, 'single');
    const suitableWireRope = findSuitableSlings(WIRE_ROPE_SLINGS, requiredWllPerLeg, 'single');
    const suitableWebSlings = findSuitableSlings(WEB_SLINGS, requiredWllPerLeg, 'straight');

    // Find suitable shackles
    const suitableShackles = Object.entries(SHACKLES.bow)
      .filter(([size, wll]) => wll >= totalRequiredWll)
      .map(([size, wll]) => ({ pinDiameter: parseInt(size), wll }))
      .slice(0, 3);

    const result = {
      success: true,
      input: {
        loadWeight,
        loadTonnes: Math.round(loadTonnes * 100) / 100,
        slingAngle,
        numLegs
      },
      calculation: {
        angleFactor: Math.round(angleFactor * 100) / 100,
        requiredWllPerLeg: Math.round(requiredWllPerLeg * 100) / 100,
        totalRequiredWll: Math.round(totalRequiredWll * 100) / 100
      },
      recommendations: {
        chainSlings: suitableChains,
        wireRopeSlings: suitableWireRope,
        webSlings: suitableWebSlings,
        shackles: suitableShackles
      },
      warnings: []
    };

    // Add warnings
    if (slingAngle < 45) {
      result.warnings.push('Sling angle is below 45° - consider increasing headroom');
    }

    if (loadTonnes > 20) {
      result.warnings.push('Heavy lift - ensure crane capacity and ground conditions are adequate');
    }

    return result;
  }

  /**
   * Helper to find suitable slings from a data set
   */
  function findSuitableSlings(data, requiredWll, capacityKey) {
    return Object.entries(data)
      .filter(([size, caps]) => caps[capacityKey] >= requiredWll)
      .map(([size, caps]) => ({
        size: parseInt(size),
        wll: caps[capacityKey],
        margin: Math.round((caps[capacityKey] / requiredWll - 1) * 100)
      }))
      .sort((a, b) => a.wll - b.wll)
      .slice(0, 3);
  }

  /**
   * Calculate lift point positions for a beam
   * @param {number} length - Beam length in metres
   * @param {number} weight - Total weight in kg
   * @param {string} cogPosition - 'centre', 'offset_left', 'offset_right'
   * @returns {Object} - Recommended lift point positions
   */
  function calculateLiftPoints(length, weight, cogPosition = 'centre') {
    const spacing = LIFT_POINT_SPACING.twoPoint(length);

    const distanceFromEnd = length * spacing.fromEnd;
    const centralSpacing = length * spacing.spacing;

    const result = {
      success: true,
      beamLength: length,
      weight,
      twoPointLift: {
        distanceFromEachEnd: Math.round(distanceFromEnd * 1000) / 1000,
        spacingBetweenPoints: Math.round(centralSpacing * 1000) / 1000,
        positions: [
          Math.round(distanceFromEnd * 1000) / 1000,
          Math.round((length - distanceFromEnd) * 1000) / 1000
        ]
      }
    };

    if (cogPosition !== 'centre') {
      result.warning = 'Offset COG - consider using a spreader beam or adjusting sling lengths';
    }

    return result;
  }

  // ===========================================
  // WELDING CONSUMABLES
  // ===========================================

  /**
   * Calculate welding consumables for fillet welds
   * @param {number} legSize - Fillet leg size in mm
   * @param {number} weldLength - Total weld length in mm
   * @param {string} consumableType - Consumable code (e.g., 'E4816', 'ER70S6')
   * @param {boolean} doubleSided - Whether welded both sides
   * @returns {Object} - Consumables required
   */
  function calculateFilletWeldConsumables(legSize, weldLength, consumableType = 'E4816', doubleSided = false) {
    // Input validation
    if (typeof legSize !== 'number' || isNaN(legSize) || legSize <= 0) {
      return { success: false, error: 'Leg size must be a positive number (mm)' };
    }

    if (typeof weldLength !== 'number' || isNaN(weldLength) || weldLength <= 0) {
      return { success: false, error: 'Weld length must be a positive number (mm)' };
    }

    if (weldLength > 100000) {  // 100m sanity check
      return { success: false, error: 'Weld length exceeds 100m - verify input is in mm' };
    }

    const volumePerMm = FILLET_WELD_VOLUME[legSize];
    if (!volumePerMm) {
      return { success: false, error: `Invalid leg size ${legSize}mm. Valid: ${Object.keys(FILLET_WELD_VOLUME).join(', ')}` };
    }

    const consumable = CONSUMABLES[consumableType];
    if (!consumable) {
      return { success: false, error: `Unknown consumable ${consumableType}` };
    }

    const multiplier = doubleSided ? 2 : 1;
    const weldVolumeMm3 = volumePerMm * weldLength * multiplier;
    const weldVolumeCm3 = weldVolumeMm3 / 1000;
    const weldWeightKg = (weldVolumeCm3 * STEEL_DENSITY) / 1000000;

    // Apply wastage factor
    const process = consumable.process.split('/')[0];
    const wastageFactor = WASTAGE_FACTORS[process] || 1.2;
    const consumableRequired = weldWeightKg * wastageFactor / (consumable.recovery_percent / 100);

    // Estimate time (using middle diameter)
    const midDiameter = consumable.diameter_mm[Math.floor(consumable.diameter_mm.length / 2)];
    const depositionRate = consumable.deposition_rate_kg_hr[midDiameter];
    const estimatedHours = weldWeightKg / depositionRate;

    return {
      success: true,
      input: {
        legSize,
        weldLength: weldLength / 1000, // Convert to metres for display
        weldLengthMm: weldLength,
        doubleSided
      },
      weldMetal: {
        volumeMm3: Math.round(weldVolumeMm3),
        weightKg: Math.round(weldWeightKg * 100) / 100
      },
      consumable: {
        type: consumableType,
        name: consumable.name,
        process: consumable.process,
        requiredKg: Math.round(consumableRequired * 100) / 100,
        wastageFactor: Math.round(wastageFactor * 100) / 100
      },
      estimate: {
        weldTimeHours: Math.round(estimatedHours * 10) / 10,
        depositionRateKgHr: depositionRate,
        diameterUsed: midDiameter
      }
    };
  }

  /**
   * Calculate consumables for butt welds
   * @param {number} plateThickness - Plate thickness in mm
   * @param {number} weldLength - Total weld length in mm
   * @param {string} consumableType - Consumable code
   * @returns {Object} - Consumables required
   */
  function calculateButtWeldConsumables(plateThickness, weldLength, consumableType = 'E4816') {
    // Input validation
    if (typeof plateThickness !== 'number' || isNaN(plateThickness) || plateThickness <= 0) {
      return { success: false, error: 'Plate thickness must be a positive number (mm)' };
    }

    if (typeof weldLength !== 'number' || isNaN(weldLength) || weldLength <= 0) {
      return { success: false, error: 'Weld length must be a positive number (mm)' };
    }

    if (weldLength > 100000) {
      return { success: false, error: 'Weld length exceeds 100m - verify input is in mm' };
    }

    const volumePerMm = BUTT_WELD_VOLUME[plateThickness];
    if (!volumePerMm) {
      const validThicknesses = Object.keys(BUTT_WELD_VOLUME).join(', ');
      return { success: false, error: `Invalid thickness ${plateThickness}mm. Valid: ${validThicknesses}` };
    }

    const consumable = CONSUMABLES[consumableType];
    if (!consumable) {
      return { success: false, error: `Unknown consumable ${consumableType}` };
    }

    const weldVolumeMm3 = volumePerMm * weldLength;
    const weldVolumeCm3 = weldVolumeMm3 / 1000;
    const weldWeightKg = (weldVolumeCm3 * STEEL_DENSITY) / 1000000;

    const process = consumable.process.split('/')[0];
    const wastageFactor = WASTAGE_FACTORS[process] || 1.2;
    const consumableRequired = weldWeightKg * wastageFactor / (consumable.recovery_percent / 100);

    // Check preheat requirement
    const combinedThickness = plateThickness * 2; // Assuming similar thickness both sides
    let preheatTemp = 0;
    for (const [thickness, temp] of Object.entries(PREHEAT_REQUIREMENTS.low_ce)) {
      if (combinedThickness <= parseInt(thickness)) {
        preheatTemp = temp;
        break;
      }
    }

    return {
      success: true,
      input: {
        plateThickness,
        weldLength: weldLength / 1000,
        weldLengthMm: weldLength
      },
      weldMetal: {
        volumeMm3: Math.round(weldVolumeMm3),
        weightKg: Math.round(weldWeightKg * 100) / 100
      },
      consumable: {
        type: consumableType,
        name: consumable.name,
        requiredKg: Math.round(consumableRequired * 100) / 100
      },
      preheat: {
        combinedThickness,
        minimumTemp: preheatTemp,
        note: preheatTemp > 0 ? `Preheat to ${preheatTemp}°C minimum (AS/NZS 1554.1)` : 'No preheat required for low CE steel'
      }
    };
  }

  // ===========================================
  // SURFACE AREA FOR COATINGS
  // ===========================================

  /**
   * Calculate surface area for a steel section
   * @param {string} sectionType - SHS, RHS, CHS, UB, etc.
   * @param {string} size - Section size
   * @param {number} length - Length in metres
   * @returns {Object} - Surface area in m²
   */
  function calculateSurfaceArea(sectionType, size, length) {
    const section = STEEL_SECTIONS[sectionType];
    if (!section) {
      return { success: false, error: `Unknown section type: ${sectionType}` };
    }

    const massPerM = section.data[size];
    if (!massPerM) {
      return { success: false, error: `Unknown size ${size} for ${sectionType}` };
    }

    // Calculate surface area based on section geometry
    let surfaceAreaPerM; // m²/m

    // Parse dimensions from size string
    const dims = size.replace(/[^\dx.]/g, '').split('x').map(Number);

    switch (sectionType) {
      case 'SHS': {
        // Square: 4 sides
        const sideLength = dims[0] / 1000; // mm to m
        surfaceAreaPerM = 4 * sideLength;
        break;
      }
      case 'RHS': {
        // Rectangle: 2*(width + height)
        const width = dims[0] / 1000;
        const height = dims[1] / 1000;
        surfaceAreaPerM = 2 * (width + height);
        break;
      }
      case 'CHS': {
        // Circle: π * diameter
        const diameter = dims[0] / 1000;
        surfaceAreaPerM = Math.PI * diameter;
        break;
      }
      case 'EA':
      case 'UA': {
        // Angles: approximate as 4 surfaces (2 legs, inside and out)
        const leg1 = dims[0] / 1000;
        const leg2 = (dims[1] || dims[0]) / 1000;
        surfaceAreaPerM = 2 * (leg1 + leg2);
        break;
      }
      case 'FB': {
        // Flat bar: 2 faces + 2 edges
        const width = dims[0] / 1000;
        const thickness = dims[1] / 1000;
        surfaceAreaPerM = 2 * width + 2 * thickness;
        break;
      }
      case 'RB': {
        // Round bar: π * diameter
        const diameter = dims[0] / 1000;
        surfaceAreaPerM = Math.PI * diameter;
        break;
      }
      case 'UB':
      case 'UC':
      case 'WB':
      case 'WC': {
        // I-sections: parse nominal depth from size (e.g., "310UB40" → 310)
        const nominalDepth = parseInt(size) / 1000; // Convert to metres
        // Approximate perimeter: 4*flange_width + 2*web ≈ 4*(depth/2) + 2*depth = 4*depth
        // Refined empirical formula based on actual section properties
        surfaceAreaPerM = nominalDepth * 4.2; // ~4.2x depth gives good approximation
        break;
      }
      case 'PFC': {
        // Channel: approximate
        const depth = dims[0] / 1000;
        const flange = dims[1] / 1000;
        surfaceAreaPerM = 2 * depth + 4 * flange;
        break;
      }
      default:
        // Default estimate based on mass
        surfaceAreaPerM = 0.6 * Math.sqrt(massPerM);
    }

    const totalArea = surfaceAreaPerM * length;

    return {
      success: true,
      input: { sectionType, size, length },
      surfaceArea: {
        perMetre: Math.round(surfaceAreaPerM * 1000) / 1000,
        total: Math.round(totalArea * 100) / 100
      },
      coatingEstimates: {
        // Coverage rates in m²/L
        primer: { coverage: 8, litres: Math.round(totalArea / 8 * 10) / 10 },
        intumescent: { coverage: 1.5, litres: Math.round(totalArea / 1.5 * 10) / 10 },
        topcoat: { coverage: 10, litres: Math.round(totalArea / 10 * 10) / 10 }
      }
    };
  }

  // ===========================================
  // CUT LIST OPTIMIZER
  // ===========================================

  /**
   * Optimize cutting from stock lengths to minimize waste
   * Simple first-fit decreasing algorithm
   *
   * @param {Array} requiredLengths - Array of { length, quantity, label? }
   * @param {number} stockLength - Stock length in metres (default 12m)
   * @param {number} sawKerf - Saw blade width in mm (default 3mm)
   * @returns {Object} - Optimized cut list
   */
  function optimizeCutList(requiredLengths, stockLength = defaultStockLength, sawKerf = 3) {
    // Validate input
    if (!Array.isArray(requiredLengths) || requiredLengths.length === 0) {
      return { success: false, error: 'Required lengths must be a non-empty array' };
    }

    if (typeof stockLength !== 'number' || isNaN(stockLength) || stockLength <= 0) {
      return { success: false, error: 'Stock length must be a positive number (metres)' };
    }

    if (stockLength > 18) {
      return { success: false, error: 'Stock length exceeds 18m maximum transport length' };
    }

    if (typeof sawKerf !== 'number' || isNaN(sawKerf) || sawKerf < 0) {
      return { success: false, error: 'Saw kerf must be a non-negative number (mm)' };
    }

    if (sawKerf > 10) {
      return { success: false, error: 'Saw kerf exceeds 10mm - check input' };
    }

    // Validate each length entry
    for (let i = 0; i < requiredLengths.length; i++) {
      const item = requiredLengths[i];
      if (typeof item.length !== 'number' || isNaN(item.length) || item.length <= 0) {
        return { success: false, error: `Item ${i + 1}: length must be a positive number` };
      }
      if (item.quantity !== undefined && (!Number.isInteger(item.quantity) || item.quantity < 1)) {
        return { success: false, error: `Item ${i + 1}: quantity must be a positive integer` };
      }
    }

    const kerfM = sawKerf / 1000;

    // Expand quantities into individual pieces
    const pieces = [];
    requiredLengths.forEach((item, idx) => {
      const qty = item.quantity || 1;
      for (let i = 0; i < qty; i++) {
        pieces.push({
          length: item.length,
          label: item.label || `Piece ${idx + 1}`,
          index: idx
        });
      }
    });

    // Sort by length descending (first-fit decreasing)
    pieces.sort((a, b) => b.length - a.length);

    // Check for oversized pieces
    const oversized = pieces.filter(p => p.length > stockLength);
    if (oversized.length > 0) {
      return {
        success: false,
        error: `${oversized.length} piece(s) exceed stock length of ${stockLength}m`,
        oversized: oversized.map(p => ({ label: p.label, length: p.length }))
      };
    }

    // Bin packing
    const bars = [];

    pieces.forEach(piece => {
      // Find first bar that can fit this piece
      let placed = false;

      for (const bar of bars) {
        const usedLength = bar.cuts.reduce((sum, c) => sum + c.length + kerfM, 0);
        if (usedLength + piece.length <= stockLength) {
          bar.cuts.push(piece);
          placed = true;
          break;
        }
      }

      // Need a new bar
      if (!placed) {
        bars.push({
          barNumber: bars.length + 1,
          cuts: [piece]
        });
      }
    });

    // Calculate waste for each bar
    let totalUsed = 0;
    let totalWaste = 0;

    bars.forEach(bar => {
      const cutsLength = bar.cuts.reduce((sum, c) => sum + c.length, 0);
      const kerfsLength = (bar.cuts.length - 1) * kerfM;
      bar.usedLength = Math.round((cutsLength + kerfsLength) * 1000) / 1000;
      bar.wasteLength = Math.round((stockLength - bar.usedLength) * 1000) / 1000;
      bar.wastePercent = Math.round((bar.wasteLength / stockLength) * 100);

      totalUsed += bar.usedLength;
      totalWaste += bar.wasteLength;
    });

    const totalStock = bars.length * stockLength;
    const efficiency = Math.round((totalUsed / totalStock) * 100);

    return {
      success: true,
      input: {
        pieces: pieces.length,
        stockLength,
        sawKerf
      },
      result: {
        stockBarsRequired: bars.length,
        totalStockLength: totalStock,
        totalUsedLength: Math.round(totalUsed * 1000) / 1000,
        totalWaste: Math.round(totalWaste * 1000) / 1000,
        efficiency: efficiency,
        bars: bars.map(bar => ({
          barNumber: bar.barNumber,
          cuts: bar.cuts.map(c => ({ label: c.label, length: c.length })),
          usedLength: bar.usedLength,
          wasteLength: bar.wasteLength,
          wastePercent: bar.wastePercent
        }))
      },
      tips: efficiency < 85 ? [
        'Consider adjusting lengths if possible',
        'Check if offcuts can be used for smaller pieces',
        `Try ${stockLength === 12 ? '9m or 6m' : '12m'} stock lengths`
      ] : []
    };
  }

  // ===========================================
  // UTILITY FUNCTIONS
  // ===========================================

  /**
   * Get available consumable types
   */
  function getConsumableTypes() {
    return Object.entries(CONSUMABLES).map(([key, data]) => ({
      id: key,
      name: data.name,
      process: data.process,
      diameters: data.diameter_mm
    }));
  }

  /**
   * Get available sling data
   */
  function getSlingData() {
    return {
      chainSizes: Object.keys(CHAIN_SLINGS_G80).map(Number),
      wireRopeSizes: Object.keys(WIRE_ROPE_SLINGS).map(Number),
      webSlingWidths: Object.keys(WEB_SLINGS).map(Number)
    };
  }

  // ===========================================
  // PUBLIC API
  // ===========================================

  return {
    // Rigging & Lifting
    calculateSlingRequirement,
    calculateLiftPoints,
    getSlingData,

    // Welding
    calculateFilletWeldConsumables,
    calculateButtWeldConsumables,
    getConsumableTypes,

    // Coatings
    calculateSurfaceArea,

    // Cut Optimization
    optimizeCutList,

    // Raw data access
    CHAIN_SLINGS_G80,
    WIRE_ROPE_SLINGS,
    WEB_SLINGS,
    CONSUMABLES,
    FILLET_WELD_VOLUME,
    BUTT_WELD_VOLUME
  };
}

export default createFabricatorTools;
