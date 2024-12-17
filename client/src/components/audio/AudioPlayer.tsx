import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, FileText, Play, Pause } from 'lucide-react';
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
  const [emotion, setEmotion] = useState<'neutral' | 'happy' | 'sad' | 'excited' | 'calm'>('neutral');

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Initialize with prop duration if available
    if (typeof duration === 'number' && duration > 0) {
      setAudioDuration(duration);
    }

    const updateTime = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audioDuration);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
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

  const formatTime = (time: number | undefined) => {
    if (typeof time !== 'number' || isNaN(time) || !isFinite(time) || time < 0) {
      return '0:00';
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(1, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Detect emotion from transcript
  useEffect(() => {
    if (transcript) {
      const text = transcript.toLowerCase();
      if (text.match(/\b(happy|joy|excited|wonderful|great)\b/)) {
        setEmotion('happy');
      } else if (text.match(/\b(sad|upset|disappointed|worried)\b/)) {
        setEmotion('sad');
      } else if (text.match(/\b(wow|amazing|incredible|awesome)\b/)) {
        setEmotion('excited');
      } else if (text.match(/\b(peaceful|quiet|relaxed|gentle)\b/)) {
        setEmotion('calm');
      }
    }
  }, [transcript]);

  return (
    <div className="w-full space-y-4 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlayPause}
          className="h-10 w-10"
        >
          {isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </Button>
        
        <div className="flex-1">
          <Slider
            value={[currentTime]}
            min={0}
            max={audioDuration || 100}
            step={0.1}
            onValueChange={([value]) => {
              if (audioRef.current) {
                audioRef.current.currentTime = value;
                setCurrentTime(value);
              }
            }}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground flex-1">
          {formatTime(currentTime)} / {formatTime(audioDuration)}
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
            title="View transcript"
          >
            <FileText className="h-4 w-4" />
          </Button>
        )}
      </div>
      <audio 
        ref={audioRef} 
        src={audioUrl}
        preload="metadata"
        onError={(e) => console.error('Audio error:', e)}
        className="hidden"
      />
    </div>
  );
}