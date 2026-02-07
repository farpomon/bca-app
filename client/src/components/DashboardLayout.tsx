import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

import { APP_LOGO, APP_TAGLINE, APP_TITLE, getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, 
  LogOut, 
  Users, 
  Shield, 
  Trash2, 
  Building2, 
  Settings, 
  Leaf, 
  DollarSign, 
  Factory, 
  Sparkles, 
  FileText, 
  Award,
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
  Archive,
  Menu,
  X,
  HelpCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { MFAGracePeriodBanner } from './MFAGracePeriodBanner';
import { OfflineStatusBanner } from './OfflineStatusBanner';
import { UnitToggleCompact } from './UnitToggle';
import { CompanySelector } from './CompanySelector';
import { PendingInvitationsBanner } from './PendingInvitationsBanner';
import { useCompany } from '@/contexts/CompanyContext';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { FloatingChatbot } from './FloatingChatbot';
import { cn } from "@/lib/utils";

// Core Operations - Primary workflow items
const coreOperationsItems = [
  { icon: LayoutDashboard, label: "Projects", path: "/" },
  { icon: DollarSign, label: "RSMeans Cost Data", path: "/rsmeans" },
];

// Reporting & Analytics - Data analysis and insights
const reportingItems = [
  { icon: BarChart3, label: "Portfolio Analytics and BI", path: "/portfolio-analytics" },
  { icon: LineChart, label: "Predictions", path: "/predictions" },
  { icon: Target, label: "Prioritization", path: "/prioritization" },
  { icon: Calculator, label: "Capital Budget", path: "/capital-budget" },
  { icon: Building2, label: "Single Asset Report", path: "/single-asset-report" },
  { icon: FileCheck, label: "Portfolio-Wide Report", path: "/portfolio-wide-report" },
];

// Sustainability & ESG - Environmental and compliance
const sustainabilityItems = [
  { icon: Leaf, label: "ESG Dashboard", path: "/esg-dashboard" },
  { icon: Award, label: "ESG & LEED", path: "/esg-leed" },
  { icon: Sparkles, label: "AI Carbon Recommendations", path: "/ai-carbon-recommendations" },
  { icon: FileText, label: "LEED Compliance Report", path: "/leed-compliance-report" },
  { icon: Leaf, label: "Sustainability", path: "/sustainability" },
  { icon: Factory, label: "Carbon Footprint", path: "/carbon-footprint" },
];

// System Management - Trash and archives
const systemItems = [
  { icon: Trash2, label: "Deleted Projects", path: "/deleted-projects" },
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();

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

  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
};

function DashboardLayoutContent({ children }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { isSuperAdmin, selectedCompany } = useCompany();
  const { filterMenuItems } = usePageVisibility();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Check if any project has multiple assets for portfolio analytics visibility
  const { data: hasMultiAssetProjects } = trpc.projects.hasMultiAssetProjects.useQuery(
    undefined,
    { enabled: !!user }
  );

  const isAdmin = user?.role === 'admin';

  // Get filtered items for each section
  const filteredCoreItems = filterMenuItems(coreOperationsItems);
  const filteredReportingItems = filterMenuItems(reportingItems.filter(item => {
    // Hide portfolio analytics if no projects have multiple assets
    if (item.path === '/portfolio-analytics' && !hasMultiAssetProjects) return false;
    return true;
  }));
  const filteredSustainabilityItems = filterMenuItems(sustainabilityItems);
  const filteredSystemItems = filterMenuItems(systemItems);
  const filteredAdminItems = filterMenuItems(adminItems);

  const handleNavigation = (path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (mobileMenuOpen) {
      const handleClickOutside = () => setMobileMenuOpen(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          {/* Logo and Title */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src={APP_LOGO}
              className="h-8 w-8 rounded-md object-cover ring-1 ring-border"
              alt="Logo"
            />
            {!isMobile && (
              <span className="font-bold tracking-tight text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {APP_TITLE}
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          {!isMobile && (
            <nav className="flex items-center gap-1 flex-1">
              {/* Core Items */}
              {filteredCoreItems.map(item => {
                const isActive = location === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}

              {/* Reporting & Analytics Dropdown */}
              {filteredReportingItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      filteredReportingItems.some(item => location === item.path)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}>
                      <BarChart3 className="h-4 w-4" />
                      Reporting & Analytics
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {filteredReportingItems.map(item => {
                      const isActive = location === item.path;
                      return (
                        <DropdownMenuItem
                          key={item.path}
                          onClick={() => handleNavigation(item.path)}
                          className={cn(isActive && "bg-primary/10 text-primary")}
                        >
                          <item.icon className="h-4 w-4 mr-2" />
                          {item.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Sustainability & ESG Dropdown */}
              {filteredSustainabilityItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      filteredSustainabilityItems.some(item => location === item.path)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}>
                      <Leaf className="h-4 w-4" />
                      Sustainability & ESG
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {filteredSustainabilityItems.map(item => {
                      const isActive = location === item.path;
                      return (
                        <DropdownMenuItem
                          key={item.path}
                          onClick={() => handleNavigation(item.path)}
                          className={cn(isActive && "bg-primary/10 text-primary")}
                        >
                          <item.icon className="h-4 w-4 mr-2" />
                          {item.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Administration Dropdown (Admin Only) */}
              {isAdmin && filteredAdminItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      filteredAdminItems.some(item => location === item.path)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}>
                      <Shield className="h-4 w-4" />
                      Administration
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {filteredAdminItems.map(item => {
                      const isActive = location === item.path;
                      return (
                        <DropdownMenuItem
                          key={item.path}
                          onClick={() => handleNavigation(item.path)}
                          className={cn(isActive && "bg-primary/10 text-primary")}
                        >
                          <item.icon className="h-4 w-4 mr-2" />
                          {item.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* System Items */}
              {filteredSystemItems.map(item => {
                const isActive = location === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Mobile Menu Toggle */}
          {isMobile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="ml-auto p-2 hover:bg-accent rounded-md"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}

          {/* Right Side Items */}
          {!isMobile && (
            <div className="flex items-center gap-3 ml-auto">
              {/* Company Selector */}
              <div className="w-48">
                <CompanySelector />
              </div>

              {/* Unit Toggle */}
              <UnitToggleCompact />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.name || "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobile && mobileMenuOpen && (
          <div className="border-t bg-background">
            <div className="px-4 py-3 space-y-1 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
              {/* Company Selector */}
              <div className="mb-3">
                <CompanySelector />
              </div>

              {/* Core Items */}
              {filteredCoreItems.map(item => {
                const isActive = location === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}

              {/* Reporting & Analytics Section */}
              {filteredReportingItems.length > 0 && (
                <>
                  <div className="pt-2 pb-1 px-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Reporting & Analytics
                    </p>
                  </div>
                  {filteredReportingItems.map(item => {
                    const isActive = location === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigation(item.path)}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-md transition-colors",
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Sustainability & ESG Section */}
              {filteredSustainabilityItems.length > 0 && (
                <>
                  <div className="pt-2 pb-1 px-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Sustainability & ESG
                    </p>
                  </div>
                  {filteredSustainabilityItems.map(item => {
                    const isActive = location === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigation(item.path)}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-md transition-colors",
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Administration Section (Admin Only) */}
              {isAdmin && filteredAdminItems.length > 0 && (
                <>
                  <div className="pt-2 pb-1 px-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Administration
                    </p>
                  </div>
                  {filteredAdminItems.map(item => {
                    const isActive = location === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigation(item.path)}
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 text-sm rounded-md transition-colors",
                          isActive 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </>
              )}

              {/* System Items */}
              {filteredSystemItems.map(item => {
                const isActive = location === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}

              {/* User Section */}
              <div className="pt-3 mt-3 border-t">
                <div className="flex items-center gap-3 px-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded-md transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Banners */}
      <MFAGracePeriodBanner />
      <PendingInvitationsBanner />
      <OfflineStatusBanner />

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Floating Chatbot */}
      <FloatingChatbot />
    </div>
  );
}
