import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Slider } from "@/components/ui/slider";
import { formatDuration } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  onPlay: () => void;
}

export default function AudioPlayer({ audioUrl, duration = 0, onPlay }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number>();

  useEffect(() => {
    audioRef.current = new Audio(audioUrl);
    audioRef.current.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.remove();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [audioUrl]);

  const startTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = window.setInterval(() => {
      if (audioRef.current?.currentTime) {
        setCurrentTime(audioRef.current.currentTime);
        setProgress((audioRef.current.currentTime / (duration || audioRef.current.duration)) * 100);
      }
    }, 100);
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (!isPlaying) {
      audioRef.current.play();
      startTimer();
      onPlay();
    } else {
      audioRef.current.pause();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const onSliderChange = (value: number[]) => {
    if (!audioRef.current) return;
    
    const time = (value[0] / 100) * (duration || audioRef.current.duration);
    audioRef.current.currentTime = time;
    setProgress(value[0]);
    setCurrentTime(time);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={togglePlayPause}
        className="p-2 hover:bg-secondary rounded-full transition-colors"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>
      <div className="flex-1 flex items-center gap-2">
        <Slider
          value={[progress]}
          onValueChange={onSliderChange}
          max={100}
          step={0.1}
          className="w-24"
        />
        <span className="text-xs text-muted-foreground min-w-[3rem]">
          {formatDuration(currentTime)}
        </span>
      </div>
    </div>
  );
}
