# Portfolio/Asset Condition Assessment Report Improvements

## Overview

This document describes the comprehensive improvements made to the Building Condition Assessment (BCA) report PDF generation system to ensure client-ready, defensible reports that meet professional standards.

## Key Improvements

### 1. Data Validation and Reconciliation

**Location:** `server/reportDataValidation.ts`

#### Features Implemented:
- **Pre-export validation** that runs before PDF generation
- **Financial reconciliation** ensuring sum(DM by priority) = Total DM (within 1% tolerance)
- **FCI rating validation** with correct thresholds:
  - Good: 0-5%
  - Fair: 5-10%
  - Poor: 10-30%
  - Critical: >30%
- **Duplicate component detection** and automatic removal
- **Unresolved template variable detection** (e.g., `${variableName}`)
- **Building-level rollup validation** for portfolio reports
- **Capital forecast consistency checks**

#### Usage:
```typescript
import { validateAssetReport, validatePortfolioReport } from './reportDataValidation';

// Validate asset report data
const result = validateAssetReport(reportData);
if (!result.canExport) {
  throw new Error(`Validation failed: ${result.issues.map(i => i.message).join('; ')}`);
}

// Use corrected data
const correctedData = result.correctedData;
```

#### Validation Issues:
- **Error severity:** Blocks PDF export
- **Warning severity:** Allows export but flags issues
- **Info severity:** Informational only

### 2. Enhanced Asset Overview Section

**Location:** `server/assetReportGenerator.ts` (lines 211-343)

#### New Layout:
1. **Key Financial Metrics** (prominent box):
   - Current Replacement Value (CRV)
   - Total Deferred Maintenance
   - Facility Condition Index (FCI) with rating
   - Total Deficiencies
   - Critical Deficiencies

2. **Deferred Maintenance by Priority Horizon**:
   - 0-1 Year (Immediate)
   - 1-2 Years (Short-term)
   - 2-5 Years (Medium-term)
   - 5+ Years (Long-term)
   - Shows cost and percentage of total DM

3. **Condition Distribution**:
   - Breakdown by condition rating
   - Count and percentage

#### Benefits:
- Single-page executive summary
- Clear visual hierarchy
- All critical metrics at a glance
- Supports decision-making

### 3. Enhanced Deficiency Section

**Location:** `server/assetReportGenerator.ts` (lines 392-512)

#### Enhanced Information:
- **System/Location**: Component code and specific location
- **Consequence of Deferral**: Severity-based impact description
  - Critical: "Immediate safety risk or operational failure"
  - High: "Accelerated deterioration, increased repair costs"
  - Medium: "Progressive degradation, potential service disruption"
  - Low: "Minor impact, cosmetic or functional decline"
- **Recommended Action**: Specific action or default guidance
- **Cost**: Estimated cost or "TBD"

#### Table Features:
- Grouped by urgency band (0-1, 1-2, 2-5, 5+ years)
- Print-safe formatting
- Headers repeat on each page
- Row splitting prevented
- Text wrapping for long content

### 4. Financial Analysis Improvements

**Location:** `server/assetReportGenerator.ts` (lines 514-805)

#### Enhancements:
1. **Negative ROI/IRR Explanation**:
   - Automatic detection of negative values
   - Plain-language note explaining lifecycle maintenance vs. revenue generation
   - Emphasizes risk mitigation and asset preservation

2. **Cost Reconciliation**:
   - Total row in Cost by Priority table
   - Verification that sum equals Total DM
   - Clear labeling of 5-year vs. total costs

3. **Methodology Note**:
   - Industry-standard assumptions documented
   - 5% discount rate (PWGSC guideline)
   - 2% annual operational savings
   - 30% avoided replacement costs
   - Disclaimer about actual returns

### 5. Professional PDF Export

**Location:** `server/assetReportGenerator.ts` (lines 807-827)

#### Features:
- **Page numbers** on all pages (except cover)
- **Consistent footer** with:
  - Project name
  - Asset address
  - Page number
  - "Data as of" snapshot date
- **Print-safe tables**:
  - Headers repeat on every page
  - Row splitting prevented
  - Text wrapping enabled
  - Proper overflow handling

### 6. Testing

**Location:** `server/reportDataValidation.test.ts`

#### Test Coverage:
- FCI calculation accuracy
- FCI rating assignment
- Asset report validation
- Portfolio report validation
- Duplicate detection
- Template variable detection
- Financial reconciliation
- Building rollup validation
- Capital forecast validation

**Test Results:** All 15 tests passing ✓

## Implementation Details

### FCI Calculation

FCI is calculated as a **decimal ratio** (0-1 scale), not a percentage:

