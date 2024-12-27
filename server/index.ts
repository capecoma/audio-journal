import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { setupSecurity } from "./middleware/security";

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

// Add security middleware before any routes
app.use(setupSecurity);

// Set up authentication
try {
  setupAuth(app);
} catch (error) {
  console.error('Failed to setup authentication:', error);
  // Continue app setup even if auth fails, so we can see debug endpoints
}

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
    const server = registerRoutes(app);

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`serving on port ${PORT}`);
    });
  } catch (error: unknown) {
    console.error("Failed to start server:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();