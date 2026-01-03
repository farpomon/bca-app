import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CostBreakdownChartProps {
  data: Array<{
    category: string;
    identifiedCosts: number;
    plannedCosts: number;
    executedCosts: number;
  }>;
  title?: string;
  height?: number;
}

export function CostBreakdownChart({ data, title, height = 400 }: CostBreakdownChartProps) {
  const formatCurrency = (value: number) => {
    return `$${(value / 1000).toFixed(0)}K`;
  };

  return (
    <div className="space-y-2">
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="category" className="text-xs" angle={-45} textAnchor="end" height={100} />
          <YAxis tickFormatter={formatCurrency} className="text-xs" />
          <Tooltip
            formatter={(value: number) => `$${value.toLocaleString()}`}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          <Legend />
          <Bar dataKey="identifiedCosts" name="Identified" fill="hsl(var(--chart-1))" stackId="a" />
          <Bar dataKey="plannedCosts" name="Planned" fill="hsl(var(--chart-2))" stackId="a" />
          <Bar dataKey="executedCosts" name="Executed" fill="hsl(var(--chart-3))" stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
