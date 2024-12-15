import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function TrialAnalytics() {
  const [, setLocation] = useLocation();
  
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['/api/trial/analytics'],
  });

  if (isLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <Button
        variant="ghost"
        onClick={() => setLocation("/trial")}
        className="mb-8"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Trial Status
      </Button>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Trial Usage Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData?.featureUsage || []}>
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
              <p className="text-3xl font-bold">{analyticsData?.activeTrials || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trial Completions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{analyticsData?.completedTrials || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {analyticsData?.conversionRate ? `${(analyticsData.conversionRate * 100).toFixed(1)}%` : '0%'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
