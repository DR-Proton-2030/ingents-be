import { generateOpenAiResponse } from "../adapter/llm/openai.adapter";
import { INTENT_CODE_MAP } from "../constants/codeMap/CodeMap";
import { generateEmailContent } from "../services/agents/email/email.agent";
import { generateMediaWithGemini } from "../services/agents/mediaGeneration/mediaGeneration";

export class AgentFactory {
  // Returns the internal code for a user's intent
  static async decideAgentCode(message: string): Promise<string> {
    const response = await generateOpenAiResponse(
      message,
      `You are an AI assistant for business automation.
      Your job is to understand the user's intent from their message and return a normalized intent string from the following list:
      ${Object.keys(INTENT_CODE_MAP).join(", ")}
      Respond ONLY with a JSON object: { "intent": "<intent_string>" }`
    );

    const intent = response?.parsedContent?.intent?.trim().toLowerCase() || "";

    console.log("intent", intent);
    const code = INTENT_CODE_MAP[intent] || "UNKNOWN";
    return code;
  }

  async createAgentForUser(prompt: string, companyObjectId: string): Promise<any> {
    const agentId = await AgentFactory.decideAgentCode(prompt);
    switch (agentId) {
      case "MEDIA01":
        return await generateMediaWithGemini({ prompt, numberOfImages: 1, companyObjectId });
      case "MEDIA02":
        return await generateMediaWithGemini({ prompt, numberOfImages: 1, companyObjectId });
      case "MAIL01":
        return await generateEmailContent(prompt, companyObjectId);
      default:
        throw new Error(`Unsupported agent ID: ${agentId}`);
    }
  }
}
