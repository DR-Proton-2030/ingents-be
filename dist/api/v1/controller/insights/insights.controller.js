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
exports.fixFacebookPostIds = exports.getUserContentWithMetrics = exports.triggerSync = exports.getInsightsSummary = exports.getAccountInsightsHistory = exports.getContentMetricsHistory = exports.getWeeklyEngagement = void 0;
const mongoose_1 = require("mongoose");
const axios_1 = __importDefault(require("axios"));
const contentMetricsSnapshot_model_1 = __importDefault(require("../../../../models/contentMetricsSnapshot/contentMetricsSnapshot.model"));
const platformInsightsSnapshot_model_1 = __importDefault(require("../../../../models/platformInsightsSnapshot/platformInsightsSnapshot.model"));
const postedContent_model_1 = __importDefault(require("../../../../models/postedContent/postedContent.model"));
const users_model_1 = __importDefault(require("../../../../models/users/users.model"));
const insightsSync_service_1 = require("../../../../services/insights/insightsSync.service");
/**
 * GET /api/v1/insights/weekly-engagement
 * Returns weekly aggregated engagement metrics per platform.
 * YouTube → views, Facebook/Instagram/X → likes.
 * Reads directly from PostedContent.engagement (always available).
 * Query: ?userId=&weeks=6
 */
