import type { Express } from "express";
import { createServer, type Server } from "http";
import { subWeeks } from "date-fns";
import { db } from "@db";
import { entries } from "@db/schema";
import { sql, eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Add health check endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      await db.execute(sql`SELECT 1 as check`);
      res.json({ status: "healthy" });
    } catch (err) {
      console.error("Health check failed:", err);
      res.status(500).json({ status: "unhealthy" });
    }
  });

  // Analytics endpoint with basic functionality
  app.get("/api/analytics", async (req, res) => {
    try {
      const userId = 1; // Fixed ID for testing
      console.log("Fetching analytics for user:", userId);

      // Get total entries count
      const basicStats = await db.select({
        count: sql<number>`count(*)`.as('count')
      })
      .from(entries)
      .where(eq(entries.userId, userId));

      const totalEntries = Number(basicStats[0]?.count) || 0;
      console.log("Total entries found:", totalEntries);

      // Generate weekly data points
      const weeklyTrends = Array.from({ length: 12 }, (_, i) => ({
        week: subWeeks(new Date(), i).toISOString(),
        journalCount: Math.floor(Math.random() * 5), // Placeholder data
        avgSentiment: 3 + Math.random() * 2 // Placeholder data
      }));

      const analyticsData = {
        featureUsage: [
          { feature: "Journal Entries", count: totalEntries }
        ],
        dailyStats: Array.from({ length: 7 }, (_, i) => ({
          date: subWeeks(new Date(), i).toISOString(),
          count: Math.floor(Math.random() * 10)
        })),
        emotionDistribution: [
          { name: "Happy", value: 35 },
          { name: "Neutral", value: 40 },
          { name: "Reflective", value: 25 }
        ],
        topTopics: [
          { topic: "Work", count: 15 },
          { topic: "Family", count: 12 },
          { topic: "Health", count: 8 }
        ],
        weeklyTrends
      };

      console.log("Successfully prepared analytics data");
      res.json(analyticsData);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({
        error: "Failed to fetch analytics",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}