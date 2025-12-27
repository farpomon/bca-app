# Portfolio Analytics Enhancement Guide

## Overview

The Building Condition Assessment (BCA) system has been enhanced with advanced portfolio analytics capabilities, providing comprehensive financial analysis, predictive modeling, and performance benchmarking tools for facilities management professionals.

## Key Features

### 1. Advanced Financial Metrics

#### Net Present Value (NPV)
Calculates the present value of future cash flows discounted at a specified rate, helping evaluate the profitability of capital investments.

**Formula**: NPV = -Initial Investment + Σ(Cash Flow_t / (1 + r)^t)

**Use Case**: Evaluate whether a $150K HVAC replacement with $30K annual savings over 15 years is financially viable.

#### Return on Investment (ROI)
Measures the efficiency of an investment by comparing total benefits to total costs.

**Formula**: ROI = ((Total Benefit - Total Cost) / Total Cost) × 100%

**Use Case**: Compare the ROI of multiple energy efficiency projects to prioritize investments.

#### Internal Rate of Return (IRR)
Determines the discount rate at which the NPV of an investment equals zero, representing the expected annual return.

**Calculation**: Uses Newton-Raphson iterative method to find the rate where NPV = 0

**Use Case**: Assess whether a building automation system's expected returns meet your organization's hurdle rate.

#### Payback Period
Calculates how long it takes for an investment to recover its initial cost through generated cash flows.

**Formula**: Payback Period = Initial Investment / Annual Cash Flow

**Use Case**: Identify quick-win projects with short payback periods for immediate budget approval.

#### Total Cost of Ownership (TCO)
Comprehensive analysis of all costs associated with owning and operating an asset over its lifecycle.

**Components**:
- Acquisition cost
- Annual maintenance (2-4% of replacement value)
- Repair costs
- Operating expenses
- Energy costs

**Use Case**: Compare TCO of different HVAC systems to make informed replacement decisions.

### 2. Predictive Analytics & Forecasting

#### Financial Forecasting
Multi-year cost projections with three scenario types:

- **Best Case** (0.7x multiplier): Optimistic scenario with favorable conditions
- **Most Likely** (1.0x multiplier): Expected scenario based on historical trends
- **Worst Case** (1.3x multiplier): Conservative scenario accounting for adverse conditions

**Methodology**:
1. Analyze historical portfolio metrics (minimum 2 data points)
2. Calculate annual FCI deterioration rate
3. Apply inflation adjustments from economic indicators
4. Project costs with scenario multipliers
5. Calculate failure probability and risk scores

**Forecast Outputs**:
- Predicted maintenance costs
- Predicted repair costs
- Predicted replacement costs
- Capital requirements
- Confidence levels
- Failure probability
- Risk scores

#### Failure Probability Prediction
Estimates the likelihood of asset failure based on:
- Current FCI
- Asset age
- Historical deterioration rate
- Scenario multiplier

**Formula**: Failure Probability = min(100, FCI × (1 + years × 0.1) × scenario_multiplier)

### 3. Performance Benchmarking

#### Industry Benchmarks
Compare your portfolio against industry standards:

- **FCI Benchmarks**: Industry median, 25th percentile, 75th percentile
- **CI Benchmarks**: Condition index comparisons
- **Category Benchmarks**: Asset type-specific standards
- **Regional Benchmarks**: Geographic comparisons

#### Portfolio Targets & KPIs
Set and track strategic goals:

**Target Types**:
- FCI improvement targets
- CI improvement targets
- Budget targets
- Deficiency reduction targets
- Condition improvement targets
- Custom metrics

**Progress Tracking**:
- Baseline value
- Current value
- Target value
- Progress percentage
- Status (on_track, at_risk, off_track, achieved)
- Review frequency (monthly, quarterly, semi-annual, annual)

### 4. Risk Assessment

#### Risk Scoring
Comprehensive risk calculation based on:
- Failure probability
- Financial impact
- Criticality level
- Safety implications

**Formula**: Risk Score = (Failure Probability × Predicted Maintenance Cost) / 1000

#### Risk Categories
- **Critical**: Immediate safety or operational risk
- **High**: Significant financial or operational impact
- **Medium**: Moderate impact, manageable timeline
- **Low**: Minimal impact, long-term planning

