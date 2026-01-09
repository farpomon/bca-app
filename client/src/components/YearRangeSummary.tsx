import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface YearlyData {
  year: number;
  totalAllocated: number;
  projectCount: number;
}

interface YearRangeSummaryProps {
  startYear: number;
  endYear: number;
  yearlyData: YearlyData[];
}

interface YearRange {
  label: string;
  startYear: number;
  endYear: number;
  years: number[];
}

function groupYearsIntoRanges(startYear: number, endYear: number): YearRange[] {
  const cycleDuration = endYear - startYear + 1;
  
  // For cycles <= 10 years, show all years individually
  if (cycleDuration <= 10) {
    return Array.from({ length: cycleDuration }, (_, i) => {
      const year = startYear + i;
      return {
        label: `Year ${i + 1} (${year})`,
        startYear: year,
        endYear: year,
        years: [year],
      };
    });
  }
  
  // For longer cycles, group into ranges
  const ranges: YearRange[] = [];
  
  // First 5 years individually
  for (let i = 0; i < 5; i++) {
    const year = startYear + i;
    ranges.push({
      label: `Year ${i + 1} (${year})`,
      startYear: year,
      endYear: year,
      years: [year],
    });
  }
  
  // Middle years in 5-year ranges
  let currentYear = startYear + 5;
  while (currentYear + 4 < endYear) {
    const rangeStart = currentYear;
    const rangeEnd = currentYear + 4;
    const years = Array.from({ length: 5 }, (_, i) => rangeStart + i);
    ranges.push({
      label: `Years ${rangeStart - startYear + 1}-${rangeEnd - startYear + 1} (${rangeStart}-${rangeEnd})`,
      startYear: rangeStart,
      endYear: rangeEnd,
      years,
    });
    currentYear += 5;
  }
  
  // Remaining years
  if (currentYear <= endYear) {
    const years = Array.from({ length: endYear - currentYear + 1 }, (_, i) => currentYear + i);
    ranges.push({
      label: `Years ${currentYear - startYear + 1}-${endYear - startYear + 1} (${currentYear}-${endYear})`,
      startYear: currentYear,
      endYear: endYear,
      years,
    });
  }
  
  return ranges;
}

export function YearRangeSummary({ startYear, endYear, yearlyData }: YearRangeSummaryProps) {
  const [expandedRanges, setExpandedRanges] = useState<Set<string>>(new Set());
  
  const ranges = groupYearsIntoRanges(startYear, endYear);
  const cycleDuration = endYear - startYear + 1;
  
  const toggleRange = (rangeLabel: string) => {
    setExpandedRanges((prev) => {
      const next = new Set(prev);
      if (next.has(rangeLabel)) {
        next.delete(rangeLabel);
      } else {
        next.add(rangeLabel);
      }
      return next;
    });
  };
  
  const getRangeTotal = (range: YearRange) => {
    return range.years.reduce((sum, year) => {
      const yearData = yearlyData.find((d) => d.year === year);
      return sum + (yearData?.totalAllocated || 0);
    }, 0);
  };
  
  const getRangeProjectCount = (range: YearRange) => {
    return range.years.reduce((sum, year) => {
      const yearData = yearlyData.find((d) => d.year === year);
      return sum + (yearData?.projectCount || 0);
    }, 0);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Summary by Year</CardTitle>
        <CardDescription>
          {cycleDuration <= 10
            ? "Annual allocation breakdown"
            : "Grouped allocation breakdown (expand ranges for details)"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Allocated Amount</TableHead>
              <TableHead className="text-center">Project Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranges.map((range) => {
              const isExpanded = expandedRanges.has(range.label);
              const isRange = range.years.length > 1;
              const rangeTotal = getRangeTotal(range);
              const rangeProjectCount = getRangeProjectCount(range);
              
              return (
                <>
                  <TableRow
                    key={range.label}
                    className={cn(
                      isRange && "cursor-pointer hover:bg-muted/50",
                      isExpanded && "bg-muted/30"
                    )}
                    onClick={() => isRange && toggleRange(range.label)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isRange && (
                          <>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </>
                        )}
                        <span>{range.label}</span>
                        {isRange && (
                          <Badge variant="outline" className="text-xs">
                            {range.years.length} years
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 0,
                      }).format(rangeTotal)}
                    </TableCell>
                    <TableCell className="text-center">{rangeProjectCount}</TableCell>
                  </TableRow>
                  
                  {/* Expanded year details */}
                  {isExpanded && isRange && (
                    <>
                      {range.years.map((year) => {
                        const yearData = yearlyData.find((d) => d.year === year);
                        return (
                          <TableRow key={`${range.label}-${year}`} className="bg-muted/10">
                            <TableCell className="pl-12 text-sm text-muted-foreground">
                              {year}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                                minimumFractionDigits: 0,
                              }).format(yearData?.totalAllocated || 0)}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {yearData?.projectCount || 0}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
