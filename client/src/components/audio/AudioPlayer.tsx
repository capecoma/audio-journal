import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle, PauseCircle, Volume2, VolumeX, FileText } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface AudioPlayerProps {
  audioUrl: string;
  duration: number;
  onTranscriptClick: () => void;
  transcript?: string;
}

export default function AudioPlayer({ audioUrl, duration, onTranscriptClick, transcript }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (typeof duration === 'number' && duration > 0) {
      setAudioDuration(duration);
    }

    const updateTime = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (!isNaN(audio.duration) && audio.duration > 0 && (!duration || duration === 0)) {
        setAudioDuration(audio.duration);
      }
    };

    const handleDurationChange = () => {
      if (!isNaN(audio.duration) && audio.duration > 0 && (!duration || duration === 0)) {
        setAudioDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audioDuration);
    };

    setCurrentTime(0);
    setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    if (audio.readyState === 0) {
      audio.load();
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, duration, audioDuration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        await audio.pause();
      } else {
        await audio.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  useEffect(() => {
    if (duration && duration > 0) {
      setAudioDuration(duration);
    }
  }, [duration]);

  const formatTime = (time: number | undefined) => {
    if (typeof time !== 'number' || isNaN(time) || !isFinite(time) || time < 0) {
      return '0:00';
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(1, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-[300px] border rounded-md p-2 bg-white shadow-sm">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlayPause}
          className="h-8 w-8 p-0"
        >
          {isPlaying ? (
            <PauseCircle className="h-5 w-5" />
          ) : (
            <PlayCircle className="h-5 w-5" />
          )}
        </Button>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(audioDuration)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="h-6 w-6 p-0"
          >
            {isMuted ? (
              <VolumeX className="h-3 w-3" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            min={0}
            max={100}
            step={1}
            className="w-12"
            onValueChange={([value]) => setVolume(value / 100)}
          />
        </div>
        {transcript && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onTranscriptClick}
            className="h-6 w-6 p-0"
          >
            <FileText className="h-3 w-3" />
          </Button>
        )}
      </div>
      <audio 
        ref={audioRef} 
        src={audioUrl}
        preload="metadata"
        onLoadedData={(e) => {
          const audio = e.currentTarget;
          if (!isNaN(audio.duration) && audio.duration > 0 && (!duration || duration === 0)) {
            setAudioDuration(audio.duration);
          }
        }}
        className="hidden" 
      />
    </div>
  );
}