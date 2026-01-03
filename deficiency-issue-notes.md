# Total Deficiencies Issue - Dec 29

## Current State
- Project Analytics page for "Downtown Commercial Office Complex" (project 3630001) shows:
  - Total Assets: 20
  - Total Deficiencies: 0 (INCORRECT - should show deficiencies)
  - Deferred Maintenance: $22.67M
  - FCI Score: 14.1%

## Issue
The Total Deficiencies count is showing 0 even though the project has deficiencies in the database.
The Deferred Maintenance and FCI Score are calculating correctly, which suggests the deficiency data exists.

## Next Steps
1. Check the getDeficiencyPriorityBreakdown function in analyticsDb.ts
2. Verify the query is using the correct projectId
3. Check if the deficiencies table has the correct projectId values
