import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Campaigns from "./pages/Campaigns";
import Home from "./pages/Home";
import ManagerDashboard from "./pages/ManagerDashboard";
import OrthoActive from "./pages/OrthoActive";
import PatientFollowUps from "./pages/PatientFollowUps";
import ValDashboard from "./pages/ValDashboard";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/pacientes-ativos" component={OrthoActive} /><Route path="/campanhas" component={Campaigns} /><Route path="/val" component={ValDashboard} /><Route path="/acompanhamento" component={PatientFollowUps} /><Route path="/gerente" component={ManagerDashboard} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
