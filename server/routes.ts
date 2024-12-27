import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { transcribeAudio, generateTags, generateSummary } from "./ai";
import { format, startOfDay, subDays } from "date-fns";

const upload = multer({ storage: multer.memoryStorage() });
const inMemoryEntries: Array<{
  id: number;
  audioUrl: string;
  transcript?: string;
  tags?: string[];
  duration: number;
  isProcessed: boolean;
  createdAt: string;
}> = [];

const inMemorySummaries: Array<{
  id: number;
  date: string;
  highlightText: string;
  createdAt: string;
}> = [];

// Initialize with some test entries only if there are no existing entries
const initializeTestEntries = async () => {
  // Only add test data if both entries and summaries are empty
  if (inMemoryEntries.length === 0 && inMemorySummaries.length === 0) {
    console.log('No existing entries found, initializing with test data...');

    // Create entries for the last 3 days
    for (let i = 2; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const sampleEntry = {
        id: Date.now() - i * 86400000, // Unique ID based on date
        audioUrl: "data:audio/webm;base64,test",
        transcript: `Test entry for ${format(date, 'PPP')}`,
        tags: ["test"],
        duration: 30,
        isProcessed: true,
        createdAt: date.toISOString(),
      };
      inMemoryEntries.push(sampleEntry);

      // Create a summary for each day
      const summary = {
        id: Date.now() - i * 86400000,
        date: startOfDay(date).toISOString(),
        highlightText: `Test summary for ${format(date, 'PPP')}`,
        createdAt: date.toISOString(),
      };
      inMemorySummaries.push(summary);
    }
    console.log('Test data initialized with', inMemoryEntries.length, 'entries and', inMemorySummaries.length, 'summaries');
  } else {
    console.log('Existing entries found, skipping test data initialization');
    console.log('Current entries:', inMemoryEntries.length, 'Current summaries:', inMemorySummaries.length);
  }
};

export function registerRoutes(app: Express): Server {
  // Initialize test data only if needed
  initializeTestEntries();

  // Basic entries route
  app.get("/api/entries", (_req, res) => {
    // Sort entries by creation date, newest first
    const sortedEntries = [...inMemoryEntries].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(sortedEntries);
  });

  // Get daily summaries route
  app.get("/api/summaries/daily", (_req, res) => {
    const sortedSummaries = [...inMemorySummaries].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    res.json(sortedSummaries);
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

      const currentDate = new Date();
      const entry = {
        id: Date.now(),
        audioUrl,
        transcript,
        tags,
        duration: Math.round((audioBuffer.length * 8) / 32000),
        isProcessed: true,
        createdAt: currentDate.toISOString(),
      };

      inMemoryEntries.push(entry);

      // Get all entries for today and generate a summary
      const todayStart = startOfDay(currentDate);
      const todayEntries = inMemoryEntries.filter(e =>
        startOfDay(new Date(e.createdAt)).getTime() === todayStart.getTime()
      );

      if (todayEntries.length > 0) {
        const transcripts = todayEntries
          .filter(e => e.transcript)
          .map(e => e.transcript as string);

        console.log('Generating daily summary...');
        const summaryText = await generateSummary(transcripts);
        console.log('Summary generated:', summaryText);

        // Update or create today's summary
        const existingSummaryIndex = inMemorySummaries.findIndex(s =>
          startOfDay(new Date(s.date)).getTime() === todayStart.getTime()
        );

        const summary = {
          id: Date.now(),
          date: todayStart.toISOString(),
          highlightText: summaryText,
          createdAt: new Date().toISOString(),
        };

        if (existingSummaryIndex >= 0) {
          inMemorySummaries[existingSummaryIndex] = summary;
        } else {
          inMemorySummaries.push(summary);
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