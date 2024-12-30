import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { db } from "@db";
import { entries, users, achievements, userAchievements, summaries } from "@db/schema";
import { eq, desc, sql, and, gte, lt } from "drizzle-orm";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { setupAuth } from "./auth";
import { isAuthenticated, getUserId } from "./middleware/auth";
import { trackAchievements } from "./middleware/achievements";
import { transcribeAudio, generateTags, analyzeContent, generateSummary, generateReflectionPrompt, analyzeJournalingPatterns } from "./ai";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Health check endpoint
  app.get("/api/health", async (_req, res) => {
    try {
      await db.execute(sql`SELECT 1 as check`);
      res.json({ status: "healthy" });
    } catch (err) {
      console.error("Health check failed:", err);
      res.status(500).json({ status: "unhealthy" });
    }
  });

  // Add patterns analysis endpoint with proper logging
  app.get("/api/analytics/patterns", isAuthenticated, trackAchievements('view_patterns'), async (req, res) => {
    try {
      const userId = getUserId(req);
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      console.log('Fetching entries for patterns analysis, user:', userId);

      const recentEntries = await db.query.entries.findMany({
        where: and(
          eq(entries.userId, userId),
          gte(entries.createdAt, thirtyDaysAgo)
        ),
        orderBy: [desc(entries.createdAt)]
      });

      if (!recentEntries.length) {
        return res.json({
          consistency: {
            streakDays: 0,
            totalEntries: 0,
            averageEntriesPerWeek: "0",
            mostActiveDay: null,
            completionRate: 0
          },
          emotionalTrends: {
            dominantEmotion: null,
            emotionalStability: 0,
            moodProgression: []
          },
          topics: {
            frequentThemes: [],
            emergingTopics: [],
            decliningTopics: []
          },
          recommendations: []
        });
      }

      // Calculate consistency metrics
      const entriesByDay = new Map<string, number>();
      recentEntries.forEach(entry => {
        const day = format(new Date(entry.createdAt), 'yyyy-MM-dd');
        entriesByDay.set(day, (entriesByDay.get(day) || 0) + 1);
      });

      let currentStreak = 0;
      let date = new Date();
      while (entriesByDay.has(format(date, 'yyyy-MM-dd'))) {
        currentStreak++;
        date = subDays(date, 1);
      }

      const dayOfWeekCounts = new Map<string, number>();
      recentEntries.forEach(entry => {
        const dayOfWeek = format(new Date(entry.createdAt), 'EEEE');
        dayOfWeekCounts.set(dayOfWeek, (dayOfWeekCounts.get(dayOfWeek) || 0) + 1);
      });

      const mostActiveDay = Array.from(dayOfWeekCounts.entries())
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Analyze emotional trends
      const emotions = recentEntries
        .map(entry => ({
          date: format(new Date(entry.createdAt), 'MMM d'),
          sentiment: entry.aiAnalysis?.sentiment ?? 3
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const emotionalStability = emotions.length > 1
        ? 1 - Math.min(1, (emotions.reduce((sum, curr, idx, arr) => {
            if (idx === 0) return 0;
            return sum + Math.abs(curr.sentiment - arr[idx - 1].sentiment);
          }, 0) / (emotions.length - 1)) / 4)
        : 1;

      // Analyze topic trends
      const topicFrequency = new Map<string, { count: number; dates: Date[] }>();
      recentEntries.forEach(entry => {
        const topics = entry.aiAnalysis?.topics ?? [];
        topics.forEach(topic => {
          if (!topicFrequency.has(topic)) {
            topicFrequency.set(topic, { count: 0, dates: [] });
          }
          const topicData = topicFrequency.get(topic)!;
          topicData.count++;
          topicData.dates.push(new Date(entry.createdAt));
        });
      });

      // Calculate topic trends
      const topicTrends = Array.from(topicFrequency.entries()).map(([topic, data]) => {
        const recentCount = data.dates
          .filter(date => date >= subDays(new Date(), 15))
          .length;
        const olderCount = data.dates
          .filter(date => date < subDays(new Date(), 15))
          .length;
        return {
          topic,
          trend: recentCount - olderCount
        };
      });

      const emergingTopics = topicTrends
        .filter(t => t.trend > 0)
        .sort((a, b) => b.trend - a.trend)
        .slice(0, 3)
        .map(t => t.topic);

      const decliningTopics = topicTrends
        .filter(t => t.trend < 0)
        .sort((a, b) => a.trend - b.trend)
        .slice(0, 3)
        .map(t => t.topic);

      // Generate recommendations
      const recommendations: string[] = [];
      if (currentStreak === 0) {
        recommendations.push("Try to journal daily to build a consistent habit");
      }
      if (emotionalStability < 0.5) {
        recommendations.push("Consider exploring mindfulness techniques to help stabilize your emotions");
      }
      if (recentEntries.length < 15) {
        recommendations.push("Aim to journal more frequently to get better insights");
      }

      res.json({
        consistency: {
          streakDays: currentStreak,
          totalEntries: recentEntries.length,
          averageEntriesPerWeek: (recentEntries.length / 4.28).toFixed(1),
          mostActiveDay,
          completionRate: (entriesByDay.size / 30) * 100
        },
        emotionalTrends: {
          dominantEmotion: emotions.reduce((acc, curr) => {
            const emotion = curr.sentiment >= 4 ? "Joy" :
                          curr.sentiment <= 2 ? "Sadness" :
                          "Neutral";
            acc[emotion] = (acc[emotion] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          emotionalStability,
          moodProgression: emotions
        },
        topics: {
          frequentThemes: Array.from(topicFrequency.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([topic]) => topic),
          emergingTopics,
          decliningTopics
        },
        recommendations
      });
    } catch (error: any) {
      console.error("Error analyzing patterns:", error);
      res.status(500).json({
        error: "Failed to analyze patterns",
        details: error.message
      });
    }
  });

  // Protected upload and transcribe route
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

interface UserPreferences {
  aiJournalingEnabled: boolean;
}