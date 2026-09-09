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
import TemplatesPage from "@/pages/templates";
import { ClientBriefTemplatePage, LatePaymentTemplatePage, ScopeOfWorkTemplatePage } from "@/pages/template-pages";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRouter() {
  const { user, loading, isRecovery } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (isRecovery) return <ResetPasswordPage />;

  const isClientRoute = location.startsWith("/client/");
  const isPublicTemplateRoute = location === "/templates" || location.startsWith("/templates/");
  const isPublicSignupRoute = location === "/signup";

  if (!user && !isClientRoute && !isPublicTemplateRoute && !isPublicSignupRoute) return <AuthPage />;

  return (
    <Switch>
      <Route path="/templates" component={TemplatesPage} />
      <Route path="/templates/scope-of-work" component={ScopeOfWorkTemplatePage} />
      <Route path="/templates/late-payment-invoice" component={LatePaymentTemplatePage} />
      <Route path="/templates/client-brief-proposal" component={ClientBriefTemplatePage} />
      <Route path="/templates/invoice-template" component={LatePaymentTemplatePage} />
      <Route path="/templates/approval-form" component={ClientBriefTemplatePage} />
      <Route path="/templates/proposal-template" component={ClientBriefTemplatePage} />
      <Route path="/signup" component={AuthPage} />
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
            <ProtectedRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
