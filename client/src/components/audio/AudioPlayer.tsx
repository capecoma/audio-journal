import { useState, useRef, useCallback } from 'react';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.remove();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
  }, []);

  const togglePlayback = () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    // If we have an existing paused audio, resume it
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
      return;
    }

    // Create a new audio element if none exists
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      const currentProgress = (audio.currentTime / audio.duration) * 100;
      setProgress(currentProgress);
    });

    audio.addEventListener('ended', cleanupAudio);

    audio.play().then(() => {
      setIsPlaying(true);
      onPlay();
    }).catch(console.error);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={togglePlayback}
        className="p-2 hover:bg-secondary rounded-full relative"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8">
          <div className="h-[2px] bg-muted overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-all duration-100"
              style={{ width: isPlaying ? `${progress}%` : '0%' }}
            />
          </div>
        </div>
      </button>
      
      {transcript && (
        <button
          onClick={onTranscriptClick}
          className="p-2 hover:bg-secondary rounded-full"
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
