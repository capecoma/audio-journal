import NodeCache from "node-cache";

// Cache configuration - store items for 1 hour
const cache = new NodeCache({
  stdTTL: 3600, // 1 hour in seconds
  checkperiod: 120, // Check for expired entries every 2 minutes
});

export const cacheMiddleware = {
  // Get cached data
  get: <T>(key: string): T | undefined => {
    return cache.get<T>(key);
  },

  // Set cache data
  set: <T>(key: string, data: T, ttl?: number): boolean => {
    return cache.set(key, data, ttl);
  },

  // Delete cached data
  del: (key: string): number => {
    return cache.del(key);
  },

  // Generate cache key for transcriptions
  getTranscriptionKey: (audioHash: string): string => {
    return `transcription:${audioHash}`;
  },

  // Generate cache key for tags
  getTagsKey: (transcript: string): string => {
    return `tags:${transcript.substring(0, 32)}`;
  },

  // Generate cache key for summaries
  getSummaryKey: (date: string, userId: number): string => {
    return `summary:${userId}:${date}`;
  }
};
