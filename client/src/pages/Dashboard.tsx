import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import EntryList from "@/components/dashboard/EntryList";
import DailySummary from "@/components/dashboard/DailySummary";
import type { Entry, Summary } from "@db/schema";

export default function Dashboard() {
  const { data: entries = [] } = useQuery<Entry[]>({
    queryKey: ["/api/entries"],
  });

  const { data: summaries = [] } = useQuery<Summary[]>({
    queryKey: ["/api/summaries/daily"],
  });

  const handlePlayEntry = (entry: Entry) => {
    const audio = new Audio(entry.audioUrl);
    audio.play();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Audio Journal</h1>
        <Link href="/journal">
          <Button size="lg">
            <Plus className="mr-2 h-4 w-4" />
            New Entry
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <EntryList entries={entries} onPlay={handlePlayEntry} />
        <DailySummary summaries={summaries} />
      </div>
    </div>
  );
}
