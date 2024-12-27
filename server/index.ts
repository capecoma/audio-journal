import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./middleware/auth";
import { setupSecurity } from "./middleware/security";
import { createServer } from "http";
import { AddressInfo } from "net";

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add security middleware before any routes
app.use(setupSecurity);

// Set up authentication
setupAuth(app);

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
      log(logLine);
    }
  });

  next();
});

// Function to try binding to a port
async function tryBindPort(server: ReturnType<typeof createServer>, port: number, maxRetries = 1): Promise<void> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (error: NodeJS.ErrnoException) => {
          server.removeListener('error', onError);
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${port} is already in use. Retrying...`));
          } else {
            reject(error);
          }
        };

        server.once('error', onError);
        server.listen(port, "0.0.0.0", () => {
          server.removeListener('error', onError);
          const address = server.address() as AddressInfo;
          log(`Server running on http://0.0.0.0:${address.port}`);
          resolve();
        });
      });
      return;
    } catch (err) {
      const error = err as Error;
      console.error(`Attempt ${retries + 1}/${maxRetries} failed:`, error.message);
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
  }
  throw new Error(`Failed to bind to port ${port} after ${maxRetries} attempts`);
}

let serverInstance: ReturnType<typeof createServer> | null = null;

// Graceful shutdown handler
function setupGracefulShutdown(server: ReturnType<typeof createServer>) {
  const shutdown = () => {
    console.log('Received termination signal. Performing graceful shutdown...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

(async () => {
  try {
    const server = registerRoutes(app);
    serverInstance = server;

    // Set up graceful shutdown handlers
    setupGracefulShutdown(server);

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = 5000;
    await tryBindPort(server, PORT, 2); // Try twice with a delay between attempts
  } catch (error: unknown) {
    console.error("Failed to start server:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();

// Export for testing
export { serverInstance };