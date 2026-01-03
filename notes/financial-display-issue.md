# Financial Tab Display Issue

The Financial tab is showing $0 for all values even though the database contains the correct data. The asset "Tower A - Main Office Building" has a replacement value of $125,000,000 and assessments with repair costs totaling over $4 million, but the UI shows $0.

The issue is likely that the frontend queries are not correctly aggregating the assessment costs or the replacement value from the assets table. The data exists in the database but is not being displayed properly in the Financial tab.

This needs to be investigated in the frontend code that fetches and displays financial metrics.
