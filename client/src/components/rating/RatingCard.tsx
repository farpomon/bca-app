import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LetterGradeBadge, LetterGradeDisplay } from "./LetterGradeBadge";
import { ZoneIndicator, ZoneDot, ZoneDistributionBar } from "./ZoneIndicator";
import { RatingGauge } from "./RatingGauge";
import { TrendingUp, TrendingDown, Minus, Building2, BarChart3 } from "lucide-react";

type Zone = "green" | "yellow" | "orange" | "red";

interface AssetRatingCardProps {
  assetName?: string;
  overallScore?: number | null;
  overallGrade?: string | null;
  overallZone?: Zone | null;
  fciScore?: number | null;
  fciGrade?: string | null;
  fciZone?: Zone | null;
  conditionScore?: number | null;
  conditionGrade?: string | null;
  conditionZone?: Zone | null;
  esgScore?: number | null;
  esgGrade?: string | null;
  esgZone?: Zone | null;
  lastCalculatedAt?: string | null;
  trend?: "up" | "down" | "stable";
  className?: string;
}

export function AssetRatingCard({
  assetName,
  overallScore,
  overallGrade,
  overallZone,
  fciScore,
  fciGrade,
  fciZone,
  conditionScore,
  conditionGrade,
  conditionZone,
  esgScore,
  esgGrade,
  esgZone,
  lastCalculatedAt,
  trend,
  className,
}: AssetRatingCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            {assetName || "Asset Rating"}
          </CardTitle>
          {trend && (
            <TrendIcon className={cn("w-4 h-4", trendColor)} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Main rating gauge */}
          <div className="flex-shrink-0">
            {overallScore !== null && overallScore !== undefined ? (
              <RatingGauge
                score={overallScore}
                grade={overallGrade || undefined}
                zone={overallZone || undefined}
                size="md"
                label="Overall"
              />
            ) : (
              <div className="w-[120px] h-[120px] flex items-center justify-center bg-muted/20 rounded-full">
                <span className="text-muted-foreground text-sm">No data</span>
              </div>
            )}
          </div>

          {/* Rating breakdown */}
          <div className="flex-1 space-y-3">
            {/* FCI Rating */}
            {(fciScore !== null && fciScore !== undefined) && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">FCI</span>
                <div className="flex items-center gap-2">
                  {fciGrade && <LetterGradeBadge grade={fciGrade} size="sm" />}
                  {fciZone && <ZoneDot zone={fciZone} size="sm" />}
                  <span className="text-sm font-medium w-12 text-right">
                    {fciScore.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Condition Rating */}
            {(conditionScore !== null && conditionScore !== undefined) && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Condition</span>
                <div className="flex items-center gap-2">
                  {conditionGrade && <LetterGradeBadge grade={conditionGrade} size="sm" />}
                  {conditionZone && <ZoneDot zone={conditionZone} size="sm" />}
                  <span className="text-sm font-medium w-12 text-right">
                    {conditionScore.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* ESG Rating */}
            {(esgScore !== null && esgScore !== undefined) && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ESG</span>
                <div className="flex items-center gap-2">
                  {esgGrade && <LetterGradeBadge grade={esgGrade} size="sm" />}
                  {esgZone && <ZoneDot zone={esgZone} size="sm" />}
                  <span className="text-sm font-medium w-12 text-right">
                    {esgScore.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {lastCalculatedAt && (
          <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
            Last updated: {new Date(lastCalculatedAt).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ProjectRatingCardProps {
  projectName?: string;
  portfolioScore?: number | null;
  portfolioGrade?: string | null;
  portfolioZone?: Zone | null;
  avgFciScore?: number | null;
  avgConditionScore?: number | null;
  avgEsgScore?: number | null;
  zoneDistribution?: Record<Zone, number> | null;
  totalAssets?: number;
  assessedAssets?: number;
  lastCalculatedAt?: string | null;
  className?: string;
}

export function ProjectRatingCard({
  projectName,
  portfolioScore,
  portfolioGrade,
  portfolioZone,
  avgFciScore,
  avgConditionScore,
  avgEsgScore,
  zoneDistribution,
  totalAssets = 0,
  assessedAssets = 0,
  lastCalculatedAt,
  className,
}: ProjectRatingCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
          {projectName || "Portfolio Rating"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main rating display */}
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              {portfolioScore !== null && portfolioScore !== undefined ? (
                <RatingGauge
                  score={portfolioScore}
                  grade={portfolioGrade || undefined}
                  zone={portfolioZone || undefined}
                  size="md"
                  label="Portfolio"
                />
              ) : (
                <div className="w-[120px] h-[120px] flex items-center justify-center bg-muted/20 rounded-full">
                  <span className="text-muted-foreground text-sm">No data</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3">
              {/* Average scores */}
              {avgFciScore !== null && avgFciScore !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg FCI</span>
                  <span className="text-sm font-medium">{avgFciScore.toFixed(1)}%</span>
                </div>
              )}
              {avgConditionScore !== null && avgConditionScore !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Condition</span>
                  <span className="text-sm font-medium">{avgConditionScore.toFixed(1)}%</span>
                </div>
              )}
              {avgEsgScore !== null && avgEsgScore !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg ESG</span>
                  <span className="text-sm font-medium">{avgEsgScore.toFixed(1)}%</span>
                </div>
              )}

              {/* Asset coverage */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Coverage</span>
                <span className="text-sm font-medium">
                  {assessedAssets} / {totalAssets} assets
                </span>
              </div>
            </div>
          </div>

          {/* Zone distribution */}
          {zoneDistribution && (
            <div className="pt-3 border-t">
              <div className="text-sm text-muted-foreground mb-2">Zone Distribution</div>
              <ZoneDistributionBar distribution={zoneDistribution} />
            </div>
          )}

          {lastCalculatedAt && (
            <div className="pt-3 border-t text-xs text-muted-foreground">
              Last updated: {new Date(lastCalculatedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact rating summary for lists
export function RatingSummaryCompact({
  grade,
  zone,
  score,
  label,
  className,
}: {
  grade?: string | null;
  zone?: Zone | null;
  score?: number | null;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {zone && <ZoneDot zone={zone} />}
      {grade && <LetterGradeBadge grade={grade} size="sm" />}
      {score !== null && score !== undefined && (
        <span className="text-sm text-muted-foreground">
          {score.toFixed(0)}%
        </span>
      )}
      {label && (
        <span className="text-xs text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}
