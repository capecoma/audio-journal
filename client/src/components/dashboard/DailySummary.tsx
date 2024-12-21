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
                  <p className="mt-2 text-sm whitespace-pre-wrap">
                    {summary.highlightText}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
