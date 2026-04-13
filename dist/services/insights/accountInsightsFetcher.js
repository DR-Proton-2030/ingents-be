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
exports.fetchAccountInsights = exports.fetchXAccountInsights = exports.fetchInstagramAccountInsights = exports.fetchFacebookAccountInsights = exports.fetchYouTubeAccountInsights = void 0;
const axios_1 = __importDefault(require("axios"));
const users_model_1 = __importDefault(require("../../models/users/users.model"));
const defaultInsights = {
    followers: 0,
    total_views: 0,
    total_posts: 0,
    profile_views: 0,
    new_followers: 0,
    lost_followers: 0,
    impressions: 0,
    reach: 0,
    engagement_rate: 0,
};
/**
 * Fetch YouTube channel-level insights
 */
const fetchYouTubeAccountInsights = (accessToken, channelId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const params = {
            part: "statistics",
            access_token: accessToken,
        };
        if (channelId) {
            params.id = channelId;
        }
        else {
            params.mine = true;
        }
        const { data } = yield axios_1.default.get("https://www.googleapis.com/youtube/v3/channels", { params });
        const stats = (_b = (_a = data.items) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.statistics;
        if (!stats)
            return Object.assign({}, defaultInsights);
        return Object.assign(Object.assign({}, defaultInsights), { followers: parseInt(stats.subscriberCount || "0", 10), total_views: parseInt(stats.viewCount || "0", 10), total_posts: parseInt(stats.videoCount || "0", 10) });
    }
    catch (error) {
        console.error("[AccountInsights] YouTube error:", error.message);
        return Object.assign({}, defaultInsights);
    }
});
exports.fetchYouTubeAccountInsights = fetchYouTubeAccountInsights;
/**
 * Fetch Facebook page-level insights
 */
const fetchFacebookAccountInsights = (userAccessToken, pageId) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d, _e, _f;
    try {
        // Get page access token first
        const pagesRes = yield axios_1.default.get(`https://graph.facebook.com/v20.0/me/accounts?fields=id,access_token&access_token=${userAccessToken}`);
        const pageData = (_d = (_c = pagesRes.data) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.find((p) => p.id === pageId);
        const pageToken = (pageData === null || pageData === void 0 ? void 0 : pageData.access_token) || userAccessToken;
        // Get basic page metrics
        const { data: pageInfo } = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${pageId}`, {
            params: {
                fields: "fan_count,followers_count",
                access_token: pageToken,
            },
        });
        const followers = pageInfo.followers_count || pageInfo.fan_count || 0;
        // Try to get page insights
        let impressions = 0;
        let reach = 0;
        let newFollowers = 0;
        try {
            const { data: insights } = yield axios_1.default.get(`https://graph.facebook.com/v20.0/${pageId}/insights`, {
                params: {
                    metric: "page_impressions,page_impressions_unique,page_fan_adds_unique",
                    period: "day",
                    access_token: pageToken,
                },
            });
            for (const metric of insights.data || []) {
                const val = ((_f = (_e = metric.values) === null || _e === void 0 ? void 0 : _e[metric.values.length - 1]) === null || _f === void 0 ? void 0 : _f.value) || 0;
                if (metric.name === "page_impressions")
                    impressions = val;
                if (metric.name === "page_impressions_unique")
                    reach = val;
                if (metric.name === "page_fan_adds_unique")
                    newFollowers = val;
            }
        }
        catch (_g) {
            // Page insights may require specific permissions
        }
        return Object.assign(Object.assign({}, defaultInsights), { followers,
            impressions,
            reach, new_followers: newFollowers });
    }
    catch (error) {
        console.error("[AccountInsights] Facebook error:", error.message);
        return Object.assign({}, defaultInsights);
    }
});
exports.fetchFacebookAccountInsights = fetchFacebookAccountInsights;
/**
 * Fetch Instagram account-level insights
 */
const fetchInstagramAccountInsights = (accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data } = yield axios_1.default.get("https://graph.instagram.com/me", {
            params: {
                fields: "id,username,followers_count,media_count",
                access_token: accessToken,
            },
        });
        return Object.assign(Object.assign({}, defaultInsights), { followers: data.followers_count || 0, total_posts: data.media_count || 0 });
    }
    catch (error) {
        console.error("[AccountInsights] Instagram error:", error.message);
        return Object.assign({}, defaultInsights);
    }
});
exports.fetchInstagramAccountInsights = fetchInstagramAccountInsights;
/**
 * Fetch X (Twitter) account-level insights
 */
const fetchXAccountInsights = (accessToken) => __awaiter(void 0, void 0, void 0, function* () {
    var _h;
    try {
        const { data } = yield axios_1.default.get("https://api.twitter.com/2/users/me", {
            params: {
                "user.fields": "public_metrics",
            },
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        const metrics = (_h = data.data) === null || _h === void 0 ? void 0 : _h.public_metrics;
        if (!metrics)
            return Object.assign({}, defaultInsights);
        return Object.assign(Object.assign({}, defaultInsights), { followers: metrics.followers_count || 0, total_posts: metrics.tweet_count || 0 });
    }
    catch (error) {
        console.error("[AccountInsights] X error:", error.message);
        return Object.assign({}, defaultInsights);
    }
});
exports.fetchXAccountInsights = fetchXAccountInsights;
/**
 * Fetch account insights for any platform
 */
const fetchAccountInsights = (platform, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield users_model_1.default.findById(userId);
    if (!user)
        return Object.assign({}, defaultInsights);
    const platformData = user[platform];
    if (!(platformData === null || platformData === void 0 ? void 0 : platformData.access_token))
        return Object.assign({}, defaultInsights);
    switch (platform) {
        case "youtube":
            return (0, exports.fetchYouTubeAccountInsights)(platformData.access_token, platformData.project_id);
        case "facebook":
            return (0, exports.fetchFacebookAccountInsights)(platformData.access_token, platformData.project_id);
        case "instagram":
            return (0, exports.fetchInstagramAccountInsights)(platformData.access_token);
        case "x":
            return (0, exports.fetchXAccountInsights)(platformData.access_token);
        default:
            return Object.assign({}, defaultInsights);
    }
});
exports.fetchAccountInsights = fetchAccountInsights;
