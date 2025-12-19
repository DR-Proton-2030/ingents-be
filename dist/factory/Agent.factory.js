"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentFactory = void 0;
const openai_adapter_1 = require("../adapter/llm/openai.adapter");
const CodeMap_1 = require("../constants/codeMap/CodeMap");
const email_agent_1 = require("../services/agents/email/email.agent");
const mediaGeneration_1 = require("../services/agents/mediaGeneration/mediaGeneration");
class AgentFactory {
    // Returns the internal code for a user's intent
    static decideAgentCode(message) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const response = yield (0, openai_adapter_1.generateOpenAiResponse)(message, `You are an AI assistant for business automation.
      Your job is to understand the user's intent from their message and return a normalized intent string from the following list:
      ${Object.keys(CodeMap_1.INTENT_CODE_MAP).join(", ")}
      Respond ONLY with a JSON object: { "intent": "<intent_string>" }`);
            const intent = ((_b = (_a = response === null || response === void 0 ? void 0 : response.parsedContent) === null || _a === void 0 ? void 0 : _a.intent) === null || _b === void 0 ? void 0 : _b.trim().toLowerCase()) || "";
            console.log("intent", intent);
            const code = CodeMap_1.INTENT_CODE_MAP[intent] || "UNKNOWN";
            return code;
        });
    }
    createAgentForUser(prompt, companyObjectId) {
        return __awaiter(this, void 0, void 0, function* () {
            const agentId = yield AgentFactory.decideAgentCode(prompt);
            switch (agentId) {
                case "MEDIA01":
                    return yield (0, mediaGeneration_1.generateMediaWithGemini)({ prompt, numberOfImages: 1, companyObjectId });
                case "MEDIA02":
                    return yield (0, mediaGeneration_1.generateMediaWithGemini)({ prompt, numberOfImages: 1, companyObjectId });
                case "MAIL01":
                    return yield (0, email_agent_1.generateEmailContent)(prompt, companyObjectId);
                default:
                    throw new Error(`Unsupported agent ID: ${agentId}`);
            }
        });
    }
}
exports.AgentFactory = AgentFactory;
