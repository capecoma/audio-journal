import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { entries, summaries, tags, entryTags, users } from "@db/schema";
import { eq, desc, and, sql, ilike } from "drizzle-orm"; // Added ilike import
import { transcribeAudio, generateSummary, generateTags } from "./ai";
import multer from "multer";
import authRoutes from "./routes/auth";

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

  // Register authentication routes
  app.use("/api/auth", authRoutes);

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
          // Format the date consistently
          const formattedDate = today.toISOString().split('T')[0];
          
          // Try to find existing summary
          const existingSummary = await db.query.summaries.findFirst({
            where: and(
              eq(summaries.userId, user.id),
              eq(summaries.date, sql`${formattedDate}`)
            )
          });

          if (existingSummary) {
            // Update existing summary
            await db
              .update(summaries)
              .set({ highlightText: summaryText })
              .where(and(
                eq(summaries.userId, user.id),
                eq(summaries.date, sql`${formattedDate}`)
              ));
          } else {
            // Insert new summary
            await db.insert(summaries).values({
              userId: user.id,
              date: formattedDate,
              highlightText: summaryText,
            });
          }
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
      
      // Get the last 7 days of summaries
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const userSummaries = await db.query.summaries.findMany({
        where: and(
          eq(summaries.userId, userId),
          sql`${summaries.date} >= ${sevenDaysAgo.toISOString().split('T')[0]}`
        ),
        orderBy: [desc(summaries.date)],
      });
      
      // Format summaries for better display
      const formattedSummaries = userSummaries.map(summary => ({
        ...summary,
        date: new Date(summary.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        highlights: summary.highlightText.split('\n').filter(line => line.trim()),
      }));
      
      console.log('Found and formatted summaries:', formattedSummaries.length);
      if (formattedSummaries.length > 0) {
        console.log('Sample formatted summary:', formattedSummaries[0]);
      }
      
      res.json(formattedSummaries);
    } catch (error) {
      console.error('Error fetching daily summaries:', error);
      res.status(500).json({ error: "Failed to fetch summaries" });
    }
  });

  // Analytics endpoint
  app.get("/api/analytics", async (_req, res) => {
    try {
      const userId = _req.app.locals.userId;

      // Get feature usage stats
      // Get counts using SQL count aggregation
      const [
        recordingCount,
        transcriptionCount,
        summaryCount,
        tagCount
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(entries).then(res => Number(res[0].count)),
        db.select({ count: sql<number>`count(*)` })
          .from(entries)
          .where(sql`transcript is not null`)
          .then(res => Number(res[0].count)),
        db.select({ count: sql<number>`count(*)` }).from(summaries).then(res => Number(res[0].count)),
        db.select({ count: sql<number>`count(*)` }).from(tags).then(res => Number(res[0].count))
      ]);

      // Calculate daily stats for the last 14 days
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const dailyEntries = await db.query.entries.findMany({
        where: and(
          eq(entries.userId, userId),
          sql`${entries.createdAt} >= ${twoWeeksAgo.toISOString()}`
        ),
      });

      // Group entries by date
      const dailyStats = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const count = dailyEntries.filter(entry => {
          const entryDate = new Date(entry.createdAt);
          entryDate.setHours(0, 0, 0, 0);
          return entryDate.getTime() === date.getTime();
        }).length;

        return {
          date: date.toISOString().split('T')[0],
          count
        };
      }).reverse();

      const featureUsage = [
        { feature: "Recordings", count: recordingCount },
        { feature: "Transcriptions", count: transcriptionCount },
        { feature: "Daily Summaries", count: summaryCount },
        { feature: "Tags", count: tagCount }
      ];

      res.json({
        featureUsage,
        dailyStats
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: "Failed to fetch analytics" });
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

  // Create and return HTTP server
  const httpServer = createServer(app);
  return httpServer;
}