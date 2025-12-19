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
exports.RagController = void 0;
const llmWithRag_service_1 = require("../services/llmWithRag/llmWithRag.service");
const ragMetadata_service_1 = require("../services/ragMetadata/ragMetadata.service");
/**
 * Example controller showing how to handle RAG data with metadata in API endpoints
 */
class RagController {
    constructor() {
        this.llmService = new llmWithRag_service_1.LLMWithRagService();
    }
    /**
     * Generate content with company RAG data and metadata
     * POST /api/v1/rag/generate-with-company-data
     */
    generateWithCompanyData(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { companyObjectId, prompt, systemMessage, includeMetadata = true, filterOptions = {} } = req.body;
                // Get company RAG data (includes stored metadata)
                let ragData = yield this.llmService.getCompanyRagContext(companyObjectId, prompt, filterOptions.maxContexts || 3);
                // Apply metadata filters if specified
                if (filterOptions.minRelevanceScore || filterOptions.sources) {
                    ragData = ragMetadata_service_1.RagMetadataService.filterByMetadata(ragData, filterOptions);
                }
                // Enhance with request metadata
                ragData = ragMetadata_service_1.RagMetadataService.enhanceRagData(ragData, {
                    requestId: `req_${Date.now()}`,
                    userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id, // From auth middleware
                    timestamp: new Date(),
                    endpoint: 'generate-with-company-data'
                });
                // Generate content
                const response = yield this.llmService.generateOpenAIResponseWithRag(prompt, systemMessage, ragData);
                if (!response) {
                    throw new Error("Failed to generate response");
                }
                // Return response with metadata if requested
                const result = {
                    content: response.parsedContent,
                    prompt: response.originalPrompt
                };
                if (includeMetadata) {
                    result.metadata = {
                        ragContextsUsed: ragData.contexts.length,
                        sources: [...new Set(ragData.contexts.map((c) => { var _a; return (_a = c.metadata) === null || _a === void 0 ? void 0 : _a.source; }))],
                        averageRelevance: ragData.contexts.reduce((sum, c) => { var _a; return sum + (((_a = c.metadata) === null || _a === void 0 ? void 0 : _a.relevanceScore) || 0); }, 0) / ragData.contexts.length,
                        enhancedPrompt: response.prompt
                    };
                }
                res.status(200).json({
                    message: "Content generated successfully",
                    data: result
                });
            }
            catch (error) {
                console.error("Generate with company data error:", error);
                res.status(500).json({
                    message: "Failed to generate content",
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        });
    }
    /**
     * Create custom RAG data with metadata
     * POST /api/v1/rag/create-custom-rag
     */
    createCustomRag(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { contexts, metadataConfig = {}, query, maxContexts = 5, relevanceThreshold = 0.5 } = req.body;
                // Create RAG contexts with metadata
                const ragContexts = contexts.map((contextData, index) => {
                    let metadata;
                    // Generate metadata based on content type
                    switch (contextData.type) {
                        case 'company':
                            metadata = ragMetadata_service_1.RagMetadataService.createCompanyMetadata(contextData.company, Object.assign(Object.assign({}, metadataConfig), { relevanceScore: contextData.relevanceScore || 0.8 }));
                            break;
                        case 'document':
                            metadata = ragMetadata_service_1.RagMetadataService.createDocumentMetadata(contextData.documentInfo, Object.assign(Object.assign({}, metadataConfig), { relevanceScore: contextData.relevanceScore || 0.7 }));
                            break;
                        case 'web':
                            metadata = ragMetadata_service_1.RagMetadataService.createWebScrapedMetadata(contextData.webInfo, Object.assign(Object.assign({}, metadataConfig), { relevanceScore: contextData.relevanceScore || 0.6 }));
                            break;
                        case 'user_content':
                            metadata = ragMetadata_service_1.RagMetadataService.createUserContentMetadata(contextData.userInfo, Object.assign(Object.assign({}, metadataConfig), { relevanceScore: contextData.relevanceScore || 0.9 }));
                            break;
                        default:
                            // Custom metadata
                            metadata = Object.assign({ source: contextData.source || 'custom', type: contextData.type || 'unknown', relevanceScore: contextData.relevanceScore || 0.5, timestamp: new Date() }, contextData.customMetadata);
                    }
                    return {
                        id: contextData.id || `context_${index}`,
                        content: contextData.content,
                        metadata
                    };
                });
                const ragData = {
                    contexts: ragContexts,
                    query,
                    maxContexts,
                    relevanceThreshold
                };
                // Get statistics
                const stats = ragMetadata_service_1.RagMetadataService.getMetadataStats(ragData);
                res.status(200).json({
                    message: "Custom RAG data created successfully",
                    data: {
                        ragData,
                        statistics: stats
                    }
                });
            }
            catch (error) {
                console.error("Create custom RAG error:", error);
                res.status(500).json({
                    message: "Failed to create custom RAG data",
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        });
    }
    /**
     * Get RAG data statistics
     * GET /api/v1/rag/stats/:companyObjectId
     */
    getRagStats(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { companyObjectId } = req.params;
                const { includeDetailedMetadata = false } = req.query;
                // Get company RAG data
                const ragData = yield this.llmService.getCompanyRagContext(companyObjectId, "statistics query");
                // Get statistics
                const stats = ragMetadata_service_1.RagMetadataService.getMetadataStats(ragData);
                const result = { stats };
                if (includeDetailedMetadata === 'true') {
                    result.detailedMetadata = ragData.contexts.map((context) => ({
                        id: context.id,
                        contentLength: context.content.length,
                        metadata: context.metadata
                    }));
                }
                res.status(200).json({
                    message: "RAG statistics retrieved successfully",
                    data: result
                });
            }
            catch (error) {
                console.error("Get RAG stats error:", error);
                res.status(500).json({
                    message: "Failed to get RAG statistics",
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        });
    }
    /**
     * Filter and search RAG data by metadata
     * POST /api/v1/rag/search
     */
    searchRagData(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { companyObjectId, query, filters = {}, sortBy, groupBy } = req.body;
                // Get company RAG data
                let ragData = yield this.llmService.getCompanyRagContext(companyObjectId, query);
                // Apply filters
                if (Object.keys(filters).length > 0) {
                    ragData = ragMetadata_service_1.RagMetadataService.filterByMetadata(ragData, filters);
                }
                // Sort if specified
                if (sortBy) {
                    ragData = ragMetadata_service_1.RagMetadataService.sortByMetadata(ragData, sortBy);
                }
                let result = { ragData };
                // Group if specified
                if (groupBy) {
                    const grouped = ragMetadata_service_1.RagMetadataService.groupByMetadata(ragData, groupBy);
                    result.groupedData = grouped;
                    result.groupSummary = Object.keys(grouped).map(key => ({
                        group: key,
                        count: grouped[key].length,
                        averageRelevance: grouped[key].reduce((sum, ctx) => { var _a; return sum + (((_a = ctx.metadata) === null || _a === void 0 ? void 0 : _a.relevanceScore) || 0); }, 0) / grouped[key].length
                    }));
                }
                // Add statistics
                result.statistics = ragMetadata_service_1.RagMetadataService.getMetadataStats(ragData);
                res.status(200).json({
                    message: "RAG search completed successfully",
                    data: result
                });
            }
            catch (error) {
                console.error("Search RAG data error:", error);
                res.status(500).json({
                    message: "Failed to search RAG data",
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            }
        });
    }
}
exports.RagController = RagController;
