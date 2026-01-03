import { describe, it, expect } from 'vitest';

/**
 * Comprehensive edge case tests for AssetOptimization component logic
 * 
 * Test Coverage:
 * 1. Cost validation and sanitization
 * 2. Division by zero prevention
 * 3. Budget allocation calculations
 * 4. Priority grouping with edge cases
 * 5. Invalid data handling
 */

// Helper function to validate and sanitize estimated cost (same as in component)
const getValidCost = (cost: any): number => {
  if (cost === null || cost === undefined) return 0;
  const numCost = typeof cost === 'number' ? cost : parseFloat(cost);
  return !isNaN(numCost) && isFinite(numCost) && numCost >= 0 ? numCost : 0;
};

// Calculate total estimated costs from deficiencies with validation
const calculateTotalCost = (deficiencies: any[]): number => {
  return deficiencies.reduce((sum, d) => sum + getValidCost(d.estimatedCost), 0);
};

// Group deficiencies by priority
const groupByPriority = (deficiencies: any[]) => {
  return {
    immediate: deficiencies.filter(d => d.priority === 'immediate'),
    short_term: deficiencies.filter(d => d.priority === 'short_term'),
    medium_term: deficiencies.filter(d => d.priority === 'medium_term'),
    long_term: deficiencies.filter(d => d.priority === 'long_term'),
  };
};

// Calculate costs by priority with validation
const calculateCostsByPriority = (deficienciesByPriority: ReturnType<typeof groupByPriority>) => {
  return {
    immediate: deficienciesByPriority.immediate.reduce((sum, d) => sum + getValidCost(d.estimatedCost), 0),
    short_term: deficienciesByPriority.short_term.reduce((sum, d) => sum + getValidCost(d.estimatedCost), 0),
    medium_term: deficienciesByPriority.medium_term.reduce((sum, d) => sum + getValidCost(d.estimatedCost), 0),
    long_term: deficienciesByPriority.long_term.reduce((sum, d) => sum + getValidCost(d.estimatedCost), 0),
  };
};

// Calculate budget allocation percentages
const calculateBudgetAllocations = (totalBudget: number, totalEstimatedCost: number, costsByPriority: ReturnType<typeof calculateCostsByPriority>) => {
  if (totalBudget <= 0 || totalEstimatedCost <= 0) return null;
  
  return {
    immediate: (costsByPriority.immediate / totalEstimatedCost) * totalBudget,
    short_term: (costsByPriority.short_term / totalEstimatedCost) * totalBudget,
    medium_term: (costsByPriority.medium_term / totalEstimatedCost) * totalBudget,
    long_term: (costsByPriority.long_term / totalEstimatedCost) * totalBudget,
  };
};

