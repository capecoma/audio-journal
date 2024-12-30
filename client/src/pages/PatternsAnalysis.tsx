import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Calendar, Activity, LineChart, BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface PatternAnalysis {
  consistency: {
    streakDays: number;
    totalEntries: number;
    averageEntriesPerWeek: string;
    mostActiveDay: string | null;
    completionRate: number;
  };
  emotionalTrends: {
    dominantEmotion: Record<string, number> | null;
    emotionalStability: number;
    moodProgression: Array<{ date: string; sentiment: number }>;
  };
  topics: {
    frequentThemes: string[];
    emergingTopics: string[];
    decliningTopics: string[];
  };
  recommendations: string[];
}

export default function PatternsAnalysis() {
  const { data: patterns, isLoading, error } = useQuery<PatternAnalysis>({
    queryKey: ['/api/analytics/patterns']
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[200px] bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">
            Failed to load patterns analysis. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (!patterns) {
    return (
      <div className="container mx-auto p-8">
        <div className="rounded-lg border p-6 text-center">
          <h2 className="text-lg font-medium mb-2">No Pattern Data Available</h2>
          <p className="text-muted-foreground">
            Start journaling regularly to see patterns and insights here.
          </p>
          <Link href="/journal">
            <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md">
              Start Journaling
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <Link href="/analytics" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Analytics
          </Link>
          <h1 className="text-3xl font-bold">Journaling Patterns</h1>
          <p className="text-muted-foreground">Discover insights from your journaling habits</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patterns.consistency.streakDays} days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Completion</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(patterns.consistency.completionRate)}%</div>
            <Progress value={patterns.consistency.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emotional Stability</CardTitle>
            <LineChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(patterns.emotionalTrends.emotionalStability * 100)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entries per Week</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patterns.consistency.averageEntriesPerWeek}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Mood Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={patterns.emotionalTrends.moodProgression}>
                  <XAxis dataKey="date" />
                  <YAxis domain={[1, 5]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="sentiment"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Topic Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  <TrendingUp className="inline-block mr-2 h-4 w-4" />
                  Emerging Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {patterns.topics.emergingTopics.map((topic) => (
                    <span
                      key={topic}
                      className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  <TrendingDown className="inline-block mr-2 h-4 w-4" />
                  Declining Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {patterns.topics.decliningTopics.map((topic) => (
                    <span
                      key={topic}
                      className="px-2 py-1 bg-muted text-muted-foreground text-sm rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <ul className="space-y-4">
                {patterns.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="h-2 w-2 mt-2 rounded-full bg-primary" />
                    <p className="text-sm">{recommendation}</p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
