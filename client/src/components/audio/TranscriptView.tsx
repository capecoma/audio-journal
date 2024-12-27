import React from "react";
import { Badge } from "@/components/ui/badge";

interface TranscriptViewProps {
  transcript: string;
  tags: string[];
}

export default function TranscriptView({ transcript, tags }: TranscriptViewProps) {
  const highlightTranscript = (text: string, keywords: string[]) => {
    if (!text || !keywords.length) return text;

    let highlightedText = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        match => `<mark class="bg-primary/20 rounded px-1">${match}</mark>`
      );
    });

    return (
      <div 
        dangerouslySetInnerHTML={{ __html: highlightedText }}
        className="prose prose-sm max-w-none dark:prose-invert"
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <Badge key={index} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
      <div className="p-4 bg-muted/30 rounded-lg">
        {highlightTranscript(transcript, tags)}
      </div>
    </div>
  );
}