### 5. Economic Indicators

Track key economic factors affecting portfolio planning:

- **Construction Inflation Rate**: Annual cost increase for construction materials and labor
- **Recommended Discount Rate**: Standard rate for NPV calculations
- **Prime Rate**: Base interest rate for financing
- **Regional Economic Factors**: Location-specific indicators

## Database Schema

### New Tables

#### 1. portfolio_metrics_history
Historical tracking of portfolio performance metrics.

**Key Fields**:
- `snapshotDate`: Timestamp of metric capture
- `companyId`: Company identifier
- `totalReplacementValue`: Current replacement value
- `totalDeferredMaintenance`: Total repair costs
- `portfolioFci`: Portfolio-wide FCI
- `totalAssets`: Number of assets
- `assetsGoodCondition`, `assetsFairCondition`, `assetsPoorCondition`: Condition distribution
- `totalDeficiencies`, `criticalDeficiencies`, `highPriorityDeficiencies`: Deficiency metrics
- `activeProjects`, `completedProjects`: Project status
- `inflationRate`, `discountRate`: Economic factors

#### 2. financial_forecasts
Predictive financial data with scenario modeling.

**Key Fields**:
- `forecastDate`: When forecast was generated
- `forecastYear`: Target year
- `scenarioType`: best_case, most_likely, worst_case
- `predictedMaintenanceCost`: Projected maintenance expenses
- `predictedRepairCost`: Projected repair expenses
- `predictedReplacementCost`: Projected replacement expenses
- `predictedCapitalRequirement`: Total capital needed
- `predictedFci`: Projected FCI
- `failureProbability`: Likelihood of failure
- `riskScore`: Calculated risk metric
- `confidenceLevel`: Forecast confidence (decreases with time horizon)

#### 3. investment_analysis
ROI, NPV, and IRR analysis for capital projects.

**Key Fields**:
- `projectId`, `assetId`: Project/asset identifiers
- `analysisType`: roi, npv, payback, tco, lcca, benefit_cost
- `initialInvestment`: Upfront cost
- `annualOperatingCost`, `annualMaintenanceCost`: Ongoing expenses
- `annualEnergySavings`, `annualCostAvoidance`: Benefits
- `netPresentValue`: NPV result
- `internalRateOfReturn`: IRR percentage
- `returnOnInvestment`: ROI percentage
- `paybackPeriodYears`: Years to recover investment
- `benefitCostRatio`: Benefit/cost ratio
- `discountRate`, `inflationRate`: Economic parameters
- `analysisHorizonYears`: Analysis timeframe
- `recommendation`: proceed, defer, reject, requires_review
- `confidenceLevel`: Analysis confidence

#### 4. benchmark_data
Industry and regional benchmark comparisons.

**Key Fields**:
- `benchmarkType`: industry, sector, region, asset_type, custom
- `category`: Specific classification
- `medianFci`, `percentile25Fci`, `percentile75Fci`: FCI benchmarks
- `medianCi`, `percentile25Ci`, `percentile75Ci`: CI benchmarks
- `sampleSize`: Number of portfolios in benchmark
- `dataSource`: Source of benchmark data
- `region`, `sector`: Classification fields
- `isActive`: Current validity

#### 5. economic_indicators
Economic factors for financial modeling.

**Key Fields**:
- `indicatorDate`: Date of indicator
- `region`: Geographic area
- `constructionInflationRate`: Construction cost inflation
- `generalInflationRate`: General CPI
- `primeRate`: Base interest rate
- `treasuryRate10Year`: 10-year treasury rate
- `recommendedDiscountRate`: Standard discount rate
- `materialCostIndex`: Construction material costs
- `laborCostIndex`: Construction labor costs
- `energyCostIndex`: Energy price trends

#### 6. portfolio_targets
KPI goals and progress tracking.

