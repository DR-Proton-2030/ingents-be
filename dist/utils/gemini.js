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
exports.generateGeminiPdfContent = exports.generateGeminiVideo = exports.generateGeminiImage = void 0;
const generative_ai_1 = require("@google/generative-ai");
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. Gemini features will not work.");
}
const genAI = apiKey ? new generative_ai_1.GoogleGenerativeAI(apiKey) : null;
function generateGeminiImage(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!genAI)
            throw new Error("Gemini client not initialized");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = yield model.generateContent([
            {
                text: `Create a detailed description for an image based on this request: ${prompt}`,
            },
        ]);
        const text = result.response.text();
        if (!text)
            throw new Error("Empty Gemini image description response");
        return text;
    });
}
exports.generateGeminiImage = generateGeminiImage;
function generateGeminiVideo(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!genAI)
            throw new Error("Gemini client not initialized");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = yield model.generateContent([
            {
                text: `Create a storyboard or detailed description for a short marketing video based on this request: ${prompt}`,
            },
        ]);
        const text = result.response.text();
        if (!text)
            throw new Error("Empty Gemini video description response");
        return text;
    });
}
exports.generateGeminiVideo = generateGeminiVideo;
function generateGeminiPdfContent(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!genAI)
            throw new Error("Gemini client not initialized");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = yield model.generateContent([
            {
                text: `Generate structured content suitable for a PDF document based on this request: ${prompt}`,
            },
        ]);
        const text = result.response.text();
        if (!text)
            throw new Error("Empty Gemini PDF content response");
        return text;
    });
}
exports.generateGeminiPdfContent = generateGeminiPdfContent;
