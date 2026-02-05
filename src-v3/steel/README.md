# Steel Module v3

Modular steel calculations extracted from the monolithic `steel-app.html`.

## What's Improved

| Before | After |
|--------|-------|
| ~3,800 lines of inline data | Separate data modules |
| All functions in one file | Organized calculator service |
| No input validation | Full validation with error messages |
| No history tracking | Calculation history |
| Hard to test | Easily unit testable |

## Structure

```
src-v3/steel/
├── index.js              # Main exports
├── steelCalculator.js    # Unified calculator service
├── README.md
└── data/
    ├── steelSections.js  # All steel section data (SHS, RHS, UB, etc.)
    ├── holloBolts.js     # Hollo-bolt and LindiBolt specs
    └── chemicalAnchors.js # Hilti products and cure times
```

## Usage

### Steel Weight Calculation (IGOR)

```javascript
import { createSteelCalculator } from './steel';

const calc = createSteelCalculator();

// Calculate single member
const result = calc.calculateMemberWeight({
  type: 'SHS',
  size: '50x50x3.0',
  length: 6.0,
  quantity: 4,
  isStainless: false
});

console.log(result);
// {
//   success: true,
//   type: 'SHS',
//   typeName: 'Square Hollow Section',
//   size: '50x50x3.0',
//   length: 6,
//   quantity: 4,
//   massPerMetre: 4.25,
//   isStainless: false,
//   totalWeight: 102,
//   unit: 'kg'
// }

// Build a member list
calc.addMember({ type: 'UB', size: '310UB40', length: 8.0 });
calc.addMember({ type: 'PFC', size: '150x75', length: 4.5, quantity: 2 });

// Get breakdown
const breakdown = calc.getWeightBreakdown();
// {
//   byType: { UB: 323.2, PFC: 159.3 },
//   totalSteel: 482.5,
//   totalWithFittings: 530.75,
//   memberCount: 2
// }

// Export to JSON
const exportData = calc.exportToJSON();
```

### Bolt Selection (HOBART)

```javascript
import { createSteelCalculator } from './steel';

const calc = createSteelCalculator();

// Find bolts for a specific clamping thickness
const bolts = calc.findSuitableBolts(25, {
  minTensileKn: 8  // Minimum tension capacity
});

console.log(bolts.bestMatch);
// {
//   boltType: 'HB',
//   boltTypeName: 'HB Hex Head',
//   size: 'M12',
//   productCode: 'HB12-1 (L=53mm, clamp 3-25mm)',
//   clampingRange: '3-25',
//   fitQuality: 100,
//   tensileSwlKn: 10.5,
//   shearSwlKn: 15,
//   ...
// }

// Get specific bolt specs
const specs = calc.getBoltSpecs('HB', 'M16');
```

### Chemical Anchors (CHUCK)

```javascript
import { createSteelCalculator } from './steel';

const calc = createSteelCalculator();

// Get anchor specs with cure times for current temperature
const anchor = calc.getAnchorSpecs('HY200R', 'M16', 25);

console.log(anchor);
// {
//   success: true,
//   product: 'HY200R',
//   productName: 'HIT-HY 200-R',
//   size: 'M16',
//   holeSize: 18,
//   embedmentDepth: 125,
//   temperature: 25,
//   cureTime: {
//     standard: { work: 9, cure: 60, ... },
//     coastal: { work: 9, cure: 90, ... },
//     shade: { work: 15, cure: 60, ... }
//   }
// }

// Get all available products
const products = calc.getAnchorProducts();
```

## Direct Data Access

If you need the raw data without the calculator:

```javascript
import {
  STEEL_SECTIONS,
  SECTION_FULL_NAMES,
  HOLLO_BOLT_DATA,
  HILTI_PRODUCTS,
  getCureTime,
  formatCureTime
} from './steel';

// Get mass per metre for 100x100x5 SHS
const mass = STEEL_SECTIONS.SHS.data['100x100x5.0'];  // 14.2 kg/m

// Format a cure time
const formatted = formatCureTime(720);  // "12h"
```

## Validation

The calculator validates all inputs:

```javascript
const result = calc.calculateMemberWeight({
  type: 'SHS',
  size: 'INVALID',
  length: -5
});

// {
//   success: false,
//   error: {
//     message: 'Validation failed',
//     errors: [
//       'Invalid size "INVALID" for SHS',
//       'Length must be a positive number'
//     ]
//   }
// }
```

## Callbacks

```javascript
const calc = createSteelCalculator({
  onCalculation: (type, result) => {
    console.log(`Calculated: ${type}`, result);
  },
  onError: (error) => {
    console.error('Calculation error:', error);
  },
  saveHistory: true
});

// Access history
const history = calc.getHistory();
```

## Testing

The modular structure makes unit testing straightforward:

```javascript
import { createSteelCalculator } from './steel';

describe('SteelCalculator', () => {
  let calc;

  beforeEach(() => {
    calc = createSteelCalculator({ saveHistory: false });
  });

  test('calculates SHS weight correctly', () => {
    const result = calc.calculateMemberWeight({
      type: 'SHS',
      size: '50x50x3.0',
      length: 1.0
    });

    expect(result.success).toBe(true);
    expect(result.totalWeight).toBe(4.25);
  });

  test('validates invalid input', () => {
    const result = calc.calculateMemberWeight({
      type: 'INVALID',
      size: '50x50',
      length: 5
    });

    expect(result.success).toBe(false);
    expect(result.error.errors).toContain('Invalid section type: INVALID');
  });
});
```