**Key Fields**:
- `targetYear`: Goal year
- `targetType`: fci, ci, budget, deficiency_reduction, condition_improvement, custom
- `metricName`: Human-readable metric name
- `targetValue`: Goal value
- `currentValue`: Current progress
- `baselineValue`, `baselineYear`: Starting point
- `progressPercentage`: Completion percentage
- `status`: on_track, at_risk, off_track, achieved
- `strategicAlignment`: Link to strategic goals
- `accountableParty`: Responsible person/team
- `reviewFrequency`: Tracking frequency

## API Endpoints

All endpoints are available via `trpc.portfolioAnalyticsEnhanced.*`

### Metrics & Snapshots

#### `captureSnapshot()`
Captures current portfolio metrics snapshot for historical tracking.

**Returns**: `{ success: boolean, snapshotDate: Date }`

#### `getMetricsTrend({ months })`
Retrieves historical metrics trend.

**Parameters**:
- `months` (optional): Number of months to retrieve (1-36, default: 12)

**Returns**: Array of portfolio metrics snapshots

### Financial Analysis

#### `createInvestmentAnalysis({ ... })`
Creates comprehensive investment analysis for a project.

**Parameters**:
- `projectId`: Project identifier
- `assetId` (optional): Asset identifier
- `analysisType`: roi | npv | payback | tco | lcca | benefit_cost
- `initialInvestment`: Upfront cost
- `annualOperatingCost` (optional): Annual operating expenses
- `annualMaintenanceCost` (optional): Annual maintenance expenses
- `annualEnergySavings` (optional): Annual energy savings
- `annualCostAvoidance` (optional): Annual avoided costs
- `discountRate`: Discount rate percentage (0-20)
- `analysisHorizonYears`: Analysis timeframe (1-50 years)
- `inflationRate` (optional): Annual inflation rate

**Returns**: Investment analysis results with NPV, ROI, IRR, payback period, and recommendation

#### `getProjectInvestmentAnalyses({ projectId })`
Retrieves all investment analyses for a project.

**Returns**: Array of investment analysis records

#### `calculateTCO({ assetId, analysisHorizonYears })`
Calculates Total Cost of Ownership for an asset.

**Parameters**:
- `assetId`: Asset identifier
- `analysisHorizonYears`: Analysis timeframe (1-50 years, default: 10)

**Returns**: TCO breakdown including acquisition, maintenance, and repair costs

#### `calculateFinancialMetrics({ ... })`
Utility endpoint for ad-hoc financial calculations.

**Parameters**:
- `metricType`: npv | roi | payback | irr
- Additional parameters based on metric type

**Returns**: Calculated metric value

### Forecasting

#### `generateForecast({ projectId, assetId, forecastYears, scenarioType })`
Generates multi-year financial forecast.

**Parameters**:
- `projectId`: Project identifier
- `assetId` (optional): Asset identifier
- `forecastYears`: Number of years to forecast (1-10, default: 5)
- `scenarioType`: best_case | most_likely | worst_case (default: most_likely)

**Returns**: Array of annual forecast data

#### `getForecasts({ projectId, assetId, scenarioType })`
Retrieves existing forecasts with optional filters.

**Returns**: Array of forecast records

### Benchmarking

#### `getBenchmarkComparison({ portfolioFci, portfolioCi, assetType })`
Compares portfolio metrics against industry benchmarks.

**Parameters**:
- `portfolioFci`: Current portfolio FCI
- `portfolioCi`: Current portfolio CI
- `assetType` (optional): Asset category for specific benchmarks

**Returns**: Benchmark comparison with percentile rankings

#### `getBenchmarks({ benchmarkType, category })`
Retrieves available benchmark data.

**Parameters**:
- `benchmarkType` (optional): industry | sector | region | asset_type | custom
- `category` (optional): Specific category filter

**Returns**: Array of benchmark records

### Targets & KPIs

#### `getPortfolioTargets({ targetYear, targetType, status })`
Retrieves portfolio targets with optional filters.

**Parameters**:
- `targetYear` (optional): Filter by target year
- `targetType` (optional): Filter by target type
- `status` (optional): Filter by status

**Returns**: Array of portfolio targets

#### `createPortfolioTarget({ ... })`
Creates a new portfolio target.

