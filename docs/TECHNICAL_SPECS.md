CREATE TABLE entries (
  id SERIAL PRIMARY KEY,
  audioUrl TEXT NOT NULL,
  transcript TEXT,
  tags TEXT[],
  duration INTEGER,
  isProcessed BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  aiAnalysis JSONB
);