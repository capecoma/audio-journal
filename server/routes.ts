import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { entries, summaries, tags, entryTags, users } from "@db/schema";
import { eq, desc, and, sql, ilike } from "drizzle-orm"; // Added ilike import
import { transcribeAudio, generateSummary, generateTags } from "./ai";
import multer from "multer";

// Simple middleware for user context
async function addUserContext(req: Request, res: Response, next: NextFunction) {
  try {
    req.app.locals.userId = 1; // TODO: Get from auth
    next();
  } catch (error) {
    console.error('Error adding user context:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Clear route handler cache on startup
  app._router = undefined;

  // Initialize development user if it doesn't exist
  (async () => {
    try {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, 1)
      });

      if (!existingUser) {
        await db.insert(users).values({
          id: 1, // Fixed ID for development
          username: "dev_user",
          password: "dev_password"
        });
        console.log("Development user created successfully");
      }
    } catch (error) {
      console.error("Error initializing development user:", error);
    }
  })();
  
  // Apply user context middleware to all API routes
  app.use('/api', addUserContext);

  // Get entries for the current user with optional search
  app.get("/api/entries", async (req, res) => {
    try {
      const { search } = req.query;
      const userEntries = await db.query.entries.findMany({
        orderBy: [desc(entries.createdAt)],
        with: {
          entryTags: {
            with: {
              tag: true
            }
          }
        },
        where: search && typeof search === 'string' 
          ? (entries, { ilike }) => ilike(entries.transcript!, `%${search}%`)
          : undefined
      });
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

      const audioBuffer = req.file.buffer;
      
      // Calculate approximate duration based on audio file size and bitrate
      // Using 32kbps as our fixed bitrate (32000 bits per second)
      const bitRate = 32000; // bits per second
      const duration = Math.round((audioBuffer.length * 8) / bitRate);

      // For now, we'll store audio as base64 data URL
      const audioUrl = `data:audio/webm;base64,${audioBuffer.toString('base64')}`;

      // Transcribe audio
      let transcript;
      try {
        transcript = await transcribeAudio(audioBuffer);
      } catch (error: any) {
        console.error("Transcription error:", error);
        return res.status(400).json({ error: error.message });
      }

      // Verify user exists before creating entry
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.app.locals.userId)
      });

      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }

      // Create entry
      const [entry] = await db.insert(entries).values({
        audioUrl,
        transcript,
        duration,
        userId: user.id,
      }).returning();

      // Generate and save tags
      if (transcript) {
        try {
          const generatedTags = await generateTags(transcript);
              
          for (const tagName of generatedTags) {
            // First try to find if the tag exists
            let existingTag = await db.query.tags.findFirst({
              where: and(
                eq(tags.name, tagName),
                eq(tags.userId, user.id)
              )
            });

            // If tag doesn't exist, create it
            if (!existingTag) {
              const [newTag] = await db.insert(tags)
                .values({
                  name: tagName,
                  userId: user.id
                })
                .returning();
              existingTag = newTag;
            }

            // Associate tag with entry
            if (existingTag) {
              await db.insert(entryTags)
                .values({
                  entryId: entry.id,
                  tagId: existingTag.id
                })
                .onConflictDoNothing();
            }
          }
        } catch (error) {
          console.error('Error generating tags:', error);
          // Continue with the entry creation even if tag generation fails
        }
      }

      // Generate daily summary
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get entries for today using date part comparison
      const todaysEntries = await db.query.entries.findMany({
        where: and(
          eq(entries.userId, user.id),
          sql`DATE(${entries.createdAt}) = ${today.toISOString().split('T')[0]}`
        ),
        orderBy: [desc(entries.createdAt)]
      });

      console.log('Found entries for today:', todaysEntries.length);

      const transcripts = todaysEntries
        .map(e => e.transcript)
        .filter((t): t is string => t !== null);
      
      console.log('Found transcripts:', transcripts.length);
      
      if (transcripts.length > 0) {
        try {
          console.log('Generating summary for transcripts:', transcripts);
          const summaryText = await generateSummary(transcripts);
          console.log('Generated summary:', summaryText);

          // Update or create daily summary
          await db.insert(summaries)
            .values({
              userId: user.id,
              date: today.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
              highlightText: summaryText,
            })
            .onConflictDoUpdate({
              target: ["date", "user_id"],
              set: { highlightText: summaryText }
            });
        } catch (error) {
          console.error('Error generating summary:', error);
          // Continue with the entry creation even if summary generation fails
        }
      }

      res.json(entry);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to process entry" });
    }
  });

  // Get daily summaries
  app.get("/api/summaries/daily", async (_req, res) => {
    try {
      // Get user ID from context
      const userId = _req.app.locals.userId;
      
      const userSummaries = await db.query.summaries.findMany({
        where: eq(summaries.userId, userId),
        orderBy: [desc(summaries.date)],
      });
      
      console.log('Found summaries for user:', userSummaries.length);
      if (userSummaries.length > 0) {
        console.log('Sample summary:', userSummaries[0]);
      }
      
      res.json(userSummaries);
    } catch (error) {
      console.error('Error fetching daily summaries:', error);
      res.status(500).json({ error: "Failed to fetch summaries" });
    }
  });

  // Export entries endpoint
  app.get("/api/entries/export", async (_req, res) => {
    try {
      const exportEntries = await db.query.entries.findMany({
        orderBy: [desc(entries.createdAt)],
        with: {
          entryTags: {
            with: {
              tag: true
            }
          }
        }
      });

      const exportData = exportEntries.map(entry => ({
        date: entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'No date',
        transcript: entry.transcript ?? 'No transcript available',
        tags: entry.entryTags?.map(et => et.tag.name) ?? [],
        audioUrl: entry.audioUrl,
        duration: entry.duration ?? 0
      }));

      const exportContent = exportData.map(entry => `
Date: ${entry.date}
Duration: ${Math.round(entry.duration / 60)} minutes
Tags: ${entry.tags.join(', ') || 'No tags'}

${entry.transcript}

-------------------
`).join('\n');

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename=journal-entries.txt');
      res.send(exportContent);
    } catch (error) {
      console.error('Error exporting entries:', error);
      res.status(500).json({ message: "Failed to export entries" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}