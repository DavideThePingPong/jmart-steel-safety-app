/**
 * Steel Calculator Service v3
 * Unified calculator for steel weight, bolts, and chemical anchors
 *
 * Features:
 * - Input validation
 * - Error handling
 * - Calculation history
 * - Export to various formats
 */

import { STEEL_SECTIONS, SECTION_FULL_NAMES, SECTION_ORDER, STAINLESS_STEEL_FACTOR } from './data/steelSections.js';
import { HOLLO_BOLT_DATA, BOLT_TYPES, BOLT_SIZES } from './data/holloBolts.js';
import { HILTI_PRODUCTS, CURE_TIME_DATA, getCureTime, formatCureTime, CONDITION_FACTORS } from './data/chemicalAnchors.js';

/**
 * Creates a steel calculator service instance
 * @param {Object} options - Configuration options
 * @returns {Object} - Steel calculator service
 */
export function createSteelCalculator(options = {}) {
  const {
    onCalculation = null,  // Callback when calculation completes
    onError = null,        // Callback on validation error
    saveHistory = true     // Whether to save calculation history
  } = options;

  // Calculation history
  let history = [];
  const MAX_HISTORY = 100;

  // Current member list (for IGOR-style calculations)
  let members = [];

  /**
   * Add to history
   */
  function addToHistory(type, input, result) {
    if (!saveHistory) return;

    history.unshift({
      id: `calc-${Date.now()}`,
      type,
      input,
      result,
      timestamp: new Date().toISOString()
    });

    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
  }

  /**
   * Report error
   */
  function reportError(message, details = {}) {
    const error = { message, ...details };
    if (onError) {
      onError(error);
    }
    return { success: false, error };
  }

  // ===========================================
  // STEEL WEIGHT CALCULATIONS (IGOR)
  // ===========================================

  /**
   * Validate steel member input
   */
  function validateMemberInput(input) {
    const errors = [];

    if (!input.type || !STEEL_SECTIONS[input.type]) {
      errors.push(`Invalid section type: ${input.type}`);
    }

    if (input.type && STEEL_SECTIONS[input.type]) {
      const sections = STEEL_SECTIONS[input.type].data;
      if (!input.size || !sections[input.size]) {
        errors.push(`Invalid size "${input.size}" for ${input.type}`);
      }
    }

    if (typeof input.length !== 'number' || input.length <= 0) {
      errors.push('Length must be a positive number');
    }

    if (input.length > 18) {
      errors.push('Length exceeds maximum stock length (18m)');
    }

    if (input.quantity !== undefined) {
      if (!Number.isInteger(input.quantity) || input.quantity < 1) {
        errors.push('Quantity must be a positive integer');
      }
      if (input.quantity > 1000) {
        errors.push('Quantity exceeds reasonable limit (1000)');
      }
    }

    return errors;
  }

  /**
   * Calculate weight for a single steel member
   * @param {Object} input - { type, size, length, quantity?, isStainless? }
   * @returns {Object} - Calculation result
   */
  function calculateMemberWeight(input) {
    const errors = validateMemberInput(input);
    if (errors.length > 0) {
      return reportError('Validation failed', { errors });
    }

    const { type, size, length, quantity = 1, isStainless = false } = input;

    const massPerMetre = STEEL_SECTIONS[type].data[size];
    let totalWeight = massPerMetre * length * quantity;

    if (isStainless) {
      totalWeight *= STAINLESS_STEEL_FACTOR;
    }

    const result = {
      success: true,
      type,
      typeName: SECTION_FULL_NAMES[type],
      size,
      length,
      quantity,
      massPerMetre,
      isStainless,
      totalWeight: Math.round(totalWeight * 100) / 100,  // Round to 2 decimal places
      unit: 'kg'
    };

    addToHistory('member_weight', input, result);

    if (onCalculation) {
      onCalculation('member_weight', result);
    }

    return result;
  }

  /**
   * Add member to current list
   */
  function addMember(input) {
    const result = calculateMemberWeight(input);
    if (!result.success) return result;

    const member = {
      id: `member-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      ...input,
      weight: result.totalWeight,
      addedAt: new Date().toISOString()
    };

    members.push(member);

    return {
      success: true,
      member,
      totalMembers: members.length,
      totalWeight: calculateTotalWeight()
    };
  }

  /**
   * Remove member from list
   */
  function removeMember(memberId) {
    const index = members.findIndex(m => m.id === memberId);
    if (index === -1) {
      return reportError('Member not found', { memberId });
    }

    members.splice(index, 1);

    return {
      success: true,
      totalMembers: members.length,
      totalWeight: calculateTotalWeight()
    };
  }

  /**
   * Calculate total weight of all members
   */
  function calculateTotalWeight() {
    return members.reduce((sum, m) => sum + (m.weight || 0), 0);
  }

  /**
   * Get weight breakdown by section type
   */
  function getWeightBreakdown() {
    const breakdown = {};

    members.forEach(m => {
      const key = m.type;
      breakdown[key] = (breakdown[key] || 0) + (m.weight || 0);
    });

    return {
      byType: breakdown,
      totalSteel: calculateTotalWeight(),
      totalWithFittings: calculateTotalWeight() * 1.1,  // 10% fittings allowance
      memberCount: members.length
    };
  }

  /**
   * Clear all members
   */
  function clearMembers() {
    members = [];
    return { success: true, totalMembers: 0 };
  }

  /**
   * Get all available sections
   */
  function getSections() {
    return SECTION_ORDER.map(type => ({
      type,
      name: SECTION_FULL_NAMES[type],
      description: STEEL_SECTIONS[type].desc,
      unit: STEEL_SECTIONS[type].unit,
      sizes: Object.keys(STEEL_SECTIONS[type].data)
    }));
  }

  /**
   * Get sizes for a specific section type
   */
  function getSizesForType(type) {
    if (!STEEL_SECTIONS[type]) {
      return reportError(`Unknown section type: ${type}`);
    }

    return {
      success: true,
      type,
      sizes: Object.entries(STEEL_SECTIONS[type].data).map(([size, mass]) => ({
        size,
        massPerMetre: mass
      }))
    };
  }

  // ===========================================
  // HOLLO-BOLT CALCULATIONS (HOBART)
  // ===========================================

  /**
   * Find suitable bolts for a clamping thickness
   * @param {number} clampingThickness - Total thickness to clamp (mm)
   * @param {Object} options - { boltType?, minCapacity? }
   * @returns {Object} - Suitable bolt options
   */
  function findSuitableBolts(clampingThickness, options = {}) {
    if (typeof clampingThickness !== 'number' || clampingThickness <= 0) {
      return reportError('Clamping thickness must be a positive number');
    }

    const { boltType = null, minTensileKn = 0, minShearKn = 0 } = options;
    const results = [];

    const boltTypes = boltType
      ? [{ key: boltType, data: getBoltTypeData(boltType) }]
      : [
          { key: 'HB', name: 'HB Hex Head', data: HOLLO_BOLT_DATA.HEXAGONAL_HEAD },
          { key: 'HBCSK', name: 'HBCSK Countersunk', data: HOLLO_BOLT_DATA.COUNTERSUNK_HEAD },
          { key: 'HBFF', name: 'HBFF Flush Fit', data: HOLLO_BOLT_DATA.FLUSH_FIT_HEAD },
          { key: 'LB', name: 'LB LindiBolt', data: HOLLO_BOLT_DATA.LINDIBOLT }
        ];

    for (const { key, name, data } of boltTypes) {
      if (!data) continue;

      for (const [size, specs] of Object.entries(data)) {
        // Check if any clamping range fits
        for (let i = 0; i < specs.clamping_ranges.length; i++) {
          const range = specs.clamping_ranges[i];
          const [min, max] = range.split('-').map(Number);

          if (clampingThickness >= min && clampingThickness <= max) {
            // Check capacity requirements
            if (specs.tensile_swl_kn < minTensileKn) continue;
            if (specs.shear_swl_kn < minShearKn) continue;

            const drilling = HOLLO_BOLT_DATA.DRILLING_DATA[size] || {};
            const midPoint = (min + max) / 2;
            const fitQuality = 100 - Math.abs(clampingThickness - midPoint) / (max - min) * 100;

            results.push({
              boltType: key,
              boltTypeName: name || BOLT_TYPES[key]?.name,
              size,
              productCode: specs.product_codes_with_sizes[i],
              clampingRange: range,
              clampingMin: min,
              clampingMax: max,
              fitQuality: Math.round(fitQuality),
              tensileSwlKn: specs.tensile_swl_kn,
              shearSwlKn: specs.shear_swl_kn,
              torqueNm: specs.torque_nm,
              spannerMm: specs.spanner_mm,
              holeSize: drilling.clearance_hole,
              holeTolerance: drilling.tolerance,
              minEdgeDistance: drilling.min_edge_distance,
              minHoleDistance: drilling.min_hole_distance
            });
          }
        }
      }
    }

    // Sort by fit quality (best fit first)
    results.sort((a, b) => b.fitQuality - a.fitQuality);

    const result = {
      success: true,
      clampingThickness,
      suitableBolts: results,
      bestMatch: results[0] || null
    };

    addToHistory('bolt_selection', { clampingThickness, options }, result);

    return result;
  }

  /**
   * Get bolt type data
   */
  function getBoltTypeData(type) {
    switch (type) {
      case 'HB': return HOLLO_BOLT_DATA.HEXAGONAL_HEAD;
      case 'HBCSK': return HOLLO_BOLT_DATA.COUNTERSUNK_HEAD;
      case 'HBFF': return HOLLO_BOLT_DATA.FLUSH_FIT_HEAD;
      case 'LB': return HOLLO_BOLT_DATA.LINDIBOLT;
      default: return null;
    }
  }

  /**
   * Get bolt specifications
   * @param {string} boltType - HB, HBCSK, HBFF, or LB
   * @param {string} size - M8, M10, M12, M16, M20, or M24
   * @returns {Object} - Full bolt specifications
   */
  function getBoltSpecs(boltType, size) {
    const data = getBoltTypeData(boltType);
    if (!data) {
      return reportError(`Unknown bolt type: ${boltType}`);
    }

    const specs = data[size];
    if (!specs) {
      return reportError(`Size ${size} not available for ${boltType}`);
    }

    const drilling = HOLLO_BOLT_DATA.DRILLING_DATA[size] || {};

    return {
      success: true,
      boltType,
      boltTypeName: BOLT_TYPES[boltType]?.name,
      size,
      ...specs,
      drilling,
      tensileCapacityKg: Math.round(specs.tensile_swl_kn * 102),
      shearCapacityKg: Math.round(specs.shear_swl_kn * 102)
    };
  }

  // ===========================================
  // CHEMICAL ANCHOR CALCULATIONS (CHUCK)
  // ===========================================

  /**
   * Get anchor specifications and cure times
   * @param {string} product - HY200R, HY200A, RE500, or HY170
   * @param {string} size - Anchor size (M10, M12, etc.)
   * @param {number} temperature - Current temperature in Celsius
   * @returns {Object} - Anchor specs with cure times
   */
  function getAnchorSpecs(product, size, temperature = 20) {
    const productData = HILTI_PRODUCTS[product];
    if (!productData) {
      return reportError(`Unknown product: ${product}`);
    }

    const sizeData = productData.sizes[size];
    if (!sizeData) {
      return reportError(`Size ${size} not available for ${product}`);
    }

    const cureTime = getCureTime(product, temperature);

    // Calculate for different conditions
    const shadeTemp = temperature + CONDITION_FACTORS.shade_temp_offset;
    const shadeCure = getCureTime(product, shadeTemp);

    const result = {
      success: true,
      product,
      productName: productData.name,
      description: productData.description,
      size,
      holeSize: sizeData.hole,
      embedmentDepth: sizeData.embed,
      temperature,
      cureTime: {
        standard: {
          work: cureTime.work,
          workFormatted: formatCureTime(cureTime.work),
          cure: cureTime.cure,
          cureFormatted: formatCureTime(cureTime.cure)
        },
        coastal: {
          work: cureTime.work,
          workFormatted: formatCureTime(cureTime.work),
          cure: Math.round(cureTime.cure * CONDITION_FACTORS.coastal),
          cureFormatted: formatCureTime(cureTime.cure * CONDITION_FACTORS.coastal)
        },
        shade: {
          work: shadeCure.work,
          workFormatted: formatCureTime(shadeCure.work),
          cure: shadeCure.cure,
          cureFormatted: formatCureTime(shadeCure.cure)
        }
      }
    };

    addToHistory('anchor_specs', { product, size, temperature }, result);

    return result;
  }

  /**
   * Get all available anchor products
   */
  function getAnchorProducts() {
    return Object.entries(HILTI_PRODUCTS).map(([key, product]) => ({
      id: key,
      name: product.name,
      description: product.description,
      volume: product.volume_ml,
      sizes: Object.keys(product.sizes)
    }));
  }

  // ===========================================
  // EXPORT FUNCTIONS
  // ===========================================

  /**
   * Export member list to JSON
   */
  function exportToJSON() {
    const breakdown = getWeightBreakdown();

    return {
      exportDate: new Date().toISOString(),
      exportedBy: 'STEEL Calculator v3',
      summary: {
        totalMembers: members.length,
        totalSteelWeight: breakdown.totalSteel,
        totalWithFittings: breakdown.totalWithFittings,
        weightByType: breakdown.byType
      },
      members: members.map(m => ({
        type: m.type,
        typeName: SECTION_FULL_NAMES[m.type],
        size: m.size,
        length: m.length,
        quantity: m.quantity || 1,
        isStainless: m.isStainless || false,
        weight: m.weight
      }))
    };
  }

  /**
   * Get calculation history
   */
  function getHistory() {
    return [...history];
  }

  /**
   * Clear calculation history
   */
  function clearHistory() {
    history = [];
    return { success: true };
  }

  // ===========================================
  // PUBLIC API
  // ===========================================

  return {
    // Steel weight (IGOR)
    calculateMemberWeight,
    addMember,
    removeMember,
    clearMembers,
    getWeightBreakdown,
    getSections,
    getSizesForType,
    getMembers: () => [...members],

    // Bolt selection (HOBART)
    findSuitableBolts,
    getBoltSpecs,
    getBoltTypes: () => ({ ...BOLT_TYPES }),
    getBoltSizes: () => ({ ...BOLT_SIZES }),

    // Chemical anchors (CHUCK)
    getAnchorSpecs,
    getAnchorProducts,
    formatCureTime,

    // Export & history
    exportToJSON,
    getHistory,
    clearHistory,

    // Data access
    STEEL_SECTIONS,
    HOLLO_BOLT_DATA,
    HILTI_PRODUCTS
  };
}

export default createSteelCalculator;
