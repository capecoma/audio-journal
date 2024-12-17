import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";

const authSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .min(3, "Username must be at least 3 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

type AuthForm = z.infer<typeof authSchema>;

export default function AuthPage() {
  const { toast } = useToast();
  const { login, register } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const form = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (formData: AuthForm) => {
    try {
      setIsSubmitting(true);
      
      // Debug: Log form state
      console.log('=== Form Submission Debug ===');
      console.log('Current tab:', activeTab);
      console.log('Form data:', formData);
      console.log('Form state:', {
        isDirty: form.formState.isDirty,
        isValid: form.formState.isValid,
        errors: form.formState.errors,
      });
      
      // Clear previous form errors
      form.clearErrors();

      // Validate required fields
      if (!formData.username || !formData.password) {
        console.error('Debug: Missing required fields', {
          username: !!formData.username,
          password: !!formData.password
        });
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Username and password are required"
        });
        return;
      }

      // Debug: Log API call
      console.log('Attempting API call:', {
        endpoint: activeTab === "login" ? "/api/login" : "/api/register",
        payload: {
          username: formData.username,
          password: '[REDACTED]'
        }
      });

      const result = await (activeTab === "login" ? login(formData) : register(formData));
      
      // Debug: Log API response
      console.log('API Response:', {
        success: result.ok,
        message: result.message || 'No message provided'
      });
      
      if (!result.ok) {
        console.error('Debug: API call failed', result);
        toast({
          variant: "destructive",
          title: `${activeTab === "login" ? "Login" : "Registration"} failed`,
          description: result.message || "An unexpected error occurred",
        });
        return;
      }

      // Clear form after successful submission
      form.reset();

      console.log('Debug: Form submission successful');
      toast({
        title: `${activeTab === "login" ? "Login" : "Registration"} successful`,
        description: `Welcome ${formData.username}!`,
      });
    } catch (error: any) {
      console.error('Debug: Unexpected error during form submission:', {
        error: error.message,
        stack: error.stack
      });
      toast({
        variant: "destructive",
        title: `${activeTab === "login" ? "Login" : "Registration"} failed`,
        description: error.message || "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
      console.log('=== End Form Submission Debug ===');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Audio Journal</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Enter your password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="register">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Choose a username"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Choose a password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Register"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
