import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Tests for LEED v5 ESG Features
 * - Grid Carbon Intensity
 * - Embodied Carbon Materials
 * - LEED Credits
 * - Building Performance Factors
 * - Refrigerant Inventory
 * - Operational Carbon Tracking
 */

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("LEED v5 ESG Features", () => {
  const ctx = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  describe("Grid Carbon Intensity", () => {
    it("should fetch all Canadian provinces grid carbon intensity", async () => {
      const result = await caller.esgLeed.getGridCarbonIntensity({});
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Should have data for Canadian provinces
      if (result.length > 0) {
        const firstRecord = result[0] as any;
        expect(firstRecord).toHaveProperty("region");
        expect(firstRecord).toHaveProperty("avgEmissionFactor");
        expect(firstRecord).toHaveProperty("country");
      }
    });

    it("should fetch grid carbon intensity for specific province", async () => {
      const result = await caller.esgLeed.getGridCarbonIntensity({
        region: "Alberta",
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const albertaData = result[0] as any;
        expect(albertaData.region).toBe("Alberta");
        // Alberta has high emission factor due to coal/gas
        expect(parseFloat(albertaData.avgEmissionFactor)).toBeGreaterThan(400);
      }
    });

    it("should return low emission factor for Quebec (hydro-dominant)", async () => {
      const result = await caller.esgLeed.getGridCarbonIntensity({
        region: "Quebec",
      });
      
      if (result.length > 0) {
        const quebecData = result[0] as any;
        expect(quebecData.region).toBe("Quebec");
        // Quebec has very low emission factor due to hydro
        expect(parseFloat(quebecData.avgEmissionFactor)).toBeLessThan(10);
      }
    });
  });

  describe("Embodied Carbon Materials", () => {
    it("should fetch all embodied carbon materials", async () => {
      const result = await caller.esgLeed.getEmbodiedCarbonMaterials({});
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const firstMaterial = result[0] as any;
        expect(firstMaterial).toHaveProperty("materialCategory");
        expect(firstMaterial).toHaveProperty("materialName");
        expect(firstMaterial).toHaveProperty("gwpPerUnit");
        expect(firstMaterial).toHaveProperty("unit");
      }
    });

    it("should fetch materials by category", async () => {
      const result = await caller.esgLeed.getEmbodiedCarbonMaterials({
        category: "Concrete",
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // All results should be in Concrete category
      for (const material of result as any[]) {
        expect(material.materialCategory).toBe("Concrete");
      }
    });

    it("should have steel materials with correct GWP range", async () => {
      const result = await caller.esgLeed.getEmbodiedCarbonMaterials({
        category: "Steel",
      });
      
      if (result.length > 0) {
        for (const material of result as any[]) {
          // Steel typically has GWP between 1-3 kg CO2e/kg
          const gwp = parseFloat(material.gwpPerUnit);
          expect(gwp).toBeGreaterThan(0.5);
          expect(gwp).toBeLessThan(5);
        }
      }
    });
  });

  describe("LEED Credits", () => {
    it("should fetch all LEED v5 credits", async () => {
      const result = await caller.esgLeed.getLeedCredits({});
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const firstCredit = result[0] as any;
        expect(firstCredit).toHaveProperty("creditCode");
        expect(firstCredit).toHaveProperty("creditName");
        expect(firstCredit).toHaveProperty("category");
        expect(firstCredit).toHaveProperty("creditType");
        expect(firstCredit).toHaveProperty("maxPoints");
      }
    });

    it("should fetch Energy & Atmosphere credits", async () => {
      const result = await caller.esgLeed.getLeedCredits({
        category: "EA",
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // All results should be EA category
      for (const credit of result as any[]) {
        expect(credit.category).toBe("EA");
      }
    });

    it("should fetch only prerequisites", async () => {
      const result = await caller.esgLeed.getLeedCredits({
        creditType: "prerequisite",
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // All results should be prerequisites with 0 points
      for (const credit of result as any[]) {
        expect(credit.creditType).toBe("prerequisite");
        expect(parseInt(credit.maxPoints)).toBe(0);
      }
    });

    it("should have MR credits for embodied carbon", async () => {
      const result = await caller.esgLeed.getLeedCredits({
        category: "MR",
      });
      
      // Should include embodied carbon credit
      const embodiedCarbonCredit = (result as any[]).find(
        c => c.creditCode === "MRc2" || c.creditName.toLowerCase().includes("embodied carbon")
      );
      
      if (result.length > 0) {
        expect(embodiedCarbonCredit).toBeDefined();
      }
    });
  });

  describe("Building Performance Factors", () => {
    it("should fetch all building performance factors", async () => {
      const result = await caller.esgLeed.getBuildingPerformanceFactors({});
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const firstBpf = result[0] as any;
        expect(firstBpf).toHaveProperty("buildingType");
        expect(firstBpf).toHaveProperty("climateZone");
        expect(firstBpf).toHaveProperty("bpf");
        expect(firstBpf).toHaveProperty("ashraeStandard");
      }
    });

    it("should fetch BPF for specific building type", async () => {
      const result = await caller.esgLeed.getBuildingPerformanceFactors({
        buildingType: "Office (Large)",
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // All results should be for Office building type
      for (const bpf of result as any[]) {
        expect(bpf.buildingType).toBe("Office (Large)");
      }
    });

    it("should have higher BPF for colder climate zones", async () => {
      const result = await caller.esgLeed.getBuildingPerformanceFactors({
        buildingType: "Office (Large)",
      });
      
      if (result.length > 2) {
        const bpfData = result as any[];
        const zone1A = bpfData.find(b => b.climateZone === "1A");
        const zone7 = bpfData.find(b => b.climateZone === "7");
        
        if (zone1A && zone7) {
          // Colder zones should have higher BPF
          expect(parseFloat(zone7.bpf)).toBeGreaterThan(parseFloat(zone1A.bpf));
        }
      }
    });
  });

  describe("Refrigerant Inventory", () => {
    it("should record refrigerant equipment and calculate GWP", async () => {
      const result = await caller.esgLeed.recordRefrigerantEquipment({
        projectId: 1,
        equipmentName: "Test Chiller",
        equipmentType: "chiller",
        refrigerantType: "R-410A",
        refrigerantGwp: 2088,
        chargeAmount: 50, // kg
        leakDetectionSystem: true,
      });
      
      expect(result.success).toBe(true);
      expect(result.totalGwpCharge).toBeDefined();
      // 50 kg * 2088 GWP / 1000 = 104.4 tCO2e
      expect(result.totalGwpCharge).toBeCloseTo(104.4, 1);
      expect(result.meetsLeedBenchmark).toBe(false); // R-410A exceeds LEED benchmark
    });

    it("should identify low-GWP refrigerants meeting LEED benchmark", async () => {
      const result = await caller.esgLeed.recordRefrigerantEquipment({
        projectId: 1,
        equipmentName: "Low-GWP Heat Pump",
        equipmentType: "heat_pump",
        refrigerantType: "R-32",
        refrigerantGwp: 675,
        chargeAmount: 10,
        leakDetectionSystem: true,
      });
      
      expect(result.success).toBe(true);
      expect(result.meetsLeedBenchmark).toBe(true); // R-32 is below 1400 benchmark for heat pumps
    });

    it("should fetch refrigerant inventory for a project", async () => {
      const result = await caller.esgLeed.getRefrigerantInventory({
        projectId: 1,
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("inventory");
      expect(result).toHaveProperty("summary");
      expect(result.summary).toHaveProperty("totalEquipment");
      expect(result.summary).toHaveProperty("totalGwpCharge");
      expect(result.summary).toHaveProperty("complianceRate");
    });
  });

  describe("Operational Carbon Tracking", () => {
    it("should record operational carbon with scope calculations", async () => {
      const result = await caller.esgLeed.recordOperationalCarbon({
        projectId: 1,
        recordDate: new Date(),
        recordPeriod: "monthly",
        province: "Alberta",
        scope1NaturalGas: 5.5, // tCO2e
        electricityKwh: 100000, // kWh
      });
      
      expect(result.success).toBe(true);
      expect(result.emissions).toBeDefined();
      expect(result.emissions.scope1Total).toBeGreaterThan(0);
      expect(result.emissions.scope2Total).toBeGreaterThan(0);
      expect(result.emissions.totalEmissions).toBeGreaterThan(0);
      expect(result.gridEmissionFactor).toBeDefined();
    });

    it("should use correct grid emission factor for province", async () => {
      const albertaResult = await caller.esgLeed.recordOperationalCarbon({
        projectId: 1,
        recordDate: new Date(),
        recordPeriod: "monthly",
        province: "Alberta",
        electricityKwh: 100000,
      });
      
      const quebecResult = await caller.esgLeed.recordOperationalCarbon({
        projectId: 1,
        recordDate: new Date(),
        recordPeriod: "monthly",
        province: "Quebec",
        electricityKwh: 100000,
      });
      
      // Alberta should have much higher emissions than Quebec for same electricity
      expect(albertaResult.emissions.scope2Total).toBeGreaterThan(quebecResult.emissions.scope2Total * 10);
    });

    it("should fetch operational carbon history", async () => {
      const result = await caller.esgLeed.getOperationalCarbonHistory({
        projectId: 1,
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("records");
      expect(result).toHaveProperty("summary");
      expect(result.summary).toHaveProperty("totalScope1");
      expect(result.summary).toHaveProperty("totalScope2");
      expect(result.summary).toHaveProperty("totalScope3");
      expect(result.summary).toHaveProperty("totalEmissions");
    });
  });

  describe("Embodied Carbon Assessment", () => {
    it("should record embodied carbon assessment with LEED points calculation", async () => {
      const result = await caller.esgLeed.recordEmbodiedCarbonAssessment({
        projectId: 1,
        assessmentDate: new Date(),
        assessmentType: "design",
        gwpTotal: 500000, // kg CO2e
        gwpPerSqm: 350,
        baselineGwp: 700000, // 28.6% reduction
        lcaSoftware: "One Click LCA",
        lcaMethodology: "EN 15978",
      });
      
      expect(result.success).toBe(true);
      expect(result.reductionPercent).toBeDefined();
      expect(result.reductionPercent).toBeCloseTo(28.6, 0);
      expect(result.leedPointsEarned).toBe(4); // 20-30% reduction = 4 points
    });

    it("should award maximum LEED points for 40%+ reduction", async () => {
      const result = await caller.esgLeed.recordEmbodiedCarbonAssessment({
        projectId: 1,
        assessmentDate: new Date(),
        assessmentType: "design",
        gwpTotal: 400000,
        baselineGwp: 700000, // 42.9% reduction
      });
      
      expect(result.leedPointsEarned).toBe(6); // 40%+ reduction = 6 points (max)
    });

    it("should fetch project embodied carbon assessments", async () => {
      const result = await caller.esgLeed.getProjectEmbodiedCarbon({
        projectId: 1,
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
