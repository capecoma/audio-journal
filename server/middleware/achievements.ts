import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { achievements, userAchievements, entries } from "@db/schema";
import { eq, and, gte, lt, desc, sql } from "drizzle-orm";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { getUserId } from "./auth";

interface AchievementCriteria {
  type: 'entry_count' | 'streak' | 'emotion_analysis';
  target: number;
}

export async function checkAchievements(userId: number, action: 'entry_created' | 'emotion_analyzed') {
  // First get all achievements
  const allAchievements = await db.query.achievements.findMany({
    orderBy: [desc(achievements.createdAt)]
  });

  // Then find unearned achievements by checking userAchievements
  for (const achievement of allAchievements) {
    const existingProgress = await db.query.userAchievements.findFirst({
      where: and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievement.id)
      ),
    });

    // Skip if already earned
    if (existingProgress?.earnedAt) continue;

    const criteria = achievement.criteria as AchievementCriteria;
    let progress = { current: 0, target: criteria.target || 100, percent: 0 };
    let shouldUpdate = false;

    switch (criteria.type) {
      case 'entry_count': {
        if (action === 'entry_created') {
          const result = await db.select({
            count: sql<number>`cast(count(*) as integer)`,
          })
          .from(entries)
          .where(eq(entries.userId, userId));

          const count = result[0]?.count ?? 0;
          progress = {
            current: count,
            target: criteria.target || 1,
            percent: Math.min(100, (count / (criteria.target || 1)) * 100)
          };
          shouldUpdate = true;
        }
        break;
      }

      case 'streak': {
        const days = criteria.target || 7;
        const entriesList = await db.query.entries.findMany({
          where: and(
            eq(entries.userId, userId),
            gte(entries.createdAt, subDays(new Date(), days).toISOString())
          ),
          orderBy: [desc(entries.createdAt)]
        });

        // Group entries by day
        const entriesByDay = entriesList.reduce((acc: Record<string, boolean>, entry) => {
          const day = startOfDay(new Date(entry.createdAt)).toISOString();
          acc[day] = true;
          return acc;
        }, {});

        // Count consecutive days
        let streak = 0;
        let date = new Date();
        while (entriesByDay[startOfDay(date).toISOString()] && streak < days) {
          streak++;
          date = subDays(date, 1);
        }

        progress = {
          current: streak,
          target: days,
          percent: Math.min(100, (streak / days) * 100)
        };
        shouldUpdate = true;
        break;
      }

      case 'emotion_analysis': {
        if (action === 'emotion_analyzed') {
          const entriesList = await db.query.entries.findMany({
            where: and(
              eq(entries.userId, userId),
              sql`ai_analysis->>'sentiment' IS NOT NULL`
            )
          });

          progress = {
            current: entriesList.length,
            target: criteria.target || 5,
            percent: Math.min(100, (entriesList.length / (criteria.target || 5)) * 100)
          };
          shouldUpdate = true;
        }
        break;
      }
    }

    if (shouldUpdate) {
      if (existingProgress) {
        await db
          .update(userAchievements)
          .set({
            progress,
            ...(progress.percent >= 100 ? { earnedAt: new Date().toISOString() } : {})
          })
          .where(eq(userAchievements.id, existingProgress.id));
      } else {
        await db
          .insert(userAchievements)
          .values({
            userId,
            achievementId: achievement.id,
            progress,
            earnedAt: progress.percent >= 100 ? new Date().toISOString() : null
          });
      }
    }
  }
}

// Middleware to check achievements after certain actions
export function trackAchievements(action: 'entry_created' | 'emotion_analyzed') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);
      // Check achievements asynchronously to not block the response
      checkAchievements(userId, action).catch(console.error);
      next();
    } catch (error) {
      console.error('Error tracking achievements:', error);
      next(); // Continue even if achievement tracking fails
    }
  };
}