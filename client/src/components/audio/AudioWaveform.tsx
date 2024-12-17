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
        // Ensure container element exists
        const container = containerRef.current;
        if (!container) {
          throw new Error('Container element not found');
        }

        const wavesurfer = WaveSurfer.create({
          container,
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
          xhr: {
            cache: 'no-cache',
            credentials: 'same-origin',
            headers: {
              'Cache-Control': 'no-cache',
            }
          }
        });

        wavesurferRef.current = wavesurfer;

        wavesurfer.on('ready', () => {
          if (!abortController.signal.aborted) {
            console.log('Metadata loaded, audio duration:', wavesurfer.getDuration());
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
          setError('Error loading audio: ' + (err.message || 'Unknown error'));
          setIsLoading(false);
        });

        // Force metadata loading
        if (wavesurfer.backend && wavesurfer.backend.media) {
          wavesurfer.backend.media.preload = 'metadata';
        }

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
        if (abortController.signal.aborted) {
          throw new Error('Operation aborted');
        }

        console.log('Loading audio metadata...');
        await wavesurfer.load(audioUrl);

        // Validate the loaded audio
        if (!wavesurfer.getDuration()) {
          throw new Error('Invalid audio duration');
        }

      } catch (err) {
        if (abortController.signal.aborted) return;

        console.error('Error loading audio:', err);
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = RETRY_DELAY * Math.pow(2, retryCount - 1);
          console.log(`Retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadAudio(wavesurfer);
        }
        throw err;
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
