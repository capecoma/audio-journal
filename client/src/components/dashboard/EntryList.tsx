import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Entry } from "@db/schema";
import type { TrialStatus } from "@/types/trial";
import TagList from "./TagList";
import { useState } from "react";
import AudioPlayer from "@/components/audio/AudioPlayer";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface EntryListProps {
  entries: Entry[];
  onPlay: (entry: Entry) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

// Get trial status using React Query
function useTrialStatus() {
  const { data: trialStatus } = useQuery<TrialStatus>({
    queryKey: ['/api/trial/status'],
  });
  return trialStatus;
}

export default function EntryList({ entries, onPlay, onSearch, searchQuery }: EntryListProps) {
  const [selectedTranscript, setSelectedTranscript] = useState<{ text: string | undefined; date: string } | null>(null);
  const trialStatus = useTrialStatus();
  const { toast } = useToast();

  const handleExportClick = () => {
    if (trialStatus?.currentTier === 'free') {
      toast({
        title: "Premium Feature",
        description: trialStatus?.currentTier === 'free' && !trialStatus.trialUsed
          ? "Start your free trial to export journal entries"
          : "Upgrade to export your journal entries",
        variant: "default",
        action: trialStatus?.currentTier === 'free' && !trialStatus.trialUsed
          ? <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.href = '/trial'}
            >
              Start Trial
            </Button>
          : undefined
      });
      return;
    }
    window.open('/api/entries/export', '_blank');
  };

  return (
    <>
      <Card className="h-[600px]">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <CardTitle>Journal Entries</CardTitle>
              <p className="text-sm text-muted-foreground">
                Browse and search through your audio journal entries
              </p>
            </div>
            <div className="flex items-center gap-2">
              {trialStatus?.currentTier === 'free' && (
                <div className="text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 font-medium">
                  Premium Feature
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportClick}
                disabled={trialStatus?.currentTier === 'free'}
                title={trialStatus?.currentTier === 'free' ? "Upgrade to export entries" : "Export entries"}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transcripts..."
              value={searchQuery ?? ''}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-4 pr-4">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No entries found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 
                      "Try adjusting your search terms" : 
                      "Start by recording your first journal entry"}
                  </p>
                </div>
              ) : (
                entries.map((entry) => (
                  <Card key={entry.id} className="p-6 hover:bg-muted/50 transition-colors">
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium whitespace-nowrap">
                              {entry.createdAt ? format(new Date(entry.createdAt), "PPp") : 'No date'}
                            </span>
                            <span className="text-sm px-2.5 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                              {Math.round(entry.duration! / 60)}min
                            </span>
                          </div>
                        </div>
                        <AudioPlayer 
                          audioUrl={entry.audioUrl} 
                          duration={entry.duration ?? 0}
                          onPlay={() => onPlay(entry)}
                          onTranscriptClick={() => setSelectedTranscript({
                            text: entry.transcript!,
                            date: format(new Date(entry.createdAt!), "PPpp")
                          })}
                          transcript={entry.transcript}
                        />
                      </div>
                      
                      {entry.transcript && (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed break-words">
                            {entry.transcript}
                          </p>
                          <TagList 
                            entryTags={entry.entryTags?.map(et => et.tag) ?? []}
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={selectedTranscript !== null} onOpenChange={() => setSelectedTranscript(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Journal Entry - {selectedTranscript?.date}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
            {selectedTranscript?.text}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}