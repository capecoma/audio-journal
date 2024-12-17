import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { entries, summaries, tags, entryTags } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { transcribeAudio, generateSummary, generateTags } from "./ai";
import multer from "multer";
import { validateFileUpload, encryptData, decryptData } from './middleware/security';

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Get entries with optional search
  app.get("/api/entries", async (req, res) => {
    try {
      const { search } = req.query;
      const allEntries = await db.query.entries.findMany({
        orderBy: [desc(entries.createdAt)],
        with: {
          entryTags: {
            with: {
              tag: true
            }
          }
        }
      });
      res.json(allEntries);
    } catch (error) {
      console.error('Error fetching entries:', error);
      res.status(500).json({ error: "Failed to fetch entries" });
    }
  });

  // Upload new entry
  app.post("/api/entries/upload", upload.single("audio"), validateFileUpload, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const audioBuffer = req.file.buffer;
      const bitRate = 32000; // bits per second
      const duration = Math.round((audioBuffer.length * 8) / bitRate);
      const audioUrl = `data:audio/webm;base64,${audioBuffer.toString('base64')}`;

      // Transcribe audio
      let transcript;
      try {
        transcript = await transcribeAudio(audioBuffer);
      } catch (error: any) {
        console.error("Transcription error:", error);
        return res.status(400).json({ error: error.message });
      }

      // Create entry
      const [entry] = await db.insert(entries).values({
        audioUrl: encryptData(audioUrl),
        transcript,
        duration,
      }).returning();

      // Generate and save tags
      if (transcript) {
        try {
          const generatedTags = await generateTags(transcript);
          
          for (const tagName of generatedTags) {
            // First try to find if the tag exists
            let existingTag = await db.query.tags.findFirst({
              where: (tags, { eq }) => eq(tags.name, tagName)
            });

            // If tag doesn't exist, create it
            if (!existingTag) {
              const [newTag] = await db.insert(tags)
                .values({ name: tagName })
                .returning();
              existingTag = newTag;
            }

            // Associate tag with entry
            await db.insert(entryTags)
              .values({ entryId: entry.id, tagId: existingTag.id })
              .onConflictDoNothing();
          }
        } catch (error) {
          console.error('Error generating tags:', error);
        }
      }

      // Generate summary
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaysEntries = await db.query.entries.findMany({
        orderBy: [desc(entries.createdAt)]
      });

      const transcripts = todaysEntries.map(e => e.transcript).filter(Boolean);
      const summaryText = await generateSummary(transcripts as string[]);

      // Update or create daily summary
      await db.insert(summaries)
        .values({
          date: today.toISOString(),
          highlightText: summaryText,
        })
        .onConflictDoUpdate({
          target: [summaries.date],
          set: { highlightText: summaryText },
        });

      // Decrypt audioUrl before sending response
      const decryptedEntry = {
        ...entry,
        audioUrl: decryptData(entry.audioUrl),
      };

      res.json(decryptedEntry);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to process entry" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}