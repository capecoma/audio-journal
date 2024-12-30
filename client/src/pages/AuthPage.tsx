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

const authSchema = z.object({
  username: z.string().email("Must be a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const resetSchema = z.object({
  email: z.string().email("Must be a valid email"),
});

const newPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type AuthForm = z.infer<typeof authSchema>;
type ResetForm = z.infer<typeof resetSchema>;
type NewPasswordForm = z.infer<typeof newPasswordSchema>;

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register" | "reset" | "new-password">("login");
  const { login, register, requestPasswordReset, resetPassword } = useUser();
  const { toast } = useToast();
  const [resetToken, setResetToken] = useState<string | null>(null);

  const {
    register: registerForm,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
  });

  const {
    register: registerResetForm,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const {
    register: registerNewPasswordForm,
    handleSubmit: handleNewPasswordSubmit,
    formState: { errors: newPasswordErrors },
  } = useForm<NewPasswordForm>({
    resolver: zodResolver(newPasswordSchema),
  });

  const onSubmit = async (data: AuthForm) => {
    try {
      if (mode === "login") {
        const result = await login(data);
        if (!result.ok) {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive",
          });
        }
      } else {
        const result = await register(data);
        if (!result.ok) {
          toast({
            title: "Error",
            description: result.message,
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
          {(mode === "login" || mode === "register") && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Input
                  {...registerForm("username")}
                  type="email"
                  placeholder="Email"
                  className={errors.username ? "border-destructive" : ""}
                />
                {errors.username && (
                  <p className="text-sm text-destructive mt-1">{errors.username.message}</p>
                )}
              </div>
              <div>
                <Input
                  {...registerForm("password")}
                  type="password"
                  placeholder="Password"
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                {mode === "login" ? "Login" : "Register"}
              </Button>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
              <div>
                <Input
                  {...registerResetForm("email")}
                  type="email"
                  placeholder="Email"
                  className={resetErrors.email ? "border-destructive" : ""}
                />
                {resetErrors.email && (
                  <p className="text-sm text-destructive mt-1">{resetErrors.email.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Send Reset Link
              </Button>
            </form>
          )}

          {mode === "new-password" && (
            <form onSubmit={handleNewPasswordSubmit(onNewPasswordSubmit)} className="space-y-4">
              <div>
                <Input
                  {...registerNewPasswordForm("password")}
                  type="password"
                  placeholder="New Password"
                  className={newPasswordErrors.password ? "border-destructive" : ""}
                />
                {newPasswordErrors.password && (
                  <p className="text-sm text-destructive mt-1">{newPasswordErrors.password.message}</p>
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
