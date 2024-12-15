import { useState, useRef } from 'react';
import { Loader2 } from "lucide-react";
import MicrophoneIcon from "./MicrophoneIcon";
import { useToast } from "@/hooks/use-toast";


interface RecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
}

export default function Recorder({ onRecordingComplete }: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 22050,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      mediaStreamRef.current = stream;
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 32000
      });
      
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm;codecs=opus' });
        setIsProcessing(true);
        onRecordingComplete(audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {isProcessing ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Processing recording...</span>
        </div>
      ) : (
        <>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-[400px] h-[400px] flex items-center justify-center rounded-full transition-colors ${
              isRecording 
                ? "bg-destructive/10 hover:bg-destructive/20" 
                : "hover:bg-primary/5"
            }`}
          >
            <MicrophoneIcon isRecording={isRecording} />
          </button>
          
        </>
      )}
      <p className="text-sm text-muted-foreground">
        {isRecording ? "Click to stop recording" : "Click to start recording"}
      </p>
    </div>
  );
}
