import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AdminAuthProvider } from "@/hooks/use-admin-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "@/pages/HomeNew";
import ArticleDetail from "@/pages/ArticleDetailNew";
import JournalistProfile from "@/pages/JournalistProfile";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminInsights from "@/pages/AdminInsights";
import AdminLogin from "@/pages/AdminLogin";
import Privacy from "@/pages/Privacy";
import DesignPreview from "@/pages/DesignPreview";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/design-preview" component={DesignPreview} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin">
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/insights">
        <ProtectedRoute>
          <AdminInsights />
        </ProtectedRoute>
      </Route>
      <Route path="/journalist/:id" component={JournalistProfile} />
      <Route path="/:category/:slugOrId" component={ArticleDetail} />
      <Route path="/:category" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AdminAuthProvider>
            <Toaster />
            <Router />
          </AdminAuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
