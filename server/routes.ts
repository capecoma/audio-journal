import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { transcribeAudio, generateTags, generateSummary, analyzeContent, generateReflectionPrompt, analyzeJournalingPatterns } from "./ai";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { db } from "@db";
import { entries, summaries, users, achievements, userAchievements } from "@db/schema";
import { eq, desc, sql, and, gte, lt } from "drizzle-orm";
import type { Entry, Summary, Achievement, UserAchievement } from "@db/schema";
import { setupAuth } from "./auth";
import { isAuthenticated, getUserId } from "./middleware/auth";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Add health check endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      const result = await db.execute(sql`SELECT 1 as check`);
      res.json({ status: "healthy", details: "Database connection successful" });
    } catch (err) {
      const error = err as Error;
      console.error("Health check failed:", error);
      res.status(500).json({ 
        status: "unhealthy", 
        details: error.message 
      });
    }
  });

  // Get all achievements with user progress
  app.get("/api/achievements", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      console.log('Fetching achievements for user:', userId);

      // Get all achievements
      const allAchievements = await db.query.achievements.findMany({
        orderBy: [desc(achievements.createdAt)]
      });

      // Get user's achievement progress
      const userProgress = await db.query.userAchievements.findMany({
        where: eq(userAchievements.userId, userId)
      });

      // Map user progress to achievements
      const achievementsWithProgress = allAchievements.map(achievement => {
        const progress = userProgress.find(p => p.achievementId === achievement.id);
        return {
          ...achievement,
          userProgress: progress ? {
            earnedAt: progress.earnedAt,
            progress: progress.progress
          } : undefined
        };
      });

      res.json(achievementsWithProgress);
    } catch (err) {
      const error = err as Error;
      console.error("Error fetching achievements:", error);
      res.status(500).json({ 
        error: "Failed to fetch achievements", 
        details: error.message 
      });
    }
  });

  // Update achievement progress
  app.post("/api/achievements/:id/progress", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const achievementId = parseInt(req.params.id);
      const { progress } = req.body;

      if (!progress || typeof progress.current !== 'number' || typeof progress.target !== 'number') {
        return res.status(400).json({ error: "Invalid progress data" });
      }

      // Get the achievement
      const achievement = await db.query.achievements.findFirst({
        where: eq(achievements.id, achievementId)
      });

      if (!achievement) {
        return res.status(404).json({ error: "Achievement not found" });
      }

      // Calculate progress percentage
      const percent = Math.min(100, (progress.current / progress.target) * 100);

      // Update or create user achievement progress
      const existingProgress = await db.query.userAchievements.findFirst({
        where: and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievementId)
        )
      });

      if (existingProgress) {
        const [updated] = await db
          .update(userAchievements)
          .set({
            progress: {
              current: progress.current,
              target: progress.target,
              percent
            },
            ...(percent >= 100 && !existingProgress.earnedAt ? { earnedAt: new Date().toISOString() } : {})
          })
          .where(eq(userAchievements.id, existingProgress.id))
          .returning();

        res.json(updated);
      } else {
        const [created] = await db
          .insert(userAchievements)
          .values({
            userId,
            achievementId,
            progress: {
              current: progress.current,
              target: progress.target,
              percent
            },
            earnedAt: percent >= 100 ? new Date().toISOString() : null
          })
          .returning();

        res.json(created);
      }
    } catch (err) {
      const error = err as Error;
      console.error("Error updating achievement progress:", error);
      res.status(500).json({ 
        error: "Failed to update achievement progress", 
        details: error.message 
      });
    }
  });

  // Protected entries route with detailed logging
  app.get("/api/entries", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      console.log('Fetching entries for user ID:', userId);

      // First verify the user exists
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });
      console.log('Found user:', user?.username);

      const allEntries = await db.query.entries.findMany({
        where: eq(entries.userId, userId),
        orderBy: [desc(entries.createdAt)]
      });

      console.log(`Found ${allEntries.length} entries for user ${userId}`);
      console.log('Entry IDs:', allEntries.map(e => e.id));

      res.json(allEntries);
    } catch (err) {
      const error = err as Error;
      console.error("Error fetching entries:", error);
      res.status(500).json({ 
        error: "Failed to fetch entries", 
        details: error.message 
      });
    }
  });

  // Protected summaries route
  app.get("/api/summaries/daily", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      console.log('Attempting to fetch daily summaries for user:', userId);
      const allSummaries = await db.query.summaries.findMany({
        where: eq(summaries.userId, userId),
        orderBy: [desc(summaries.date)]
      });
      console.log(`Successfully fetched ${allSummaries.length} summaries`);
      res.json(allSummaries);
    } catch (err) {
      const error = err as Error;
      console.error("Error fetching summaries:", error);
      res.status(500).json({ 
        error: "Failed to fetch summaries", 
        details: error.message 
      });
    }
  });

  // Protected upload and transcribe route
  app.post("/api/entries/upload", isAuthenticated, upload.single("audio"), async (req, res) => {
    try {
      const userId = getUserId(req);

      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const audioBuffer = req.file.buffer;
      const audioUrl = `data:audio/webm;base64,${audioBuffer.toString('base64')}`;

      // Transcribe the audio
      console.log('Starting transcription...');
      const transcript = await transcribeAudio(audioBuffer);
      console.log('Transcription completed:', transcript);

      // Generate tags for the transcript
      console.log('Generating tags...');
      const tags = await generateTags(transcript);
      console.log('Tags generated:', tags);

      // Perform AI analysis
      console.log('Performing AI analysis...');
      const aiAnalysis = await analyzeContent(transcript);
      console.log('AI analysis completed:', aiAnalysis);

      const currentDate = new Date().toISOString();

      // Insert new entry
      const [entry] = await db.insert(entries)
        .values({
          userId,
          audioUrl,
          transcript,
          tags,
          duration: Math.round((audioBuffer.length * 8) / 32000),
          isProcessed: true,
          createdAt: currentDate,
          aiAnalysis: {
            sentiment: aiAnalysis.sentiment,
            topics: aiAnalysis.topics,
            insights: aiAnalysis.insights
          }
        })
        .returning();

      // Get all entries for today to generate a summary
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      console.log('Fetching today\'s entries between:', todayStart, 'and', todayEnd);

      const todayEntries = await db.select()
        .from(entries)
        .where(
          and(
            eq(entries.userId, userId),
            gte(entries.createdAt, todayStart),
            lt(entries.createdAt, todayEnd)
          )
        );

      console.log(`Found ${todayEntries.length} entries for today`);

      if (todayEntries.length > 0) {
        const transcripts = todayEntries
          .filter(e => e.transcript)
          .map(e => e.transcript as string);

        console.log('Generating daily summary...');
        const summaryText = await generateSummary(transcripts);
        console.log('Summary generated:', summaryText);

        // Calculate average sentiment and collect all topics
        const entriesWithAnalysis = todayEntries.filter(e => e.aiAnalysis);
        const averageSentiment = entriesWithAnalysis.length > 0 
          ? Math.round(
              entriesWithAnalysis.reduce((acc, e) => {
                const sentiment = e.aiAnalysis?.sentiment;
                return acc + (typeof sentiment === 'number' ? sentiment : 0);
              }, 0) / entriesWithAnalysis.length
            )
          : null;

        const allTopics = entriesWithAnalysis.flatMap(e => {
          const topics = e.aiAnalysis?.topics;
          return Array.isArray(topics) ? topics : [];
        });

        const topicFrequency = allTopics.reduce((acc, topic) => {
          acc[topic] = (acc[topic] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const topTopics = Object.entries(topicFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([topic]) => topic);

        // Update or create today's summary
        const existingSummary = await db.select()
          .from(summaries)
          .where(
            and(
              eq(summaries.userId, userId),
              gte(summaries.date, todayStart),
              lt(summaries.date, todayEnd)
            )
          )
          .limit(1);

        if (existingSummary.length > 0) {
          await db.update(summaries)
            .set({
              highlightText: summaryText,
              sentimentScore: averageSentiment,
              topicAnalysis: topTopics,
              keyInsights: entriesWithAnalysis[0]?.aiAnalysis?.insights || []
            })
            .where(eq(summaries.id, existingSummary[0].id));
        } else {
          await db.insert(summaries)
            .values({
              userId,
              date: todayStart,
              highlightText: summaryText,
              createdAt: currentDate,
              sentimentScore: averageSentiment,
              topicAnalysis: topTopics,
              keyInsights: entriesWithAnalysis[0]?.aiAnalysis?.insights || []
            });
        }
      }

      res.json(entry);
    } catch (error: any) {
      console.error('Error processing entry:', error);
      res.status(500).json({
        error: error.message || "Failed to process entry",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // New endpoint to toggle AI journaling feature
  app.post("/api/preferences/ai-journaling", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "Invalid input. 'enabled' must be a boolean value." });
      }

      const [user] = await db
        .update(users)
        .set({
          preferences: {
            aiJournalingEnabled: enabled
          }
        })
        .where(eq(users.id, userId))
        .returning();

      res.json({
        success: true,
        preferences: user.preferences
      });
    } catch (error: any) {
      console.error("Error updating AI journaling preference:", error);
      res.status(500).json({
        error: "Failed to update preference",
        details: error.message
      });
    }
  });

  // Modified reflection prompt endpoint to check for preference
  app.get("/api/prompts/reflection", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      // Check if AI journaling is enabled for this user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.preferences?.aiJournalingEnabled) {
        return res.status(403).json({
          error: "AI journaling feature is not enabled",
          message: "Enable AI journaling in your preferences to access this feature"
        });
      }

      // Get recent entries for context
      const recentEntries = await db.query.entries.findMany({
        where: and(
          eq(entries.userId, userId),
          gte(entries.createdAt, subDays(new Date(), 7).toISOString())
        ),
        orderBy: [desc(entries.createdAt)],
        limit: 5
      });

      const entriesWithSentiment = recentEntries.map(entry => ({
        transcript: entry.transcript || "",
        sentiment: entry.aiAnalysis?.sentiment || 3
      }));

      const prompt = await generateReflectionPrompt(entriesWithSentiment);
      res.json({ prompt });
    } catch (error: any) {
      console.error("Error generating reflection prompt:", error);
      res.status(500).json({
        error: "Failed to generate reflection prompt",
        details: error.message
      });
    }
  });

  // Modified journaling patterns endpoint to check for preference
  app.get("/api/insights/patterns", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);

      // Check if AI journaling is enabled for this user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user.preferences?.aiJournalingEnabled) {
        return res.status(403).json({
          error: "AI journaling feature is not enabled",
          message: "Enable AI journaling in your preferences to access this feature"
        });
      }

      // Get entries from the last 30 days
      const entries = await db.query.entries.findMany({
        where: and(
          eq(entries.userId, userId),
          gte(entries.createdAt, subDays(new Date(), 30).toISOString())
        ),
        orderBy: [desc(entries.createdAt)]
      });

      const entriesForAnalysis = entries.map(entry => ({
        transcript: entry.transcript || "",
        createdAt: entry.createdAt,
        sentiment: entry.aiAnalysis?.sentiment || 3
      }));

      const analysis = await analyzeJournalingPatterns(entriesForAnalysis);
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing journaling patterns:", error);
      res.status(500).json({
        error: "Failed to analyze journaling patterns",
        details: error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}