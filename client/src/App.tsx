import { Switch, Route, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, Loader2 } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import Analytics from "./pages/Analytics";
import AuthPage from "./pages/AuthPage";
import { useUser } from "@/hooks/use-user";

function App() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/journal" component={Journal} />
      <Route path="/analytics" component={Analytics} />
      <Route component={NotFound} />
    </Switch>
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