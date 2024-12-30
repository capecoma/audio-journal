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
  email: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Must be a valid email"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const resetSchema = z.object({
  email: z.string().email("Must be a valid email"),
});

const newPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type ResetForm = z.infer<typeof resetSchema>;
type NewPasswordForm = z.infer<typeof newPasswordSchema>;

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register" | "reset" | "new-password">("login");
  const { login, register: registerUser, requestPasswordReset, resetPassword } = useUser();
  const { toast } = useToast();
  const [resetToken, setResetToken] = useState<string | null>(null);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const newPasswordForm = useForm<NewPasswordForm>({
    resolver: zodResolver(newPasswordSchema),
  });

  const onLoginSubmit = async (data: LoginForm) => {
    try {
      const result = await login({
        username: data.email, // Backend expects username field
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
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const onResetSubmit = async (data: ResetForm) => {
    try {
      const result = await requestPasswordReset(data);
      if (result.ok) {
        toast({
          title: "Success",
          description: "Password reset email sent. Please check your inbox.",
        });
      } else {
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

  const onNewPasswordSubmit = async (data: NewPasswordForm) => {
    if (!resetToken) return;
    try {
      const result = await resetPassword({ token: resetToken, newPassword: data.password });
      if (result.ok) {
        toast({
          title: "Success",
          description: "Password has been reset successfully. Please login with your new password.",
        });
        setMode("login");
      } else {
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>
            {mode === "login" && "Login"}
            {mode === "register" && "Register"}
            {mode === "reset" && "Reset Password"}
            {mode === "new-password" && "Set New Password"}
          </CardTitle>
          <CardDescription>
            {mode === "login" && "Welcome back! Please login to continue."}
            {mode === "register" && "Create a new account to get started."}
            {mode === "reset" && "Enter your email to reset your password."}
            {mode === "new-password" && "Enter your new password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "login" && (
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <div>
                <Input
                  {...loginForm.register("email")}
                  type="email"
                  placeholder="Email"
                  className={loginForm.formState.errors.email ? "border-destructive" : ""}
                />
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">{loginForm.formState.errors.email.message}</p>
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
                  <p className="text-sm text-destructive mt-1">{loginForm.formState.errors.password.message}</p>
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
                  <p className="text-sm text-destructive mt-1">{registerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <Input
                  {...registerForm.register("username")}
                  type="text"
                  placeholder="Username"
                  className={registerForm.formState.errors.username ? "border-destructive" : ""}
                />
                {registerForm.formState.errors.username && (
                  <p className="text-sm text-destructive mt-1">{registerForm.formState.errors.username.message}</p>
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
                  <p className="text-sm text-destructive mt-1">{registerForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Register
              </Button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
              <div>
                <Input
                  {...resetForm.register("email")}
                  type="email"
                  placeholder="Email"
                  className={resetForm.formState.errors.email ? "border-destructive" : ""}
                />
                {resetForm.formState.errors.email && (
                  <p className="text-sm text-destructive mt-1">{resetForm.formState.errors.email.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Send Reset Link
              </Button>
            </form>
          )}

          {mode === "new-password" && (
            <form onSubmit={newPasswordForm.handleSubmit(onNewPasswordSubmit)} className="space-y-4">
              <div>
                <Input
                  {...newPasswordForm.register("password")}
                  type="password"
                  placeholder="New Password"
                  className={newPasswordForm.formState.errors.password ? "border-destructive" : ""}
                />
                {newPasswordForm.formState.errors.password && (
                  <p className="text-sm text-destructive mt-1">{newPasswordForm.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Set New Password
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {mode === "login" && (
            <>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setMode("register")}
              >
                Don't have an account? Register
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setMode("reset")}
              >
                Forgot password?
              </Button>
            </>
          )}
          {mode === "register" && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setMode("login")}
            >
              Already have an account? Login
            </Button>
          )}
          {(mode === "reset" || mode === "new-password") && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setMode("login")}
            >
              Back to Login
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}