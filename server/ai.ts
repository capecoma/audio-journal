import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    // Create a blob from the buffer
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');

    // Make a direct fetch call to OpenAI API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const transcription = await response.text();
    return transcription;
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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

    const result = JSON.parse(response.choices[0].message.content);
    return result.tags || [];
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
