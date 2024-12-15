import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { db } from "@db";
import { entries, summaries, tags, entryTags } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";
import { transcribeAudio, generateSummary, generateTags } from "./ai";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Get entries for the current user with optional search
  app.get("/api/entries", async (req, res) => {
    try {
      const { search } = req.query;
      const queryConfig = {
        orderBy: [desc(entries.createdAt)],
        with: {
          entryTags: {
            with: {
              tag: true
            }
          }
        }
      };

      const finalQuery = search && typeof search === 'string'
        ? db.query.entries.findMany({
            ...queryConfig,
            where: (entries, { ilike }) => ilike(entries.transcript!, `%${search}%`),
          })
        : db.query.entries.findMany(queryConfig);

      const userEntries = await finalQuery;
      res.json(userEntries);
    } catch (error) {
      console.error('Error fetching entries:', error);
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

      // Generate and save tags
      if (transcript) {
        try {
          const generatedTags = await generateTags(transcript);
          
          for (const tagName of generatedTags) {
            // First try to find if the tag exists
            let existingTag = await db.query.tags.findFirst({
              where: (tags, { and, eq }) => and(
                eq(tags.name, tagName),
                eq(tags.userId, 1)
              )
            });

            // If tag doesn't exist, create it
            if (!existingTag) {
              [existingTag] = await db.insert(tags)
                .values({ name: tagName, userId: 1 })
                .returning();
            }

            // Associate tag with entry
            await db.insert(entryTags)
              .values({ entryId: entry.id, tagId: existingTag.id })
              .onConflictDoNothing();
          }
        } catch (error) {
          console.error('Error generating tags:', error);
          // Continue with the entry creation even if tag generation fails
        }
      }

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

  // Add or remove tag from entry
  app.post("/api/entries/:entryId/tags", async (req, res) => {
    try {
      const entryId = parseInt(req.params.entryId);
      const { tagId } = req.body;

      if (typeof tagId !== 'number') {
        return res.status(400).json({ error: "tagId must be a number" });
      }

      // Verify entry exists
      const [entry] = await db.select().from(entries).where(eq(entries.id, entryId)).limit(1);
      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }

      // Check if the tag is already applied to this specific entry
      const [existingTag] = await db
        .select()
        .from(entryTags)
        .where(and(
          eq(entryTags.entryId, entryId),
          eq(entryTags.tagId, tagId)
        ))
        .limit(1);

      if (existingTag) {
        // If tag exists on this entry, remove it (toggle behavior)
        await db.delete(entryTags)
          .where(and(
            eq(entryTags.entryId, entryId),
            eq(entryTags.tagId, tagId)
          ));
      } else {
        // If tag doesn't exist on this entry, add it
        await db.insert(entryTags)
          .values({ entryId, tagId });
      }

      // Get updated entry with its tags
      const updatedEntry = await db.query.entries.findFirst({
        where: eq(entries.id, entryId),
        with: {
          entryTags: {
            with: {
              tag: true
            }
          }
        }
      });

      if (!updatedEntry) {
        return res.status(404).json({ error: "Entry not found after update" });
      }

      // Return the updated tags for this specific entry
      res.json(updatedEntry.entryTags?.map(et => et.tag) ?? []);
    } catch (error) {
      console.error('Error updating entry tags:', error);
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
  // Export entries endpoint
  app.get("/api/entries/export", async (_req, res) => {
    try {
      const userEntries = await db.query.entries.findMany({
        orderBy: [desc(entries.createdAt)],
        with: {
          entryTags: {
            with: {
              tag: true
            }
          }
        }
      });

      const exportData = userEntries.map(entry => ({
        date: new Date(entry.createdAt!).toLocaleString(),
        transcript: entry.transcript,
        tags: entry.entryTags?.map(et => et.tag.name),
        audioUrl: entry.audioUrl,
        duration: entry.duration
      }));

      const exportContent = exportData.map(entry => `
Date: ${entry.date}
Duration: ${Math.round(entry.duration! / 60)} minutes
Tags: ${entry.tags?.join(', ') || 'No tags'}

${entry.transcript}

-------------------
`).join('\n');

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename=journal-entries.txt');
      res.send(exportContent);
    } catch (error) {
      console.error('Error exporting entries:', error);
      res.status(500).json({ error: "Failed to export entries" });
    }
  });

}