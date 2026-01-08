import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { APP_LOGO, APP_TAGLINE, APP_TITLE, getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, 
  LogOut, 
  PanelLeft, 
  Users, 
  Shield, 
  Trash2, 
  Building2, 
  Plus, 
  Settings, 
  Leaf, 
  DollarSign, 
  Factory, 
  Sparkles, 
  FileText, 
  Award,
  ChevronRight,
  ChevronDown,
  BarChart3,
  TrendingUp,
  Target,
  LineChart,
  ClipboardCheck,
  Lock,
  History,
  FileCheck,
  Calculator,
  Archive
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { MFAGracePeriodBanner } from './MFAGracePeriodBanner';
import { OfflineStatusBanner } from './OfflineStatusBanner';
import { SidebarOfflineStatus } from './SidebarOfflineStatus';
import { UnitToggleCompact } from './UnitToggle';
import { CompanySelector, CompanySelectorCompact } from './CompanySelector';
import { PendingInvitationsBanner } from './PendingInvitationsBanner';
import { CreateCompanyDialog } from './CreateCompanyDialog';
import { useCompany } from '@/contexts/CompanyContext';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { Input } from '@/components/ui/input';
import { Search, X, HelpCircle } from 'lucide-react';
import { FloatingChatbot } from './FloatingChatbot';

// Main navigation items (always visible)
const mainMenuItems = [
  { icon: LayoutDashboard, label: "Projects", path: "/" },
  { icon: DollarSign, label: "RSMeans Cost Data", path: "/rsmeans" },
  { icon: Trash2, label: "Deleted Projects", path: "/deleted-projects" },
];

// Sustainability & ESG section
const sustainabilityItems = [
  { icon: Leaf, label: "ESG Dashboard", path: "/esg-dashboard" },
  { icon: Award, label: "ESG & LEED", path: "/esg-leed" },
  { icon: Sparkles, label: "AI Carbon Recommendations", path: "/ai-carbon-recommendations" },
  { icon: FileText, label: "LEED Compliance Report", path: "/leed-compliance-report" },
  { icon: Leaf, label: "Sustainability", path: "/sustainability" },
  { icon: Factory, label: "Carbon Footprint", path: "/carbon-footprint" },
];

// Analytics & Reports section
const analyticsItems = [
  { icon: BarChart3, label: "Portfolio Analytics and BI", path: "/portfolio-analytics" },
  // { icon: TrendingUp, label: "Portfolio BI", path: "/portfolio-bi" }, // Hidden - merged into Portfolio Analytics
  { icon: LineChart, label: "Predictions", path: "/predictions" },
  { icon: Target, label: "Prioritization", path: "/prioritization" },
  { icon: Calculator, label: "Capital Budget", path: "/capital-budget" },
  { icon: FileCheck, label: "Portfolio Report", path: "/portfolio-report" },
];

// Admin section items
const adminItems = [
  { icon: Shield, label: "Admin Dashboard", path: "/admin" },
  { icon: Building2, label: "Building Templates", path: "/admin/building-templates" },
  { icon: Settings, label: "Bulk Service Life", path: "/admin/bulk-service-life-updates" },
  { icon: ClipboardCheck, label: "Compliance", path: "/admin/compliance" },
  { icon: Lock, label: "Data Security", path: "/admin/data-security" },
  { icon: History, label: "Audit Trail", path: "/admin/audit-trail" },
  { icon: Archive, label: "Archive", path: "/archive" },
  { icon: TrendingUp, label: "Economic Indicators", path: "/admin/economic-indicators" },
  { icon: Target, label: "Portfolio Targets", path: "/admin/portfolio-targets" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;

// Key for storing collapsed sections state
const SIDEBAR_SECTIONS_KEY = "sidebar-sections-state";

type SectionKey = 'analytics' | 'sustainability' | 'admin';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="relative">
                <img
                  src={APP_LOGO}
                  alt={APP_TITLE}
                  className="h-20 w-20 rounded-xl object-cover shadow"
                />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">{APP_TITLE}</h1>
              <p className="text-xs text-muted-foreground font-medium">
                {APP_TAGLINE}
              </p>
              <p className="text-sm text-muted-foreground">
                Please sign in to continue
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      defaultOpen={!isMobile}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { isSuperAdmin, selectedCompany } = useCompany();
  const { filterMenuItems } = usePageVisibility();
  const [createCompanyDialogOpen, setCreateCompanyDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Collapsible sections state - persisted to localStorage
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_SECTIONS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // Ignore parse errors
    }
    // Default: all sections collapsed for cleaner initial view
    return { analytics: false, sustainability: false, admin: false };
  });

  // Save expanded sections to localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(expandedSections));
  }, [expandedSections]);

  const toggleSection = (section: SectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Check if any project has multiple assets for portfolio analytics visibility
  const { data: hasMultiAssetProjects } = trpc.projects.hasMultiAssetProjects.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Get active menu item label for mobile header
  const allMenuItems = [
    ...mainMenuItems,
    ...sustainabilityItems,
    ...analyticsItems,
    ...adminItems,
  ];
  const activeMenuItem = allMenuItems.find(item => item.path === location);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const isAdmin = user?.role === 'admin';

  // Filter menu items based on search query
  const filterBySearch = <T extends { label: string }>(items: T[]): T[] => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => item.label.toLowerCase().includes(query));
  };

  // Helper to render menu items
  const renderMenuItem = (item: { icon: React.ComponentType<{ className?: string }>; label: string; path: string }, badge?: number) => {
    const isActive = location === item.path;
    return (
      <SidebarMenuItem key={item.path}>
        <SidebarMenuButton
          isActive={isActive}
          onClick={() => {
            setLocation(item.path);
            // Auto-close sidebar on mobile after navigation
            if (isMobile) {
              toggleSidebar();
            }
          }}
          tooltip={item.label}
          className="h-10 min-h-[40px] transition-all font-normal text-sm hover:scale-[1.01] group/item"
          aria-label={item.label}
        >
          <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover/item:text-foreground"}`} />
          <span className="truncate flex-1">{item.label}</span>
          {badge && badge > 0 && (
            <span className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  // Render a collapsible section with proper spacing using Collapsible component
  const renderCollapsibleSection = (
    sectionKey: SectionKey,
    title: string,
    icon: React.ComponentType<{ className?: string }>,
    items: Array<{ icon: React.ComponentType<{ className?: string }>; label: string; path: string }>
  ) => {
    const Icon = icon;
    const hasActiveItem = items.some(item => location === item.path);
    const isExpanded = expandedSections[sectionKey];
    
    if (items.length === 0) return null;
    
    return (
      <div className="relative z-0">
        <Collapsible
          open={isExpanded}
          onOpenChange={() => toggleSection(sectionKey)}
          className="flex flex-col"
        >
          {!isCollapsed && (
            <CollapsibleTrigger asChild>
              <button 
                className="relative z-10 flex items-center gap-2.5 w-full px-4 py-3 cursor-pointer hover:bg-sidebar-accent/50 transition-colors rounded-md mx-2 select-none text-left bg-background/50"
                style={{ width: 'calc(100% - 16px)' }}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-colors ${hasActiveItem ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-[11px] font-semibold uppercase tracking-wider transition-colors flex-1 truncate ${hasActiveItem ? "text-primary" : "text-muted-foreground"}`}>
                  {title}
                </span>
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0" />
                )}
              </button>
            </CollapsibleTrigger>
          )}
          <CollapsibleContent className="relative z-0 flex flex-col gap-1 px-2 py-1">
            {items.map(item => {
              const isActive = location === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    setLocation(item.path);
                    if (isMobile) toggleSidebar();
                  }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-lg transition-all text-left min-h-[40px] ${
                    isActive 
                      ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary' 
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
                  }`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                  <span className="truncate flex-1">{item.label}</span>
                </button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  // Get filtered items for each section
  const filteredMainItems = filterBySearch(filterMenuItems(mainMenuItems));
  const filteredAnalyticsItems = filterBySearch(filterMenuItems(analyticsItems.filter(item => {
    // Hide portfolio analytics if no projects have multiple assets
    if (item.path === '/portfolio-analytics' && !hasMultiAssetProjects) return false;
    return true;
  })));
  const filteredSustainabilityItems = filterBySearch(filterMenuItems(sustainabilityItems));
  const filteredAdminItems = filterBySearch(filterMenuItems(adminItems));

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="border-b border-sidebar-border/50">
            <div className="flex flex-col gap-1.5 py-1.5">
              {/* App Logo and Title */}
              <div className="flex items-center gap-3 pl-2 group-data-[collapsible=icon]:px-0 transition-all w-full">
                {isCollapsed ? (
                  <div className="relative h-8 w-8 shrink-0 group">
                    <img
                      src={APP_LOGO}
                      className="h-8 w-8 rounded-md object-cover ring-1 ring-border"
                      alt="Logo"
                    />
                    <button
                      onClick={toggleSidebar}
                      className="absolute inset-0 flex items-center justify-center bg-accent rounded-md ring-1 ring-border opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <PanelLeft className="h-4 w-4 text-foreground" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                      <img
                        src={APP_LOGO}
                        className="h-7 w-7 rounded-md object-cover ring-1 ring-border shrink-0"
                        alt="Logo"
                      />
                      <span 
                        className="font-bold tracking-tight text-sm leading-tight" 
                        style={{ 
                          fontFamily: "'Space Grotesk', sans-serif",
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          wordBreak: 'break-word'
                        }}
                        title={APP_TITLE}
                      >
                        {APP_TITLE}
                      </span>
                    </div>
                    <button
                      onClick={toggleSidebar}
                      className="ml-auto h-7 w-7 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                    >
                      <PanelLeft className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </>
                )}
              </div>
              
              {/* Company Selector */}
              {!isCollapsed && (
                <div className="px-2">
                  <CompanySelector />
                </div>
              )}
              {isCollapsed && (
                <div className="flex justify-center">
                  <CompanySelectorCompact />
                </div>
              )}
              
              {/* Search Bar */}
              {!isCollapsed && (
                <div className="px-2 pb-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Search menu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 pr-8 text-xs bg-background/50 border-sidebar-border focus-visible:ring-1"
                      aria-label="Search navigation menu"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded hover:bg-accent transition-colors"
                        aria-label="Clear search"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 overflow-y-auto overflow-x-hidden">
            {/* Main Navigation */}
            <SidebarGroup className="py-3">
              <SidebarGroupContent>
                <SidebarMenu className="px-2 space-y-1">
                  {filteredMainItems.map(item => renderMenuItem(item))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Divider */}
            {filteredAnalyticsItems.length > 0 && (
              <div className="mx-4 my-2 border-t border-sidebar-border/40" />
            )}

            {/* Analytics & Reports Section - Collapsible */}
            {renderCollapsibleSection(
              'analytics',
              "Analytics & Reports",
              BarChart3,
              filteredAnalyticsItems
            )}

            {/* Divider */}
            {filteredSustainabilityItems.length > 0 && (
              <div className="mx-4 my-2 border-t border-sidebar-border/40" />
            )}

            {/* Sustainability & ESG Section - Collapsible */}
            {renderCollapsibleSection(
              'sustainability',
              "Sustainability & ESG",
              Leaf,
              filteredSustainabilityItems
            )}

            {/* Divider */}
            {isAdmin && filteredAdminItems.length > 0 && (
              <div className="mx-4 my-2 border-t border-sidebar-border/40" />
            )}

            {/* Admin Section (only for admins) - Collapsible */}
            {isAdmin && renderCollapsibleSection(
              'admin',
              "Administration",
              Shield,
              filteredAdminItems
            )}

            {/* Offline Status Section */}
            <div className="mt-auto px-2 py-2 border-t border-sidebar-border/40">
              <SidebarOfflineStatus isCollapsed={isCollapsed} />
            </div>
          </SidebarContent>

          <SidebarFooter className="p-2 space-y-2">
            {/* Help Chat Button */}
            <div className="px-2">
              <FloatingChatbot />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/60 transition-all w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:shadow-sm"
                  aria-label="User menu"
                >
                  <Avatar className="h-9 w-9 border-2 border-border shrink-0 ring-1 ring-background">
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-semibold truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
                {/* Company Management Options */}
                {selectedCompany && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setLocation("/company-users")}
                      className="cursor-pointer"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      <span>Company Users</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {/* Super Admin: Create Company */}
                {isSuperAdmin && (
                  <>
                    <DropdownMenuItem
                      onClick={() => setCreateCompanyDialogOpen(true)}
                      className="cursor-pointer"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Create Company</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuItem
                  onClick={() => setLocation("/admin")}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? APP_TITLE}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CompanySelector compact />
              <UnitToggleCompact />
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">
          <OfflineStatusBanner />
          <MFAGracePeriodBanner />
          <PendingInvitationsBanner />
          {children}
        </main>
      </SidebarInset>

      {/* Create Company Dialog */}
      <CreateCompanyDialog
        open={createCompanyDialogOpen}
        onOpenChange={setCreateCompanyDialogOpen}
      />
    </>
  );
}
