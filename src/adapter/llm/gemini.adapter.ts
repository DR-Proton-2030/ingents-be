import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "../../config/config";
import { IGeminiRequestWithRag, IRagData } from "../../types/interface/ragData.interface";

import { uploadFileToS3Service } from "../../services/uploadFile/uploadFile";
import * as fs from "node:fs";
import mime from "mime-types";

export class GeminiAdapter {
	private ai: GoogleGenAI;

	constructor(apiKey?: string) {
		this.ai = new GoogleGenAI({ 
			apiKey: apiKey ?? GEMINI_API_KEY ?? "",
			// apiVersion: "2.0"
		});
	}

	private formatRagContext(ragData: IRagData): string {
		if (!ragData.contexts || ragData.contexts.length === 0) {
			return "";
		}

		const relevantContexts = ragData.contexts
			.filter(context => 
				!ragData.relevanceThreshold || 
				!context.metadata?.relevanceScore || 
				context.metadata.relevanceScore >= ragData.relevanceThreshold
			)
			.slice(0, ragData.maxContexts || 5);

		if (relevantContexts.length === 0) {
			return "";
		}

		const contextString = relevantContexts
			.map((context, index) => 
				`Context ${index + 1} (${context.metadata?.source || 'unknown'}):\n${context.content}`
			)
			.join('\n\n');

		return `\n\nRelevant Context Information:\n${contextString}\n\nPlease use this context information to provide more accurate and relevant responses.`;
	}

	async generateImages(config: {
		prompt: string;
		numberOfImages?: number;
		model?: string;
		s3KeyPrefix?: string;
		ragData?: IRagData;
	}) {
		const {
			prompt,
			numberOfImages = 1,
			model="gemini-2.5-flash-image",
			s3KeyPrefix = "gemini-images",
			ragData
		} = config;

		// Enhance prompt with RAG context if available
		let enhancedPrompt = prompt;
		if (ragData) {
			const ragContext = this.formatRagContext(ragData);
			enhancedPrompt = prompt + ragContext;
		}
		console.log("---------final prompt is-----", enhancedPrompt);
		// const models = await this.ai.models.list();
		// console.log("---------available models-----", models);
		const response: any = await this.ai.models.generateContent({
			model,
			contents: enhancedPrompt,
		});
		// Upload each image buffer to S3 and return array of URLs
		const urls: string[] = [];
		for (let i = 0; i < response.generatedImages.length; i++) {
			const generatedImage = response.generatedImages[i];
			const imgBytes = generatedImage.image.imageBytes;
			const buffer = Buffer.from(imgBytes, "base64");
			// Try to get mime type from Gemini response, fallback to png
			const mimeType = generatedImage.image.mimeType || "image/png";
			const url = await uploadFileToS3Service(
				s3KeyPrefix,
				buffer,
				mimeType
			);
			if (url) urls.push(url);
		}
		return urls;
	}

	async generateVideo(config: {
		prompt: string;
		downloadPath: string;
		model?: string;
		s3KeyPrefix?: string;
		ragData?: IRagData;
	}) {
		const {
			prompt,
			downloadPath,
			model = "veo-3.1-generate-preview",
			s3KeyPrefix = "gemini-videos",
			ragData
		} = config;

		// Enhance prompt with RAG context if available
		let enhancedPrompt = prompt;
		if (ragData) {
			const ragContext = this.formatRagContext(ragData);
			enhancedPrompt = prompt + ragContext;
		}
		let operation = await this.ai.models.generateVideos({
			model,
			prompt: enhancedPrompt,
		});

		// Poll the operation status until the video is ready.
		while (!operation.done) {
			console.log("Waiting for video generation to complete...");
			await new Promise((resolve) => setTimeout(resolve, 10000));
			operation = await this.ai.operations.getVideosOperation({
				operation,
			});
		}

		// Check for response and generatedVideos
		const response = operation.response;
		if (!response || !response.generatedVideos || !response.generatedVideos.length) {
			throw new Error("No video generated or response is undefined.");
		}
		const videoFile = response.generatedVideos[0]?.video;
		if (!videoFile) {
			throw new Error("Generated video file is undefined.");
		}

		// Download the generated video locally first
		await this.ai.files.download({
			file: videoFile,
			downloadPath,
		});
		console.log(`Generated video saved to ${downloadPath}`);

		// Read the video file as buffer
		const buffer = fs.readFileSync(downloadPath);
		// Try to get mime type from Gemini response, fallback to mp4
		const mimeType = mime.lookup(downloadPath) || "video/mp4";
		// Upload to S3
		const url = await uploadFileToS3Service(
			s3KeyPrefix,
			buffer,
			mimeType as string
		);
		return url;
	}

	async generateText(config: IGeminiRequestWithRag) {
		try {
			const {
				prompt,
				systemMessage,
				ragData,
				model = "gemini-flash-lite-latest",
				maxTokens = 500,
				temperature = 0.7
			} = config;

			// Enhance prompt with RAG context if available
			let enhancedPrompt = prompt;
			if (ragData) {
				const ragContext = this.formatRagContext(ragData);
				enhancedPrompt = prompt + ragContext;
			}

			// Combine system message and enhanced prompt
			const fullPrompt = systemMessage ? `${systemMessage}\n\n${enhancedPrompt}` : enhancedPrompt;

			const result = await this.ai.models.generateContent({
				model,
				contents: [{
					role: 'user',
					parts: [{
						text: fullPrompt
					}]
				}]
			});

			const content = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

			return {
				prompt: enhancedPrompt,
				originalPrompt: prompt,
				content,
				ragData,
			};
		} catch (error: any) {
			const status = error.status || error.response?.status;
			const message = error.message || "Unknown Gemini Error";
			console.error(`\x1b[31m[GeminiAdapter] Text generation failed (Status: ${status}):\x1b[0m`, message);
			throw error;
		}
	}
}
