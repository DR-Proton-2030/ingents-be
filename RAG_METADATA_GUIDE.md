# RAG Metadata Management Guide

## Overview

This guide explains how to set, store, and use metadata in your RAG (Retrieval-Augmented Generation) system. Metadata provides crucial context information that helps improve the quality and traceability of your RAG responses.

## What is RAG Metadata?

Metadata in RAG refers to additional information about each piece of content (context) that helps the system understand:

- **Source**: Where the content came from (company_profile, document_store, web_scraper, etc.)
- **Type**: What kind of content it is (company_data, document_chunk, news_article, etc.)
- **Relevance**: How relevant the content is to the query (0.0 to 1.0 score)
- **Timestamp**: When the content was created or last updated
- **Custom Fields**: Any additional context-specific information

## Database Storage

### 1. Updated CompanySettings Schema

The `ICompanySettings` interface now includes a metadata field:

```typescript
export interface ICompanySettings {
    company_object_id: SchemaDefinitionProperty<Types.ObjectId>;
    tags: Array<string>;
    agents: Array<string>;
    content: string;
    embedding: Array<number>;
    language: string;
    metadata?: {
        source?: string;
        type?: string;
        industry?: string;
        companySize?: string;
        lastUpdated?: Date;
        documentCount?: number;
        averageRelevance?: number;
        [key: string]: any; // Allows custom fields
    };
}
```

### 2. Schema Definition

The Mongoose schema includes the metadata field as a flexible Mixed type:

```typescript
metadata: {
  type: Schema.Types.Mixed,
  required: false,
  default: {}
}
```

This allows you to store any JSON object as metadata.

## Setting Metadata

### 1. Automatic Metadata Generation

When creating company embeddings, metadata is automatically generated:

```typescript
// In CompanyEmbeddingsService.createCompanyEmbeddings()
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
  servicesCount: company.services?.length || 0,
  productsCount: company.products?.length || 0
};
```

### 2. Manual Metadata Creation

Using the `RagMetadataService`:

```typescript
import { RagMetadataService } from "../services/ragMetadata/ragMetadata.service";

// For company data
const companyMetadata = RagMetadataService.createCompanyMetadata(company, {
  source: 'company_database',
  type: 'company_profile',
  relevanceScore: 1.0,
  additionalFields: {
    dataQuality: 'high',
    lastVerified: new Date()
  }
});

// For document chunks
const docMetadata = RagMetadataService.createDocumentMetadata({
  documentId: 'doc_123',
  documentName: 'Company Handbook',
  documentType: 'handbook',
  chunkIndex: 0,
  totalChunks: 5
}, {
  source: 'document_store',
  relevanceScore: 0.8
});

// For web content
const webMetadata = RagMetadataService.createWebScrapedMetadata({
  url: 'https://example.com/article',
  title: 'Industry News',
  scrapedAt: new Date()
}, {
  source: 'web_scraper',
  relevanceScore: 0.7
});
```

### 3. Custom Metadata

You can create completely custom metadata:

```typescript
const customRagContext: IRagContext = {
  id: 'custom_001',
  content: 'Some important business information...',
  metadata: {
    source: 'user_input',
    type: 'business_insight',
    relevanceScore: 0.9,
    timestamp: new Date(),
    priority: 'high',
    department: 'sales',
    confidentialityLevel: 'internal',
    tags: ['quarterly-report', 'revenue'],
    lastReviewedBy: 'john.doe@company.com'
  }
};
```

## Using Metadata in RAG Requests

### 1. Sending Metadata with LLM Requests

```typescript
import { LLMWithRagService } from "../services/llmWithRag/llmWithRag.service";

const llmService = new LLMWithRagService();

// The service automatically uses stored metadata
const ragData = await llmService.getCompanyRagContext(
  "company_object_id",
  "query about company services"
);

// ragData.contexts[0].metadata will contain all stored metadata
console.log("Metadata:", ragData.contexts[0].metadata);

// Generate response with metadata-enhanced context
const response = await llmService.generateOpenAIResponseWithRag(
  "Create a company introduction",
  "You are a professional writer",
  ragData
);
```

### 2. Filtering by Metadata

```typescript
// Filter RAG contexts by metadata criteria
const filteredRag = RagMetadataService.filterByMetadata(ragData, {
  sources: ['company_profile', 'document_store'],
  types: ['company_data', 'handbook'],
  minRelevanceScore: 0.7,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  customFilter: (metadata) => metadata.priority === 'high'
});
```

### 3. Sorting by Metadata

```typescript
// Sort contexts by relevance score
const sortedRag = RagMetadataService.sortByMetadata(ragData, {
  field: 'relevanceScore',
  order: 'desc'
});

// Sort by timestamp (newest first)
const chronologicalRag = RagMetadataService.sortByMetadata(ragData, {
  field: 'timestamp',
  order: 'desc'
});
```

## API Usage Examples

### 1. Generate Content with Metadata Filtering

```bash
POST /api/v1/rag/generate-with-company-data
Content-Type: application/json

{
  "companyObjectId": "60f3b4b5b5b5b5b5b5b5b5b5",
  "prompt": "Create a professional email about our services",
  "systemMessage": "You are a professional business writer",
  "includeMetadata": true,
  "filterOptions": {
    "minRelevanceScore": 0.7,
    "sources": ["company_profile", "document_store"],
    "maxAge": 604800000
  }
}
```

