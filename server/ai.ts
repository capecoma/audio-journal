import OpenAI from "openai";
import NodeCache from "node-cache";
import { createReadStream } from "fs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cache = new NodeCache({ stdTTL: 3600 });

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    // Create a temporary file from the buffer
    const tempFile = join(tmpdir(), `audio-${Date.now()}.webm`);
    await writeFile(tempFile, audioBuffer);

    const transcript = await openai.audio.transcriptions.create({
      file: createReadStream(tempFile),
      model: "whisper-1",
      response_format: "text"
    });

    return transcript.text;
  } catch (error: any) {
    console.error("Transcription error:", error);
    if (error.message.includes('format')) {
      throw new Error("Invalid audio format. Please ensure you're recording in a supported format.");
    }
    throw new Error("Failed to transcribe audio: " + (error.message || "Unknown error"));
  }
}

export async function generateTags(transcript: string): Promise<string[]> {
  try {
    // Check cache first
    const cacheKey = `tags:${transcript.substring(0, 32)}`;
    const cachedTags = cache.get<string[]>(cacheKey);
    if (cachedTags) {
      console.log('Using cached tags');
      return cachedTags;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a text analysis expert. Generate 2-4 relevant tags for the given text. Focus on themes, emotions, or key topics mentioned. Return the tags as a JSON array of strings.",
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"tags":[]}');
    const tags = result.tags || [];

    // Cache the result
    cache.set(cacheKey, tags);

    return tags;
  } catch (error) {
    console.error("Tag generation error:", error);
    throw new Error("Failed to generate tags");
  }
}

export async function generateSummary(transcripts: string[]): Promise<string> {
  try {
    const prompt = `Generate a concise summary of these journal entries, highlighting key themes and important points:

${transcripts.join("\n\n")}

Please format the summary in a clear, readable way with bullet points for key takeaways.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
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