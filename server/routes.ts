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

interface EntryAnalysis {
  sentiment?: number;
  topics?: string[];
  insights?: string[];
}

interface ProcessedEntry {
  id: number;
  createdAt: string;
  userId: number;
  audioUrl: string;
  transcript: string | null;
  duration: number | null;
  isProcessed: boolean | null;
  tags: string[] | null;
  aiAnalysis: EntryAnalysis | null;
}

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
      }) as ProcessedEntry[];

      if (!recentEntries.length) {
        return res.json({
          consistency: {
            streakDays: 0,
            totalEntries: 0,
            averageEntriesPerWeek: "0",
            mostActiveDay: null,
            completionRate: 0,
            entryTimeDistribution: []
          },
          emotionalTrends: {
            dominantEmotion: {},
            emotionalStability: 0,
            moodProgression: [],
            emotionFrequency: []
          },
          topics: {
            frequentThemes: [],
            emergingTopics: [],
            decliningTopics: [],
            topicTimeline: []
          },
          recommendations: []
        });
      }

      // Calculate entry time distribution
      const entryTimeDistribution = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: recentEntries.filter(entry => {
          const entryHour = new Date(entry.createdAt).getHours();
          return entryHour === hour;
        }).length
      }));

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

      // Enhanced emotion analysis
      const emotionCategories = ['Very Negative', 'Negative', 'Neutral', 'Positive', 'Very Positive'];
      const emotionFrequency = emotionCategories.map(emotion => ({
        emotion,
        count: recentEntries.filter(entry => {
          const sentiment = entry.aiAnalysis?.sentiment ?? 3;
          const category = sentiment <= 1.5 ? 'Very Negative' :
                            sentiment <= 2.5 ? 'Negative' :
                            sentiment <= 3.5 ? 'Neutral' :
                            sentiment <= 4.5 ? 'Positive' : 'Very Positive';
          return category === emotion;
        }).length
      }));

      // Enhanced topic frequency analysis
      const topicFrequency = new Map<string, { frequency: number; dates: Date[] }>();
      recentEntries.forEach(entry => {
        const topics = entry.aiAnalysis?.topics ?? [];
        topics.forEach(topic => {
          if (!topicFrequency.has(topic)) {
            topicFrequency.set(topic, { frequency: 0, dates: [] });
          }
          const topicData = topicFrequency.get(topic)!;
          topicData.frequency++;
          topicData.dates.push(new Date(entry.createdAt));
        });
      });

      const frequentThemes = Array.from(topicFrequency.entries())
        .map(([topic, data]) => ({
          topic,
          frequency: data.frequency
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 8);

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

      // Generate recommendations based on frequency patterns
      const recommendations: string[] = [];

      // Time-based recommendations
      const mostActiveHour = entryTimeDistribution
        .reduce((max, current) => current.count > max.count ? current : max);
      recommendations.push(
        `You tend to journal most frequently at ${mostActiveHour.hour}:00. This time seems to work well for your reflection practice.`
      );

      // Topic-based recommendations
      if (frequentThemes.length > 0) {
        recommendations.push(
          `Your most discussed topic is "${frequentThemes[0].topic}" appearing ${frequentThemes[0].frequency} times. Consider exploring how this theme impacts different areas of your life.`
        );
      }

      // Emotion-based recommendations
      const dominantEmotion = emotionFrequency
        .reduce((max, current) => current.count > max.count ? current : max);
      recommendations.push(
        `Your entries most frequently express ${dominantEmotion.emotion.toLowerCase()} emotions. This might reflect your overall state of mind during this period.`
      );

      res.json({
        consistency: {
          streakDays: currentStreak,
          totalEntries: recentEntries.length,
          averageEntriesPerWeek: (recentEntries.length / 4.28).toFixed(1),
          mostActiveDay,
          completionRate: (entriesByDay.size / 30) * 100,
          entryTimeDistribution
        },
        emotionalTrends: {
          dominantEmotion: Object.fromEntries(
            emotionFrequency.map(e => [e.emotion, e.count])
          ),
          emotionalStability: calculateEmotionalStability(recentEntries),
          moodProgression: calculateMoodProgression(recentEntries),
          emotionFrequency
        },
        topics: {
          frequentThemes,
          emergingTopics,
          decliningTopics,
          topicTimeline: calculateTopicTimeline(recentEntries)
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

  // Add new endpoint for comprehensive analytics
  app.get("/api/analytics/comprehensive", isAuthenticated, async (req, res) => {
    try {
      const userId = getUserId(req);
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // Fetch entries for analysis
      const recentEntries = await db.query.entries.findMany({
        where: and(
          eq(entries.userId, userId),
          gte(entries.createdAt, thirtyDaysAgo)
        ),
        orderBy: [desc(entries.createdAt)]
      });

      if (!recentEntries.length) {
        return res.json({
          featureUsage: [],
          dailyStats: [],
          emotionDistribution: [],
          topTopics: [],
          weeklyActivity: [],
          insightHighlights: [],
          timeOfDayAnalysis: [],
          wordCountTrends: [],
          topicConnections: [],
          reflectionDepth: []
        });
      }

      // Process entries by day for daily stats
      const entriesByDay = new Map<string, number>();
      recentEntries.forEach(entry => {
        const day = format(new Date(entry.createdAt), 'yyyy-MM-dd');
        entriesByDay.set(day, (entriesByDay.get(day) || 0) + 1);
      });

      // Calculate daily stats
      const dailyStats = Array.from(entriesByDay.entries()).map(([date, count]) => ({
        date,
        count
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Process emotion distribution
      const emotionCategories = ['Very Positive', 'Positive', 'Neutral', 'Negative', 'Very Negative'];
      const emotionDistribution = emotionCategories.map(emotion => ({
        emotion,
        count: recentEntries.filter(entry => {
          const sentiment = entry.aiAnalysis?.sentiment ?? 3;
          const category =
            sentiment >= 4.5 ? 'Very Positive' :
              sentiment >= 3.5 ? 'Positive' :
                sentiment >= 2.5 ? 'Neutral' :
                  sentiment >= 1.5 ? 'Negative' : 'Very Negative';
          return category === emotion;
        }).length
      }));

      // Calculate time of day analysis
      const timeOfDayAnalysis = Array.from({ length: 24 }, (_, hour) => {
        const entriesAtHour = recentEntries.filter(entry => {
          const entryHour = new Date(entry.createdAt).getHours();
          return entryHour === hour;
        });

        return {
          hour,
          entryCount: entriesAtHour.length,
          averageDuration: entriesAtHour.length ?
            entriesAtHour.reduce((acc, entry) => acc + (entry.duration || 0), 0) / entriesAtHour.length :
            0
        };
      });

      // Calculate word count trends
      const wordCountTrends = dailyStats.map(({ date }) => ({
        date,
        wordCount: recentEntries
          .filter(entry => format(new Date(entry.createdAt), 'yyyy-MM-dd') === date)
          .reduce((acc, entry) => acc + (entry.transcript?.split(/\s+/).length || 0), 0)
      }));

      // Calculate reflection depth based on AI analysis
      const calculateReflectionDepth = (entry: any) => {
        const hasEmotions = entry.aiAnalysis?.sentiment !== undefined;
        const hasTopics = Array.isArray(entry.aiAnalysis?.topics) && entry.aiAnalysis.topics.length > 0;
        const hasInsights = Array.isArray(entry.aiAnalysis?.insights) && entry.aiAnalysis.insights.length > 0;
        const wordCount = entry.transcript?.split(/\s+/).length || 0;

        let depth = 1; // Base level
        if (hasEmotions) depth += 1;
        if (hasTopics) depth += 1;
        if (hasInsights) depth += 1;
        if (wordCount > 200) depth += 1;

        return Math.min(5, depth);
      };

      const reflectionDepth = dailyStats.map(({ date }) => ({
        date,
        depth: recentEntries
          .filter(entry => format(new Date(entry.createdAt), 'yyyy-MM-dd') === date)
          .reduce((acc, entry) => Math.max(acc, calculateReflectionDepth(entry)), 1)
      }));

      // Process topics and their relationships
      const topicFrequency = new Map<string, { count: number; relatedTopics: Map<string, number> }>();
      recentEntries.forEach(entry => {
        const topics = entry.aiAnalysis?.topics || [];
        topics.forEach(topic => {
          if (!topicFrequency.has(topic)) {
            topicFrequency.set(topic, { count: 0, relatedTopics: new Map() });
          }
          const topicData = topicFrequency.get(topic)!;
          topicData.count++;

          // Track related topics (co-occurrence)
          topics.forEach(relatedTopic => {
            if (relatedTopic !== topic) {
              topicData.relatedTopics.set(
                relatedTopic,
                (topicData.relatedTopics.get(relatedTopic) || 0) + 1
              );
            }
          });
        });
      });

      // Format topic data
      const topTopics = Array.from(topicFrequency.entries())
        .map(([topic, data]) => ({
          topic,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const topicConnections = Array.from(topicFrequency.entries())
        .map(([topic, data]) => ({
          topic,
          relatedTopics: Array.from(data.relatedTopics.entries())
            .map(([name, strength]) => ({ name, strength }))
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 5)
        }))
        .slice(0, 10);

      // Extract meaningful insights
      const insightHighlights = recentEntries
        .filter(entry => entry.aiAnalysis?.insights?.length)
        .flatMap(entry => (entry.aiAnalysis?.insights || []).map(insight => ({
          date: entry.createdAt,
          insight,
          impact: calculateReflectionDepth(entry) * 2
        })))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      // Calculate weekly activity and sentiment
      const weeklyActivity = Array.from({ length: 4 }, (_, i) => {
        const weekStart = subDays(new Date(), (i + 1) * 7).toISOString();
        const weekEnd = subDays(new Date(), i * 7).toISOString();

        const weekEntries = recentEntries.filter(entry =>
          entry.createdAt >= weekStart && entry.createdAt < weekEnd
        );

        return {
          week: format(new Date(weekStart), 'MMM d'),
          journalCount: weekEntries.length,
          averageSentiment: weekEntries.length ?
            weekEntries.reduce((acc, entry) => acc + (entry.aiAnalysis?.sentiment || 3), 0) / weekEntries.length :
            0
        };
      }).reverse();

      res.json({
        featureUsage: [], // Reserved for future feature usage tracking
        dailyStats,
        emotionDistribution,
        topTopics,
        weeklyActivity,
        insightHighlights,
        timeOfDayAnalysis,
        wordCountTrends,
        topicConnections,
        reflectionDepth
      });
    } catch (error: any) {
      console.error("Error generating comprehensive analytics:", error);
      res.status(500).json({
        error: "Failed to generate analytics",
        details: error.message
      });
    }
  });

  // Helper functions with proper typing
  function calculateEmotionalStability(entries: ProcessedEntry[]): number {
    const emotions = entries
      .map(entry => entry.aiAnalysis?.sentiment ?? 3)
      .sort((a: number, b: number) => a - b);

    return emotions.length > 1
      ? 1 - Math.min(1, (emotions.reduce((sum, curr, idx, arr) => {
        if (idx === 0) return 0;
        return sum + Math.abs(curr - arr[idx - 1]);
      }, 0) / (emotions.length - 1)) / 4)
      : 1;
  }

  function calculateMoodProgression(entries: ProcessedEntry[]): Array<{ date: string; sentiment: number }> {
    return entries
      .map(entry => ({
        date: format(new Date(entry.createdAt), 'MMM d'),
        sentiment: entry.aiAnalysis?.sentiment ?? 3
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  function calculateTopicTimeline(entries: ProcessedEntry[]): Array<{ date: string; topics: Array<{ name: string; count: number }> }> {
    const timelineDays = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(), i), 'MMM d')
    );

    return timelineDays.map(date => {
      const dayEntries = entries.filter(entry =>
        format(new Date(entry.createdAt), 'MMM d') === date
      );

      const topicCounts = new Map<string, number>();
      dayEntries.forEach(entry => {
        const topics = entry.aiAnalysis?.topics || [];
        topics.forEach(topic => {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        });
      });

      return {
        date,
        topics: Array.from(topicCounts.entries()).map(([name, count]) => ({ name, count }))
      };
    });
  }


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