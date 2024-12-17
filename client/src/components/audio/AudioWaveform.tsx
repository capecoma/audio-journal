import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioWaveformProps {
  audioUrl: string;
  emotion?: 'neutral' | 'happy' | 'sad' | 'excited' | 'calm';
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

const emotionColors = {
  neutral: '#64748b',
  happy: '#22c55e',
  sad: '#3b82f6',
  excited: '#ef4444',
  calm: '#8b5cf6',
};

export default function AudioWaveform({
  audioUrl,
  emotion = 'neutral',
  onReady,
  onPlay,
  onPause,
}: AudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
    }

    try {
      // Create new instance with minimal config
      const wavesurfer = WaveSurfer.create({
        container: containerRef.current,
        height: 60,
        waveColor: emotionColors[emotion],
        progressColor: emotionColors[emotion] + '88',
        cursorWidth: 0,
        normalize: true,
        interact: true,
        hideScrollbar: true,
        audioRate: 1,
        autoCenter: true,
        minPxPerSec: 1,
      });

      wavesurferRef.current = wavesurfer;

      wavesurfer.on('ready', () => {
        setIsLoading(false);
        onReady?.();
      });

      wavesurfer.on('play', () => {
        setIsPlaying(true);
        onPlay?.();
      });

      wavesurfer.on('pause', () => {
        setIsPlaying(false);
        onPause?.();
      });

      wavesurfer.on('error', (err) => {
        console.error('WaveSurfer error:', err);
        setError('Error loading audio');
        setIsLoading(false);
      });

      // Load audio with error handling
      const handleLoad = async () => {
        try {
          await wavesurfer.load(audioUrl);
        } catch (err) {
          console.error('Error loading audio:', err);
          setError('Error loading audio');
          setIsLoading(false);
        }
      };

      handleLoad();
    } catch (err) {
      console.error('Error initializing WaveSurfer:', err);
      setError('Error initializing audio player');
      setIsLoading(false);
    }

    // Cleanup on unmount
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
    };
  }, [audioUrl, emotion]);

  const handleClick = () => {
    if (!wavesurferRef.current || isLoading || error) return;
    
    try {
      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        wavesurferRef.current.play();
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
      setError('Error playing audio');
    }
  };

  return (
    <div 
      className={`rounded-lg bg-card p-4 border transition-colors ${!error && 'cursor-pointer hover:bg-muted/30'}`}
      onClick={handleClick}
    >
      <div className="min-h-[60px]" ref={containerRef}>
        {isLoading && (
          <div className="flex items-center justify-center h-[60px]">
            <div className="animate-pulse text-sm text-muted-foreground">
              Loading waveform...
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-[60px]">
            <div className="text-sm text-destructive">
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
