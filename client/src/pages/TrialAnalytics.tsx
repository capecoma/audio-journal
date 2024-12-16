import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import Navigation from "@/components/layout/Navigation";

interface FeatureUsage {
  feature: string;
  count: number;
}

interface MonthlyStats {
  month: string;
  count: number;
}

interface Analytics {
  featureUsage: FeatureUsage[];
  monthlyStats: MonthlyStats[];
}

export default function Analytics() {
  const { data: analyticsData, isLoading } = useQuery<Analytics>({
    queryKey: ['/api/analytics'],
  });

  if (isLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  const featureData = analyticsData?.featureUsage ?? [];
  const monthlyData = analyticsData?.monthlyStats ?? [];

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 pl-[240px]">
        <div className="container max-w-[1600px] mx-auto py-8 px-6 space-y-8">
          <h1 className="text-3xl font-bold">Usage Analytics</h1>
          
          <div className="grid gap-8">
            {/* Feature Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={featureData}>
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

            {/* Monthly Usage Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Usage Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
