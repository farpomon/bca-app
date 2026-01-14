import React, { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Search, Loader2, AlertCircle, RefreshCw, Plus, Layers, Filter, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";

// UNIFORMAT System Groups
const SYSTEM_GROUPS = [
  { code: "A", name: "Substructure" },
  { code: "B", name: "Shell" },
  { code: "C", name: "Interiors" },
  { code: "D", name: "Services" },
  { code: "E", name: "Equipment & Furnishings" },
  { code: "F", name: "Special Construction" },
  { code: "G", name: "Building Sitework" },
];

// Highlight matched text in search results
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  
  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// Get system group info from component code
function getSystemGroup(code: string): { code: string; name: string } | undefined {
  const firstChar = code.charAt(0).toUpperCase();
  return SYSTEM_GROUPS.find(g => g.code === firstChar);
}

// Get level from component code
function getComponentLevel(code: string): number {
  // Level 1: Single letter (A, B, C...)
  // Level 2: Letter + 2 digits (A10, B20...)
  // Level 3: Letter + 4 digits (A1010, B2010...)
  if (/^[A-G]$/.test(code)) return 1;
  if (/^[A-G]\d{2}$/.test(code)) return 2;
  if (/^[A-G]\d{4}$/.test(code)) return 3;
  return 3; // Default to level 3 for custom components
}

interface ComponentSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectComponent: (code: string, name: string) => void;
  assetId: number;
  projectId: number;
  existingAssessments?: Array<{ componentCode: string | null }>;
  onOpenExistingAssessment?: (componentCode: string) => void;
  onCreateCustomComponent?: () => void;
  onBulkAdd?: (components: Array<{ code: string; name: string }>) => void;
}

