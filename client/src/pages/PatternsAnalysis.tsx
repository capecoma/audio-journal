import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Calendar,
  Activity,
  LineChart,
  BookOpen,
  TrendingUp,
  TrendingDown,
  BarChart2
} from "lucide-react";
import { Link } from "wouter";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";

interface PatternAnalysis {
  consistency: {
    streakDays: number;
    totalEntries: number;
    averageEntriesPerWeek: string;
    mostActiveDay: string | null;
    completionRate: number;
    entryTimeDistribution: Array<{ hour: number; count: number }>;
  };
  emotionalTrends: {
    dominantEmotion: Record<string, number>;
    emotionalStability: number;
    moodProgression: Array<{ date: string; sentiment: number }>;
    emotionFrequency: Array<{ emotion: string; count: number }>;
  };
  topics: {
    frequentThemes: Array<{ topic: string; frequency: number }>;
    emergingTopics: string[];
    decliningTopics: string[];
    topicTimeline: Array<{ date: string; topics: Array<{ name: string; count: number }> }>;
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

  // Calculate highest frequency for scaling
  const maxTopicFrequency = Math.max(...patterns.topics.frequentThemes.map(t => t.frequency));
  const maxEmotionCount = Math.max(...patterns.emotionalTrends.emotionFrequency.map(e => e.count));

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
            <CardTitle className="text-sm font-medium">Entry Frequency</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patterns.consistency.averageEntriesPerWeek}/week</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Active Day</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patterns.consistency.mostActiveDay || "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Topic Frequency Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Topic Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={patterns.topics.frequentThemes}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <XAxis type="number" />
                  <YAxis dataKey="topic" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="frequency" fill="hsl(var(--primary))">
                    {patterns.topics.frequentThemes.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(var(--primary) / ${0.3 + (0.7 * entry.frequency) / maxTopicFrequency})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Entry Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Entry Time Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patterns.consistency.entryTimeDistribution}>
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(hour) => `${hour}:00`}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(hour) => `${hour}:00`}
                    formatter={(value) => [`${value} entries`, 'Count']}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Emotion Frequency */}
        <Card>
          <CardHeader>
            <CardTitle>Emotion Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={patterns.emotionalTrends.emotionFrequency}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="emotion" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))">
                    {patterns.emotionalTrends.emotionFrequency.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(var(--primary) / ${0.3 + (0.7 * entry.count) / maxEmotionCount})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Insights & Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
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