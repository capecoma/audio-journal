import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Summary } from "@db/schema";

interface DailySummaryProps {
  summaries: Summary[];
}

export default function DailySummary({ summaries }: DailySummaryProps) {
  return (
    <Card className="h-[600px]">
      <CardHeader>
        <CardTitle>Daily Summaries</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {summaries.map((summary) => (
              <Card key={summary.id} className="p-4">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {format(new Date(summary.date), "PPP")}
                  </span>
                  <div className="mt-2 text-sm whitespace-pre-wrap prose prose-sm max-w-none">
                    {summary.highlightText.split('\n').map((line, i) => {
                      if (!line.trim()) return <br key={i} />;
                      // Handle markdown-style bullet points
                      if (line.startsWith('- ')) {
                        return (
                          <p key={i} className="mb-1">
                            <span className="inline-block w-4">•</span>
                            {line.substring(2)}
                          </p>
                        );
                      }
                      // Handle indented bullet points
                      if (line.startsWith('  - ')) {
                        return (
                          <p key={i} className="mb-1 ml-4">
                            <span className="inline-block w-4">•</span>
                            {line.substring(4)}
                          </p>
                        );
                      }
                      return <p key={i} className="mb-1">{line}</p>;
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
