"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_JOB_OPTIONS = exports.QUEUE_NAMES = exports.REDIS_CONFIG = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Redis Configuration for BullMQ
exports.REDIS_CONFIG = {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
};
// Queue Names
exports.QUEUE_NAMES = {
    SOCIAL_MEDIA_POST: "social-media-post-queue",
};
// Job Options
exports.DEFAULT_JOB_OPTIONS = {
    attempts: 3,
    backoff: {
        type: "exponential",
        delay: 5000, // 5 seconds initial delay
    },
    removeOnComplete: false,
    removeOnFail: false,
};
