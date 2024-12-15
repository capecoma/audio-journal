import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Recorder from "@/components/audio/Recorder";
import { ArrowLeft } from "lucide-react";

export default function Journal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/summaries/daily"] });
      setLocation("/");
      toast({
        title: "Success",
        description: "Journal entry recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync(audioBlob);
    } finally {
      setIsUploading(false);
    }
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

      <Card className="max-w-xl mx-auto">
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
        </CardContent>
      </Card>
    </div>
  );
}
