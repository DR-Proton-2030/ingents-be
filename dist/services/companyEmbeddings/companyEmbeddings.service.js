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
exports.CompanyEmbeddingsService = void 0;
const openai_adapter_1 = require("../../adapter/llm/openai.adapter");
const CompanySettings_model_1 = __importDefault(require("../../models/companySettings/CompanySettings.model"));
const RagService_1 = require("../ragService/RagService");
class CompanyEmbeddingsService {
    static generateCompanyContent(company, additionalContext) {
        const contentParts = [];
        // Company basic information
        if (company.company_name) {
            contentParts.push(`Company Name: ${company.company_name}`);
        }
        if (company.logo) {
            contentParts.push(`Company Logo URL: ${company.logo}`);
        }
        if (company.description) {
            contentParts.push(`Company Description: ${company.description}`);
        }
        if (company.website) {
            contentParts.push(`Website: ${company.website}`);
        }
        if (company.address) {
            contentParts.push(`Address: ${company.address}`);
        }
        if (company.phone_number) {
            contentParts.push(`Phone: ${company.phone_number}`);
        }
        if (company.industry) {
            contentParts.push(`Industry: ${company.industry}`);
        }
        if (company.company_size) {
            contentParts.push(`Company Size: ${company.company_size}`);
        }
        if (company.founding_year) {
            contentParts.push(`Founded: ${company.founding_year}`);
        }
        // Add services/products if available
        if (company.services && company.services.length > 0) {
            contentParts.push(`Services: ${company.services.join(', ')}`);
        }
        if (company.products && company.products.length > 0) {
            contentParts.push(`Products: ${company.products.join(', ')}`);
        }
        // Add any additional context provided
        if (additionalContext && additionalContext.length > 0) {
            contentParts.push(...additionalContext);
        }
        return contentParts.join('\n');
    }
    static generateCompanyTags(company) {
        const tags = [];
        if (company.industry) {
            tags.push(company.industry.toLowerCase());
        }
        if (company.company_size) {
            tags.push(company.company_size.toLowerCase().replace(/\s+/g, '_'));
        }
        // Extract keywords from company name and description
        const textToAnalyze = `${company.company_name || ''} ${company.description || ''}`;
        const keywords = textToAnalyze
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !['company', 'business', 'service', 'solution', 'and', 'the', 'for', 'with'].includes(word))
            .slice(0, 5); // Limit to top 5 keywords
        tags.push(...keywords);
        return [...new Set(tags)]; // Remove duplicates
    }
    static createCompanyEmbeddings(companyData, session) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const { company, additionalContext } = companyData;
                if (!company._id) {
                    throw new Error('Company must have an _id to create embeddings');
                }
                // Generate comprehensive content for embedding
                const companyContent = this.generateCompanyContent(company, additionalContext);
                if (!companyContent.trim()) {
                    throw new Error('No content available to generate embeddings');
                }
                console.log(`Generating embeddings for company: ${company.company_name}`);
                console.log(`Content length: ${companyContent.length} characters`);
                // Create RAG service for this company
                const ragService = new RagService_1.RagService(String(company._id));
                // Process the content and get embeddings
                //   const vectorChunks = await ragService.processText(companyContent, {
                //     type: 'company_profile',
                //     companyId: String(company._id),
                //     companyName: company.company_name,
                //     industry: company.industry,
                //     createdAt: new Date()
                //   });
                // For company settings, we'll store the embedding of the main content
                const mainEmbedding = yield (0, openai_adapter_1.getOpenAIEmbeddings)(companyContent);
                // Generate tags
                const tags = this.generateCompanyTags(company);
                const language = 'en';
                // Create comprehensive metadata
                const metadata = {
                    source: 'company_profile',
                    type: 'company_embeddings',
                    industry: company.industry || 'unknown',
                    companySize: company.company_size || 'unknown',
                    lastUpdated: new Date(),
                    documentCount: 1,
                    averageRelevance: 1.0,
                    contentLength: companyContent.length,
                    embeddingDimensions: mainEmbedding.length,
                    foundingYear: company.founding_year,
                    hasLogo: !!company.logo,
                    hasWebsite: !!company.website,
                    servicesCount: ((_a = company.services) === null || _a === void 0 ? void 0 : _a.length) || 0,
                    productsCount: ((_b = company.products) === null || _b === void 0 ? void 0 : _b.length) || 0,
                    additionalContextProvided: !!additionalContext && additionalContext.length > 0
                };
                // Create company settings payload
                const companySettingsPayload = {
                    company_object_id: company._id,
                    content: companyContent,
                    embedding: mainEmbedding,
                    tags,
                    language,
                    metadata
                };
                // Save to database
                const companySettings = yield new CompanySettings_model_1.default(companySettingsPayload).save(session ? { session } : {});
                // Cleanup RAG service
                ragService.cleanup();
                console.log(`Company embeddings created successfully for: ${company.company_name}`);
                console.log(`Generated ${tags.length} tags and ${mainEmbedding.length}-dimensional embedding`);
                return companySettings;
            }
            catch (error) {
                console.error('Error creating company embeddings:', error);
                throw new Error(`Failed to create company embeddings: ${error}`);
            }
        });
    }
    static updateCompanyEmbeddings(companyObjectId, companyData, session) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { company, additionalContext } = companyData;
                // Generate new content and embeddings
                const companyContent = this.generateCompanyContent(company, additionalContext);
                if (!companyContent.trim()) {
                    throw new Error('No content available to update embeddings');
                }
                const mainEmbedding = yield (0, openai_adapter_1.getOpenAIEmbeddings)(companyContent);
                const tags = this.generateCompanyTags(company);
                const language = 'en';
                // Update existing company settings
                const updatedSettings = yield CompanySettings_model_1.default.findOneAndUpdate({ company_object_id: companyObjectId }, {
                    content: companyContent,
                    embedding: mainEmbedding,
                    tags,
                    language
                }, {
                    new: true,
                    session: session || undefined
                });
                console.log(`Company embeddings updated successfully for company: ${companyObjectId}`);
                return updatedSettings;
            }
            catch (error) {
                console.error('Error updating company embeddings:', error);
                throw new Error(`Failed to update company embeddings: ${error}`);
            }
        });
    }
    static getCompanyEmbeddings(companyObjectId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const companySettings = yield CompanySettings_model_1.default.findOne({
                    company_object_id: companyObjectId
                });
                return companySettings;
            }
            catch (error) {
                console.error('Error fetching company embeddings:', error);
                throw new Error(`Failed to fetch company embeddings: ${error}`);
            }
        });
    }
    static deleteCompanyEmbeddings(companyObjectId, session) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield CompanySettings_model_1.default.deleteOne({ company_object_id: companyObjectId }, session ? { session } : {});
                return result.deletedCount > 0;
            }
            catch (error) {
                console.error('Error deleting company embeddings:', error);
                throw new Error(`Failed to delete company embeddings: ${error}`);
            }
        });
    }
    static findSimilarCompanies(queryEmbedding_1) {
        return __awaiter(this, arguments, void 0, function* (queryEmbedding, limit = 5, excludeCompanyId) {
            try {
                // This is a basic implementation. For production, you'd want to use a proper vector database
                const allCompanySettings = yield CompanySettings_model_1.default.find(excludeCompanyId ? { company_object_id: { $ne: excludeCompanyId } } : {}).limit(limit * 2); // Get more than needed for filtering
                // Calculate similarities (basic implementation)
                const similarities = allCompanySettings.map(settings => {
                    if (!settings.embedding || settings.embedding.length === 0) {
                        return { settings, similarity: 0 };
                    }
                    // Simple cosine similarity
                    const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * (settings.embedding[i] || 0), 0);
                    const magnitudeA = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
                    const magnitudeB = Math.sqrt(settings.embedding.reduce((sum, val) => sum + val * val, 0));
                    const similarity = dotProduct / (magnitudeA * magnitudeB);
                    return { settings, similarity };
                });
                // Sort by similarity and return top results
                return similarities
                    .sort((a, b) => b.similarity - a.similarity)
                    .slice(0, limit)
                    .map(item => item.settings);
            }
            catch (error) {
                console.error('Error finding similar companies:', error);
                throw new Error(`Failed to find similar companies: ${error}`);
            }
        });
    }
}
exports.CompanyEmbeddingsService = CompanyEmbeddingsService;