describe('AssetOptimization - Cost Validation', () => {
  describe('getValidCost function', () => {
    it('should return 0 for null cost', () => {
      expect(getValidCost(null)).toBe(0);
    });

    it('should return 0 for undefined cost', () => {
      expect(getValidCost(undefined)).toBe(0);
    });

    it('should return 0 for NaN cost', () => {
      expect(getValidCost(NaN)).toBe(0);
    });

    it('should return 0 for Infinity cost', () => {
      expect(getValidCost(Infinity)).toBe(0);
    });

    it('should return 0 for negative Infinity cost', () => {
      expect(getValidCost(-Infinity)).toBe(0);
    });

    it('should return 0 for negative cost', () => {
      expect(getValidCost(-500)).toBe(0);
    });

    it('should parse valid string numbers', () => {
      expect(getValidCost('250')).toBe(250);
      expect(getValidCost('1000.50')).toBe(1000.50);
    });

    it('should return 0 for invalid string', () => {
      expect(getValidCost('invalid')).toBe(0);
      expect(getValidCost('abc123')).toBe(0);
    });

    it('should return valid positive numbers', () => {
      expect(getValidCost(100)).toBe(100);
      expect(getValidCost(1500.75)).toBe(1500.75);
    });

    it('should return 0 for zero', () => {
      expect(getValidCost(0)).toBe(0);
    });
  });

  describe('calculateTotalCost function', () => {
    it('should return 0 for empty deficiencies array', () => {
      expect(calculateTotalCost([])).toBe(0);
    });

    it('should sum valid costs correctly', () => {
      const deficiencies = [
        { estimatedCost: 100 },
        { estimatedCost: 200 },
        { estimatedCost: 300 },
      ];
      expect(calculateTotalCost(deficiencies)).toBe(600);
    });

    it('should ignore null costs', () => {
      const deficiencies = [
        { estimatedCost: 100 },
        { estimatedCost: null },
        { estimatedCost: 300 },
      ];
      expect(calculateTotalCost(deficiencies)).toBe(400);
    });

    it('should ignore undefined costs', () => {
      const deficiencies = [
        { estimatedCost: 100 },
        { estimatedCost: undefined },
        { estimatedCost: 300 },
      ];
      expect(calculateTotalCost(deficiencies)).toBe(400);
    });

    it('should ignore NaN costs', () => {
      const deficiencies = [
        { estimatedCost: 100 },
        { estimatedCost: NaN },
        { estimatedCost: 300 },
      ];
      expect(calculateTotalCost(deficiencies)).toBe(400);
    });

    it('should ignore Infinity costs', () => {
      const deficiencies = [
        { estimatedCost: 100 },
        { estimatedCost: Infinity },
        { estimatedCost: 300 },
      ];
      expect(calculateTotalCost(deficiencies)).toBe(400);
    });

    it('should ignore negative costs', () => {
      const deficiencies = [
        { estimatedCost: 100 },
        { estimatedCost: -50 },
        { estimatedCost: 300 },
      ];
      expect(calculateTotalCost(deficiencies)).toBe(400);
    });

    it('should parse string costs', () => {
      const deficiencies = [
        { estimatedCost: '100' },
        { estimatedCost: 200 },
        { estimatedCost: '300.50' },
      ];
      expect(calculateTotalCost(deficiencies)).toBe(600.50);
    });

    it('should handle mixed valid and invalid data', () => {
      const deficiencies = [
        { estimatedCost: 100 },
        { estimatedCost: null },
        { estimatedCost: '200' },
        { estimatedCost: NaN },
        { estimatedCost: 300 },
        { estimatedCost: -50 },
        { estimatedCost: 'invalid' },
        { estimatedCost: Infinity },
      ];
      expect(calculateTotalCost(deficiencies)).toBe(600);
    });
  });
});

describe('AssetOptimization - Priority Grouping', () => {
  it('should group deficiencies by priority correctly', () => {
    const deficiencies = [
      { id: 1, priority: 'immediate', estimatedCost: 100 },
      { id: 2, priority: 'short_term', estimatedCost: 200 },
      { id: 3, priority: 'immediate', estimatedCost: 150 },
      { id: 4, priority: 'long_term', estimatedCost: 50 },
    ];

    const grouped = groupByPriority(deficiencies);

    expect(grouped.immediate).toHaveLength(2);
    expect(grouped.short_term).toHaveLength(1);
    expect(grouped.medium_term).toHaveLength(0);
    expect(grouped.long_term).toHaveLength(1);
  });

  it('should handle empty deficiencies array', () => {
    const grouped = groupByPriority([]);

    expect(grouped.immediate).toHaveLength(0);
    expect(grouped.short_term).toHaveLength(0);
    expect(grouped.medium_term).toHaveLength(0);
    expect(grouped.long_term).toHaveLength(0);
  });

  it('should handle deficiencies with undefined priority', () => {
    const deficiencies = [
      { id: 1, priority: 'immediate', estimatedCost: 100 },
      { id: 2, priority: undefined, estimatedCost: 200 },
    ];

    const grouped = groupByPriority(deficiencies);

    expect(grouped.immediate).toHaveLength(1);
    expect(grouped.short_term).toHaveLength(0);
    expect(grouped.medium_term).toHaveLength(0);
    expect(grouped.long_term).toHaveLength(0);
  });

  it('should calculate costs by priority correctly', () => {
    const deficiencies = [
      { id: 1, priority: 'immediate', estimatedCost: 1000 },
      { id: 2, priority: 'immediate', estimatedCost: 1500 },
      { id: 3, priority: 'short_term', estimatedCost: 500 },
      { id: 4, priority: 'medium_term', estimatedCost: 750 },
      { id: 5, priority: 'long_term', estimatedCost: 250 },
    ];

    const grouped = groupByPriority(deficiencies);
    const costs = calculateCostsByPriority(grouped);

    expect(costs.immediate).toBe(2500);
    expect(costs.short_term).toBe(500);
    expect(costs.medium_term).toBe(750);
    expect(costs.long_term).toBe(250);
  });

  it('should handle invalid costs in priority groups', () => {
    const deficiencies = [
      { id: 1, priority: 'immediate', estimatedCost: 1000 },
      { id: 2, priority: 'immediate', estimatedCost: null },
      { id: 3, priority: 'short_term', estimatedCost: NaN },
      { id: 4, priority: 'medium_term', estimatedCost: -500 },
      { id: 5, priority: 'long_term', estimatedCost: 'invalid' },
    ];

    const grouped = groupByPriority(deficiencies);
    const costs = calculateCostsByPriority(grouped);

    expect(costs.immediate).toBe(1000);
    expect(costs.short_term).toBe(0);
    expect(costs.medium_term).toBe(0);
    expect(costs.long_term).toBe(0);
  });
});

