import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Recorder from "@/components/audio/Recorder";
import TranscriptView from "@/components/audio/TranscriptView";
import { ArrowLeft } from "lucide-react";

interface Entry {
  id: number;
  title: string;
  audioUrl: string;
  transcript?: string;
  tags?: string[];
  duration: number;
  isProcessed: boolean;
  createdAt: string;
}

export default function Journal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<Entry | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append("audio", audioBlob);

      const response = await fetch("/api/entries/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data: Entry) => {
      setCurrentEntry(data);
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      toast({
        title: "Success",
        description: "Journal entry recorded and transcribed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsUploading(true);
    setCurrentEntry(null);
    await uploadMutation.mutateAsync(audioBlob);
  };

  return (
    <div className="container mx-auto py-8">
      <Button
        variant="ghost"
        onClick={() => setLocation("/")}
        className="mb-8"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Record Journal Entry</h1>
            <p className="text-muted-foreground">
              Click the microphone to start recording your thoughts
            </p>
          </div>

          <Recorder
            onRecordingComplete={handleRecordingComplete}
          />

          {isUploading && (
            <p className="text-center mt-4 text-sm text-muted-foreground">
              Uploading and processing your entry...
            </p>
          )}

          {currentEntry?.transcript && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Your Transcribed Entry</h2>
              <TranscriptView 
                transcript={currentEntry.transcript} 
                tags={currentEntry.tags || []} 
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
