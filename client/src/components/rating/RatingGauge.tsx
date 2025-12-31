import { cn } from "@/lib/utils";

interface RatingGaugeProps {
  score: number;
  maxScore?: number;
  grade?: string;
  zone?: "green" | "yellow" | "orange" | "red";
  label?: string;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
  className?: string;
}

// Zone colors for the gauge
const zoneColors = {
  green: { stroke: "stroke-emerald-500", text: "text-emerald-600" },
  yellow: { stroke: "stroke-yellow-500", text: "text-yellow-600" },
  orange: { stroke: "stroke-orange-500", text: "text-orange-600" },
  red: { stroke: "stroke-red-500", text: "text-red-600" },
};

// Determine zone from score
function getZoneFromScore(score: number, maxScore: number = 100): "green" | "yellow" | "orange" | "red" {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 80) return "green";
  if (percentage >= 60) return "yellow";
  if (percentage >= 40) return "orange";
  return "red";
}

const sizeConfig = {
  sm: { size: 80, strokeWidth: 6, fontSize: "text-lg", labelSize: "text-xs" },
  md: { size: 120, strokeWidth: 8, fontSize: "text-2xl", labelSize: "text-sm" },
  lg: { size: 160, strokeWidth: 10, fontSize: "text-3xl", labelSize: "text-base" },
};

export function RatingGauge({
  score,
  maxScore = 100,
  grade,
  zone,
  label,
  size = "md",
  showScore = true,
  className,
}: RatingGaugeProps) {
  const config = sizeConfig[size];
  const effectiveZone = zone || getZoneFromScore(score, maxScore);
  const colors = zoneColors[effectiveZone];
  
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const radius = (config.size - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = config.size / 2;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: config.size, height: config.size }}>
        <svg
          width={config.size}
          height={config.size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-muted/30"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn("transition-all duration-500", colors.stroke)}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {grade ? (
            <span className={cn("font-bold", config.fontSize, colors.text)}>
              {grade}
            </span>
          ) : showScore ? (
            <span className={cn("font-bold", config.fontSize, colors.text)}>
              {score.toFixed(0)}
            </span>
          ) : null}
          {showScore && grade && (
            <span className={cn("text-muted-foreground", config.labelSize)}>
              {score.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      
      {label && (
        <span className={cn("mt-2 text-muted-foreground", config.labelSize)}>
          {label}
        </span>
      )}
    </div>
  );
}

// Semi-circular gauge variant
export function RatingGaugeSemi({
  score,
  maxScore = 100,
  grade,
  zone,
  label,
  size = "md",
  className,
}: RatingGaugeProps) {
  const config = sizeConfig[size];
  const effectiveZone = zone || getZoneFromScore(score, maxScore);
  const colors = zoneColors[effectiveZone];
  
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const width = config.size;
  const height = config.size / 2 + 20;
  const radius = (config.size - config.strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = config.size / 2;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width, height }}>
        <svg
          width={width}
          height={height}
          className="overflow-visible"
        >
          {/* Background arc */}
          <path
            d={`M ${config.strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${width - config.strokeWidth / 2} ${center}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            className="text-muted/30"
          />
          {/* Progress arc */}
          <path
            d={`M ${config.strokeWidth / 2} ${center} A ${radius} ${radius} 0 0 1 ${width - config.strokeWidth / 2} ${center}`}
            fill="none"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn("transition-all duration-500", colors.stroke)}
          />
        </svg>
        
        {/* Center content */}
        <div 
          className="absolute flex flex-col items-center"
          style={{ 
            left: '50%', 
            top: center - 10,
            transform: 'translateX(-50%)' 
          }}
        >
          {grade ? (
            <span className={cn("font-bold", config.fontSize, colors.text)}>
              {grade}
            </span>
          ) : (
            <span className={cn("font-bold", config.fontSize, colors.text)}>
              {score.toFixed(0)}
            </span>
          )}
        </div>
      </div>
      
      {label && (
        <span className={cn("text-muted-foreground -mt-2", config.labelSize)}>
          {label}
        </span>
      )}
    </div>
  );
}

// Mini gauge for inline use
export function RatingGaugeMini({
  score,
  maxScore = 100,
  zone,
  className,
}: {
  score: number;
  maxScore?: number;
  zone?: "green" | "yellow" | "orange" | "red";
  className?: string;
}) {
  const effectiveZone = zone || getZoneFromScore(score, maxScore);
  const colors = zoneColors[effectiveZone];
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative w-12 h-2 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={cn(
            "absolute left-0 top-0 h-full rounded-full transition-all duration-300",
            colors.stroke.replace("stroke-", "bg-")
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={cn("text-xs font-medium", colors.text)}>
        {score.toFixed(0)}
      </span>
    </div>
  );
}
