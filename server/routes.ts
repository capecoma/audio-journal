import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { transcribeAudio, generateTags } from "./ai";

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

// Initialize with some test entries to persist between restarts
const initializeTestEntries = () => {
  if (inMemoryEntries.length === 0) {
    const sampleEntry = {
      id: Date.now(),
      audioUrl: "data:audio/webm;base64,test",
      transcript: "This is a test journal entry to ensure persistence.",
      tags: ["test", "initialization"],
      duration: 60,
      isProcessed: true,
      createdAt: new Date().toISOString(),
    };
    inMemoryEntries.push(sampleEntry);
  }
};

export function registerRoutes(app: Express): Server {
  // Clear route handler cache on startup
  app._router = undefined;

  // Initialize test data
  initializeTestEntries();

  // Basic entries route
  app.get("/api/entries", (_req, res) => {
    // Sort entries by creation date, newest first
    const sortedEntries = [...inMemoryEntries].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(sortedEntries);
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

      const entry = {
        id: Date.now(),
        audioUrl,
        transcript,
        tags,
        duration: Math.round((audioBuffer.length * 8) / 32000), // Simple duration calculation
        isProcessed: true,
        createdAt: new Date().toISOString(),
      };

      inMemoryEntries.push(entry);
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