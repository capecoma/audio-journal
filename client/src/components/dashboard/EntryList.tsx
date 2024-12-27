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
import TagList from "./TagList";
import { useState } from "react";
import AudioPlayer from "@/components/audio/AudioPlayer";
import { useToast } from "@/hooks/use-toast";

interface Entry {
  id: number;
  audioUrl: string;
  transcript?: string;
  tags?: string[];
  duration: number;
  isProcessed: boolean;
  createdAt: string;
}

interface EntryListProps {
  entries: Entry[];
  onPlay: (entry: Entry) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export default function EntryList({ entries, onPlay, onSearch, searchQuery }: EntryListProps) {
  const [selectedTranscript, setSelectedTranscript] = useState<{ text: string | undefined; date: string; tags?: string[] } | null>(null);
  const { toast } = useToast();

  const handleExportClick = () => {
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportClick}
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
                  <div key={entry.id} className="py-2 px-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <div className="space-y-2">
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium whitespace-nowrap">
                            {entry.createdAt ? format(new Date(entry.createdAt), "PPp") : 'No date'}
                          </span>
                          <span className="text-xs font-medium text-primary whitespace-nowrap">
                            {Math.round(entry.duration / 60)}min
                          </span>
                        </div>
                        <AudioPlayer
                          audioUrl={entry.audioUrl}
                          duration={entry.duration}
                          onTranscriptClick={() => setSelectedTranscript({
                            text: entry.transcript,
                            date: entry.createdAt ? format(new Date(entry.createdAt), "PPpp") : "No date",
                            tags: entry.tags
                          })}
                          transcript={entry.transcript}
                        />
                      </div>

                      {entry.transcript && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed break-words">
                            {entry.transcript}
                          </p>
                          {entry.tags && entry.tags.length > 0 && (
                            <TagList tags={entry.tags} />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
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
          <div className="mt-4">
            {selectedTranscript?.tags && selectedTranscript.tags.length > 0 && (
              <div className="mb-4">
                <TagList tags={selectedTranscript.tags} />
              </div>
            )}
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {selectedTranscript?.text}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}