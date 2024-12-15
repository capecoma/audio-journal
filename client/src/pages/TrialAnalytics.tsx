import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface FeatureUsage {
  feature: string;
  count: number;
}

interface TrialAnalytics {
  featureUsage: FeatureUsage[];
  activeTrials: number;
  completedTrials: number;
  conversionRate: number;
}

export function TrialAnalytics() {
  const [, setLocation] = useLocation();
  
  const { data: analyticsData, isLoading } = useQuery<TrialAnalytics>({
    queryKey: ['/api/trial/analytics'],
  });

  if (isLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  const chartData = analyticsData?.featureUsage ?? [];
  const stats = {
    activeTrials: analyticsData?.activeTrials ?? 0,
    completedTrials: analyticsData?.completedTrials ?? 0,
    conversionRate: analyticsData?.conversionRate ?? 0,
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/trial")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Trial Status
        </Button>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Trial Usage Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="feature" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Active Trials</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.activeTrials}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trial Completions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.completedTrials}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {`${(stats.conversionRate * 100).toFixed(1)}%`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
