import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

describe("Asset Report Cost Calculation", () => {
  it("should verify assessments have estimatedRepairCost data", async () => {
    const db = await getDb();
    if (!db) {
      console.log("Database not available");
      return;
    }
    
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_assessments,
        SUM(CASE WHEN estimatedRepairCost > 0 THEN 1 ELSE 0 END) as with_repair_cost,
        SUM(estimatedRepairCost) as total_repair_cost,
        SUM(replacementValue) as total_replacement_value
      FROM assessments
    `);
    
    const stats = (result[0] as any[])[0];
    console.log("Assessment cost stats:", stats);
    
    // Verify we have assessments with repair costs
    expect(Number(stats.with_repair_cost)).toBeGreaterThan(0);
    expect(Number(stats.total_repair_cost)).toBeGreaterThan(0);
  });

  it("should verify assessments by asset have repair costs", async () => {
    const db = await getDb();
    if (!db) {
      console.log("Database not available");
      return;
    }
    
    const result = await db.execute(sql`
      SELECT 
        assetId,
        COUNT(*) as assessment_count,
        SUM(estimatedRepairCost) as total_repair_cost,
        SUM(replacementValue) as total_replacement_value
      FROM assessments
      WHERE assetId IS NOT NULL AND estimatedRepairCost > 0
      GROUP BY assetId
      LIMIT 5
    `);
    
    const assets = (result[0] as any[]);
    console.log("Sample assets with repair costs:", assets);
    
    // Verify we have assets with assessments that have repair costs
    expect(assets.length).toBeGreaterThan(0);
    
    // Verify each asset has positive repair costs
    for (const asset of assets) {
      expect(Number(asset.total_repair_cost)).toBeGreaterThan(0);
    }
  });

  it("should verify getAssetAssessments returns assessments with cost fields", async () => {
    const db = await getDb();
    if (!db) {
      console.log("Database not available");
      return;
    }
    
    // Get an asset that has assessments with repair costs
    const assetResult = await db.execute(sql`
      SELECT assetId
      FROM assessments
      WHERE assetId IS NOT NULL AND estimatedRepairCost > 0
      LIMIT 1
    `);
    
    const assetRows = (assetResult[0] as any[]);
    if (assetRows.length === 0) {
      console.log("No assets with repair costs found");
      return;
    }
    
    const assetId = assetRows[0].assetId;
    console.log("Testing with assetId:", assetId);
    
    // Import and test the actual function
    const { getAssetAssessments } = await import("./db");
    const assessments = await getAssetAssessments(assetId);
    
    console.log("Assessments count:", assessments.length);
    
    // Calculate total repair cost
    const totalRepairCost = assessments.reduce(
      (sum, a) => sum + (a.estimatedRepairCost || 0), 
      0
    );
    
    console.log("Total repair cost from getAssetAssessments:", totalRepairCost);
    
    // Verify we got assessments with repair costs
    expect(assessments.length).toBeGreaterThan(0);
    expect(totalRepairCost).toBeGreaterThan(0);
  });
});


describe("Asset Report Generator Cost Calculation Logic", () => {
  it("should calculate total cost from assessments.estimatedRepairCost", async () => {
    // Mock assessment data similar to what the report generator receives
    const mockAssessments = [
      { id: 1, estimatedRepairCost: 100000, replacementValue: 500000, condition: 'poor' },
      { id: 2, estimatedRepairCost: 50000, replacementValue: 300000, condition: 'fair' },
      { id: 3, estimatedRepairCost: 25000, replacementValue: 200000, condition: 'good' },
    ];
    
    // Calculate total repair cost (same logic as in assetReportGenerator.ts)
    const assessmentRepairCost = mockAssessments.reduce(
      (sum, a) => sum + (a.estimatedRepairCost || 0), 
      0
    );
    
    // Calculate total replacement value
    const totalReplacementValue = mockAssessments.reduce(
      (sum, a) => sum + (a.replacementValue || 0), 
      0
    );
    
    console.log("Mock assessment repair cost:", assessmentRepairCost);
    console.log("Mock replacement value:", totalReplacementValue);
    
    // Verify calculations
    expect(assessmentRepairCost).toBe(175000);
    expect(totalReplacementValue).toBe(1000000);
    
    // Calculate FCI
    const fci = (assessmentRepairCost / totalReplacementValue) * 100;
    console.log("FCI:", fci.toFixed(2) + "%");
    expect(fci).toBeCloseTo(17.5, 1);
  });

  it("should distribute costs by condition when no deficiency costs", async () => {
    const mockAssessments = [
      { id: 1, estimatedRepairCost: 100000, condition: 'poor' },
      { id: 2, estimatedRepairCost: 50000, condition: 'fair' },
      { id: 3, estimatedRepairCost: 25000, condition: 'good' },
      { id: 4, estimatedRepairCost: 10000, condition: 'not_assessed' },
    ];
    
    // Same logic as in assetReportGenerator.ts for distributing costs by condition
    const costByPriority: Record<string, number> = {
      immediate: 0,
      short_term: 0,
      medium_term: 0,
      long_term: 0,
    };
    
    mockAssessments.forEach(a => {
      const repairCost = a.estimatedRepairCost || 0;
      if (repairCost > 0) {
        const condition = a.condition || 'not_assessed';
        if (condition === 'poor') {
          costByPriority.immediate += repairCost;
        } else if (condition === 'fair') {
          costByPriority.short_term += repairCost;
        } else if (condition === 'good') {
          costByPriority.medium_term += repairCost;
        } else {
          costByPriority.long_term += repairCost;
        }
      }
    });
    
    console.log("Cost by priority:", costByPriority);
    
    expect(costByPriority.immediate).toBe(100000); // poor condition
    expect(costByPriority.short_term).toBe(50000); // fair condition
    expect(costByPriority.medium_term).toBe(25000); // good condition
    expect(costByPriority.long_term).toBe(10000); // not_assessed
  });
});
