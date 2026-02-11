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
exports.generateImageWithGemini = void 0;
const config_1 = require("../../config/config");
const uploadFile_1 = require("../uploadFile/uploadFile");
const generateImageWithGemini = (prompt_1, ...args_1) => __awaiter(void 0, [prompt_1, ...args_1], void 0, function* (prompt, s3KeyPrefix = "generated-images") {
    try {
        console.log("Starting image generation with prompt:", prompt);
        const apiKey = config_1.HUGGINGFACE_API_KEY !== null && config_1.HUGGINGFACE_API_KEY !== void 0 ? config_1.HUGGINGFACE_API_KEY : "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";
        const response = yield fetch("https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0", {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({ inputs: prompt }),
        });
        console.log("HF API Response status:", response.status);
        if (!response.ok) {
            const txt = yield response.text().catch(() => "(no body)");
            console.error("HF image generation error:", response.status, txt);
            return null;
        }
        const arrayBuffer = yield response.arrayBuffer();
        console.log("Received image data, size:", arrayBuffer.byteLength);
        let base64;
        if (typeof Buffer !== "undefined") {
            base64 = Buffer.from(arrayBuffer).toString("base64");
        }
        else {
            let binary = "";
            const bytes = new Uint8Array(arrayBuffer);
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
            }
            base64 = btoa(binary);
        }
        console.log("Converted to base64, length:", base64.length);
        try {
            console.log("Attempting S3 upload...");
            const s3Url = yield (0, uploadFile_1.uploadBase64ToS3)(base64, s3KeyPrefix, "image/png");
            if (s3Url) {
                console.log("S3 upload successful:", s3Url);
                return s3Url;
            }
        }
        catch (s3Err) {
            console.error("S3 upload failed:", s3Err);
        }
        const dataUrl = `data:image/png;base64,${base64}`;
        console.log("Returning data URL fallback");
        return dataUrl;
    }
    catch (error) {
        console.error("Error generating image with Gemini:", error);
        return null;
    }
});
exports.generateImageWithGemini = generateImageWithGemini;
