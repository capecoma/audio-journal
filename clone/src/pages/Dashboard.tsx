import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navigation from "@/components/layout/Navigation";
import { Plus, BarChart2 } from "lucide-react";

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  // Example query - replace with your data fetching logic
  const { data = [] } = useQuery({
    queryKey: ["/api/items", searchQuery],
    queryFn: async () => {
      const url = searchQuery
        ? `/api/items?search=${encodeURIComponent(searchQuery)}`
        : "/api/items";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch items");
      }
      return response.json();
    },
  });

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 pl-[240px]">
        <div className="container max-w-[1600px] mx-auto py-8 px-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-card border">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-lg font-medium">Welcome Back</h2>
                <p className="text-sm text-muted-foreground">
                  Dashboard overview and statistics
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="default">
                <Plus className="mr-2 h-4 w-4" />
                New Item
              </Button>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Card Title 1</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Card content goes here</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Card Title 2</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Card content goes here</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Card Title 3</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Card content goes here</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
} 