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
  neutral: '#64748b', // slate
  happy: '#22c55e',   // green
  sad: '#3b82f6',     // blue
  excited: '#ef4444', // red
  calm: '#8b5cf6',    // purple
};

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

  useEffect(() => {
    if (!waveformRef.current) return;

    const initWaveSurfer = async () => {
      try {
        setIsLoading(true);
        
        // Create new instance
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
          setIsLoading(false);
        });

        // Load audio with timeout and error handling
        try {
          const loadPromise = wavesurfer.current.load(audioUrl);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Loading timeout')), 10000);
          });
          await Promise.race([loadPromise, timeoutPromise]);
        } catch (loadError) {
          console.error('Error loading audio:', loadError);
          setIsLoading(false);
          throw loadError;
        }
      } catch (error) {
        console.error('Error initializing WaveSurfer:', error);
        setIsLoading(false);
      }
    };

    initWaveSurfer();

    // Cleanup
    return () => {
      if (wavesurfer.current) {
        try {
          wavesurfer.current.pause();
          wavesurfer.current.destroy();
        } catch (error) {
          console.error('Error cleaning up WaveSurfer:', error);
        } finally {
          wavesurfer.current = null;
          setIsPlaying(false);
          setIsLoading(true);
        }
      }
    };
  }, [audioUrl]);

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
    if (!wavesurfer.current || isLoading) return;
    wavesurfer.current.playPause();
  };

  return (
    <div 
      className="rounded-lg bg-card p-4 border cursor-pointer transition-colors hover:bg-muted/30"
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
      </div>
    </div>
  );
}
