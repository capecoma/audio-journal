import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Clear route handler cache on startup
  app._router = undefined;

  // Dashboard route - returns basic data
  app.get("/api/dashboard", async (_req, res) => {
    try {
      // Return mock data for now
      const dashboardData = {
        totalEntries: 0,
        recentEntries: [],
        recentSentiments: [],
        dailyStats: []
      };

      res.json(dashboardData);
    } catch (error) {
      console.error('Error in dashboard route:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Basic entries route
  app.get("/api/entries", async (_req, res) => {
    try {
      res.json([]);
    } catch (error) {
      console.error('Error in entries route:', error);
      res.status(500).json({ error: "Internal server error" });
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

      // Return mock entry
      const mockEntry = {
        id: 1,
        title: "Voice Journal Entry",
        audioUrl,
        duration: Math.round((audioBuffer.length * 8) / 32000), // Simple duration calculation
        isProcessed: false,
        createdAt: new Date().toISOString()
      };

      res.json(mockEntry);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to process entry" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}