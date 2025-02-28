import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import AiCoaching from "@/pages/ai-coaching";

import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Strengths from "@/pages/strengths";
import Coaching from "@/pages/coaching";
import Shop from "@/pages/shop";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/strengths" component={Strengths} />
      <ProtectedRoute path="/coaching" component={Coaching} />
      <ProtectedRoute path="/shop" component={Shop} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/ai-coaching" component={AiCoaching} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;