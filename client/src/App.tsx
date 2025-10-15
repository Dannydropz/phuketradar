import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AdminAuthProvider } from "@/hooks/use-admin-auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "@/pages/Home";
import ArticleDetail from "@/pages/ArticleDetail";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminLogin from "@/pages/AdminLogin";
import NotFound from "@/pages/not-found";
import faviconUrl from "@assets/favicon.png";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/article/:slugOrId" component={ArticleDetail} />
      <Route path="/category/:category" component={Home} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin">
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Set favicon dynamically from bundled asset
  useEffect(() => {
    const setFavicon = () => {
      // Update or create favicon link
      let faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
      }
      faviconLink.type = 'image/png';
      faviconLink.href = faviconUrl;
      
      // Update or create shortcut icon (for legacy browsers)
      let shortcutLink = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement;
      if (!shortcutLink) {
        shortcutLink = document.createElement('link');
        shortcutLink.rel = 'shortcut icon';
        document.head.appendChild(shortcutLink);
      }
      shortcutLink.type = 'image/png';
      shortcutLink.href = faviconUrl;
      
      // Update or create Apple touch icon
      let appleTouchLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (!appleTouchLink) {
        appleTouchLink = document.createElement('link');
        appleTouchLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleTouchLink);
      }
      appleTouchLink.href = faviconUrl;
    };
    
    setFavicon();
  }, []);

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
