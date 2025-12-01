import { LLMWithRagService } from "../services/llmWithRag/llmWithRag.service";
import { IRagData, IRagContext } from "../types/interface/ragData.interface";

/**
 * Example usage of LLM adapters with RAG data
 */

async function exampleUsage() {
  const llmService = new LLMWithRagService();

  // Example 1: Using OpenAI with company RAG data
  try {
    const companyObjectId = "60f3b4b5b5b5b5b5b5b5b5b5";
    const query = "What services does the company offer?";
    
    // Get RAG context from company embeddings
    const ragData = await llmService.getCompanyRagContext(companyObjectId, query);
    
    // Generate response with RAG context
    const response = await llmService.generateOpenAIResponseWithRag(
      "Create a professional email introducing our company services",
      "You are a professional business email writer. Use the provided context to write accurate information about the company.",
      ragData
    );
    
    console.log("OpenAI Response:", response);
  } catch (error) {
    console.error("OpenAI example error:", error);
  }

  // Example 2: Using Gemini for text generation with RAG
  try {
    const companyId = "company123";
    const query = "company background and history";
    
    // Get RAG context using RAG service
    const ragData = await llmService.getRagContext(companyId, query, 3);
    
    // Generate text response
    const response = await llmService.generateGeminiResponseWithRag(
      "Write a company overview paragraph",
      "You are a marketing copywriter. Create compelling content based on the provided company information.",
      ragData
    );
    
    console.log("Gemini Text Response:", response);
  } catch (error) {
    console.error("Gemini text example error:", error);
  }

  // Example 3: Using Gemini for image generation with RAG
  try {
    // Create custom RAG data
    const customRagData: IRagData = {
      contexts: [
        {
          id: "context1",
          content: "The company specializes in sustainable technology solutions, green energy, and eco-friendly products. Brand colors are green and blue.",
          metadata: {
            source: "brand_guidelines",
            type: "marketing",
            relevanceScore: 0.9
          }
        }
      ],
      query: "company branding and visual identity",
      maxContexts: 2,
      relevanceThreshold: 0.7
    };
    
    // Generate images with RAG context
    const imageUrls = await llmService.generateGeminiImagesWithRag(
      "Create a professional logo design",
      customRagData,
      2,
      "company-logos"
    );
    
    console.log("Generated image URLs:", imageUrls);
  } catch (error) {
    console.error("Gemini image example error:", error);
  }

  // Example 4: Combining multiple RAG sources
  try {
    const companyObjectId = "60f3b4b5b5b5b5b5b5b5b5b5";
    const companyId = "company123";
    
    // Get company profile RAG data
    const companyRag = await llmService.getCompanyRagContext(companyObjectId, "company info");
    
    // Get additional RAG data from documents
    const documentRag = await llmService.getRagContext(companyId, "marketing materials", 2);
    
    // Create custom RAG data
    const customRag: IRagData = {
      contexts: [
        {
          id: "recent_news",
          content: "The company recently launched a new product line and expanded to international markets.",
          metadata: {
            source: "press_release",
            type: "news",
            relevanceScore: 0.8,
            timestamp: new Date()
          }
        }
      ]
    };
    
    // Combine all RAG sources
    const combinedRag = llmService.combineRagData([companyRag, documentRag, customRag]);
    
    // Generate comprehensive response
    const response = await llmService.generateOpenAIResponseWithRag(
      "Create a comprehensive company presentation outline",
      "You are a business consultant. Create a detailed presentation outline using all available company information.",
      combinedRag
    );
    
    console.log("Combined RAG Response:", response);
  } catch (error) {
    console.error("Combined RAG example error:", error);
  }

  // Example 5: Backward compatibility - using old function signature
  try {
    // This still works for backward compatibility
    const response = await llmService.generateOpenAIResponseWithRag(
      "Generate a simple greeting",
      "You are a friendly assistant."
      // No RAG data provided
    );
    
    console.log("Backward compatibility response:", response);
  } catch (error) {
    console.error("Backward compatibility example error:", error);
  }
}

// Export the example for use in other files
export { exampleUsage };

// Run example if this file is executed directly
if (require.main === module) {
  exampleUsage()
    .then(() => console.log("Examples completed"))
    .catch(error => console.error("Example execution failed:", error));
}