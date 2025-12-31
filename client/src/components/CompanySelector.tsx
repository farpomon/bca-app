import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CompanySelectorProps {
  value?: number;
  onChange: (companyId: number) => void;
  className?: string;
}

export function CompanySelector({ value, onChange, className }: CompanySelectorProps) {
  const { data: companies, isLoading } = trpc.companyRoles.myCompanies.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading companies...</span>
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>No companies</span>
      </div>
    );
  }

  // If user belongs to only one company, show it as a badge
  if (companies.length === 1) {
    return (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{companies[0].name}</span>
        <Badge variant="outline" className="text-xs">
          {getRoleLabel(companies[0].role)}
        </Badge>
      </div>
    );
  }

  return (
    <div className={className}>
      <Select
        value={value?.toString()}
        onValueChange={(val) => onChange(parseInt(val))}
      >
        <SelectTrigger className="w-[280px]">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <SelectValue placeholder="Select a company" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id.toString()}>
              <div className="flex items-center justify-between w-full gap-3">
                <span>{company.name}</span>
                <Badge variant="outline" className="text-xs">
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

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    company_admin: "Admin",
    project_manager: "Manager",
    editor: "Editor",
    viewer: "Viewer",
  };
  return labels[role] || role;
}
