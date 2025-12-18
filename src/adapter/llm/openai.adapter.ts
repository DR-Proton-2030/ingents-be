import OpenAI from "openai";
import { IOpenAIRequestWithRag, IRagData } from "../../types/interface/ragData.interface";

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
});

const formatRagContext = (ragData: IRagData): string => {
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
      `Context ${index + 1} (${context.metadata?.source || 'unknown'}):\n${context.content}`
    )
    .join('\n\n');

  return `\n\nRelevant Context Information:\n${contextString}\n\nPlease use this context information to provide more accurate and relevant responses.`;
};

export const generateOpenAiResponse = async (
    request: string | IOpenAIRequestWithRag,
    systemMessage?: string
) => {
  try {
    // Handle both old string parameters and new object parameter
    let config: IOpenAIRequestWithRag;
    
    if (typeof request === 'string') {
      // Backward compatibility: old function signature
      config = {
        prompt: request,
        systemMessage: systemMessage || "",
        model: "gpt-4o",
        maxTokens: 500,
        temperature: 0.7,
        topP: 0.9,
        presencePenalty: 0.2,
        frequencyPenalty: 0.3,
        responseFormat: { type: "json_object" }
      };
    } else {
      // New object-based configuration
      config = {
        model: "gpt-4o",
        maxTokens: 500,
        temperature: 0.7,
        topP: 0.9,
        presencePenalty: 0.2,
        frequencyPenalty: 0.3,
        responseFormat: { type: "json_object" },
        ...request
      };
    }

    // Enhance prompt with RAG context if available
    let enhancedPrompt = config.prompt;
    if (config.ragData) {
      const ragContext = formatRagContext(config.ragData);
      enhancedPrompt = config.prompt + ragContext;
    }

    const response = await openai.chat.completions.create({
      model: config.model || "gpt-4o",
      messages: [
        { role: "system", content: config.systemMessage },
        { role: "user", content: enhancedPrompt },
      ],
      max_tokens: config.maxTokens || 500,
      temperature: config.temperature || 0.7,
      top_p: config.topP || 0.9,
      presence_penalty: config.presencePenalty || 0.2,
      frequency_penalty: config.frequencyPenalty || 0.3,
      response_format: config.responseFormat || { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (content === null) throw new Error("OpenAI response content is null");

    const parsedContent = JSON.parse(content);

    // Return both the generated content and the enhanced prompt
    return {
      prompt: enhancedPrompt,
      originalPrompt: config.prompt,
      parsedContent,
      ragData: config.ragData,
    };
  } catch (err) {
    console.error("OpenAI request failed:", err);
    return null;
  }
};

export async function getOpenAIEmbeddings(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}