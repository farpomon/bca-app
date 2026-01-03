# Debug Notes - Deficiency Count Issue

## Finding
- The `getDeficiencyPriorityBreakdown` function works correctly when tested directly
- For project 3120001, it returns 39 deficiencies (21 short_term, 5 medium_term, 13 immediate)
- However, the UI still shows "Total Deficiencies: 0"

## Possible Causes
1. The server may not have reloaded the updated code
2. There may be caching in the browser
3. The frontend calculation may be different from the backend query

## Next Steps
- Check if the server is using the updated code
- Force restart the server
- Check the frontend calculation logic


# Company Settings Dialog - Testing Notes (Dec 29)

## Scrolling Test Results
- The Company Settings dialog now scrolls properly
- All sections are visible:
  1. User Settings (Default Trial Duration, Maximum Users)
  2. Security Settings (Require MFA for All Users)
  3. Privacy Lock (Privacy Lock Enabled, Generate Access Code)
  4. Feature Access (AI Document Import, Offline Mode, Advanced Reports, Bulk Operations)
- Cancel and Save Settings buttons are visible at the bottom

## Next Steps
- Need to add admin user assignment capability to company creation/editing
- Need to verify all admin features are working properly
