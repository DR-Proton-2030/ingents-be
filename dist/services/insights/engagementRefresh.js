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
exports.refreshEngagementForPosts = void 0;
const axios_1 = __importDefault(require("axios"));
const users_model_1 = __importDefault(require("../../models/users/users.model"));
const postedContent_model_1 = __importDefault(require("../../models/postedContent/postedContent.model"));
const metricsFetcher_1 = require("./metricsFetcher");
const REFRESH_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
/**
 * Refresh engagement metrics for a list of posted content records.
 * Called in background (fire-and-forget) when fetching posted content.
 * Only refreshes posts that haven't been synced in the last 30 minutes.
 */
const refreshEngagementForPosts = (userId, posts) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!posts || posts.length === 0)
        return;
    const now = Date.now();
    const stalePosts = posts.filter((p) => {
        if (!p.platform_post_id)
            return false;
        if (p.status !== "published")
            return false;
        const lastSync = p.last_metrics_sync
            ? new Date(p.last_metrics_sync).getTime()
            : 0;
        return now - lastSync > REFRESH_THRESHOLD_MS;
    });
    if (stalePosts.length === 0)
        return;
    const user = yield users_model_1.default.findById(userId).lean();
    if (!user)
        return;
    for (const post of stalePosts) {
        const platformData = user[post.platform];
        if (!(platformData === null || platformData === void 0 ? void 0 : platformData.access_token))
            continue;
        let accessToken = platformData.access_token;
        // For Facebook posts, resolve the page access token
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
                    console.warn(`[EngagementRefresh] Could not resolve FB page token for page ${pageId}:`, error.message);
                    continue;
                }
            }
        }
        try {
            const metrics = yield (0, metricsFetcher_1.fetchContentMetrics)(post.platform, post.platform_post_id, accessToken);
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
            console.log(`[EngagementRefresh] Updated ${post.platform} post ${post.platform_post_id} — likes:${metrics.likes} comments:${metrics.comments} shares:${metrics.shares}`);
        }
        catch (error) {
            console.error(`[EngagementRefresh] Failed ${post.platform} post ${post.platform_post_id}:`, error.message);
        }
    }
});
exports.refreshEngagementForPosts = refreshEngagementForPosts;