export function ComponentSelectorDialog({
  open,
  onOpenChange,
  onSelectComponent,
  assetId,
  projectId,
  existingAssessments = [],
  onOpenExistingAssessment,
  onCreateCustomComponent,
  onBulkAdd,
}: ComponentSelectorDialogProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [systemGroupFilter, setSystemGroupFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set());
  
  // Duplicate detection modal
  const [duplicateComponent, setDuplicateComponent] = useState<{ code: string; name: string } | null>(null);
  
  // Query components
  const { 
    data: components, 
    isLoading, 
    isError, 
    refetch 
  } = trpc.components.search.useQuery(
    { 
      query: searchTerm,
      level: levelFilter !== "all" ? parseInt(levelFilter) : undefined,
      systemGroup: systemGroupFilter !== "all" ? systemGroupFilter : undefined,
      limit: 30,
      projectId,
    },
    { 
      enabled: open,
      staleTime: 30000, // Cache for 30 seconds
    }
  );
  
  // Check if component already has an assessment
  const existingComponentCodes = useMemo(() => {
    return new Set(existingAssessments.map(a => a.componentCode).filter(Boolean));
  }, [existingAssessments]);
  
  const hasExistingAssessment = useCallback((code: string) => {
    return existingComponentCodes.has(code);
  }, [existingComponentCodes]);
  
  // Handle component selection
  const handleSelectComponent = (code: string, name: string) => {
    if (bulkMode) {
      // Toggle selection in bulk mode
      const newSelected = new Set(selectedComponents);
      if (newSelected.has(code)) {
        newSelected.delete(code);
      } else {
        newSelected.add(code);
      }
      setSelectedComponents(newSelected);
    } else {
      // Check for duplicate
      if (hasExistingAssessment(code)) {
        setDuplicateComponent({ code, name });
      } else {
        onSelectComponent(code, name);
        handleClose();
      }
    }
  };
  
  // Handle bulk add
  const handleBulkAdd = () => {
    if (onBulkAdd && selectedComponents.size > 0 && components) {
      const selectedItems = components
        .filter((c: any) => selectedComponents.has(c.code))
        .map((c: any) => ({ code: c.code, name: c.name }));
      onBulkAdd(selectedItems);
      handleClose();
    }
  };
  
  // Handle close
  const handleClose = () => {
    setSearchTerm("");
    setLevelFilter("all");
    setSystemGroupFilter("all");
    setShowFilters(false);
    setBulkMode(false);
    setSelectedComponents(new Set());
    setDuplicateComponent(null);
    onOpenChange(false);
  };
  
  // Clear filters
  const clearFilters = () => {
    setLevelFilter("all");
    setSystemGroupFilter("all");
  };
  
  const hasActiveFilters = levelFilter !== "all" || systemGroupFilter !== "all";
  
  return (
    <>
      <Dialog open={open && !duplicateComponent} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Select Component to Assess
            </DialogTitle>
            <DialogDescription>
              Search for a UNIFORMAT II component to create a new assessment
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 py-4 space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code or name (e.g., C3020, floor, furnishings)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Filters */}
            {showFilters && (
              <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Level:</span>
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="1">Level 1</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">System:</span>
                  <Select value={systemGroupFilter} onValueChange={setSystemGroupFilter}>
                    <SelectTrigger className="w-48 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Systems</SelectItem>
                      {SYSTEM_GROUPS.map(group => (
                        <SelectItem key={group.code} value={group.code}>
                          {group.code} - {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            )}
            
            {/* Results List */}
            <div className="flex-1 overflow-y-auto border rounded-lg min-h-[300px]">
              {isLoading ? (
                // Loading skeleton
                <div className="divide-y">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-3 flex items-center gap-3">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                // Error state
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                  <p className="text-muted-foreground mb-4">
                    Couldn't load component library
                  </p>
                  <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : components && components.length > 0 ? (
                // Results
                <div className="divide-y">
                  {components.map((component: any) => {
                    const systemGroup = getSystemGroup(component.code);
                    const level = component.level || getComponentLevel(component.code);
                    const isDuplicate = hasExistingAssessment(component.code);
                    const isSelected = selectedComponents.has(component.code);
                    
                    return (
                      <button
                        key={component.code}
                        onClick={() => handleSelectComponent(component.code, component.name)}
                        className={cn(
                          "w-full p-3 text-left hover:bg-accent transition-colors flex items-start gap-3",
                          isSelected && "bg-primary/10",
                          isDuplicate && "bg-amber-50 dark:bg-amber-950/20"
                        )}
                      >
                        {bulkMode && (
                          <Checkbox
                            checked={isSelected}
                            className="mt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-semibold text-primary">
                              <HighlightedText text={component.code} highlight={searchTerm} />
                            </span>
                            <span className="text-foreground">
                              <HighlightedText text={component.name} highlight={searchTerm} />
                            </span>
                            {component.isCustom && (
                              <Badge variant="secondary" className="text-xs">Custom</Badge>
                            )}
                            {isDuplicate && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                Assessed
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            {systemGroup && (
                              <span>Group: {systemGroup.code} {systemGroup.name}</span>
                            )}
                            <span>•</span>
                            <span>Level {level}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : searchTerm || hasActiveFilters ? (
                // No results
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    No components found
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try "C3020" or "floor finishes"
                  </p>
                </div>
              ) : (
                // Initial state
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Layers className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    Start typing to search for components
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Search by UNIFORMAT code or component name
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Footer with Quick Actions */}
          <DialogFooter className="px-6 py-4 border-t bg-muted/30 flex-row justify-between">
            <div className="flex gap-2">
              {isAdmin && onCreateCustomComponent && (
                <Button variant="outline" size="sm" onClick={onCreateCustomComponent}>
                  <Plus className="h-4 w-4 mr-1" />
                  Custom Component
                </Button>
              )}
              {onBulkAdd && (
                <Button 
                  variant={bulkMode ? "secondary" : "outline"} 
                  size="sm" 
                  onClick={() => {
                    setBulkMode(!bulkMode);
                    setSelectedComponents(new Set());
                  }}
                >
                  {bulkMode ? "Cancel Bulk" : "Bulk Add"}
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {bulkMode && selectedComponents.size > 0 && (
                <Button onClick={handleBulkAdd}>
                  Add {selectedComponents.size} Components
                </Button>
              )}
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Duplicate Detection Modal */}
      <Dialog open={!!duplicateComponent} onOpenChange={() => setDuplicateComponent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Component Already Assessed
            </DialogTitle>
            <DialogDescription>
              This component already has an assessment for this asset.
            </DialogDescription>
          </DialogHeader>
          
          {duplicateComponent && (
            <div className="py-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">
                  {duplicateComponent.code} - {duplicateComponent.name}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {onOpenExistingAssessment && duplicateComponent && (
              <Button 
                variant="default"
                onClick={() => {
                  onOpenExistingAssessment(duplicateComponent.code);
                  setDuplicateComponent(null);
                  handleClose();
                }}
              >
                Open Existing Assessment
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={() => {
                if (duplicateComponent) {
                  onSelectComponent(duplicateComponent.code, duplicateComponent.name);
                  setDuplicateComponent(null);
                  handleClose();
                }
              }}
            >
              Create New Anyway
            </Button>
            <Button variant="ghost" onClick={() => setDuplicateComponent(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ComponentSelectorDialog;
