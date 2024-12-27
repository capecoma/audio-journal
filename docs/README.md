# Audio Journal - Voice-Powered Personal Storytelling

## Overview
Audio Journal is a modern web application that enables personal storytelling through voice processing and insights generation. Users can record audio narratives, which are automatically transcribed and analyzed to provide daily insights and emotional patterns.

## Quick Start

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database
- OpenAI API key for transcription and analysis

### Environment Setup
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start the application
npm run dev
```

### Core Features
- 🎙️ Voice Recording & Transcription
- 📊 Daily Insights Generation
- 🔍 Sentiment Analysis
- 🏷️ Automatic Topic Tagging
- 📱 Responsive Design

## Project Structure
```
/audio-journal
  ├── /client            # Frontend React application
  ├── /server            # Backend Express server
  ├── /db                # Database schema and utilities
  └── /docs             # Project documentation
```

## Contributing
Please read our [Contributing Guidelines](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
