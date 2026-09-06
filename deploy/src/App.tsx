import { Component, type ErrorInfo, type ReactNode } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import Dashboard from "@/pages/dashboard";
import ProjectDetail from "@/pages/project-detail";
import ClientPortal from "@/pages/client-portal";
import AuthPage from "@/pages/auth";
import ResetPasswordPage from "@/pages/reset-password";
import NotFound from "@/pages/not-found";
const queryClient = new QueryClient();

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Parlo] app render error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-semibold">
              !
            </div>
            <h1 className="text-xl font-semibold">Parlo couldn’t load this page</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Refresh the page once. If it keeps happening, sign out and back in so we can refresh your session.
            </p>
            <p className="mt-4 rounded-md bg-muted px-3 py-2 text-left text-xs text-muted-foreground break-words">
              {this.state.error.message}
            </p>
            <button
              type="button"
              className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Reload Parlo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
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
  if (!user && !isClientRoute) {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects/:id" component={ProjectDetail} />
      <Route path="/client/:token" component={ClientPortal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppErrorBoundary>
            <ProtectedRouter />
          </AppErrorBoundary>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
