import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { transcribeAudio, generateTags, generateSummary, analyzeContent } from "./ai";
import { format, startOfDay } from "date-fns";
import { db, checkDatabaseConnection } from "@db";
import { entries, summaries } from "@db/schema";
import { eq, desc } from "drizzle-orm";

const upload = multer({ storage: multer.memoryStorage() });

export function registerRoutes(app: Express): Server {
  // Add health check endpoint
  app.get("/api/health", async (_req, res) => {
    const isConnected = await checkDatabaseConnection();
    res.json({ status: isConnected ? "healthy" : "unhealthy" });
  });

  // Basic entries route
  app.get("/api/entries", async (_req, res) => {
    try {
      console.log('Attempting to fetch entries from database...');
      const allEntries = await db.query.entries.findMany({
        orderBy: [desc(entries.createdAt)]
      });
      console.log(`Successfully fetched ${allEntries.length} entries`);
      res.json(allEntries);
    } catch (error) {
      console.error("Error fetching entries:", error);
      res.status(500).json({ error: "Failed to fetch entries", details: error.message });
    }
  });

  // Get daily summaries route
  app.get("/api/summaries/daily", async (_req, res) => {
    try {
      console.log('Attempting to fetch daily summaries...');
      const allSummaries = await db.query.summaries.findMany({
        orderBy: [desc(summaries.date)]
      });
      console.log(`Successfully fetched ${allSummaries.length} summaries`);
      res.json(allSummaries);
    } catch (error) {
      console.error("Error fetching summaries:", error);
      res.status(500).json({ error: "Failed to fetch summaries", details: error.message });
    }
  });

  // Upload and transcribe route
  app.post("/api/entries/upload", upload.single("audio"), async (req, res) => {
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
        createdAt: currentDate,
        aiAnalysis: {
          sentiment: aiAnalysis.sentiment,
          topics: aiAnalysis.topics,
          insights: aiAnalysis.insights
        }
      }).returning();

      // Get all entries for today to generate a summary
      const todayStart = startOfDay(currentDate);
      const todayEntries = await db.query.entries.findMany({
        where: eq(entries.createdAt, todayStart)
      });

      if (todayEntries.length > 0) {
        const transcripts = todayEntries
          .filter(e => e.transcript)
          .map(e => e.transcript as string);

        console.log('Generating daily summary...');
        const summaryText = await generateSummary(transcripts);
        console.log('Summary generated:', summaryText);

        // Calculate average sentiment and collect all topics
        const entriesWithAnalysis = todayEntries.filter(e => e.aiAnalysis);
        const averageSentiment = Math.round(
          entriesWithAnalysis.reduce((acc, e) => acc + (e.aiAnalysis?.sentiment || 0), 0) /
          entriesWithAnalysis.length
        );

        const allTopics = entriesWithAnalysis.flatMap(e => e.aiAnalysis?.topics || []);
        const topicFrequency = allTopics.reduce((acc, topic) => {
          acc[topic] = (acc[topic] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const topTopics = Object.entries(topicFrequency)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([topic]) => topic);

        // Update or create today's summary
        const existingSummary = await db.query.summaries.findFirst({
          where: eq(summaries.date, todayStart)
        });

        if (existingSummary) {
          await db.update(summaries)
            .set({
              highlightText: summaryText,
              sentimentScore: averageSentiment,
              topicAnalysis: topTopics,
              keyInsights: entriesWithAnalysis[0]?.aiAnalysis?.insights || []
            })
            .where(eq(summaries.id, existingSummary.id));
        } else {
          await db.insert(summaries).values({
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

  const httpServer = createServer(app);
  return httpServer;
}