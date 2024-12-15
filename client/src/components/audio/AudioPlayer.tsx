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

  const handlePlay = () => {
    // If there's already an audio element playing, clean it up
    cleanupAudio();

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
        <button
          onClick={onTranscriptClick}
          className="p-2 hover:bg-secondary rounded-full relative group"
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          {isPlaying && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <div ref={progressBarRef} className="h-[2px] w-8 bg-muted overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </button>
      )}
    </div>
  );
}
