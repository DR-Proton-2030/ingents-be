import { generateOpenAiResponse } from "../../adapter/llm/openai.adapter";
import { GeminiAdapter } from "../../adapter/llm/gemini.adapter";
import { IRagData, IRagContext } from "../../types/interface/ragData.interface";
import { CompanyEmbeddingsService } from "../companyEmbeddings/companyEmbeddings.service";
import { RagService } from "../ragService/RagService";

export class LLMWithRagService {
  private geminiAdapter: GeminiAdapter;

  constructor() {
    this.geminiAdapter = new GeminiAdapter();
  }

  /**
   * Generate text response using OpenAI with RAG context
   */
  async generateOpenAIResponseWithRag(
    prompt: string,
    systemMessage: string,
    ragData?: IRagData
  ) {
    return await generateOpenAiResponse({
      prompt,
      systemMessage,
      ragData,
      model: "gpt-3.5-turbo",
      maxTokens: 1000,
      temperature: 0.7
    });
  }

  /**
   * Generate text response using Gemini with RAG context
   */
  async generateGeminiResponseWithRag(
    prompt: string,
    systemMessage: string,
    ragData?: IRagData
  ) {
    return await this.geminiAdapter.generateText({
      prompt,
      systemMessage,
      ragData,
      model: "gemini-1.5-flash",
      maxTokens: 1000,
      temperature: 0.7
    });
  }

  /**
   * Generate images using Gemini with RAG context
   */
  async generateGeminiImagesWithRag(
    prompt: string,
    ragData?: IRagData,
    numberOfImages: number = 1,
    s3KeyPrefix: string = "rag-generated-images"
  ) {
    return await this.geminiAdapter.generateImages({
      prompt,
      numberOfImages,
      s3KeyPrefix,
      ragData
    });
  }

  /**
   * Generate video using Gemini with RAG context
   */
  async generateGeminiVideoWithRag(
    prompt: string,
    downloadPath: string,
    ragData?: IRagData,
    s3KeyPrefix: string = "rag-generated-videos"
  ) {
    return await this.geminiAdapter.generateVideo({
      prompt,
      downloadPath,
      s3KeyPrefix,
      ragData
    });
  }

  /**
   * Get RAG context from company embeddings
   */
  async getCompanyRagContext(
    companyObjectId: string,
    query: string,
    maxContexts: number = 3
  ): Promise<IRagData> {
    try {
      const companySettings = await CompanyEmbeddingsService.getCompanyEmbeddings(companyObjectId);
      
      if (!companySettings) {
        return { contexts: [] };
      }

      const ragContext: IRagContext = {
        id: String(companySettings.company_object_id),
        content: companySettings.content,
        metadata: {
          // Use stored metadata from database
          source: companySettings.metadata?.source || "company_profile",
          type: companySettings.metadata?.type || "company_settings",
          relevanceScore: 1.0, // Since this is the company's own data
          timestamp: companySettings.metadata?.lastUpdated || new Date(),
          // Add additional metadata from the stored data
          industry: companySettings.metadata?.industry,
          companySize: companySettings.metadata?.companySize,
          contentLength: companySettings.metadata?.contentLength,
          embeddingDimensions: companySettings.metadata?.embeddingDimensions,
          tags: companySettings.tags,
          language: companySettings.language,
          // Include any other stored metadata
          ...companySettings.metadata
        }
      };

      return {
        contexts: [ragContext],
        query,
        maxContexts,
        relevanceThreshold: 0.5
      };
    } catch (error) {
      console.error("Error getting company RAG context:", error);
      return { contexts: [] };
    }
  }

  /**
   * Get RAG context using RAG service
   */
  async getRagContext(
    companyId: string,
    query: string,
    maxContexts: number = 5,
    relevanceThreshold: number = 0.5
  ): Promise<IRagData> {
    try {
      const ragService = new RagService(companyId);
      const searchResults = await ragService.similaritySearch(query, maxContexts);

      const contexts: IRagContext[] = searchResults.map((result: any, index: number) => ({
        id: `${companyId}_${index}`,
        content: result.content,
        metadata: {
          source: result.metadata?.source || "rag_service",
          type: result.metadata?.type || "document",
          relevanceScore: result.similarity || 0,
          timestamp: result.metadata?.timestamp || new Date()
        }
      }));

      ragService.cleanup();

      return {
        contexts,
        query,
        maxContexts,
        relevanceThreshold
      };
    } catch (error) {
      console.error("Error getting RAG context:", error);
      return { contexts: [] };
    }
  }

  /**
   * Combine multiple RAG data sources
   */
  combineRagData(ragDataSources: IRagData[]): IRagData {
    const allContexts: IRagContext[] = [];
    let maxContexts = 5;
    let relevanceThreshold = 0.5;
    let query = "";

    ragDataSources.forEach(ragData => {
      allContexts.push(...ragData.contexts);
      if (ragData.maxContexts) maxContexts = Math.max(maxContexts, ragData.maxContexts);
      if (ragData.relevanceThreshold) relevanceThreshold = Math.min(relevanceThreshold, ragData.relevanceThreshold);
      if (ragData.query) query = ragData.query;
    });

    // Sort by relevance score and limit
    const sortedContexts = allContexts
      .filter(context => 
        !relevanceThreshold || 
        !context.metadata?.relevanceScore || 
        context.metadata.relevanceScore >= relevanceThreshold
      )
      .sort((a, b) => (b.metadata?.relevanceScore || 0) - (a.metadata?.relevanceScore || 0))
      .slice(0, maxContexts);

    return {
      contexts: sortedContexts,
      query,
      maxContexts,
      relevanceThreshold
    };
  }
}