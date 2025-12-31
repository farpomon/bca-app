import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getLocations,
  getCatalogs,
  getDivisions,
  searchCostLines,
  getCostFactors,
  calculateLocalizedCost,
  isUsingMockData,
  getAPIStatus,
  getCostLine,
} from "./rsmeans";

describe("RSMeans Service", () => {
  describe("getAPIStatus", () => {
    it("returns status object with required fields", () => {
      const status = getAPIStatus();
      expect(status).toHaveProperty("configured");
      expect(status).toHaveProperty("baseUrl");
      expect(status).toHaveProperty("usingMock");
    });

    it("indicates mock data is being used when no API key", () => {
      const status = getAPIStatus();
      // Without API key, should use mock data
      expect(status.usingMock).toBe(true);
    });
  });

  describe("isUsingMockData", () => {
    it("returns true when no API key is configured", () => {
      expect(isUsingMockData()).toBe(true);
    });
  });

  describe("getCatalogs", () => {
    it("returns list of available catalogs", async () => {
      const catalogs = await getCatalogs();
      expect(Array.isArray(catalogs)).toBe(true);
      expect(catalogs.length).toBeGreaterThan(0);
    });

    it("catalogs have required properties", async () => {
      const catalogs = await getCatalogs();
      expect(catalogs[0]).toHaveProperty("id");
      expect(catalogs[0]).toHaveProperty("catalogName");
    });

    it("includes standard imperial catalog", async () => {
      const catalogs = await getCatalogs();
      const stdCatalog = catalogs.find((c) => c.id === "unit-2024-std-imp");
      expect(stdCatalog).toBeDefined();
      expect(stdCatalog?.catalogName).toContain("Unit Cost");
    });
  });

  describe("getLocations", () => {
    it("returns list of locations", async () => {
      const locations = await getLocations();
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBeGreaterThan(0);
    });

    it("locations have required properties", async () => {
      const locations = await getLocations();
      expect(locations[0]).toHaveProperty("id");
      expect(locations[0]).toHaveProperty("city");
      expect(locations[0]).toHaveProperty("stateCode");
      expect(locations[0]).toHaveProperty("countryCode");
    });

    it("includes Canadian locations", async () => {
      const locations = await getLocations();
      const canadianLocations = locations.filter((l) => l.countryCode === "CA");
      expect(canadianLocations.length).toBeGreaterThan(0);
      expect(canadianLocations.some((l) => l.city === "Toronto")).toBe(true);
    });

    it("includes US locations", async () => {
      const locations = await getLocations();
      const usLocations = locations.filter((l) => l.countryCode === "US");
      expect(usLocations.length).toBeGreaterThan(0);
      expect(usLocations.some((l) => l.city === "New York")).toBe(true);
    });

    it("filters locations by search term", async () => {
      const locations = await getLocations("Toronto");
      expect(locations.length).toBeGreaterThan(0);
      expect(locations.every((l) => l.city.includes("Toronto"))).toBe(true);
    });
  });

  describe("getDivisions", () => {
    it("returns list of CSI MasterFormat divisions", async () => {
      const divisions = await getDivisions("unit-2024-std-imp");
      expect(Array.isArray(divisions)).toBe(true);
      expect(divisions.length).toBeGreaterThan(0);
    });

    it("divisions have required properties", async () => {
      const divisions = await getDivisions("unit-2024-std-imp");
      expect(divisions[0]).toHaveProperty("id");
      expect(divisions[0]).toHaveProperty("code");
      expect(divisions[0]).toHaveProperty("description");
    });

    it("includes standard divisions like Concrete and Electrical", async () => {
      const divisions = await getDivisions("unit-2024-std-imp");
      const concreteDivision = divisions.find((d) => d.code === "03");
      const electricalDivision = divisions.find((d) => d.code === "26");

      expect(concreteDivision).toBeDefined();
      expect(concreteDivision?.description).toContain("Concrete");

      expect(electricalDivision).toBeDefined();
      expect(electricalDivision?.description).toContain("Electrical");
    });

    it("includes cost line counts for each division", async () => {
      const divisions = await getDivisions("unit-2024-std-imp");
      expect(divisions[0]).toHaveProperty("costLineCount");
      expect(typeof divisions[0].costLineCount).toBe("number");
    });
  });

  describe("searchCostLines", () => {
    it("returns cost lines matching search term", async () => {
      const result = await searchCostLines({
        catalogId: "unit-2024-std-imp",
        searchTerm: "concrete",
      });

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("recordCount");
      expect(Array.isArray(result.items)).toBe(true);
    });

    it("returns cost line with required properties", async () => {
      const result = await searchCostLines({
        catalogId: "unit-2024-std-imp",
        searchTerm: "concrete",
      });

      if (result.items.length > 0) {
        const costLine = result.items[0];
        expect(costLine).toHaveProperty("id");
        expect(costLine).toHaveProperty("lineNumber");
        expect(costLine).toHaveProperty("description");
        expect(costLine).toHaveProperty("unit");
        expect(costLine).toHaveProperty("materialCost");
        expect(costLine).toHaveProperty("laborCost");
        expect(costLine).toHaveProperty("totalCost");
      }
    });

    it("filters by division code", async () => {
      const result = await searchCostLines({
        catalogId: "unit-2024-std-imp",
        divisionCode: "03",
      });

      expect(result.items.length).toBeGreaterThan(0);
      // All items should be from division 03 (Concrete)
      expect(
        result.items.every((item) => item.lineNumber.startsWith("03"))
      ).toBe(true);
    });

    it("respects limit parameter", async () => {
      const result = await searchCostLines({
        catalogId: "unit-2024-std-imp",
        limit: 5,
      });

      expect(result.items.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getCostFactors", () => {
    it("returns cost factors for a location", async () => {
      const factors = await getCostFactors("M4B");
      expect(factors).not.toBeNull();
      expect(factors).toHaveProperty("materialFactor");
      expect(factors).toHaveProperty("laborFactor");
      expect(factors).toHaveProperty("equipmentFactor");
      expect(factors).toHaveProperty("totalFactor");
    });

    it("returns location info with factors", async () => {
      const factors = await getCostFactors("M4B");
      expect(factors).not.toBeNull();
      expect(factors).toHaveProperty("city");
      expect(factors).toHaveProperty("stateCode");
    });

    it("returns different factors for different locations", async () => {
      const torontoFactors = await getCostFactors("M4B");
      const nyFactors = await getCostFactors("10001");

      expect(torontoFactors).not.toBeNull();
      expect(nyFactors).not.toBeNull();

      // Toronto and New York should have different cost factors
      if (torontoFactors && nyFactors) {
        expect(torontoFactors.totalFactor).not.toBe(nyFactors.totalFactor);
      }
    });
  });

  describe("calculateLocalizedCost", () => {
    it("calculates cost with location factors applied", () => {
      const baseCost = {
        materialCost: 100,
        laborCost: 50,
        equipmentCost: 25,
      };
      const factors = {
        materialFactor: 1.1,
        laborFactor: 1.2,
        equipmentFactor: 1.05,
      };

      const result = calculateLocalizedCost(baseCost, factors, 1);

      expect(result).toHaveProperty("materialCost");
      expect(result).toHaveProperty("laborCost");
      expect(result).toHaveProperty("equipmentCost");
      expect(result).toHaveProperty("totalCost");
      expect(result).toHaveProperty("unitCost");
    });

    it("applies material factor correctly", () => {
      const baseCost = {
        materialCost: 100,
        laborCost: 0,
        equipmentCost: 0,
      };
      const factors = {
        materialFactor: 1.5,
        laborFactor: 1.0,
        equipmentFactor: 1.0,
      };

      const result = calculateLocalizedCost(baseCost, factors, 1);
      expect(result.materialCost).toBe(150);
    });

    it("applies labor factor correctly", () => {
      const baseCost = {
        materialCost: 0,
        laborCost: 100,
        equipmentCost: 0,
      };
      const factors = {
        materialFactor: 1.0,
        laborFactor: 1.25,
        equipmentFactor: 1.0,
      };

      const result = calculateLocalizedCost(baseCost, factors, 1);
      expect(result.laborCost).toBe(125);
    });

    it("scales cost by quantity", () => {
      const baseCost = {
        materialCost: 100,
        laborCost: 50,
        equipmentCost: 25,
      };
      const factors = {
        materialFactor: 1.0,
        laborFactor: 1.0,
        equipmentFactor: 1.0,
      };

      const result1 = calculateLocalizedCost(baseCost, factors, 1);
      const result10 = calculateLocalizedCost(baseCost, factors, 10);

      expect(result10.totalCost).toBe(result1.totalCost * 10);
    });

    it("unit cost remains constant regardless of quantity", () => {
      const baseCost = {
        materialCost: 100,
        laborCost: 50,
        equipmentCost: 25,
      };
      const factors = {
        materialFactor: 1.0,
        laborFactor: 1.0,
        equipmentFactor: 1.0,
      };

      const result1 = calculateLocalizedCost(baseCost, factors, 1);
      const result100 = calculateLocalizedCost(baseCost, factors, 100);

      expect(result1.unitCost).toBe(result100.unitCost);
    });
  });

  describe("getCostLine", () => {
    it("returns a specific cost line by ID", async () => {
      // First search for a cost line to get a valid ID
      const searchResult = await searchCostLines({
        catalogId: "unit-2024-std-imp",
        searchTerm: "concrete",
        limit: 1,
      });

      if (searchResult.items.length > 0) {
        const costLineId = searchResult.items[0].id;
        const costLine = await getCostLine("unit-2024-std-imp", costLineId);

        expect(costLine).not.toBeNull();
        expect(costLine?.id).toBe(costLineId);
      }
    });

    it("returns null for non-existent cost line", async () => {
      const costLine = await getCostLine("unit-2024-std-imp", "non-existent-id");
      expect(costLine).toBeNull();
    });
  });
});

describe("Cost Factor Validation", () => {
  it("all locations have reasonable cost factors (between 0.5 and 2.0)", async () => {
    const locations = await getLocations();
    
    for (const location of locations) {
      const factors = await getCostFactors(location.id);
      if (factors) {
        expect(factors.materialFactor).toBeGreaterThan(0.5);
        expect(factors.materialFactor).toBeLessThan(2.0);
        expect(factors.laborFactor).toBeGreaterThan(0.5);
        expect(factors.laborFactor).toBeLessThan(2.0);
        expect(factors.equipmentFactor).toBeGreaterThan(0.5);
        expect(factors.equipmentFactor).toBeLessThan(2.0);
      }
    }
  });
});

describe("Cost Line Validation", () => {
  it("cost line totals are calculated correctly", async () => {
    const result = await searchCostLines({
      catalogId: "unit-2024-std-imp",
      limit: 10,
    });

    for (const costLine of result.items) {
      const expectedTotal =
        costLine.materialCost + costLine.laborCost + costLine.equipmentCost;
      expect(costLine.totalCost).toBeCloseTo(expectedTotal, 2);
    }
  });
});
