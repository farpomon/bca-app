import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from "@/components/ui/card";
import { Loader2, DollarSign } from "lucide-react";

interface FinancialPlanningProps {
  data: {
    groups: Array<{
      code: string;
      name: string;
      periods: number[];
      total: number;
    }>;
    periods: Array<{
      label: string;
      start: number;
      end: number;
    }>;
    grandTotal: number;
  } | undefined;
  isLoading: boolean;
}

export function FinancialPlanning({ data, isLoading }: FinancialPlanningProps) {
  if (isLoading) {
    return (
      <Card className="stats-card-amber p-6">
        <div className="loading-container h-64">
          <Loader2 className="loading-spinner" />
          <p className="loading-text">Loading financial data...</p>
        </div>
      </Card>
    );
  }

  if (!data || data.groups.length === 0) {
    return (
      <Card className="stats-card-amber p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-3">
          <div className="stats-icon-amber">
            <DollarSign className="w-5 h-5" />
          </div>
          Financial Planning
        </h3>
        <div className="empty-state-container h-64 bg-muted/10 rounded-xl border-2 border-dashed">
          <div className="empty-state-icon">
            <DollarSign className="h-10 w-10 text-primary" />
          </div>
          <p className="text-muted-foreground text-center max-w-md">No cost data available. Add action years and costs to assessments.</p>
        </div>
      </Card>
    );
  }

  // Prepare chart data - transpose groups/periods for grouped bar chart
  const chartData = data.periods.map((period, periodIndex) => {
    const dataPoint: Record<string, string | number> = {
      period: period.label,
    };
    data.groups.forEach((group) => {
      dataPoint[group.name] = group.periods[periodIndex] || 0;
    });
    return dataPoint;
  });

  // Color palette for different groups
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  return (
    <Card className="stats-card-amber p-6">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-3">
        <div className="stats-icon-amber">
          <DollarSign className="w-5 h-5" />
        </div>
        Expenditure Forecast by Building System
      </h3>
      
      {/* Bar Chart */}
      <div className="mb-8 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
            <XAxis 
              dataKey="period" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => {
                if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
                if (val >= 1000) return `$${(val / 1000).toFixed(0)}k`;
                return `$${val}`;
              }}
            />
            <Tooltip 
              formatter={(val: number) => [`$${val.toLocaleString()}`, '']}
              contentStyle={{ 
                borderRadius: '8px', 
                border: 'none', 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                backgroundColor: 'hsl(var(--background))',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="square"
            />
            {data.groups.map((group, index) => (
              <Bar 
                key={group.code}
                dataKey={group.name}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="data-table-header">
              <th className="py-3 px-4 text-left rounded-tl-lg">System / Group</th>
              {data.periods.map((period) => (
                <th key={period.label} className="py-3 px-4 text-right">
                  {period.label}
                </th>
              ))}
              <th className="py-3 px-4 text-right bg-amber-50 rounded-tr-lg">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.groups.map((group) => (
              <tr key={group.code} className="data-table-row">
                <td className="py-3 px-4 font-medium">{group.name}</td>
                {group.periods.map((cost, idx) => (
                  <td key={idx} className="py-3 px-4 text-right text-muted-foreground">
                    {cost > 0 ? `$${cost.toLocaleString()}` : '-'}
                  </td>
                ))}
                <td className="py-3 px-4 text-right font-bold bg-amber-50/50">
                  ${group.total.toLocaleString()}
                </td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr className="font-bold bg-primary/5">
              <td className="py-4 px-4 rounded-bl-lg">Total</td>
              {data.periods.map((_, periodIndex) => {
                const periodTotal = data.groups.reduce(
                  (sum, group) => sum + group.periods[periodIndex],
                  0
                );
                return (
                  <td key={periodIndex} className="py-4 px-4 text-right">
                    ${periodTotal.toLocaleString()}
                  </td>
                );
              })}
              <td className="py-4 px-4 text-right text-primary rounded-br-lg">
                ${data.grandTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}
