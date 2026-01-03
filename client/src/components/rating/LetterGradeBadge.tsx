import { cn } from "@/lib/utils";

interface LetterGradeBadgeProps {
  grade: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

// Color mapping for letter grades
const gradeColors: Record<string, { bg: string; text: string; border: string }> = {
  "A+": { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  "A": { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  "A-": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "B+": { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  "B": { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
  "B-": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  "C+": { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  "C": { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  "C-": { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  "D+": { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  "D": { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  "D-": { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "F": { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
};

// Labels for each grade
const gradeLabels: Record<string, string> = {
  "A+": "Exceptional",
  "A": "Excellent",
  "A-": "Very Good",
  "B+": "Good",
  "B": "Above Average",
  "B-": "Satisfactory",
  "C+": "Average",
  "C": "Fair",
  "C-": "Below Average",
  "D+": "Poor",
  "D": "Very Poor",
  "D-": "Critical",
  "F": "Failing",
};

const sizeClasses = {
  sm: "text-xs px-1.5 py-0.5 min-w-[24px]",
  md: "text-sm px-2 py-1 min-w-[32px]",
  lg: "text-lg px-3 py-1.5 min-w-[40px] font-semibold",
};

export function LetterGradeBadge({ 
  grade, 
  size = "md", 
  showLabel = false,
  className 
}: LetterGradeBadgeProps) {
  const colors = gradeColors[grade] || { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" };
  const label = gradeLabels[grade] || "";

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md border font-medium",
          colors.bg,
          colors.text,
          colors.border,
          sizeClasses[size]
        )}
      >
        {grade}
      </span>
      {showLabel && label && (
        <span className={cn("text-muted-foreground", size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm")}>
          {label}
        </span>
      )}
    </div>
  );
}

// Compact version for tables and lists
export function LetterGradeCompact({ grade, className }: { grade: string; className?: string }) {
  const colors = gradeColors[grade] || { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" };
  
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded text-xs font-medium px-1.5 py-0.5 border",
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {grade}
    </span>
  );
}

// Large display version for dashboards
export function LetterGradeDisplay({ 
  grade, 
  score,
  label,
  className 
}: { 
  grade: string; 
  score?: number;
  label?: string;
  className?: string;
}) {
  const colors = gradeColors[grade] || { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" };
  const defaultLabel = gradeLabels[grade] || "";

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div
        className={cn(
          "flex items-center justify-center w-16 h-16 rounded-xl border-2 text-2xl font-bold",
          colors.bg,
          colors.text,
          colors.border
        )}
      >
        {grade}
      </div>
      {score !== undefined && (
        <span className="text-sm font-medium text-foreground">
          {score.toFixed(1)}%
        </span>
      )}
      <span className="text-xs text-muted-foreground">
        {label || defaultLabel}
      </span>
    </div>
  );
}
