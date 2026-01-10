import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Sparkles,
  Leaf,
  Droplets,
  Zap,
  Recycle,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Target,
  TrendingUp,
  Save,
  RefreshCw,
  Loader2,
  Award,
  ChevronRight,
} from "lucide-react";

interface LEEDCreditSuggestionsProps {
  projectId: number;
  projectName?: string;
  className?: string;
}

// Category icons and colors
const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  EA: { icon: <Zap className="w-4 h-4" />, color: "text-amber-600", bgColor: "bg-amber-100" },
  WE: { icon: <Droplets className="w-4 h-4" />, color: "text-blue-600", bgColor: "bg-blue-100" },
  MR: { icon: <Recycle className="w-4 h-4" />, color: "text-green-600", bgColor: "bg-green-100" },
  EQ: { icon: <Building2 className="w-4 h-4" />, color: "text-purple-600", bgColor: "bg-purple-100" },
  SS: { icon: <Leaf className="w-4 h-4" />, color: "text-emerald-600", bgColor: "bg-emerald-100" },
  LT: { icon: <Building2 className="w-4 h-4" />, color: "text-indigo-600", bgColor: "bg-indigo-100" },
  IP: { icon: <Target className="w-4 h-4" />, color: "text-rose-600", bgColor: "bg-rose-100" },
  IN: { icon: <Sparkles className="w-4 h-4" />, color: "text-pink-600", bgColor: "bg-pink-100" },
  RP: { icon: <Award className="w-4 h-4" />, color: "text-cyan-600", bgColor: "bg-cyan-100" },
};

