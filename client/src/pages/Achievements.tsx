import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Achievement } from "@db/schema";

interface AchievementWithProgress extends Achievement {
  userProgress?: {
    earnedAt: string | null;
    progress: {
      current: number;
      target: number;
      percent: number;
    };
  };
}

export default function Achievements() {
  const { data: achievements = [], isLoading } = useQuery<AchievementWithProgress[]>({
    queryKey: ["/api/achievements"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div>Loading achievements...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-6">
      <h1 className="text-3xl font-bold mb-8">Achievements</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {achievements.map((achievement) => (
          <Card 
            key={achievement.id} 
            className={achievement.userProgress?.earnedAt ? "bg-primary/5" : undefined}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl" role="img" aria-label={achievement.name}>
                    {achievement.icon}
                  </span>
                  {achievement.name}
                </CardTitle>
                {achievement.userProgress?.earnedAt && (
                  <Badge variant="secondary">Earned!</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {achievement.description}
              </p>
              {achievement.userProgress?.earnedAt ? (
                <Progress value={100} className="h-2" />
              ) : (
                <Progress 
                  value={achievement.userProgress?.progress?.percent || 0} 
                  className="h-2" 
                />
              )}
              {!achievement.userProgress?.earnedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Progress: {achievement.userProgress?.progress?.current || 0}/{achievement.userProgress?.progress?.target || 100}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}