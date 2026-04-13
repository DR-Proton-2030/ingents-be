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
exports.shutdownInsightsSync = exports.getLatestInsightsSummary = exports.triggerUserSync = exports.initializeInsightsWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = require("ioredis");
const axios_1 = __importDefault(require("axios"));
const redis_config_1 = require("../../config/redis.config");
const users_model_1 = __importDefault(require("../../models/users/users.model"));
const postedContent_model_1 = __importDefault(require("../../models/postedContent/postedContent.model"));
const contentMetricsSnapshot_model_1 = __importDefault(require("../../models/contentMetricsSnapshot/contentMetricsSnapshot.model"));
const platformInsightsSnapshot_model_1 = __importDefault(require("../../models/platformInsightsSnapshot/platformInsightsSnapshot.model"));
const metricsFetcher_1 = require("./metricsFetcher");
const accountInsightsFetcher_1 = require("./accountInsightsFetcher");
const QUEUE_NAME = "insights-sync-queue";
const PLATFORMS = ["youtube", "facebook", "instagram", "x"];
// Debounce map: userId -> last sync timestamp
const lastSyncMap = new Map();
const SYNC_DEBOUNCE_MS = 30 * 60 * 1000; // 30 minutes
let isRedisAvailable = false;
let insightsQueue = null;
let insightsWorker = null;
const getQueue = () => {
    if (!isRedisAvailable)
        return null;
    if (!insightsQueue) {
        insightsQueue = new bullmq_1.Queue(QUEUE_NAME, {
            connection: redis_config_1.REDIS_CONFIG,
            defaultJobOptions: {
                attempts: 2,
                backoff: { type: "exponential", delay: 10000 },
                removeOnComplete: true,
                removeOnFail: false,
            },
        });
        // Add global error handler to prevent unhandled error event noise
        insightsQueue.on("error", (err) => {
            console.error(`[InsightsSync] Queue Error: ${err.message}`);
        });
    }
    return insightsQueue;
};
/**
 * Sync content metrics for a specific user
 * - Finds all published posts from last 90 days with a platform_post_id
 * - Fetches latest metrics from each platform
 * - Creates snapshot + updates PostedContent.engagement
 */
const syncContentMetricsForUser = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const posts = yield postedContent_model_1.default.find({
        user_id: userId,
        status: "published",
        platform_post_id: { $ne: null, $exists: true },
        posted_at: { $gte: ninetyDaysAgo },
    }).lean();
    if (!posts.length)
        return;
    const user = yield users_model_1.default.findById(userId).lean();
    if (!user)
        return;
    for (const post of posts) {
        const platformData = user[post.platform];
        if (!(platformData === null || platformData === void 0 ? void 0 : platformData.access_token))
            continue;
        // For Facebook posts, we may need a page token
        let accessToken = platformData.access_token;
        if (post.platform === "facebook") {
            const pageId = post.page_id || platformData.project_id;
            if (pageId) {
                try {
                    const pagesRes = yield axios_1.default.get("https://graph.facebook.com/v20.0/me/accounts", {
                        params: {
                            fields: "id,access_token",
                            access_token: platformData.access_token,
                        },
                    });
                    const pageData = (_b = (_a = pagesRes.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.find((p) => p.id === pageId);
                    if (pageData === null || pageData === void 0 ? void 0 : pageData.access_token) {
                        accessToken = pageData.access_token;
                    }
                }
                catch (error) {
                    console.warn(`[InsightsSync] Could not resolve Facebook page token for page ${pageId}:`, error.message);
                }
            }
        }
        try {
            const metrics = yield (0, metricsFetcher_1.fetchContentMetrics)(post.platform, post.platform_post_id, accessToken);
            // Create snapshot
            yield contentMetricsSnapshot_model_1.default.create({
                user_id: userId,
                posted_content_id: post._id,
                platform: post.platform,
                platform_post_id: post.platform_post_id,
                snapshot_at: new Date(),
                metrics,
            });
            // Update PostedContent with latest engagement
            yield postedContent_model_1.default.findByIdAndUpdate(post._id, {
                $set: {
                    engagement: {
                        likes: metrics.likes,
                        comments: metrics.comments,
                        shares: metrics.shares,
                        views: metrics.views,
                    },
                    last_metrics_sync: new Date(),
                },
            });
            console.log(`[InsightsSync] Updated metrics for ${post.platform} post ${post.platform_post_id}`);
        }
        catch (error) {
            console.error(`[InsightsSync] Failed to sync ${post.platform} post ${post.platform_post_id}:`, error.message);
        }
    }
});
/**
 * Sync account-level insights for a specific user
 */
