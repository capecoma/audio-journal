import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EntryList from "@/components/dashboard/EntryList";
import DailySummary from "@/components/dashboard/DailySummary";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
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
  const { toast } = useToast();
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
    <div className="container mx-auto pt-3 px-4 space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-medium">Welcome Back</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            You have recorded {entries.length} journal {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link href="/journal">
            <Button 
              variant="default" 
              className="w-full sm:w-auto min-h-[44px] text-base"
              size={isMobile ? "lg" : "default"}
            >
              <Plus className="mr-2 h-5 w-5" />
              New Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* Content Grid */}
      <div className="space-y-4">
        <div className="rounded-lg border border-border/40 bg-background p-4">
          <DailySummary summaries={summaries} />
        </div>
        <div className="rounded-lg border border-border/40 bg-background p-4">
          <EntryList 
            entries={entries} 
            onPlay={handlePlayEntry}
            onSearch={setSearchQuery}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </div>
  );
}