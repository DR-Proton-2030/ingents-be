import { generateOpenAiResponse } from "../adapter/llm/openai.adapter";
import { INTENT_CODE_MAP } from "../constants/codeMap/CodeMap";
import { IUser } from "../types/interface/user.interface";

export class AgentFactory {
  // Returns the internal code for a user's intent
  async decideAgentCode(message: string): Promise<string> {
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

  async createAgentForUser(agentId: keyof typeof INTENT_CODE_MAP) {
    
  }
}
