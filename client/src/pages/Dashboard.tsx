import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EntryList from "@/components/dashboard/EntryList";
import DailySummary from "@/components/dashboard/DailySummary";
import type { Entry, Summary } from "@db/schema";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Get trial status
  const { data: trialStatus } = useQuery({
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
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Audio Journal</h1>
        <div className="flex items-center gap-4">
          {trialStatus?.currentTier === 'free' && (
            <div className="text-sm">
              <span className="text-muted-foreground">Free Plan: </span>
              <span className="font-medium text-yellow-600">
                {entries.length}/5 entries used
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setLocation("/trial/analytics")}
            >
              Trial Analytics
            </Button>
            <Link href="/journal">
              <Button 
                size="lg"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <EntryList 
          entries={entries} 
          onPlay={handlePlayEntry}
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
        />
        <DailySummary summaries={summaries} />
      </div>
    </div>
  );
}
