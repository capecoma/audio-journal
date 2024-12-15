import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, BarChart2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EntryList from "@/components/dashboard/EntryList";
import DailySummary from "@/components/dashboard/DailySummary";
import Navigation from "@/components/layout/Navigation";
import type { Entry, Summary } from "@db/schema";
import type { TrialStatus } from "@/types/trial";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Get trial status
  const { data: trialStatus } = useQuery<TrialStatus>({
    queryKey: ['/api/trial/status'],
  });

  const { data: entries = [] } = useQuery<Entry[]>({
    queryKey: ["/api/entries", searchQuery],
    queryFn: async () => {
      const url = searchQuery
        ? `/api/entries?search=${encodeURIComponent(searchQuery)}`
        : "/api/entries";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch entries");
      }
      return response.json();
    },
  });

  const { data: summaries = [] } = useQuery<Summary[]>({
    queryKey: ["/api/summaries/daily"],
  });

  const handlePlayEntry = (entry: Entry) => {
    const audio = new Audio(entry.audioUrl);
    audio.play().catch(error => {
      toast({
        title: "Error",
        description: "Failed to play audio: " + error.message,
        variant: "destructive",
      });
    });
  };

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 pl-[240px]">
        <div className="container max-w-[1600px] mx-auto py-8 px-6 space-y-8">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-card border">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-lg font-medium">Welcome Back</h2>
                <p className="text-sm text-muted-foreground">
                  You have recorded {entries.length} journal entries
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Trial/Plan Status */}
              <div className="flex flex-col items-end text-sm">
                {trialStatus?.currentTier === 'trial' ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                        Trial Active
                      </div>
                    </div>
                    {trialStatus.trialEndDate && (
                      <p className="text-sm text-muted-foreground">
                        Expires {new Date(trialStatus.trialEndDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : trialStatus?.currentTier === 'free' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 font-medium">
                        Free Plan
                      </div>
                      <span className="font-medium text-yellow-700">
                        {entries.length}/5 entries
                      </span>
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setLocation("/trial")}
                    >
                      Start Free Trial
                    </Button>
                  </div>
                ) : (
                  <div className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                    Premium Plan
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/trial/analytics")}
                >
                  <BarChart2 className="mr-2 h-4 w-4" />
                  Analytics
                </Button>
                <Link href="/journal">
                  <Button
                    variant="default"
                    disabled={trialStatus?.currentTier === 'free' && entries.length >= 5}
                    title={trialStatus?.currentTier === 'free' && entries.length >= 5 ? 
                      "Upgrade to create more entries" : undefined}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Entry
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <EntryList 
              entries={entries} 
              onPlay={handlePlayEntry}
              onSearch={setSearchQuery}
              searchQuery={searchQuery}
            />
            <DailySummary summaries={summaries} />
          </div>
        </div>
      </main>
    </div>
  );
}
