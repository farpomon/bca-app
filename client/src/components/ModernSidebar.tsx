import { useState } from "react";
import { useLocation } from "wouter";
import {
  Building2,
  LayoutDashboard,
  BarChart3,
  TrendingUp,
  LineChart,
  Target,
  Calculator,
  FileCheck,
  Leaf,
  Award,
  Sparkles,
  FileText,
  Factory,
  Shield,
  Settings,
  ClipboardCheck,
  Lock,
  History,
  Search,
  ChevronDown,
  ChevronRight,
  User,
  LogOut,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

interface NavSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

export function ModernSidebar() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    analytics: true,
    sustainability: false,
    administration: true,
  });

  // Navigation structure
  const mainItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Projects", path: "/" },
    { icon: Building2, label: "Portfolio Projects", path: "/portfolio-projects" },
  ];

  const sections: NavSection[] = [
    {
      title: "Analytics & Reports",
      icon: BarChart3,
      items: [
        { icon: BarChart3, label: "Portfolio Analytics and BI", path: "/portfolio-analytics" },
        { icon: TrendingUp, label: "RSMeans Cost Data", path: "/rsmeans" },
        { icon: LineChart, label: "Predictions", path: "/predictions" },
        { icon: Target, label: "Prioritization", path: "/prioritization" },
        { icon: Calculator, label: "Capital Budget", path: "/capital-budget" },
        { icon: Building2, label: "Single Asset Report", path: "/single-asset-report" },
        { icon: FileCheck, label: "Portfolio-Wide Report", path: "/portfolio-wide-report" },
      ],
    },
    {
      title: "Sustainability & ESG",
      icon: Leaf,
      items: [
        { icon: Leaf, label: "ESG Dashboard", path: "/esg-dashboard" },
        { icon: Award, label: "ESG & LEED", path: "/esg-leed" },
        { icon: Sparkles, label: "AI Carbon Recommendations", path: "/ai-carbon" },
        { icon: FileText, label: "LEED Compliance Report", path: "/leed-report" },
        { icon: Factory, label: "Carbon Footprint", path: "/carbon-footprint" },
      ],
    },
    {
      title: "Administration",
      icon: Shield,
      items: [
        { icon: Shield, label: "Admin Dashboard", path: "/admin" },
        { icon: Building2, label: "Building Templates", path: "/building-templates" },
        { icon: Settings, label: "Bulk Service Life", path: "/bulk-service-life" },
        { icon: ClipboardCheck, label: "Compliance", path: "/compliance" },
        { icon: Lock, label: "Data Security", path: "/data-security" },
        { icon: History, label: "Audit Trail", path: "/audit-trail" },
      ],
    },
  ];

  // Filter items based on search
  const filterItems = (items: NavItem[]) => {
    if (!searchQuery) return items;
    return items.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionTitle.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")]: !prev[sectionTitle.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")],
    }));
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = location === item.path;
    const Icon = item.icon;

    return (
      <button
        key={item.path}
        onClick={() => setLocation(item.path)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
          isActive
            ? "bg-blue-500 text-white shadow-sm"
            : "text-gray-700 hover:bg-gray-100"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-gray-500")} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  const renderSection = (section: NavSection) => {
    const sectionKey = section.title.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-");
    const isExpanded = expandedSections[sectionKey];
    const filteredItems = filterItems(section.items);
    const hasActiveItem = filteredItems.some((item) => location === item.path);
    const SectionIcon = section.icon;

    if (filteredItems.length === 0 && searchQuery) return null;

    return (
      <div key={section.title} className="space-y-1">
        <button
          onClick={() => toggleSection(section.title)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
            hasActiveItem ? "text-blue-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          )}
        >
          <div className="flex items-center gap-2">
            <SectionIcon className="h-4 w-4" />
            <span>{section.title}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <div className="space-y-0.5 pl-2">
            {filteredItems.map(renderNavItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-64 bg-white border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
        <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 truncate">
            Building Condition Assessment
          </h1>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-300 rounded-lg"
          />
        </div>
      </div>

      {/* Company Placeholder */}
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
          <Building2 className="h-4 w-4" />
          <span>No companies</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Items */}
        <div className="space-y-0.5">
          {filterItems(mainItems).map(renderNavItem)}
        </div>

        {/* Sections */}
        {sections.map(renderSection)}
      </div>

      {/* Footer - User Profile */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-medium">
              LF
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">Luis Faria</p>
            <p className="text-xs text-gray-500 truncate">Admin</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-gray-600"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
