import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiGoogle } from "react-icons/si";

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Audio Journal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p className="text-center text-muted-foreground">
              Sign in to start recording and analyzing your journal entries
            </p>
            <Button 
              onClick={login}
              className="w-full flex items-center justify-center gap-2"
            >
              <SiGoogle className="w-4 h-4" />
              Sign in with Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
