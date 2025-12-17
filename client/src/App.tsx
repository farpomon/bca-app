import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
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
import CapitalBudgetPlanner from "./pages/CapitalBudgetPlanner";
import LPOptimizationDashboard from "./pages/LPOptimizationDashboard";
import Model3DViewer from "./pages/Model3DViewer";
import PortfolioBIDashboard from "./pages/PortfolioBIDashboard";
import Admin from "./pages/Admin";
import DeletedProjects from "./pages/DeletedProjects";
import PendingApproval from "./pages/PendingApproval";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import PrivacySettings from "./pages/PrivacySettings";
import DataSecurity from "./pages/DataSecurity";
import SecuritySettings from "./pages/SecuritySettings";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/pending-approval"} component={PendingApproval} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/deleted-projects"} component={DeletedProjects} />
      <Route path={"/projects"} component={Projects} />
      <Route path={"/projects/:id/dashboard"} component={ProjectDashboard} />
      <Route path={"/projects/:id/assets"} component={AssetsList} />
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
      <Route path={"/prioritization"} component={PrioritizationDashboard} />
      <Route path={"/capital-budget"} component={CapitalBudgetPlanner} />
      <Route path={"/lp-optimization"} component={LPOptimizationDashboard} />
      <Route path={"/projects/:id/3d-model"} component={Model3DViewer} />
      <Route path={"/portfolio-analytics"} component={PortfolioBIDashboard} />
      <Route path={"/admin/compliance"} component={ComplianceDashboard} />
      <Route path={"/admin/data-security"} component={DataSecurity} />
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
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