const syncAccountInsightsForUser = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield users_model_1.default.findById(userId).lean();
    if (!user)
        return;
    for (const platform of PLATFORMS) {
        const platformData = user[platform];
        if (!(platformData === null || platformData === void 0 ? void 0 : platformData.access_token))
            continue;
        try {
            const insights = yield (0, accountInsightsFetcher_1.fetchAccountInsights)(platform, userId);
            yield platformInsightsSnapshot_model_1.default.create({
                user_id: userId,
                platform,
                snapshot_at: new Date(),
                account_metrics: {
                    followers: insights.followers,
                    total_views: insights.total_views,
                    total_posts: insights.total_posts,
                    profile_views: insights.profile_views,
                },
                period_metrics: {
                    new_followers: insights.new_followers,
                    lost_followers: insights.lost_followers,
                    impressions: insights.impressions,
                    reach: insights.reach,
                    engagement_rate: insights.engagement_rate,
                },
            });
            console.log(`[InsightsSync] Stored ${platform} account insights for user ${userId}`);
        }
        catch (error) {
            console.error(`[InsightsSync] Failed account sync for ${platform}:`, error.message);
        }
    }
});
/**
 * Process a sync job
 */
const processJob = (job) => __awaiter(void 0, void 0, void 0, function* () {
    const { type, userId } = job.data;
    console.log(`[InsightsSync] Processing job: ${type} for user ${userId || "all"}`);
    if (type === "sync-content-metrics") {
        if (userId) {
            yield syncContentMetricsForUser(userId);
        }
        else {
            // Sync all users with connected platforms
            const users = yield users_model_1.default.find({
                $or: [
                    { "youtube.access_token": { $ne: null, $exists: true } },
                    { "facebook.access_token": { $ne: null, $exists: true } },
                    { "instagram.access_token": { $ne: null, $exists: true } },
                    { "x.access_token": { $ne: null, $exists: true } },
                ],
            })
                .select("_id")
                .lean();
            for (const user of users) {
                yield syncContentMetricsForUser(user._id.toString());
            }
        }
    }
    else if (type === "sync-account-insights") {
        if (userId) {
            yield syncAccountInsightsForUser(userId);
        }
        else {
            const users = yield users_model_1.default.find({
                $or: [
                    { "youtube.access_token": { $ne: null, $exists: true } },
                    { "facebook.access_token": { $ne: null, $exists: true } },
                    { "instagram.access_token": { $ne: null, $exists: true } },
                    { "x.access_token": { $ne: null, $exists: true } },
                ],
            })
                .select("_id")
                .lean();
            for (const user of users) {
                yield syncAccountInsightsForUser(user._id.toString());
            }
        }
    }
});
/**
 * Initialize the insights sync worker and repeatable cron jobs
 */
const initializeInsightsWorker = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Test Redis connection
        const testConn = new ioredis_1.Redis(Object.assign(Object.assign({}, redis_config_1.REDIS_CONFIG), { lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null, enableOfflineQueue: false }));
        // Suppress unhandled error events for the test connection
        testConn.on("error", () => { });
        yield testConn.connect();
        yield testConn.ping();
        yield testConn.quit();
        isRedisAvailable = true;
        console.log("[InsightsSync] Redis connection verified");
        const queue = getQueue();
        if (!queue)
            return null;
        // Set up repeatable cron jobs
        // Content metrics: every 6 hours
        yield queue.add("sync-content-metrics-cron", { type: "sync-content-metrics" }, {
            repeat: { pattern: "0 */6 * * *" }, // Every 6 hours
            jobId: "content-metrics-cron",
        });
        // Account insights: every 24 hours at midnight
        yield queue.add("sync-account-insights-cron", { type: "sync-account-insights" }, {
            repeat: { pattern: "0 0 * * *" }, // Daily at midnight
            jobId: "account-insights-cron",
        });
        console.log("[InsightsSync] Repeatable cron jobs registered");
        // Create worker
        insightsWorker = new bullmq_1.Worker(QUEUE_NAME, processJob, {
            connection: redis_config_1.REDIS_CONFIG,
            concurrency: 2, // Limit concurrency to avoid rate limits
        });
        // Add global error handler to prevent unhandled error event noise
        insightsWorker.on("error", (err) => {
            console.error(`[InsightsSync] Worker Error: ${err.message}`);
        });
        insightsWorker.on("completed", (job) => {
            console.log(`[InsightsSync] Job ${job.id} completed`);
        });
        insightsWorker.on("failed", (job, err) => {
            console.error(`[InsightsSync] Job ${job === null || job === void 0 ? void 0 : job.id} failed:`, err.message);
        });
        return insightsWorker;
    }
    catch (error) {
        console.warn("[InsightsSync] Redis not available, sync disabled:", error.message);
        isRedisAvailable = false;
        return null;
    }
});
exports.initializeInsightsWorker = initializeInsightsWorker;
/**
 * Trigger an on-demand sync for a specific user (debounced)
 */
