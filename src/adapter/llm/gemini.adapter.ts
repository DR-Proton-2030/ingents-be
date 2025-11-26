import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. Gemini features will not work.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

type GeminiMediaType = "image" | "video" | "pdf";

export const generateGeminiMedia = async (
  prompt: string,
  type: GeminiMediaType
) => {
  if (!genAI) throw new Error("Gemini client not initialized");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  let systemInstruction: string;

  switch (type) {
    case "image":
      systemInstruction =
        "You are an assistant that designs marketing images. Respond with a detailed description for a single image.";
      break;
    case "video":
      systemInstruction =
        "You are an assistant that creates video storyboards. Respond with a concise storyboard for a short video.";
      break;
    case "pdf":
      systemInstruction =
        "You are an assistant that drafts structured documents. Respond with structured sections suitable for a PDF.";
      break;
    default:
      throw new Error("Unsupported Gemini media type");
  }

  const result = await model.generateContent([
    {
      text: `${systemInstruction}\nUser request: ${prompt}`,
    },
  ]);

  const text = result.response.text();
  if (!text) throw new Error("Empty Gemini media response");

  return {
    prompt,
    type,
    content: text,
  };
};
