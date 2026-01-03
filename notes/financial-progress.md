# Financial Tab Progress

The assessments are now being fetched correctly - showing 9 assessments for Tower A. However, there's a display issue with the Deferred Maintenance value showing as a concatenated string of all repair costs instead of a sum.

Current display shows:
- Total Assessments: 9 (correct!)
- Deferred Maintenance: $0150000.00850000.001200000.00450000.00... (incorrect - should be sum)
- Current Replacement Value: $0 (needs to use asset's replacementValue)
- FCI Score: 0.00% (incorrect due to CRV being 0)

The issue is that the estimatedRepairCost is being returned as a string from the database and the frontend is concatenating them instead of summing them.

Need to fix the query to return numeric values or fix the frontend calculation.
