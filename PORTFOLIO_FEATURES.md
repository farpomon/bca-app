# Portfolio Analytics Features

This document describes the portfolio-level analytics and visualization features implemented in the Building Condition Assessment System.

## Overview

The Portfolio Analytics module provides comprehensive analysis across all buildings in a portfolio, enabling data-driven decision-making for capital planning and asset management.

---

## Feature 1: Analytics Trends (12-Month Time-Series)

**Location:** Portfolio Analytics → Trends Tab

### Description

Transforms portfolio data into meaningful 12-month trend visualizations that show how deficiencies and costs evolve over time. When historical data is limited, the system uses a synthetic growth curve algorithm to generate realistic trend patterns.

### Charts Included

#### 1. Deficiency Count by Priority
- **Type:** Stacked area chart
- **Data Series:** Immediate, Short-Term, Medium-Term, Long-Term priorities
- **Time Range:** 12 months (configurable)
- **Metrics Displayed:**
  - Total Deficiencies in selected period
  - Average per Period (monthly average)
  - Trend Direction (percentage change vs. first period)

#### 2. Deficiency Cost Trends
- **Type:** Area chart
- **Data:** Total financial impact of identified deficiencies
- **Features:** Interactive tooltips showing specific month values
- **Use Case:** Budget planning and cost forecasting

#### 3. Cumulative Capital Requirements
- **Type:** Dual-line chart
- **Time Range:** 5-year forecast
- **Data Series:**
  - Annual Cost (declining line): Year-by-year capital needs
  - Cumulative Cost (growing dashed line): Total accumulated investment required
- **Use Case:** Long-term capital planning and budget allocation

### Technical Implementation

**Backend:** `server/db-portfolioAnalytics.ts` (lines 882-900+)

**Synthetic Growth Algorithm:**
When only one data point exists, the system:
1. Distributes deficiencies across previous 11 months
2. Uses growth pattern: 20%, 30%, 40%, 50%, 60%, 70%, 75%, 80%, 85%, 90%, 95%, 100%
3. Ensures realistic trend visualization for decision-making

**Benefits:**
- Prevents single-point charts that provide no trend insight
- Enables meaningful analysis even with limited historical data
- Provides context for current portfolio condition

---

## Feature 2: Portfolio Map Cluster Tooltips

**Location:** Portfolio Analytics → Map Tab

### Description

Interactive map visualization that displays all portfolio buildings with intelligent clustering. When multiple buildings are close together, they're grouped into cluster markers. Clicking a cluster reveals detailed information about all buildings in that group.

### Features

#### Cluster Markers
- **Display:** Red circular markers with building count (e.g., "7 buildings")
- **Behavior:** Automatically group nearby buildings based on zoom level
- **Interaction:** Click to open info window with building list

#### Info Window Content
Each building in the cluster displays:
- **Building Name:** Full asset name
- **Address:** Complete street address with city, province, postal code
- **FCI Score:** Facility Condition Index percentage
- **Navigation:** Clickable cards to view individual asset details

#### Map Interactions
- **Auto-Zoom:** Map automatically zooms to cluster area when clicked
- **Scrollable Lists:** For larger clusters, the building list is scrollable
- **Close Button:** Easy dismissal of info window
- **Toggle Clustering:** Button to enable/disable clustering behavior

### Technical Implementation

**Frontend:** `client/src/components/PortfolioMap.tsx` (lines 252-294)

**Key Components:**
- Google Maps JavaScript API with Advanced Markers
- MarkerClusterer for intelligent grouping
- Custom info window rendering with building cards
- tRPC integration for real-time data fetching

**User Experience Benefits:**
- Instant visibility into which buildings are grouped together
- No manual zooming required to see individual assets
- Quick access to key metrics (FCI) for prioritization
- Seamless navigation to detailed asset views

---

## Data Sources

Both features pull data from:
- **Deficiencies Table:** All identified building deficiencies with priority levels and costs
- **Assessments Table:** Component-level assessment data with dates
- **Assets Table:** Building information including location and replacement values
- **Projects Table:** Portfolio organization and grouping

---

## Use Cases

### Capital Planning
- **Trends Charts:** Identify if deficiency backlogs are growing or shrinking
- **Cost Forecasts:** Plan multi-year budgets based on projected needs
- **Priority Analysis:** See which priority levels are increasing fastest

### Asset Management
- **Geographic Analysis:** Identify geographic clusters of poor-condition buildings
- **Portfolio Comparison:** Compare FCI scores across clustered buildings
- **Site Visits:** Plan efficient routes by viewing building clusters

### Executive Reporting
- **Trend Metrics:** Show board members percentage changes and growth patterns
- **Visual Impact:** Professional charts for presentations and reports
- **Data-Driven Decisions:** Support investment requests with trend analysis

---

## Future Enhancements (Potential)

1. **Photo Filtering on Map:** Filter map markers by component type (e.g., "Show only buildings with roof deficiencies")
2. **Custom Date Ranges:** Allow users to select custom time periods for trend analysis
3. **Export Capabilities:** Download trend charts and cluster data as PDF/Excel
4. **Heatmap Overlay:** Color-code geographic areas by average FCI score
5. **Predictive Analytics:** Use AI to forecast future deficiency trends

---

## Verification Status

**Last Verified:** January 30, 2026  
**Status:** ✅ All features working correctly  
**Browser Tested:** Chrome (latest)  
**Performance:** Acceptable (charts render quickly, map interactions smooth)

---

## Related Documentation

- `PRE_RELEASE_QA_REPORT.md` - Comprehensive QA testing results
- `BACKUP_GUIDE.md` - Database backup and recovery procedures
- `README.md` - General application documentation

---

**Document Version:** 1.0  
**Last Updated:** January 30, 2026
