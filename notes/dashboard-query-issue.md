# Project Dashboard Query Issue

The project dashboard is showing "No assessments completed yet" even though:
- 39 assessments exist in the database for project 12
- The asset-level Financial tab works correctly (shows 9 assessments for asset 108)

## Root Cause
The project dashboard queries use the Drizzle ORM schema which expects columns that don't exist in the actual database:
- `assessments.projectId` - doesn't exist (need to join through assets)
- `assessments.condition` - doesn't exist (actual column is `conditionRating`)
- `assessments.deletedAt` - doesn't exist

## Queries That Need Fixing
1. `getAssessmentsByProject` in db.ts - needs to join through assets table
2. FCI calculation queries in fciCalculationService.ts - already partially fixed but may need more work
3. Assessment progress queries - need to use correct column names

## Solution
Need to update the project-level queries to:
1. Join assessments → assets → projects to filter by projectId
2. Use `conditionRating` instead of `condition`
3. Remove `deletedAt` filters
4. Use raw SQL like we did for getAssetAssessments
