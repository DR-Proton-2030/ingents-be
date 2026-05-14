"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIContent = void 0;
const mongoose_1 = require("mongoose");
const llmWithRag_service_1 = require("../llmWithRag/llmWithRag.service");
const aiTokenUsage_model_1 = __importDefault(require("../../models/aiTokenUsage/aiTokenUsage.model"));
const subscription_model_1 = __importDefault(require("../../models/subscription/subscription.model"));
const llmService = new llmWithRag_service_1.LLMWithRagService();
const PLAN_LIMITS = {
    free: 1000,
    pro: 3000,
    pro_plus: 10000,
};
const generateAIContent = (userId_1, companyId_1, context_1, ...args_1) => __awaiter(void 0, [userId_1, companyId_1, context_1, ...args_1], void 0, function* (userId, companyId, context, feature = "social_post_generation") {
    try {
        // 1. Get subscription to determine limit
        let subscription = yield subscription_model_1.default.findOne({
            company_id: companyId,
            status: { $in: ["active", "past_due"] },
        }).sort({ amount: -1, createdAt: -1 });
        const plan = (subscription === null || subscription === void 0 ? void 0 : subscription.plan) || "free";
        const limit = PLAN_LIMITS[plan] || 1000;
        // 2. Check total usage for the company
        const usage = yield aiTokenUsage_model_1.default.aggregate([
            { $match: { company_object_id: new mongoose_1.Types.ObjectId(companyId) } },
            { $group: { _id: null, total: { $sum: "$tokens_used" } } },
        ]);
        const totalUsed = usage.length > 0 ? usage[0].total : 0;
        if (totalUsed >= limit) {
            throw new Error(`AI credit limit reached (${totalUsed}/${limit}). Please upgrade your plan or recharge to continue using AI features.`);
        }
        const systemMessage = "You are a creative social media manager expert at writing viral and engaging posts.";
        const prompt = `Generate a professional and engaging social media post based on this brief: "${context}". Only return the post content text.`;
        const result = yield llmService.generateGeminiResponseWithRag(prompt, systemMessage);
        if (result && result.content) {
            if (result.usage) {
                yield aiTokenUsage_model_1.default.create({
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
    }
    catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
});
exports.generateAIContent = generateAIContent;
