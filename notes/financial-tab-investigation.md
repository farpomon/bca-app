# Financial Tab Investigation

The Financial tab is still showing $0 values even after fixing the backend queries. The issue is likely in how the frontend fetches and displays the financial data for an individual asset.

The Financial tab shows:
- Total Deferred Maintenance: $0
- Current Replacement Value: $0
- FCI: 0.0%
- Total Assessments: 0
- Total Deficiencies: 0

The backend queries have been fixed to join through the assets table, but the frontend may be using a different query or the asset-level financial data is fetched differently than project-level data.

Need to investigate the frontend component that renders the Financial tab to understand what tRPC query it uses.
