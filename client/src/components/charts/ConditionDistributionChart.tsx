import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ConditionDistributionChartProps {
  data: Array<{
    rating: string;
    count: number;
    percentage?: number;
  }>;
  title?: string;
  height?: number;
}

const CONDITION_COLORS: Record<string, string> = {
  Excellent: "#10b981", // green
  Good: "#84cc16", // lime
  Fair: "#eab308", // yellow
  Poor: "#f97316", // orange
  Critical: "#ef4444", // red
};

export function ConditionDistributionChart({ data, title, height = 400 }: ConditionDistributionChartProps) {
  return (
    <div className="space-y-2">
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="rating" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip
            formatter={(value: number, name: string, props: any) => {
              const percentage = props.payload.percentage;
              return [
                `${value} components${percentage ? ` (${percentage.toFixed(1)}%)` : ""}`,
                "Count",
              ];
            }}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          <Legend />
          <Bar dataKey="count" name="Components">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CONDITION_COLORS[entry.rating] || "hsl(var(--chart-1))"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
