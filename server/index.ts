import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { setupSecurity } from "./middleware/security";
import { db } from "@db";
import { users } from "@db/schema";

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Set trust proxy first
    app.set("trust proxy", true);

    // Add security middleware (includes CORS)
    app.use(setupSecurity);

    // Verify database connection
    try {
      log('Verifying database connection...');
      await db.select().from(users).limit(1);
      log('Database connection verified');
    } catch (dbError) {
      log('Database connection error:', dbError);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }

    // Setup auth (includes session handling)
    setupAuth(app);

    // Create HTTP server
    const server = registerRoutes(app);

    // Setup Vite in development
    if (process.env.NODE_ENV !== 'production') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Start server
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      const replitUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      log(`Server started on port ${PORT}`);
      log(`External URL: ${replitUrl}`);
      log(`Environment: ${app.get("env")}`);
      log(`Auth callback URL: ${replitUrl}/auth/google/callback`); //Re-added from original, likely needed for auth callback.
    });

    // Handle server errors (Retained from original)
    server.on('error', (error: any) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
})();