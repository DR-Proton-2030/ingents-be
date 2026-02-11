import { HUGGINGFACE_API_KEY } from "../../config/config";
import { uploadBase64ToS3 } from "../uploadFile/uploadFile";

export const generateImageWithGemini = async (
  prompt: string,
  s3KeyPrefix: string = "generated-images"
): Promise<string | null> => {
  try {
    console.log("Starting image generation with prompt:", prompt);

    const apiKey = HUGGINGFACE_API_KEY ?? "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";

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    console.log("HF API Response status:", response.status);

    if (!response.ok) {
      const txt = await response.text().catch(() => "(no body)");
      console.error("HF image generation error:", response.status, txt);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log("Received image data, size:", arrayBuffer.byteLength);

    let base64: string;
    if (typeof Buffer !== "undefined") {
      base64 = Buffer.from(arrayBuffer).toString("base64");
    } else {
      let binary = "";
      const bytes = new Uint8Array(arrayBuffer);
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      base64 = btoa(binary);
    }

    console.log("Converted to base64, length:", base64.length);

    try {
      console.log("Attempting S3 upload...");
      const s3Url = await uploadBase64ToS3(base64, s3KeyPrefix, "image/png");
      if (s3Url) {
        console.log("S3 upload successful:", s3Url);
        return s3Url;
      }
    } catch (s3Err) {
      console.error("S3 upload failed:", s3Err);
    }

    const dataUrl = `data:image/png;base64,${base64}`;
    console.log("Returning data URL fallback");
    return dataUrl;
  } catch (error) {
    console.error("Error generating image with Gemini:", error);
    return null;
  }
};
