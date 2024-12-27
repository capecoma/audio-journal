import OpenAI from "openai";
import NodeCache from "node-cache";
import { createReadStream } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cache = new NodeCache({ stdTTL: 3600 });

export async function transcribeAudio(audioBuffer: Buffer): Promise<any> {
  try {
    // Create a temporary file from the buffer
    const tempFile = join(tmpdir(), `audio-${Date.now()}.webm`);
    await writeFile(tempFile, audioBuffer);

    const transcript = await openai.audio.transcriptions.create({
      file: createReadStream(tempFile),
      model: "whisper-1",
      response_format: "text"
    });

    return transcript;
  } catch (error: any) {
    console.error("Transcription error:", error);
    if (error.message.includes('format')) {
      throw new Error("Invalid audio format. Please ensure you're recording in a supported format.");
    }
    throw new Error("Failed to transcribe audio: " + (error.message || "Unknown error"));
  }
}

export async function generateTags(transcript: string | undefined): Promise<string[]> {
  try {
    // Validate transcript
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      console.log('Invalid transcript provided for tag generation');
      return [];
    }

    // Check cache first
    const cacheKey = `tags:${transcript.substring(0, 32)}`;
    const cachedTags = cache.get<string[]>(cacheKey);
    if (cachedTags) {
      console.log('Using cached tags');
      return cachedTags;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Extract 2-4 relevant tags from the text. Return only comma-separated tags, no additional text.",
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      temperature: 0.7,
      max_tokens: 50,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.log('No content in OpenAI response');
      return [];
    }

    // Parse comma-separated tags
    const tags = content
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    // Cache the result
    if (tags.length > 0) {
      cache.set(cacheKey, tags);
    }

    return tags;
  } catch (error) {
    console.error("Tag generation error:", error);
    return [];
  }
}

export async function analyzeContent(transcript: string): Promise<{
  sentiment: number;
  topics: string[];
  insights: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze the journal entry and provide:
1. Sentiment score (1-5, where 1 is very negative and 5 is very positive)
2. Main topics discussed (max 3)
3. Key insights or patterns (max 3)

Return the analysis in JSON format with keys: sentiment, topics, insights`,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    return {
      sentiment: Math.min(5, Math.max(1, analysis.sentiment)),
      topics: analysis.topics.slice(0, 3),
      insights: analysis.insights.slice(0, 3)
    };
  } catch (error) {
    console.error("Analysis error:", error);
    return {
      sentiment: 3,
      topics: [],
      insights: []
    };
  }
}

export async function generateSummary(transcripts: string[]): Promise<string> {
  try {
    const prompt = `Generate a concise summary of these journal entries, highlighting key themes and important points:

${transcripts.join("\n\n")}

Please format the summary in a clear, readable way with bullet points for key takeaways.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    return content ?? 'Failed to generate summary';
  } catch (error) {
    console.error("Summary generation error:", error);
    throw new Error("Failed to generate summary");
  }
}