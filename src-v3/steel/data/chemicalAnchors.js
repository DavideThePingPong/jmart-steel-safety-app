/**
 * Chemical Anchor Data - Hilti Products
 * Embedment depths, hole sizes, and cure times
 *
 * Cure times based on Hilti ETA approvals and IFU documents
 * All times in minutes
 */

export const HILTI_PRODUCTS = {
  HY200R: {
    name: 'HIT-HY 200-R',
    description: 'Hybrid mortar for rebar and anchoring',
    volume_ml: 330,
    sizes: {
      M10: { hole: 12, embed: 80 },
      M12: { hole: 14, embed: 96 },
      M16: { hole: 18, embed: 125 },
      M20: { hole: 22, embed: 160 },
      M24: { hole: 26, embed: 192 },
      M30: { hole: 35, embed: 240 }
    }
  },

  HY200A: {
    name: 'HIT-HY 200-A',
    description: 'High-performance hybrid mortar',
    volume_ml: 330,
    sizes: {
      M10: { hole: 12, embed: 80 },
      M12: { hole: 14, embed: 96 },
      M16: { hole: 18, embed: 125 },
      M20: { hole: 22, embed: 160 },
      M24: { hole: 26, embed: 192 },
      M30: { hole: 35, embed: 240 }
    }
  },

  RE500: {
    name: 'HIT-RE 500 V3',
    description: 'Epoxy mortar for heavy-duty applications',
    volume_ml: 500,
    sizes: {
      M10: { hole: 12, embed: 90 },
      M12: { hole: 14, embed: 110 },
      M16: { hole: 18, embed: 125 },
      M20: { hole: 24, embed: 170 },
      M24: { hole: 28, embed: 210 },
      M30: { hole: 35, embed: 270 }
    }
  },

  HY170: {
    name: 'HIT-HY 170',
    description: 'Fast-curing hybrid mortar',
    volume_ml: 330,
    sizes: {
      M8: { hole: 10, embed: 60 },
      M10: { hole: 12, embed: 75 },
      M12: { hole: 14, embed: 90 },
      M16: { hole: 18, embed: 115 },
      M20: { hole: 22, embed: 145 }
    }
  }
};

/**
 * Cure Time Data by Temperature
 * Based on Hilti technical documentation
 *
 * work: Working time (minutes) - time to position anchor
 * cure: Full cure time (minutes) - time before loading
 */
export const CURE_TIME_DATA = {
  HY200R: [
    { min: -10, max: -5, work: 180, cure: 1200 },  // 20h
    { min: -4, max: 0, work: 120, cure: 420 },     // 7h
    { min: 1, max: 5, work: 60, cure: 180 },       // 3h
    { min: 6, max: 10, work: 40, cure: 120 },      // 2h
    { min: 11, max: 20, work: 15, cure: 60 },      // 1h
    { min: 21, max: 30, work: 9, cure: 60 },       // 1h
    { min: 31, max: 40, work: 6, cure: 60 }        // 1h
  ],

  HY200A: [
    { min: -10, max: -5, work: 90, cure: 420 },    // 7h
    { min: -4, max: 0, work: 50, cure: 240 },      // 4h
    { min: 1, max: 5, work: 25, cure: 120 },       // 2h
    { min: 6, max: 10, work: 15, cure: 60 },       // 1h
    { min: 11, max: 20, work: 7, cure: 30 },       // 30min
    { min: 21, max: 30, work: 4, cure: 30 },       // 30min
    { min: 31, max: 40, work: 3, cure: 30 }        // 30min
  ],

  // RE 500 V3 EPOXY - Long cure times per ETA-16/0143
  RE500: [
    { min: -5, max: -1, work: 120, cure: 10080 },  // 7 days
    { min: 0, max: 4, work: 120, cure: 2880 },     // 48h
    { min: 5, max: 9, work: 120, cure: 1440 },     // 24h
    { min: 10, max: 14, work: 90, cure: 960 },     // 16h
    { min: 15, max: 19, work: 60, cure: 720 },     // 12h
    { min: 20, max: 24, work: 30, cure: 420 },     // 7h
    { min: 25, max: 29, work: 20, cure: 360 },     // 6h
    { min: 30, max: 34, work: 15, cure: 300 },     // 5h
    { min: 35, max: 40, work: 10, cure: 270 }      // 4.5h
  ],

  // HY 170 HYBRID - Fast cure per Hilti IFU
  HY170: [
    { min: -5, max: 0, work: 10, cure: 720 },      // 12h
    { min: 1, max: 5, work: 10, cure: 360 },       // 6h
    { min: 6, max: 10, work: 8, cure: 150 },       // 2.5h
    { min: 11, max: 20, work: 5, cure: 90 },       // 1.5h
    { min: 21, max: 30, work: 4, cure: 60 },       // 1h
    { min: 31, max: 40, work: 3, cure: 45 }        // 45min
  ]
};

/**
 * Get cure time for a product at a given temperature
 * @param {string} product - Product code (e.g., 'HY200R')
 * @param {number} temperature - Temperature in Celsius
 * @returns {Object} - { work, cure } times in minutes
 */
export function getCureTime(product, temperature) {
  const data = CURE_TIME_DATA[product] || CURE_TIME_DATA.HY200R;

  for (const entry of data) {
    if (temperature >= entry.min && temperature <= entry.max) {
      return {
        work: entry.work,
        cure: entry.cure
      };
    }
  }

  // Default for temperatures outside range
  if (temperature < data[0].min) {
    return { work: data[0].work, cure: data[0].cure };
  }

  const last = data[data.length - 1];
  return { work: last.work, cure: last.cure };
}

/**
 * Format cure time for display
 * @param {number} minutes - Time in minutes
 * @returns {string} - Formatted time string
 */
export function formatCureTime(minutes) {
  minutes = Math.round(minutes);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  if (minutes < 1440) {
    const hours = minutes / 60;
    // Avoid trailing zeros: "1.0h" → "1h", "1.5h" stays "1.5h"
    if (hours === Math.floor(hours)) {
      return `${hours}h`;
    }
    const formatted = hours.toFixed(1);
    return formatted.endsWith('.0') ? `${Math.floor(hours)}h` : `${formatted}h`;
  }

  const days = minutes / 1440;
  if (days === Math.floor(days)) {
    return days === 1 ? '1 day' : `${days} days`;
  }
  const formatted = days.toFixed(1);
  return formatted.endsWith('.0') ? `${Math.floor(days)} days` : `${formatted} days`;
}

/**
 * Adjustment factors for different conditions
 */
export const CONDITION_FACTORS = {
  // Coastal/humid environments need longer cure
  coastal: 1.5,

  // Shaded areas are typically cooler
  shade_temp_offset: -5,

  // Direct sun is typically warmer
  sun_temp_offset: 5
};

export default HILTI_PRODUCTS;
