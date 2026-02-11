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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMWithRagService = void 0;
const openai_adapter_1 = require("../../adapter/llm/openai.adapter");
const gemini_adapter_1 = require("../../adapter/llm/gemini.adapter");
const companyEmbeddings_service_1 = require("../companyEmbeddings/companyEmbeddings.service");
const imageGeneration_service_1 = require("../imageGeneration/imageGeneration.service");
class LLMWithRagService {
    constructor() {
        this.geminiAdapter = new gemini_adapter_1.GeminiAdapter();
    }
    generateOpenAIResponseWithRag(prompt, systemMessage, ragData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, openai_adapter_1.generateOpenAiResponse)({
                prompt,
                systemMessage,
                ragData,
                model: "gpt-3.5-turbo",
                maxTokens: 1000,
                temperature: 0.7
            });
        });
    }
    /**
     * Generate text response using Gemini with RAG context
     */
    generateGeminiResponseWithRag(prompt, systemMessage, ragData) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.geminiAdapter.generateText({
                prompt,
                systemMessage,
                ragData,
                model: "gemini-1.5-flash",
                maxTokens: 1000,
                temperature: 0.7
            });
        });
    }
    /**
     * Generate images using Gemini with RAG context
     */
    generateGeminiImagesWithRag(prompt_1, ragData_1) {
        return __awaiter(this, arguments, void 0, function* (prompt, ragData, numberOfImages = 1, s3KeyPrefix = "rag-generated-images") {
            const ragContext = ragData ? this.formatRagContext(ragData) : "";
            const enhancedPrompt = `${prompt}${ragContext}`;
            const results = yield Promise.all(Array.from({ length: numberOfImages }, () => (0, imageGeneration_service_1.generateImageWithGemini)(enhancedPrompt, s3KeyPrefix)));
            return results.filter((url) => Boolean(url));
        });
    }
    /**
     * Generate video using Gemini with RAG context
     */
    generateGeminiVideoWithRag(prompt_1, downloadPath_1, ragData_1) {
        return __awaiter(this, arguments, void 0, function* (prompt, downloadPath, ragData, s3KeyPrefix = "rag-generated-videos") {
            return yield this.geminiAdapter.generateVideo({
                prompt,
                downloadPath,
                s3KeyPrefix,
                ragData
            });
        });
    }
    /**
     * Get RAG context from company embeddings using semantic similarity search
     */
    getCompanyRagContext(companyObjectId_1, query_1) {
        return __awaiter(this, arguments, void 0, function* (companyObjectId, query, maxContexts = 3) {
            var _a, _b, _c, _d, _e, _f, _g;
            try {
                const companySettings = yield companyEmbeddings_service_1.CompanyEmbeddingsService.getCompanyEmbeddings(companyObjectId);
                if (!companySettings) {
                    return { contexts: [] };
                }
                // Generate embedding for the query to find semantic similarity
                const queryEmbedding = yield (0, openai_adapter_1.getOpenAIEmbeddings)(query);
                // Calculate similarity between query and company content using embeddings
                let relevanceScore = 0.8; // Default high score for own company data
                if (companySettings.embedding && companySettings.embedding.length > 0 && queryEmbedding.length > 0) {
                    // Calculate cosine similarity
                    const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * (companySettings.embedding[i] || 0), 0);
                    const magnitudeA = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
                    const magnitudeB = Math.sqrt(companySettings.embedding.reduce((sum, val) => sum + val * val, 0));
                    relevanceScore = dotProduct / (magnitudeA * magnitudeB);
                }
                const ragContext = {
                    id: String(companySettings.company_object_id),
                    content: companySettings.content,
                    metadata: Object.assign({ 
                        // Use stored metadata from database
                        source: ((_a = companySettings.metadata) === null || _a === void 0 ? void 0 : _a.source) || "company_profile", type: ((_b = companySettings.metadata) === null || _b === void 0 ? void 0 : _b.type) || "company_settings", relevanceScore: relevanceScore, timestamp: ((_c = companySettings.metadata) === null || _c === void 0 ? void 0 : _c.lastUpdated) || new Date(), 
                        // Add additional metadata from the stored data
                        industry: (_d = companySettings.metadata) === null || _d === void 0 ? void 0 : _d.industry, companySize: (_e = companySettings.metadata) === null || _e === void 0 ? void 0 : _e.companySize, contentLength: (_f = companySettings.metadata) === null || _f === void 0 ? void 0 : _f.contentLength, embeddingDimensions: (_g = companySettings.metadata) === null || _g === void 0 ? void 0 : _g.embeddingDimensions, tags: companySettings.tags, language: companySettings.language }, companySettings.metadata)
                };
                console.log(`RAG Context created with relevance score: ${relevanceScore}`);
                console.log(`Company content length: ${companySettings.content.length}`);
                return {
                    contexts: [ragContext],
                    query,
                    maxContexts,
                    relevanceThreshold: 0 // Always include company context (set to 0)
                };
            }
            catch (error) {
                console.error("Error getting company RAG context:", error);
                return { contexts: [] };
            }
        });
    }
    /**
     * Get RAG context using company embeddings (removed RAG service dependency)
     * This method now directly uses company embeddings for similarity search
     */
    getRagContext(companyId_1, query_1) {
        return __awaiter(this, arguments, void 0, function* (companyId, query, maxContexts = 5, relevanceThreshold = 0.5) {
            try {
                // Use getCompanyRagContext instead of RagService
                // since we already have embeddings in CompanySettings
                return yield this.getCompanyRagContext(companyId, query, maxContexts);
            }
            catch (error) {
                console.error("Error getting RAG context:", error);
                return { contexts: [] };
            }
        });
    }
    /**
     * Combine multiple RAG data sources
     */
    combineRagData(ragDataSources) {
        const allContexts = [];
        let maxContexts = 5;
        let relevanceThreshold = 0.5;
        let query = "";
        ragDataSources.forEach(ragData => {
            allContexts.push(...ragData.contexts);
            if (ragData.maxContexts)
                maxContexts = Math.max(maxContexts, ragData.maxContexts);
            if (ragData.relevanceThreshold)
                relevanceThreshold = Math.min(relevanceThreshold, ragData.relevanceThreshold);
            if (ragData.query)
                query = ragData.query;
        });
        // Sort by relevance score and limit
        const sortedContexts = allContexts
            .filter(context => {
            var _a;
            return !relevanceThreshold ||
                !((_a = context.metadata) === null || _a === void 0 ? void 0 : _a.relevanceScore) ||
                context.metadata.relevanceScore >= relevanceThreshold;
        })
            .sort((a, b) => { var _a, _b; return (((_a = b.metadata) === null || _a === void 0 ? void 0 : _a.relevanceScore) || 0) - (((_b = a.metadata) === null || _b === void 0 ? void 0 : _b.relevanceScore) || 0); })
            .slice(0, maxContexts);
        return {
            contexts: sortedContexts,
            query,
            maxContexts,
            relevanceThreshold
        };
    }
    formatRagContext(ragData) {
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
            .map((context, index) => { var _a; return `Context ${index + 1} (${((_a = context.metadata) === null || _a === void 0 ? void 0 : _a.source) || "unknown"}):\n${context.content}`; })
            .join("\n\n");
        return `\n\nRelevant Context Information:\n${contextString}\n\nPlease use this context information to provide more accurate and relevant responses.`;
    }
}
exports.LLMWithRagService = LLMWithRagService;
