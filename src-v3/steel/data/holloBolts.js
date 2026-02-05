/**
 * Hollo-Bolt and LindiBolt Specification Data
 * For blind structural bolting into hollow sections
 *
 * All capacities are Safe Working Loads (SWL) in kN
 * Torque values in Nm
 * Dimensions in mm
 */

export const HOLLO_BOLT_DATA = {
  // Drilling requirements by bolt size
  DRILLING_DATA: {
    M8: {
      clearance_hole: 14,
      tolerance: '+1.0/-0.2',
      min_hole_distance: 35,
      min_edge_distance: 13
    },
    M10: {
      clearance_hole: 18,
      tolerance: '+1.0/-0.2',
      min_hole_distance: 40,
      min_edge_distance: 15
    },
    M12: {
      clearance_hole: 20,
      tolerance: '+1.0/-0.2',
      min_hole_distance: 50,
      min_edge_distance: 18
    },
    M16: {
      clearance_hole: 26,
      tolerance: '+2.0/-0.2',
      min_hole_distance: 55,
      min_edge_distance: 20,
      min_outer_ply: 8
    },
    M20: {
      clearance_hole: 33,
      tolerance: '+2.0/-0.2',
      min_hole_distance: 70,
      min_edge_distance: 25,
      min_outer_ply: 8
    }
  },

  // HB - Hexagonal Head Hollo-Bolts
  HEXAGONAL_HEAD: {
    M8: {
      product_codes_with_sizes: [
        'HB08-1 (L=45mm, clamp 3-22mm)',
        'HB08-2 (L=65mm, clamp 22-41mm)',
        'HB08-3 (L=85mm, clamp 41-60mm)'
      ],
      clamping_ranges: ['3-22', '22-41', '41-60'],
      torque_nm: 23,
      spanner_mm: 19,
      tensile_swl_kn: 4.0,
      shear_swl_kn: 5.0
    },
    M10: {
      product_codes_with_sizes: [
        'HB10-1 (L=49mm, clamp 3-22mm)',
        'HB10-2 (L=64mm, clamp 22-41mm)',
        'HB10-3 (L=84mm, clamp 41-60mm)'
      ],
      clamping_ranges: ['3-22', '22-41', '41-60'],
      torque_nm: 45,
      spanner_mm: 24,
      tensile_swl_kn: 8.5,
      shear_swl_kn: 10.0
    },
    M12: {
      product_codes_with_sizes: [
        'HB12-1 (L=53mm, clamp 3-25mm)',
        'HB12-2 (L=73mm, clamp 25-47mm)',
        'HB12-3 (L=93mm, clamp 47-69mm)'
      ],
      clamping_ranges: ['3-25', '25-47', '47-69'],
      torque_nm: 80,
      spanner_mm: 30,
      tensile_swl_kn: 10.5,
      shear_swl_kn: 15.0
    },
    M16: {
      product_codes_with_sizes: [
        'HB16-1 (L=67mm, clamp 12-29mm)',
        'HB16-2 (L=92mm, clamp 29-50mm)',
        'HB16-3 (L=112mm, clamp 50-71mm)'
      ],
      clamping_ranges: ['12-29', '29-50', '50-71'],
      torque_nm: 190,
      spanner_mm: 36,
      tensile_swl_kn: 21.0,
      shear_swl_kn: 30.0
    },
    M20: {
      product_codes_with_sizes: [
        'HB20-1 (L=80mm, clamp 12-34mm)',
        'HB20-2 (L=110mm, clamp 34-60mm)',
        'HB20-3 (L=140mm, clamp 60-86mm)'
      ],
      clamping_ranges: ['12-34', '34-60', '60-86'],
      torque_nm: 300,
      spanner_mm: 46,
      tensile_swl_kn: 35.0,
      shear_swl_kn: 40.0
    }
  },

  // HBCSK - Countersunk Head Hollo-Bolts
  COUNTERSUNK_HEAD: {
    M8: {
      product_codes_with_sizes: [
        'HBCSK08-1 (L=45mm, clamp 3-22mm)',
        'HBCSK08-2 (L=65mm, clamp 22-41mm)',
        'HBCSK08-3 (L=85mm, clamp 41-60mm)'
      ],
      clamping_ranges: ['3-22', '22-41', '41-60'],
      torque_nm: 23,
      spanner_mm: 19,
      tensile_swl_kn: 4.0,
      shear_swl_kn: 5.0
    },
    M10: {
      product_codes_with_sizes: [
        'HBCSK10-1 (L=44mm, clamp 3-22mm)',
        'HBCSK10-2 (L=64mm, clamp 22-41mm)',
        'HBCSK10-3 (L=84mm, clamp 41-60mm)'
      ],
      clamping_ranges: ['3-22', '22-41', '41-60'],
      torque_nm: 45,
      spanner_mm: 24,
      tensile_swl_kn: 8.5,
      shear_swl_kn: 10.0
    },
    M12: {
      product_codes_with_sizes: [
        'HBCSK12-1 (L=48mm, clamp 3-25mm)',
        'HBCSK12-2 (L=73mm, clamp 25-47mm)',
        'HBCSK12-3 (L=93mm, clamp 47-69mm)'
      ],
      clamping_ranges: ['3-25', '25-47', '47-69'],
      torque_nm: 80,
      spanner_mm: 30,
      tensile_swl_kn: 10.5,
      shear_swl_kn: 15.0
    },
    M16: {
      product_codes_with_sizes: [
        'HBCSK16-1 (L=62mm, clamp 12-29mm)',
        'HBCSK16-2 (L=92mm, clamp 29-50mm)',
        'HBCSK16-3 (L=112mm, clamp 50-71mm)'
      ],
      clamping_ranges: ['12-29', '29-50', '50-71'],
      torque_nm: 190,
      spanner_mm: 36,
      tensile_swl_kn: 21.0,
      shear_swl_kn: 30.0
    }
  },

  // HBFF - Flush Fit Head Hollo-Bolts
  FLUSH_FIT_HEAD: {
    M8: {
      product_codes_with_sizes: [
        'HBFF08-1 (L=50mm, clamp 10-27mm)',
        'HBFF08-2 (L=70mm, clamp 27-45mm)',
        'HBFF08-3 (L=90mm, clamp 45-64mm)'
      ],
      clamping_ranges: ['10-27', '27-45', '45-64'],
      torque_nm: 23,
      spanner_mm: 19,
      tensile_swl_kn: 4.0,
      shear_swl_kn: 5.0
    },
    M10: {
      product_codes_with_sizes: [
        'HBFF10-1 (L=50mm, clamp 12-27mm)',
        'HBFF10-2 (L=70mm, clamp 27-45mm)',
        'HBFF10-3 (L=90mm, clamp 45-64mm)'
      ],
      clamping_ranges: ['12-27', '27-45', '45-64'],
      torque_nm: 45,
      spanner_mm: 24,
      tensile_swl_kn: 8.5,
      shear_swl_kn: 10.0
    },
    M12: {
      product_codes_with_sizes: [
        'HBFF12-1 (L=55mm, clamp 12-30mm)',
        'HBFF12-2 (L=80mm, clamp 30-52mm)',
        'HBFF12-3 (L=100mm, clamp 52-74mm)'
      ],
      clamping_ranges: ['12-30', '30-52', '52-74'],
      torque_nm: 80,
      spanner_mm: 30,
      tensile_swl_kn: 10.5,
      shear_swl_kn: 15.0
    }
  },

  // LB - LindiBolt (single-sleeve design)
  LINDIBOLT: {
    M10: {
      product_codes_with_sizes: ['LB10 (L=74mm, clamp 7-30mm)'],
      clamping_ranges: ['7-30'],
      torque_nm: 20,
      spanner_mm: 17,
      tensile_swl_kn: 3.0,
      shear_swl_kn: 3.4
    },
    M12: {
      product_codes_with_sizes: ['LB12 (L=85mm, clamp 10-36mm)'],
      clamping_ranges: ['10-36'],
      torque_nm: 31,
      spanner_mm: 19,
      tensile_swl_kn: 5.0,
      shear_swl_kn: 5.0
    },
    M16: {
      product_codes_with_sizes: ['LB16 (L=105mm, clamp 12-48mm)'],
      clamping_ranges: ['12-48'],
      torque_nm: 81,
      spanner_mm: 24,
      tensile_swl_kn: 8.0,
      shear_swl_kn: 9.8
    },
    M20: {
      product_codes_with_sizes: ['LB20 (L=128mm, clamp 14-60mm)'],
      clamping_ranges: ['14-60'],
      torque_nm: 129,
      spanner_mm: 30,
      tensile_swl_kn: 14.0,
      shear_swl_kn: 15.2
    },
    M24: {
      product_codes_with_sizes: ['LB24 (L=158mm, clamp 18-72mm)'],
      clamping_ranges: ['18-72'],
      torque_nm: 203,
      spanner_mm: 36,
      tensile_swl_kn: 20.0,
      shear_swl_kn: 22.5
    }
  }
};

// Bolt type descriptions
export const BOLT_TYPES = {
  HB: { name: 'HB Hexagonal Head', description: 'Standard hex head for general use' },
  HBCSK: { name: 'HBCSK Countersunk', description: 'Flush surface finish' },
  HBFF: { name: 'HBFF Flush Fit', description: 'Minimal head protrusion' },
  LB: { name: 'LB LindiBolt', description: 'Single-sleeve for thicker sections' }
};

// Available sizes per bolt type
export const BOLT_SIZES = {
  HB: ['M8', 'M10', 'M12', 'M16', 'M20'],
  HBCSK: ['M8', 'M10', 'M12', 'M16'],
  HBFF: ['M8', 'M10', 'M12'],
  LB: ['M10', 'M12', 'M16', 'M20', 'M24']
};

export default HOLLO_BOLT_DATA;
