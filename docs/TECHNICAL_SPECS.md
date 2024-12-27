# Technical Specifications

## Architecture Overview

### Frontend
- **Framework**: React with TypeScript
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **UI Components**: ShadcnUI + Tailwind CSS
- **Audio Processing**: Web Audio API
- **Data Visualization**: Recharts

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Database**: PostgreSQL with Drizzle ORM
- **API Services**: OpenAI (Whisper for transcription, GPT for analysis)

## Database Schema

### Entries Table
```sql
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
```

### Summaries Table
```sql
CREATE TABLE summaries (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  highlightText TEXT NOT NULL,
  sentimentScore INTEGER,
  topicAnalysis TEXT[],
  keyInsights TEXT[],
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Journal Entries
- `GET /api/entries` - Fetch all journal entries
- `POST /api/entries/upload` - Upload and process new audio entry
- `GET /api/summaries/daily` - Fetch daily summaries

## Authentication & Security
- Session-based authentication using express-session
- CSRF protection
- Rate limiting on API endpoints
- Secure audio file handling

## Performance Optimizations
- Efficient audio processing using Web Audio API
- Optimized database queries with proper indexing
- Frontend caching with React Query
- Lazy loading of components

## Error Handling
- Comprehensive error boundaries in React components
- Structured API error responses
- Logging system for debugging
- Graceful fallbacks for failed AI operations

## Development Tooling
- TypeScript for type safety
- ESLint and Prettier for code formatting
- Vite for fast development experience
- Drizzle for type-safe database operations

## Deployment
- Hosted on Replit
- PostgreSQL database on Neon
- Environment variables management
- Build and deployment automation
