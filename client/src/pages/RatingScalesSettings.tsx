import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function RatingScalesSettings() {
  const { data: scales, isLoading } = trpc.ratings.scales.list.useQuery();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const scalesByType = {
    fci: scales?.filter(s => s.type === "fci") || [],
    ci: scales?.filter(s => s.type === "ci") || [],
    condition: scales?.filter(s => s.type === "condition") || [],
    priority: scales?.filter(s => s.type === "priority") || [],
    custom: scales?.filter(s => s.type === "custom") || [],
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rating Scales</h1>
          <p className="text-muted-foreground mt-2">
            View and manage condition rating scales used across projects
          </p>
        </div>

        {/* FCI Scales */}
        <Card>
          <CardHeader>
            <CardTitle>Facility Condition Index (FCI) Scales</CardTitle>
            <CardDescription>
              Scales for calculating overall facility condition (0-100%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scalesByType.fci.map((scale) => {
              const items = JSON.parse(scale.scaleItems);
              return (
                <div key={scale.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{scale.name}</h3>
                      <p className="text-sm text-muted-foreground">{scale.description}</p>
                    </div>
                    {scale.isDefault && (
                      <Badge variant="default">Default</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 border rounded text-center"
                        style={{ borderColor: item.color }}
                      >
                        <div className="font-semibold text-sm">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* CI Scales */}
        <Card>
          <CardHeader>
            <CardTitle>Condition Index (CI) Scales</CardTitle>
            <CardDescription>
              Numerical scales for component condition assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scalesByType.ci.map((scale) => {
              const items = JSON.parse(scale.scaleItems);
              return (
                <div key={scale.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{scale.name}</h3>
                      <p className="text-sm text-muted-foreground">{scale.description}</p>
                    </div>
                    {scale.isDefault && (
                      <Badge variant="default">Default</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {items.slice(0, 10).map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2 border rounded text-center"
                        style={{ borderColor: item.color }}
                      >
                        <div className="font-bold text-lg">{item.value}</div>
                        <div className="font-semibold text-xs">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Condition Scales */}
        <Card>
          <CardHeader>
            <CardTitle>Condition Rating Scales</CardTitle>
            <CardDescription>
              Qualitative scales for component condition
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scalesByType.condition.map((scale) => {
              const items = JSON.parse(scale.scaleItems);
              return (
                <div key={scale.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{scale.name}</h3>
                      <p className="text-sm text-muted-foreground">{scale.description}</p>
                    </div>
                    {scale.isDefault && (
                      <Badge variant="default">Default</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 border rounded text-center"
                        style={{ borderColor: item.color }}
                      >
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Priority Scales */}
        <Card>
          <CardHeader>
            <CardTitle>Deficiency Priority Scales</CardTitle>
            <CardDescription>
              Priority levels for deficiency remediation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scalesByType.priority.map((scale) => {
              const items = JSON.parse(scale.scaleItems);
              return (
                <div key={scale.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{scale.name}</h3>
                      <p className="text-sm text-muted-foreground">{scale.description}</p>
                    </div>
                    {scale.isDefault && (
                      <Badge variant="default">Default</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    {items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 border rounded text-center"
                        style={{ borderColor: item.color }}
                      >
                        <div className="font-bold text-lg">{item.value}</div>
                        <div className="font-semibold text-sm">{item.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
