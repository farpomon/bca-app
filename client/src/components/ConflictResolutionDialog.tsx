/**
 * Conflict Resolution Dialog
 * 
 * UI for resolving sync conflicts between local and server data.
 * Shows side-by-side comparison and allows user to choose resolution strategy.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Cloud,
  Smartphone,
  Merge,
  Clock,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface ConflictField {
  field: string;
  label: string;
  localValue: unknown;
  serverValue: unknown;
  baseValue?: unknown;
}

export interface SyncConflict {
  id: string;
  entityType: "assessment" | "photo" | "deficiency";
  entityId: string;
  localTimestamp: number;
  serverTimestamp: number;
  fields: ConflictField[];
}

export type ResolutionStrategy = "keep_local" | "keep_server" | "merge" | "manual";

export interface ConflictResolution {
  conflictId: string;
  strategy: ResolutionStrategy;
  resolvedData?: Record<string, unknown>;
}

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: SyncConflict[];
  onResolve: (resolutions: ConflictResolution[]) => Promise<void>;
}

// ============================================================================
// Main Component
// ============================================================================

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflicts,
  onResolve,
}: ConflictResolutionDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());
  const [isResolving, setIsResolving] = useState(false);
  const [manualSelections, setManualSelections] = useState<Map<string, "local" | "server">>(new Map());

  const currentConflict = conflicts[currentIndex];
  const totalConflicts = conflicts.length;
  const resolvedCount = resolutions.size;

  const handleSelectStrategy = (strategy: ResolutionStrategy) => {
    if (!currentConflict) return;

    let resolvedData: Record<string, unknown> | undefined;

    if (strategy === "manual") {
      // Build resolved data from manual selections
      resolvedData = {};
      for (const field of currentConflict.fields) {
        const selection = manualSelections.get(`${currentConflict.id}-${field.field}`);
        resolvedData[field.field] = selection === "server" ? field.serverValue : field.localValue;
      }
    } else if (strategy === "merge") {
      // Auto-merge: prefer newer values for each field
      resolvedData = {};
      for (const field of currentConflict.fields) {
        // If local is newer, use local; otherwise use server
        resolvedData[field.field] = currentConflict.localTimestamp > currentConflict.serverTimestamp
          ? field.localValue
          : field.serverValue;
      }
    }

    setResolutions(prev => {
      const next = new Map(prev);
      next.set(currentConflict.id, {
        conflictId: currentConflict.id,
        strategy,
        resolvedData,
      });
      return next;
    });

    // Move to next conflict
    if (currentIndex < totalConflicts - 1) {
      setCurrentIndex(currentIndex + 1);
      setManualSelections(new Map());
    }
  };

  const handleManualFieldSelect = (field: string, source: "local" | "server") => {
    if (!currentConflict) return;
    setManualSelections(prev => {
      const next = new Map(prev);
      next.set(`${currentConflict.id}-${field}`, source);
      return next;
    });
  };

  const handleResolveAll = async () => {
    setIsResolving(true);
    try {
      await onResolve(Array.from(resolutions.values()));
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to resolve conflicts:", error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleKeepAllLocal = () => {
    const allResolutions = conflicts.map(conflict => ({
      conflictId: conflict.id,
      strategy: "keep_local" as ResolutionStrategy,
    }));
    setResolutions(new Map(allResolutions.map(r => [r.conflictId, r])));
  };

  const handleKeepAllServer = () => {
    const allResolutions = conflicts.map(conflict => ({
      conflictId: conflict.id,
      strategy: "keep_server" as ResolutionStrategy,
    }));
    setResolutions(new Map(allResolutions.map(r => [r.conflictId, r])));
  };

  if (!currentConflict) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Sync Conflicts Detected
          </DialogTitle>
          <DialogDescription>
            {totalConflicts} conflict{totalConflicts > 1 ? "s" : ""} found. 
            Choose how to resolve each conflict.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(resolvedCount / totalConflicts) * 100}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {resolvedCount} / {totalConflicts} resolved
          </span>
        </div>

        {/* Conflict Navigation */}
        <div className="flex items-center justify-between py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {currentConflict.entityType}
            </Badge>
            <span className="text-sm">
              Conflict {currentIndex + 1} of {totalConflicts}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex(Math.min(totalConflicts - 1, currentIndex + 1))}
            disabled={currentIndex === totalConflicts - 1}
          >
            Next
          </Button>
        </div>

        <Separator />

        {/* Conflict Details */}
        <ScrollArea className="flex-1 min-h-[300px]">
          <div className="space-y-4 p-1">
            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4" />
                <span className="text-muted-foreground">Local:</span>
                <span>{new Date(currentConflict.localTimestamp).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Cloud className="h-4 w-4" />
                <span className="text-muted-foreground">Server:</span>
                <span>{new Date(currentConflict.serverTimestamp).toLocaleString()}</span>
              </div>
            </div>

            {/* Field Comparison */}
            <Tabs defaultValue="side-by-side">
              <TabsList>
                <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
                <TabsTrigger value="manual">Manual Selection</TabsTrigger>
              </TabsList>

              <TabsContent value="side-by-side" className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Local Column */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Smartphone className="h-4 w-4" />
                      Local Version
                    </div>
                    {currentConflict.fields.map((field) => (
                      <div
                        key={field.field}
                        className={cn(
                          "p-3 rounded-lg border",
                          JSON.stringify(field.localValue) !== JSON.stringify(field.serverValue)
                            ? "border-yellow-500/50 bg-yellow-500/5"
                            : "border-border"
                        )}
                      >
                        <p className="text-xs text-muted-foreground mb-1">{field.label}</p>
                        <p className="text-sm break-words">
                          {formatValue(field.localValue)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Server Column */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Cloud className="h-4 w-4" />
                      Server Version
                    </div>
                    {currentConflict.fields.map((field) => (
                      <div
                        key={field.field}
                        className={cn(
                          "p-3 rounded-lg border",
                          JSON.stringify(field.localValue) !== JSON.stringify(field.serverValue)
                            ? "border-yellow-500/50 bg-yellow-500/5"
                            : "border-border"
                        )}
                      >
                        <p className="text-xs text-muted-foreground mb-1">{field.label}</p>
                        <p className="text-sm break-words">
                          {formatValue(field.serverValue)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="mt-4">
                <div className="space-y-3">
                  {currentConflict.fields
                    .filter(f => JSON.stringify(f.localValue) !== JSON.stringify(f.serverValue))
                    .map((field) => {
                      const selection = manualSelections.get(`${currentConflict.id}-${field.field}`);
                      return (
                        <div key={field.field} className="border rounded-lg p-4">
                          <p className="font-medium mb-3">{field.label}</p>
                          <div className="grid grid-cols-2 gap-4">
                            <button
                              onClick={() => handleManualFieldSelect(field.field, "local")}
                              className={cn(
                                "p-3 rounded-lg border text-left transition-all",
                                selection === "local"
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Smartphone className="h-4 w-4" />
                                <span className="text-sm font-medium">Local</span>
                                {selection === "local" && (
                                  <Check className="h-4 w-4 text-primary ml-auto" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground break-words">
                                {formatValue(field.localValue)}
                              </p>
                            </button>
                            <button
                              onClick={() => handleManualFieldSelect(field.field, "server")}
                              className={cn(
                                "p-3 rounded-lg border text-left transition-all",
                                selection === "server"
                                  ? "border-primary bg-primary/10"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Cloud className="h-4 w-4" />
                                <span className="text-sm font-medium">Server</span>
                                {selection === "server" && (
                                  <Check className="h-4 w-4 text-primary ml-auto" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground break-words">
                                {formatValue(field.serverValue)}
                              </p>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <Separator />

        {/* Resolution Actions */}
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              onClick={() => handleSelectStrategy("keep_local")}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Smartphone className="h-5 w-5" />
              <span className="text-xs">Keep Local</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSelectStrategy("keep_server")}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Cloud className="h-5 w-5" />
              <span className="text-xs">Keep Server</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSelectStrategy("merge")}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Merge className="h-5 w-5" />
              <span className="text-xs">Auto Merge</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSelectStrategy("manual")}
              disabled={
                currentConflict.fields
                  .filter(f => JSON.stringify(f.localValue) !== JSON.stringify(f.serverValue))
                  .some(f => !manualSelections.has(`${currentConflict.id}-${f.field}`))
              }
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Check className="h-5 w-5" />
              <span className="text-xs">Use Selection</span>
            </Button>
          </div>

          <Separator />

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleKeepAllLocal}>
                Keep All Local
              </Button>
              <Button variant="ghost" size="sm" onClick={handleKeepAllServer}>
                Keep All Server
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleResolveAll}
                disabled={resolvedCount < totalConflicts || isResolving}
              >
                {isResolving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resolving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Resolve All ({resolvedCount}/{totalConflicts})
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "(empty)";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    return value.toLocaleString();
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

export default ConflictResolutionDialog;
