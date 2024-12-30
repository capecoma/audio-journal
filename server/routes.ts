import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { getDb } from "@db";
import { users as usersTable, entries, summaries } from "@db/schema";
import { desc, eq } from "drizzle-orm";
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

// Middleware to ensure user is authenticated
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

export function registerRoutes(app: Express): Server {
  // Health check endpoint
  app.get("/api/health", asyncHandler(async (_req, res) => {
    const db = getDb();
    try {
      // Verify database connectivity
      await db.select({ id: usersTable.id }).from(usersTable).limit(1);
      res.json({ status: "healthy", timestamp: new Date().toISOString() });
    } catch (error) {
      throw new APIError("Database connection failed", 503, error);
    }
  }));

  // Get user entries
  app.get("/api/entries", requireAuth, asyncHandler(async (req, res) => {
    const db = getDb();
    try {
      const userEntries = await db
        .select()
        .from(entries)
        .where(eq(entries.userId, req.user!.id))
        .orderBy(desc(entries.createdAt));

      res.json(userEntries);
    } catch (error) {
      throw new APIError("Failed to fetch user entries", 500, error);
    }
  }));

  // Get daily summaries for user
  app.get("/api/summaries/daily", requireAuth, asyncHandler(async (req, res) => {
    const db = getDb();
    try {
      const userSummaries = await db
        .select()
        .from(summaries)
        .where(eq(summaries.userId, req.user!.id))
        .orderBy(desc(summaries.date));

      res.json(userSummaries);
    } catch (error) {
      throw new APIError("Failed to fetch user summaries", 500, error);
    }
  }));

  // Analytics endpoint
  app.get("/api/analytics", requireAuth, asyncHandler(async (req, res) => {
    const db = getDb();

    try {
      const [entriesData, summariesData] = await Promise.all([
        db.select()
          .from(entries)
          .where(eq(entries.userId, req.user!.id)),
        db.select()
          .from(summaries)
          .where(eq(summaries.userId, req.user!.id))
      ]);

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
        ]
      };

      res.json(analyticsData);
    } catch (error) {
      throw new APIError("Failed to fetch analytics data", 500, error);
    }
  }));

  // Error handling middleware specific to routes
  app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof APIError) {
      log(`API Error: ${err.message}`);
      return res.status(err.status).json({
        message: err.message,
        details: err.details
      });
    }
    next(err);
  });

  const httpServer = createServer(app);
  return httpServer;
}