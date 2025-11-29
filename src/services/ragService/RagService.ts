import { VectorStoreChunk } from "../../types/interface/llm/vectorStore.interface";
import { getOpenAIEmbeddings } from "../../adapter/llm/openai.adapter";
import { encoding_for_model } from "tiktoken";
import { RAG_CONFIG } from "../../config/config";


export class RagService {
  private vectorStore: VectorStoreChunk[] | null;
  private organizationId: string;
  private tokenizer: any;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
    this.vectorStore = null;
    this.tokenizer = encoding_for_model("gpt-3.5-turbo"); // Same encoding as embedding model
  }

  /**
   * Count tokens in text using tiktoken
   */
  private countTokens(text: string): number {
    return this.tokenizer.encode(text).length;
  }

  /**
   * Determine chunk size based on total token count, optimized for embedding model limits
   */
  private determineChunkSize(totalTokens: number): number {
    if (totalTokens <= 1000) return Math.max(totalTokens, RAG_CONFIG.minChunkSize);
    if (totalTokens <= 5000) return Math.max(Math.floor(totalTokens / 8), 300);
    if (totalTokens <= 20000) return Math.max(Math.floor(totalTokens / 15), 500);
    return RAG_CONFIG.chunkSize;
  }

  /**
   * Split text into chunks based on token count with overlap
   */
  private splitTextByTokens(text: string, chunkSizeTokens: number): string[] {
    const tokens = this.tokenizer.encode(text);
    const chunks: string[] = [];
    
    let startToken = 0;
    while (startToken < tokens.length) {
      const endToken = Math.min(startToken + chunkSizeTokens, tokens.length);
      const chunkTokens = tokens.slice(startToken, endToken);
      const chunkText = this.tokenizer.decode(chunkTokens);
      
      chunks.push(chunkText);
      
      // Move start position with overlap consideration
      startToken = endToken - RAG_CONFIG.overlapSize;
      if (startToken >= tokens.length - RAG_CONFIG.overlapSize) break;
    }
    
    return chunks;
  }

  /**
   * Process text and create embeddings with token-aware chunking
   */
  async processText(text: string, metadata?: Record<string, any>): Promise<VectorStoreChunk[]> {
    try {
      const totalTokens = this.countTokens(text);
      console.log(`Processing text with ${totalTokens} tokens`);
      
      // If text is small enough, process as single chunk
      if (totalTokens <= RAG_CONFIG.maxTokensPerChunk) {
        const embedding = await getOpenAIEmbeddings(text);
        return [{
          content: text,
          embedding,
          metadata: {
            ...metadata,
            tokenCount: totalTokens,
            chunkIndex: 0,
            totalChunks: 1
          }
        }];
      }

      // Split into chunks based on token count
      const chunkSize = this.determineChunkSize(totalTokens);
      const chunks = this.splitTextByTokens(text, chunkSize);
      
      console.log(`Split text into ${chunks.length} chunks of ~${chunkSize} tokens each`);

      // Generate embeddings for each chunk
      const vectorChunks: VectorStoreChunk[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkTokens = this.countTokens(chunk);
        
        // Skip chunks that are too small
        if (chunkTokens < RAG_CONFIG.minChunkSize) continue;
        
        console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunkTokens} tokens)`);
        
        const embedding = await getOpenAIEmbeddings(chunk);
        vectorChunks.push({
          content: chunk,
          embedding,
          metadata: {
            ...metadata,
            tokenCount: chunkTokens,
            chunkIndex: i,
            totalChunks: chunks.length
          }
        });
      }

      return vectorChunks;
    } catch (error) {
      console.error('Error processing text for RAG:', error);
      throw new Error(`Failed to process text: ${error}`);
    }
  }

  /**
   * Add documents to vector store
   */
  async addDocuments(texts: string[], metadatas?: Record<string, any>[]): Promise<void> {
    try {
      const allChunks: VectorStoreChunk[] = [];
      
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const metadata = metadatas?.[i] || {};
        
        const chunks = await this.processText(text, {
          ...metadata,
          documentIndex: i,
          organizationId: this.organizationId
        });
        
        allChunks.push(...chunks);
      }
      
      // Store in vector store (in-memory for now)
      if (!this.vectorStore) {
        this.vectorStore = allChunks;
      } else {
        this.vectorStore.push(...allChunks);
      }
      
      console.log(`Added ${allChunks.length} chunks to vector store`);
    } catch (error) {
      console.error('Error adding documents to vector store:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Perform similarity search
   */
  async similaritySearch(query: string, topK: number = 5): Promise<VectorStoreChunk[]> {
    try {
      if (!this.vectorStore || this.vectorStore.length === 0) {
        throw new Error('Vector store is empty. Add documents first.');
      }

      // Get query embedding
      const queryEmbedding = await getOpenAIEmbeddings(query);
      
      // Calculate similarities and sort
      const similarities = this.vectorStore.map(chunk => ({
        chunk,
        similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
      }));
      
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      return similarities.slice(0, topK).map(item => item.chunk);
    } catch (error) {
      console.error('Error performing similarity search:', error);
      throw error;
    }
  }

  /**
   * Get vector store statistics
   */
  getStats(): { totalChunks: number; totalTokens: number; organizationId: string } {
    if (!this.vectorStore) {
      return { totalChunks: 0, totalTokens: 0, organizationId: this.organizationId };
    }
    
    const totalTokens = this.vectorStore.reduce((sum, chunk) => 
      sum + (chunk.metadata?.tokenCount || 0), 0
    );
    
    return {
      totalChunks: this.vectorStore.length,
      totalTokens,
      organizationId: this.organizationId
    };
  }

  /**
   * Clear vector store
   */
  clearVectorStore(): void {
    this.vectorStore = null;
  }

  /**
   * Cleanup tokenizer resources
   */
  cleanup(): void {
    if (this.tokenizer) {
      this.tokenizer.free();
    }
  }
}