const getWeeklyEngagement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, weeks = "6" } = req.query;
        if (!userId) {
            return res.status(400).json({ success: false, message: "userId is required" });
        }
        const weeksNum = Math.min(parseInt(weeks, 10) || 6, 52);
        const now = new Date();
        const since = new Date(now.getTime() - weeksNum * 7 * 24 * 60 * 60 * 1000);
        const getWeekLabel = (weekStartInput) => {
            const weekStart = new Date(weekStartInput);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            const labelDate = weekEnd > now ? now : weekEnd;
            return labelDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
        };
        // Aggregate directly from PostedContent, grouped by ISO week + platform
        const pipeline = [
            {
                $match: {
                    user_id: new mongoose_1.Types.ObjectId(userId),
                    status: "published",
                    posted_at: { $gte: since },
                },
            },
            {
                $addFields: {
                    weekStart: {
                        $dateFromParts: {
                            isoWeekYear: { $isoWeekYear: "$posted_at" },
                            isoWeek: { $isoWeek: "$posted_at" },
                            isoDayOfWeek: 1,
                        },
                    },
                },
            },
            {
                $group: {
                    _id: { weekStart: "$weekStart", platform: "$platform" },
                    views: { $sum: { $ifNull: ["$engagement.views", 0] } },
                    likes: { $sum: { $ifNull: ["$engagement.likes", 0] } },
                    comments: { $sum: { $ifNull: ["$engagement.comments", 0] } },
                    shares: { $sum: { $ifNull: ["$engagement.shares", 0] } },
                    postCount: { $sum: 1 },
                },
            },
            {
                $group: {
                    _id: "$_id.weekStart",
                    platforms: {
                        $push: {
                            platform: "$_id.platform",
                            views: "$views",
                            likes: "$likes",
                            comments: "$comments",
                            shares: "$shares",
                            postCount: "$postCount",
                        },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ];
        const rawWeeks = yield postedContent_model_1.default.aggregate(pipeline);
        // Build week entries: YouTube → views, FB/Insta/X → likes
        const result = rawWeeks.map((week) => {
            const weekDate = new Date(week._id);
            const weekLabel = getWeekLabel(weekDate);
            const entry = {
                week: weekLabel,
                weekStart: week._id,
                youtube: 0,
                facebook: 0,
                instagram: 0,
                x: 0,
            };
            week.platforms.forEach((p) => {
                if (p.platform === "youtube") {
                    entry.youtube = p.views || 0;
                }
                else if (p.platform in entry) {
                    entry[p.platform] = p.likes || 0;
                }
            });
            return entry;
        });
        // Fill in missing weeks with zeros
        const allWeeks = [];
        for (let i = weeksNum - 1; i >= 0; i--) {
            const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            // Align to Monday
            const dayOfWeek = weekStart.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            weekStart.setDate(weekStart.getDate() + diff);
            weekStart.setHours(0, 0, 0, 0);
            const weekLabel = getWeekLabel(weekStart);
            const existing = result.find((r) => {
                const rDate = new Date(r.weekStart);
                return (rDate.getFullYear() === weekStart.getFullYear() &&
                    rDate.getMonth() === weekStart.getMonth() &&
                    rDate.getDate() === weekStart.getDate());
            });
            allWeeks.push(existing || {
                week: weekLabel,
                weekStart: weekStart.toISOString(),
                youtube: 0,
                facebook: 0,
                instagram: 0,
                x: 0,
            });
        }
        return res.json({
            success: true,
            result: {
                weeks: allWeeks,
                meta: {
                    youtube: "views",
                    facebook: "likes",
                    instagram: "likes",
                    x: "likes",
                },
            },
        });
    }
    catch (error) {
        console.error("[Insights] Weekly engagement error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});
exports.getWeeklyEngagement = getWeeklyEngagement;
/**
 * GET /api/v1/insights/content/:postId/history
 * Returns engagement metric snapshots over time for a specific post
 */
const getContentMetricsHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { postId } = req.params;
        const { days = "30" } = req.query;
        if (!mongoose_1.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: "Invalid postId" });
        }
        const daysNum = Math.min(parseInt(days, 10) || 30, 90);
        const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
        const snapshots = yield contentMetricsSnapshot_model_1.default.find({
            posted_content_id: new mongoose_1.Types.ObjectId(postId),
            snapshot_at: { $gte: since },
        })
            .sort({ snapshot_at: 1 })
            .lean();
        const post = yield postedContent_model_1.default.findById(postId)
            .select("platform content media_type posted_at engagement platform_post_id")
            .lean();
        return res.json({
            success: true,
            result: {
                post,
                snapshots,
                count: snapshots.length,
            },
        });
    }
    catch (error) {
        console.error("[Insights] Content history error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});
exports.getContentMetricsHistory = getContentMetricsHistory;
/**
 * GET /api/v1/insights/account/:platform/history
 * Returns account-level metric history for a platform
 */
const getAccountInsightsHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { platform } = req.params;
        const { userId, days = "30" } = req.query;
        if (!userId) {
            return res.status(400).json({ success: false, message: "userId is required" });
        }
        const validPlatforms = ["facebook", "instagram", "youtube", "x"];
        if (!validPlatforms.includes(platform)) {
            return res.status(400).json({ success: false, message: "Invalid platform" });
        }
        const daysNum = Math.min(parseInt(days, 10) || 30, 90);
        const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);
        const snapshots = yield platformInsightsSnapshot_model_1.default.find({
            user_id: userId,
            platform,
            snapshot_at: { $gte: since },
        })
            .sort({ snapshot_at: 1 })
            .lean();
        return res.json({
            success: true,
            result: {
                platform,
                snapshots,
                count: snapshots.length,
            },
        });
    }
    catch (error) {
        console.error("[Insights] Account history error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});
exports.getAccountInsightsHistory = getAccountInsightsHistory;
/**
 * GET /api/v1/insights/summary
 * Returns latest aggregated metrics for all platforms + recent content
 */
const getInsightsSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ success: false, message: "userId is required" });
        }
        const summary = yield (0, insightsSync_service_1.getLatestInsightsSummary)(userId);
        return res.json({
            success: true,
            result: summary,
        });
    }
    catch (error) {
        console.error("[Insights] Summary error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});
exports.getInsightsSummary = getInsightsSummary;
/**
 * POST /api/v1/insights/sync
 * Triggers an on-demand sync for a user (debounced to 30 min)
 */
const triggerSync = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: "userId is required" });
        }
        const triggered = yield (0, insightsSync_service_1.triggerUserSync)(userId);
        return res.json({
            success: true,
            message: triggered
                ? "Sync triggered successfully"
                : "Sync was recently triggered, please wait before retrying",
            syncing: triggered,
        });
    }
    catch (error) {
        console.error("[Insights] Sync trigger error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});
exports.triggerSync = triggerSync;
/**
 * GET /api/v1/insights/content/user/:userId
 * Returns all posted content with latest metrics for a user
 */
const getUserContentWithMetrics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { platform, limit = "20", offset = "0" } = req.query;
        if (!userId) {
            return res.status(400).json({ success: false, message: "userId is required" });
        }
        const query = { user_id: userId, status: "published" };
        if (platform)
            query.platform = platform;
        const posts = yield postedContent_model_1.default.find(query)
            .sort({ posted_at: -1 })
            .skip(parseInt(offset, 10))
            .limit(parseInt(limit, 10))
            .lean();
        const total = yield postedContent_model_1.default.countDocuments(query);
        return res.json({
            success: true,
            result: {
                posts,
                total,
                limit: parseInt(limit, 10),
                offset: parseInt(offset, 10),
            },
        });
    }
    catch (error) {
        console.error("[Insights] User content error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});
exports.getUserContentWithMetrics = getUserContentWithMetrics;
/**
 * POST /api/v1/insights/fix-facebook-post-ids
 * One-time migration: fixes Facebook image/video posts that have wrong platform_post_id.
 * For image posts (photo ID without underscore), attempts to resolve the correct post ID.
 */
const fixFacebookPostIds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, message: "userId is required" });
        }
        const user = yield users_model_1.default.findById(userId).lean();
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        const fbData = user.facebook;
        if (!(fbData === null || fbData === void 0 ? void 0 : fbData.access_token)) {
            return res.status(400).json({ success: false, message: "No Facebook token found" });
        }
        // Find Facebook posts that may have wrong IDs (no underscore = likely photo/video ID, not post ID)
        const fbPosts = yield postedContent_model_1.default.find({
            user_id: userId,
            platform: "facebook",
            platform_post_id: { $ne: null, $exists: true },
            status: "published",
        }).lean();
        let fixedCount = 0;
        const errors = [];
        // Resolve page token
        let pageAccessToken = fbData.access_token;
        try {
            const pagesRes = yield axios_1.default.get("https://graph.facebook.com/v20.0/me/accounts", {
                params: {
                    fields: "id,access_token",
                    access_token: fbData.access_token,
                },
            });
            const pages = ((_a = pagesRes.data) === null || _a === void 0 ? void 0 : _a.data) || [];
            for (const post of fbPosts) {
                const postId = post.platform_post_id;
                // If post ID already has underscore format (pageId_postId), it's likely correct
                if (postId.includes("_"))
                    continue;
                // This is likely a photo ID or video ID — try to resolve page token and fetch the post ID
                const pageId = post.page_id || fbData.project_id;
                const page = pages.find((p) => p.id === pageId);
                const token = (page === null || page === void 0 ? void 0 : page.access_token) || pageAccessToken;
                try {
                    // For photos, try to get the associated page post
                    if (post.media_type === "image") {
                        // The photo node has a link field and we can construct the post ID as pageId_photoId
                        const correctedId = `${pageId}_${postId}`;
                        // Verify the corrected ID works by making a test API call
                        const testRes = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${correctedId}`, {
                            params: {
                                fields: "id,likes.summary(true),comments.summary(true),shares",
                                access_token: token,
                            },
                        });
                        if ((_b = testRes.data) === null || _b === void 0 ? void 0 : _b.id) {
                            yield postedContent_model_1.default.findByIdAndUpdate(post._id, {
                                $set: { platform_post_id: correctedId },
                            });
                            fixedCount++;
                        }
                    }
                    else if (post.media_type === "video") {
                        const correctedId = `${pageId}_${postId}`;
                        const testRes = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${correctedId}`, {
                            params: {
                                fields: "id",
                                access_token: token,
                            },
                        });
                        if ((_c = testRes.data) === null || _c === void 0 ? void 0 : _c.id) {
                            yield postedContent_model_1.default.findByIdAndUpdate(post._id, {
                                $set: { platform_post_id: correctedId },
                            });
                            fixedCount++;
                        }
                    }
                }
                catch (err) {
                    errors.push(`Post ${postId}: ${err.message}`);
                }
            }
        }
        catch (err) {
            return res.status(500).json({
                success: false,
                message: "Could not resolve Facebook pages: " + err.message,
            });
        }
        // Trigger a sync to refresh engagement after fixing IDs
        (0, insightsSync_service_1.triggerUserSync)(userId).catch(() => { });
        return res.json({
            success: true,
            message: `Fixed ${fixedCount} post IDs`,
            fixedCount,
            errors: errors.length > 0 ? errors : undefined,
        });
    }
    catch (error) {
        console.error("[Insights] Fix FB post IDs error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
});
exports.fixFacebookPostIds = fixFacebookPostIds;
