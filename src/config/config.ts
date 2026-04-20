import dotenv from "dotenv";

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV;
export const MAIL_SERVER_URL = process.env.MAIL_SERVER_URL;

export const port = process.env.PORT;

export const MONGO_URI = process.env.MONGO_URI;
export const jwtSecret = process.env.JWT_SECRET;

export const OPEN_AI_API_KEY = process.env.OPEN_AI_API_KEY;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

export const RAG_CONFIG = {
  chunkSize: 1000, // Default chunk size in tokens
  maxTokensPerChunk: 8191, // Max tokens for text-embedding-3-small model
  overlapSize: 100, // Overlap between chunks in tokens
  minChunkSize: 50, // Minimum chunk size in tokens
};

export const SETU_CLIENT_ID = process.env.SETU_CLIENT_ID;
export const SETU_CLIENT_SECRET = process.env.SETU_CLIENT_SECRET;

export const FRONTEND_URL = process.env.FRONTEND_URL;

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const REDIRECT_URI = process.env.REDIRECT_URI;

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY;
export const BACKEND_PUBLIC_URL =
  process.env.BACKEND_PUBLIC_URL || `http://localhost:${port || 8989}`;