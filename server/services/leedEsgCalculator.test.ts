import { describe, expect, it } from "vitest";
import {
  calculateEnergyIntensity,
  calculateWaterIntensity,
  calculateGHGEmissions,
  calculateEnergyScore,
  calculateWaterScore,
  calculateGHGScore,
  CANADIAN_EMISSION_FACTORS,
  LEED_ENERGY_BENCHMARKS,
  LEED_WATER_BENCHMARKS,
  type UtilityInput,
} from "./leedEsgCalculator.service";

describe("LEED ESG Calculator Service", () => {
  describe("calculateEnergyIntensity", () => {
    it("calculates energy intensity from electricity consumption", () => {
      const utilities: UtilityInput[] = [
        { type: "electricity", consumption: 100000, unit: "kWh", period: "annual" },
      ];
      
      const result = calculateEnergyIntensity(utilities, 1000);
      expect(result).toBe(100); // 100000 kWh / 1000 m² = 100 kWh/m²/year
    });

    it("converts monthly consumption to annual", () => {
      const utilities: UtilityInput[] = [
        { type: "electricity", consumption: 10000, unit: "kWh", period: "monthly" },
      ];
      
      const result = calculateEnergyIntensity(utilities, 1000);
      expect(result).toBe(120); // 10000 * 12 / 1000 = 120 kWh/m²/year
    });

    it("includes natural gas in energy calculation", () => {
      const utilities: UtilityInput[] = [
        { type: "electricity", consumption: 50000, unit: "kWh", period: "annual" },
        { type: "natural_gas", consumption: 5000, unit: "m³", period: "annual" },
      ];
      
      const result = calculateEnergyIntensity(utilities, 1000);
      // 50000 kWh + (5000 m³ * 10.55 kWh/m³) = 50000 + 52750 = 102750 kWh
      // 102750 / 1000 = 102.75 kWh/m²/year
      expect(result).toBeCloseTo(102.75, 0);
    });

    it("returns 0 for zero floor area", () => {
      const utilities: UtilityInput[] = [
        { type: "electricity", consumption: 100000, unit: "kWh", period: "annual" },
      ];
      
      const result = calculateEnergyIntensity(utilities, 0);
      expect(result).toBe(0);
    });
  });

  describe("calculateWaterIntensity", () => {
    it("calculates water intensity from water consumption", () => {
      const utilities: UtilityInput[] = [
        { type: "water", consumption: 500000, unit: "L", period: "annual" },
      ];
      
      const result = calculateWaterIntensity(utilities, 1000);
      expect(result).toBe(500); // 500000 L / 1000 m² = 500 L/m²/year
    });

    it("converts m³ to liters", () => {
      const utilities: UtilityInput[] = [
        { type: "water", consumption: 500, unit: "m³", period: "annual" },
      ];
      
      const result = calculateWaterIntensity(utilities, 1000);
      expect(result).toBe(500); // 500 m³ * 1000 L/m³ / 1000 m² = 500 L/m²/year
    });

    it("converts monthly to annual", () => {
      const utilities: UtilityInput[] = [
        { type: "water", consumption: 50, unit: "m³", period: "monthly" },
      ];
      
      const result = calculateWaterIntensity(utilities, 1000);
      expect(result).toBe(600); // 50 * 1000 * 12 / 1000 = 600 L/m²/year
    });
  });

  describe("calculateGHGEmissions", () => {
    it("calculates emissions for Alberta grid electricity", () => {
      const utilities: UtilityInput[] = [
        { type: "electricity", consumption: 10000, unit: "kWh", period: "annual" },
      ];
      
      const result = calculateGHGEmissions(utilities, "alberta");
      // 10000 kWh * 0.54 kg CO2e/kWh / 1000 = 5.4 tonnes
      expect(result).toBeCloseTo(5.4, 1);
    });

    it("calculates lower emissions for Quebec hydro grid", () => {
      const utilities: UtilityInput[] = [
        { type: "electricity", consumption: 10000, unit: "kWh", period: "annual" },
      ];
      
      const albertaEmissions = calculateGHGEmissions(utilities, "alberta");
      const quebecEmissions = calculateGHGEmissions(utilities, "quebec");
      
      expect(quebecEmissions).toBeLessThan(albertaEmissions);
      // Quebec: 10000 * 0.002 / 1000 = 0.02 tonnes
      expect(quebecEmissions).toBeCloseTo(0.02, 2);
    });

    it("calculates natural gas emissions", () => {
      const utilities: UtilityInput[] = [
        { type: "natural_gas", consumption: 1000, unit: "m³", period: "annual" },
      ];
      
      const result = calculateGHGEmissions(utilities, "alberta");
      // 1000 m³ * 1.888 kg CO2e/m³ / 1000 = 1.888 tonnes
      expect(result).toBeCloseTo(1.888, 2);
    });

    it("excludes renewable electricity from emissions", () => {
      const utilities: UtilityInput[] = [
        { type: "electricity", consumption: 10000, unit: "kWh", period: "annual", isRenewable: true },
      ];
      
      const result = calculateGHGEmissions(utilities, "alberta");
      expect(result).toBe(0);
    });

    it("calculates combined emissions from multiple sources", () => {
      const utilities: UtilityInput[] = [
        { type: "electricity", consumption: 10000, unit: "kWh", period: "annual" },
        { type: "natural_gas", consumption: 500, unit: "m³", period: "annual" },
        { type: "water", consumption: 100, unit: "m³", period: "annual" },
      ];
      
      const result = calculateGHGEmissions(utilities, "alberta");
      // Electricity: 10000 * 0.54 / 1000 = 5.4 tonnes
      // Gas: 500 * 1.888 / 1000 = 0.944 tonnes
      // Water: 100 * 0.344 / 1000 = 0.0344 tonnes
      // Total: ~6.38 tonnes
      expect(result).toBeGreaterThan(6);
      expect(result).toBeLessThan(7);
    });
  });

  describe("calculateEnergyScore", () => {
    it("returns high score for excellent energy performance", () => {
      // Office benchmark excellent: 100 kWh/m²/year
      const result = calculateEnergyScore(80, "office", 0);
      expect(result).toBeGreaterThanOrEqual(90);
    });

    it("returns moderate score for fair energy performance", () => {
      // Office benchmark fair: 200 kWh/m²/year
      const result = calculateEnergyScore(180, "office", 0);
      expect(result).toBeGreaterThanOrEqual(50);
      expect(result).toBeLessThan(70);
    });

    it("returns low score for poor energy performance", () => {
      // Office benchmark poor: 300 kWh/m²/year
      const result = calculateEnergyScore(350, "office", 0);
      expect(result).toBeLessThan(30);
    });

    it("adds bonus for renewable energy", () => {
      const withoutRenewable = calculateEnergyScore(150, "office", 0);
      const withRenewable = calculateEnergyScore(150, "office", 50);
      
      expect(withRenewable).toBeGreaterThan(withoutRenewable);
    });

    it("uses default benchmarks for unknown building types", () => {
      const result = calculateEnergyScore(100, "unknown_type", 0);
      expect(result).toBeGreaterThanOrEqual(90);
    });
  });

  describe("calculateWaterScore", () => {
    it("returns high score for excellent water efficiency", () => {
      // Office benchmark excellent: 400 L/m²/year
      const result = calculateWaterScore(300, "office");
      expect(result).toBeGreaterThanOrEqual(90);
    });

    it("returns moderate score for fair water efficiency", () => {
      // Office benchmark fair: 900 L/m²/year
      const result = calculateWaterScore(800, "office");
      expect(result).toBeGreaterThanOrEqual(50);
      expect(result).toBeLessThan(70);
    });

    it("returns low score for poor water efficiency", () => {
      // Office benchmark poor: 1200 L/m²/year
      const result = calculateWaterScore(1500, "office");
      expect(result).toBeLessThan(30);
    });
  });

  describe("calculateGHGScore", () => {
    it("returns high score for low GHG intensity", () => {
      // Excellent benchmark: 20 kg CO2e/m²/year
      const result = calculateGHGScore(15);
      expect(result).toBeGreaterThanOrEqual(90);
    });

    it("returns moderate score for fair GHG intensity", () => {
      // Fair benchmark: 70 kg CO2e/m²/year
      const result = calculateGHGScore(60);
      expect(result).toBeGreaterThanOrEqual(50);
      expect(result).toBeLessThan(70);
    });

    it("returns low score for high GHG intensity", () => {
      // Poor benchmark: 120 kg CO2e/m²/year
      const result = calculateGHGScore(150);
      expect(result).toBeLessThan(30);
    });
  });

  describe("CANADIAN_EMISSION_FACTORS", () => {
    it("has emission factors for all Canadian provinces", () => {
      expect(CANADIAN_EMISSION_FACTORS.electricity.alberta).toBeDefined();
      expect(CANADIAN_EMISSION_FACTORS.electricity.ontario).toBeDefined();
      expect(CANADIAN_EMISSION_FACTORS.electricity.quebec).toBeDefined();
      expect(CANADIAN_EMISSION_FACTORS.electricity.bc).toBeDefined();
    });

    it("Alberta has highest grid emissions (coal/gas)", () => {
      expect(CANADIAN_EMISSION_FACTORS.electricity.alberta).toBeGreaterThan(
        CANADIAN_EMISSION_FACTORS.electricity.ontario
      );
      expect(CANADIAN_EMISSION_FACTORS.electricity.alberta).toBeGreaterThan(
        CANADIAN_EMISSION_FACTORS.electricity.quebec
      );
    });

    it("Quebec has lowest grid emissions (hydro)", () => {
      expect(CANADIAN_EMISSION_FACTORS.electricity.quebec).toBeLessThan(
        CANADIAN_EMISSION_FACTORS.electricity.alberta
      );
      expect(CANADIAN_EMISSION_FACTORS.electricity.quebec).toBeLessThan(
        CANADIAN_EMISSION_FACTORS.electricity.ontario
      );
    });

    it("has natural gas emission factor", () => {
      expect(CANADIAN_EMISSION_FACTORS.natural_gas).toBeCloseTo(1.888, 2);
    });
  });

  describe("LEED_ENERGY_BENCHMARKS", () => {
    it("has benchmarks for common building types", () => {
      expect(LEED_ENERGY_BENCHMARKS.office).toBeDefined();
      expect(LEED_ENERGY_BENCHMARKS.retail).toBeDefined();
      expect(LEED_ENERGY_BENCHMARKS.education).toBeDefined();
      expect(LEED_ENERGY_BENCHMARKS.healthcare).toBeDefined();
    });

    it("has default benchmarks", () => {
      expect(LEED_ENERGY_BENCHMARKS.default).toBeDefined();
      expect(LEED_ENERGY_BENCHMARKS.default.excellent).toBeLessThan(
        LEED_ENERGY_BENCHMARKS.default.poor
      );
    });
  });

  describe("LEED_WATER_BENCHMARKS", () => {
    it("has benchmarks for common building types", () => {
      expect(LEED_WATER_BENCHMARKS.office).toBeDefined();
      expect(LEED_WATER_BENCHMARKS.retail).toBeDefined();
      expect(LEED_WATER_BENCHMARKS.education).toBeDefined();
      expect(LEED_WATER_BENCHMARKS.healthcare).toBeDefined();
    });

    it("healthcare has higher water benchmarks than office", () => {
      expect(LEED_WATER_BENCHMARKS.healthcare.excellent).toBeGreaterThan(
        LEED_WATER_BENCHMARKS.office.excellent
      );
    });
  });
});
