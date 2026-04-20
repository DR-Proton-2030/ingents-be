"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPOSIO_API_KEY = exports.RAZORPAY_KEY_SECRET = exports.RAZORPAY_KEY_ID = exports.REDIRECT_URI = exports.GOOGLE_CLIENT_SECRET = exports.GOOGLE_CLIENT_ID = exports.FRONTEND_URL = exports.SETU_CLIENT_SECRET = exports.SETU_CLIENT_ID = exports.RAG_CONFIG = exports.HUGGINGFACE_API_KEY = exports.GEMINI_API_KEY = exports.OPEN_AI_API_KEY = exports.jwtSecret = exports.MONGO_URI = exports.port = exports.MAIL_SERVER_URL = exports.NODE_ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.NODE_ENV = process.env.NODE_ENV;
exports.MAIL_SERVER_URL = process.env.MAIL_SERVER_URL;
exports.port = process.env.PORT;
exports.MONGO_URI = process.env.MONGO_URI;
exports.jwtSecret = process.env.JWT_SECRET;
exports.OPEN_AI_API_KEY = process.env.OPEN_AI_API_KEY;
exports.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
exports.HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
exports.RAG_CONFIG = {
    chunkSize: 1000, // Default chunk size in tokens
    maxTokensPerChunk: 8191, // Max tokens for text-embedding-3-small model
    overlapSize: 100, // Overlap between chunks in tokens
    minChunkSize: 50, // Minimum chunk size in tokens
};
exports.SETU_CLIENT_ID = process.env.SETU_CLIENT_ID;
exports.SETU_CLIENT_SECRET = process.env.SETU_CLIENT_SECRET;
exports.FRONTEND_URL = process.env.FRONTEND_URL;
exports.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
exports.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
exports.REDIRECT_URI = process.env.REDIRECT_URI;
exports.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
exports.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
exports.COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY;
