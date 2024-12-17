import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

// Verify environment variables
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const app = express();

// Configure CORS and security headers for Replit's environment
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Add security headers to allow iframe embedding
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://*.replit.dev https://*.replit.com");
  next();
});

// Body parsing middleware - must be before auth setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware for API requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log('Incoming request:', {
      method: req.method,
      path: req.path,
      contentType: req.headers['content-type'],
      body: req.body,
      query: req.query,
      params: req.params
    });
  }
  next();
});

// Request logging middleware for debugging
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log('Request:', {
      method: req.method,
      path: req.path,
      body: req.body,
      headers: req.headers
    });
  }
  next();
});

// Security middlewares
import { apiLimiter, securityHeaders } from './middleware/security';
app.use(securityHeaders);
app.use('/api', apiLimiter);

// Request logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log('Request body:', req.body);
  }
  next();
});

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

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = (err as any).status || (err as any).statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

(async () => {
  try {
    const server = registerRoutes(app);

    // Setup Vite or serve static files
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();