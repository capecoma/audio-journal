import { Switch, Route, Redirect, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/components/auth/LoginPage";

// Lazy load page components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Journal = lazy(() => import("./pages/Journal"));
const Analytics = lazy(() => import("./pages/Analytics"));

// Loading fallback component
function LoadingPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ component: Component, ...rest }: { component: React.ComponentType<any> }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/journal">
          <ProtectedRoute component={Journal} />
        </Route>
        <Route path="/analytics">
          <ProtectedRoute component={Analytics} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

// fallback 404 not found page
function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold">404 Page Not Found</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            The page you're looking for doesn't exist.
          </p>
          <Link href="/">
            <Button className="w-full mt-4">
              <Home className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;