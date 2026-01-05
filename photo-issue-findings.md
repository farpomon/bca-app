# Photo Display Issue Investigation

## Problem
The "Existing Photos" section shows a loading spinner that never completes on the component assessment page.

## Key Findings

1. **Database State**: The photos table is empty (0 photos in the database)
2. **Assessment Dialog**: The dialog shows "D30 - HVAC" with condition "Not Assessed" - this appears to be a NEW assessment, not an existing one
3. **ExistingPhotosDisplay Component**: Only renders when `existingAssessment?.id` is truthy (line 1154 in AssessmentDialog.tsx)
4. **Query**: `trpc.photos.byAssessment.useQuery({ assessmentId, projectId })` is used to fetch photos

## Root Cause Analysis

The issue is that when the user opens an assessment dialog:
- For a NEW component (no existing assessment), the `existingAssessment?.id` is undefined
- The ExistingPhotosDisplay component should NOT render for new assessments
- However, the user screenshot shows "Existing Photos" with a loading spinner

This suggests that:
1. There IS an existing assessment record in the database for this component
2. The assessment has an ID, so the ExistingPhotosDisplay component renders
3. The photos.byAssessment query is being called but never completing

## Next Steps
1. Check if there's an assessment record for D30 HVAC in project 14
2. Check if the photos.byAssessment query is returning an error
3. Verify the query is correctly filtering by assessmentId
