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
exports.isSchedulerAvailable = exports.getQueueStatus = exports.initializeWorker = exports.processPostJob = exports.getPostedContent = exports.getScheduledPosts = exports.reschedulePost = exports.cancelScheduledPost = exports.triggerCampaignNow = exports.cancelRecurringCampaign = exports.scheduleRecurringCampaign = exports.schedulePost = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
const redis_config_1 = require("../../config/redis.config");
const scheduledPost_model_1 = __importDefault(require("../../models/scheduledPost/scheduledPost.model"));
const postedContent_model_1 = __importDefault(require("../../models/postedContent/postedContent.model"));
const campaign_model_1 = __importDefault(require("../../models/campaign/campaign.model"));
const users_model_1 = __importDefault(require("../../models/users/users.model"));
const postToFacebook_1 = require("../facebook/postToFacebook");
const postToInstagram_1 = require("../instagram/postToInstagram");
const postToYoutube_1 = require("../youtube/postToYoutube");
const postToX_1 = require("../x/postToX");
const mongoose_1 = require("mongoose");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const llmWithRag_service_1 = require("../llmWithRag/llmWithRag.service");
const aiTokenUsage_model_1 = __importDefault(require("../../models/aiTokenUsage/aiTokenUsage.model"));
const subscription_model_1 = __importDefault(require("../../models/subscription/subscription.model"));
const PLAN_LIMITS = {
    free: 1000,
    pro: 3000,
    pro_plus: 10000,
};
const llmService = new llmWithRag_service_1.LLMWithRagService();
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
        // Add global error handler to prevent unhandled error event noise
        socialMediaQueue.on("error", (err) => {
            console.error(`[Scheduler] Queue Error: ${err.message}`);
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
// Map day strings to cron day numbers (0-6)
const DAY_MAP = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
};
// Schedule a repeatable campaign trigger
const scheduleRecurringCampaign = (campaignId, timeString, // format: "HH:MM" e.g., "14:30"
days // e.g., ["Mon", "Wed"]
) => __awaiter(void 0, void 0, void 0, function* () {
    const queue = getQueue();
    if (!queue)
        return;
    const [hours, minutes] = timeString.split(":");
    const numericDays = days.map(day => DAY_MAP[day]).filter(d => d !== undefined).join(",");
    if (!numericDays || !hours || !minutes) {
        throw new Error("Invalid schedule parameters for repeatable job");
    }
    // standard cron: MINUTE HOUR * * DAYS
    const cronPattern = `${parseInt(minutes)} ${parseInt(hours)} * * ${numericDays}`;
    yield queue.add("campaign-trigger", { campaignId }, // bypassing interface strictness for the trigger payload
    {
        repeat: { pattern: cronPattern },
        jobId: `campaign-trigger-${campaignId}`,
    });
});
exports.scheduleRecurringCampaign = scheduleRecurringCampaign;
// Cancel a repeatable campaign trigger
const cancelRecurringCampaign = (campaignId) => __awaiter(void 0, void 0, void 0, function* () {
    const queue = getQueue();
    if (!queue)
        return;
    const repeatableJobs = yield queue.getRepeatableJobs();
    const job = repeatableJobs.find(j => j.id === `campaign-trigger-${campaignId}`);
    if (job) {
        yield queue.removeRepeatableByKey(job.key);
    }
});
exports.cancelRecurringCampaign = cancelRecurringCampaign;
// Trigger a campaign once (one-time blast)
const triggerCampaignNow = (campaignId) => __awaiter(void 0, void 0, void 0, function* () {
    const queue = getQueue();
    if (!queue)
        return;
    yield queue.add("campaign-trigger", { campaignId }, {
        jobId: `campaign-trigger-once-${campaignId}-${Date.now()}`,
        removeOnComplete: true,
    });
});
exports.triggerCampaignNow = triggerCampaignNow;
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    if (job.name === "campaign-trigger") {
        const triggerData = job.data;
        const campaign = yield campaign_model_1.default.findById(triggerData.campaignId);
        if (!campaign || campaign.status !== "active") {
            return { message: "Campaign inactive or not found, ignored." };
        }
        const user = yield users_model_1.default.findById(campaign.created_by_user_object_id);
        if (!user)
            return { message: "User not found." };
        let finalContent = campaign.message_content;
        if (campaign.use_ai_generation && campaign.ai_context) {
            console.log(`[Scheduler] Generating AI content for campaign ${campaign._id}...`);
            try {
                // 1. Check organization-wide AI limits
                const subscription = yield subscription_model_1.default.findOne({
                    company_id: campaign.company_object_id,
                    status: { $in: ["active", "past_due"] },
                }).sort({ amount: -1, createdAt: -1 });
                const plan = (subscription === null || subscription === void 0 ? void 0 : subscription.plan) || "free";
                const limit = PLAN_LIMITS[plan] || 1000;
                const usage = yield aiTokenUsage_model_1.default.aggregate([
                    { $match: { company_object_id: new mongoose_1.Types.ObjectId(campaign.company_object_id) } },
                    { $group: { _id: null, total: { $sum: "$tokens_used" } } },
                ]);
                const totalUsed = usage.length > 0 ? usage[0].total : 0;
                if (totalUsed >= limit) {
                    console.warn(`[Scheduler] AI limit reached for company ${campaign.company_object_id}. Skipping generation.`);
                    // Optionally notify user or mark campaign as paused
                    return { success: false, message: "AI credit limit reached." };
                }
                // Use Gemini for high quality generative content
                const result = yield llmService.generateGeminiResponseWithRag(`Generate a professional and engaging social media post based on this brief: "${campaign.ai_context}". Only return the post content text.`, "You are a creative social media manager expert at writing viral and engaging posts.");
                if (result && result.content) {
                    finalContent = result.content;
                    console.log(`[Scheduler] AI Content generated successfully.`, result);
                    // Update campaign with generated content so it's visible in UI
                    yield campaign_model_1.default.findByIdAndUpdate(campaign._id, { message_content: finalContent });
                    if (result.usage) {
                        yield aiTokenUsage_model_1.default.create({
                            company_object_id: campaign.company_object_id,
                            user_object_id: campaign.created_by_user_object_id,
                            feature: "campaign_generation",
                            tokens_used: result.usage.totalTokens,
                            prompt_tokens: result.usage.promptTokens,
                            completion_tokens: result.usage.completionTokens,
                        });
                    }
                }
                else {
                    console.warn(`[Scheduler] AI returned empty content for campaign ${campaign._id}`);
                }
            }
            catch (err) {
                const errorDetail = ((_b = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || err;
                console.error(`\x1b[31m[Scheduler] AI generation failed for campaign ${campaign._id}:\x1b[0m`, JSON.stringify(errorDetail, null, 2));
                if (((_c = err.message) === null || _c === void 0 ? void 0 : _c.includes("SERVICE_DISABLED")) || JSON.stringify(errorDetail).includes("SERVICE_DISABLED")) {
                    console.error(`\x1b[33m[CRITICAL] Gemini API is not enabled. Please enable it at: https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/overview?project=589284612267\x1b[0m`);
                }
            }
        }
        if (!finalContent || finalContent.trim() === "") {
            console.error(`\x1b[31m[Scheduler] Campaign ${campaign._id} ("${campaign.name}") has no message content. Aborting trigger.\x1b[0m`);
            return { success: false, message: "Campaign content is empty. Generation might have failed." };
        }
        if (campaign.type === "whatsapp_messenger") {
            if (!((_d = user.whatsapp) === null || _d === void 0 ? void 0 : _d.phone_number_id) || !((_e = user.whatsapp) === null || _e === void 0 ? void 0 : _e.access_token)) {
                return { message: "WhatsApp API credentials not found or disconnected." };
            }
            const targetNumbers = campaign.target_numbers || [];
            console.log(`[Scheduler] Firing recurring WhatsApp campaign ${campaign._id} to ${targetNumbers.length} numbers.`);
            // Distribute messages securely (not async bombing at once) via delay buffer if needed, 
            // for now just simple sequential queue processing
            for (const number of targetNumbers) {
                try {
                    yield (0, whatsapp_service_1.sendWhatsappMessage)(user.whatsapp.phone_number_id, user.whatsapp.access_token, number, finalContent);
                }
                catch (e) {
                    console.error(`Failed to send WhatsApp message to ${number}`, e);
                }
            }
            return { success: true, message: "WhatsApp broadcast completed." };
        }
        // Social Broadcaster logic
        const platforms = [];
        if (((_f = user.facebook) === null || _f === void 0 ? void 0 : _f.access_token) && ((_g = user.facebook) === null || _g === void 0 ? void 0 : _g.project_id))
            platforms.push("facebook");
        if ((_h = user.instagram) === null || _h === void 0 ? void 0 : _h.access_token)
            platforms.push("instagram");
        if ((_j = user.youtube) === null || _j === void 0 ? void 0 : _j.access_token)
            platforms.push("youtube");
        if ((_k = user.x) === null || _k === void 0 ? void 0 : _k.access_token)
            platforms.push("x");
        console.log(`[Scheduler] Firing recurring campaign ${campaign._id} to platforms:`, platforms);
        for (const platform of platforms) {
            try {
                yield (0, exports.schedulePost)({
                    user_id: new mongoose_1.Types.ObjectId(user._id.toString()),
                    platform,
                    content: finalContent,
                    media_urls: [],
                    media_type: "text",
                    hashtags: ["#campaign"],
                    scheduled_at: new Date(Date.now() + 5000), // Minor offset
                    page_id: platform === "facebook" ? (_l = user.facebook) === null || _l === void 0 ? void 0 : _l.project_id : undefined,
                });
            }
            catch (e) {
                console.error(`Failed to propagate campaign post for ${platform}`, e);
            }
        }
        return { success: true, message: "Campaign generated localized scheduled posts." };
    }
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
                platformPostId = (_m = platformResponse === null || platformResponse === void 0 ? void 0 : platformResponse.data) === null || _m === void 0 ? void 0 : _m.id;
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
            media_type: (mediaUrls === null || mediaUrls === void 0 ? void 0 : mediaUrls.length) ? (((_o = mediaUrls[0]) === null || _o === void 0 ? void 0 : _o.includes("video")) ? "video" : "image") : "text",
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
                // Global error tracker for QueueEvents
                queueEvents.on("error", (err) => {
                    console.error(`[Scheduler] QueueEvents Error: ${err.message}`);
                });
                const worker = new bullmq_1.Worker(redis_config_1.QUEUE_NAMES.SOCIAL_MEDIA_POST, (job) => __awaiter(void 0, void 0, void 0, function* () {
                    if (job.data.platform) {
                        console.log(`Processing job ${job.id} for platform ${job.data.platform}`);
                    }
                    else {
                        console.log(`Processing job ${job.id} (${job.name})`);
                    }
                    return (0, exports.processPostJob)(job);
                }), {
                    connection: redis_config_1.REDIS_CONFIG,
                    concurrency: 5,
                });
                // Worker event handlers
                worker.on("error", (err) => {
                    console.error(`[Scheduler] Worker Error: ${err.message}`);
                });
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
