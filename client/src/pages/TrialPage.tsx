import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import TrialNav from "@/components/trial/TrialNav";

interface TrialStatus {
  currentTier: 'free' | 'trial' | 'basic';
  isTrialActive: boolean;
  trialUsed: boolean;
  trialEndDate: string | null;
  trialStartDate: string | null;
}

export function TrialPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get trial status
  const { data: trialStatus, isLoading } = useQuery<TrialStatus>({
    queryKey: ['/api/trial/status'],
  });

  // Activate trial mutation
  const activateTrial = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/trial/activate', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Trial Activated",
        description: "Your 10-day trial has been successfully activated!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trial/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <TrialNav />
      <Card>
        <CardHeader>
          <CardTitle>Trial Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-lg font-medium">
                Current Tier: {trialStatus?.currentTier}
              </p>
              {trialStatus?.isTrialActive && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Trial ends on: {new Date(trialStatus.trialEndDate).toLocaleDateString()}
                  </p>
                  {(() => {
                    const now = new Date();
                    const endDate = new Date(trialStatus.trialEndDate);
                    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (daysLeft <= 2) {
                      return (
                        <div className="p-4 rounded-md bg-yellow-50 border border-yellow-200">
                          <p className="text-sm font-medium text-yellow-800">
                            Trial expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}!
                          </p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Upgrade to continue enjoying premium features.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
            
            {!trialStatus?.isTrialActive && !trialStatus?.trialUsed && (
              <Button 
                onClick={() => activateTrial.mutate()}
                disabled={activateTrial.isPending}
              >
                {activateTrial.isPending ? "Activating..." : "Activate 10-Day Trial"}
              </Button>
            )}
            
            {trialStatus?.trialUsed && !trialStatus?.isTrialActive && (
              <p className="text-sm text-muted-foreground">
                Trial period has been used
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => setLocation("/trial/analytics")}
            className="ml-auto"
          >
            View Trial Analytics
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
