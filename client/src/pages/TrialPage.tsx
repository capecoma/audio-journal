import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function TrialPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get trial status
  const { data: trialStatus, isLoading } = useQuery({
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
                <p className="text-sm text-muted-foreground">
                  Trial ends on: {new Date(trialStatus.trialEndDate).toLocaleDateString()}
                </p>
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
      </Card>
    </div>
  );
}
