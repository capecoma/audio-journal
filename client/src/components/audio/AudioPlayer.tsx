import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, FileText } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import AudioWaveform from './AudioWaveform';

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
      console.log('Metadata loaded, audio duration:', audio.duration);
      // Only update from audio element if we don't have a valid prop duration
      if (!isNaN(audio.duration) && audio.duration > 0 && (!duration || duration === 0)) {
        console.log('Updating duration from audio element:', audio.duration);
        setAudioDuration(audio.duration);
      }
    };

    const handleDurationChange = () => {
      console.log('Duration changed, new duration:', audio.duration);
      if (!isNaN(audio.duration) && audio.duration > 0 && (!duration || duration === 0)) {
        console.log('Updating duration on change:', audio.duration);
        setAudioDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // Use the current audioDuration state instead of potentially stale prop
      setCurrentTime(audioDuration);
    };

    // Reset states when audio source changes
    setCurrentTime(0);
    setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    // Force metadata loading
    if (audio.readyState === 0) {
      console.log('Loading audio metadata...');
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

  // Update duration when prop changes
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
    <div className="w-full space-y-4">
      <AudioWaveform 
        audioUrl={audioUrl}
        emotion={emotion}
        onReady={() => {
          const audio = audioRef.current;
          if (audio && !isNaN(audio.duration) && audio.duration > 0) {
            setAudioDuration(audio.duration);
          }
        }}
        onPlay={() => {
          setIsPlaying(true);
          audioRef.current?.play();
        }}
        onPause={() => {
          setIsPlaying(false);
          audioRef.current?.pause();
        }}
      />
      
      <div className="flex items-center gap-2 px-4">
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
        onLoadedData={(e) => {
          const audio = e.currentTarget;
          if (!isNaN(audio.duration) && audio.duration > 0) {
            setAudioDuration(audio.duration);
          }
        }}
        className="hidden" 
      />
    </div>
  );
}