const triggerUserSync = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const lastSync = lastSyncMap.get(userId) || 0;
    if (Date.now() - lastSync < SYNC_DEBOUNCE_MS) {
        console.log(`[InsightsSync] Debounced sync for user ${userId}`);
        return false;
    }
    const queue = getQueue();
    if (!queue) {
        // Fallback: run directly without queue if Redis is unavailable
        console.log("[InsightsSync] Running sync directly (no Redis)");
        yield syncContentMetricsForUser(userId);
        yield syncAccountInsightsForUser(userId);
        lastSyncMap.set(userId, Date.now());
        return true;
    }
    yield queue.add("on-demand-content", {
        type: "sync-content-metrics",
        userId,
    });
    yield queue.add("on-demand-account", {
        type: "sync-account-insights",
        userId,
    });
    lastSyncMap.set(userId, Date.now());
    return true;
});
exports.triggerUserSync = triggerUserSync;
/**
 * Get the latest metrics summary for a user across all platforms
 */
const getLatestInsightsSummary = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e, _f, _g;
    // Latest account insights per platform
    const accountSnapshots = yield platformInsightsSnapshot_model_1.default.aggregate([
        { $match: { user_id: userId } },
        { $sort: { snapshot_at: -1 } },
        {
            $group: {
                _id: "$platform",
                latest: { $first: "$$ROOT" },
            },
        },
    ]);
    // Latest content metrics per post
    const contentSnapshots = yield contentMetricsSnapshot_model_1.default.aggregate([
        { $match: { user_id: userId } },
        { $sort: { snapshot_at: -1 } },
        {
            $group: {
                _id: "$posted_content_id",
                latest: { $first: "$$ROOT" },
            },
        },
        { $limit: 50 },
    ]);
    // Aggregate totals
    const totals = {
        total_views: 0,
        total_likes: 0,
        total_comments: 0,
        total_shares: 0,
        total_followers: 0,
    };
    for (const snap of accountSnapshots) {
        totals.total_followers += ((_c = snap.latest.account_metrics) === null || _c === void 0 ? void 0 : _c.followers) || 0;
        totals.total_views += ((_d = snap.latest.account_metrics) === null || _d === void 0 ? void 0 : _d.total_views) || 0;
    }
    for (const snap of contentSnapshots) {
        totals.total_likes += ((_e = snap.latest.metrics) === null || _e === void 0 ? void 0 : _e.likes) || 0;
        totals.total_comments += ((_f = snap.latest.metrics) === null || _f === void 0 ? void 0 : _f.comments) || 0;
        totals.total_shares += ((_g = snap.latest.metrics) === null || _g === void 0 ? void 0 : _g.shares) || 0;
    }
    return {
        platforms: accountSnapshots.map((s) => (Object.assign(Object.assign(Object.assign({ platform: s._id }, s.latest.account_metrics), s.latest.period_metrics), { snapshot_at: s.latest.snapshot_at }))),
        recent_content: contentSnapshots.map((s) => ({
            posted_content_id: s._id,
            platform: s.latest.platform,
            metrics: s.latest.metrics,
            snapshot_at: s.latest.snapshot_at,
        })),
        totals,
    };
});
exports.getLatestInsightsSummary = getLatestInsightsSummary;
/**
 * Graceful shutdown
 */
const shutdownInsightsSync = () => __awaiter(void 0, void 0, void 0, function* () {
    if (insightsWorker) {
        yield insightsWorker.close();
        console.log("[InsightsSync] Worker shut down");
    }
    if (insightsQueue) {
        yield insightsQueue.close();
        console.log("[InsightsSync] Queue shut down");
    }
});
exports.shutdownInsightsSync = shutdownInsightsSync;
