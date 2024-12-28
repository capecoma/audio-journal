import type { Request, Response, NextFunction } from "express";

export function setupSecurity(req: Request, res: Response, next: NextFunction) {
  // Set security headers with updated CSP and OAuth compatibility
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.googleusercontent.com",
      "style-src 'self' 'unsafe-inline' https://accounts.google.com https://*.googleusercontent.com",
      "img-src 'self' data: https: https://accounts.google.com https://*.googleusercontent.com https://*.google.com",
      "connect-src 'self' https://accounts.google.com https://*.googleusercontent.com",
      "frame-src 'self' https://accounts.google.com https://*.google.com",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
      "object-src 'none'"
    ].join("; ")
  );

  // Set other security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Handle CORS for OAuth
  if (req.headers.origin) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  next();
}