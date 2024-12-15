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

  const togglePlayback = useCallback(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    let audio = audioRef.current;
    
    // Create a new audio element if none exists
    if (!audio) {
      audio = new Audio(audioUrl);
      audioRef.current = audio;

      const handleTimeUpdate = () => {
        const currentProgress = (audio!.currentTime / audio!.duration) * 100;
        setProgress(currentProgress);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', cleanupAudio);
      
      // Store the listeners to remove them later
      audio.dataset.timeUpdateHandler = String(handleTimeUpdate);
    }

    audio.play()
      .then(() => {
        setIsPlaying(true);
        onPlay();
      })
      .catch((error) => {
        console.error('Error playing audio:', error);
        cleanupAudio();
      });
  }, [audioUrl, isPlaying, onPlay, cleanupAudio]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={togglePlayback}
          className="p-2 hover:bg-secondary rounded-full"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 transition-transform duration-100 ease-linear"
              style={{ transform: `translateX(-${100 - progress}%)` }}
            />
          </div>
        </div>
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
