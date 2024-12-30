import type { Express } from "express";
import { createServer, type Server } from "http";

export function registerRoutes(app: Express): Server {
  // Add health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "healthy" });
  });

  // Simple analytics endpoint with static data for initial setup
  app.get("/api/analytics", (_req, res) => {
    const analyticsData = {
      featureUsage: [
        { feature: "Journal Entries", count: 0 }
      ],
      weeklyTrends: Array.from({ length: 12 }, (_, i) => ({
        week: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
        journalCount: 0,
        avgSentiment: 3
      }))
    };

    res.json(analyticsData);
  });

  const httpServer = createServer(app);
  return httpServer;
}