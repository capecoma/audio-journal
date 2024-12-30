import { Request, Response, NextFunction } from 'express';

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send('Not authenticated');
}

export function getUserId(req: Request): number {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user.id;
}
