import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { db } from "@db";
import { entries, summaries } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { transcribeAudio, generateSummary } from "./ai";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Get all entries for the current user
  app.get("/api/entries", async (_req, res) => {
    try {
      const userEntries = await db.query.entries.findMany({
        orderBy: desc(entries.createdAt),
      });
      res.json(userEntries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  // Upload new entry
  app.post("/api/entries/upload", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const audioBuffer = req.file.buffer;
      const duration = 0; // We'll get this from the audio file later

      // For now, we'll use a placeholder URL since we haven't set up S3
      const audioUrl = `data:audio/webm;base64,${audioBuffer.toString('base64')}`;

      // Transcribe audio
      const transcript = await transcribeAudio(audioBuffer);

      // Create entry
      const [entry] = await db.insert(entries).values({
        audioUrl,
        transcript,
        duration,
        userId: 1, // For now, we'll use a default user ID
      }).returning();

      // Generate daily summary
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaysEntries = await db.query.entries.findMany({
        where: eq(entries.userId, 1),
      });

      const transcripts = todaysEntries.map(e => e.transcript).filter(Boolean);
      const summaryText = await generateSummary(transcripts as string[]);

      // Update or create daily summary
      await db.insert(summaries).values({
        userId: 1,
        date: today,
        highlightText: summaryText,
      }).onConflictDoUpdate({
        target: [summaries.userId, summaries.date],
        set: { highlightText: summaryText },
      });

      res.json(entry);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to process entry" });
    }
  });

  // Get daily summaries
  app.get("/api/summaries/daily", async (_req, res) => {
    try {
      const userSummaries = await db.query.summaries.findMany({
        orderBy: desc(summaries.date),
      });
      res.json(userSummaries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch summaries" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}