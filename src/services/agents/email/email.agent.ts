import { generateOpenAiResponse } from "../../../adapter/llm/openai.adapter";
import { llmSystemRole } from "../../../constants/llmRole/llmSystemRole";
import { IRagData } from "../../../types/interface/ragData.interface";
import { LLMWithRagService } from "../../llmWithRag/llmWithRag.service";

const llmWithRagService = new LLMWithRagService();

export const generateEmailContent = async (
  prompt: string,
  companyObjectId: string
) => {
  let contextData: IRagData | undefined;
  try {
    contextData = await llmWithRagService.getCompanyRagContext(
      companyObjectId,
      prompt,
      5 // maxContexts
    );
  } catch (error) {
    console.error("Error fetching RAG context for media generation:", error);
  }
  const aiResponse = await generateOpenAiResponse(
    {
        prompt,
        systemMessage: llmSystemRole.emailWriter,
        ragData: contextData,
    }
  );
    return aiResponse;
};
