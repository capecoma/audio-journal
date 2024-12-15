import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { entries, summaries, tags, entryTags, users } from "@db/schema";
import { eq, desc, and, lt, isNull } from "drizzle-orm";
import { transcribeAudio, generateSummary, generateTags } from "./ai";
import multer from "multer";

// Function to check and update trial status
async function checkAndUpdateTrialStatus(userId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });

  if (!user) {
    throw new Error("User not found");
  }

  const now = new Date();
  const trialEndDate = user.trialEndDate ? new Date(user.trialEndDate) : null;
  const isExpired = trialEndDate && trialEndDate <= now;
  
  // Automatically downgrade expired trials
  if (user.currentTier === 'trial' && isExpired) {
    const updatedUser = await db.update(users)
      .set({ currentTier: 'basic' })
      .where(eq(users.id, userId))
      .returning()
      .execute();

    return {
      ...updatedUser[0],
      isTrialActive: false,
      trialEndDate: user.trialEndDate,
      trialStartDate: user.trialStartDate
    };
  }

  return {
    ...user,
    isTrialActive: user.currentTier === 'trial' && !isExpired
  };
}

// Middleware to check trial status
async function checkTrialStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = 1; // TODO: Get from auth
    const user = await checkAndUpdateTrialStatus(userId);

    // Define feature access by tier
    const restrictedRoutes = {
      // Routes that require trial or basic tier
      premium: [
        '/api/entries/export',
        '/api/summaries/daily',
        '/api/trial/analytics'
      ],
      // Routes accessible by all tiers but with limits for free tier
      limited: [
        '/api/entries',
        '/api/entries/upload'
      ]
    };

    // Check if accessing a premium route
    const isPremiumRoute = restrictedRoutes.premium.some(route => req.path.startsWith(route));
    const isLimitedRoute = restrictedRoutes.limited.some(route => req.path.startsWith(route));

    // Block premium features for free tier
    if (isPremiumRoute && user.currentTier === 'free') {
      return res.status(403).json({
        error: "Premium feature",
        detail: !user.isTrialUsed ? 
          "Start your free trial to access this feature" :
          "Upgrade to access premium features",
        canStartTrial: !user.isTrialUsed
      });
    }

    // Check free tier limits
    if (isLimitedRoute && user.currentTier === 'free') {
      const entryCount = await db.select().from(entries)
        .where(eq(entries.userId, userId));

      if (entryCount.length >= 5 && req.method === 'POST') {
        return res.status(403).json({
          error: "Free tier limit reached",
          detail: "You've reached the limit of 5 entries. Start your trial or upgrade to create more.",
          canStartTrial: !user.isTrialUsed
        });
      }
    }

    // Store user status in request for route handlers
    req.app.locals.userTier = {
      currentTier: user.currentTier,
      isTrialActive: user.isTrialActive,
      trialEndDate: user.trialEndDate,
      trialStartDate: user.trialStartDate,
      isTrialUsed: user.isTrialUsed
    };

    next();
  } catch (error) {
    console.error('Error checking trial status:', error);
    res.status(500).json({ error: "Internal server error" });
  }
}

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Clear route handler cache on startup
  app._router = undefined;
  
  // Apply trial status middleware to all API routes
  app.use('/api', checkTrialStatus);

  // Trial Management Routes
  app.post("/api/trial/activate", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from auth
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.isTrialUsed) {
        return res.status(400).json({ error: "Trial period already used" });
      }

      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 10); // 10-day trial

      await db.update(users)
        .set({
          trialStartDate,
          trialEndDate,
          isTrialUsed: true,
          currentTier: 'trial'
        })
        .where(eq(users.id, userId));

      res.json({
        message: "Trial activated successfully",
        trialEndDate
      });
    } catch (error) {
      console.error('Error activating trial:', error);
      res.status(500).json({ error: "Failed to activate trial" });
    }
  });

  app.get("/api/trial/status", async (req, res) => {
    try {
      const userId = 1; // TODO: Get from auth
      const user = await checkAndUpdateTrialStatus(userId);

      // Get entry count for free tier users
      const userEntries = await db.select().from(entries).where(eq(entries.userId, userId));
      const entryCount = user.currentTier === 'free' ? userEntries.length : null;
      const freeEntryLimit = 5;

      res.json({
        currentTier: user.currentTier,
        isTrialActive: user.isTrialActive,
        trialUsed: user.isTrialUsed,
        trialEndDate: user.trialEndDate,
        trialStartDate: user.trialStartDate,
        entryCount: entryCount,
        entryLimit: user.currentTier === 'free' ? freeEntryLimit : null
      });
    } catch (error) {
      console.error('Error fetching trial status:', error);
      res.status(500).json({ error: "Failed to fetch trial status" });
    }
  });

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
      const duration = 0; // We'll get this from the audio file later

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

      // Create entry
      const [entry] = await db.insert(entries).values({
        audioUrl,
        transcript,
        duration,
        userId: 1, // TODO: Get from auth
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