### 2. Create Custom RAG with Metadata

```bash
POST /api/v1/rag/create-custom-rag
Content-Type: application/json

{
  "contexts": [
    {
      "id": "custom_1",
      "content": "We offer AI consulting services...",
      "type": "company",
      "company": {
        "company_name": "TechCorp",
        "industry": "Technology"
      },
      "relevanceScore": 0.9
    },
    {
      "id": "doc_1",
      "content": "Our methodology includes...",
      "type": "document",
      "documentInfo": {
        "documentId": "methodology_guide",
        "documentName": "Service Methodology",
        "documentType": "guide"
      },
      "relevanceScore": 0.8
    }
  ],
  "metadataConfig": {
    "source": "custom_input",
    "additionalFields": {
      "campaign": "q4_marketing",
      "requestedBy": "marketing_team"
    }
  }
}
```

### 3. Search and Filter RAG Data

```bash
POST /api/v1/rag/search
Content-Type: application/json

{
  "companyObjectId": "60f3b4b5b5b5b5b5b5b5b5b5",
  "query": "company services",
  "filters": {
    "sources": ["company_profile"],
    "minRelevanceScore": 0.6,
    "maxAge": 2592000000
  },
  "sortBy": {
    "field": "relevanceScore",
    "order": "desc"
  },
  "groupBy": "type"
}
```

## Metadata Statistics

Get comprehensive statistics about your RAG metadata:

```typescript
const stats = RagMetadataService.getMetadataStats(ragData);

console.log("Statistics:", {
  totalContexts: stats.totalContexts,
  sources: stats.sources,           // ['company_profile', 'document_store']
  types: stats.types,               // ['company_data', 'document_chunk'] 
  averageRelevance: stats.averageRelevance,  // 0.85
  dateRange: {
    oldest: stats.oldestTimestamp,
    newest: stats.newestTimestamp
  }
});
```

## Best Practices

### 1. Metadata Structure

- **Consistent naming**: Use consistent field names across your application
- **Relevance scores**: Always include relevance scores (0.0 to 1.0)
- **Source tracking**: Always specify the source of your content
- **Timestamps**: Include creation and update timestamps
- **Type classification**: Use meaningful type classifications

### 2. Performance Optimization

```typescript
// Good: Filter early to reduce processing
const filteredRag = RagMetadataService.filterByMetadata(ragData, {
  minRelevanceScore: 0.7,
  maxAge: 1000 * 60 * 60 * 24 * 7
});

// Then sort the filtered results
const sortedRag = RagMetadataService.sortByMetadata(filteredRag, {
  field: 'relevanceScore',
  order: 'desc'
});
```

### 3. Error Handling

```typescript
try {
  const ragData = await llmService.getCompanyRagContext(companyId, query);
  
  if (ragData.contexts.length === 0) {
    console.warn("No RAG contexts found for company:", companyId);
    // Handle empty results
  }
  
  // Process ragData...
} catch (error) {
  console.error("RAG processing error:", error);
  // Handle error appropriately
}
```

### 4. Metadata Validation

```typescript
// Validate metadata before using
function validateMetadata(metadata: any): boolean {
  return !!(
    metadata &&
    metadata.source &&
    metadata.type &&
    typeof metadata.relevanceScore === 'number' &&
    metadata.relevanceScore >= 0 &&
    metadata.relevanceScore <= 1
  );
}

// Filter out invalid metadata
const validContexts = ragData.contexts.filter(context => 
  validateMetadata(context.metadata)
);
```

## Common Use Cases

### 1. Content Generation with Source Attribution

```typescript
// Generate content and track sources
const response = await llmService.generateOpenAIResponseWithRag(prompt, systemMessage, ragData);

// Extract sources used
const sourcesUsed = ragData.contexts.map(c => ({
  source: c.metadata?.source,
  type: c.metadata?.type,
  relevance: c.metadata?.relevanceScore
}));

console.log("Content generated using sources:", sourcesUsed);
```

### 2. Quality-Based Filtering

```typescript
// Only use high-quality, recent content
const highQualityRag = RagMetadataService.filterByMetadata(ragData, {
  minRelevanceScore: 0.8,
  maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  customFilter: (metadata) => {
    return metadata.dataQuality === 'high' && 
           metadata.verificationStatus === 'verified';
  }
});
```

### 3. Multi-Source Content Blending

```typescript
// Get content from different sources
const companyRag = await llmService.getCompanyRagContext(companyId, query);
const documentRag = await llmService.getRagContext(companyId, query, 3);

// Enhance each source with different metadata
const enhancedCompanyRag = RagMetadataService.enhanceRagData(companyRag, {
  priority: 'primary',
  trustLevel: 'high'
});

const enhancedDocumentRag = RagMetadataService.enhanceRagData(documentRag, {
  priority: 'secondary',
  trustLevel: 'medium'
});

// Combine and use
const combinedRag = llmService.combineRagData([enhancedCompanyRag, enhancedDocumentRag]);
```

This comprehensive metadata system allows you to build sophisticated RAG applications with full traceability, quality control, and intelligent content filtering.