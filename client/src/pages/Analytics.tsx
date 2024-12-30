import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell 
} from "recharts";
import { ArrowLeft, Calendar, TrendingUp, Activity, Heart } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AnalyticsData {
  featureUsage: Array<{ feature: string; count: number }>;
  dailyStats: Array<{ date: string; count: number }>;
  emotionDistribution: Array<{ emotion: string; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  weeklyActivity: Array<{ week: string; journalCount: number; averageSentiment: number }>;
  insightHighlights: Array<{ date: string; insight: string; impact: number }>;
}

const EMOTION_COLORS = {
  Joy: "#4ade80",
  Sadness: "#60a5fa",
  Anger: "#f87171",
  Fear: "#fbbf24",
  Neutral: "#94a3b8"
} as const;

const EmptyChart = () => (
  <div className="h-[300px] flex items-center justify-center border rounded-lg">
    <p className="text-muted-foreground">No data available</p>
  </div>
);

export default function Analytics() {
  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/comprehensive'],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[300px] bg-muted rounded-lg" />
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
            Failed to load analytics data. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const hasData = analytics && Object.values(analytics).some(arr => Array.isArray(arr) && arr.length > 0);

  if (!hasData) {
    return (
      <div className="container mx-auto p-8">
        <div className="rounded-lg border p-6 text-center">
          <h2 className="text-lg font-medium mb-2">No Analytics Data Available</h2>
          <p className="text-muted-foreground">
            Start journaling to see insights and analytics here.
          </p>
          <Link href="/journal">
            <Button className="mt-4">
              Create Your First Entry
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Journal Analytics</h1>
          <p className="text-muted-foreground">Comprehensive insights from your journaling journey</p>
        </div>

        <Button variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          Last 30 Days
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.dailyStats.reduce((acc, curr) => acc + curr.count, 0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Streak</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7 days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mood Today</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Positive</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {analytics?.emotionDistribution?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Emotional Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.emotionDistribution}
                      dataKey="count"
                      nameKey="emotion"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {analytics.emotionDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={EMOTION_COLORS[entry.emotion as keyof typeof EMOTION_COLORS] || "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : <EmptyChart />}

        {analytics?.weeklyActivity?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Weekly Activity & Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.weeklyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="journalCount"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="averageSentiment"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : <EmptyChart />}

        {analytics?.topTopics?.length ? (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Top Topics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.topTopics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="topic" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : <EmptyChart />}

        {analytics?.insightHighlights?.length ? (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {analytics.insightHighlights.map((insight, i) => (
                    <div key={i} className="flex items-start space-x-4 p-4 rounded-lg border">
                      <div className="flex-1">
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(insight.date), 'MMM d, yyyy')}
                        </div>
                        <p className="mt-1">{insight.insight}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        insight.impact > 7 ? 'bg-green-100 text-green-700' :
                        insight.impact > 4 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        Impact: {insight.impact}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : <EmptyChart />}
      </div>
    </div>
  );
}