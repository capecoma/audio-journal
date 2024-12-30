# Audio Journal App Technical Specification

## Project Overview
An audio journaling application that records voice entries, transcribes them, generates daily summaries, and presents them in a dashboard interface.

## Technical Stack
- Frontend: Next.js (React)
- Backend: Node.js/Express
- Database: PostgreSQL
- Authentication: Auth0
- Cloud Storage: AWS S3
- AI Services: OpenAI Whisper API (transcription), GPT API (summaries)

## Project Structure
```
/audio-journal
  ├── /pages
  │   ├── /api          # API routes
  │   ├── /auth         # Auth pages
  │   ├── /dashboard    # Main dashboard
  │   └── /journal      # Recording interface
  ├── /components
  │   ├── /audio        # Audio recording components
  │   ├── /common       # Shared components
  │   └── /dashboard    # Dashboard components
  ├── /lib
  │   ├── /db           # Database utilities
  │   ├── /ai           # AI service integrations
  │   └── /storage      # Storage utilities
  └── /public           # Static assets
```

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entries table
CREATE TABLE entries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    audio_url TEXT NOT NULL,
    transcript TEXT,
    duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Summaries table
CREATE TABLE summaries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    date DATE NOT NULL,
    highlight_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Authentication
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/user
```

### Journal Entries
```
POST /api/entries/record      # Start recording
POST /api/entries/upload      # Upload audio file
GET  /api/entries            # Get user entries
GET  /api/entries/:id        # Get specific entry
```

### Summaries
```
GET  /api/summaries/daily    # Get daily summaries
GET  /api/summaries/:date    # Get specific date summary
```

## Core Features Implementation

### 1. Audio Recording
```javascript
// components/audio/Recorder.js
import { useState, useRef } from 'react';

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    mediaRecorder.current.ondataavailable = (event) => {
      audioChunks.current.push(event.data);
    };
    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current.stop();
    setIsRecording(false);
    // Handle upload logic
  };

  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
    </div>
  );
};
```

### 2. Transcription Service
```javascript
// lib/ai/transcription.js
import { Configuration, OpenAIApi } from 'openai';

export async function transcribeAudio(audioFile) {
  const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  }));

  const transcript = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
  });

  return transcript.text;
}
```

### 3. Summary Generation
```javascript
// lib/ai/summary.js
export async function generateDailySummary(transcripts) {
  const openai = new OpenAIApi(new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  }));

  const prompt = `Summarize these journal entries into key highlights:\n${transcripts.join('\n')}`;
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
  });

  return completion.choices[0].message.content;
}
```

## Environment Variables
```
# Auth0
AUTH0_SECRET='your-auth0-secret'
AUTH0_BASE_URL='your-auth0-base-url'
AUTH0_ISSUER_BASE_URL='your-auth0-issuer'
AUTH0_CLIENT_ID='your-auth0-client-id'
AUTH0_CLIENT_SECRET='your-auth0-client-secret'

# AWS
AWS_ACCESS_KEY_ID='your-aws-access-key'
AWS_SECRET_ACCESS_KEY='your-aws-secret-key'
AWS_REGION='your-aws-region'
S3_BUCKET_NAME='your-bucket-name'

# OpenAI
OPENAI_API_KEY='your-openai-api-key'

# Database
DATABASE_URL='your-postgres-connection-string'
```

## Implementation Phases

### Phase 1 - Basic Infrastructure (Week 1)
- Set up Next.js project in Replit
- Initialize database and create schemas
- Implement Auth0 authentication
- Configure AWS S3 for audio storage

### Phase 2 - Core Features (Week 2)
- Build audio recording component
- Implement file upload to S3
- Create transcription service
- Build basic transcript viewer

### Phase 3 - Summary & Dashboard (Week 3)
- Implement summary generation
- Create dashboard layout
- Build daily highlights view
- Add transcript search/filter

### Phase 4 - Polish & Optimization (Week 4)
- Add loading states
- Implement error handling
- Add caching
- Optimize mobile responsiveness

## Testing Strategy
- Unit tests for utility functions
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance testing for audio handling

## Deployment
- Deploy frontend and API to Replit
- Set up PostgreSQL database
- Configure S3 bucket
- Set up monitoring and logging

## Security Considerations
- Implement rate limiting
- Secure file uploads
- Sanitize user input
- Encrypt sensitive data
- Regular security audits

## Performance Optimization
- Implement caching for transcripts
- Optimize audio file handling
- Lazy load components
- Use CDN for static assets
