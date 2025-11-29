import dotenv from "dotenv";

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV;
export const MAIL_SERVER_URL = process.env.MAIL_SERVER_URL;

export const port = process.env.PORT;

export const MONGO_URI = process.env.MONGO_URI;
export const jwtSecret = process.env.JWT_SECRET;

export const OPEN_AI_API_KEY = process.env.OPEN_AI_API_KEY;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export const RAG_CONFIG = {
  chunkSize: 1000, // Default chunk size in tokens
  maxTokensPerChunk: 8191, // Max tokens for text-embedding-3-small model
  overlapSize: 100, // Overlap between chunks in tokens
  minChunkSize: 50, // Minimum chunk size in tokens
};
