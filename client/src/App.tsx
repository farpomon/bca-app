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

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/projects"} component={Projects} />
      <Route path={"/projects/:id/dashboard"} component={ProjectDashboard} />
      <Route path={"/projects/:id"} component={ProjectDetail} />
      <Route path={"/projects/:id/assess"} component={Assessment} />
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
