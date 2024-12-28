import type { Request, Response, NextFunction } from "express";

export function setupSecurity(req: Request, res: Response, next: NextFunction) {
  // Get Replit URL for CSP configuration
  const replitUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

  // Set security headers with updated CSP for Replit
  const cspDirectives = [
    // Default restrictive policy
    "default-src 'self'",
    // Allow scripts from necessary sources including Replit
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.googleusercontent.com https://*.replit.com",
    // Allow styles from necessary sources including Replit
    "style-src 'self' 'unsafe-inline' https://accounts.google.com https://*.googleusercontent.com https://*.replit.com",
    // Allow images from necessary sources including Replit
    "img-src 'self' data: https: https://accounts.google.com https://*.googleusercontent.com https://*.google.com https://*.replit.com",
    // Allow connections to necessary sources including Replit
    `connect-src 'self' ${replitUrl} https://accounts.google.com https://*.googleusercontent.com https://*.replit.com wss://*.replit.com`,
    // Allow frames for OAuth and Replit
    "frame-src 'self' https://accounts.google.com https://*.google.com https://*.replit.com",
    // Allow frame-ancestors for Replit webview
    "frame-ancestors *",
    // Basic security directives
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "object-src 'none'"
  ];

  res.setHeader("Content-Security-Policy", cspDirectives.join("; "));

  // Set other security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Allow framing from Replit domains
  res.removeHeader("X-Frame-Options");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Handle CORS
  const allowedOrigins = [
    replitUrl,
    'https://accounts.google.com',
    'https://google.com',
    'https://*.replit.com',
    'https://replit.com'
  ];

  const origin = req.headers.origin;
  if (origin) {
    // Allow any Replit domain
    if (origin.endsWith('.replit.com') || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}