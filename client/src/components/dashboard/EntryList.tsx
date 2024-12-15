import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, FileText } from "lucide-react";
import type { Entry } from "@db/schema";

interface EntryListProps {
  entries: Entry[];
  onPlay: (entry: Entry) => void;
}

export default function EntryList({ entries, onPlay }: EntryListProps) {
  return (
    <Card className="h-[600px]">
      <CardHeader>
        <CardTitle>Journal Entries</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {format(new Date(entry.createdAt), "PPp")}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Duration: {Math.round(entry.duration! / 60)}min
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onPlay(entry)}
                      className="p-2 hover:bg-secondary rounded-full"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    {entry.transcript && (
                      <div className="p-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
                {entry.transcript && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {entry.transcript}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}