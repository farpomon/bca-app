/**
 * Offline Search Component
 * 
 * Provides search functionality for cached offline data including:
 * - Projects
 * - Assets
 * - Assessments
 * - Photos (by caption)
 */

import { useState, useCallback, useMemo } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Building2,
  FileText,
  Image,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import { getAllItems, STORES, getCachedProjects } from "@/lib/offlineStorage";
import { getCachedAssets } from "@/lib/offlineStorageOptimized";
import type {
  OfflineAssessment,
  OfflinePhoto,
  OfflineDeficiency,
  CachedProject,
} from "@/lib/offlineStorage";
import type { CachedAsset } from "@/lib/offlineStorageOptimized";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface SearchResult {
  id: string;
  type: "project" | "asset" | "assessment" | "photo" | "deficiency";
  title: string;
  subtitle?: string;
  status?: "pending" | "synced" | "failed" | "syncing";
  projectId?: number;
  assetId?: number;
  timestamp?: number;
}

// ============================================================================
// Hook for Offline Search
// ============================================================================

export function useOfflineSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState("");

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const normalizedQuery = searchQuery.toLowerCase().trim();

    try {
      const searchResults: SearchResult[] = [];

      // Search cached projects
      const projects = await getCachedProjects();
      for (const project of projects) {
        if (
          project.name.toLowerCase().includes(normalizedQuery) ||
          project.address?.toLowerCase().includes(normalizedQuery) ||
          project.clientName?.toLowerCase().includes(normalizedQuery)
        ) {
          searchResults.push({
            id: `project-${project.id}`,
            type: "project",
            title: project.name,
            subtitle: project.address || project.clientName || undefined,
            projectId: project.id,
          });
        }
      }

      // Search cached assets
      const allAssets: CachedAsset[] = [];
      for (const project of projects) {
        const assets = await getCachedAssets(project.id);
        allAssets.push(...assets);
      }
      
      for (const asset of allAssets) {
        if (
          asset.name.toLowerCase().includes(normalizedQuery) ||
          asset.uniqueId.toLowerCase().includes(normalizedQuery) ||
          asset.address?.toLowerCase().includes(normalizedQuery) ||
          asset.city?.toLowerCase().includes(normalizedQuery)
        ) {
          searchResults.push({
            id: `asset-${asset.id}`,
            type: "asset",
            title: asset.name,
            subtitle: asset.address || asset.uniqueId,
            projectId: asset.projectId,
            assetId: asset.id,
          });
        }
      }

      // Search offline assessments
      const assessments = await getAllItems<OfflineAssessment>(STORES.ASSESSMENTS);
      for (const assessment of assessments) {
        if (
          assessment.componentCode?.toLowerCase().includes(normalizedQuery) ||
          assessment.componentName?.toLowerCase().includes(normalizedQuery) ||
          assessment.observations?.toLowerCase().includes(normalizedQuery) ||
          assessment.recommendations?.toLowerCase().includes(normalizedQuery)
        ) {
          searchResults.push({
            id: assessment.id,
            type: "assessment",
            title: assessment.componentName || assessment.componentCode || "Assessment",
            subtitle: assessment.condition || undefined,
            status: assessment.syncStatus,
            projectId: assessment.projectId,
            timestamp: assessment.createdAt,
          });
        }
      }

      // Search offline photos by caption
      const photos = await getAllItems<OfflinePhoto>(STORES.PHOTOS);
      for (const photo of photos) {
        if (
          photo.caption?.toLowerCase().includes(normalizedQuery) ||
          photo.fileName.toLowerCase().includes(normalizedQuery)
        ) {
          searchResults.push({
            id: photo.id,
            type: "photo",
            title: photo.caption || photo.fileName,
            subtitle: `Project ${photo.projectId}`,
            status: photo.syncStatus,
            projectId: photo.projectId,
            timestamp: photo.createdAt,
          });
        }
      }

      // Search offline deficiencies
      const deficiencies = await getAllItems<OfflineDeficiency>(STORES.DEFICIENCIES);
      for (const deficiency of deficiencies) {
        if (
          deficiency.description.toLowerCase().includes(normalizedQuery) ||
          deficiency.componentCode?.toLowerCase().includes(normalizedQuery)
        ) {
          searchResults.push({
            id: deficiency.id,
            type: "deficiency",
            title: deficiency.description.substring(0, 50),
            subtitle: `${deficiency.severity} - ${deficiency.priority}`,
            status: deficiency.syncStatus,
            projectId: deficiency.projectId,
            timestamp: deficiency.createdAt,
          });
        }
      }

      // Sort by relevance (exact matches first, then by timestamp)
      searchResults.sort((a, b) => {
        const aExact = a.title.toLowerCase() === normalizedQuery;
        const bExact = b.title.toLowerCase() === normalizedQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });

      setResults(searchResults.slice(0, 20)); // Limit to 20 results
    } catch (error) {
      console.error("[OfflineSearch] Search failed:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    search,
  };
}