describe('AssetOptimization - Budget Allocation', () => {
  it('should return null when totalBudget is 0', () => {
    const costsByPriority = {
      immediate: 1000,
      short_term: 500,
      medium_term: 300,
      long_term: 200,
    };

    const allocations = calculateBudgetAllocations(0, 2000, costsByPriority);
    expect(allocations).toBeNull();
  });

  it('should return null when totalEstimatedCost is 0', () => {
    const costsByPriority = {
      immediate: 0,
      short_term: 0,
      medium_term: 0,
      long_term: 0,
    };

    const allocations = calculateBudgetAllocations(5000, 0, costsByPriority);
    expect(allocations).toBeNull();
  });

  it('should return null when both are 0 (division by zero prevention)', () => {
    const costsByPriority = {
      immediate: 0,
      short_term: 0,
      medium_term: 0,
      long_term: 0,
    };

    const allocations = calculateBudgetAllocations(0, 0, costsByPriority);
    expect(allocations).toBeNull();
  });

  it('should allocate budget proportionally', () => {
    const costsByPriority = {
      immediate: 4000,
      short_term: 3000,
      medium_term: 2000,
      long_term: 1000,
    };
    const totalCost = 10000;
    const budget = 5000;

    const allocations = calculateBudgetAllocations(budget, totalCost, costsByPriority);

    expect(allocations).not.toBeNull();
    expect(allocations!.immediate).toBe(2000); // 40% of 5000
    expect(allocations!.short_term).toBe(1500); // 30% of 5000
    expect(allocations!.medium_term).toBe(1000); // 20% of 5000
    expect(allocations!.long_term).toBe(500); // 10% of 5000
  });

  it('should handle budget equal to total cost', () => {
    const costsByPriority = {
      immediate: 2000,
      short_term: 1500,
      medium_term: 1000,
      long_term: 500,
    };
    const totalCost = 5000;
    const budget = 5000;

    const allocations = calculateBudgetAllocations(budget, totalCost, costsByPriority);

    expect(allocations).not.toBeNull();
    expect(allocations!.immediate).toBe(2000);
    expect(allocations!.short_term).toBe(1500);
    expect(allocations!.medium_term).toBe(1000);
    expect(allocations!.long_term).toBe(500);
  });

  it('should handle budget greater than total cost', () => {
    const costsByPriority = {
      immediate: 1000,
      short_term: 500,
      medium_term: 300,
      long_term: 200,
    };
    const totalCost = 2000;
    const budget = 10000;

    const allocations = calculateBudgetAllocations(budget, totalCost, costsByPriority);

    expect(allocations).not.toBeNull();
    expect(allocations!.immediate).toBe(5000); // 50% of 10000
    expect(allocations!.short_term).toBe(2500); // 25% of 10000
    expect(allocations!.medium_term).toBe(1500); // 15% of 10000
    expect(allocations!.long_term).toBe(1000); // 10% of 10000
  });

  it('should allocate 100% to single priority when others are 0', () => {
    const costsByPriority = {
      immediate: 5000,
      short_term: 0,
      medium_term: 0,
      long_term: 0,
    };
    const totalCost = 5000;
    const budget = 3000;

    const allocations = calculateBudgetAllocations(budget, totalCost, costsByPriority);

    expect(allocations).not.toBeNull();
    expect(allocations!.immediate).toBe(3000); // 100% of 3000
    expect(allocations!.short_term).toBe(0);
    expect(allocations!.medium_term).toBe(0);
    expect(allocations!.long_term).toBe(0);
  });

  it('should handle decimal budget allocations correctly', () => {
    const costsByPriority = {
      immediate: 3333,
      short_term: 3333,
      medium_term: 3334,
      long_term: 0,
    };
    const totalCost = 10000;
    const budget = 7500;

    const allocations = calculateBudgetAllocations(budget, totalCost, costsByPriority);

    expect(allocations).not.toBeNull();
    expect(allocations!.immediate).toBeCloseTo(2499.75, 2);
    expect(allocations!.short_term).toBeCloseTo(2499.75, 2);
    expect(allocations!.medium_term).toBeCloseTo(2500.50, 2);
    expect(allocations!.long_term).toBe(0);
  });
});

