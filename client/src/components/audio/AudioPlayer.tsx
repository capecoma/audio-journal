import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle, PauseCircle, Volume2, VolumeX, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';

interface AudioPlayerProps {
  audioUrl: string;
  duration: number;
  onTranscriptClick: () => void;
  transcript?: string;
}

export default function AudioPlayer({ audioUrl, duration, onTranscriptClick, transcript }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 w-full p-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlayPause}
        className="h-8 w-8"
      >
        {isPlaying ? (
          <PauseCircle className="h-5 w-5" />
        ) : (
          <PlayCircle className="h-5 w-5" />
        )}
      </Button>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <Progress value={(currentTime / duration) * 100} className="h-1" />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="h-8 w-8"
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
        <Slider
          value={[isMuted ? 0 : volume]}
          min={0}
          max={100}
          step={1}
          className="w-20"
          onValueChange={([value]) => setVolume(value)}
        />
      </div>
      
      {transcript && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onTranscriptClick}
          className="h-8 w-8"
        >
          <FileText className="h-4 w-4" />
        </Button>
      )}
      
      <audio ref={audioRef} src={audioUrl} className="hidden" />
    </div>
  );
}
