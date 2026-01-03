import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Warehouse, MapPin, Calendar, Building } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";

export default function Assets() {
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: projects } = trpc.projects.list.useQuery();
  const { data: assets, isLoading } = trpc.assets.list.useQuery(
    projectFilter !== "all" ? { projectId: parseInt(projectFilter) } : undefined
  );

  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    if (!searchQuery) return assets;
    
    const query = searchQuery.toLowerCase();
    return assets.filter(({ asset }) => 
      asset.name.toLowerCase().includes(query) ||
      asset.assetCode.toLowerCase().includes(query) ||
      asset.address?.toLowerCase().includes(query)
    );
  }, [assets, searchQuery]);

  const getConditionBadge = (condition: string | null) => {
    const colors: Record<string, string> = {
      excellent: "bg-emerald-100 text-emerald-700",
      good: "bg-green-100 text-green-700",
      fair: "bg-yellow-100 text-yellow-700",
      poor: "bg-orange-100 text-orange-700",
      critical: "bg-red-100 text-red-700",
    };
    return condition ? (
      <Badge className={colors[condition] || "bg-gray-100 text-gray-700"}>
        {condition}
      </Badge>
    ) : (
      <Badge variant="outline">Not assessed</Badge>
    );
  };

  const formatNumber = (num: string | null) => {
    if (!num) return null;
    return parseFloat(num).toLocaleString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
            <p className="text-muted-foreground">
              Buildings and facilities being assessed
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[200px]"
            />
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAssets.map(({ asset, category }) => (
              <Link key={asset.id} href={`/assets/${asset.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Warehouse className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate">{asset.name}</CardTitle>
                          <CardDescription className="font-mono text-xs">
                            {asset.assetCode}
                          </CardDescription>
                        </div>
                      </div>
                      {getConditionBadge(asset.overallCondition)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {category && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building className="h-4 w-4 shrink-0" />
                          <span className="truncate">{category.name}</span>
                        </div>
                      )}
                      {asset.address && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="truncate">{asset.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-muted-foreground">
                        {asset.yearBuilt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Built {asset.yearBuilt}</span>
                          </div>
                        )}
                        {asset.squareFootage && (
                          <span>{formatNumber(asset.squareFootage)} SF</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && filteredAssets.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Warehouse className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No assets found</h3>
              <p className="text-muted-foreground text-sm text-center">
                {searchQuery 
                  ? "No assets match your search criteria."
                  : projectFilter !== "all"
                    ? "No assets found for the selected project."
                    : "Assets will appear here once added to projects."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
