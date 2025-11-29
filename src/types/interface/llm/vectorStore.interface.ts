export interface VectorStoreChunk {
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}