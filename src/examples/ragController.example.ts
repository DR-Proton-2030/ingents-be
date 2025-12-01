import { Request, Response } from "express";
import { LLMWithRagService } from "../services/llmWithRag/llmWithRag.service";
import { RagMetadataService } from "../services/ragMetadata/ragMetadata.service";
import { IRagData, IRagContext } from "../types/interface/ragData.interface";

/**
 * Example controller showing how to handle RAG data with metadata in API endpoints
 */

export class RagController {
  private llmService: LLMWithRagService;

  constructor() {
    this.llmService = new LLMWithRagService();
  }

  /**
   * Generate content with company RAG data and metadata
   * POST /api/v1/rag/generate-with-company-data
   */
  async generateWithCompanyData(req: Request, res: Response) {
    try {
      const {
        companyObjectId,
        prompt,
        systemMessage,
        includeMetadata = true,
        filterOptions = {}
      } = req.body;

      // Get company RAG data (includes stored metadata)
      let ragData = await this.llmService.getCompanyRagContext(
        companyObjectId,
        prompt,
        filterOptions.maxContexts || 3
      );

      // Apply metadata filters if specified
      if (filterOptions.minRelevanceScore || filterOptions.sources) {
        ragData = RagMetadataService.filterByMetadata(ragData, filterOptions);
      }

      // Enhance with request metadata
      ragData = RagMetadataService.enhanceRagData(ragData, {
        requestId: `req_${Date.now()}`,
        userId: req.user?._id, // From auth middleware
        timestamp: new Date(),
        endpoint: 'generate-with-company-data'
      });

      // Generate content
      const response = await this.llmService.generateOpenAIResponseWithRag(
        prompt,
        systemMessage,
        ragData
      );

      if (!response) {
        throw new Error("Failed to generate response");
      }

      // Return response with metadata if requested
      const result: any = {
        content: response.parsedContent,
        prompt: response.originalPrompt
      };

      if (includeMetadata) {
        result.metadata = {
          ragContextsUsed: ragData.contexts.length,
          sources: [...new Set(ragData.contexts.map((c: IRagContext) => c.metadata?.source))],
          averageRelevance: ragData.contexts.reduce((sum: number, c: IRagContext) => sum + (c.metadata?.relevanceScore || 0), 0) / ragData.contexts.length,
          enhancedPrompt: response.prompt
        };
      }

      res.status(200).json({
        message: "Content generated successfully",
        data: result
      });

    } catch (error) {
      console.error("Generate with company data error:", error);
      res.status(500).json({
        message: "Failed to generate content",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Create custom RAG data with metadata
   * POST /api/v1/rag/create-custom-rag
   */
  async createCustomRag(req: Request, res: Response) {
    try {
      const {
        contexts,
        metadataConfig = {},
        query,
        maxContexts = 5,
        relevanceThreshold = 0.5
      } = req.body;

      // Create RAG contexts with metadata
      const ragContexts: IRagContext[] = contexts.map((contextData: any, index: number) => {
        let metadata;

        // Generate metadata based on content type
        switch (contextData.type) {
          case 'company':
            metadata = RagMetadataService.createCompanyMetadata(
              contextData.company,
              { ...metadataConfig, relevanceScore: contextData.relevanceScore || 0.8 }
            );
            break;
            
          case 'document':
            metadata = RagMetadataService.createDocumentMetadata(
              contextData.documentInfo,
              { ...metadataConfig, relevanceScore: contextData.relevanceScore || 0.7 }
            );
            break;
            
          case 'web':
            metadata = RagMetadataService.createWebScrapedMetadata(
              contextData.webInfo,
              { ...metadataConfig, relevanceScore: contextData.relevanceScore || 0.6 }
            );
            break;
            
          case 'user_content':
            metadata = RagMetadataService.createUserContentMetadata(
              contextData.userInfo,
              { ...metadataConfig, relevanceScore: contextData.relevanceScore || 0.9 }
            );
            break;
            
          default:
            // Custom metadata
            metadata = {
              source: contextData.source || 'custom',
              type: contextData.type || 'unknown',
              relevanceScore: contextData.relevanceScore || 0.5,
              timestamp: new Date(),
              ...contextData.customMetadata
            };
        }

        return {
          id: contextData.id || `context_${index}`,
          content: contextData.content,
          metadata
        };
      });

      const ragData: IRagData = {
        contexts: ragContexts,
        query,
        maxContexts,
        relevanceThreshold
      };

      // Get statistics
      const stats = RagMetadataService.getMetadataStats(ragData);

      res.status(200).json({
        message: "Custom RAG data created successfully", 
        data: {
          ragData,
          statistics: stats
        }
      });

    } catch (error) {
      console.error("Create custom RAG error:", error);
      res.status(500).json({
        message: "Failed to create custom RAG data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Get RAG data statistics
   * GET /api/v1/rag/stats/:companyObjectId
   */
  async getRagStats(req: Request, res: Response) {
    try {
      const { companyObjectId } = req.params;
      const { includeDetailedMetadata = false } = req.query;

      // Get company RAG data
      const ragData = await this.llmService.getCompanyRagContext(
        companyObjectId,
        "statistics query"
      );

      // Get statistics
      const stats = RagMetadataService.getMetadataStats(ragData);

      const result: any = { stats };

      if (includeDetailedMetadata === 'true') {
        result.detailedMetadata = ragData.contexts.map((context: IRagContext) => ({
          id: context.id,
          contentLength: context.content.length,
          metadata: context.metadata
        }));
      }

      res.status(200).json({
        message: "RAG statistics retrieved successfully",
        data: result
      });

    } catch (error) {
      console.error("Get RAG stats error:", error);
      res.status(500).json({
        message: "Failed to get RAG statistics", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  /**
   * Filter and search RAG data by metadata
   * POST /api/v1/rag/search
   */
  async searchRagData(req: Request, res: Response) {
    try {
      const {
        companyObjectId,
        query,
        filters = {},
        sortBy,
        groupBy
      } = req.body;

      // Get company RAG data
      let ragData = await this.llmService.getCompanyRagContext(
        companyObjectId,
        query
      );

      // Apply filters
      if (Object.keys(filters).length > 0) {
        ragData = RagMetadataService.filterByMetadata(ragData, filters);
      }

      // Sort if specified
      if (sortBy) {
        ragData = RagMetadataService.sortByMetadata(ragData, sortBy);
      }

      let result: any = { ragData };

      // Group if specified
      if (groupBy) {
        const grouped = RagMetadataService.groupByMetadata(ragData, groupBy);
        result.groupedData = grouped;
        result.groupSummary = Object.keys(grouped).map(key => ({
          group: key,
          count: grouped[key].length,
          averageRelevance: grouped[key].reduce((sum: number, ctx: IRagContext) => sum + (ctx.metadata?.relevanceScore || 0), 0) / grouped[key].length
        }));
      }

      // Add statistics
      result.statistics = RagMetadataService.getMetadataStats(ragData);

      res.status(200).json({
        message: "RAG search completed successfully",
        data: result
      });

    } catch (error) {
      console.error("Search RAG data error:", error);
      res.status(500).json({
        message: "Failed to search RAG data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
}