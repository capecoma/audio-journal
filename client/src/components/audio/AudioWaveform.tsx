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

    const abortController = new AbortController();
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    const cleanup = () => {
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch (err) {
          console.error('Error during cleanup:', err);
        }
        wavesurferRef.current = null;
      }
    };

    const initializeWaveSurfer = async () => {
      cleanup();

      try {
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
          backend: 'WebAudio',
        });

        wavesurferRef.current = wavesurfer;

        wavesurfer.on('ready', () => {
          if (!abortController.signal.aborted) {
            setIsLoading(false);
            onReady?.();
          }
        });

        wavesurfer.on('play', () => {
          if (!abortController.signal.aborted) {
            setIsPlaying(true);
            onPlay?.();
          }
        });

        wavesurfer.on('pause', () => {
          if (!abortController.signal.aborted) {
            setIsPlaying(false);
            onPause?.();
          }
        });

        wavesurfer.on('error', async (err) => {
          console.error('WaveSurfer error:', err);
          
          if (abortController.signal.aborted) return;

          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Retrying audio load (attempt ${retryCount}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            await loadAudio(wavesurfer);
          } else {
            setError('Error loading audio');
            setIsLoading(false);
          }
        });

        await loadAudio(wavesurfer);
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('Error initializing WaveSurfer:', err);
          setError('Error initializing audio player');
          setIsLoading(false);
        }
      }
    };

    const loadAudio = async (wavesurfer: WaveSurfer) => {
      try {
        if (abortController.signal.aborted) return;
        
        await wavesurfer.load(audioUrl);
        
        // Additional validation after loading
        if (!wavesurfer.getDuration() && !abortController.signal.aborted) {
          throw new Error('Invalid audio duration');
        }
      } catch (err) {
        if (abortController.signal.aborted) return;
        
        console.error('Error loading audio:', err);
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Retrying audio load (attempt ${retryCount}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          await loadAudio(wavesurfer);
        } else {
          setError('Error loading audio');
          setIsLoading(false);
        }
      }
    };

    initializeWaveSurfer();

    return () => {
      abortController.abort();
      cleanup();
    };
  }, [audioUrl, emotion, onReady, onPlay, onPause]);

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