// ============================================================================
// Main Component
// ============================================================================

interface OfflineSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OfflineSearch({ open, onOpenChange }: OfflineSearchProps) {
  const { query, setQuery, results, isLoading, search } = useOfflineSearch();
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    search(value);
  }, [setQuery, search]);

  const handleSelect = useCallback((result: SearchResult) => {
    onOpenChange(false);
    
    switch (result.type) {
      case "project":
        if (result.projectId) {
          navigate(`/projects/${result.projectId}`);
        }
        break;
      case "asset":
        if (result.projectId && result.assetId) {
          navigate(`/projects/${result.projectId}/assets/${result.assetId}`);
        }
        break;
      case "assessment":
        if (result.projectId) {
          navigate(`/projects/${result.projectId}/assessments`);
        }
        break;
      case "photo":
      case "deficiency":
        if (result.projectId) {
          navigate(`/projects/${result.projectId}`);
        }
        break;
    }
  }, [navigate, onOpenChange]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      project: [],
      asset: [],
      assessment: [],
      photo: [],
      deficiency: [],
    };

    for (const result of results) {
      groups[result.type].push(result);
    }

    return groups;
  }, [results]);

  const getIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "project":
        return <Building2 className="h-4 w-4" />;
      case "asset":
        return <Building2 className="h-4 w-4" />;
      case "assessment":
        return <FileText className="h-4 w-4" />;
      case "photo":
        return <Image className="h-4 w-4" />;
      case "deficiency":
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status?: "pending" | "synced" | "failed" | "syncing") => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case "synced":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />;
      case "syncing":
        return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search offline data..."
        value={query}
        onValueChange={handleSearch}
      />
      <CommandList>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : results.length === 0 && query ? (
          <CommandEmpty>No results found in offline data.</CommandEmpty>
        ) : (
          <>
            {groupedResults.project.length > 0 && (
              <CommandGroup heading="Projects">
                {groupedResults.project.map((result) => (
                  <CommandItem
                    key={result.id}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-2"
                  >
                    {getIcon(result.type)}
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Cached
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {groupedResults.asset.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Assets">
                  {groupedResults.asset.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-2"
                    >
                      {getIcon(result.type)}
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Cached
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {groupedResults.assessment.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Offline Assessments">
                  {groupedResults.assessment.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-2"
                    >
                      {getIcon(result.type)}
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      {getStatusIcon(result.status)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {groupedResults.photo.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Offline Photos">
                  {groupedResults.photo.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-2"
                    >
                      {getIcon(result.type)}
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      {getStatusIcon(result.status)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {groupedResults.deficiency.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Offline Deficiencies">
                  {groupedResults.deficiency.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-2"
                    >
                      {getIcon(result.type)}
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </p>
                        )}
                      </div>
                      {getStatusIcon(result.status)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

// ============================================================================
// Search Trigger Button
// ============================================================================

export function OfflineSearchTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search Offline</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <OfflineSearch open={open} onOpenChange={setOpen} />
    </>
  );
}

export default OfflineSearch;
