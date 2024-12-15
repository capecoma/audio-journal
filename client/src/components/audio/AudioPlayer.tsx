import { useState, useRef, useEffect } from 'react';
import { FileText, Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  onPlay: () => void;
  onTranscriptClick: () => void;
  transcript?: string;
}

export default function AudioPlayer({ audioUrl, duration = 0, onPlay, onTranscriptClick, transcript }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(new Audio(audioUrl));

  useEffect(() => {
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audioUrl]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => {
          setIsPlaying(true);
          onPlay();
        })
        .catch((error) => {
          console.error('Error playing audio:', error);
          setIsPlaying(false);
        });
    }
  };

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
      <div className="flex items-center">
        {!isPlaying ? (
          <button
            onClick={() => {
              audioRef.current.play()
                .then(() => {
                  setIsPlaying(true);
                  onPlay();
                })
                .catch(console.error);
            }}
            className="p-2 hover:bg-secondary rounded-full"
            aria-label="Play"
          >
            <Play className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => {
              audioRef.current.pause();
              setIsPlaying(false);
            }}
            className="p-2 hover:bg-secondary rounded-full"
            aria-label="Pause"
          >
            <Pause className="h-4 w-4" />
          </button>
        )}

        <div className="mx-2 w-32 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-red-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-xs text-muted-foreground min-w-[3ch]">
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
