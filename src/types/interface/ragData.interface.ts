export interface IRagContext {
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

export interface IRagData {
  contexts: IRagContext[];
  query?: string;
  maxContexts?: number;
  relevanceThreshold?: number;
}

export interface ILLMRequestWithRag {
  prompt: string;
  systemMessage: string;
  ragData?: IRagData;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface IOpenAIRequestWithRag extends ILLMRequestWithRag {
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  responseFormat?: { type: "json_object" | "text" };
}

export interface IGeminiRequestWithRag extends ILLMRequestWithRag {
  numberOfImages?: number;
  s3KeyPrefix?: string;
}