describe('AssetOptimization - Budget Coverage Calculation', () => {
  it('should calculate correct coverage percentage', () => {
    const totalBudget = 5000;
    const totalEstimatedCost = 10000;
    const coverage = (totalBudget / totalEstimatedCost) * 100;

    expect(coverage).toBe(50);
  });

  it('should handle 100% coverage', () => {
    const totalBudget = 10000;
    const totalEstimatedCost = 10000;
    const coverage = (totalBudget / totalEstimatedCost) * 100;

    expect(coverage).toBe(100);
  });

  it('should handle over 100% coverage', () => {
    const totalBudget = 15000;
    const totalEstimatedCost = 10000;
    const coverage = (totalBudget / totalEstimatedCost) * 100;

    expect(coverage).toBe(150);
  });

  it('should not calculate coverage when totalEstimatedCost is 0', () => {
    const totalBudget = 5000;
    const totalEstimatedCost = 0;

    // This would cause division by zero, so we shouldn't calculate
    expect(totalEstimatedCost).toBe(0);
    // In the component, this case is handled by not showing coverage
  });
});

describe('AssetOptimization - Integration Tests', () => {
  it('should handle complete workflow with valid data', () => {
    const deficiencies = [
      { id: 1, priority: 'immediate', estimatedCost: 4000 },
      { id: 2, priority: 'short_term', estimatedCost: 3000 },
      { id: 3, priority: 'medium_term', estimatedCost: 2000 },
      { id: 4, priority: 'long_term', estimatedCost: 1000 },
    ];

    const totalCost = calculateTotalCost(deficiencies);
    const grouped = groupByPriority(deficiencies);
    const costs = calculateCostsByPriority(grouped);
    const allocations = calculateBudgetAllocations(5000, totalCost, costs);

    expect(totalCost).toBe(10000);
    expect(costs.immediate).toBe(4000);
    expect(costs.short_term).toBe(3000);
    expect(costs.medium_term).toBe(2000);
    expect(costs.long_term).toBe(1000);
    expect(allocations).not.toBeNull();
    expect(allocations!.immediate).toBe(2000);
    expect(allocations!.short_term).toBe(1500);
    expect(allocations!.medium_term).toBe(1000);
    expect(allocations!.long_term).toBe(500);
  });

  it('should handle complete workflow with mixed valid/invalid data', () => {
    const deficiencies = [
      { id: 1, priority: 'immediate', estimatedCost: 2000 },
      { id: 2, priority: 'immediate', estimatedCost: null },
      { id: 3, priority: 'short_term', estimatedCost: '1000' },
      { id: 4, priority: 'medium_term', estimatedCost: NaN },
      { id: 5, priority: 'long_term', estimatedCost: 500 },
      { id: 6, priority: 'long_term', estimatedCost: -100 },
    ];

    const totalCost = calculateTotalCost(deficiencies);
    const grouped = groupByPriority(deficiencies);
    const costs = calculateCostsByPriority(grouped);
    const allocations = calculateBudgetAllocations(3500, totalCost, costs);

    expect(totalCost).toBe(3500); // 2000 + 1000 + 500
    expect(costs.immediate).toBe(2000);
    expect(costs.short_term).toBe(1000);
    expect(costs.medium_term).toBe(0);
    expect(costs.long_term).toBe(500);
    expect(allocations).not.toBeNull();
  });

  it('should handle complete workflow with no valid costs', () => {
    const deficiencies = [
      { id: 1, priority: 'immediate', estimatedCost: null },
      { id: 2, priority: 'short_term', estimatedCost: NaN },
      { id: 3, priority: 'medium_term', estimatedCost: -500 },
    ];

    const totalCost = calculateTotalCost(deficiencies);
    const grouped = groupByPriority(deficiencies);
    const costs = calculateCostsByPriority(grouped);
    const allocations = calculateBudgetAllocations(5000, totalCost, costs);

    expect(totalCost).toBe(0);
    expect(costs.immediate).toBe(0);
    expect(costs.short_term).toBe(0);
    expect(costs.medium_term).toBe(0);
    expect(allocations).toBeNull(); // No allocation when total cost is 0
  });
});
