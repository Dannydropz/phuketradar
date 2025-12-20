import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AdminAuthProvider } from "@/hooks/use-admin-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";
import Home from "@/pages/HomeNew";

const ArticleDetail = lazy(() => import("@/pages/ArticleDetailNew"));
const JournalistProfile = lazy(() => import("@/pages/JournalistProfile"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminInsights = lazy(() => import("@/pages/AdminInsights"));
const AdminAnalytics = lazy(() => import("@/pages/AdminAnalytics"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const TagPage = lazy(() => import("@/pages/TagPage"));
const TimelineStory = lazy(() => import("@/pages/TimelineStory"));
const NotFound = lazy(() => import("@/pages/not-found"));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/privacy" component={Privacy} />
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
      <Route path="/admin/analytics">
        <ProtectedRoute>
          <AdminAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/story/:seriesId" component={TimelineStory} />
      <Route path="/tag/:tag" component={TagPage} />
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
            <Suspense fallback={<LoadingFallback />}>
              <Router />
            </Suspense>
          </AdminAuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
