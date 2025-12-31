import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface Company {
  id: number;
  name: string;
  city: string | null;
  status: string;
  role: string;
  joinedAt: string | null;
}

interface CompanyContextValue {
  companies: Company[];
  selectedCompanyId: number | null;
  selectedCompany: Company | null;
  setSelectedCompanyId: (id: number | null) => void;
  isLoading: boolean;
  isSuperAdmin: boolean;
  hasMultipleCompanies: boolean;
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined);

const SELECTED_COMPANY_KEY = "bca-selected-company";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<number | null>(() => {
    const saved = localStorage.getItem(SELECTED_COMPANY_KEY);
    return saved ? parseInt(saved, 10) : null;
  });

  const { data: companies = [], isLoading } = trpc.companyRoles.myCompanies.useQuery(
    undefined,
    { enabled: !!user }
  );

  const isSuperAdmin = user?.isSuperAdmin === 1;
  const hasMultipleCompanies = companies.length > 1;

  // Auto-select company if user only belongs to one
  useEffect(() => {
    if (!isLoading && companies.length > 0) {
      // If no company selected, or selected company is not in user's companies
      const validSelection = companies.find(c => c.id === selectedCompanyId);
      if (!validSelection) {
        // Auto-select first company
        setSelectedCompanyIdState(companies[0].id);
        localStorage.setItem(SELECTED_COMPANY_KEY, companies[0].id.toString());
      }
    }
  }, [companies, isLoading, selectedCompanyId]);

  const setSelectedCompanyId = (id: number | null) => {
    setSelectedCompanyIdState(id);
    if (id) {
      localStorage.setItem(SELECTED_COMPANY_KEY, id.toString());
    } else {
      localStorage.removeItem(SELECTED_COMPANY_KEY);
    }
  };

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || null;

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompanyId,
        selectedCompany,
        setSelectedCompanyId,
        isLoading,
        isSuperAdmin,
        hasMultipleCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
}