const CONFIDENCE_CONFIG = {
  high: { color: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "High Confidence" },
  medium: { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Medium Confidence" },
  low: { color: "bg-gray-100 text-gray-700 border-gray-200", label: "Low Confidence" },
};

const STATUS_CONFIG = {
  achievable: { color: "text-emerald-600", icon: <CheckCircle2 className="w-4 h-4" />, label: "Achievable" },
  partially_achievable: { color: "text-amber-600", icon: <Clock className="w-4 h-4" />, label: "Partially Achievable" },
  needs_work: { color: "text-red-600", icon: <AlertCircle className="w-4 h-4" />, label: "Needs Work" },
};

const EFFORT_CONFIG = {
  low: { color: "bg-emerald-100 text-emerald-700", label: "Low Effort" },
  medium: { color: "bg-amber-100 text-amber-700", label: "Medium Effort" },
  high: { color: "bg-red-100 text-red-700", label: "High Effort" },
};

export default function LEEDCreditSuggestions({ projectId, projectName, className }: LEEDCreditSuggestionsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Fetch LEED credit suggestions
  const { data, isLoading, error, refetch } = trpc.esgLeed.getLeedCreditSuggestions.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Save suggestions mutation
  const saveMutation = trpc.esgLeed.saveLeedCreditSuggestions.useMutation({
    onSuccess: () => {
      toast.success("LEED credit suggestions saved to tracking!");
      setShowSaveDialog(false);
    },
    onError: (error) => {
      toast.error(`Failed to save suggestions: ${error.message}`);
    },
  });

  const handleSave = () => {
    if (data?.suggestions) {
      saveMutation.mutate({
        projectId,
        suggestions: data.suggestions,
      });
    }
  };

  // Group suggestions by category
  const groupedSuggestions = data?.suggestions?.reduce((acc, suggestion) => {
    const category = suggestion.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(suggestion);
    return acc;
  }, {} as Record<string, typeof data.suggestions>);

  // Calculate category totals
  const categoryTotals = groupedSuggestions
    ? Object.entries(groupedSuggestions).map(([category, suggestions]) => ({
        category,
        categoryName: suggestions[0]?.categoryName || category,
        totalPoints: suggestions.reduce((sum, s) => sum + s.suggestedPoints, 0),
        maxPoints: suggestions.reduce((sum, s) => sum + s.maxPoints, 0),
        creditCount: suggestions.length,
        highConfidenceCount: suggestions.filter(s => s.confidence === "high").length,
      }))
    : [];

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-red-600">Failed to load LEED credit suggestions</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                AI LEED Credit Suggestions
              </CardTitle>
              <CardDescription>
                AI-powered analysis of achievable LEED credits based on building performance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              {data?.suggestions && data.suggestions.length > 0 && (
                <Button size="sm" onClick={() => setShowSaveDialog(true)}>
                  <Save className="w-4 h-4 mr-2" />
                  Save to Tracking
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !data?.suggestions || data.suggestions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Leaf className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Suggestions Available</p>
              <p className="text-sm">
                Add more building performance data to receive LEED credit recommendations
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">
                    {data.totalPotentialPoints}
                  </div>
                  <div className="text-sm text-muted-foreground">Potential Points</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-600">
                    {data.recommendedCertificationLevel}
                  </div>
                  <div className="text-sm text-muted-foreground">Target Certification</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {data.suggestions.filter(s => s.confidence === "high").length}
                  </div>
                  <div className="text-sm text-muted-foreground">High Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {data.suggestions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Credits</div>
                </div>
              </div>

              {/* Summary Text */}
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                {data.summary}
              </p>

              {/* Category Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {categoryTotals.map(cat => {
                  const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.EA;
                  return (
                    <div
                      key={cat.category}
                      className={`p-3 rounded-lg border ${config.bgColor} border-opacity-50`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={config.color}>{config.icon}</span>
                        <span className="font-medium text-sm">{cat.category}</span>
                      </div>
                      <div className="text-lg font-bold">
                        {cat.totalPoints} / {cat.maxPoints}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {cat.creditCount} credits
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Credit Details Accordion */}
              <Accordion type="multiple" className="space-y-2">
                {Object.entries(groupedSuggestions || {}).map(([category, suggestions]) => {
                  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.EA;
                  const categoryTotal = suggestions.reduce((sum, s) => sum + s.suggestedPoints, 0);
                  const categoryMax = suggestions.reduce((sum, s) => sum + s.maxPoints, 0);

                  return (
                    <AccordionItem key={category} value={category} className="border rounded-lg">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center gap-3 w-full">
                          <div className={`p-2 rounded-lg ${config.bgColor}`}>
                            <span className={config.color}>{config.icon}</span>
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-medium">
                              {suggestions[0]?.categoryName || category}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {suggestions.length} credits • {categoryTotal} points achievable
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mr-4">
                            <Progress value={(categoryTotal / categoryMax) * 100} className="w-24 h-2" />
                            <span className="text-sm font-medium">
                              {Math.round((categoryTotal / categoryMax) * 100)}%
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3">
                          {suggestions.map((suggestion, idx) => {
                            const statusConfig = STATUS_CONFIG[suggestion.currentStatus];
                            const confidenceConfig = CONFIDENCE_CONFIG[suggestion.confidence];
                            const effortConfig = EFFORT_CONFIG[suggestion.estimatedEffort];

                            return (
                              <div
                                key={idx}
                                className="p-4 bg-muted/30 rounded-lg border"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="font-mono">
                                        {suggestion.creditCode}
                                      </Badge>
                                      <span className="font-medium">{suggestion.creditName}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {suggestion.rationale}
                                    </p>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      <Badge variant="outline" className={confidenceConfig.color}>
                                        {suggestion.confidenceScore}% {confidenceConfig.label}
                                      </Badge>
                                      <Badge variant="outline" className={effortConfig.color}>
                                        {effortConfig.label}
                                      </Badge>
                                      {suggestion.estimatedCost && (
                                        <Badge variant="outline" className="bg-gray-100">
                                          <DollarSign className="w-3 h-3 mr-1" />
                                          {suggestion.estimatedCost}
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Required Actions */}
                                    {suggestion.requiredActions.length > 0 && (
                                      <div className="mt-2">
                                        <div className="text-xs font-medium text-muted-foreground mb-1">
                                          Required Actions:
                                        </div>
                                        <ul className="text-sm space-y-1">
                                          {suggestion.requiredActions.map((action, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                              <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                              {action}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>

                                  {/* Points */}
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-emerald-600">
                                      {suggestion.suggestedPoints}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      of {suggestion.maxPoints} pts
                                    </div>
                                    <div className={`flex items-center gap-1 mt-2 ${statusConfig.color}`}>
                                      {statusConfig.icon}
                                      <span className="text-xs">{statusConfig.label}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save LEED Credit Suggestions</DialogTitle>
            <DialogDescription>
              This will add {data?.suggestions?.length || 0} credit suggestions to your project's LEED tracking.
              You can then track progress toward each credit.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-emerald-600" />
              <div>
                <div className="font-medium">
                  {data?.totalPotentialPoints} Potential Points
                </div>
                <div className="text-sm text-muted-foreground">
                  Target: {data?.recommendedCertificationLevel} Certification
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save to Tracking
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
