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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSchedulerAvailable = exports.getQueueStatus = exports.initializeWorker = exports.processPostJob = exports.getPostedContent = exports.getScheduledPosts = exports.reschedulePost = exports.cancelScheduledPost = exports.schedulePost = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
const redis_config_1 = require("../../config/redis.config");
const scheduledPost_model_1 = __importDefault(require("../../models/scheduledPost/scheduledPost.model"));
const postedContent_model_1 = __importDefault(require("../../models/postedContent/postedContent.model"));
const postToFacebook_1 = require("../facebook/postToFacebook");
const postToInstagram_1 = require("../instagram/postToInstagram");
const postToYoutube_1 = require("../youtube/postToYoutube");
const postToX_1 = require("../x/postToX");
const mongoose_1 = require("mongoose");
// Track if Redis is available
let isRedisAvailable = false;
let socialMediaQueue = null;
let queueEvents = null;
// Initialize Queue lazily
const getQueue = () => {
    if (!isRedisAvailable)
        return null;
    if (!socialMediaQueue) {
        socialMediaQueue = new bullmq_1.Queue(redis_config_1.QUEUE_NAMES.SOCIAL_MEDIA_POST, {
            connection: redis_config_1.REDIS_CONFIG,
            defaultJobOptions: redis_config_1.DEFAULT_JOB_OPTIONS,
        });
    }
    return socialMediaQueue;
};
// Schedule a social media post
const schedulePost = (postData) => __awaiter(void 0, void 0, void 0, function* () {
    // Create scheduled post in database
    const scheduledPost = yield scheduledPost_model_1.default.create(Object.assign(Object.assign({}, postData), { status: "pending" }));
    // Calculate delay until scheduled time
    const delay = new Date(postData.scheduled_at).getTime() - Date.now();
    // Only schedule if delay is positive (future time) and Redis is available
    const queue = getQueue();
    if (delay > 0 && queue) {
        const job = yield queue.add("post", {
            scheduledPostId: scheduledPost._id.toString(),
            platform: postData.platform,
            userId: postData.user_id.toString(),
            content: postData.content,
            mediaUrls: postData.media_urls,
            mediaType: postData.media_type,
            hashtags: postData.hashtags,
            pageId: postData.page_id,
            channelId: postData.channel_id,
            platformSpecificData: postData.platform_specific_data,
        }, {
            delay,
            jobId: scheduledPost._id.toString(),
        });
        // Update scheduled post with job ID
        yield scheduledPost_model_1.default.findByIdAndUpdate(scheduledPost._id, {
            job_id: job.id,
        });
        scheduledPost.job_id = job.id;
    }
    else if (delay <= 0) {
        // If scheduled time is in the past, mark as failed
        yield scheduledPost_model_1.default.findByIdAndUpdate(scheduledPost._id, {
            status: "failed",
            error_message: "Scheduled time is in the past",
        });
    }
    // If Redis not available, post stays in pending state in DB
    return scheduledPost;
});
exports.schedulePost = schedulePost;
// Cancel a scheduled post
const cancelScheduledPost = (postId) => __awaiter(void 0, void 0, void 0, function* () {
    const scheduledPost = yield scheduledPost_model_1.default.findById(postId);
    if (!scheduledPost) {
        throw new Error("Scheduled post not found");
    }
    if (scheduledPost.status !== "pending") {
        throw new Error("Cannot cancel a post that is not pending");
    }
    // Remove job from queue if Redis is available
    const queue = getQueue();
    if (scheduledPost.job_id && queue) {
        const job = yield queue.getJob(scheduledPost.job_id);
        if (job) {
            yield job.remove();
        }
    }
    // Update status in database
    yield scheduledPost_model_1.default.findByIdAndUpdate(postId, {
        status: "cancelled",
    });
    return true;
});
exports.cancelScheduledPost = cancelScheduledPost;
// Reschedule a post
const reschedulePost = (postId, newScheduledAt) => __awaiter(void 0, void 0, void 0, function* () {
    const scheduledPost = yield scheduledPost_model_1.default.findById(postId);
    if (!scheduledPost) {
        throw new Error("Scheduled post not found");
    }
    if (scheduledPost.status !== "pending") {
        throw new Error("Cannot reschedule a post that is not pending");
    }
    // Remove existing job if Redis is available
    const queue = getQueue();
    if (scheduledPost.job_id && queue) {
        const existingJob = yield queue.getJob(scheduledPost.job_id);
        if (existingJob) {
            yield existingJob.remove();
        }
    }
    // Calculate new delay
    const delay = newScheduledAt.getTime() - Date.now();
    if (delay <= 0) {
        throw new Error("New scheduled time must be in the future");
    }
    let newJobId;
    // Add new job with updated delay if Redis is available
    if (queue) {
        const newJob = yield queue.add("post", {
            scheduledPostId: scheduledPost._id.toString(),
            platform: scheduledPost.platform,
            userId: scheduledPost.user_id.toString(),
            content: scheduledPost.content,
            mediaUrls: scheduledPost.media_urls,
            mediaType: scheduledPost.media_type,
            hashtags: scheduledPost.hashtags,
            pageId: scheduledPost.page_id,
            channelId: scheduledPost.channel_id,
            platformSpecificData: scheduledPost.platform_specific_data,
        }, {
            delay,
            jobId: `${scheduledPost._id.toString()}-${Date.now()}`,
        });
        newJobId = newJob.id;
    }
    // Update scheduled post
    const updatedPost = yield scheduledPost_model_1.default.findByIdAndUpdate(postId, {
        scheduled_at: newScheduledAt,
        job_id: newJobId,
    }, { new: true });
    return updatedPost;
});
exports.reschedulePost = reschedulePost;
// Get scheduled posts for a user
const getScheduledPosts = (userId, status, platform) => __awaiter(void 0, void 0, void 0, function* () {
    const query = { user_id: new mongoose_1.Types.ObjectId(userId) };
    if (status) {
        query.status = status;
    }
    if (platform) {
        query.platform = platform;
    }
    return scheduledPost_model_1.default.find(query).sort({ scheduled_at: 1 });
});
exports.getScheduledPosts = getScheduledPosts;
// Get posted content for a user
const getPostedContent = (userId, platform, limit) => __awaiter(void 0, void 0, void 0, function* () {
    const query = { user_id: new mongoose_1.Types.ObjectId(userId) };
    if (platform) {
        query.platform = platform;
    }
    let queryBuilder = postedContent_model_1.default.find(query).sort({ posted_at: -1 });
    if (limit) {
        queryBuilder = queryBuilder.limit(limit);
    }
    return queryBuilder;
});
exports.getPostedContent = getPostedContent;
// Process the job - called by worker
const processPostJob = (job) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { scheduledPostId, platform, userId, content, mediaUrls, hashtags, pageId, channelId, platformSpecificData } = job.data;
    // Update status to processing
    yield scheduledPost_model_1.default.findByIdAndUpdate(scheduledPostId, {
        status: "processing",
    });
    let platformResponse;
    let platformPostId;
    try {
        // Post to the appropriate platform
        switch (platform) {
            case "facebook":
                platformResponse = yield (0, postToFacebook_1.postToFacebook)({
                    userId,
                    pageId: pageId,
                    message: content,
                    mediaUrls,
                    hashtags,
                });
                platformPostId = platformResponse === null || platformResponse === void 0 ? void 0 : platformResponse.id;
                break;
            case "instagram":
                platformResponse = yield (0, postToInstagram_1.postToInstagram)({
                    userId,
                    message: content,
                    mediaUrls,
                    hashtags,
                });
                platformPostId = platformResponse === null || platformResponse === void 0 ? void 0 : platformResponse.id;
                break;
            case "youtube":
                platformResponse = yield (0, postToYoutube_1.postToYoutube)({
                    userId,
                    title: (platformSpecificData === null || platformSpecificData === void 0 ? void 0 : platformSpecificData.title) || content.slice(0, 100),
                    description: content,
                    videoUrl: (mediaUrls === null || mediaUrls === void 0 ? void 0 : mediaUrls[0]) || "",
                    tags: hashtags,
                    privacyStatus: (platformSpecificData === null || platformSpecificData === void 0 ? void 0 : platformSpecificData.privacyStatus) || "public",
                    thumbnailDataUrl: platformSpecificData === null || platformSpecificData === void 0 ? void 0 : platformSpecificData.thumbnailDataUrl,
                });
                platformPostId = platformResponse === null || platformResponse === void 0 ? void 0 : platformResponse.id;
                break;
            case "x":
                platformResponse = yield (0, postToX_1.postToX)({
                    userId,
                    message: content,
                    mediaUrls,
                    hashtags,
                });
                platformPostId = (_a = platformResponse === null || platformResponse === void 0 ? void 0 : platformResponse.data) === null || _a === void 0 ? void 0 : _a.id;
                break;
            default:
                throw new Error(`Unknown platform: ${platform}`);
        }
        // Update scheduled post status to completed
        yield scheduledPost_model_1.default.findByIdAndUpdate(scheduledPostId, {
            status: "completed",
        });
        // Create posted content record
        const scheduledPost = yield scheduledPost_model_1.default.findById(scheduledPostId);
        yield postedContent_model_1.default.create({
            user_id: new mongoose_1.Types.ObjectId(userId),
            scheduled_post_id: new mongoose_1.Types.ObjectId(scheduledPostId),
            platform,
            content,
            media_urls: mediaUrls,
            media_type: (mediaUrls === null || mediaUrls === void 0 ? void 0 : mediaUrls.length) ? (((_b = mediaUrls[0]) === null || _b === void 0 ? void 0 : _b.includes("video")) ? "video" : "image") : "text",
            hashtags,
            posted_at: new Date(),
            platform_post_id: platformPostId,
            platform_response: platformResponse,
            page_id: pageId,
            channel_id: channelId,
            is_scheduled: true,
            status: "published",
        });
        return { success: true, platformResponse };
    }
    catch (error) {
        // Update scheduled post with error
        const retryCount = (job.attemptsMade || 0) + 1;
        const maxRetries = job.opts.attempts || 3;
        yield scheduledPost_model_1.default.findByIdAndUpdate(scheduledPostId, {
            status: retryCount >= maxRetries ? "failed" : "pending",
            error_message: error.message,
            retry_count: retryCount,
        });
        // If max retries reached, create failed posted content record
        if (retryCount >= maxRetries) {
            yield postedContent_model_1.default.create({
                user_id: new mongoose_1.Types.ObjectId(userId),
                scheduled_post_id: new mongoose_1.Types.ObjectId(scheduledPostId),
                platform,
                content,
                media_urls: mediaUrls,
                hashtags,
                posted_at: new Date(),
                is_scheduled: true,
                status: "failed",
                error_message: error.message,
            });
        }
        throw error;
    }
});
exports.processPostJob = processPostJob;
// Initialize Worker
const initializeWorker = () => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve) => {
        try {
            // Test Redis connection first using ioredis directly
            const testConnection = new ioredis_1.Redis({
                host: redis_config_1.REDIS_CONFIG.host,
                port: redis_config_1.REDIS_CONFIG.port,
                password: redis_config_1.REDIS_CONFIG.password,
                maxRetriesPerRequest: 1,
                retryStrategy: () => null, // Don't retry
                lazyConnect: true,
                enableOfflineQueue: false,
            });
            // Suppress error events on test connection - we handle them in catch
            testConnection.on("error", () => { });
            testConnection.connect()
                .then(() => __awaiter(void 0, void 0, void 0, function* () {
                yield testConnection.ping();
                yield testConnection.quit();
                isRedisAvailable = true;
                console.log("\x1b[32m[Redis] Connection successful\x1b[0m");
                // Initialize the actual queue
                socialMediaQueue = new bullmq_1.Queue(redis_config_1.QUEUE_NAMES.SOCIAL_MEDIA_POST, {
                    connection: redis_config_1.REDIS_CONFIG,
                    defaultJobOptions: redis_config_1.DEFAULT_JOB_OPTIONS,
                });
                // Initialize queue events
                queueEvents = new bullmq_1.QueueEvents(redis_config_1.QUEUE_NAMES.SOCIAL_MEDIA_POST, {
                    connection: redis_config_1.REDIS_CONFIG,
                });
                const worker = new bullmq_1.Worker(redis_config_1.QUEUE_NAMES.SOCIAL_MEDIA_POST, (job) => __awaiter(void 0, void 0, void 0, function* () {
                    console.log(`Processing job ${job.id} for platform ${job.data.platform}`);
                    return (0, exports.processPostJob)(job);
                }), {
                    connection: redis_config_1.REDIS_CONFIG,
                    concurrency: 5,
                });
                // Worker event handlers
                worker.on("completed", (job) => {
                    console.log(`Job ${job === null || job === void 0 ? void 0 : job.id} completed successfully`);
                });
                worker.on("failed", (job, err) => {
                    console.error(`Job ${job === null || job === void 0 ? void 0 : job.id} failed with error:`, err.message);
                });
                worker.on("error", (err) => {
                    console.error("Worker error:", err.message);
                });
                resolve(worker);
            }))
                .catch(() => {
                isRedisAvailable = false;
                testConnection.disconnect();
                console.warn("\x1b[33m[Redis] Not available - Scheduler features disabled. Start Redis to enable scheduling.\x1b[0m");
                resolve(null);
            });
        }
        catch (error) {
            isRedisAvailable = false;
            console.warn("\x1b[33m[Redis] Not available - Scheduler features disabled.\x1b[0m");
            resolve(null);
        }
    });
});
exports.initializeWorker = initializeWorker;
// Queue status helper
const getQueueStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    const queue = getQueue();
    if (!queue) {
        return {
            available: false,
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
            delayed: 0
        };
    }
    const [waiting, active, completed, failed, delayed] = yield Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
    ]);
    return { available: true, waiting, active, completed, failed, delayed };
});
exports.getQueueStatus = getQueueStatus;
// Check if Redis/Scheduler is available
const isSchedulerAvailable = () => isRedisAvailable;
exports.isSchedulerAvailable = isSchedulerAvailable;