```typescript
function calculateFCI(deferredMaintenance: number, crv: number): number {
  if (crv <= 0) return 0;
  return deferredMaintenance / crv; // Returns 0.05 for 5%, not 5
}
```

### FCI Rating Logic

```typescript
function getFCIRating(fci: number): string {
  if (fci <= 0.05) return 'Good';    // 0-5%
  if (fci <= 0.10) return 'Fair';    // 5-10%
  if (fci <= 0.30) return 'Poor';    // 10-30%
  return 'Critical';                  // >30%
}
```

### Validation Workflow

```
1. User requests PDF export
   ↓
2. validateAssetReport() or validatePortfolioReport()
   ↓
3. Check for errors (severity: 'error')
   ↓
4. If errors found → throw Error, block export
   ↓
5. If warnings only → proceed with correctedData
   ↓
6. Generate PDF with validated/corrected data
```

## Acceptance Criteria Status

✅ **No mismatched totals**: Validation ensures sum(DM by horizon) = Total DM

✅ **FCI rating correct**: Thresholds properly applied (0-5% Good, 5-10% Fair, 10-30% Poor, >30% Critical)

✅ **No unresolved variables**: Template variable detection blocks export if found

✅ **No duplicated component rows**: Automatic deduplication with warnings

✅ **Tables paginate cleanly**: Headers repeat, rows don't split, text wraps

✅ **Narrative reads professionally**: Consequence descriptions are concise and specific

## Future Enhancements

### Not Yet Implemented:
1. **Confidence level (0-100%)** for deficiencies
   - Requires database schema update
   - Field: `deficiencies.confidence` (int, 0-100)

2. **UNIFORMAT Level 1 Summary** for portfolio reports
   - Replace long assessment table with A-G system summary
   - Optional drilldown to Level 2/3 and component detail

3. **Portfolio Report Validation Integration**
   - Apply same validation logic to portfolio-level reports
   - Validate building-level data aggregation

## Usage Examples

### Generate Asset Report with Validation

```typescript
import { generateAssetReport } from './assetReportGenerator';

try {
  const pdfBuffer = await generateAssetReport({
    asset: assetData,
    projectName: "City Hall Portfolio",
    assessments: assessmentData,
    deficiencies: deficiencyData,
  });
  
  // PDF generated successfully with validated data
  return pdfBuffer;
} catch (error) {
  // Validation failed - error message contains specific issues
  console.error('Report validation failed:', error.message);
}
```

### Check Validation Without Generating PDF

```typescript
import { validateAssetReport, formatValidationReport } from './reportDataValidation';

const result = validateAssetReport(reportData);

console.log(formatValidationReport(result));
// Output:
// Validation Report:
// - Errors: 2
// - Warnings: 1
// - Can Export: No
//
// ERRORS (must be fixed):
// 1. FCI rating mismatch for Building A
//    Fix: Update FCI rating to "Fair" (FCI: 7.50%)
// 2. Sum of DM by priority does not match Total DM
//    Fix: Recalculate priority costs. Difference: $50000.00
```

## Technical Notes

### jsPDF AutoTable Configuration

Key settings for print-safe tables:

```typescript
autoTable(doc, {
  // ... other settings
  
  // Enable text wrapping
  styles: { overflow: 'linebreak' },
  
  // Repeat headers on each page
  showHead: 'everyPage',
  
  // Prevent row splitting across pages
  rowPageBreak: 'avoid',
  
  // Wrap specific columns
  columnStyles: {
    4: { overflow: 'linebreak' }
  }
});
```

### Color Consistency

Brand colors used throughout:
- **B³NMA Teal**: RGB(64, 182, 176) - Headers and accents
- **B³NMA Navy**: RGB(44, 62, 80) - Table headers
- **Header Gray**: RGB(240, 240, 240) - Alternating rows

## Maintenance

### Adding New Validation Rules

1. Add validation function to `reportDataValidation.ts`
2. Add test cases to `reportDataValidation.test.ts`
3. Run tests: `pnpm test reportDataValidation.test.ts`
4. Update this documentation

### Modifying Report Layout

1. Edit `assetReportGenerator.ts`
2. Test with sample data
3. Verify print output (page breaks, text wrapping)
4. Update screenshots in documentation

## References

- **PWGSC Guidelines**: Public Works and Government Services Canada facility management standards
- **FCI Standards**: Industry-standard Facility Condition Index calculations
- **UNIFORMAT II**: CSI/CSC building classification system
- **jsPDF Documentation**: https://github.com/parallax/jsPDF
- **jsPDF-AutoTable**: https://github.com/simonbengtsson/jsPDF-AutoTable

## Support

For questions or issues:
1. Check test suite for examples: `server/reportDataValidation.test.ts`
2. Review validation error messages for specific guidance
3. Consult this documentation for implementation details
