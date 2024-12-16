import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface AnalyticsData {
  featureUsage: Array<{ feature: string; count: number }>;
  dailyStats: Array<{ date: string; count: number }>;
}

export default function Analytics() {
  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics'],
  });

  return (
    <div className="container mx-auto p-8">
      <Link href="/">
        <a className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </a>
      </Link>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Feature Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.featureUsage}>
                <XAxis dataKey="feature" />
                <YAxis />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.dailyStats}>
                <XAxis dataKey="date" />
                <YAxis />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
