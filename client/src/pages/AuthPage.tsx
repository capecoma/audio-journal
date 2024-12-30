import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUser } from "../hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Must be a valid email"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { login, register: registerUser } = useUser();
  const { toast } = useToast();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onLoginSubmit = async (data: LoginForm) => {
    try {
      const result = await login({
        username: data.username,
        password: data.password,
      });
      if (!result.ok) {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onRegisterSubmit = async (data: RegisterForm) => {
    try {
      const result = await registerUser({
        username: data.username,
        email: data.email,
        password: data.password,
      });
      if (!result.ok) {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      } else {
        // After successful registration, automatically log in
        const loginResult = await login({
          username: data.username,
          password: data.password,
        });
        if (!loginResult.ok) {
          toast({
            title: "Warning",
            description: "Registration successful but login failed. Please try logging in manually.",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>
            {mode === "login" ? "Login" : "Register"}
          </CardTitle>
          <CardDescription>
            {mode === "login" 
              ? "Welcome back! Please login to continue."
              : "Create a new account to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "login" && (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <div>
                <Input
                  {...loginForm.register("username")}
                  placeholder="Username"
                  className={loginForm.formState.errors.username ? "border-destructive" : ""}
                />
                {loginForm.formState.errors.username && (
                  <p className="text-sm text-destructive mt-1">
                    {loginForm.formState.errors.username.message}
                  </p>
                )}
              </div>
              <div>
                <Input
                  {...loginForm.register("password")}
                  type="password"
                  placeholder="Password"
                  className={loginForm.formState.errors.password ? "border-destructive" : ""}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <div>
                <Input
                  {...registerForm.register("email")}
                  type="email"
                  placeholder="Email"
                  className={registerForm.formState.errors.email ? "border-destructive" : ""}
                />
                {registerForm.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">
                    {registerForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <Input
                  {...registerForm.register("username")}
                  placeholder="Username"
                  className={registerForm.formState.errors.username ? "border-destructive" : ""}
                />
                {registerForm.formState.errors.username && (
                  <p className="text-sm text-destructive mt-1">
                    {registerForm.formState.errors.username.message}
                  </p>
                )}
              </div>
              <div>
                <Input
                  {...registerForm.register("password")}
                  type="password"
                  placeholder="Password"
                  className={registerForm.formState.errors.password ? "border-destructive" : ""}
                />
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">
                    {registerForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Register
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login"
              ? "Don't have an account? Register"
              : "Already have an account? Login"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}