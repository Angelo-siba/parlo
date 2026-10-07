import { lazy, Suspense } from "react";
import { Redirect, Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const CalendarPage = lazy(() => import("@/pages/calendar"));
const NotebookPage = lazy(() => import("@/pages/notebook"));
const RevenuePage = lazy(() => import("@/pages/revenue"));
const LandingPage = lazy(() => import("@/pages/landing"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const ClientPortal = lazy(() => import("@/pages/client-portal"));
const AuthPage = lazy(() => import("@/pages/auth"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const NotFound = lazy(() => import("@/pages/not-found"));
const queryClient = new QueryClient();

function PageLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      Loading…
    </div>
  );
}

function ProtectedRouter() {
  const { user, loading, isRecovery } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (isRecovery) {
    return <ResetPasswordPage />;
  }

  const isClientRoute = location.startsWith("/client/");

  if (user && (location === "/signup" || location === "/login")) {
    return <Redirect to="/" />;
  }

  const isPublicRoute = location === "/" || location === "/pricing" || location === "/signup" || location === "/login";

  if (!user && location === "/") {
    return <LandingPage />;
  }
  if (!user && location === "/pricing") {
    return <PricingPage />;
  }
  if (!user && (location === "/signup" || location === "/login")) {
    return <AuthPage />;
  }
  if (!user && !isClientRoute && !isPublicRoute) {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/notebook" component={NotebookPage} />
      <Route path="/revenue" component={RevenuePage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/signup" component={AuthPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/client/:token" component={ClientPortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
        storageKey="parlo-theme"
      >
        <AuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Suspense fallback={<PageLoading />}>
                <ProtectedRouter />
              </Suspense>
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