**Parameters**:
- `targetYear`: Goal year
- `targetType`: Target category
- `metricName`: Human-readable name
- `targetValue`: Goal value
- `baselineValue` (optional): Starting value
- `baselineYear` (optional): Starting year
- `description` (optional): Target description
- `strategicAlignment` (optional): Strategic goal alignment
- `accountableParty` (optional): Responsible party
- `reviewFrequency`: monthly | quarterly | semi_annual | annual (default: quarterly)

**Returns**: `{ success: boolean }`

#### `updateTargetsProgress()`
Updates progress for all active targets based on current metrics.

**Returns**: `{ success: boolean, updatedCount: number }`

### Economic Indicators

#### `getEconomicIndicators({ startDate, endDate, region })`
Retrieves economic indicator data.

**Parameters**:
- `startDate` (optional): Filter start date
- `endDate` (optional): Filter end date
- `region` (optional): Geographic filter

**Returns**: Array of economic indicator records

### Dashboard

#### `getAdvancedDashboardData()`
Retrieves comprehensive analytics data for dashboard.

**Returns**:
```typescript
{
  metricsTrend: PortfolioMetric[],
  targets: PortfolioTarget[],
  forecasts: FinancialForecast[],
  economicIndicators: EconomicIndicator | null,
  generatedAt: string
}
```

## Frontend Components

### PortfolioAnalyticsEnhanced Page

**Route**: `/portfolio-analytics-enhanced`

**Features**:
- Key metrics summary cards (FCI, total assets, deferred maintenance, inflation rate)
- Interactive tabs for different analytics views
- Responsive charts using Recharts library
- Time period selection for trend analysis
- Scenario selection for forecasts
- Export functionality (planned)

**Tabs**:
1. **Overview**: Portfolio metrics trend, economic indicators
2. **Forecasting**: Multi-year projections, risk analysis
3. **Targets & KPIs**: Goal tracking with progress indicators
4. **Benchmarks**: Industry comparisons (planned)
5. **Investments**: ROI/NPV analysis tools (planned)

### Chart Components

- **Area Charts**: Portfolio metrics trends
- **Line Charts**: Financial forecasts
- **Bar Charts**: Risk analysis, priority breakdowns
- **Scatter Plots**: Correlation analysis (planned)

## Usage Examples

### Example 1: HVAC Replacement Analysis

```typescript
// Create investment analysis
const analysis = await trpc.portfolioAnalyticsEnhanced.createInvestmentAnalysis.mutate({
  projectId: 123,
  assetId: 456,
  analysisType: 'npv',
  initialInvestment: 150000,
  annualOperatingCost: 5000,
  annualMaintenanceCost: 3000,
  annualEnergySavings: 25000,
  annualCostAvoidance: 5000,
  discountRate: 5,
  analysisHorizonYears: 15,
  inflationRate: 2.5
});

// Results:
// - NPV: Positive indicates profitable investment
// - ROI: Percentage return over 15 years
// - Payback: Years to recover initial investment
// - IRR: Expected annual return rate
// - Recommendation: proceed | defer | reject | requires_review
```

### Example 2: Generate 5-Year Forecast

```typescript
// Generate forecast for all scenarios
const scenarios = ['best_case', 'most_likely', 'worst_case'];

for (const scenario of scenarios) {
  await trpc.portfolioAnalyticsEnhanced.generateForecast.mutate({
    projectId: 123,
    forecastYears: 5,
    scenarioType: scenario
  });
}

// Retrieve forecasts
const forecasts = await trpc.portfolioAnalyticsEnhanced.getForecasts.query({
  projectId: 123
});

// Compare scenarios to understand risk range
```

### Example 3: Set and Track FCI Improvement Target

```typescript
// Create target
await trpc.portfolioAnalyticsEnhanced.createPortfolioTarget.mutate({
  targetYear: 2030,
  targetType: 'fci',
  metricName: 'Portfolio FCI Improvement',
  targetValue: 5.0, // Target FCI of 5%
  baselineValue: 12.5, // Current FCI of 12.5%
  baselineYear: 2025,
  description: 'Reduce portfolio FCI to 5% by 2030',
  strategicAlignment: 'Capital Planning Strategy 2025-2030',
  accountableParty: 'Facilities Management Team',
  reviewFrequency: 'quarterly'
});

// Update progress (run periodically)
await trpc.portfolioAnalyticsEnhanced.updateTargetsProgress.mutate();

// Check progress
const targets = await trpc.portfolioAnalyticsEnhanced.getPortfolioTargets.query({
  targetType: 'fci'
});
```

