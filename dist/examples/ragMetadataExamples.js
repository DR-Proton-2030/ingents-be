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
exports.RagMetadataExamples = void 0;
const llmWithRag_service_1 = require("../services/llmWithRag/llmWithRag.service");
const ragMetadata_service_1 = require("../services/ragMetadata/ragMetadata.service");
/**
 * Examples of how to set, store, and use metadata in RAG system
 */
class RagMetadataExamples {
    constructor() {
        this.llmService = new llmWithRag_service_1.LLMWithRagService();
    }
    /**
     * Example 1: Creating RAG data with company metadata
     */
    createCompanyRagWithMetadata(company) {
        return __awaiter(this, void 0, void 0, function* () {
            // Method 1: Using RagMetadataService to create comprehensive metadata
            const metadata = ragMetadata_service_1.RagMetadataService.createCompanyMetadata(company, {
                source: 'company_database',
                type: 'company_profile',
                relevanceScore: 1.0,
                additionalFields: {
                    dataQuality: 'high',
                    lastVerified: new Date(),
                    completeness: 0.95
                }
            });
            const ragContext = {
                id: `company_${company._id}`,
                content: `Company: ${company.company_name}. Industry: ${company.industry}. Description: ${company.description}`,
                metadata
            };
            const ragData = {
                contexts: [ragContext],
                query: 'company information',
                maxContexts: 5,
                relevanceThreshold: 0.7
            };
            return ragData;
        });
    }
    /**
     * Example 2: Creating RAG data from multiple document chunks
     */
    createDocumentRagWithMetadata() {
        return __awaiter(this, void 0, void 0, function* () {
            const documentChunks = [
                {
                    content: "Our company was founded in 2020 with a vision to...",
                    documentId: "doc_001",
                    documentName: "Company History",
                    chunkIndex: 0,
                    totalChunks: 3
                },
                {
                    content: "We offer AI-powered solutions for businesses...",
                    documentId: "doc_001",
                    documentName: "Company History",
                    chunkIndex: 1,
                    totalChunks: 3
                }
            ];
            const contexts = documentChunks.map((chunk, index) => {
                const metadata = ragMetadata_service_1.RagMetadataService.createDocumentMetadata({
                    documentId: chunk.documentId,
                    documentName: chunk.documentName,
                    documentType: 'company_history',
                    chunkIndex: chunk.chunkIndex,
                    totalChunks: chunk.totalChunks
                }, {
                    source: 'document_store',
                    type: 'document_chunk',
                    relevanceScore: 0.8 - (index * 0.1), // Decreasing relevance
                    additionalFields: {
                        wordCount: chunk.content.split(' ').length,
                        extractedAt: new Date()
                    }
                });
                return {
                    id: `${chunk.documentId}_chunk_${chunk.chunkIndex}`,
                    content: chunk.content,
                    metadata
                };
            });
            return {
                contexts,
                query: 'document search',
                maxContexts: 10,
                relevanceThreshold: 0.5
            };
        });
    }
    /**
     * Example 3: Creating RAG data from web-scraped content
     */
    createWebScrapedRagWithMetadata() {
        return __awaiter(this, void 0, void 0, function* () {
            const webContent = [
                {
                    content: "Latest news about the AI industry...",
                    url: "https://example.com/ai-news",
                    title: "AI Industry Trends 2024",
                    scrapedAt: new Date()
                }
            ];
            const contexts = webContent.map(item => {
                const metadata = ragMetadata_service_1.RagMetadataService.createWebScrapedMetadata({
                    url: item.url,
                    title: item.title,
                    scrapedAt: item.scrapedAt
                }, {
                    source: 'web_scraper',
                    type: 'news_article',
                    relevanceScore: 0.7,
                    additionalFields: {
                        contentLength: item.content.length,
                        isRecent: (Date.now() - item.scrapedAt.getTime()) < 24 * 60 * 60 * 1000 // Less than 24 hours
                    }
                });
                return {
                    id: `web_${Buffer.from(item.url).toString('base64').slice(0, 10)}`,
                    content: item.content,
                    metadata
                };
            });
            return { contexts };
        });
    }
    /**
     * Example 4: Using stored company settings with metadata
     */
    useStoredCompanyMetadata(companyObjectId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Get company RAG data (this will now include stored metadata)
            const ragData = yield this.llmService.getCompanyRagContext(companyObjectId, "company services and products");
            console.log("Stored metadata:", (_a = ragData.contexts[0]) === null || _a === void 0 ? void 0 : _a.metadata);
            // Enhance with additional runtime metadata
            const enhancedRagData = ragMetadata_service_1.RagMetadataService.enhanceRagData(ragData, {
                requestedAt: new Date(),
                requestedBy: 'user_123',
                queryContext: 'email_generation'
            });
            return enhancedRagData;
        });
    }
    /**
     * Example 5: Filtering RAG data by metadata
     */
    filterRagDataExample() {
        return __awaiter(this, void 0, void 0, function* () {
            // Create sample RAG data with different sources
            const mixedRagData = {
                contexts: [
                    {
                        id: "company_1",
                        content: "Company information...",
                        metadata: {
                            source: "company_profile",
                            type: "company_data",
                            relevanceScore: 0.9,
                            timestamp: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
                        }
                    },
                    {
                        id: "doc_1",
                        content: "Document content...",
                        metadata: {
                            source: "document_store",
                            type: "document_chunk",
                            relevanceScore: 0.6,
                            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
                        }
                    },
                    {
                        id: "web_1",
                        content: "Web scraped content...",
                        metadata: {
                            source: "web_scraper",
                            type: "news_article",
                            relevanceScore: 0.4,
                            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) // 1 week ago
                        }
                    }
                ]
            };
            // Filter by source and relevance
            const filteredData = ragMetadata_service_1.RagMetadataService.filterByMetadata(mixedRagData, {
                sources: ['company_profile', 'document_store'],
                minRelevanceScore: 0.7,
                maxAge: 1000 * 60 * 60 * 24 * 2, // 2 days
                customFilter: (metadata) => metadata.type !== 'news_article'
            });
            console.log(`Filtered from ${mixedRagData.contexts.length} to ${filteredData.contexts.length} contexts`);
            return filteredData;
        });
    }
    /**
     * Example 6: Sorting and grouping RAG data by metadata
     */
    sortAndGroupRagData() {
        return __awaiter(this, void 0, void 0, function* () {
            // Sample RAG data
            const ragData = {
                contexts: [
                    {
                        id: "1",
                        content: "Content 1",
                        metadata: { source: "docs", relevanceScore: 0.8, priority: "high" }
                    },
                    {
                        id: "2",
                        content: "Content 2",
                        metadata: { source: "web", relevanceScore: 0.9, priority: "medium" }
                    },
                    {
                        id: "3",
                        content: "Content 3",
                        metadata: { source: "docs", relevanceScore: 0.7, priority: "high" }
                    }
                ]
            };
            // Sort by relevance score (descending)
            const sortedData = ragMetadata_service_1.RagMetadataService.sortByMetadata(ragData, {
                field: 'relevanceScore',
                order: 'desc'
            });
            // Group by source
            const groupedBySource = ragMetadata_service_1.RagMetadataService.groupByMetadata(ragData, 'source');
            // Group by priority
            const groupedByPriority = ragMetadata_service_1.RagMetadataService.groupByMetadata(ragData, 'priority');
            console.log("Grouped by source:", Object.keys(groupedBySource));
            console.log("Grouped by priority:", Object.keys(groupedByPriority));
            return { sortedData, groupedBySource, groupedByPriority };
        });
    }
    /**
     * Example 7: Getting metadata statistics
     */
    getMetadataStatistics(ragData) {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = ragMetadata_service_1.RagMetadataService.getMetadataStats(ragData);
            console.log("RAG Data Statistics:");
            console.log(`- Total contexts: ${stats.totalContexts}`);
            console.log(`- Sources: ${stats.sources.join(', ')}`);
            console.log(`- Types: ${stats.types.join(', ')}`);
            console.log(`- Average relevance: ${stats.averageRelevance.toFixed(2)}`);
            console.log(`- Date range: ${stats.oldestTimestamp} to ${stats.newestTimestamp}`);
            return stats;
        });
    }
    /**
     * Example 8: Complete workflow with metadata handling
     */
    completeWorkflowExample(companyObjectId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Step 1: Get company RAG data with stored metadata
                const companyRag = yield this.llmService.getCompanyRagContext(companyObjectId, "company information");
                // Step 2: Create additional document-based RAG data
                const documentRag = yield this.createDocumentRagWithMetadata();
                // Step 3: Combine RAG sources
                const combinedRag = this.llmService.combineRagData([companyRag, documentRag]);
                // Step 4: Enhance with request metadata
                const enhancedRag = ragMetadata_service_1.RagMetadataService.enhanceRagData(combinedRag, {
                    requestId: 'req_' + Date.now(),
                    userAgent: 'email_generator',
                    processingStage: 'content_generation'
                });
                // Step 5: Filter for high-quality content
                const filteredRag = ragMetadata_service_1.RagMetadataService.filterByMetadata(enhancedRag, {
                    minRelevanceScore: 0.6,
                    maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
                });
                // Step 6: Sort by relevance
                const sortedRag = ragMetadata_service_1.RagMetadataService.sortByMetadata(filteredRag, {
                    field: 'relevanceScore',
                    order: 'desc'
                });
                // Step 7: Get statistics
                const stats = yield this.getMetadataStatistics(sortedRag);
                // Step 8: Generate content with processed RAG data
                const response = yield this.llmService.generateOpenAIResponseWithRag("Create a professional company introduction email", "You are a professional business writer. Use the provided context to create accurate, compelling content.", sortedRag);
                return {
                    response,
                    stats,
                    ragContextsUsed: sortedRag.contexts.length,
                    metadata: sortedRag.contexts.map(c => c.metadata)
                };
            }
            catch (error) {
                console.error("Complete workflow error:", error);
                throw error;
            }
        });
    }
}
exports.RagMetadataExamples = RagMetadataExamples;
// Export for use in other files
exports.default = RagMetadataExamples;
