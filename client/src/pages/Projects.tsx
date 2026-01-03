import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { FolderKanban, Calendar, DollarSign, Building2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Projects() {
  const [municipalityFilter, setMunicipalityFilter] = useState<string>("all");
  
  const { data: municipalities } = trpc.municipalities.list.useQuery();
  const { data: projects, isLoading } = trpc.projects.list.useQuery(
    municipalityFilter !== "all" ? { municipalityId: parseInt(municipalityFilter) } : undefined
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      in_progress: "default",
      under_review: "secondary",
      completed: "default",
      archived: "outline",
    };
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-700",
      in_progress: "bg-blue-100 text-blue-700",
      under_review: "bg-yellow-100 text-yellow-700",
      completed: "bg-green-100 text-green-700",
      archived: "bg-slate-100 text-slate-700",
    };
    return (
      <Badge className={colors[status] || colors.draft}>
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string | null) => {
    const colors: Record<string, string> = {
      low: "bg-gray-100 text-gray-600",
      medium: "bg-blue-100 text-blue-600",
      high: "bg-orange-100 text-orange-600",
      critical: "bg-red-100 text-red-600",
    };
    return priority ? (
      <Badge className={colors[priority] || colors.medium} variant="outline">
        {priority}
      </Badge>
    ) : null;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount: string | null) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">
              Building condition assessment projects
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={municipalityFilter} onValueChange={setMunicipalityFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by municipality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Municipalities</SelectItem>
                {municipalities?.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-1/3 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {projects?.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                          <FolderKanban className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs">{project.projectNumber}</span>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(project.status)}
                        {getPriorityBadge(project.priority)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {project.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {formatDate(project.dueDate)}</span>
                        </div>
                      )}
                      {project.budget && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>Budget: {formatCurrency(project.budget)}</span>
                        </div>
                      )}
                      {project.clientContact && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          <span>{project.clientContact}</span>
                        </div>
                      )}
                    </div>
                    {project.description && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && (!projects || projects.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No projects found</h3>
              <p className="text-muted-foreground text-sm">
                {municipalityFilter !== "all" 
                  ? "No projects found for the selected municipality."
                  : "Projects will appear here once created."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
