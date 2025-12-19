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
exports.RagService = void 0;
const openai_adapter_1 = require("../../adapter/llm/openai.adapter");
const tiktoken_1 = require("tiktoken");
const config_1 = require("../../config/config");
class RagService {
    constructor(organizationId) {
        this.organizationId = organizationId;
        this.vectorStore = null;
        this.tokenizer = (0, tiktoken_1.encoding_for_model)("gpt-3.5-turbo"); // Same encoding as embedding model
    }
    /**
     * Count tokens in text using tiktoken
     */
    countTokens(text) {
        return this.tokenizer.encode(text).length;
    }
    /**
     * Determine chunk size based on total token count, optimized for embedding model limits
     */
    determineChunkSize(totalTokens) {
        if (totalTokens <= 1000)
            return Math.max(totalTokens, config_1.RAG_CONFIG.minChunkSize);
        if (totalTokens <= 5000)
            return Math.max(Math.floor(totalTokens / 8), 300);
        if (totalTokens <= 20000)
            return Math.max(Math.floor(totalTokens / 15), 500);
        return config_1.RAG_CONFIG.chunkSize;
    }
    /**
     * Split text into chunks based on token count with overlap
     */
    splitTextByTokens(text, chunkSizeTokens) {
        const tokens = this.tokenizer.encode(text);
        const chunks = [];
        let startToken = 0;
        while (startToken < tokens.length) {
            const endToken = Math.min(startToken + chunkSizeTokens, tokens.length);
            const chunkTokens = tokens.slice(startToken, endToken);
            const chunkText = this.tokenizer.decode(chunkTokens);
            chunks.push(chunkText);
            // Move start position with overlap consideration
            startToken = endToken - config_1.RAG_CONFIG.overlapSize;
            if (startToken >= tokens.length - config_1.RAG_CONFIG.overlapSize)
                break;
        }
        return chunks;
    }
    /**
     * Process text and create embeddings with token-aware chunking
     */
    processText(text, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const totalTokens = this.countTokens(text);
                console.log(`Processing text with ${totalTokens} tokens`);
                // If text is small enough, process as single chunk
                if (totalTokens <= config_1.RAG_CONFIG.maxTokensPerChunk) {
                    const embedding = yield (0, openai_adapter_1.getOpenAIEmbeddings)(text);
                    return [{
                            content: text,
                            embedding,
                            metadata: Object.assign(Object.assign({}, metadata), { tokenCount: totalTokens, chunkIndex: 0, totalChunks: 1 })
                        }];
                }
                // Split into chunks based on token count
                const chunkSize = this.determineChunkSize(totalTokens);
                const chunks = this.splitTextByTokens(text, chunkSize);
                console.log(`Split text into ${chunks.length} chunks of ~${chunkSize} tokens each`);
                // Generate embeddings for each chunk
                const vectorChunks = [];
                for (let i = 0; i < chunks.length; i++) {
                    const chunk = chunks[i];
                    const chunkTokens = this.countTokens(chunk);
                    // Skip chunks that are too small
                    if (chunkTokens < config_1.RAG_CONFIG.minChunkSize)
                        continue;
                    console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunkTokens} tokens)`);
                    const embedding = yield (0, openai_adapter_1.getOpenAIEmbeddings)(chunk);
                    vectorChunks.push({
                        content: chunk,
                        embedding,
                        metadata: Object.assign(Object.assign({}, metadata), { tokenCount: chunkTokens, chunkIndex: i, totalChunks: chunks.length })
                    });
                }
                return vectorChunks;
            }
            catch (error) {
                console.error('Error processing text for RAG:', error);
                throw new Error(`Failed to process text: ${error}`);
            }
        });
    }
    /**
     * Add documents to vector store
     */
    addDocuments(texts, metadatas) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const allChunks = [];
                for (let i = 0; i < texts.length; i++) {
                    const text = texts[i];
                    const metadata = (metadatas === null || metadatas === void 0 ? void 0 : metadatas[i]) || {};
                    const chunks = yield this.processText(text, Object.assign(Object.assign({}, metadata), { documentIndex: i, organizationId: this.organizationId }));
                    allChunks.push(...chunks);
                }
                // Store in vector store (in-memory for now)
                if (!this.vectorStore) {
                    this.vectorStore = allChunks;
                }
                else {
                    this.vectorStore.push(...allChunks);
                }
                console.log(`Added ${allChunks.length} chunks to vector store`);
            }
            catch (error) {
                console.error('Error adding documents to vector store:', error);
                throw error;
            }
        });
    }
    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(a, b) {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }
    /**
     * Perform similarity search
     */
    similaritySearch(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, topK = 5) {
            try {
                if (!this.vectorStore || this.vectorStore.length === 0) {
                    throw new Error('Vector store is empty. Add documents first.');
                }
                // Get query embedding
                const queryEmbedding = yield (0, openai_adapter_1.getOpenAIEmbeddings)(query);
                // Calculate similarities and sort
                const similarities = this.vectorStore.map(chunk => ({
                    chunk,
                    similarity: this.cosineSimilarity(queryEmbedding, chunk.embedding)
                }));
                similarities.sort((a, b) => b.similarity - a.similarity);
                return similarities.slice(0, topK).map(item => item.chunk);
            }
            catch (error) {
                console.error('Error performing similarity search:', error);
                throw error;
            }
        });
    }
    /**
     * Get vector store statistics
     */
    getStats() {
        if (!this.vectorStore) {
            return { totalChunks: 0, totalTokens: 0, organizationId: this.organizationId };
        }
        const totalTokens = this.vectorStore.reduce((sum, chunk) => { var _a; return sum + (((_a = chunk.metadata) === null || _a === void 0 ? void 0 : _a.tokenCount) || 0); }, 0);
        return {
            totalChunks: this.vectorStore.length,
            totalTokens,
            organizationId: this.organizationId
        };
    }
    /**
     * Clear vector store
     */
    clearVectorStore() {
        this.vectorStore = null;
    }
    /**
     * Cleanup tokenizer resources
     */
    cleanup() {
        if (this.tokenizer) {
            this.tokenizer.free();
        }
    }
}
exports.RagService = RagService;
