import { useState } from 'react';
import { FileText } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  onTranscriptClick: () => void;
  transcript?: string;
}

export default function AudioPlayer({ audioUrl, duration = 0, onTranscriptClick, transcript }: AudioPlayerProps) {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const formatDuration = (timeInSeconds: number) => {
    if (timeInSeconds < 60) {
      return `${Math.round(timeInSeconds)}s`;
    }
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.round(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center flex-1">
        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-red-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="ml-2 text-xs text-muted-foreground min-w-[3ch]">
          {formatDuration(currentTime)}
        </span>
      </div>
      
      {transcript && (
        <button
          onClick={onTranscriptClick}
          className="p-2 hover:bg-secondary rounded-full"
          aria-label="View transcript"
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}