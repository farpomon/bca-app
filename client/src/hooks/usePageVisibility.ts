import { trpc } from "@/lib/trpc";
import { useCompany } from "@/contexts/CompanyContext";
import { DASHBOARD_PAGES, PageKey } from "@shared/pageKeys";

/**
 * Hook to get page visibility settings for the current company
 * Returns visibility map and helper functions
 */
export function usePageVisibility() {
  const { selectedCompany, isSuperAdmin } = useCompany();
  
  const { data: visibilitySettings, isLoading } = trpc.pageVisibility.getMyCompanyPageVisibility.useQuery(
    { companyId: selectedCompany?.id },
    { 
      enabled: true,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  /**
   * Check if a specific page is visible for the current company
   * Super admins always see all pages
   */
  const isPageVisible = (pageKey: PageKey): boolean => {
    // Super admins can see everything
    if (isSuperAdmin) return true;
    
    // If no settings loaded yet, default to visible
    if (!visibilitySettings) return true;
    
    // Check the visibility setting
    return visibilitySettings[pageKey] !== false;
  };

  /**
   * Check if a page path is visible
   */
  const isPathVisible = (path: string): boolean => {
    // Super admins can see everything
    if (isSuperAdmin) return true;
    
    // Find the page key for this path
    const pageKey = Object.entries(DASHBOARD_PAGES).find(
      ([_, value]) => value.path === path
    )?.[0] as PageKey | undefined;
    
    if (!pageKey) return true; // Unknown paths are visible by default
    
    return isPageVisible(pageKey);
  };

  /**
   * Filter an array of menu items based on visibility
   */
  const filterMenuItems = <T extends { path: string }>(items: T[]): T[] => {
    // Super admins see everything
    if (isSuperAdmin) return items;
    
    return items.filter(item => isPathVisible(item.path));
  };

  return {
    visibilitySettings,
    isLoading,
    isPageVisible,
    isPathVisible,
    filterMenuItems,
    isSuperAdmin,
  };
}
