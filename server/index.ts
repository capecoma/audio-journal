import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { initDb, getDb } from "@db";

const app = express();

// Enhanced error handling interface
interface AppError extends Error {
  status?: number;
  statusCode?: number;
  details?: any;
}

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced request logging with error tracking
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Capture response data
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log on request completion
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch (err) {
          logLine += ` :: [Response not serializable]`;
        }
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// Initialize application
async function startServer() {
  try {
    // Initialize database first
    await initDb();
    log("Database initialized successfully");

    // Verify database connection
    const db = getDb();
    await db.select().from(users).limit(1);
    log("Database connection verified");

    // Setup authentication after database is ready
    setupAuth(app);

    // Register routes
    const server = registerRoutes(app);

    // Enhanced error handling middleware
    app.use((err: AppError, req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const errorResponse = {
        message: err.message || "Internal Server Error",
        ...(process.env.NODE_ENV === "development" && {
          stack: err.stack,
          details: err.details
        })
      };

      // Log error details
      console.error(`Error [${status}]:`, {
        message: err.message,
        path: req.path,
        method: req.method,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
      });

      res.status(status).json(errorResponse);
    });

    // Setup Vite for development or serve static files for production
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const port = Number(process.env.PORT || 5000);
    server.listen(port, "0.0.0.0", () => {
      log(`Server running on http://0.0.0.0:${port}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`${signal} signal received: closing HTTP server`);
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error("Fatal server error:", error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});