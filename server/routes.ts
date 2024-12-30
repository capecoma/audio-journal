import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { transcribeAudio, generateTags, generateSummary, analyzeContent, generateReflectionPrompt, analyzeJournalingPatterns } from "./ai";
import { format, startOfDay, endOfDay, subDays, subWeeks, parseISO } from "date-fns";
import { db } from "@db";
import { entries, summaries, users, achievements, userAchievements, UserPreferences } from "@db/schema";
import { eq, desc, sql, and, gte, lt, count } from "drizzle-orm";
import type { Entry, Summary, Achievement, UserAchievement } from "@db/schema";
import { setupAuth } from "./auth";
import { isAuthenticated, getUserId } from "./middleware/auth";
import { trackAchievements } from "./middleware/achievements";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Add comprehensive analytics endpoint
  app.get("/api/analytics/comprehensive", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Get all entries for the last 30 days
      const recentEntries = await db.query.entries.findMany({
        where: and(
          eq(entries.userId, userId),
          gte(entries.createdAt, thirtyDaysAgo)
        ),
        orderBy: [desc(entries.createdAt)]
      });

      if (!recentEntries.length) {
        return res.json({
          emotionDistribution: [],
          weeklyActivity: [],
          topTopics: [],
          insightHighlights: [],
          dailyStats: []
        });
      }

      // Calculate emotion distribution
      const emotionCounts: Record<string, number> = {};
      recentEntries.forEach(entry => {
        const sentiment = entry.aiAnalysis?.sentiment ?? 3;
        const emotion = sentiment >= 4 ? "Joy" :
                       sentiment <= 2 ? "Sadness" :
                       "Neutral";
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });

      const emotionDistribution = Object.entries(emotionCounts).map(([emotion, count]) => ({
        emotion,
        count
      }));

      // Calculate weekly activity and sentiment
      const weeklyActivity = Array.from({ length: 4 }).map((_, i) => {
        const weekStart = subWeeks(new Date(), i).toISOString();
        const weekEntries = recentEntries.filter(entry =>
          parseISO(entry.createdAt) >= parseISO(weekStart)
        );

        const sentiments = weekEntries
          .map(entry => entry.aiAnalysis?.sentiment)
          .filter((s): s is number => s !== undefined && s !== null);

        return {
          week: format(parseISO(weekStart), 'MMM d'),
          journalCount: weekEntries.length,
          averageSentiment: sentiments.length > 0
            ? Math.round(sentiments.reduce((a, b) => a + b, 0) / sentiments.length)
            : 3
        };
      }).reverse();

      // Calculate top topics
      const topicCounts: Record<string, number> = {};
      recentEntries.forEach(entry => {
        const topics = entry.aiAnalysis?.topics ?? [];
        topics.forEach(topic => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
      });

      const topTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, count]) => ({ topic, count }));

      // Generate insight highlights with proper null checks
      const insightHighlights = recentEntries
        .filter(entry => Array.isArray(entry.aiAnalysis?.insights) && entry.aiAnalysis.insights.length > 0)
        .slice(0, 5)
        .map(entry => ({
          date: entry.createdAt,
          insight: entry.aiAnalysis?.insights?.[0] ?? "No insight available",
          impact: Math.floor(Math.random() * 10) + 1 // This should be replaced with actual impact calculation
        }));

      res.json({
        emotionDistribution,
        weeklyActivity,
        topTopics,
        insightHighlights,
        dailyStats: weeklyActivity.map(w => ({
          date: w.week,
          count: w.journalCount
        }))
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({
        error: "Failed to fetch analytics",
        details: error.message
      });
    }
  });

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

  // Protected achievements route
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

  // Protected upload and transcribe route with achievement tracking
  app.post(
    "/api/entries/upload",
    isAuthenticated,
    upload.single("audio"),
    trackAchievements('entry_created'),
    async (req, res) => {
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

        // Perform AI analysis and track achievement
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

        // Track emotion analysis achievement
        await checkAchievements(userId, 'emotion_analyzed');

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
    }
  );

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


  // New endpoint to toggle AI journaling feature
  app.post("/api/preferences/ai-journaling", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { enabled } = req.body as { enabled: boolean };

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

      const preferences = user.preferences as UserPreferences;
      res.json({
        success: true,
        preferences
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

      const preferences = user.preferences as UserPreferences;
      if (!preferences.aiJournalingEnabled) {
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

      const preferences = user.preferences as UserPreferences;
      if (!preferences.aiJournalingEnabled) {
        return res.status(403).json({
          error: "AI journaling feature is not enabled",
          message: "Enable AI journaling in your preferences to access this feature"
        });
      }

      // Get entries from the last 30 days
      const userEntries = await db.query.entries.findMany({
        where: and(
          eq(entries.userId, userId),
          gte(entries.createdAt, subDays(new Date(), 30).toISOString())
        ),
        orderBy: [desc(entries.createdAt)]
      });

      const entriesForAnalysis = userEntries.map(entry => ({
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

async function checkAchievements(userId: number, achievementName: string) {
  //  This is a placeholder,  replace with actual achievement checking logic
  //  This would involve querying the database to see if the user has already earned the achievement and update if necessary.
  console.log(`Checking achievement '${achievementName}' for user ${userId}`);
  try {
    const achievement = await db.query.achievements.findFirst({ where: eq(achievements.name, achievementName) });
    if (achievement) {
      const existingProgress = await db.query.userAchievements.findFirst({ where: and(eq(userAchievements.userId, userId), eq(userAchievements.achievementId, achievement.id)) });
      if (!existingProgress) {
        await db.insert(userAchievements).values({ userId, achievementId: achievement.id, progress: { current: 1, target: 1, percent: 100 }, earnedAt: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.error("Error checking achievements:", err);
  }
}