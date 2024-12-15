import { useState, useRef, useCallback } from 'react';
import { FileText } from 'lucide-react';

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
  const progressBarRef = useRef<HTMLDivElement>(null);

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

  const togglePlayback = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering transcript dialog

    if (isPlaying) {
      cleanupAudio();
      return;
    }

    // Create a new audio element
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
      {transcript && (
        <div className="relative">
          <button
            onClick={onTranscriptClick}
            className="p-2 hover:bg-secondary rounded-full"
          >
            <FileText 
              className="h-4 w-4 text-muted-foreground" 
              onClick={togglePlayback}
            />
          </button>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8">
            <div className="h-[2px] bg-muted overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-100"
                style={{ width: isPlaying ? `${progress}%` : '0%' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
