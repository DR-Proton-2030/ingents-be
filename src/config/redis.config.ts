import dotenv from "dotenv";

dotenv.config();

// Redis Configuration for BullMQ
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

// Queue Names
export const QUEUE_NAMES = {
  SOCIAL_MEDIA_POST: "social-media-post-queue",
  SUBSCRIPTION_MANAGEMENT: "subscription-management-queue",
};

// Job Options
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 5000, // 5 seconds initial delay
  },
  removeOnComplete: false,
  removeOnFail: false,
};
