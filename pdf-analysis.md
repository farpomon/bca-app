# BCS2047 BAI PDF Analysis

## Document Structure

**Title:** Building Asset Inventory (BAI)
**Client:** The Owners, Strata Plan BCS 2047
**Property:** Skyline on Broadway, 2483 Spruce Street, Vancouver, BC
**Issued:** June 20, 2025 - Final
**Total Pages:** 67

## Table of Contents Structure

The document follows a hierarchical structure similar to UNIFORMAT II:

### Major Sections:
1. **Overview** (p.2)
2. **Structure** (p.4)
   - ST01 / Structural System
3. **Building Enclosure** (p.9)
   - BE01 / Exterior Walls
   - BE02 / Glazing
   - BE03 / Roofing
   - BE04 / Balconies
4. **Interior** (p.24)
   - IN01 / Interior Finishes
5. **Fire Protection** (p.31)
   - FP01 / Fire Safety System
   - FP02 / Suppression
6. **Mechanical Systems** (p.35)
   - ME01 / Heating & Cooling
   - ME02 / Ventilation
   - ME03 / Plumbing
   - ME04 / Elevator
7. **Electrical Systems** (p.49)
   - EL01 / Distribution
   - EL02 / Lighting
   - EL03 / Security
8. **Site** (p.58)
   - SI01 / Landscaping
   - SI02 / Site Features
9. **Miscellaneous** (p.61)
   - MI01 / Professional Services

## Component Entry Format

Each component has:
- **Component Code** (e.g., ST01.1-1)
- **Action Type** (Monitor, Renewal, Repair, etc.)
- **Component Name** (e.g., "Foundation")
- **Description** with numbered observations
- **Photos** (embedded images with captions)
- **Condition Rating** (Good, Fair, Poor, Excellent, Failed)
- **Priority** (Low, Moderate, High)
- **Year Reviewed** (e.g., 2024)
- **Year Installed** (e.g., 2006)
- **Comments** section with detailed notes

## Example Entry (ST01.1-1 Foundation):

```
ST01.1-1 Monitor Foundation

Condition: Good                    Priority: Low
Year Reviewed: 2024               Year Installed: 2006

Comments: In the absence of any deficiencies, we do not include any repair costs;
however, the Strata may wish to include a repair provision as part of
future Depreciation Report updates. Repairs over the expected
lifetime are expected to be identified and addressed as part of annual
maintenance, using operating budget funds.
```

## Key Observations for AI Extraction:

1. **Component codes** use custom format (ST01.1-1, BE01, etc.) not standard UNIFORMAT II
2. **Condition ratings** use text labels (Good, Fair, Poor) with percentage descriptions
3. **Photos** are embedded inline with component descriptions
4. **Year Installed** and **Year Reviewed** are key fields
5. **Priority** uses Low/Moderate/High scale
6. **Action types** include: Monitor, Renewal, Repair, Assessment, Upgrade, Maintenance
7. **Comments** contain rich contextual information about condition and recommendations

## Challenges for AI Parsing:

1. Custom component code system (not UNIFORMAT II)
2. Photos embedded in text flow
3. Multi-page component entries
4. Varied comment formats
5. Need to map custom codes to UNIFORMAT II equivalents
