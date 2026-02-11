import { generateOpenAiResponse, getOpenAIEmbeddings } from "../../adapter/llm/openai.adapter";
import { GeminiAdapter } from "../../adapter/llm/gemini.adapter";
import { IRagData, IRagContext } from "../../types/interface/ragData.interface";
import { CompanyEmbeddingsService } from "../companyEmbeddings/companyEmbeddings.service";
import { generateImageWithGemini } from "../imageGeneration/imageGeneration.service";

export class LLMWithRagService {
  private geminiAdapter: GeminiAdapter;

  constructor() {
    this.geminiAdapter = new GeminiAdapter();
  }

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
    const ragContext = ragData ? this.formatRagContext(ragData) : "";
    const enhancedPrompt = `${prompt}${ragContext}`;

    const results = await Promise.all(
      Array.from({ length: numberOfImages }, () =>
        generateImageWithGemini(enhancedPrompt, s3KeyPrefix)
      )
    );

    return results.filter((url): url is string => Boolean(url));
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
   * Get RAG context from company embeddings using semantic similarity search
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

      // Generate embedding for the query to find semantic similarity
      const queryEmbedding = await getOpenAIEmbeddings(query);
      
      // Calculate similarity between query and company content using embeddings
      let relevanceScore = 0.8; // Default high score for own company data
      
      if (companySettings.embedding && companySettings.embedding.length > 0 && queryEmbedding.length > 0) {
        // Calculate cosine similarity
        const dotProduct = queryEmbedding.reduce((sum: number, val: number, i: number) => 
          sum + val * (companySettings.embedding[i] || 0), 0
        );
        const magnitudeA = Math.sqrt(queryEmbedding.reduce((sum: number, val: number) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(companySettings.embedding.reduce((sum: number, val: number) => sum + val * val, 0));
        
        relevanceScore = dotProduct / (magnitudeA * magnitudeB);
      }

      const ragContext: IRagContext = {
        id: String(companySettings.company_object_id),
        content: companySettings.content,
        metadata: {
          // Use stored metadata from database
          source: companySettings.metadata?.source || "company_profile",
          type: companySettings.metadata?.type || "company_settings",
          relevanceScore: relevanceScore, // Use calculated similarity score
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

      console.log(`RAG Context created with relevance score: ${relevanceScore}`);
      console.log(`Company content length: ${companySettings.content.length}`);

      return {
        contexts: [ragContext],
        query,
        maxContexts,
        relevanceThreshold: 0 // Always include company context (set to 0)
      };
    } catch (error) {
      console.error("Error getting company RAG context:", error);
      return { contexts: [] };
    }
  }

  /**
   * Get RAG context using company embeddings (removed RAG service dependency)
   * This method now directly uses company embeddings for similarity search
   */
  async getRagContext(
    companyId: string,
    query: string,
    maxContexts: number = 5,
    relevanceThreshold: number = 0.5
  ): Promise<IRagData> {
    try {
      // Use getCompanyRagContext instead of RagService
      // since we already have embeddings in CompanySettings
      return await this.getCompanyRagContext(companyId, query, maxContexts);
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

  private formatRagContext(ragData: IRagData): string {
    if (!ragData.contexts || ragData.contexts.length === 0) {
      return "";
    }

    const relevantContexts = ragData.contexts
      .filter(context =>
        !ragData.relevanceThreshold ||
        !context.metadata?.relevanceScore ||
        context.metadata.relevanceScore >= ragData.relevanceThreshold
      )
      .slice(0, ragData.maxContexts || 5);

    if (relevantContexts.length === 0) {
      return "";
    }

    const contextString = relevantContexts
      .map((context, index) =>
        `Context ${index + 1} (${context.metadata?.source || "unknown"}):\n${context.content}`
      )
      .join("\n\n");

    return `\n\nRelevant Context Information:\n${contextString}\n\nPlease use this context information to provide more accurate and relevant responses.`;
  }
}