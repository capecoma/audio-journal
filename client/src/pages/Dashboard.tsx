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
          {/* Header */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-card border">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-lg font-medium">Welcome Back</h2>
                <p className="text-sm text-muted-foreground">
                  You have recorded {entries.length} journal entries
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/journal">
                <Button variant="default">
                  <Plus className="mr-2 h-4 w-4" />
                  New Entry
                </Button>
              </Link>
            </div>
          </div>

          {/* Content Grid */}
          <div className="space-y-8">
            <DailySummary summaries={summaries} />
            <EntryList 
              entries={entries} 
              onPlay={handlePlayEntry}
              onSearch={setSearchQuery}
              searchQuery={searchQuery}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
