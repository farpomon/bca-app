import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Building2, ChevronDown, ChevronRight, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { DASHBOARD_PAGES, PageKey, PageSection } from "@shared/pageKeys";

interface CompanyPageVisibilityManagerProps {
  companyId?: number;
}

/**
 * Component for superadmins to manage page visibility per company
 */
export function CompanyPageVisibilityManager({ companyId: initialCompanyId }: CompanyPageVisibilityManagerProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(initialCompanyId);
  const [localSettings, setLocalSettings] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [sectionOpen, setSectionOpen] = useState<Record<PageSection, boolean>>({
    main: true,
    analytics: true,
    sustainability: true,
    admin: true,
  });

  // Fetch all companies
  const { data: companies, isLoading: companiesLoading } = trpc.companyRoles.getAllCompanies.useQuery();

  // Fetch page visibility for selected company
  const { data: visibilitySettings, isLoading: settingsLoading, refetch } = trpc.pageVisibility.getCompanyPageVisibility.useQuery(
    { companyId: selectedCompanyId! },
    { 
      enabled: !!selectedCompanyId,
    }
  );

  // Update local settings when visibility settings are loaded
  useEffect(() => {
    if (visibilitySettings) {
      setLocalSettings(visibilitySettings);
      setHasChanges(false);
    }
  }, [visibilitySettings]);

  // Mutation to save settings
  const bulkSaveMutation = trpc.pageVisibility.bulkSetPageVisibility.useMutation({
    onSuccess: () => {
      toast.success("Page visibility settings saved successfully");
      setHasChanges(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(parseInt(companyId));
    setHasChanges(false);
  };

  const handleToggle = (pageKey: string, isVisible: boolean) => {
    setLocalSettings(prev => ({
      ...prev,
      [pageKey]: isVisible,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!selectedCompanyId) return;
    
    bulkSaveMutation.mutate({
      companyId: selectedCompanyId,
      settings: localSettings,
    });
  };

  const handleToggleAll = (section: PageSection, visible: boolean) => {
    const sectionPages = Object.entries(DASHBOARD_PAGES)
      .filter(([_, value]) => value.section === section)
      .map(([key]) => key);
    
    const newSettings = { ...localSettings };
    sectionPages.forEach(key => {
      newSettings[key] = visible;
    });
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const getPagesBySection = (section: PageSection) => {
    return Object.entries(DASHBOARD_PAGES)
      .filter(([_, value]) => value.section === section)
      .map(([key, value]) => ({
        key: key as PageKey,
        ...value,
      }));
  };

  const getSectionStats = (section: PageSection) => {
    const pages = getPagesBySection(section);
    const visibleCount = pages.filter(p => localSettings[p.key] !== false).length;
    return { total: pages.length, visible: visibleCount };
  };

  const renderSection = (section: PageSection, title: string) => {
    const pages = getPagesBySection(section);
    const stats = getSectionStats(section);
    const isOpen = sectionOpen[section];

    return (
      <Collapsible 
        open={isOpen} 
        onOpenChange={(open) => setSectionOpen(prev => ({ ...prev, [section]: open }))}
        className="border rounded-lg"
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-medium">{title}</span>
              <Badge variant="secondary" className="ml-2">
                {stats.visible}/{stats.total} visible
              </Badge>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleAll(section, true)}
                className="h-7 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                Show All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleAll(section, false)}
                className="h-7 text-xs"
              >
                <EyeOff className="h-3 w-3 mr-1" />
                Hide All
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {pages.map((page) => (
              <div key={page.key} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex flex-col">
                  <Label htmlFor={page.key} className="font-normal cursor-pointer">
                    {page.label}
                  </Label>
                  <span className="text-xs text-muted-foreground">{page.path}</span>
                </div>
                <Switch
                  id={page.key}
                  checked={localSettings[page.key] !== false}
                  onCheckedChange={(checked) => handleToggle(page.key, checked)}
                />
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (companiesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Page Visibility
        </CardTitle>
        <CardDescription>
          Control which dashboard pages are visible for each company. Hidden pages will not appear in the sidebar for users of that company.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Selector */}
        <div className="space-y-2">
          <Label>Select Company</Label>
          <Select
            value={selectedCompanyId?.toString() || ""}
            onValueChange={handleCompanyChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a company..." />
            </SelectTrigger>
            <SelectContent>
              {companies?.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page Visibility Settings */}
        {selectedCompanyId && (
          <>
            {settingsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {renderSection("main", "Main Navigation")}
                {renderSection("analytics", "Analytics & Reports")}
                {renderSection("sustainability", "Sustainability & ESG")}
                {renderSection("admin", "Administration")}

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || bulkSaveMutation.isPending}
                  >
                    {bulkSaveMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {!selectedCompanyId && (
          <div className="text-center py-8 text-muted-foreground">
            Select a company to manage page visibility settings
          </div>
        )}
      </CardContent>
    </Card>
  );
}
