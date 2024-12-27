import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { transcribeAudio, generateTags, generateSummary, analyzeContent } from "./ai";
import { format, startOfDay, endOfDay } from "date-fns";
import { db } from "@db";
import { entries, summaries } from "@db/schema";
import { eq, desc, sql, and, between } from "drizzle-orm";
import type { Entry, Summary } from "@db/schema";

const upload = multer({ storage: multer.memoryStorage() });

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: Request, res: Response, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
};

export function registerRoutes(app: Express): Server {
  // Auth status endpoint
  app.get("/api/auth/status", (req: Request, res: Response) => {
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user
    });
  });

  // Health check endpoint (public)
  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      await db.execute(sql`SELECT 1 as check`);
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

  // Protected routes
  app.get("/api/entries", ensureAuthenticated, async (_req: Request, res: Response) => {
    try {
      console.log('Attempting to fetch entries from database...');
      const allEntries = await db.query.entries.findMany({
        orderBy: [desc(entries.createdAt)]
      });
      console.log(`Successfully fetched ${allEntries.length} entries`);
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

  app.get("/api/summaries/daily", ensureAuthenticated, async (_req: Request, res: Response) => {
    try {
      console.log('Attempting to fetch daily summaries...');
      const allSummaries = await db.query.summaries.findMany({
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

  app.post("/api/entries/upload", ensureAuthenticated, upload.single("audio"), async (req: Request, res: Response) => {
    try {
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

      const currentDate = new Date();

      // Insert new entry
      const [entry] = await db.insert(entries).values({
        audioUrl,
        transcript,
        tags,
        duration: Math.round((audioBuffer.length * 8) / 32000),
        isProcessed: true,
        createdAt: sql`CURRENT_TIMESTAMP`,
        aiAnalysis: JSON.stringify({
          sentiment: aiAnalysis.sentiment,
          topics: aiAnalysis.topics,
          insights: aiAnalysis.insights
        })
      }).returning();

      // Get all entries for today to generate a summary
      const todayStart = startOfDay(currentDate);
      const todayEnd = endOfDay(currentDate);

      console.log('Fetching today\'s entries between:', todayStart, 'and', todayEnd);

      const todayEntries = await db.select()
        .from(entries)
        .where(
          between(
            entries.createdAt,
            sql`${todayStart.toISOString()}::timestamp`,
            sql`${todayEnd.toISOString()}::timestamp`
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
                const analysis = typeof e.aiAnalysis === 'string' 
                  ? JSON.parse(e.aiAnalysis)
                  : e.aiAnalysis;
                return acc + (analysis?.sentiment || 0);
              }, 0) / entriesWithAnalysis.length
            )
          : null;

        const allTopics = entriesWithAnalysis.flatMap(e => {
          const analysis = typeof e.aiAnalysis === 'string'
            ? JSON.parse(e.aiAnalysis)
            : e.aiAnalysis;
          return Array.isArray(analysis?.topics) ? analysis.topics : [];
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
            between(
              summaries.date,
              sql`${todayStart.toISOString()}::timestamp`,
              sql`${todayEnd.toISOString()}::timestamp`
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
              date: sql`${todayStart.toISOString()}::timestamp`,
              highlightText: summaryText,
              createdAt: sql`CURRENT_TIMESTAMP`,
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

  const httpServer = createServer(app);
  return httpServer;
}