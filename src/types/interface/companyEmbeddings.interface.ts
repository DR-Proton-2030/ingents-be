export interface ICompanyEmbeddingMetadata {
  type: 'company_profile' | 'company_update' | 'company_additional';
  companyId: string;
  companyName?: string;
  industry?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ICompanyEmbeddingChunk {
  content: string;
  embedding: number[];
  metadata: ICompanyEmbeddingMetadata;
}

export interface ICompanySimilarityResult {
  companyId: string;
  similarity: number;
  companyName?: string;
  industry?: string;
  tags?: string[];
}

export interface ICompanyEmbeddingSearchQuery {
  query: string;
  industry?: string;
  tags?: string[];
  limit?: number;
  excludeCompanyId?: string;
}