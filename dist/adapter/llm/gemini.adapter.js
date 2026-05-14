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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiAdapter = void 0;
const genai_1 = require("@google/genai");
const config_1 = require("../../config/config");
const uploadFile_1 = require("../../services/uploadFile/uploadFile");
const fs = __importStar(require("node:fs"));
const mime_types_1 = __importDefault(require("mime-types"));
class GeminiAdapter {
    constructor(apiKey) {
        var _a;
        this.ai = new genai_1.GoogleGenAI({
            apiKey: (_a = apiKey !== null && apiKey !== void 0 ? apiKey : config_1.GEMINI_API_KEY) !== null && _a !== void 0 ? _a : "",
            // apiVersion: "2.0"
        });
    }
    formatRagContext(ragData) {
        if (!ragData.contexts || ragData.contexts.length === 0) {
            return "";
        }
        const relevantContexts = ragData.contexts
            .filter(context => {
            var _a;
            return !ragData.relevanceThreshold ||
                !((_a = context.metadata) === null || _a === void 0 ? void 0 : _a.relevanceScore) ||
                context.metadata.relevanceScore >= ragData.relevanceThreshold;
        })
            .slice(0, ragData.maxContexts || 5);
        if (relevantContexts.length === 0) {
            return "";
        }
        const contextString = relevantContexts
            .map((context, index) => { var _a; return `Context ${index + 1} (${((_a = context.metadata) === null || _a === void 0 ? void 0 : _a.source) || 'unknown'}):\n${context.content}`; })
            .join('\n\n');
        return `\n\nRelevant Context Information:\n${contextString}\n\nPlease use this context information to provide more accurate and relevant responses.`;
    }
    generateImages(config) {
        return __awaiter(this, void 0, void 0, function* () {
            const { prompt, numberOfImages = 1, model = "gemini-2.5-flash-image", s3KeyPrefix = "gemini-images", ragData } = config;
            // Enhance prompt with RAG context if available
            let enhancedPrompt = prompt;
            if (ragData) {
                const ragContext = this.formatRagContext(ragData);
                enhancedPrompt = prompt + ragContext;
            }
            console.log("---------final prompt is-----", enhancedPrompt);
            // const models = await this.ai.models.list();
            // console.log("---------available models-----", models);
            const response = yield this.ai.models.generateContent({
                model,
                contents: enhancedPrompt,
            });
            // Upload each image buffer to S3 and return array of URLs
            const urls = [];
            for (let i = 0; i < response.generatedImages.length; i++) {
                const generatedImage = response.generatedImages[i];
                const imgBytes = generatedImage.image.imageBytes;
                const buffer = Buffer.from(imgBytes, "base64");
                // Try to get mime type from Gemini response, fallback to png
                const mimeType = generatedImage.image.mimeType || "image/png";
                const url = yield (0, uploadFile_1.uploadFileToS3Service)(s3KeyPrefix, buffer, mimeType);
                if (url)
                    urls.push(url);
            }
            return urls;
        });
    }
    generateVideo(config) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { prompt, downloadPath, model = "veo-3.1-generate-preview", s3KeyPrefix = "gemini-videos", ragData } = config;
            // Enhance prompt with RAG context if available
            let enhancedPrompt = prompt;
            if (ragData) {
                const ragContext = this.formatRagContext(ragData);
                enhancedPrompt = prompt + ragContext;
            }
            let operation = yield this.ai.models.generateVideos({
                model,
                prompt: enhancedPrompt,
            });
            // Poll the operation status until the video is ready.
            while (!operation.done) {
                console.log("Waiting for video generation to complete...");
                yield new Promise((resolve) => setTimeout(resolve, 10000));
                operation = yield this.ai.operations.getVideosOperation({
                    operation,
                });
            }
            // Check for response and generatedVideos
            const response = operation.response;
            if (!response || !response.generatedVideos || !response.generatedVideos.length) {
                throw new Error("No video generated or response is undefined.");
            }
            const videoFile = (_a = response.generatedVideos[0]) === null || _a === void 0 ? void 0 : _a.video;
            if (!videoFile) {
                throw new Error("Generated video file is undefined.");
            }
            // Download the generated video locally first
            yield this.ai.files.download({
                file: videoFile,
                downloadPath,
            });
            console.log(`Generated video saved to ${downloadPath}`);
            // Read the video file as buffer
            const buffer = fs.readFileSync(downloadPath);
            // Try to get mime type from Gemini response, fallback to mp4
            const mimeType = mime_types_1.default.lookup(downloadPath) || "video/mp4";
            // Upload to S3
            const url = yield (0, uploadFile_1.uploadFileToS3Service)(s3KeyPrefix, buffer, mimeType);
            return url;
        });
    }
    generateText(config) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                const { prompt, systemMessage, ragData, model = "gemini-flash-lite-latest", maxTokens = 500, temperature = 0.7 } = config;
                // Enhance prompt with RAG context if available
                let enhancedPrompt = prompt;
                if (ragData) {
                    const ragContext = this.formatRagContext(ragData);
                    enhancedPrompt = prompt + ragContext;
                }
                // Combine system message and enhanced prompt
                const fullPrompt = systemMessage ? `${systemMessage}\n\n${enhancedPrompt}` : enhancedPrompt;
                const result = yield this.ai.models.generateContent({
                    model,
                    contents: [{
                            role: 'user',
                            parts: [{
                                    text: fullPrompt
                                }]
                        }]
                });
                const content = ((_e = (_d = (_c = (_b = (_a = result.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) || "";
                const usageMetadata = result.usageMetadata;
                return {
                    prompt: enhancedPrompt,
                    originalPrompt: prompt,
                    content,
                    ragData,
                    usage: {
                        promptTokens: (usageMetadata === null || usageMetadata === void 0 ? void 0 : usageMetadata.promptTokenCount) || 0,
                        completionTokens: (usageMetadata === null || usageMetadata === void 0 ? void 0 : usageMetadata.candidatesTokenCount) || 0,
                        totalTokens: (usageMetadata === null || usageMetadata === void 0 ? void 0 : usageMetadata.totalTokenCount) || 0
                    }
                };
            }
            catch (error) {
                const status = error.status || ((_f = error.response) === null || _f === void 0 ? void 0 : _f.status);
                const message = error.message || "Unknown Gemini Error";
                console.error(`\x1b[31m[GeminiAdapter] Text generation failed (Status: ${status}):\x1b[0m`, message);
                throw error;
            }
        });
    }
}
exports.GeminiAdapter = GeminiAdapter;
