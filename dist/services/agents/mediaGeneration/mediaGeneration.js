"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.generateMediaWithGemini = void 0;
const llmWithRag_service_1 = require("../../llmWithRag/llmWithRag.service");
const path = __importStar(require("node:path"));
const llmWithRagService = new llmWithRag_service_1.LLMWithRagService();
function generateMediaWithGemini(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { prompt, numberOfImages = 1, companyObjectId } = options;
        const type = prompt.toLowerCase().includes("video") ? "video" : "image";
        // Fetch RAG context from CompanySettings using embeddings
        let contextData;
        try {
            // Fetch company-specific RAG context from CompanySettings model
            // This uses embeddings for semantic similarity search
            contextData = yield llmWithRagService.getCompanyRagContext(companyObjectId, prompt, 5 // maxContexts
            );
        }
        catch (error) {
            console.error("Error fetching RAG context for media generation:", error);
            // Continue without RAG context
        }
        if (type === "video") {
            const downloadPath = path.join(process.cwd(), `gemini-video-${Date.now()}.mp4`);
            const s3KeyPrefix = `gemini-video-${Date.now()}.mp4`;
            const url = yield llmWithRagService.generateGeminiVideoWithRag(prompt, downloadPath, contextData, s3KeyPrefix);
            return {
                content: "I've generated a video based on your request.",
                files: [url]
            };
        }
        else {
            // type === "image"
            const s3KeyPrefix = `gemini-image-${Date.now()}.png`;
            const result = yield llmWithRagService.generateGeminiImagesWithRag(prompt, contextData, numberOfImages, s3KeyPrefix);
            // Handle new return format from generateImages
            // Result is { urls: string[], logoUrl?: string, companyName?: string }
            const urls = result.urls || result;
            const logoUrl = result.logoUrl;
            const companyName = result.companyName;
            const logoInfo = logoUrl
                ? `\n\nNote: Your company logo (${companyName}) should be added from: ${logoUrl}`
                : '';
            return {
                content: `I've generated ${Array.isArray(urls) ? urls.length : 1} image(s) based on your request.${logoInfo}`,
                files: Array.isArray(urls) ? urls : [urls]
            };
        }
    });
}
exports.generateMediaWithGemini = generateMediaWithGemini;
