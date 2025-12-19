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
exports.generateEmailContent = void 0;
const openai_adapter_1 = require("../../../adapter/llm/openai.adapter");
const llmSystemRole_1 = require("../../../constants/llmRole/llmSystemRole");
const llmWithRag_service_1 = require("../../llmWithRag/llmWithRag.service");
const llmWithRagService = new llmWithRag_service_1.LLMWithRagService();
const generateEmailContent = (prompt, companyObjectId) => __awaiter(void 0, void 0, void 0, function* () {
    let contextData;
    try {
        contextData = yield llmWithRagService.getCompanyRagContext(companyObjectId, prompt, 5 // maxContexts
        );
    }
    catch (error) {
        console.error("Error fetching RAG context for media generation:", error);
    }
    const aiResponse = yield (0, openai_adapter_1.generateOpenAiResponse)({
        prompt,
        systemMessage: llmSystemRole_1.llmSystemRole.emailWriter,
        ragData: contextData,
    });
    return aiResponse;
});
exports.generateEmailContent = generateEmailContent;
