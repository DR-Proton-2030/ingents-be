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
exports.getOpenAIEmbeddings = exports.generateOpenAiResponse = void 0;
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPEN_AI_API_KEY,
});
const formatRagContext = (ragData) => {
    if (!ragData.contexts || ragData.contexts.length === 0) {
        return "";
    }
    const relevantContexts = ragData.contexts
        .filter(context => {
        var _a;
        return !ragData.relevanceThreshold ||
            !((_a = context.metadata) === null || _a === void 0 ? void 0 : _a.relevanceScore) ||
            context.metadata.relevanceScore >= ragData.relevanceThreshold;
    })
        .slice(0, ragData.maxContexts || 5);
    if (relevantContexts.length === 0) {
        return "";
    }
    const contextString = relevantContexts
        .map((context, index) => { var _a; return `Context ${index + 1} (${((_a = context.metadata) === null || _a === void 0 ? void 0 : _a.source) || 'unknown'}):\n${context.content}`; })
        .join('\n\n');
    return `\n\nRelevant Context Information:\n${contextString}\n\nPlease use this context information to provide more accurate and relevant responses.`;
};
const generateOpenAiResponse = (request, systemMessage) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Handle both old string parameters and new object parameter
        let config;
        if (typeof request === 'string') {
            // Backward compatibility: old function signature
            config = {
                prompt: request,
                systemMessage: systemMessage || "",
                model: "gpt-4o",
                maxTokens: 500,
                temperature: 0.7,
                topP: 0.9,
                presencePenalty: 0.2,
                frequencyPenalty: 0.3,
                responseFormat: { type: "json_object" }
            };
        }
        else {
            // New object-based configuration
            config = Object.assign({ model: "gpt-4o", maxTokens: 500, temperature: 0.7, topP: 0.9, presencePenalty: 0.2, frequencyPenalty: 0.3, responseFormat: { type: "json_object" } }, request);
        }
        // Enhance prompt with RAG context if available
        let enhancedPrompt = config.prompt;
        if (config.ragData) {
            const ragContext = formatRagContext(config.ragData);
            enhancedPrompt = config.prompt + ragContext;
        }
        const response = yield openai.chat.completions.create({
            model: config.model || "gpt-4o",
            messages: [
                { role: "system", content: config.systemMessage },
                { role: "user", content: enhancedPrompt },
            ],
            max_tokens: config.maxTokens || 500,
            temperature: config.temperature || 0.7,
            top_p: config.topP || 0.9,
            presence_penalty: config.presencePenalty || 0.2,
            frequency_penalty: config.frequencyPenalty || 0.3,
            response_format: config.responseFormat || { type: "json_object" },
        });
        const content = response.choices[0].message.content;
        if (content === null)
            throw new Error("OpenAI response content is null");
        const parsedContent = JSON.parse(content);
        // Return both the generated content and the enhanced prompt
        return {
            prompt: enhancedPrompt,
            originalPrompt: config.prompt,
            parsedContent,
            ragData: config.ragData,
        };
    }
    catch (err) {
        console.error("OpenAI request failed:", err);
        return null;
    }
});
exports.generateOpenAiResponse = generateOpenAiResponse;
function getOpenAIEmbeddings(text) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
        });
        return response.data[0].embedding;
    });
}
exports.getOpenAIEmbeddings = getOpenAIEmbeddings;
