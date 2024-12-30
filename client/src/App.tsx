import { Switch, Route, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Suspense, lazy } from "react";
import { useUser } from "./hooks/use-user";
import Navigation from "./components/layout/Navigation";
import AuthPage from "./pages/AuthPage";

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

function App() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      {/* Main content area */}
      <main className="flex-1 mt-14 md:pl-[240px]">
        <div className="container max-w-[1600px] mx-auto p-4">
          {/* Page content */}
          <Suspense fallback={<LoadingPage />}>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/journal" component={Journal} />
              <Route path="/analytics" component={Analytics} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full flex items-center justify-center">
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