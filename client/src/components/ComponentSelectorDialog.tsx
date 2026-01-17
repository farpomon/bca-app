import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { Search, AlertCircle, RefreshCw, Plus, Layers, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
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
  if (/^[A-G]$/.test(code)) return 1;
  if (/^[A-G]\d{2}$/.test(code)) return 2;
  if (/^[A-G]\d{4}$/.test(code)) return 3;
  return 3;
}

interface ComponentSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectComponent: (code: string, name: string, uniformatId?: number, uniformatLevel?: number, uniformatGroup?: { code: string; name: string }) => void;
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
  const chipsContainerRef = useRef<HTMLDivElement>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [systemGroupFilter, setSystemGroupFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Bulk selection state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedComponents, setSelectedComponents] = useState<Set<string>>(new Set());
  
  // Duplicate detection modal
  const [duplicateComponent, setDuplicateComponent] = useState<{ code: string; name: string; id?: number; level?: number; group?: { code: string; name: string } } | null>(null);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 50;
  
  // Query components with pagination
  const { 
    data: searchResult, 
    isLoading, 
    isError, 
    refetch 
  } = trpc.components.search.useQuery(
    { 
      query: searchTerm,
      level: levelFilter !== "all" ? parseInt(levelFilter) : undefined,
      systemGroup: systemGroupFilter !== "all" ? systemGroupFilter : undefined,
      page,
      pageSize,
      projectId,
      assetId,
    },
    { 
      enabled: open,
      staleTime: 30000,
    }
  );
  
  // Extract components from paginated result
  const components = searchResult?.items || [];
  const totalCount = searchResult?.totalCount || 0;
  const totalPages = searchResult?.totalPages || 1;
  
  // Calculate showing range
  const showingStart = totalCount > 0 ? ((page - 1) * pageSize) + 1 : 0;
  const showingEnd = Math.min(page * pageSize, totalCount);
  
  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, levelFilter, systemGroupFilter]);
  
  // Lock body scroll when modal is open
  useEffect(() => {
    if (open && !duplicateComponent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, duplicateComponent]);
  
  // Check if component already has an assessment
  const existingComponentCodes = useMemo(() => {
    return new Set(existingAssessments.map(a => a.componentCode).filter(Boolean));
  }, [existingAssessments]);
  
  const hasExistingAssessment = useCallback((code: string) => {
    return existingComponentCodes.has(code);
  }, [existingComponentCodes]);
  
  // Handle component selection
  const handleSelectComponent = (component: any) => {
    const { code, name } = component;
    if (bulkMode) {
      const newSelected = new Set(selectedComponents);
      if (newSelected.has(code)) {
        newSelected.delete(code);
      } else {
        newSelected.add(code);
      }
      setSelectedComponents(newSelected);
    } else {
      if (hasExistingAssessment(code)) {
        setDuplicateComponent({ code, name, id: component.id, level: component.level, group: getSystemGroup(component.code) });
      } else {
        // Pass full component metadata including id, level, and group
        onSelectComponent(code, name, component.id, component.level, getSystemGroup(component.code));
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

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !duplicateComponent) {
        handleClose();
      }
    };
    
    if (open) {
      window.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open, duplicateComponent]);
  
  return (
    <>
      {/* Full-Screen Modal */}
      {open && !duplicateComponent && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background">
          {/* ===== STICKY HEADER ===== */}
          <div className="flex-shrink-0 border-b bg-background z-10">
            {/* Title Row */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Select Component to Assess</h2>
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    Search for a UNIFORMAT II component to create a new assessment
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleClose}
                className="h-10 w-10 rounded-full"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            
            {/* Controls Row */}
            <div className="px-4 sm:px-6 pb-4 space-y-3">
              {/* Group Quick Filters - Horizontally Scrollable */}
              <div 
                ref={chipsContainerRef}
                className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin"
              >
                <Button
                  variant={systemGroupFilter === "all" ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-4 text-sm shrink-0"
                  onClick={() => setSystemGroupFilter("all")}
                >
                  All
                </Button>
                {SYSTEM_GROUPS.map(group => (
                  <Button
                    key={group.code}
                    variant={systemGroupFilter === group.code ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-4 text-sm shrink-0"
                    onClick={() => setSystemGroupFilter(group.code)}
                    title={group.name}
                  >
                    {group.code} - {group.name}
                  </Button>
                ))}
              </div>
              
              {/* Search Input Row */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by code or name (e.g., C3020, floor, furnishings)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                    autoFocus
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setSearchTerm("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className="shrink-0 h-10 w-10"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Advanced Filters (Collapsible) */}
              {showFilters && (
                <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Level:</span>
                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                      <SelectTrigger className="w-32 h-9">
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
                  
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                      <X className="h-3 w-3 mr-1" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* ===== SCROLLABLE CONTENT AREA ===== */}
          <div className="flex-1 overflow-y-auto bg-muted/20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
              {isLoading ? (
                <div className="bg-background rounded-lg border divide-y">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="p-4 flex items-center gap-4">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 flex-1 max-w-md" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="bg-background rounded-lg border">
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                    <p className="text-lg font-medium mb-2">Couldn't load component library</p>
                    <p className="text-muted-foreground mb-6">
                      Please check your connection and try again
                    </p>
                    <Button variant="outline" onClick={() => refetch()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </div>
              ) : components && components.length > 0 ? (
                <div className="bg-background rounded-lg border divide-y">
                  {components.map((component: any) => {
                    const systemGroup = getSystemGroup(component.code);
                    const level = component.level || getComponentLevel(component.code);
                    const isDuplicate = hasExistingAssessment(component.code);
                    const isSelected = selectedComponents.has(component.code);
                    
                    return (
                      <button
                        key={component.code}
                        onClick={() => handleSelectComponent(component)}
                        className={cn(
                          "w-full p-4 text-left hover:bg-accent/50 transition-colors flex items-start gap-3",
                          isSelected && "bg-primary/5 border-l-2 border-l-primary",
                          isDuplicate && !isSelected && "bg-amber-50/50 dark:bg-amber-950/20"
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
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                            {systemGroup && (
                              <span className="inline-flex items-center">
                                <span className="font-medium">{systemGroup.code}</span>
                                <span className="mx-1">·</span>
                                <span>{systemGroup.name}</span>
                              </span>
                            )}
                            <span className="text-muted-foreground/60">•</span>
                            <span>Level {level}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {component.isCustom && (
                            <Badge variant="secondary" className="text-xs">Custom</Badge>
                          )}
                          {isDuplicate && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                              Assessed
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : searchTerm || hasActiveFilters ? (
                <div className="bg-background rounded-lg border">
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-lg font-medium mb-2">No components found</p>
                    <p className="text-muted-foreground">
                      Try searching for "C3020" or "floor finishes"
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-background rounded-lg border">
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Layers className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-lg font-medium mb-2">Loading component library...</p>
                    <p className="text-muted-foreground">
                      UNIFORMAT II classification system
                    </p>
                  </div>
                </div>
              )}
            </div>
            {/* Bottom padding to prevent content from being hidden behind footer */}
            <div className="h-4" />
          </div>
          
          {/* ===== STICKY FOOTER ===== */}
          <div className="flex-shrink-0 border-t bg-background z-10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Left: Showing count */}
                <div className="text-sm text-muted-foreground order-2 sm:order-1">
                  {totalCount > 0 ? (
                    <span>Showing {showingStart}–{showingEnd} of {totalCount} components</span>
                  ) : (
                    <span>&nbsp;</span>
                  )}
                </div>
                
                {/* Center: Pagination */}
                {totalCount > 0 && totalPages > 1 && (
                  <div className="flex items-center gap-1 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-8"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="px-3 text-sm font-medium">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="h-8"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
                
                {/* Right: Action buttons */}
                <div className="flex items-center gap-2 order-3">
                  {isAdmin && onCreateCustomComponent && (
                    <Button variant="outline" size="sm" onClick={onCreateCustomComponent} className="h-8">
                      <Plus className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Custom Component</span>
                      <span className="sm:hidden">Custom</span>
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
                      className="h-8"
                    >
                      {bulkMode ? "Cancel Bulk" : "Bulk Add"}
                    </Button>
                  )}
                  {bulkMode && selectedComponents.size > 0 && (
                    <Button onClick={handleBulkAdd} size="sm" className="h-8">
                      Add {selectedComponents.size} Components
                    </Button>
                  )}
                  <Button variant="ghost" onClick={handleClose} size="sm" className="h-8">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
                  onSelectComponent(duplicateComponent.code, duplicateComponent.name, duplicateComponent.id, duplicateComponent.level, duplicateComponent.group);
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
