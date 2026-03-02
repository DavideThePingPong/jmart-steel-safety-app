/**
 * Rigging and Lifting Data
 * For crane lifts and rigging calculations
 *
 * Based on AS 4991 Lifting Devices and AS 1418 Cranes
 * All capacities are Working Load Limits (WLL)
 */

/**
 * Chain sling capacities (Grade 80)
 * WLL in tonnes for different configurations
 */
export const CHAIN_SLINGS_G80 = {
  // Chain diameter (mm) -> { single, double60, double45, double30 }
  // Angles: 60° = good, 45° = acceptable, 30° = poor (avoid)
  6: { single: 1.12, double60: 1.94, double45: 1.58, double30: 1.12, basket: 2.24 },
  7: { single: 1.50, double60: 2.60, double45: 2.12, double30: 1.50, basket: 3.00 },
  8: { single: 2.00, double60: 3.46, double45: 2.83, double30: 2.00, basket: 4.00 },
  10: { single: 3.15, double60: 5.46, double45: 4.45, double30: 3.15, basket: 6.30 },
  13: { single: 5.30, double60: 9.19, double45: 7.49, double30: 5.30, basket: 10.60 },
  16: { single: 8.00, double60: 13.86, double45: 11.31, double30: 8.00, basket: 16.00 },
  20: { single: 12.50, double60: 21.65, double45: 17.68, double30: 12.50, basket: 25.00 },
  22: { single: 15.00, double60: 25.98, double45: 21.21, double30: 15.00, basket: 30.00 },
  26: { single: 21.20, double60: 36.72, double45: 29.98, double30: 21.20, basket: 42.40 },
  32: { single: 31.50, double60: 54.56, double45: 44.55, double30: 31.50, basket: 63.00 }
};

/**
 * Wire rope sling capacities (6x36 IWRC)
 * WLL in tonnes
 */
export const WIRE_ROPE_SLINGS = {
  // Diameter (mm) -> capacities
  8: { single: 0.55, choker: 0.41, basket90: 1.10, basket60: 0.95, basket45: 0.78 },
  10: { single: 0.85, choker: 0.64, basket90: 1.70, basket60: 1.47, basket45: 1.20 },
  12: { single: 1.25, choker: 0.94, basket90: 2.50, basket60: 2.17, basket45: 1.77 },
  14: { single: 1.70, choker: 1.28, basket90: 3.40, basket60: 2.94, basket45: 2.40 },
  16: { single: 2.20, choker: 1.65, basket90: 4.40, basket60: 3.81, basket45: 3.11 },
  18: { single: 2.80, choker: 2.10, basket90: 5.60, basket60: 4.85, basket45: 3.96 },
  20: { single: 3.50, choker: 2.63, basket90: 7.00, basket60: 6.06, basket45: 4.95 },
  22: { single: 4.20, choker: 3.15, basket90: 8.40, basket60: 7.27, basket45: 5.94 },
  24: { single: 5.00, choker: 3.75, basket90: 10.00, basket60: 8.66, basket45: 7.07 },
  26: { single: 5.90, choker: 4.43, basket90: 11.80, basket60: 10.22, basket45: 8.34 },
  28: { single: 6.80, choker: 5.10, basket90: 13.60, basket60: 11.78, basket45: 9.62 },
  32: { single: 8.90, choker: 6.68, basket90: 17.80, basket60: 15.42, basket45: 12.59 }
};

/**
 * Flat web slings capacities
 * WLL in tonnes
 */
export const WEB_SLINGS = {
  // Width (mm) -> { straight, choker, basket90, basket60 }
  25: { straight: 0.80, choker: 0.64, basket90: 1.60, basket60: 1.39 },
  35: { straight: 1.00, choker: 0.80, basket90: 2.00, basket60: 1.73 },
  50: { straight: 1.50, choker: 1.20, basket90: 3.00, basket60: 2.60 },
  60: { straight: 2.00, choker: 1.60, basket90: 4.00, basket60: 3.46 },
  75: { straight: 2.50, choker: 2.00, basket90: 5.00, basket60: 4.33 },
  90: { straight: 3.00, choker: 2.40, basket90: 6.00, basket60: 5.20 },
  100: { straight: 4.00, choker: 3.20, basket90: 8.00, basket60: 6.93 },
  120: { straight: 5.00, choker: 4.00, basket90: 10.00, basket60: 8.66 },
  150: { straight: 6.00, choker: 4.80, basket90: 12.00, basket60: 10.39 },
  180: { straight: 8.00, choker: 6.40, basket90: 16.00, basket60: 13.86 },
  200: { straight: 10.00, choker: 8.00, basket90: 20.00, basket60: 17.32 },
  250: { straight: 12.00, choker: 9.60, basket90: 24.00, basket60: 20.78 },
  300: { straight: 15.00, choker: 12.00, basket90: 30.00, basket60: 25.98 }
};

/**
 * Shackles - Bow and Dee types
 * WLL in tonnes
 */
export const SHACKLES = {
  bow: {
    // Pin diameter (mm) -> WLL (tonnes)
    10: 0.50, 12: 0.75, 14: 1.00, 16: 1.50, 19: 2.00,
    22: 3.25, 25: 4.75, 29: 6.50, 32: 8.50, 35: 9.50,
    38: 12.00, 44: 17.00, 51: 25.00, 57: 35.00, 63: 45.00
  },
  dee: {
    10: 0.50, 12: 0.75, 14: 1.00, 16: 1.50, 19: 2.00,
    22: 3.25, 25: 4.75, 29: 6.50, 32: 8.50, 35: 9.50,
    38: 12.00, 44: 17.00, 51: 25.00, 57: 35.00, 63: 45.00
  }
};

/**
 * Angle factors for sling calculations
 * Multiply single leg capacity by these factors
 */
export const ANGLE_FACTORS = {
  90: 2.00,   // Vertical (ideal)
  85: 1.99,
  80: 1.97,
  75: 1.93,
  70: 1.88,
  65: 1.81,
  60: 1.73,   // Common good angle
  55: 1.64,
  50: 1.53,
  45: 1.41,   // Minimum recommended
  40: 1.29,
  35: 1.15,
  30: 1.00,   // Avoid - no advantage
  25: 0.85,   // Dangerous
  20: 0.68    // Never use
};

/**
 * Centre of gravity estimation for common shapes
 */
export const COG_POSITIONS = {
  // Position as fraction of length from reference point
  uniform_beam: { x: 0.5, y: 0.5 },  // Centre
  tapered_beam: { x: 0.4, y: 0.5 },  // Towards heavy end
  l_shape: { x: 0.35, y: 0.35 },     // Towards corner
  channel: { x: 0.5, y: 0.35 },      // Towards web
  i_beam: { x: 0.5, y: 0.5 }         // Centre
};

/**
 * Standard lift point spacing recommendations
 * Based on beam length
 */
export const LIFT_POINT_SPACING = {
  // Returns recommended distance from each end as fraction of length
  twoPoint: (length) => ({
    fromEnd: length <= 6 ? 0.2 : length <= 12 ? 0.21 : 0.22,
    spacing: length <= 6 ? 0.6 : length <= 12 ? 0.58 : 0.56
  }),
  fourPoint: (length) => ({
    fromEnd: 0.15,
    innerSpacing: 0.35,
    outerSpacing: 0.70
  })
};

export default {
  CHAIN_SLINGS_G80,
  WIRE_ROPE_SLINGS,
  WEB_SLINGS,
  SHACKLES,
  ANGLE_FACTORS,
  COG_POSITIONS,
  LIFT_POINT_SPACING
};
