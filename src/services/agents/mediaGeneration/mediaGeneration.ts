import { generateGeminiMedia } from "../../../adapter/llm/gemini.adapter";

type MediaType = "image" | "video" | "pdf";

export class MediaGenerationService {
  async generateMedia(prompt: string, type: MediaType): Promise<string> {
    if (!prompt.trim()) {
      throw new Error("Prompt is required");
    }
    const result = await generateGeminiMedia(prompt, type);
    return result.content;
  }
}

