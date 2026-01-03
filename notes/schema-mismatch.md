# Schema Mismatch Issue

The actual database schema for the `assessments` table does NOT have a `projectId` column, but the Drizzle schema and the FCI calculation service expect it to exist. This is why the financial metrics are showing $0 - the queries are failing silently.

The actual assessments table has these columns:
- id, assetId, componentId, assessorId, assessmentDate, conditionRating, conditionNotes, deficiencyDescription, deficiencySeverity, recommendedAction, estimatedRepairCost, priorityLevel, remainingLifeYears, quantity, unit, location, accessibilityIssue, safetyHazard, energyEfficiencyIssue, codeViolation, status, reviewedById, reviewedAt, reviewNotes, createdAt, updatedAt

The Drizzle schema expects:
- projectId (NOT in actual table)
- condition (actual table has conditionRating)
- componentCode (actual table has componentId)

The FCI calculation queries use `assessments.projectId` which doesn't exist, so the queries return empty results.

To fix this, the queries need to join through the assets table to get the projectId:
```sql
SELECT a.* FROM assessments a
JOIN assets ass ON a.assetId = ass.id
WHERE ass.projectId = ?
```

This is a significant schema mismatch that needs to be addressed in the codebase.
