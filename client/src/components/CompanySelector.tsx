import { useCompany } from "@/contexts/CompanyContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CompanySelectorProps {
  className?: string;
  compact?: boolean;
}

export function CompanySelector({ className, compact = false }: CompanySelectorProps) {
  const { 
    companies, 
    selectedCompanyId, 
    selectedCompany,
    setSelectedCompanyId, 
    isLoading,
    hasMultipleCompanies 
  } = useCompany();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {!compact && <span>Loading...</span>}
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        {!compact && <span>No companies</span>}
      </div>
    );
  }

  // If user belongs to only one company, show it as a static display
  if (!hasMultipleCompanies && selectedCompany) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{selectedCompany.name}</span>
        {!compact && (
          <Badge variant="outline" className="text-xs shrink-0">
            {getRoleLabel(selectedCompany.role)}
          </Badge>
        )}
      </div>
    );
  }

  // Multiple companies - show selector
  return (
    <div className={className}>
      <Select
        value={selectedCompanyId?.toString() || ""}
        onValueChange={(val) => setSelectedCompanyId(parseInt(val))}
      >
        <SelectTrigger className={cn(
          "border-0 bg-transparent hover:bg-accent/50 transition-colors",
          compact ? "w-auto gap-1 px-2" : "w-[260px]"
        )}>
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {selectedCompany?.name || "Select company"}
            </span>
          </div>
          {!compact && <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />}
        </SelectTrigger>
        <SelectContent align="start">
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id.toString()}>
              <div className="flex items-center justify-between w-full gap-3">
                <span className="truncate">{company.name}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {getRoleLabel(company.role)}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Compact version for sidebar when collapsed
export function CompanySelectorCompact() {
  const { selectedCompany, isLoading } = useCompany();

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  return (
    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary/10" title={selectedCompany?.name || "No company"}>
      <Building2 className="h-4 w-4 text-primary" />
    </div>
  );
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    company_admin: "Admin",
    project_manager: "Manager",
    editor: "Editor",
    viewer: "Viewer",
  };
  return labels[role] || role;
}
