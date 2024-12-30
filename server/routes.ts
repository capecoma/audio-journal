import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { getDb } from "@db";
import { users, entries, summaries } from "@db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { log } from "./vite";

// Custom error for API errors
class APIError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Async handler wrapper to catch errors
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export function registerRoutes(app: Express): Server {
  // Health check endpoint
  app.get("/api/health", asyncHandler(async (_req, res) => {
    const db = getDb();
    // Verify database connectivity
    await db.select().from(users).limit(1);
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  }));

  // Analytics endpoint
  app.get("/api/analytics", asyncHandler(async (_req, res) => {
    const db = getDb();
    const entriesData = await db.select().from(entries).execute();
    const summariesData = await db.select().from(summaries).execute();

    if (!entriesData || !summariesData) {
      throw new APIError("Failed to fetch analytics data", 500);
    }

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
  }));

  // Error handling middleware specific to routes
  app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof APIError) {
      log(`API Error: ${err.message}`);
      return res.status((err as APIError).status).json({
        message: err.message,
        details: (err as APIError).details
      });
    }
    next(err);
  });

  const httpServer = createServer(app);
  return httpServer;
}