import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { transcribeAudio, generateTags, generateSummary, analyzeContent } from "./ai";
import { format, startOfDay, endOfDay } from "date-fns";
import { db } from "@db";
import { entries, summaries } from "@db/schema";
import { eq, desc, sql, between } from "drizzle-orm";
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
  // Health check endpoint (public)
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "healthy" });
  });

  // Add OAuth configuration check endpoint
  app.get("/api/auth/debug", (_req: Request, res: Response) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    // Safe way to check credential format without exposing values
    res.json({
      oauth: {
        clientId: clientId ? {
          length: clientId.length,
          hasLeadingSpace: clientId.startsWith(' '),
          hasTrailingSpace: clientId.endsWith(' '),
          includesRequiredDomain: clientId.includes('.apps.googleusercontent.com'),
          format: clientId.trim() === clientId ? 'clean' : 'has whitespace',
          preview: clientId.length > 20 ? 
            `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 10)}` : 
            'too short'
        } : 'not set',
        clientSecret: clientSecret ? {
          length: clientSecret.length,
          hasWhitespace: /\s/.test(clientSecret),
        } : 'not set',
        callbackUrl: process.env.NODE_ENV === "production"
          ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/google/callback`
          : "http://localhost:5000/auth/google/callback"
      }
    });
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}