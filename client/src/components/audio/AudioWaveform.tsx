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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let wavesurfer: WaveSurfer | null = null;

    const initializeWaveform = async () => {
      try {
        setIsLoading(true);
        setError(null);

        wavesurfer = WaveSurfer.create({
          container: containerRef.current!,
          height: 60,
          waveColor: emotionColors[emotion],
          progressColor: emotionColors[emotion] + '88',
          cursorColor: emotionColors[emotion],
          cursorWidth: 1,
          barWidth: 2,
          barGap: 1,
          barRadius: 3,
          normalize: true,
        });

        wavesurfer.on('ready', () => {
          setIsLoading(false);
          onReady?.();
        });

        wavesurfer.on('play', () => {
          onPlay?.();
        });

        wavesurfer.on('pause', () => {
          onPause?.();
        });

        wavesurfer.on('error', (err) => {
          console.error('WaveSurfer error:', err);
          setError('Error loading audio');
          setIsLoading(false);
        });

        await wavesurfer.load(audioUrl);
      } catch (err) {
        console.error('Error initializing WaveSurfer:', err);
        setError('Error initializing audio player');
        setIsLoading(false);
      }
    };

    initializeWaveform();

    return () => {
      if (wavesurfer) {
        wavesurfer.destroy();
      }
    };
  }, [audioUrl, emotion]);

  const handleClick = () => {
    const wavesurfer = containerRef.current?.querySelector('wave')?.wavesurfer;
    if (wavesurfer && !isLoading && !error) {
      wavesurfer.playPause();
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
