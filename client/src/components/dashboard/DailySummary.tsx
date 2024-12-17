import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "lucide-react";
import type { Summary } from "@db/schema";

interface DailySummaryProps {
  summaries: Summary[];
}

function SummaryHighlight({ content }: { content: string }) {
  const trimmedContent = content.replace(/^[-*•]\s*/, '').replace(/^\*\*|\*\*$/g, '');
  const title = trimmedContent.split(':')[0];
  const details = trimmedContent.split(':').slice(1).join(':').trim();
  
  return (
    <div className="group relative pl-6 py-2 hover:bg-muted/50 rounded-md transition-colors">
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/60 group-hover:bg-primary transition-colors" />
      <div className="space-y-1">
        <h4 className="font-medium text-sm text-foreground/90">{title}</h4>
        {details && (
          <p className="text-sm text-muted-foreground leading-relaxed">{details}</p>
        )}
      </div>
    </div>
  );
}

export default function DailySummary({ summaries }: DailySummaryProps) {
  return (
    <Card className="h-[600px]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary/70" />
          <CardTitle>Daily Insights</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          AI-generated summaries of your daily journal entries
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[480px] pr-4">
          <div className="space-y-6">
            {summaries.map((summary) => (
              <Card key={summary.id} className="p-6 border shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <time className="text-lg font-semibold text-foreground/90">
                      {format(new Date(summary.date), "EEEE")}
                    </time>
                    <time className="text-sm text-muted-foreground">
                      {format(new Date(summary.date), "MMMM d, yyyy")}
                    </time>
                  </div>
                  
                  <div className="space-y-1">
                    {summary.highlightText.split('\n').map((line, i) => {
                      const trimmedLine = line.trim();
                      if (!trimmedLine) return null;
                      if (trimmedLine.startsWith('-')) {
                        return <SummaryHighlight key={i} content={trimmedLine} />;
                      }
                      return (
                        <p key={i} className="text-sm text-muted-foreground py-1">
                          {trimmedLine}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </Card>
            ))}
            
            {summaries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Summaries Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Record some journal entries and we'll generate daily insights for you
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
