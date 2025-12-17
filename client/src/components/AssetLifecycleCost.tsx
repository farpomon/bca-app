import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, Calculator } from "lucide-react";

interface AssetLifecycleCostProps {
  assetId: number;
  totalEstimatedCost: number;
  assetValue?: number;
}

export default function AssetLifecycleCost({ 
  assetId, 
  totalEstimatedCost,
  assetValue = 0 
}: AssetLifecycleCostProps) {
  const [replacementCost, setReplacementCost] = useState<number>(assetValue);
  const [annualMaintenanceCost, setAnnualMaintenanceCost] = useState<number>(0);
  const [discountRate, setDiscountRate] = useState<number>(3);
  const [analysisYears, setAnalysisYears] = useState<number>(20);

  // Calculate NPV (Net Present Value)
  const calculateNPV = (cashFlows: number[], rate: number) => {
    return cashFlows.reduce((npv, cashFlow, year) => {
      return npv + cashFlow / Math.pow(1 + rate / 100, year);
    }, 0);
  };

  // Repair scenario: initial repair cost + annual maintenance
  const repairCashFlows = [
    -totalEstimatedCost, // Year 0: initial repair
    ...Array(analysisYears).fill(-annualMaintenanceCost) // Years 1-N: maintenance
  ];

  // Replace scenario: replacement cost + lower annual maintenance (assume 50% of current)
  const replaceCashFlows = [
    -replacementCost, // Year 0: replacement
    ...Array(analysisYears).fill(-annualMaintenanceCost * 0.5) // Years 1-N: reduced maintenance
  ];

  const repairNPV = calculateNPV(repairCashFlows, discountRate);
  const replaceNPV = calculateNPV(replaceCashFlows, discountRate);

  // Total cost of ownership
  const repairTotalCost = totalEstimatedCost + (annualMaintenanceCost * analysisYears);
  const replaceTotalCost = replacementCost + (annualMaintenanceCost * 0.5 * analysisYears);

  // Calculate year-by-year projections
  const yearlyProjections = Array.from({ length: Math.min(analysisYears, 10) }, (_, i) => {
    const year = i + 1;
    const repairCumulative = totalEstimatedCost + (annualMaintenanceCost * year);
    const replaceCumulative = replacementCost + (annualMaintenanceCost * 0.5 * year);
    return { year, repairCumulative, replaceCumulative };
  });

  const recommendedAction = repairNPV > replaceNPV ? 'Replace' : 'Repair';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Lifecycle Cost Analysis</CardTitle>
          <CardDescription>
            Compare total cost of ownership for repair vs. replacement scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="replacementCost">Replacement Cost ($)</Label>
              <Input
                id="replacementCost"
                type="number"
                value={replacementCost || ''}
                onChange={(e) => setReplacementCost(Number(e.target.value))}
                placeholder="Enter replacement cost"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="annualMaintenance">Annual Maintenance Cost ($)</Label>
              <Input
                id="annualMaintenance"
                type="number"
                value={annualMaintenanceCost || ''}
                onChange={(e) => setAnnualMaintenanceCost(Number(e.target.value))}
                placeholder="Enter annual maintenance"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountRate">Discount Rate (%)</Label>
              <Input
                id="discountRate"
                type="number"
                value={discountRate}
                onChange={(e) => setDiscountRate(Number(e.target.value))}
                placeholder="3"
                step="0.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysisYears">Analysis Period (years)</Label>
              <Input
                id="analysisYears"
                type="number"
                value={analysisYears}
                onChange={(e) => setAnalysisYears(Math.min(50, Math.max(1, Number(e.target.value))))}
                placeholder="20"
                min="1"
                max="50"
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Repair Cost</p>
              </div>
              <p className="text-2xl font-bold">${totalEstimatedCost.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Initial investment</p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Replacement Cost</p>
              </div>
              <p className="text-2xl font-bold">${replacementCost.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Initial investment</p>
            </div>

            <div className="p-4 border rounded-lg bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-primary">Recommendation</p>
              </div>
              <p className="text-2xl font-bold">{recommendedAction}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Based on NPV analysis
              </p>
            </div>
          </div>

          {/* NPV Comparison */}
          <div className="space-y-3">
            <h3 className="font-semibold">Net Present Value (NPV) Comparison</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 border rounded-lg ${repairNPV < replaceNPV ? 'bg-green-50 border-green-200' : ''}`}>
                <p className="text-sm font-medium text-muted-foreground mb-1">Repair Scenario</p>
                <p className="text-2xl font-bold">${Math.abs(repairNPV).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Total Cost: ${repairTotalCost.toLocaleString()}
                </p>
                {repairNPV < replaceNPV && (
                  <p className="text-xs text-green-600 font-medium mt-1">✓ Lower NPV</p>
                )}
              </div>

              <div className={`p-4 border rounded-lg ${replaceNPV < repairNPV ? 'bg-green-50 border-green-200' : ''}`}>
                <p className="text-sm font-medium text-muted-foreground mb-1">Replace Scenario</p>
                <p className="text-2xl font-bold">${Math.abs(replaceNPV).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Total Cost: ${replaceTotalCost.toLocaleString()}
                </p>
                {replaceNPV < repairNPV && (
                  <p className="text-xs text-green-600 font-medium mt-1">✓ Lower NPV</p>
                )}
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Savings:</strong> Choosing {recommendedAction.toLowerCase()} saves{' '}
                <strong>${Math.abs(repairNPV - replaceNPV).toLocaleString()}</strong> in NPV over {analysisYears} years
              </p>
            </div>
          </div>

          {/* Cost Projections */}
          <div className="space-y-3">
            <h3 className="font-semibold">Cost Projections (First 10 Years)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Year</th>
                    <th className="text-right p-2">Repair Cumulative</th>
                    <th className="text-right p-2">Replace Cumulative</th>
                    <th className="text-right p-2">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyProjections.map(({ year, repairCumulative, replaceCumulative }) => (
                    <tr key={year} className="border-b">
                      <td className="p-2">{year}</td>
                      <td className="text-right p-2">${repairCumulative.toLocaleString()}</td>
                      <td className="text-right p-2">${replaceCumulative.toLocaleString()}</td>
                      <td className={`text-right p-2 font-medium ${
                        repairCumulative < replaceCumulative ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${Math.abs(repairCumulative - replaceCumulative).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assumptions */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Analysis Assumptions:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Replacement reduces annual maintenance to 50% of current costs</li>
              <li>• Discount rate of {discountRate}% applied to future cash flows</li>
              <li>• Analysis period: {analysisYears} years</li>
              <li>• Costs are in today's dollars (inflation not included)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
