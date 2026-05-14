import { Types } from "mongoose";
import { LLMWithRagService } from "../llmWithRag/llmWithRag.service";
import AITokenUsageModel from "../../models/aiTokenUsage/aiTokenUsage.model";
import SubscriptionModel from "../../models/subscription/subscription.model";

const llmService = new LLMWithRagService();

const PLAN_LIMITS: Record<string, number> = {
  free: 1000,
  pro: 3000,
  pro_plus: 10000,
};

export const generateAIContent = async (
  userId: string,
  companyId: string,
  context: string,
  feature: string = "social_post_generation"
) => {
  try {
    // 1. Get subscription to determine limit
    let subscription = await SubscriptionModel.findOne({
      company_id: companyId,
      status: { $in: ["active", "past_due"] },
    }).sort({ amount: -1, createdAt: -1 });

    const plan = subscription?.plan || "free";
    const limit = PLAN_LIMITS[plan] || 1000;

    // 2. Check total usage for the company
    const usage = await AITokenUsageModel.aggregate([
      { $match: { company_object_id: new Types.ObjectId(companyId) } },
      { $group: { _id: null, total: { $sum: "$tokens_used" } } },
    ]);

    const totalUsed = usage.length > 0 ? usage[0].total : 0;

    if (totalUsed >= limit) {
      throw new Error(`AI credit limit reached (${totalUsed}/${limit}). Please upgrade your plan or recharge to continue using AI features.`);
    }

    const systemMessage = "You are a creative social media manager expert at writing viral and engaging posts.";
    const prompt = `Generate a professional and engaging social media post based on this brief: "${context}". Only return the post content text.`;

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
