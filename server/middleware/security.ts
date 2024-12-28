import type { Request, Response, NextFunction } from "express";

export function setupSecurity(req: Request, res: Response, next: NextFunction) {
  // Get Replit URL for CSP configuration
  const replitUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;

  // Set security headers with updated CSP
  const cspDirectives = [
    // Default restrictive policy
    "default-src 'self'",
    // Allow scripts from Google and inline scripts (needed for OAuth)
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.googleusercontent.com https://*.replit.com",
    // Allow styles from Google and inline styles
    "style-src 'self' 'unsafe-inline' https://accounts.google.com https://*.googleusercontent.com https://*.replit.com",
    // Allow images from Google and data URIs
    "img-src 'self' data: https: https://accounts.google.com https://*.googleusercontent.com https://*.google.com https://*.replit.com",
    // Allow connections to our API and Google
    `connect-src 'self' ${replitUrl} https://accounts.google.com https://*.googleusercontent.com https://*.replit.com`,
    // Allow frames for Google OAuth and Replit
    "frame-src 'self' https://accounts.google.com https://*.google.com https://*.replit.com",
    // Remove frame-ancestors restriction to allow Replit webview
    "frame-ancestors 'self' https://*.replit.com",
    // Restrict base URI
    "base-uri 'self'",
    // Allow forms to submit to Google
    "form-action 'self' https://accounts.google.com",
    // Disable object execution
    "object-src 'none'",
  ];

  res.setHeader("Content-Security-Policy", cspDirectives.join("; "));

  // Set other security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "ALLOW-FROM https://*.replit.com");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Handle CORS for Replit webview and external access
  const allowedOrigins = [
    replitUrl,
    'https://accounts.google.com',
    'https://google.com',
    'https://*.replit.com'
  ];

  const origin = req.headers.origin;
  if (origin) {
    const isAllowed = allowedOrigins.some(allowed => 
      origin === allowed || (allowed.includes('*') && origin.endsWith(allowed.replace('*', '')))
    );

    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}