import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { DatabaseBackup } from "./backup";

// Verify environment variables
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY must be set");
}

// Initialize database backup system
const backupConfig = {
  maxBackups: 7, // Keep a week's worth of backups
  backupDir: './backups'
};
const dbBackup = new DatabaseBackup(backupConfig);

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
      
      // Schedule daily backups at midnight
      const scheduleBackup = () => {
        const now = new Date();
        const night = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1, // tomorrow
          0, // midnight
          0, // 0 minutes
          0  // 0 seconds
        );
        const timeToMidnight = night.getTime() - now.getTime();
        
        // Schedule next backup
        setTimeout(async () => {
          try {
            log('Starting scheduled database backup...');
            const backupPath = await dbBackup.createBackup();
            log(`Backup created successfully at ${backupPath}`);
          } catch (error) {
            console.error('Scheduled backup failed:', error);
          }
          // Schedule next backup after completion
          scheduleBackup();
        }, timeToMidnight);
      };
      
      // Start the backup schedule
      scheduleBackup();
      
      // Perform initial backup
      dbBackup.createBackup()
        .then(backupPath => log(`Initial backup created at ${backupPath}`))
        .catch(error => console.error('Initial backup failed:', error));
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
