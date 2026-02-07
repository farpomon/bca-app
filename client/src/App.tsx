import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectDashboard from "./pages/ProjectDashboard";
import Assessment from "./pages/Assessment";
import AssetsList from "./pages/AssetsList";
import AssetDetail from "./pages/AssetDetail";
import HierarchySettings from "./pages/HierarchySettings";
import RatingScalesSettings from "./pages/RatingScalesSettings";
import AuditTrailDashboard from "./pages/AuditTrailDashboard";
import ConsultantUpload from "./pages/ConsultantUpload";
import ReviewDashboard from "./pages/ReviewDashboard";
import PredictionsDashboard from "./pages/PredictionsDashboard";
import OptimizationDashboard from "./pages/OptimizationDashboard";
import PrioritizationDashboard from "./pages/PrioritizationDashboard";
import PrioritizationDashboardNew from "./pages/PrioritizationDashboardNew";
import CapitalBudgetPlanner from "./pages/CapitalBudgetPlanner";
import LPOptimizationDashboard from "./pages/LPOptimizationDashboard";
import Model3DViewer from "./pages/Model3DViewer";
import PortfolioBIDashboard from "./pages/PortfolioBIDashboard";
import PortfolioAnalytics from "./pages/PortfolioAnalytics";
import PortfolioAnalyticsEnhanced from "./pages/PortfolioAnalyticsEnhanced";
import PortfolioMapPage from "./pages/PortfolioMapPage";
import PortfolioReport from "./pages/PortfolioReport";
import SingleAssetReport from "./pages/SingleAssetReport";
import PortfolioWideReport from "./pages/PortfolioWideReport";
import Admin from "./pages/Admin";
import AdminGovernance from "./pages/AdminGovernance";
import EconomicIndicators from "./pages/EconomicIndicators";
import PortfolioTargets from "./pages/PortfolioTargets";
import Analytics from "./pages/Analytics";
import ProjectAnalytics from "./pages/ProjectAnalytics";
import ESGDashboard from "./pages/ESGDashboard";
import ESGLeedDashboard from "./pages/ESGLeedDashboard";
import AICarbonRecommendations from "./pages/AICarbonRecommendations";
import LEEDComplianceReport from "./pages/LEEDComplianceReport";
import SustainabilityDashboard from "./pages/SustainabilityDashboard";
import CarbonFootprintReport from "./pages/CarbonFootprintReport";
import RSMeansCostBrowser from "./pages/RSMeansCostBrowser";
import BuildingTemplates from "./pages/BuildingTemplates";
import BulkServiceLifeUpdates from "./pages/BulkServiceLifeUpdates";
import DeletedProjects from "./pages/DeletedProjects";
import Archive from "./pages/Archive";
import PendingApproval from "./pages/PendingApproval";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import PrivacySettings from "./pages/PrivacySettings";
import DataSecurity from "./pages/DataSecurity";
import SecuritySettings from "./pages/SecuritySettings";
import SignUp from "./pages/SignUp";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import CompanyUsersPage from "./pages/CompanyUsersPage";
import UniformatClassification from "./pages/features/UniformatClassification";
import VoiceRecording from "./pages/features/VoiceRecording";
import AutomatedReports from "./pages/features/AutomatedReports";
import ASTMCompliant from "./pages/features/ASTMCompliant";
import OfflineMode from "./pages/features/OfflineMode";
import AnalyticsInsights from "./pages/features/AnalyticsInsights";
import SidebarDemo from "./pages/SidebarDemo";
import { NotificationPermissionDialog } from "./components/NotificationPermissionDialog";
import { UnitProvider } from "./contexts/UnitContext";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/features/uniformat-classification"} component={UniformatClassification} />
      <Route path={"/features/voice-recording"} component={VoiceRecording} />
      <Route path={"/features/automated-reports"} component={AutomatedReports} />
      <Route path={"/features/astm-compliant"} component={ASTMCompliant} />
      <Route path={"/features/offline-mode"} component={OfflineMode} />
      <Route path={"/features/analytics-insights"} component={AnalyticsInsights} />
      <Route path={"/sidebar-demo"} component={SidebarDemo} />
      <Route path={"/signup"} component={SignUp} />
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/contact"} component={Contact} />
      <Route path={"/pending-approval"} component={PendingApproval} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/admin/governance"} component={AdminGovernance} />
      <Route path={"/company-users"} component={CompanyUsersPage} />
      <Route path={"/deleted-projects"} component={DeletedProjects} />
      <Route path={"/archive"} component={Archive} />
      <Route path={"/projects"} component={Projects} />
      <Route path={"/projects/:id/dashboard"} component={ProjectDashboard} />
      <Route path={"/projects/:id/assets"} component={AssetsList} />
      <Route path={"/projects/:id/analytics"} component={ProjectAnalytics} />
      <Route path={"/projects/:id/assets/:assetId/assess"} component={Assessment} />
      <Route path={"/projects/:id/assets/:assetId"} component={AssetDetail} />
      <Route path={"/projects/:id"} component={ProjectDetail} />
      <Route path={"/settings/hierarchy"} component={HierarchySettings} />
      <Route path={"/settings/rating-scales"} component={RatingScalesSettings} />
      <Route path={"/admin/audit-trail"} component={AuditTrailDashboard} />
      <Route path={"/consultant/upload"} component={ConsultantUpload} />
      <Route path={"/admin/review"} component={ReviewDashboard} />
      <Route path={"/predictions"} component={PredictionsDashboard} />
      <Route path={"/projects/:id/optimization"} component={OptimizationDashboard} />
      <Route path={"/prioritization"} component={PrioritizationDashboardNew} />
      <Route path={"/prioritization-old"} component={PrioritizationDashboard} />
      <Route path={"/capital-budget"} component={CapitalBudgetPlanner} />
      <Route path={"/lp-optimization"} component={LPOptimizationDashboard} />
      <Route path={"/projects/:id/3d-model"} component={Model3DViewer} />
      <Route path={"/portfolio-bi"} component={PortfolioBIDashboard} />
      <Route path={"/portfolio-analytics"} component={PortfolioAnalytics} />
      <Route path={"/portfolio-analytics-enhanced"} component={PortfolioAnalyticsEnhanced} />
      <Route path={"/portfolio-map"} component={PortfolioMapPage} />
      <Route path={"/portfolio-report"} component={PortfolioReport} />
      <Route path={"/single-asset-report"} component={SingleAssetReport} />
      <Route path={"/portfolio-wide-report"} component={PortfolioWideReport} />
      <Route path={"/admin/compliance"} component={ComplianceDashboard} />
      <Route path={"/admin/data-security"} component={DataSecurity} />
      <Route path={"/admin/economic-indicators"} component={EconomicIndicators} />
      <Route path={"/admin/portfolio-targets"} component={PortfolioTargets} />
      <Route path={"/analytics"} component={Analytics} />
      <Route path={"/esg-dashboard"} component={ESGDashboard} />
      <Route path={"/esg-leed"} component={ESGLeedDashboard} />
      <Route path={"/ai-carbon-recommendations"} component={AICarbonRecommendations} />
      <Route path={"/leed-compliance-report"} component={LEEDComplianceReport} />
      <Route path={"/sustainability"} component={SustainabilityDashboard} />
      <Route path={"/carbon-footprint"} component={CarbonFootprintReport} />
      <Route path={"/rsmeans"} component={RSMeansCostBrowser} />
      <Route path={"/admin/building-templates"} component={BuildingTemplates} />
      <Route path={"/admin/bulk-service-life-updates"} component={BulkServiceLifeUpdates} />
      <Route path={"/settings/privacy"} component={PrivacySettings} />
      <Route path={"/settings/security"} component={SecuritySettings} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <UnitProvider>
          <CompanyProvider>
            <TooltipProvider>
              <Toaster />
              <NotificationPermissionDialog />
              <Router />
            </TooltipProvider>
          </CompanyProvider>
        </UnitProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
