import { IRagContext, IRagData } from "../../types/interface/ragData.interface";
import { ICompany } from "../../types/interface/company.interface";
import { ICompanySettings } from "../../types/interface/companySettings.interface";

export interface MetadataConfig {
  source: string;
  type: string;
  relevanceScore?: number;
  additionalFields?: Record<string, any>;
}

export class RagMetadataService {
  
  /**
   * Create metadata for company data
   */
  static createCompanyMetadata(
    company: ICompany, 
    config: Partial<MetadataConfig> = {}
  ): Record<string, any> {
    return {
      source: config.source || 'company_profile',
      type: config.type || 'company_data',
      relevanceScore: config.relevanceScore || 1.0,
      timestamp: new Date(),
      
      // Company-specific metadata
      companyId: String(company._id),
      companyName: company.company_name,
      industry: company.industry,
      companySize: company.company_size,
      foundingYear: company.founding_year,
      hasLogo: !!company.logo,
      hasWebsite: !!company.website,
      hasDescription: !!company.description,
      
      // Services and products
      servicesCount: company.services?.length || 0,
      productsCount: company.products?.length || 0,
      services: company.services || [],
      products: company.products || [],
      
      // Contact info availability
      hasPhone: !!company.phone_number,
      hasAddress: !!company.address,
      
      // Additional custom fields
      ...config.additionalFields
    };
  }

  /**
   * Create metadata for document chunks
   */
  static createDocumentMetadata(
    documentInfo: {
      documentId: string;
      documentName?: string;
      documentType?: string;
      chunkIndex?: number;
      totalChunks?: number;
    },
    config: Partial<MetadataConfig> = {}
  ): Record<string, any> {
    return {
      source: config.source || 'document',
      type: config.type || 'document_chunk',
      relevanceScore: config.relevanceScore || 0.8,
      timestamp: new Date(),
      
      // Document-specific metadata
      documentId: documentInfo.documentId,
      documentName: documentInfo.documentName,
      documentType: documentInfo.documentType,
      chunkIndex: documentInfo.chunkIndex,
      totalChunks: documentInfo.totalChunks,
      isFirstChunk: documentInfo.chunkIndex === 0,
      isLastChunk: documentInfo.chunkIndex === (documentInfo.totalChunks || 0) - 1,
      
      // Additional custom fields
      ...config.additionalFields
    };
  }

  /**
   * Create metadata for user-generated content
   */
  static createUserContentMetadata(
    userInfo: {
      userId: string;
      contentType: string;
      category?: string;
    },
    config: Partial<MetadataConfig> = {}
  ): Record<string, any> {
    return {
      source: config.source || 'user_content',
      type: config.type || userInfo.contentType,
      relevanceScore: config.relevanceScore || 0.9,
      timestamp: new Date(),
      
      // User content metadata
      userId: userInfo.userId,
      contentType: userInfo.contentType,
      category: userInfo.category,
      
      // Additional custom fields
      ...config.additionalFields
    };
  }

  /**
   * Create metadata for web-scraped content
   */
  static createWebScrapedMetadata(
    webInfo: {
      url: string;
      title?: string;
      domain?: string;
      scrapedAt?: Date;
    },
    config: Partial<MetadataConfig> = {}
  ): Record<string, any> {
    return {
      source: config.source || 'web_scraped',
      type: config.type || 'web_content',
      relevanceScore: config.relevanceScore || 0.7,
      timestamp: new Date(),
      
      // Web scraping metadata
      url: webInfo.url,
      title: webInfo.title,
      domain: webInfo.domain || new URL(webInfo.url).hostname,
      scrapedAt: webInfo.scrapedAt || new Date(),
      
      // Additional custom fields
      ...config.additionalFields
    };
  }

  /**
   * Create RAG context with metadata from company settings
   */
  static createRagContextFromCompanySettings(
    companySettings: ICompanySettings,
    overrideMetadata?: Partial<Record<string, any>>
  ): IRagContext {
    return {
      id: String(companySettings.company_object_id),
      content: companySettings.content,
      metadata: {
        // Base metadata
        source: 'company_settings',
        type: 'stored_embeddings',
        relevanceScore: 1.0,
        timestamp: new Date(),
        
        // From stored metadata
        ...companySettings.metadata,
        
        // From schema fields
        tags: companySettings.tags,
        language: companySettings.language,
        agents: companySettings.agents,
        
        // Override with custom metadata
        ...overrideMetadata
      }
    };
  }

  /**
   * Enhance existing RAG data with additional metadata
   */
  static enhanceRagData(
    ragData: IRagData,
    enhancementMetadata: Record<string, any>
  ): IRagData {
    const enhancedContexts = ragData.contexts.map(context => ({
      ...context,
      metadata: {
        ...context.metadata,
        ...enhancementMetadata,
        enhancedAt: new Date()
      }
    }));

    return {
      ...ragData,
      contexts: enhancedContexts
    };
  }

  /**
   * Filter RAG contexts by metadata criteria
   */
  static filterByMetadata(
    ragData: IRagData,
    filters: {
      sources?: string[];
      types?: string[];
      minRelevanceScore?: number;
      maxAge?: number; // in milliseconds
      customFilter?: (metadata: any) => boolean;
    }
  ): IRagData {
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

    return {
      ...ragData,
      contexts: filteredContexts
    };
  }

  /**
   * Sort RAG contexts by metadata criteria
   */
  static sortByMetadata(
    ragData: IRagData,
    sortBy: {
      field: string;
      order: 'asc' | 'desc';
    }
  ): IRagData {
    const sortedContexts = [...ragData.contexts].sort((a, b) => {
      const aValue = a.metadata?.[sortBy.field];
      const bValue = b.metadata?.[sortBy.field];
      
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      
      let comparison = 0;
      if (aValue > bValue) comparison = 1;
      else if (aValue < bValue) comparison = -1;
      
      return sortBy.order === 'desc' ? -comparison : comparison;
    });

    return {
      ...ragData,
      contexts: sortedContexts
    };
  }

  /**
   * Group RAG contexts by metadata field
   */
  static groupByMetadata(
    ragData: IRagData,
    groupBy: string
  ): Record<string, IRagContext[]> {
    const groups: Record<string, IRagContext[]> = {};
    
    ragData.contexts.forEach(context => {
      const groupKey = context.metadata?.[groupBy] || 'undefined';
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
  static getMetadataStats(ragData: IRagData): Record<string, any> {
    const stats = {
      totalContexts: ragData.contexts.length,
      sources: new Set<string>(),
      types: new Set<string>(),
      relevanceScores: [] as number[],
      averageRelevance: 0,
      oldestTimestamp: null as Date | null,
      newestTimestamp: null as Date | null
    };

    ragData.contexts.forEach(context => {
      const metadata = context.metadata || {};
      
      if (metadata.source) stats.sources.add(metadata.source);
      if (metadata.type) stats.types.add(metadata.type);
      if (metadata.relevanceScore) stats.relevanceScores.push(metadata.relevanceScore);
      
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

    return {
      ...stats,
      sources: Array.from(stats.sources),
      types: Array.from(stats.types)
    };
  }
}