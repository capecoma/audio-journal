import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioWaveformProps {
  audioUrl: string;
  emotion?: 'neutral' | 'happy' | 'sad' | 'excited' | 'calm';
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

const emotionColors = {
  neutral: '#64748b', // slate
  happy: '#22c55e',   // green
  sad: '#3b82f6',     // blue
  excited: '#ef4444', // red
  calm: '#8b5cf6',    // purple
};

const LOAD_TIMEOUT = 10000; // 10 seconds timeout for loading

export default function AudioWaveform({
  audioUrl,
  emotion = 'neutral',
  onReady,
  onPlay,
  onPause,
}: AudioWaveformProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const destroyWaveSurfer = useCallback(() => {
    if (wavesurfer.current) {
      try {
        wavesurfer.current.pause();
        wavesurfer.current.destroy();
      } catch (error) {
        console.error('Error cleaning up WaveSurfer:', error);
      } finally {
        wavesurfer.current = null;
        setIsPlaying(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!waveformRef.current) return;

    const initWaveSurfer = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Cleanup previous instance if it exists
        destroyWaveSurfer();

        // Create new instance with error handling
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        wavesurfer.current = WaveSurfer.create({
          container: waveformRef.current!,
          waveColor: emotionColors[emotion],
          progressColor: emotionColors[emotion] + '88',
          cursorColor: emotionColors[emotion],
          barWidth: 2,
          barGap: 1,
          barRadius: 3,
          cursorWidth: 1,
          height: 60,
          normalize: true,
          backend: 'WebAudio',
          minPxPerSec: 50,
          mediaControls: false,
          interact: false,
        });

        // Set up event listeners
        wavesurfer.current.on('ready', () => {
          setIsLoading(false);
          setError(null);
          onReady?.();
        });

        wavesurfer.current.on('play', () => {
          setIsPlaying(true);
          onPlay?.();
        });

        wavesurfer.current.on('pause', () => {
          setIsPlaying(false);
          onPause?.();
        });

        wavesurfer.current.on('error', (error) => {
          console.error('WaveSurfer error:', error);
          setError('Error loading audio');
          setIsLoading(false);
        });

        // Load audio with timeout
        const loadPromise = new Promise((resolve, reject) => {
          if (!wavesurfer.current) return reject(new Error('WaveSurfer not initialized'));
          
          const timeoutId = setTimeout(() => {
            reject(new Error('Loading timeout'));
          }, LOAD_TIMEOUT);

          wavesurfer.current.once('ready', () => {
            clearTimeout(timeoutId);
            resolve(true);
          });

          wavesurfer.current.once('error', (err) => {
            clearTimeout(timeoutId);
            reject(err);
          });

          wavesurfer.current.load(audioUrl);
        });

        try {
          await loadPromise;
        } catch (loadError: any) {
          console.error('Error loading audio:', loadError);
          setError(loadError.message || 'Error loading audio');
          setIsLoading(false);
          destroyWaveSurfer();
        }
      } catch (error: any) {
        console.error('Error initializing WaveSurfer:', error);
        setError(error.message || 'Error initializing audio player');
        setIsLoading(false);
        destroyWaveSurfer();
      }
    };

    initWaveSurfer();
    return destroyWaveSurfer;
  }, [audioUrl, destroyWaveSurfer]);

  // Update waveform color when emotion changes
  useEffect(() => {
    if (!wavesurfer.current) return;
    
    wavesurfer.current.setOptions({
      waveColor: emotionColors[emotion],
      progressColor: emotionColors[emotion] + '88',
      cursorColor: emotionColors[emotion],
    });
  }, [emotion]);

  const togglePlayPause = () => {
    if (!wavesurfer.current || isLoading || error) return;
    wavesurfer.current.playPause();
  };

  return (
    <div 
      className={`rounded-lg bg-card p-4 border transition-colors ${!error && 'cursor-pointer hover:bg-muted/30'}`}
      onClick={togglePlayPause}
    >
      <div className="min-h-[60px]" ref={waveformRef}>
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
