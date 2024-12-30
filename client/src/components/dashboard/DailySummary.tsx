import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Smile, Meh, Frown } from "lucide-react";
import type { Summary } from "@db/schema";

interface DailySummaryProps {
  summaries: Summary[];
}

export default function DailySummary({ summaries }: DailySummaryProps) {
  const getSentimentIcon = (score: number | null | undefined) => {
    if (!score) return <Meh className="w-5 h-5 text-muted-foreground" />;
    if (score >= 4) return <Smile className="w-5 h-5 text-green-500" />;
    if (score <= 2) return <Frown className="w-5 h-5 text-red-500" />;
    return <Meh className="w-5 h-5 text-yellow-500" />;
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Daily Insights</h3>
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-4">
          {summaries.map((summary) => (
            <Card key={summary.id} className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {format(new Date(summary.date), "PPP")}
                  </span>
                  {getSentimentIcon(summary.sentimentScore)}
                </div>

                {summary.topicAnalysis && summary.topicAnalysis.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground">Key Topics</h4>
                    <div className="flex flex-wrap gap-1">
                      {summary.topicAnalysis.map((topic, i) => (
                        <span 
                          key={i}
                          className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Summary</h4>
                  <p className="text-sm whitespace-pre-wrap">
                    {summary.highlightText}
                  </p>
                </div>

                {summary.keyInsights && summary.keyInsights.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Key Insights</h4>
                    <ul className="text-sm space-y-1">
                      {summary.keyInsights.map((insight, i) => (
                        <li key={i} className="text-muted-foreground">
                          • {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}