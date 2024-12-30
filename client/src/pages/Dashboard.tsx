import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, BarChart2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EntryList from "@/components/dashboard/EntryList";
import DailySummary from "@/components/dashboard/DailySummary";
import Navigation from "@/components/layout/Navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Summary } from "@db/schema";

interface Entry {
  id: number;
  audioUrl: string;
  transcript?: string;
  tags?: string[];
  duration: number;
  isProcessed: boolean;
  createdAt: string;
  aiAnalysis?: {
    sentiment?: number;
    topics?: string[];
    insights?: string[];
  };
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

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
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />
      <main className={cn(
        "flex-1 pt-14",
        !isMobile && "md:pl-[240px]"
      )}>
        <div className="container mx-auto p-4 space-y-6 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg bg-card border">
            <div>
              <h2 className="text-lg font-medium">Welcome Back</h2>
              <p className="text-sm text-muted-foreground">
                You have recorded {entries.length} journal entries
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link href="/journal">
                <Button variant="default" className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  New Entry
                </Button>
              </Link>
            </div>
          </div>

          {/* Content Grid */}
          <div className="space-y-6">
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