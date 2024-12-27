import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { setupSecurity } from "./middleware/security";
import { db } from "@db";
import { users } from "@db/schema";

// Debug OAuth configuration before app setup
function debugCredentials() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    console.log('OAuth Configuration Debug:', {
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        REPL_SLUG: process.env.REPL_SLUG,
        REPL_OWNER: process.env.REPL_OWNER,
      },
      clientId: {
        present: !!clientId,
        length: clientId.length,
        format: {
          hasSpaces: /\s/.test(clientId),
          startsWithNumbers: /^\d/.test(clientId),
          endsWithGoogleusercontent: clientId.toLowerCase().includes('googleusercontent.com'),
          hasAppsPrefix: clientId.includes('apps.'),
          sample: clientId ? `${clientId.substring(0, 8)}...${clientId.substring(Math.max(0, clientId.length - 20))}` : 'not present'
        }
      },
      clientSecret: {
        present: !!clientSecret,
        length: clientSecret.length,
        format: {
          hasSpaces: /\s/.test(clientSecret),
          prefix: clientSecret ? `${clientSecret.substring(0, 4)}...` : 'not present'
        }
      },
      callbackUrl: process.env.NODE_ENV === "production"
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/google/callback`
        : "http://localhost:5000/auth/google/callback"
    });
  } catch (error) {
    console.error('Error while debugging OAuth configuration:', error);
  }
}

// Debug OAuth configuration before app setup
debugCredentials();

const app = express();

// Basic middleware
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
      const result = await db.select().from(users).execute();
      console.log('Database connection verified successfully');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      process.exit(1);
    }

    // Add security middleware first
    app.use(setupSecurity);

    // Set up authentication (includes session setup)
    try {
      setupAuth(app);
      log('Authentication setup completed successfully');
    } catch (error) {
      console.error('Failed to setup authentication:', error);
      process.exit(1); // Exit if auth setup fails as it's critical
    }

    // Health check endpoint
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    const PORT = Number(process.env.PORT || 5000);
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

    // Start the server with detailed logging and error handling
    const httpServer = server.listen(PORT, "0.0.0.0", () => {
      log(`Server is running on port ${PORT}`);
      log(`Environment: ${app.get("env")}`);
      log(`Auth callback URL: ${process.env.NODE_ENV === "production" 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/google/callback`
        : "http://localhost:5000/auth/google/callback"}`);
    });

    // Handle server errors
    httpServer.on('error', (error: any) => {
      console.error('Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });

    // Handle process termination
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      httpServer.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error: unknown) {
    console.error("Failed to start server:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();