import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUp, Edit } from "lucide-react";

interface RankedProject {
  projectId: number;
  projectName: string;
  compositeScore: number;
  rank: number;
  urgencyScore?: number;
  missionCriticalityScore?: number;
  safetyScore?: number;
  complianceScore?: number;
  energySavingsScore?: number;
  totalCost?: number;
  costEffectivenessScore?: number;
}

interface RankedProjectsListProps {
  rankedProjects: RankedProject[];
  onSelectProject: (projectId: number) => void;
}

export default function RankedProjectsList({ rankedProjects, onSelectProject }: RankedProjectsListProps) {
  if (rankedProjects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No projects have been scored yet.</p>
        <p className="text-sm mt-2">Use the "Score Projects" tab to begin prioritization.</p>
      </div>
    );
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-red-500";
    if (score >= 60) return "bg-orange-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-green-500";
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Project Name</TableHead>
            <TableHead className="text-center">Composite Score</TableHead>
            <TableHead className="text-center">Urgency</TableHead>
            <TableHead className="text-center">Mission Critical</TableHead>
            <TableHead className="text-center">Safety</TableHead>
            <TableHead className="text-center">Compliance</TableHead>
            <TableHead className="text-right">Total Cost</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankedProjects.map((project) => (
            <TableRow key={project.projectId}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    #{project.rank}
                  </Badge>
                  {project.rank <= 3 && <ArrowUp className="h-4 w-4 text-red-500" />}
                </div>
              </TableCell>
              <TableCell className="font-medium">{project.projectName}</TableCell>
              <TableCell className="text-center">
                <Badge className={getScoreBadgeColor(project.compositeScore)}>
                  {project.compositeScore.toFixed(1)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {project.urgencyScore ? project.urgencyScore.toFixed(1) : "—"}
              </TableCell>
              <TableCell className="text-center">
                {project.missionCriticalityScore ? project.missionCriticalityScore.toFixed(1) : "—"}
              </TableCell>
              <TableCell className="text-center">
                {project.safetyScore ? project.safetyScore.toFixed(1) : "—"}
              </TableCell>
              <TableCell className="text-center">
                {project.complianceScore ? project.complianceScore.toFixed(1) : "—"}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(project.totalCost)}</TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectProject(project.projectId)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="font-medium">Score Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Critical (80+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>High (60-79)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span>Medium (40-59)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>Low (&lt;40)</span>
        </div>
      </div>
    </div>
  );
}
