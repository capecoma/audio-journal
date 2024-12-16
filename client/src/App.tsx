import { Switch, Route, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Loader2 } from "lucide-react";
import { Suspense, lazy, useState, useEffect } from "react";

// Lazy load route components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Journal = lazy(() => import("./pages/Journal"));
const Analytics = lazy(() => import("./pages/Analytics"));

// Loading fallback component
// Delay showing loading spinner to prevent flashing
function DelayedSpinner() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Only show spinner for loads longer than 200ms
    const timer = setTimeout(() => setShouldShow(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (!shouldShow) return null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function App() {
  useEffect(() => {
    // Preload other routes on initial load
    const preloadRoutes = () => {
      // Start preloading after initial render
      const timer = setTimeout(() => {
        Journal.preload();
        Analytics.preload();
      }, 1000);
      return () => clearTimeout(timer);
    };
    preloadRoutes();
  }, []);

  return (
    <Suspense fallback={<DelayedSpinner />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/journal" component={Journal} />
        <Route path="/analytics" component={Analytics} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

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
