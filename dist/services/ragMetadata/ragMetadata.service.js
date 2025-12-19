"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagMetadataService = void 0;
class RagMetadataService {
    /**
     * Create metadata for company data
     */
    static createCompanyMetadata(company, config = {}) {
        var _a, _b;
        return Object.assign({ source: config.source || 'company_profile', type: config.type || 'company_data', relevanceScore: config.relevanceScore || 1.0, timestamp: new Date(), 
            // Company-specific metadata
            companyId: String(company._id), companyName: company.company_name, industry: company.industry, companySize: company.company_size, foundingYear: company.founding_year, hasLogo: !!company.logo, hasWebsite: !!company.website, hasDescription: !!company.description, 
            // Services and products
            servicesCount: ((_a = company.services) === null || _a === void 0 ? void 0 : _a.length) || 0, productsCount: ((_b = company.products) === null || _b === void 0 ? void 0 : _b.length) || 0, services: company.services || [], products: company.products || [], 
            // Contact info availability
            hasPhone: !!company.phone_number, hasAddress: !!company.address }, config.additionalFields);
    }
    /**
     * Create metadata for document chunks
     */
    static createDocumentMetadata(documentInfo, config = {}) {
        return Object.assign({ source: config.source || 'document', type: config.type || 'document_chunk', relevanceScore: config.relevanceScore || 0.8, timestamp: new Date(), 
            // Document-specific metadata
            documentId: documentInfo.documentId, documentName: documentInfo.documentName, documentType: documentInfo.documentType, chunkIndex: documentInfo.chunkIndex, totalChunks: documentInfo.totalChunks, isFirstChunk: documentInfo.chunkIndex === 0, isLastChunk: documentInfo.chunkIndex === (documentInfo.totalChunks || 0) - 1 }, config.additionalFields);
    }
    /**
     * Create metadata for user-generated content
     */
    static createUserContentMetadata(userInfo, config = {}) {
        return Object.assign({ source: config.source || 'user_content', type: config.type || userInfo.contentType, relevanceScore: config.relevanceScore || 0.9, timestamp: new Date(), 
            // User content metadata
            userId: userInfo.userId, contentType: userInfo.contentType, category: userInfo.category }, config.additionalFields);
    }
    /**
     * Create metadata for web-scraped content
     */
    static createWebScrapedMetadata(webInfo, config = {}) {
        return Object.assign({ source: config.source || 'web_scraped', type: config.type || 'web_content', relevanceScore: config.relevanceScore || 0.7, timestamp: new Date(), 
            // Web scraping metadata
            url: webInfo.url, title: webInfo.title, domain: webInfo.domain || new URL(webInfo.url).hostname, scrapedAt: webInfo.scrapedAt || new Date() }, config.additionalFields);
    }
    /**
     * Create RAG context with metadata from company settings
     */
    static createRagContextFromCompanySettings(companySettings, overrideMetadata) {
        return {
            id: String(companySettings.company_object_id),
            content: companySettings.content,
            metadata: Object.assign(Object.assign(Object.assign({ 
                // Base metadata
                source: 'company_settings', type: 'stored_embeddings', relevanceScore: 1.0, timestamp: new Date() }, companySettings.metadata), { 
                // From schema fields
                tags: companySettings.tags, language: companySettings.language, agents: companySettings.agents }), overrideMetadata)
        };
    }
    /**
     * Enhance existing RAG data with additional metadata
     */
    static enhanceRagData(ragData, enhancementMetadata) {
        const enhancedContexts = ragData.contexts.map(context => (Object.assign(Object.assign({}, context), { metadata: Object.assign(Object.assign(Object.assign({}, context.metadata), enhancementMetadata), { enhancedAt: new Date() }) })));
        return Object.assign(Object.assign({}, ragData), { contexts: enhancedContexts });
    }
    /**
     * Filter RAG contexts by metadata criteria
     */
    static filterByMetadata(ragData, filters) {
        const filteredContexts = ragData.contexts.filter(context => {
            const metadata = context.metadata || {};
            // Filter by source
            if (filters.sources && metadata.source && !filters.sources.includes(metadata.source)) {
                return false;
            }
            // Filter by type
            if (filters.types && metadata.type && !filters.types.includes(metadata.type)) {
                return false;
            }
            // Filter by relevance score
            if (filters.minRelevanceScore &&
                (!metadata.relevanceScore || metadata.relevanceScore < filters.minRelevanceScore)) {
                return false;
            }
            // Filter by age
            if (filters.maxAge && metadata.timestamp) {
                const age = Date.now() - new Date(metadata.timestamp).getTime();
                if (age > filters.maxAge) {
                    return false;
                }
            }
            // Custom filter
            if (filters.customFilter && !filters.customFilter(metadata)) {
                return false;
            }
            return true;
        });
        return Object.assign(Object.assign({}, ragData), { contexts: filteredContexts });
    }
    /**
     * Sort RAG contexts by metadata criteria
     */
    static sortByMetadata(ragData, sortBy) {
        const sortedContexts = [...ragData.contexts].sort((a, b) => {
            var _a, _b;
            const aValue = (_a = a.metadata) === null || _a === void 0 ? void 0 : _a[sortBy.field];
            const bValue = (_b = b.metadata) === null || _b === void 0 ? void 0 : _b[sortBy.field];
            if (aValue === undefined && bValue === undefined)
                return 0;
            if (aValue === undefined)
                return 1;
            if (bValue === undefined)
                return -1;
            let comparison = 0;
            if (aValue > bValue)
                comparison = 1;
            else if (aValue < bValue)
                comparison = -1;
            return sortBy.order === 'desc' ? -comparison : comparison;
        });
        return Object.assign(Object.assign({}, ragData), { contexts: sortedContexts });
    }
    /**
     * Group RAG contexts by metadata field
     */
    static groupByMetadata(ragData, groupBy) {
        const groups = {};
        ragData.contexts.forEach(context => {
            var _a;
            const groupKey = ((_a = context.metadata) === null || _a === void 0 ? void 0 : _a[groupBy]) || 'undefined';
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(context);
        });
        return groups;
    }
    /**
     * Get metadata statistics from RAG data
     */
    static getMetadataStats(ragData) {
        const stats = {
            totalContexts: ragData.contexts.length,
            sources: new Set(),
            types: new Set(),
            relevanceScores: [],
            averageRelevance: 0,
            oldestTimestamp: null,
            newestTimestamp: null
        };
        ragData.contexts.forEach(context => {
            const metadata = context.metadata || {};
            if (metadata.source)
                stats.sources.add(metadata.source);
            if (metadata.type)
                stats.types.add(metadata.type);
            if (metadata.relevanceScore)
                stats.relevanceScores.push(metadata.relevanceScore);
            if (metadata.timestamp) {
                const timestamp = new Date(metadata.timestamp);
                if (!stats.oldestTimestamp || timestamp < stats.oldestTimestamp) {
                    stats.oldestTimestamp = timestamp;
                }
                if (!stats.newestTimestamp || timestamp > stats.newestTimestamp) {
                    stats.newestTimestamp = timestamp;
                }
            }
        });
        if (stats.relevanceScores.length > 0) {
            stats.averageRelevance = stats.relevanceScores.reduce((a, b) => a + b, 0) / stats.relevanceScores.length;
        }
        return Object.assign(Object.assign({}, stats), { sources: Array.from(stats.sources), types: Array.from(stats.types) });
    }
}
exports.RagMetadataService = RagMetadataService;
