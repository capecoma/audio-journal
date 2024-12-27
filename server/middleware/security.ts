import type { Request, Response, NextFunction } from "express";

export function setupSecurity(req: Request, res: Response, next: NextFunction) {
  // Set security headers with updated CSP
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline' https://accounts.google.com",
      "img-src 'self' data: https: https://accounts.google.com",
      "connect-src 'self' https://accounts.google.com",
      "frame-src 'self' https://accounts.google.com",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
    ].join("; ")
  );

  // Set other security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  next();
}