import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { db } from "@db";
import { entries, summaries, tags, entryTags } from "@db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { transcribeAudio, generateSummary } from "./ai";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Get entries for the current user with optional search
  app.get("/api/entries", async (req, res) => {
    try {
      const { search } = req.query;
      let query = db.query.entries.findMany({
        orderBy: desc(entries.createdAt),
      });

      if (search && typeof search === 'string') {
        query = db.query.entries.findMany({
          where: (entries, { ilike }) => ilike(entries.transcript!, `%${search}%`),
          orderBy: desc(entries.createdAt),
        });
      }

      const userEntries = await query;
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

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: "No audio data received" });
      }

      const audioBuffer = req.file.buffer;
      const duration = 0; // We'll get this from the audio file later

      // For now, we'll store audio as base64 data URL
      const audioUrl = `data:audio/webm;base64,${audioBuffer.toString('base64')}`;

      // Transcribe audio
      let transcript;
      try {
        transcript = await transcribeAudio(audioBuffer);
      } catch (error) {
        console.error("Transcription error:", error);
        return res.status(400).json({ error: error.message });
      }

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
      await db.insert(summaries)
        .values({
          userId: 1,
          date: today.toISOString(),
          highlightText: summaryText,
        })
        .onConflictDoUpdate({
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

  // Tag management endpoints
  app.get("/api/tags", async (req, res) => {
    try {
      const userTags = await db.query.tags.findMany({
        orderBy: desc(tags.createdAt),
      });
      res.json(userTags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.post("/api/tags", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Tag name is required" });
      }

      const [tag] = await db.insert(tags)
        .values({ name, userId: 1 })
        .returning();
      
      res.json(tag);
    } catch (error) {
      res.status(500).json({ error: "Failed to create tag" });
    }
  });

  // Add tags to entry
  app.post("/api/entries/:entryId/tags", async (req, res) => {
    try {
      const entryId = parseInt(req.params.entryId);
      const { tagId } = req.body;

      if (typeof tagId !== 'number') {
        return res.status(400).json({ error: "tagId must be a number" });
      }

      // Check if the tag is already applied
      const [existingTag] = await db
        .select()
        .from(entryTags)
        .where(and(
          eq(entryTags.entryId, entryId),
          eq(entryTags.tagId, tagId)
        ))
        .limit(1);

      if (existingTag) {
        // If tag exists, remove it (toggle behavior)
        await db.delete(entryTags)
          .where(and(
            eq(entryTags.entryId, entryId),
            eq(entryTags.tagId, tagId)
          ));
      } else {
        // If tag doesn't exist, add it
        await db.insert(entryTags)
          .values({ entryId, tagId });
      }

      // Get updated tags for the entry
      const tags = await db.query.entryTags.findMany({
        where: eq(entryTags.entryId, entryId),
        with: {
          tag: true,
        },
      });

      res.json(tags.map(t => t.tag));
    } catch (error) {
      res.status(500).json({ error: "Failed to update entry tags" });
    }
  });

  // Get entry tags
  app.get("/api/entries/:entryId/tags", async (req, res) => {
    try {
      const entryId = parseInt(req.params.entryId);
      const entryTags = await db.query.entryTags.findMany({
        where: eq(entryTags.entryId, entryId),
        with: {
          tag: true,
        },
      });

      res.json(entryTags.map(et => et.tag));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch entry tags" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}