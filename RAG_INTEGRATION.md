# LLM Adapters with RAG Integration

This documentation explains how to use the updated OpenAI and Gemini adapters with Retrieval-Augmented Generation (RAG) capabilities.

## Overview

Both adapters have been enhanced to accept RAG (Retrieval-Augmented Generation) data, allowing you to provide relevant context information that will be automatically integrated into your prompts for more accurate and contextual responses.

## Key Features

- **RAG Data Integration**: Automatically incorporate relevant context into prompts
- **Backward Compatibility**: Old function signatures still work
- **Multiple RAG Sources**: Combine data from different sources
- **Relevance Filtering**: Filter contexts based on relevance scores
- **Flexible Configuration**: Customize context limits and thresholds

## Interfaces

### IRagContext
```typescript
interface IRagContext {
  id: string;
  content: string;
  metadata?: {
    source?: string;
    type?: string;
    relevanceScore?: number;
    timestamp?: Date;
    [key: string]: any;
  };
}
```

### IRagData
```typescript
interface IRagData {
  contexts: IRagContext[];
  query?: string;
  maxContexts?: number;
  relevanceThreshold?: number;
}
```

## Usage Examples

### OpenAI Adapter

#### New Object-Based Usage (Recommended)
```typescript
import { generateOpenAiResponse } from "../adapter/llm/openai.adapter";

const response = await generateOpenAiResponse({
  prompt: "Create a professional email",
  systemMessage: "You are a professional email writer",
  ragData: {
    contexts: [
      {
        id: "company_info",
        content: "Company ABC specializes in software development...",
        metadata: {
          source: "company_profile",
          relevanceScore: 0.9
        }
      }
    ],
    maxContexts: 3,
    relevanceThreshold: 0.7
  },
  model: "gpt-3.5-turbo",
  maxTokens: 1000,
  temperature: 0.7
});
```

#### Backward Compatible Usage
```typescript
// This still works exactly as before
const response = await generateOpenAiResponse(
  "Create a professional email",
  "You are a professional email writer"
);
```

### Gemini Adapter

#### Text Generation with RAG
```typescript
import { GeminiAdapter } from "../adapter/llm/gemini.adapter";

const gemini = new GeminiAdapter();

const response = await gemini.generateText({
  prompt: "Write a company overview",
  systemMessage: "You are a marketing copywriter",
  ragData: {
    contexts: [
      {
        id: "company_data",
        content: "Our company was founded in 2020...",
        metadata: {
          source: "company_history",
          relevanceScore: 0.85
        }
      }
    ]
  }
});
```

#### Image Generation with RAG
```typescript
const imageUrls = await gemini.generateImages({
  prompt: "Create a company logo",
  numberOfImages: 2,
  ragData: {
    contexts: [
      {
        id: "brand_guidelines",
        content: "Brand colors: blue and green. Modern, minimalist style...",
        metadata: {
          source: "brand_guide",
          relevanceScore: 0.95
        }
      }
    ]
  }
});
```

#### Video Generation with RAG
```typescript
const videoUrl = await gemini.generateVideo({
  prompt: "Create a product demonstration video",
  downloadPath: "/tmp/demo_video.mp4",
  ragData: {
    contexts: [
      {
        id: "product_specs",
        content: "Product features: AI-powered, cloud-based...",
        metadata: {
          source: "product_manual",
          relevanceScore: 0.9
        }
      }
    ]
  }
});
```

## LLMWithRagService

The `LLMWithRagService` provides convenient methods for working with both adapters and RAG data:

```typescript
import { LLMWithRagService } from "../services/llmWithRag/llmWithRag.service";

const llmService = new LLMWithRagService();

// Get RAG context from company embeddings
const ragData = await llmService.getCompanyRagContext(
  "company_object_id",
  "query about company services"
);

// Use with OpenAI
const openAIResponse = await llmService.generateOpenAIResponseWithRag(
  "Create marketing copy",
  "You are a marketing expert",
  ragData
);

// Use with Gemini
const geminiResponse = await llmService.generateGeminiResponseWithRag(
  "Create marketing copy",
  "You are a marketing expert",
  ragData
);

// Combine multiple RAG sources
const combinedRag = llmService.combineRagData([ragData1, ragData2, ragData3]);
```

## RAG Context Sources

### From Company Embeddings
```typescript
const ragData = await llmService.getCompanyRagContext(
  "company_object_id",
  "query",
  maxContexts
);
```

### From RAG Service
```typescript
const ragData = await llmService.getRagContext(
  "company_id",
  "query",
  maxContexts,
  relevanceThreshold
);
```

### Custom RAG Data
```typescript
const customRag: IRagData = {
  contexts: [
    {
      id: "custom_context",
      content: "Custom information...",
      metadata: {
        source: "manual_input",
        relevanceScore: 1.0
      }
    }
  ],
  maxContexts: 5,
  relevanceThreshold: 0.6
};
```

## Response Format

Both adapters now return enhanced response objects:

```typescript
{
  prompt: string;           // Enhanced prompt with RAG context
  originalPrompt: string;   // Original prompt without RAG context
  parsedContent: any;       // Generated content (OpenAI)
  content: string;          // Generated content (Gemini)
  ragData?: IRagData;       // RAG data used (if any)
}
```

## Best Practices

1. **Relevance Threshold**: Set appropriate relevance thresholds (0.5-0.8) to filter low-quality contexts
2. **Context Limits**: Limit contexts to 3-5 to avoid prompt bloat
3. **Source Diversity**: Combine contexts from different sources for comprehensive information
4. **Metadata Usage**: Use metadata to provide context about the source and type of information
5. **Error Handling**: Always wrap RAG operations in try-catch blocks

## Migration Guide

### From Old OpenAI Usage
```typescript
// Old way
const response = await generateOpenAiResponse(prompt, systemMessage);

// New way (both work, but new way is more flexible)
const response = await generateOpenAiResponse({
  prompt,
  systemMessage,
  ragData: myRagData  // Optional
});
```

### From Old Gemini Usage
```typescript
// Old way
const urls = await gemini.generateImages({
  prompt,
  numberOfImages: 2
});

// New way
const urls = await gemini.generateImages({
  prompt,
  numberOfImages: 2,
  ragData: myRagData  // Optional
});
```

## Error Handling

```typescript
try {
  const response = await llmService.generateOpenAIResponseWithRag(
    prompt,
    systemMessage,
    ragData
  );
} catch (error) {
  console.error("LLM generation failed:", error);
  // Handle error appropriately
}
```

## Performance Considerations

- RAG context is automatically formatted and appended to prompts
- Large contexts may increase token usage and response time
- Use relevance filtering to optimize context quality vs. quantity
- Consider caching embeddings for frequently used contexts