import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "../../config/config";

import { uploadFileToS3Service } from "../../services/uploadFile/uploadFile";
import * as fs from "node:fs";
import mime from "mime-types";

export class GeminiAdapter {
	private ai: GoogleGenAI;

	constructor(apiKey?: string) {
		this.ai = new GoogleGenAI({ apiKey: apiKey ?? GEMINI_API_KEY ?? "" });
	}

	async generateImages({
		prompt,
		numberOfImages = 1,
		model = "imagen-4.0-generate-001",
		s3KeyPrefix = "gemini-images"
	}: {
		prompt: string;
		numberOfImages?: number;
		model?: string;
		s3KeyPrefix?: string;
	}) {
		const response: any = await this.ai.models.generateImages({
			model,
			prompt,
			config: {
				numberOfImages,
			},
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

	async generateVideo({
		prompt,
		downloadPath,
		model = "veo-3.1-generate-preview",
		s3KeyPrefix = "gemini-videos"
	}: {
		prompt: string;
		downloadPath: string;
		model?: string;
		s3KeyPrefix?: string;
	}) {
		let operation = await this.ai.models.generateVideos({
			model,
			prompt,
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
}
