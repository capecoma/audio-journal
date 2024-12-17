import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { entries, summaries, tags, entryTags, users } from "@db/schema";
import { eq, desc, and, lt, isNull } from "drizzle-orm";
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
        where: eq(users.id, 1)
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
              where: (tags, { and, eq }) => and(
                eq(tags.name, tagName),
                eq(tags.userId, 1)
              )
            });

            // If tag doesn't exist, create it
            if (!existingTag) {
              const [newTag] = await db.insert(tags)
                .values({ name: tagName, userId: 1 })
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

  // Usage analytics endpoint
  app.get("/api/analytics", async (_req, res) => {
    try {
      // Get user ID from context
      const userId = _req.app.locals.userId;
      
      // Fetch entries for the user
      const userEntries = await db.query.entries.findMany({
        where: eq(entries.userId, userId),
        orderBy: [desc(entries.createdAt)],
        with: {
          entryTags: {
            with: {
              tag: true
            }
          }
        }
      });

      // Get summary count for the user
      const summaryCount = await db.query.summaries.findMany({
        where: eq(summaries.userId, userId)
      }).then(results => results.length);

      // Calculate usage statistics
      const featureUsage = [
        { feature: "Total Recordings", count: userEntries.length },
        { feature: "Transcribed Entries", count: userEntries.filter(entry => entry.transcript).length },
        { feature: "Tagged Entries", count: userEntries.filter(entry => entry.entryTags?.length > 0).length },
        { feature: "Daily Summaries", count: summaryCount },
      ];

      // Calculate daily usage trends
      const dailyStats = userEntries.reduce((acc: Record<string, number>, entry) => {
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
      const response = {
        featureUsage,
        dailyStats: Object.entries(dailyStats).map(([date, count]) => ({
          date,
          count
        }))
      };

      console.log('Analytics response:', response);
      res.json(response);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Tag management endpoints
  app.get("/api/tags", async (_req, res) => {
    try {
      const userTags = await db.query.tags.findMany({
        orderBy: desc(tags.createdAt),
      });
      res.json(userTags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  // Export entries endpoint
  app.get("/api/entries/export", async (_req, res) => {
    try {
      const entries = await db.query.entries.findMany({
        orderBy: [desc(entries.createdAt)],
        with: {
          entryTags: {
            with: {
              tag: true
            }
          }
        }
      });

      const exportData = entries.map(entry => ({
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