import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useSearch } from "wouter";

/**
 * Hook for persisting filter state in URL query parameters.
 * When navigating back to a page, filters are restored from the URL.
 */
export function useFilterPersistence<T extends Record<string, string>>(
  defaultFilters: T,
  storageKey?: string
) {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const isInitialMount = useRef(true);

  // Parse current URL params
  const currentParams = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [searchString]);

  // Initialize filters from URL params or defaults
  const [filters, setFiltersState] = useState<T>(() => {
    const initial = { ...defaultFilters };
    Object.keys(defaultFilters).forEach((key) => {
      const urlValue = currentParams[key];
      if (urlValue !== undefined && urlValue !== "") {
        (initial as Record<string, string>)[key] = urlValue;
      }
    });
    return initial;
  });

  // Update URL when filters change
  const updateUrl = useCallback(
    (newFilters: T) => {
      const params = new URLSearchParams();
      Object.entries(newFilters).forEach(([key, value]) => {
        // Only add non-default, non-empty values to URL
        if (value && value !== defaultFilters[key as keyof T]) {
          params.set(key, value);
        }
      });

      const queryString = params.toString();
      const currentPath = window.location.pathname;
      const newUrl = queryString ? `${currentPath}?${queryString}` : currentPath;
      
      // Use replaceState to avoid adding to history for filter changes
      window.history.replaceState(null, "", newUrl);
    },
    [defaultFilters]
  );

  // Set filters and update URL
  const setFilters = useCallback(
    (newFilters: T | ((prev: T) => T)) => {
      setFiltersState((prev) => {
        const updated = typeof newFilters === "function" ? newFilters(prev) : newFilters;
        updateUrl(updated);
        return updated;
      });
    },
    [updateUrl]
  );

  // Set a single filter value
  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters]
  );

  // Clear all filters to defaults
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, [defaultFilters, setFilters]);

  // Count active filters (non-default values)
  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(
      ([key, value]) => value && value !== defaultFilters[key as keyof T]
    ).length;
  }, [filters, defaultFilters]);

  // Sync with URL on mount and when URL changes externally (e.g., back/forward navigation)
  useEffect(() => {
    // Skip on initial mount since we already initialized from URL
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const newFilters = { ...defaultFilters };
    Object.keys(defaultFilters).forEach((key) => {
      const urlValue = currentParams[key];
      if (urlValue !== undefined && urlValue !== "") {
        (newFilters as Record<string, string>)[key] = urlValue;
      }
    });
    
    // Only update state if filters have actually changed
    const hasChanged = Object.keys(newFilters).some(
      (key) => {
        const newValue = newFilters[key as keyof T];
        const currentValue = filters[key as keyof T];
        return newValue !== currentValue;
      }
    );
    
    if (hasChanged) {
      setFiltersState(newFilters);
    }
  }, [searchString]); // Only depend on searchString to detect URL changes

  return {
    filters,
    setFilters,
    setFilter,
    clearFilters,
    activeFiltersCount,
  };
}

/**
 * Simplified hook for single search query persistence
 */
export function useSearchPersistence(defaultValue: string = "") {
  const { filters, setFilter, clearFilters } = useFilterPersistence({
    search: defaultValue,
  });

  return {
    searchQuery: filters.search,
    setSearchQuery: (value: string) => setFilter("search", value),
    clearSearch: clearFilters,
  };
}
