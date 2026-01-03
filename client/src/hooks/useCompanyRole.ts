import { trpc } from "@/lib/trpc";

/**
 * Hook to check user's role in a company
 * Returns role information and permission helpers
 */
export function useCompanyRole(companyId: number | undefined) {
  const { data: role, isLoading } = trpc.companyRoles.myRoleInCompany.useQuery(
    { companyId: companyId! },
    { enabled: !!companyId }
  );

  const roleHierarchy = {
    company_admin: 4,
    project_manager: 3,
    editor: 2,
    viewer: 1,
  };

  const hasRole = (requiredRole: "company_admin" | "project_manager" | "editor" | "viewer"): boolean => {
    if (!role) return false;
    return roleHierarchy[role.companyRole] >= roleHierarchy[requiredRole];
  };

  return {
    role: role?.companyRole,
    isLoading,
    isAdmin: role?.companyRole === "company_admin",
    isManager: hasRole("project_manager"),
    isEditor: hasRole("editor"),
    isViewer: hasRole("viewer"),
    hasRole,
  };
}

/**
 * Hook to get all companies user belongs to
 */
export function useMyCompanies() {
  const { data: companies, isLoading } = trpc.companyRoles.myCompanies.useQuery();

  return {
    companies: companies || [],
    isLoading,
    hasMultipleCompanies: (companies?.length || 0) > 1,
    firstCompanyId: companies?.[0]?.id,
  };
}
