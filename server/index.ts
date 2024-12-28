import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { setupSecurity } from "./middleware/security";
import { db } from "@db";
import { users } from "@db/schema";

const app = express();
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
    // Verify database connection before setting up auth
    try {
      console.log('Verifying database connection...');
      await db.select().from(users).limit(1).execute();
      console.log('Database connection verified successfully');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      process.exit(1);
    }

    // Trust proxy is required for secure cookies and proper client IP detection
    app.set("trust proxy", true);

    // Add security middleware first (includes CORS)
    app.use(setupSecurity);

    // Set up authentication (includes session setup)
    try {
      setupAuth(app);
      log('Authentication setup completed successfully');
    } catch (error) {
      console.error('Failed to setup authentication:', error);
      process.exit(1); // Exit if auth setup fails as it's critical
    }

    // Register routes and create HTTP server
    const server = registerRoutes(app);

    // Error handling middleware should be after routes
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Setup Vite or serve static files based on environment
    if (app.get("env") === "development") {
      await setupVite(app, server);
      log('Vite middleware setup completed');
    } else {
      serveStatic(app);
      log('Static file serving setup completed');
    }

    // Start the server with detailed logging
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      const replitUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      log(`Server is running on port ${PORT}`);
      log(`External URL: ${replitUrl}`);
      log(`Environment: ${app.get("env")}`);
      log(`Auth callback URL: ${replitUrl}/auth/google/callback`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });

  } catch (error: unknown) {
    console.error("Failed to start server:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();