### Example 4: Calculate Total Cost of Ownership

```typescript
// Calculate 10-year TCO for an asset
const tco = await trpc.portfolioAnalyticsEnhanced.calculateTCO.query({
  assetId: 789,
  analysisHorizonYears: 10
});

// Results include:
// - acquisitionCost: Initial replacement value
// - annualMaintenance: Estimated annual maintenance (2-4% of CRV)
// - totalMaintenanceCost: 10-year maintenance total
// - totalRepairCost: Projected repairs
// - totalCostOfOwnership: Complete 10-year cost
// - annualizedCost: Average annual cost
```

## Best Practices

### Financial Analysis

1. **Use Consistent Discount Rates**: Apply organization-standard discount rates for comparability
2. **Include All Costs**: Account for operating, maintenance, energy, and indirect costs
3. **Consider Inflation**: Apply inflation adjustments for long-term analyses
4. **Validate Assumptions**: Document and validate all input assumptions
5. **Scenario Analysis**: Always run multiple scenarios to understand risk range

### Forecasting

1. **Historical Data**: Ensure sufficient historical data (minimum 2 years)
2. **Regular Updates**: Capture metrics snapshots regularly (monthly or quarterly)
3. **Review Forecasts**: Update forecasts annually or when significant changes occur
4. **Confidence Levels**: Consider decreasing confidence for longer time horizons
5. **Economic Indicators**: Update economic indicators quarterly

### Target Setting

1. **SMART Goals**: Set Specific, Measurable, Achievable, Relevant, Time-bound targets
2. **Baseline Establishment**: Document clear baseline values and dates
3. **Regular Reviews**: Schedule regular progress reviews (quarterly recommended)
4. **Accountability**: Assign clear ownership for each target
5. **Strategic Alignment**: Link targets to organizational strategic goals

### Benchmarking

1. **Peer Selection**: Compare against similar portfolios (size, type, region)
2. **Data Quality**: Ensure benchmark data is current and reliable
3. **Context Matters**: Consider unique organizational factors
4. **Multiple Metrics**: Use multiple benchmarks for comprehensive comparison
5. **Action Plans**: Develop action plans for metrics below benchmarks

## Testing

Comprehensive test suite validates all financial calculations:

- **26 Test Cases** covering NPV, ROI, Payback, IRR calculations
- **Edge Cases**: Small/large investments, long-term projects, zero/negative scenarios
- **Real-World Scenarios**: HVAC, roof, energy efficiency, building automation projects
- **Comparison Scenarios**: Investment prioritization logic

Run tests:
```bash
pnpm test advancedAnalytics.test.ts
```

## Future Enhancements

### Planned Features

1. **What-If Analysis**: Interactive scenario modeling with adjustable parameters
2. **Optimization Engine**: AI-powered budget allocation recommendations
3. **Risk Heat Maps**: Visual risk assessment across portfolio
4. **Peer Benchmarking**: Direct comparison with similar organizations
5. **Custom Dashboards**: User-configurable analytics views
6. **Automated Reports**: Scheduled report generation and email delivery
7. **Export Functionality**: PDF, Excel, CSV export for all visualizations
8. **API Integration**: Connect with external BI tools and ERP systems

### Roadmap

- **Q1 2025**: What-if analysis and optimization engine
- **Q2 2025**: Risk heat maps and peer benchmarking
- **Q3 2025**: Custom dashboards and automated reports
- **Q4 2025**: Advanced export and API integration

## Support

For questions or issues related to the enhanced analytics system:

1. Review this documentation
2. Check the test suite for calculation examples
3. Consult with senior engineering or architecture team
4. Review economic assumptions with finance team

## Conclusion

The enhanced portfolio analytics system provides facilities management professionals with enterprise-grade financial analysis, predictive modeling, and performance benchmarking capabilities. By leveraging these tools, organizations can make data-driven decisions, optimize capital allocation, and achieve strategic portfolio management goals.
