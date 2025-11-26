import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not set. Gemini features will not work.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateGeminiImage(prompt: string): Promise<string> {
  if (!genAI) throw new Error("Gemini client not initialized");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent([
    {
      text: `Create a detailed description for an image based on this request: ${prompt}`,
    },
  ]);

  const text = result.response.text();
  if (!text) throw new Error("Empty Gemini image description response");

  return text;
}

export async function generateGeminiVideo(prompt: string): Promise<string> {
  if (!genAI) throw new Error("Gemini client not initialized");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent([
    {
      text: `Create a storyboard or detailed description for a short marketing video based on this request: ${prompt}`,
    },
  ]);

  const text = result.response.text();
  if (!text) throw new Error("Empty Gemini video description response");

  return text;
}

export async function generateGeminiPdfContent(prompt: string): Promise<string> {
  if (!genAI) throw new Error("Gemini client not initialized");

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent([
    {
      text: `Generate structured content suitable for a PDF document based on this request: ${prompt}`,
    },
  ]);

  const text = result.response.text();
  if (!text) throw new Error("Empty Gemini PDF content response");

  return text;
}
