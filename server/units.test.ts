import { describe, expect, it } from "vitest";

// Import from shared units module
import {
  convertArea,
  convertLength,
  convertTemperature,
  convertVolume,
  convertWeight,
  convertCostPerArea,
  formatArea,
  formatLength,
  formatTemperature,
  formatVolume,
  formatWeight,
  formatCostPerArea,
  getAreaUnit,
  getLengthUnit,
  getTemperatureUnit,
  getVolumeUnit,
  getWeightUnit,
  getCostPerAreaUnit,
  getUnitSystemLabel,
} from "../shared/units";

describe("Unit Conversion Utilities", () => {
  describe("Area Conversions", () => {
    it("should convert sq ft to sq m correctly", () => {
      // 1 sq ft = 0.092903 sq m
      const sqft = 1000;
      const sqm = convertArea(sqft, "imperial", "metric");
      expect(sqm).toBeCloseTo(92.903, 1);
    });

    it("should convert sq m to sq ft correctly", () => {
      // 1 sq m = 10.7639 sq ft
      const sqm = 100;
      const sqft = convertArea(sqm, "metric", "imperial");
      expect(sqft).toBeCloseTo(1076.39, 1);
    });

    it("should return same value when units match", () => {
      expect(convertArea(100, "metric", "metric")).toBe(100);
      expect(convertArea(100, "imperial", "imperial")).toBe(100);
    });

    it("should format area correctly", () => {
      expect(formatArea(1000, "imperial")).toContain("sq ft");
      expect(formatArea(100, "metric")).toContain("m²");
      expect(formatArea(null, "metric")).toBe("-");
      expect(formatArea(undefined, "imperial")).toBe("-");
    });

    it("should return correct area unit", () => {
      expect(getAreaUnit("metric")).toBe("m²");
      expect(getAreaUnit("imperial")).toBe("sq ft");
    });
  });

  describe("Length Conversions", () => {
    it("should convert ft to m correctly", () => {
      // 1 ft = 0.3048 m
      const ft = 100;
      const m = convertLength(ft, "imperial", "metric");
      expect(m).toBeCloseTo(30.48, 2);
    });

    it("should convert m to ft correctly", () => {
      // 1 m = 3.28084 ft
      const m = 10;
      const ft = convertLength(m, "metric", "imperial");
      expect(ft).toBeCloseTo(32.8084, 2);
    });

    it("should format length correctly", () => {
      expect(formatLength(100, "imperial")).toContain("ft");
      expect(formatLength(10, "metric")).toContain("m");
      expect(formatLength(null, "metric")).toBe("-");
    });

    it("should return correct length unit", () => {
      expect(getLengthUnit("metric")).toBe("m");
      expect(getLengthUnit("imperial")).toBe("ft");
    });
  });

  describe("Temperature Conversions", () => {
    it("should convert °F to °C correctly", () => {
      // 32°F = 0°C
      expect(convertTemperature(32, "imperial", "metric")).toBeCloseTo(0, 1);
      // 212°F = 100°C
      expect(convertTemperature(212, "imperial", "metric")).toBeCloseTo(100, 1);
      // 68°F = 20°C
      expect(convertTemperature(68, "imperial", "metric")).toBeCloseTo(20, 1);
    });

    it("should convert °C to °F correctly", () => {
      // 0°C = 32°F
      expect(convertTemperature(0, "metric", "imperial")).toBeCloseTo(32, 1);
      // 100°C = 212°F
      expect(convertTemperature(100, "metric", "imperial")).toBeCloseTo(212, 1);
      // 20°C = 68°F
      expect(convertTemperature(20, "metric", "imperial")).toBeCloseTo(68, 1);
    });

    it("should format temperature correctly", () => {
      expect(formatTemperature(68, "imperial")).toContain("°F");
      expect(formatTemperature(20, "metric")).toContain("°C");
      expect(formatTemperature(null, "metric")).toBe("-");
    });

    it("should return correct temperature unit", () => {
      expect(getTemperatureUnit("metric")).toBe("°C");
      expect(getTemperatureUnit("imperial")).toBe("°F");
    });
  });

  describe("Volume Conversions", () => {
    it("should convert cu ft to cu m correctly", () => {
      // 1 cu ft = 0.0283168 cu m
      const cuft = 100;
      const cum = convertVolume(cuft, "imperial", "metric");
      expect(cum).toBeCloseTo(2.83168, 2);
    });

    it("should convert cu m to cu ft correctly", () => {
      // 1 cu m = 35.3147 cu ft
      const cum = 1;
      const cuft = convertVolume(cum, "metric", "imperial");
      expect(cuft).toBeCloseTo(35.3147, 2);
    });

    it("should format volume correctly", () => {
      expect(formatVolume(100, "imperial")).toContain("cu ft");
      expect(formatVolume(10, "metric")).toContain("m³");
      expect(formatVolume(null, "metric")).toBe("-");
    });

    it("should return correct volume unit", () => {
      expect(getVolumeUnit("metric")).toBe("m³");
      expect(getVolumeUnit("imperial")).toBe("cu ft");
    });
  });

  describe("Weight Conversions", () => {
    it("should convert lb to kg correctly", () => {
      // 1 lb = 0.453592 kg
      const lb = 100;
      const kg = convertWeight(lb, "imperial", "metric");
      expect(kg).toBeCloseTo(45.3592, 2);
    });

    it("should convert kg to lb correctly", () => {
      // 1 kg = 2.20462 lb
      const kg = 100;
      const lb = convertWeight(kg, "metric", "imperial");
      expect(lb).toBeCloseTo(220.462, 2);
    });

    it("should format weight correctly", () => {
      expect(formatWeight(100, "imperial")).toContain("lb");
      expect(formatWeight(100, "metric")).toContain("kg");
      expect(formatWeight(null, "metric")).toBe("-");
    });

    it("should return correct weight unit", () => {
      expect(getWeightUnit("metric")).toBe("kg");
      expect(getWeightUnit("imperial")).toBe("lb");
    });
  });

  describe("Cost Per Area Conversions", () => {
    it("should convert $/sq ft to $/sq m correctly", () => {
      // $10/sq ft = $107.639/sq m
      const perSqFt = 10;
      const perSqM = convertCostPerArea(perSqFt, "imperial", "metric");
      expect(perSqM).toBeCloseTo(107.639, 1);
    });

    it("should convert $/sq m to $/sq ft correctly", () => {
      // $100/sq m = $9.2903/sq ft
      const perSqM = 100;
      const perSqFt = convertCostPerArea(perSqM, "metric", "imperial");
      expect(perSqFt).toBeCloseTo(9.2903, 2);
    });

    it("should format cost per area correctly", () => {
      expect(formatCostPerArea(25.50, "imperial")).toContain("/sq ft");
      expect(formatCostPerArea(25.50, "metric")).toContain("/m²");
      expect(formatCostPerArea(null, "metric")).toBe("-");
    });

    it("should return correct cost per area unit", () => {
      expect(getCostPerAreaUnit("metric")).toBe("/m²");
      expect(getCostPerAreaUnit("imperial")).toBe("/sq ft");
    });
  });

  describe("Unit System Labels", () => {
    it("should return correct labels", () => {
      expect(getUnitSystemLabel("metric")).toBe("Metric (SI)");
      expect(getUnitSystemLabel("imperial")).toBe("Imperial (US)");
    });
  });
});
