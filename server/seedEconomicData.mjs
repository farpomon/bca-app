import mysql from "mysql2/promise";

async function seedEconomicData() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    console.log("Seeding economic indicators...");

    // Sample economic indicators for Canada (current and historical)
    const indicators = [
      {
        indicatorDate: "2025-01-01",
        region: "Canada",
        cpiInflationRate: "2.8",
        constructionInflationRate: "3.5",
        materialInflationRate: "4.2",
        laborInflationRate: "3.1",
        primeRate: "5.95",
        bondYield10Year: "3.85",
        recommendedDiscountRate: "4.0",
        riskFreeRate: "3.5",
        gdpGrowthRate: "1.8",
        unemploymentRate: "5.4",
        exchangeRateUSD: "1.3450",
      },
      {
        indicatorDate: "2024-01-01",
        region: "Canada",
        cpiInflationRate: "3.4",
        constructionInflationRate: "4.1",
        materialInflationRate: "5.2",
        laborInflationRate: "3.8",
        primeRate: "7.20",
        bondYield10Year: "4.15",
        recommendedDiscountRate: "4.5",
        riskFreeRate: "3.8",
        gdpGrowthRate: "1.1",
        unemploymentRate: "5.8",
        exchangeRateUSD: "1.3250",
      },
      {
        indicatorDate: "2025-01-01",
        region: "Ontario",
        cpiInflationRate: "2.9",
        constructionInflationRate: "3.7",
        materialInflationRate: "4.4",
        laborInflationRate: "3.2",
        primeRate: "5.95",
        bondYield10Year: "3.85",
        recommendedDiscountRate: "4.0",
        riskFreeRate: "3.5",
        gdpGrowthRate: "2.0",
        unemploymentRate: "5.2",
        exchangeRateUSD: "1.3450",
      },
    ];

    for (const indicator of indicators) {
      await connection.execute(
        `INSERT INTO economic_indicators 
        (indicatorDate, region, cpiInflationRate, constructionInflationRate, materialInflationRate, 
         laborInflationRate, primeRate, bondYield10Year, recommendedDiscountRate, riskFreeRate, 
         gdpGrowthRate, unemploymentRate, exchangeRateUSD)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          indicator.indicatorDate,
          indicator.region,
          indicator.cpiInflationRate,
          indicator.constructionInflationRate,
          indicator.materialInflationRate,
          indicator.laborInflationRate,
          indicator.primeRate,
          indicator.bondYield10Year,
          indicator.recommendedDiscountRate,
          indicator.riskFreeRate,
          indicator.gdpGrowthRate,
          indicator.unemploymentRate,
          indicator.exchangeRateUSD,
        ]
      );
      console.log(`✓ Added indicator for ${indicator.region} - ${indicator.indicatorDate}`);
    }

    console.log("\nSeeding portfolio targets...");

    // Sample portfolio targets
    const targets = [
      {
        targetYear: 2030,
        targetType: "fci",
        metricName: "Reduce FCI from 12% to 5% by 2030",
        targetValue: "5.0",
        currentValue: "12.0",
        baselineValue: "12.0",
        baselineYear: 2025,
        progressPercentage: "0.0",
        status: "on_track",
        description: "Strategic goal to improve overall portfolio condition by reducing the Facility Condition Index from 12% to 5% over a 5-year period through targeted capital investments and preventive maintenance.",
        strategicAlignment: "Aligns with organizational commitment to asset sustainability and risk reduction. Supports long-term operational efficiency and reduces deferred maintenance liability.",
        accountableParty: "VP of Facilities Management",
        reviewFrequency: "quarterly",
      },
      {
        targetYear: 2027,
        targetType: "deficiency_reduction",
        metricName: "Reduce critical deficiencies by 80%",
        targetValue: "20.0",
        currentValue: "100.0",
        baselineValue: "100.0",
        baselineYear: 2025,
        progressPercentage: "0.0",
        status: "on_track",
        description: "Address all critical safety and code compliance deficiencies within 2 years, reducing the count from 100 to 20 items.",
        strategicAlignment: "Critical for risk mitigation and regulatory compliance. Reduces liability exposure and ensures safe operating conditions.",
        accountableParty: "Director of Safety & Compliance",
        reviewFrequency: "monthly",
      },
      {
        targetYear: 2028,
        targetType: "budget",
        metricName: "Optimize capital budget allocation",
        targetValue: "15000000.0",
        currentValue: "12000000.0",
        baselineValue: "12000000.0",
        baselineYear: 2025,
        progressPercentage: "0.0",
        status: "on_track",
        description: "Increase annual capital budget allocation to $15M to support accelerated portfolio improvement and address deferred maintenance backlog.",
        strategicAlignment: "Supports financial planning objectives and enables proactive asset management strategy.",
        accountableParty: "CFO",
        reviewFrequency: "annual",
      },
    ];

    for (const target of targets) {
      await connection.execute(
        `INSERT INTO portfolio_targets 
        (targetYear, targetType, metricName, targetValue, currentValue, baselineValue, baselineYear, 
         progressPercentage, status, description, strategicAlignment, accountableParty, reviewFrequency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          target.targetYear,
          target.targetType,
          target.metricName,
          target.targetValue,
          target.currentValue,
          target.baselineValue,
          target.baselineYear,
          target.progressPercentage,
          target.status,
          target.description,
          target.strategicAlignment,
          target.accountableParty,
          target.reviewFrequency,
        ]
      );
      console.log(`✓ Added target: ${target.metricName}`);
    }

    console.log("\n✅ Economic data seeding complete!");
  } catch (error) {
    console.error("Error seeding economic data:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedEconomicData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
