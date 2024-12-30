import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  ResponsiveContainer, Tooltip, CartesianGrid, PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis
} from "recharts";
import { ArrowLeft, Calendar, TrendingUp, Activity, Heart, Clock, Brain } from "lucide-react";
import { Link } from "wouter";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface AnalyticsData {
  featureUsage: Array<{ feature: string; count: number }>;
  dailyStats: Array<{ date: string; count: number }>;
  emotionDistribution: Array<{ emotion: string; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  weeklyActivity: Array<{ week: string; journalCount: number; averageSentiment: number }>;
  insightHighlights: Array<{ date: string; insight: string; impact: number }>;
  timeOfDayAnalysis: Array<{ hour: number; entryCount: number; averageDuration: number }>;
  wordCountTrends: Array<{ date: string; wordCount: number }>;
  topicConnections: Array<{ topic: string; relatedTopics: Array<{ name: string; strength: number }> }>;
  reflectionDepth: Array<{ date: string; depth: number }>;
}

const EMOTION_COLORS = {
  'Very Positive': "#4ade80",
  'Positive': "#86efac",
  'Neutral': "#94a3b8",
  'Negative': "#93c5fd",
  'Very Negative': "#60a5fa"
} as const;

const DEPTH_COLORS = ['#fee2e2', '#fca5a5', '#f87171', '#ef4444', '#dc2626'];

const EmptyChart = () => (
  <div className="h-[300px] flex items-center justify-center border rounded-lg">
    <p className="text-muted-foreground">No data available</p>
  </div>
);

const formatHour = (hour: number) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const adjustedHour = hour % 12 || 12;
  return `${adjustedHour}${period}`;
};

export default function Analytics() {
  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/comprehensive']
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

  // Calculate reflection score
  const averageDepth = analytics.reflectionDepth.reduce((acc, curr) => acc + curr.depth, 0) / 
    analytics.reflectionDepth.length;

  // Calculate consistency score
  const last7Days = new Set(
    analytics.dailyStats
      .slice(-7)
      .map(stat => stat.date)
  );
  const consistencyScore = (last7Days.size / 7) * 100;

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
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.dailyStats.reduce((acc, curr) => acc + curr.count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">7-Day Consistency</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(consistencyScore)}%</div>
            <Progress value={consistencyScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reflection Depth</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageDepth.toFixed(1)}/5</div>
            <Progress value={(averageDepth / 5) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Activity Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatHour(analytics.timeOfDayAnalysis.reduce((peak, curr) => 
                curr.entryCount > analytics.timeOfDayAnalysis[peak].entryCount ? 
                  analytics.timeOfDayAnalysis.indexOf(curr) : peak, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Emotion Distribution */}
        {analytics.emotionDistribution?.length ? (
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

        {/* Time of Day Analysis */}
        {analytics.timeOfDayAnalysis?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Journaling Patterns by Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                  >
                    <CartesianGrid />
                    <XAxis 
                      dataKey="hour" 
                      name="Time" 
                      tickFormatter={formatHour}
                      type="number" 
                      domain={[0, 23]} 
                    />
                    <YAxis 
                      dataKey="entryCount" 
                      name="Entries" 
                    />
                    <ZAxis 
                      dataKey="averageDuration" 
                      range={[50, 400]} 
                      name="Avg. Duration" 
                    />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(value: any, name: string) => {
                        if (name === 'Time') return formatHour(Number(value));
                        if (name === 'Avg. Duration') return `${value} sec`;
                        return value;
                      }}
                    />
                    <Scatter 
                      name="Entries" 
                      data={analytics.timeOfDayAnalysis} 
                      fill="hsl(var(--primary))"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : <EmptyChart />}

        {/* Word Count Trends */}
        {analytics.wordCountTrends?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Expression Volume Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.wordCountTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                      formatter={(value: any) => [`${value} words`, 'Word Count']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="wordCount" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : <EmptyChart />}

        {/* Reflection Depth Over Time */}
        {analytics.reflectionDepth?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>Reflection Depth Progression</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.reflectionDepth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    />
                    <YAxis domain={[1, 5]} />
                    <Tooltip 
                      labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                      formatter={(value: any) => [`Level ${value}`, 'Depth']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="depth" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : <EmptyChart />}

        {/* Key Insights */}
        {analytics.insightHighlights?.length ? (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Notable Insights</CardTitle>
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