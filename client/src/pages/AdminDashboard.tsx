import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";

type UserStats = {
  id: number;
  username: string;
  createdAt: string;
  stats: {
    totalEntries: number;
    totalDuration: number;
    averageEntryLength: number;
    totalSummaries: number;
    uniqueTags: number;
    lastActive: string;
  };
};

type SystemStats = {
  totalUsers: number;
  totalEntries: number;
  totalDuration: number;
  averageEntriesPerUser: number;
  activeUsersLast7Days: number;
};

type AnalyticsData = {
  users: UserStats[];
  systemStats: SystemStats;
};

export default function AdminDashboard() {
  const { user } = useUser();
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    enabled: user?.isAdmin,
  });

  if (!user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">Access Denied</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">Failed to load analytics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.systemStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.systemStats.activeUsersLast7Days} active in last 7 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.systemStats.totalEntries}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.systemStats.averageEntriesPerUser.toFixed(1)} avg per user
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analytics.systemStats.totalDuration / 60)} mins
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>User Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Entries</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Avg Length</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.stats.totalEntries}</TableCell>
                    <TableCell>{Math.round(user.stats.totalDuration / 60)} mins</TableCell>
                    <TableCell>{Math.round(user.stats.averageEntryLength / 60)} mins</TableCell>
                    <TableCell>{user.stats.uniqueTags}</TableCell>
                    <TableCell>
                      {new Date(user.stats.lastActive).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
