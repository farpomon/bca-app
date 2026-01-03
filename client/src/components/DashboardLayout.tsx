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
  BarChart3,
  TrendingUp,
  Target,
  LineChart,
  ClipboardCheck,
  Lock,
  History,
  FileCheck,
  Calculator
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
  { icon: BarChart3, label: "Portfolio Analytics", path: "/portfolio-analytics" },
  { icon: TrendingUp, label: "Portfolio BI", path: "/portfolio-bi" },
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
  { icon: TrendingUp, label: "Economic Indicators", path: "/admin/economic-indicators" },
  { icon: Target, label: "Portfolio Targets", path: "/admin/portfolio-targets" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 180;
const MAX_WIDTH = 360;

// Collapsible state keys
const ADMIN_COLLAPSED_KEY = "sidebar-admin-collapsed";
const SUSTAINABILITY_COLLAPSED_KEY = "sidebar-sustainability-collapsed";
const ANALYTICS_COLLAPSED_KEY = "sidebar-analytics-collapsed";

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
  const [createCompanyDialogOpen, setCreateCompanyDialogOpen] = useState(false);
  
  // Collapsible states with localStorage persistence
  // On mobile, default to collapsed for a cleaner sidebar
  const [adminOpen, setAdminOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return false;
    const saved = localStorage.getItem(ADMIN_COLLAPSED_KEY);
    return saved !== "false";
  });
  const [sustainabilityOpen, setSustainabilityOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return false;
    const saved = localStorage.getItem(SUSTAINABILITY_COLLAPSED_KEY);
    return saved !== "false";
  });
  const [analyticsOpen, setAnalyticsOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return false;
    const saved = localStorage.getItem(ANALYTICS_COLLAPSED_KEY);
    return saved !== "false";
  });
  
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

  // Persist collapsible states
  useEffect(() => {
    localStorage.setItem(ADMIN_COLLAPSED_KEY, adminOpen.toString());
  }, [adminOpen]);
  
  useEffect(() => {
    localStorage.setItem(SUSTAINABILITY_COLLAPSED_KEY, sustainabilityOpen.toString());
  }, [sustainabilityOpen]);
  
  useEffect(() => {
    localStorage.setItem(ANALYTICS_COLLAPSED_KEY, analyticsOpen.toString());
  }, [analyticsOpen]);

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

  // Helper to render menu items - compact for mobile
  const renderMenuItem = (item: { icon: React.ComponentType<{ className?: string }>; label: string; path: string }) => {
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
          className="h-8 transition-all font-normal text-sm"
        >
          <item.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : ""}`} />
          <span className="truncate">{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  // Helper to render collapsible section - compact for mobile
  const renderCollapsibleSection = (
    title: string,
    icon: React.ComponentType<{ className?: string }>,
    items: Array<{ icon: React.ComponentType<{ className?: string }>; label: string; path: string }>,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void
  ) => {
    const Icon = icon;
    const hasActiveItem = items.some(item => location === item.path);
    
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/collapsible">
        <SidebarGroup className="py-0">
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1 transition-colors h-7">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${hasActiveItem ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-[11px] font-medium uppercase tracking-wide ${hasActiveItem ? "text-primary" : ""}`}>
                  {title}
                </span>
              </div>
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            <SidebarGroupContent>
              <SidebarMenu className="px-0 py-0.5 space-y-0">
                {items.map(renderMenuItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

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
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={APP_LOGO}
                        className="h-7 w-7 rounded-md object-cover ring-1 ring-border shrink-0"
                        alt="Logo"
                      />
                      <span className="font-bold tracking-tight truncate text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {/* Main Navigation */}
            <SidebarGroup className="py-1.5">
              <SidebarGroupContent>
                <SidebarMenu className="px-2 space-y-0.5">
                  {mainMenuItems.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Divider */}
            <div className="mx-3 my-1 border-t border-sidebar-border/30" />

            {/* Analytics & Reports Section */}
            <div className="px-2 pt-0.5">
              {renderCollapsibleSection(
                "Analytics & Reports",
                BarChart3,
                analyticsItems.filter(item => {
                  // Hide portfolio analytics if no projects have multiple assets
                  if (item.path === '/portfolio-analytics' && !hasMultiAssetProjects) return false;
                  return true;
                }),
                analyticsOpen,
                setAnalyticsOpen
              )}
            </div>

            {/* Sustainability & ESG Section */}
            <div className="px-2 pt-0.5">
              {renderCollapsibleSection(
                "Sustainability & ESG",
                Leaf,
                sustainabilityItems,
                sustainabilityOpen,
                setSustainabilityOpen
              )}
            </div>

            {/* Admin Section (only for admins) */}
            {isAdmin && (
              <div className="px-2 pt-0.5">
                {renderCollapsibleSection(
                  "Administration",
                  Shield,
                  adminItems,
                  adminOpen,
                  setAdminOpen
                )}
              </div>
            )}

            {/* Offline Status Section */}
            <div className="mt-auto px-2 py-1.5 border-t">
              <SidebarOfflineStatus isCollapsed={isCollapsed} />
            </div>
          </SidebarContent>

          <SidebarFooter className="p-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-1">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
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
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
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
