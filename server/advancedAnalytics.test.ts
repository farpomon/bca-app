import { describe, it, expect } from "vitest";
import {
  calculateNPV,
  calculateROI,
  calculatePaybackPeriod,
  calculateIRR,
} from "./db-advancedAnalytics";

describe("Advanced Analytics Financial Calculations", () => {
  describe("Net Present Value (NPV)", () => {
    it("should calculate NPV correctly for positive cash flows", () => {
      const initialInvestment = 100000;
      const annualCashFlows = [30000, 30000, 30000, 30000];
      const discountRate = 10;

      const npv = calculateNPV(initialInvestment, annualCashFlows, discountRate);

      // Expected NPV (actual calculation result)
      expect(npv).toBeCloseTo(-4904, 0);
      // This investment has negative NPV at 10% discount rate
    });

    it("should calculate negative NPV for poor investments", () => {
      const initialInvestment = 100000;
      const annualCashFlows = [10000, 10000, 10000];
      const discountRate = 10;

      const npv = calculateNPV(initialInvestment, annualCashFlows, discountRate);

      expect(npv).toBeLessThan(0);
    });

    it("should handle zero discount rate", () => {
      const initialInvestment = 100000;
      const annualCashFlows = [30000, 30000, 30000, 30000];
      const discountRate = 0;

      const npv = calculateNPV(initialInvestment, annualCashFlows, discountRate);

      // With 0% discount rate, NPV = sum of cash flows - initial investment
      expect(npv).toBe(20000);
    });

    it("should handle varying cash flows", () => {
      const initialInvestment = 50000;
      const annualCashFlows = [10000, 15000, 20000, 25000];
      const discountRate = 8;

      const npv = calculateNPV(initialInvestment, annualCashFlows, discountRate);

      expect(npv).toBeGreaterThan(0);
      expect(npv).toBeCloseTo(6372, 0);
    });
  });

  describe("Return on Investment (ROI)", () => {
    it("should calculate positive ROI correctly", () => {
      const totalBenefit = 150000;
      const totalCost = 100000;

      const roi = calculateROI(totalBenefit, totalCost);

      expect(roi).toBe(50); // 50% ROI
    });

    it("should calculate negative ROI for losses", () => {
      const totalBenefit = 80000;
      const totalCost = 100000;

      const roi = calculateROI(totalBenefit, totalCost);

      expect(roi).toBe(-20); // -20% ROI
    });

    it("should handle zero cost", () => {
      const totalBenefit = 100000;
      const totalCost = 0;

      const roi = calculateROI(totalBenefit, totalCost);

      expect(roi).toBe(0);
    });

    it("should calculate 100% ROI when benefit doubles cost", () => {
      const totalBenefit = 200000;
      const totalCost = 100000;

      const roi = calculateROI(totalBenefit, totalCost);

      expect(roi).toBe(100);
    });
  });

  describe("Payback Period", () => {
    it("should calculate payback period correctly", () => {
      const initialInvestment = 100000;
      const annualCashFlow = 25000;

      const payback = calculatePaybackPeriod(initialInvestment, annualCashFlow);

      expect(payback).toBe(4); // 4 years
    });

    it("should handle fractional payback periods", () => {
      const initialInvestment = 100000;
      const annualCashFlow = 30000;

      const payback = calculatePaybackPeriod(initialInvestment, annualCashFlow);

      expect(payback).toBeCloseTo(3.33, 2);
    });

    it("should return Infinity for zero or negative cash flow", () => {
      const initialInvestment = 100000;
      const annualCashFlow = 0;

      const payback = calculatePaybackPeriod(initialInvestment, annualCashFlow);

      expect(payback).toBe(Infinity);
    });

    it("should handle negative cash flow", () => {
      const initialInvestment = 100000;
      const annualCashFlow = -10000;

      const payback = calculatePaybackPeriod(initialInvestment, annualCashFlow);

      expect(payback).toBe(Infinity);
    });
  });

  describe("Internal Rate of Return (IRR)", () => {
    it("should calculate IRR for typical investment", () => {
      const initialInvestment = 100000;
      const annualCashFlows = [30000, 30000, 30000, 30000];

      const irr = calculateIRR(initialInvestment, annualCashFlows);

      // Expected IRR ≈ 7.7%
      expect(irr).toBeGreaterThan(5);
      expect(irr).toBeLessThan(15);
      expect(irr).toBeCloseTo(7.7, 0);
    });

    it("should calculate high IRR for profitable investment", () => {
      const initialInvestment = 50000;
      const annualCashFlows = [20000, 25000, 30000];

      const irr = calculateIRR(initialInvestment, annualCashFlows);

      expect(irr).toBeGreaterThan(20);
    });

    it("should handle break-even scenario", () => {
      const initialInvestment = 100000;
      const annualCashFlows = [25000, 25000, 25000, 25000];

      const irr = calculateIRR(initialInvestment, annualCashFlows);

      // IRR should be close to 0% for break-even
      expect(irr).toBeGreaterThan(-5);
      expect(irr).toBeLessThan(5);
    });

    it("should handle varying cash flows", () => {
      const initialInvestment = 100000;
      const annualCashFlows = [10000, 20000, 30000, 40000, 50000];

      const irr = calculateIRR(initialInvestment, annualCashFlows);

      expect(irr).toBeGreaterThan(10);
      expect(irr).toBeLessThan(15);
    });
  });

  describe("Edge Cases and Validation", () => {
    it("should handle very small investments", () => {
      const initialInvestment = 1000;
      const annualCashFlows = [300, 300, 300, 300];
      const discountRate = 5;

      const npv = calculateNPV(initialInvestment, annualCashFlows, discountRate);

      expect(npv).toBeGreaterThan(0);
    });

    it("should handle very large investments", () => {
      const initialInvestment = 10000000;
      const annualCashFlows = [2000000, 2500000, 3000000, 3500000];
      const discountRate = 8;

      const npv = calculateNPV(initialInvestment, annualCashFlows, discountRate);

      // This investment has negative NPV - insufficient returns for the discount rate
      expect(npv).toBeLessThan(0);
    });

    it("should handle single year cash flow", () => {
      const initialInvestment = 100000;
      const annualCashFlows = [120000];
      const discountRate = 10;

      const npv = calculateNPV(initialInvestment, annualCashFlows, discountRate);

      expect(npv).toBeGreaterThan(0);
    });

    it("should handle long-term investments (20+ years)", () => {
      const initialInvestment = 500000;
      const annualCashFlows = Array(20).fill(50000);
      const discountRate = 6;

      const npv = calculateNPV(initialInvestment, annualCashFlows, discountRate);

      expect(npv).toBeGreaterThan(0);
    });
  });

  describe("Real-World Scenarios", () => {
    it("should evaluate HVAC replacement project", () => {
      // Replace HVAC system: $150K investment
      // Annual energy savings: $25K
      // Annual maintenance savings: $5K
      // 15-year lifespan
      const initialInvestment = 150000;
      const annualCashFlow = 30000;
      const annualCashFlows = Array(15).fill(annualCashFlow);
      const discountRate = 5;

      const npv = calculateNPV(initialInvestment, annualCashFlows, discountRate);
      const roi = calculateROI(annualCashFlow * 15, initialInvestment);
      const payback = calculatePaybackPeriod(initialInvestment, annualCashFlow);
      const irr = calculateIRR(initialInvestment, annualCashFlows);

      expect(npv).toBeGreaterThan(0);
      expect(roi).toBeGreaterThan(100);
      expect(payback).toBe(5);
      expect(irr).toBeGreaterThan(15);
    });

    it("should evaluate roof replacement project", () => {
      // Replace roof: $200K investment
      // Avoid emergency repairs: $10K/year
      // Reduced energy costs: $5K/year
      // 25-year lifespan
      const initialInvestment = 200000;
      const annualCashFlow = 15000;
      const annualCashFlows = Array(25).fill(annualCashFlow);
      const discountRate = 4;

      const npv = calculateNPV(initialInvestment, annualCashFlows, discountRate);
      const payback = calculatePaybackPeriod(initialInvestment, annualCashFlow);

      expect(npv).toBeGreaterThan(0);
      expect(payback).toBeCloseTo(13.33, 1);
    });

    it("should evaluate energy efficiency upgrade", () => {
      // LED lighting upgrade: $50K investment
      // Annual energy savings: $12K
      // 10-year lifespan
      const initialInvestment = 50000;
      const annualCashFlow = 12000;
      const annualCashFlows = Array(10).fill(annualCashFlow);
      const discountRate = 6;

      const npv = calculateNPV(initialInvestment, annualCashFlows, discountRate);
      const roi = calculateROI(annualCashFlow * 10, initialInvestment);
      const payback = calculatePaybackPeriod(initialInvestment, annualCashFlow);
      const irr = calculateIRR(initialInvestment, annualCashFlows);

      expect(npv).toBeGreaterThan(0);
      expect(roi).toBeGreaterThan(100);
      expect(payback).toBeCloseTo(4.17, 1);
      expect(irr).toBeGreaterThan(20);
    });

    it("should evaluate building automation system", () => {
      // BAS installation: $300K investment
      // Year 1-3: $40K savings (learning curve)
      // Year 4-10: $60K savings (optimized)
      const initialInvestment = 300000;
      const annualCashFlows = [
        40000, 40000, 40000,
        60000, 60000, 60000, 60000, 60000, 60000, 60000
      ];
      const discountRate = 7;

      const npv = calculateNPV(initialInvestment, annualCashFlows, discountRate);
      const irr = calculateIRR(initialInvestment, annualCashFlows);

      expect(npv).toBeGreaterThan(0);
      expect(irr).toBeGreaterThan(10);
    });
  });

  describe("Comparison Scenarios", () => {
    it("should prefer project with higher NPV", () => {
      const discountRate = 8;

      // Project A: Lower initial cost, moderate returns
      const projectA_NPV = calculateNPV(
        50000,
        [15000, 15000, 15000, 15000, 15000],
        discountRate
      );

      // Project B: Higher initial cost, higher returns
      const projectB_NPV = calculateNPV(
        100000,
        [35000, 35000, 35000, 35000, 35000],
        discountRate
      );

      expect(projectB_NPV).toBeGreaterThan(projectA_NPV);
    });

    it("should consider payback period for risk assessment", () => {
      // Quick payback project
      const quickPayback = calculatePaybackPeriod(100000, 50000);

      // Slow payback project
      const slowPayback = calculatePaybackPeriod(100000, 15000);

      expect(quickPayback).toBeLessThan(slowPayback);
      expect(quickPayback).toBe(2);
      expect(slowPayback).toBeCloseTo(6.67, 1);
    });
  });
});
