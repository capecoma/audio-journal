import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { entries, summaries } from "@db/schema";
import { desc } from "drizzle-orm";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Clear route handler cache on startup
  app._router = undefined;

  // Dashboard route - returns analytics data
  app.get("/api/dashboard", async (_req, res) => {
    try {
      // Get total entries count
      const entriesCount = await db.query.entries.findMany().then(results => results.length);

      // Get recent entries
      const recentEntries = await db.query.entries.findMany({
        orderBy: [desc(entries.createdAt)],
        limit: 5
      });

      // Get recent summaries
      const recentSummaries = await db.query.summaries.findMany({
        orderBy: [desc(summaries.date)],
        limit: 5
      });

      // Calculate daily entry counts for the past week
      const today = new Date();
      const dailyStats = recentEntries.reduce((acc: Record<string, number>, entry) => {
        if (entry.createdAt) {
          const date = new Date(entry.createdAt).toLocaleDateString('en-US', { 
            month: 'short',
            day: 'numeric'
          });
          acc[date] = (acc[date] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Format response
      const dashboardData = {
        totalEntries: entriesCount,
        recentEntries,
        recentSummaries,
        dailyStats: Object.entries(dailyStats).map(([date, count]) => ({
          date,
          count
        }))
      };

      res.json(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Basic entries route
  app.get("/api/entries", async (_req, res) => {
    try {
      const userEntries = await db.query.entries.findMany({
        orderBy: [desc(entries.createdAt)]
      });
      res.json(userEntries);
    } catch (error) {
      console.error('Error fetching entries:', error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  // Basic upload route
  app.post("/api/entries/upload", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const audioBuffer = req.file.buffer;
      const audioUrl = `data:audio/webm;base64,${audioBuffer.toString('base64')}`;

      // Create entry
      const [entry] = await db.insert(entries).values({
        audioUrl,
        duration: Math.round((audioBuffer.length * 8) / 32000), // Simple duration calculation
        userId: 1,
      }).returning();

      res.json(entry);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to process entry" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}