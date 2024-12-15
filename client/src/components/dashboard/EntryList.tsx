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
import TagList from "./TagList";
import { useState } from "react";
import AudioPlayer from "@/components/audio/AudioPlayer";

interface EntryListProps {
  entries: Entry[];
  onPlay: (entry: Entry) => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export default function EntryList({ entries, onPlay, onSearch, searchQuery }: EntryListProps) {
  const [selectedTranscript, setSelectedTranscript] = useState<{ text: string; date: string } | null>(null);

  return (
    <>
      <Card className="h-[600px]">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Journal Entries</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/api/entries/export', '_blank')}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
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
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {entries.map((entry) => (
                <Card key={entry.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {entry.createdAt ? format(new Date(entry.createdAt), "PPp") : 'No date'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Duration: {Math.round(entry.duration! / 60)}min
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <AudioPlayer 
                        audioUrl={entry.audioUrl} 
                        duration={entry.duration}
                        onPlay={() => onPlay(entry)}
                      />
                      {entry.transcript && (
                        <button
                          onClick={() => setSelectedTranscript({
                            text: entry.transcript!,
                            date: format(new Date(entry.createdAt!), "PPpp")
                          })}
                          className="p-2 hover:bg-secondary rounded-full"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                  {entry.transcript && (
                    <>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {entry.transcript}
                      </p>
                      <div className="mt-2">
                        <TagList 
                          entryTags={entry.entryTags?.map(et => et.tag) ?? []}
                        />
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={selectedTranscript !== null} onOpenChange={() => setSelectedTranscript(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Journal Entry - {selectedTranscript?.date}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 whitespace-pre-wrap text-sm">
            {selectedTranscript?.text}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}