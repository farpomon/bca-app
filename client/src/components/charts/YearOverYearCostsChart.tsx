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

interface YearOverYearCostsChartProps {
  data: Array<{
    year: string;
    maintenanceCosts: number;
    renewalCosts: number;
    totalCosts?: number;
  }>;
  title?: string;
  height?: number;
}

export function YearOverYearCostsChart({ data, title, height = 400 }: YearOverYearCostsChartProps) {
  const formatCurrency = (value: number) => {
    return `$${(value / 1000).toFixed(0)}K`;
  };

  return (
    <div className="space-y-2">
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="year" className="text-xs" />
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
          <Bar dataKey="maintenanceCosts" name="Maintenance Costs" fill="hsl(var(--chart-1))" />
          <Bar dataKey="renewalCosts" name="Renewal Costs" fill="hsl(var(--chart-2))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
