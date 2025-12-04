import { LLMWithRagService } from "../../llmWithRag/llmWithRag.service";
import * as path from "node:path";
import { IRagData } from "../../../types/interface/ragData.interface";

const llmWithRagService = new LLMWithRagService();

export async function generateMediaWithGemini(options: {
  prompt: string;
  numberOfImages?: number;
  companyObjectId: string;
}) {
  const { prompt, numberOfImages = 1, companyObjectId } = options;

  const type = prompt.toLowerCase().includes("video") ? "video" : "image";

  // Fetch RAG context from CompanySettings using embeddings
  let contextData: IRagData | undefined;
  try {
    // Fetch company-specific RAG context from CompanySettings model
    // This uses embeddings for semantic similarity search
    contextData = await llmWithRagService.getCompanyRagContext(
      companyObjectId,
      prompt,
      5 // maxContexts
    );
  } catch (error) {
    console.error("Error fetching RAG context for media generation:", error);
    // Continue without RAG context
  }

  if (type === "video") {
    const downloadPath = path.join(
      process.cwd(),
      `gemini-video-${Date.now()}.mp4`
    );
    const s3KeyPrefix = `gemini-video-${Date.now()}.mp4`;

    const url = await llmWithRagService.generateGeminiVideoWithRag(
      prompt,
      downloadPath,
      contextData,
      s3KeyPrefix
    );
    
    return {
      content: "I've generated a video based on your request.",
      files: [url]
    };
  } else {
    // type === "image"
    const s3KeyPrefix = `gemini-image-${Date.now()}.png`;

    const result = await llmWithRagService.generateGeminiImagesWithRag(
      prompt,
      contextData,
      numberOfImages,
      s3KeyPrefix
    );
    
    // Handle new return format from generateImages
    // Result is { urls: string[], logoUrl?: string, companyName?: string }
    const urls = (result as any).urls || result;
    const logoUrl = (result as any).logoUrl;
    const companyName = (result as any).companyName;
    
    const logoInfo = logoUrl 
      ? `\n\nNote: Your company logo (${companyName}) should be added from: ${logoUrl}` 
      : '';
    
    return {
      content: `I've generated ${Array.isArray(urls) ? urls.length : 1} image(s) based on your request.${logoInfo}`,
      files: Array.isArray(urls) ? urls : [urls]
    };
  }
}
