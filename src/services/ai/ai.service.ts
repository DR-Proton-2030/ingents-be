import { LLMWithRagService } from "../llmWithRag/llmWithRag.service";
import AITokenUsageModel from "../../models/aiTokenUsage/aiTokenUsage.model";

const llmService = new LLMWithRagService();

export const generateAIContent = async (
  userId: string,
  companyId: string,
  context: string,
  feature: string = "social_post_generation"
) => {
  const systemMessage = "You are a creative social media manager expert at writing viral and engaging posts.";
  const prompt = `Generate a professional and engaging social media post based on this brief: "${context}". Only return the post content text.`;

  try {
    const result: any = await llmService.generateGeminiResponseWithRag(prompt, systemMessage);

    if (result && result.content) {
      if (result.usage) {
        await AITokenUsageModel.create({
          company_object_id: companyId,
          user_object_id: userId,
          feature: feature,
          tokens_used: result.usage.totalTokens,
          prompt_tokens: result.usage.promptTokens,
          completion_tokens: result.usage.completionTokens,
        });
      }
      return result.content;
    }
    throw new Error("Failed to generate content");
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};
