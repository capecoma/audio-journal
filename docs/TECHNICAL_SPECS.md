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

CREATE TABLE summaries (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  highlightText TEXT NOT NULL,
  sentimentScore INTEGER,
  topicAnalysis TEXT[],
  keyInsights TEXT[],
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);