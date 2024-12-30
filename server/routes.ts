import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { entries, summaries } from "@db/schema";
import { desc, sql } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Add health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy" });
  });

  // Analytics endpoint for dashboard
  app.get("/api/analytics", async (_req, res) => {
    try {
      // Get entries for analysis
      const entriesData = await db.select().from(entries);
      const summariesData = await db.select().from(summaries);

      // Calculate analytics data
      const analyticsData = {
        featureUsage: [
          { feature: "Journal Entries", count: entriesData.length },
          { feature: "Audio Recording", count: entriesData.filter(e => e.audioUrl).length },
          { feature: "AI Analysis", count: entriesData.filter(e => e.aiAnalysis).length }
        ],
        dailyStats: summariesData.map(s => ({
          date: s.date,
          count: 1
        })),
        emotionDistribution: [
          { name: "Positive", value: summariesData.filter(s => (s.sentimentScore || 0) > 3).length },
          { name: "Neutral", value: summariesData.filter(s => (s.sentimentScore || 0) === 3).length },
          { name: "Negative", value: summariesData.filter(s => (s.sentimentScore || 0) < 3).length }
        ],
        weeklyTrends: [],
        topTopics: []
      };

      res.json(analyticsData);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}