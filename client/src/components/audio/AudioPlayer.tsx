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
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      // Use the audio's actual duration if available, otherwise fallback to prop
      const actualDuration = audio.duration;
      if (!isNaN(actualDuration) && actualDuration > 0) {
        setAudioDuration(actualDuration);
      } else if (duration && duration > 0) {
        setAudioDuration(duration);
      }
    };

    const handleDurationChange = () => {
      const newDuration = audio.duration;
      if (!isNaN(newDuration) && newDuration > 0) {
        setAudioDuration(newDuration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (!isNaN(audioDuration)) {
        setCurrentTime(audioDuration);
      }
    };

    // Reset states
    setCurrentTime(0);
    setIsPlaying(false);
    
    // Try to get duration immediately if already loaded
    if (!isNaN(audio.duration) && audio.duration > 0) {
      setAudioDuration(audio.duration);
    } else if (duration && duration > 0) {
      setAudioDuration(duration);
    }
    
    // Force load audio metadata
    audio.load();

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl, duration, audioDuration]); // Re-run when audio source changes

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

  // Update duration when prop changes
  useEffect(() => {
    if (duration && duration > 0) {
      setAudioDuration(duration);
    }
  }, [duration]);

  const formatTime = (time: number) => {
    if (typeof time !== 'number' || isNaN(time) || !isFinite(time) || time < 0) {
      return '0:00';
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlayPause}
          className="h-10 w-10"
        >
          {isPlaying ? (
            <PauseCircle className="h-6 w-6" />
          ) : (
            <PlayCircle className="h-6 w-6" />
          )}
        </Button>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(audioDuration)}
          </div>
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
            value={[isMuted ? 0 : volume * 100]}
            min={0}
            max={100}
            step={1}
            className="w-20"
            onValueChange={([value]) => setVolume(value / 100)}
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
      </div>
      <audio 
        ref={audioRef} 
        src={audioUrl} 
        preload="metadata"
        className="hidden" 
      />
    </div>
  );
}
