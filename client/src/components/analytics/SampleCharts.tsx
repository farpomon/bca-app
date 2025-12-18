import { useEffect, useRef } from "react";
import { Chart, ChartConfiguration, registerables } from "chart.js";

Chart.register(...registerables);

// Portfolio Health Score - Gauge Chart
export function PortfolioHealthGauge() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const config: ChartConfiguration = {
      type: "doughnut",
      data: {
        labels: ["Good", "Fair", "Poor"],
        datasets: [
          {
            data: [45, 35, 20],
            backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        circumference: 180,
        rotation: 270,
        cutout: "75%",
        plugins: {
          legend: {
            display: true,
            position: "bottom",
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || "";
                const value = context.parsed;
                return `${label}: ${value}%`;
              },
            },
          },
        },
      },
    };

    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="relative" style={{ height: "200px" }}>
      <canvas ref={canvasRef}></canvas>
      <div className="absolute inset-0 flex items-center justify-center" style={{ top: "40px" }}>
        <div className="text-center">
          <div className="text-3xl font-bold text-slate-900">72</div>
          <div className="text-sm text-slate-600">Health Score</div>
        </div>
      </div>
    </div>
  );
}

// Portfolio Health Score - Condition Distribution
export function ConditionDistribution() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const config: ChartConfiguration = {
      type: "bar",
      data: {
        labels: ["Structural", "Envelope", "Mechanical", "Electrical", "Plumbing", "Interior"],
        datasets: [
          {
            label: "Good",
            data: [65, 45, 55, 70, 60, 50],
            backgroundColor: "#10b981",
          },
          {
            label: "Fair",
            data: [25, 35, 30, 20, 25, 35],
            backgroundColor: "#f59e0b",
          },
          {
            label: "Poor",
            data: [10, 20, 15, 10, 15, 15],
            backgroundColor: "#ef4444",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`,
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
          },
        },
      },
    };

    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return (
    <div style={{ height: "300px" }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

// Capital Planning - Stacked Bar Chart
export function CapitalPlanningChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const config: ChartConfiguration = {
      type: "bar",
      data: {
        labels: ["2025", "2026", "2027", "2028", "2029"],
        datasets: [
          {
            label: "Immediate",
            data: [850, 420, 380, 290, 250],
            backgroundColor: "#ef4444",
          },
          {
            label: "Short-term",
            data: [650, 720, 580, 490, 420],
            backgroundColor: "#f59e0b",
          },
          {
            label: "Medium-term",
            data: [450, 520, 680, 720, 650],
            backgroundColor: "#3b82f6",
          },
          {
            label: "Long-term",
            data: [250, 340, 360, 500, 680],
            backgroundColor: "#8b5cf6",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              callback: (value) => `$${value}K`,
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || "";
                const value = context.parsed.y;
                return `${label}: $${value}K`;
              },
            },
          },
        },
      },
    };

    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return (
    <div style={{ height: "300px" }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

// Capital Planning - Budget Allocation Pie Chart
export function BudgetAllocationChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const config: ChartConfiguration = {
      type: "doughnut",
      data: {
        labels: ["Structural", "Envelope", "Mechanical", "Electrical", "Plumbing", "Interior"],
        datasets: [
          {
            data: [1200, 850, 1500, 900, 650, 800],
            backgroundColor: [
              "#3b82f6",
              "#8b5cf6",
              "#ec4899",
              "#f59e0b",
              "#10b981",
              "#06b6d4",
            ],
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "right",
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || "";
                const value = context.parsed;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: $${value}K (${percentage}%)`;
              },
            },
          },
        },
      },
    };

    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return (
    <div style={{ height: "250px" }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

// Deficiency Management - Priority Matrix
export function DeficiencyPriorityChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const config: ChartConfiguration = {
      type: "bar",
      data: {
        labels: ["Immediate", "Short-term", "Medium-term", "Long-term"],
        datasets: [
          {
            label: "Open",
            data: [12, 28, 45, 67],
            backgroundColor: "#ef4444",
          },
          {
            label: "In Progress",
            data: [8, 15, 22, 18],
            backgroundColor: "#f59e0b",
          },
          {
            label: "Resolved",
            data: [25, 42, 38, 55],
            backgroundColor: "#10b981",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        scales: {
          x: {
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
          },
        },
      },
    };

    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return (
    <div style={{ height: "250px" }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

// Deficiency Management - Resolution Trend Line
export function DeficiencyTrendChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const config: ChartConfiguration = {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [
          {
            label: "New Deficiencies",
            data: [15, 22, 18, 25, 20, 28, 24, 19, 23, 26, 21, 17],
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Resolved",
            data: [12, 18, 20, 22, 19, 25, 28, 24, 26, 29, 27, 23],
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
          },
        },
      },
    };

    chartRef.current = new Chart(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return (
    <div style={{ height: "300px" }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}
