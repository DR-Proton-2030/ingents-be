import { GeminiAdapter } from "../../../adapter/llm/gemini.adapter";
import * as path from "node:path";

const gemini = new GeminiAdapter();

export async function generateMediaWithGemini(options: {
  prompt: string;
  numberOfImages?: number;
}) {
  const { prompt, numberOfImages = 1 } = options;
  const type = prompt.toLowerCase().includes("video") ? "video" : "image";
  if (type === "video") {
    const downloadPath = path.join(
      process.cwd(),
      `gemini-video-${Date.now()}.mp4`
    );
    const s3KeyPrefix = `gemini-video-${Date.now()}.mp4`;
    const url = await gemini.generateVideo({
      prompt,
      downloadPath,
      s3KeyPrefix,
    });
    return url;
  } else {
    // type === "image"
    const s3KeyPrefix = `gemini-image-${Date.now()}.png`;
    const urls = await gemini.generateImages({
      prompt,
      numberOfImages,
      s3KeyPrefix,
    });
    return urls;
  }
}
