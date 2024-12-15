import { FileText, Volume2, VolumeX } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  audioUrl: string;
  progress: number;
  duration?: number;
  onTranscriptClick: () => void;
  transcript?: string;
}

export default function AudioPlayer({ audioUrl, progress, duration = 0, onTranscriptClick, transcript }: AudioPlayerProps) {
  const [volume, setVolume] = useState(100);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const formatDuration = (timeInSeconds: number) => {
    const roundedSeconds = Math.round(timeInSeconds);
    if (roundedSeconds < 60) {
      return `${roundedSeconds}s`;
    }
    const minutes = Math.floor(roundedSeconds / 60);
    const seconds = roundedSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  return (
    <div className="flex items-center gap-4 w-full">
      <div className="flex items-center flex-1 space-x-4">
        <div className="flex-1">
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-red-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <span className="text-xs text-muted-foreground min-w-[3ch]">
          {formatDuration(duration)}
        </span>

        <div className="flex items-center gap-2">
          {volume === 0 ? (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          )}
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="w-24"
          />
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
      
      <audio ref={audioRef} src={audioUrl} className="hidden" />
    </div>
  );
}
